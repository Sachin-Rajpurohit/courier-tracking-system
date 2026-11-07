const { User, Address, Shipment, TrackingEvent, Assignment, DeliveryAttempt } = require("../models");
const { STATUS_DESCRIPTIONS, FAILURE_REASONS } = require("../models/constants");
const { generateTrackingNumber } = require("../utils/trackingNumber");

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

const CITIES = [
  { city: "Jaipur", state: "Rajasthan", postalCode: "302001", line1: "14 MI Road" },
  { city: "Mumbai", state: "Maharashtra", postalCode: "400001", line1: "22 Fort Street" },
  { city: "Delhi", state: "Delhi", postalCode: "110001", line1: "8 Connaught Place" },
  { city: "Bengaluru", state: "Karnataka", postalCode: "560001", line1: "31 Brigade Road" },
  { city: "Pune", state: "Maharashtra", postalCode: "411001", line1: "5 FC Road" },
  { city: "Chennai", state: "Tamil Nadu", postalCode: "600001", line1: "17 Anna Salai" },
];

const ITEMS = ["Documents", "Books", "Laptop accessories", "Clothing", "Kitchenware", "Medical supplies", "Gift box"];

// Each path is the list of steps a seeded shipment has been through.
const PATHS = [
  ["created"],
  ["created", "picked_up"],
  ["created", "picked_up", "in_transit"],
  ["created", "picked_up", "in_transit", "in_transit"],
  ["created", "picked_up", "in_transit", "out_for_delivery"],
  ["created", "picked_up", "in_transit", "out_for_delivery", "failed_attempt"],
  ["created", "picked_up", "in_transit", "out_for_delivery", "delivered"],
  ["created", "picked_up", "in_transit", "out_for_delivery", "failed_attempt", "out_for_delivery", "delivered"],
  ["created", "picked_up", "in_transit", "out_for_delivery", "failed_attempt", "returned"],
  ["created", "cancelled"],
];

const DEMO_USERS = [
  { name: "Asha Admin", email: "admin@courier.test", password: "Admin@1234", role: "admin", phone: "+91 90000 00001" },
  { name: "Ravi Sharma", email: "staff@courier.test", password: "Staff@1234", role: "staff", phone: "+91 90000 00002", branch: "Jaipur Hub" },
  { name: "Neha Gupta", email: "staff2@courier.test", password: "Staff@1234", role: "staff", phone: "+91 90000 00003", branch: "Mumbai Hub" },
  { name: "Arjun Meena", email: "agent@courier.test", password: "Agent@1234", role: "agent", phone: "+91 90000 00004", branch: "Jaipur Hub" },
  { name: "Imran Khan", email: "agent2@courier.test", password: "Agent@1234", role: "agent", phone: "+91 90000 00005", branch: "Mumbai Hub" },
  { name: "Priya Nair", email: "agent3@courier.test", password: "Agent@1234", role: "agent", phone: "+91 90000 00006", branch: "Bengaluru Hub" },
  { name: "Karan Verma", email: "customer@courier.test", password: "Customer@1234", role: "customer", phone: "+91 90000 00007" },
  { name: "Meera Joshi", email: "customer2@courier.test", password: "Customer@1234", role: "customer", phone: "+91 90000 00008" },
  { name: "Dev Patel", email: "customer3@courier.test", password: "Customer@1234", role: "customer", phone: "+91 90000 00009" },
];

async function clearDatabase() {
  await Promise.all(
    [User, Address, Shipment, TrackingEvent, Assignment, DeliveryAttempt].map((model) => model.deleteMany({})),
  );
}

async function seedDatabase() {
  // Saved one at a time so the password hook runs for each user.
  const users = [];
  for (const data of DEMO_USERS) users.push(await User.create(data));

  const staff = users.filter((user) => user.role === "staff");
  const agents = users.filter((user) => user.role === "agent");
  const customers = users.filter((user) => user.role === "customer");

  const addressBook = new Map();
  for (const [customerIndex, customer] of customers.entries()) {
    const addresses = [];
    for (let i = 0; i < 4; i++) {
      const place = CITIES[(customerIndex + i) % CITIES.length];
      addresses.push(
        await Address.create({
          ...place,
          owner: customer._id,
          label: i === 0 ? "Home" : i === 1 ? "Office" : `Recipient ${i - 1}`,
          contactName: i < 2 ? customer.name : `Contact ${customerIndex + 1}-${i - 1}`,
          phone: customer.phone,
        }),
      );
    }
    addressBook.set(String(customer._id), addresses);
  }

  const total = 30;
  for (let i = 0; i < total; i++) {
    const customer = customers[i % customers.length];
    const addresses = addressBook.get(String(customer._id));
    const sender = addresses[i % 2];
    const receiver = addresses[2 + (i % 2)];
    const path = PATHS[i % PATHS.length];
    const branchStaff = staff[i % staff.length];
    const agent = agents[i % agents.length];
    const origin = `${sender.city} Hub`;

    // Spreads shipments over the last two weeks, with each step a few hours after the last.
    const stepGap = 7 * HOUR;
    const lastStepAt = Date.now() - ((i % 13) * DAY + HOUR);
    const startedAt = lastStepAt - (path.length - 1) * stepGap;

    const usesAgent = path.includes("out_for_delivery") || path.includes("picked_up");
    const finalStatus = path[path.length - 1];
    const shipment = await Shipment.create({
      trackingNumber: generateTrackingNumber(),
      customer: customer._id,
      senderAddress: sender._id,
      receiverAddress: receiver._id,
      description: ITEMS[i % ITEMS.length],
      weightKg: Math.round((0.5 + (i % 9) * 1.3) * 10) / 10,
      serviceType: ["standard", "express", "overnight"][i % 3],
      status: finalStatus,
      originBranch: origin,
      currentLocation: origin,
      assignedAgent: usesAgent ? agent._id : null,
      expectedDeliveryDate: new Date(startedAt + (3 + (i % 3)) * DAY),
      createdBy: branchStaff._id,
      createdAt: new Date(startedAt),
    });

    let assignment = null;
    if (usesAgent) {
      const closed = ["delivered", "returned"].includes(finalStatus);
      assignment = await Assignment.create({
        shipment: shipment._id,
        agent: agent._id,
        assignedBy: branchStaff._id,
        status: closed ? "completed" : "active",
        assignedAt: new Date(startedAt + HOUR),
        closedAt: closed ? new Date(lastStepAt) : undefined,
      });
    }

    let attemptNumber = 0;
    let location = origin;
    for (const [stepIndex, status] of path.entries()) {
      const occurredAt = new Date(startedAt + stepIndex * stepGap);
      if (status === "in_transit") location = `${stepIndex % 2 === 0 ? "Nagpur" : "Indore"} Sorting Centre`;
      if (["out_for_delivery", "delivered", "failed_attempt"].includes(status)) location = `${receiver.city} Hub`;
      if (status === "returned") location = origin;

      let description = STATUS_DESCRIPTIONS[status];
      let attemptId = null;
      if (status === "delivered" || status === "failed_attempt") {
        attemptNumber += 1;
        const delivered = status === "delivered";
        const reasons = Object.keys(FAILURE_REASONS);
        const failureReason = delivered ? undefined : reasons[i % (reasons.length - 1)];
        const attempt = await DeliveryAttempt.create({
          shipment: shipment._id,
          assignment: assignment._id,
          agent: agent._id,
          attemptNumber,
          outcome: delivered ? "delivered" : "failed",
          failureReason,
          receivedBy: delivered ? receiver.contactName : undefined,
          location,
          attemptedAt: occurredAt,
        });
        attemptId = attempt._id;
        if (!delivered) description = `${description}: ${FAILURE_REASONS[failureReason]}`;
        if (delivered) shipment.deliveredAt = occurredAt;
      }

      await TrackingEvent.create({
        shipment: shipment._id,
        status,
        location,
        description,
        attempt: attemptId,
        recordedBy: ["picked_up", "out_for_delivery", "delivered", "failed_attempt"].includes(status)
          ? agent._id
          : branchStaff._id,
        occurredAt,
      });
    }

    shipment.currentLocation = location;
    await shipment.save();
  }

  return { users: users.length, shipments: total };
}

module.exports = { clearDatabase, seedDatabase, DEMO_USERS };
