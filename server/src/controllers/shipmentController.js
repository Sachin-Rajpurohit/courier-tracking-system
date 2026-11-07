const { Shipment, Address, User, TrackingEvent, Assignment, DeliveryAttempt } = require("../models");
const { SHIPMENT_STATUSES, SERVICE_TYPES, TERMINAL_STATUSES, STATUS_DESCRIPTIONS } = require("../models/constants");
const ApiError = require("../utils/ApiError");
const {
  text,
  searchRegex,
  parseList,
  enumFilter,
  idFilter,
  dateRange,
  withoutEmpty,
  paginate,
} = require("../utils/listQuery");
const { isManager, shipmentScope, findShipmentForUser } = require("../utils/access");
const { generateTrackingNumber } = require("../utils/trackingNumber");
const workflow = require("../services/shipmentWorkflow");
const { isBlank } = require("../validators/rules");

const LIST_POPULATE = [
  { path: "customer", select: "name email" },
  { path: "assignedAgent", select: "name" },
  { path: "senderAddress", select: "city" },
  { path: "receiverAddress", select: "city" },
];

async function listShipments(req, res) {
  const options = parseList(req.query, [
    "trackingNumber",
    "status",
    "serviceType",
    "weightKg",
    "expectedDeliveryDate",
    "createdAt",
  ]);
  const q = text(req.query.q);
  const open = text(req.query.open);

  const filter = withoutEmpty({
    status: enumFilter(req.query.status, SHIPMENT_STATUSES, "status"),
    serviceType: enumFilter(req.query.serviceType, SERVICE_TYPES, "service type"),
    originBranch: text(req.query.branch) ? searchRegex(text(req.query.branch)) : undefined,
    customer: idFilter(req.query.customer, "customer"),
    assignedAgent: idFilter(req.query.agent, "agent"),
    createdAt: dateRange(req.query.from, req.query.to),
  });
  if (open === "true" && !filter.status) filter.status = { $nin: TERMINAL_STATUSES };
  if (q) {
    const regex = searchRegex(q);
    filter.$or = [{ trackingNumber: regex }, { description: regex }, { originBranch: regex }];
  }
  // Applied last so a filter in the URL can never widen what this user may see.
  Object.assign(filter, shipmentScope(req.user));

  res.json(await paginate(Shipment, filter, options, LIST_POPULATE));
}

async function getShipment(req, res) {
  const shipment = await findShipmentForUser(req.user, { _id: req.params.id });
  await shipment.populate([
    { path: "customer", select: "name email phone" },
    { path: "assignedAgent", select: "name phone" },
    { path: "createdBy", select: "name role" },
    "senderAddress",
    "receiverAddress",
  ]);

  const manager = isManager(req.user);
  const staffView = req.user.role !== "customer";

  const events = await TrackingEvent.find({ shipment: shipment._id })
    .sort({ occurredAt: -1, _id: -1 })
    .populate(staffView ? { path: "recordedBy", select: "name role" } : []);
  const attempts = await DeliveryAttempt.find({ shipment: shipment._id })
    .sort({ attemptNumber: -1 })
    .populate(staffView ? { path: "agent", select: "name" } : [])
    .select(staffView ? "" : "attemptNumber outcome failureReason location attemptedAt");
  const assignments = manager
    ? await Assignment.find({ shipment: shipment._id })
        .sort({ assignedAt: -1 })
        .populate([
          { path: "agent", select: "name" },
          { path: "assignedBy", select: "name" },
        ])
    : [];

  res.json({ shipment, events, attempts, assignments });
}

// Both addresses must belong to the shipment's customer, so nobody can use another customer's address book.
async function resolveAddresses(customerId, body) {
  const [sender, receiver] = await Promise.all([
    Address.findOne({ _id: body.senderAddress, owner: customerId }),
    Address.findOne({ _id: body.receiverAddress, owner: customerId }),
  ]);
  const errors = {};
  if (!sender) errors.senderAddress = "Choose one of the customer's addresses";
  if (!receiver) errors.receiverAddress = "Choose one of the customer's addresses";
  if (Object.keys(errors).length > 0) {
    throw new ApiError(400, "Please correct the highlighted fields", errors);
  }
  return { sender, receiver };
}

async function resolveCustomer(req) {
  if (req.user.role === "customer") return req.user._id;
  const customer = await User.findOne({ _id: req.body.customer, role: "customer", isActive: true });
  if (!customer) {
    throw new ApiError(400, "Please correct the highlighted fields", { customer: "Choose an active customer" });
  }
  return customer._id;
}

async function createShipment(req, res) {
  const customer = await resolveCustomer(req);
  const { sender } = await resolveAddresses(customer, req.body);

  const manager = isManager(req.user);
  const originBranch =
    (manager && text(req.body.originBranch)) || req.user.branch || `${sender.city} branch`;

  const shipment = await Shipment.create({
    trackingNumber: generateTrackingNumber(),
    customer,
    senderAddress: req.body.senderAddress,
    receiverAddress: req.body.receiverAddress,
    description: req.body.description.trim(),
    weightKg: Number(req.body.weightKg),
    serviceType: req.body.serviceType,
    originBranch,
    currentLocation: originBranch,
    expectedDeliveryDate: manager && !isBlank(req.body.expectedDeliveryDate) ? req.body.expectedDeliveryDate : undefined,
    createdBy: req.user._id,
  });

  // Every shipment's history starts with this first event.
  await TrackingEvent.create({
    shipment: shipment._id,
    status: "created",
    location: originBranch,
    description: STATUS_DESCRIPTIONS.created,
    recordedBy: req.user._id,
  });

  res.status(201).json(shipment);
}

// Details are locked once the parcel has been collected; later changes go through checkpoints.
async function updateShipment(req, res) {
  const shipment = await findShipmentForUser(req.user, { _id: req.params.id });
  const manager = isManager(req.user);
  if (TERMINAL_STATUSES.includes(shipment.status)) {
    throw new ApiError(409, "This shipment is closed and can no longer be edited");
  }
  if (shipment.status !== "created" && !manager) {
    throw new ApiError(409, "This shipment has been picked up and can no longer be edited");
  }

  const addressesChanged =
    String(shipment.senderAddress) !== req.body.senderAddress ||
    String(shipment.receiverAddress) !== req.body.receiverAddress;
  if (shipment.status !== "created" && addressesChanged) {
    throw new ApiError(409, "Addresses can't be changed after pickup");
  }
  await resolveAddresses(shipment.customer, req.body);

  if (manager && String(shipment.customer) !== req.body.customer) {
    throw new ApiError(409, "The customer of a shipment can't be changed");
  }

  shipment.senderAddress = req.body.senderAddress;
  shipment.receiverAddress = req.body.receiverAddress;
  shipment.description = req.body.description.trim();
  shipment.weightKg = Number(req.body.weightKg);
  shipment.serviceType = req.body.serviceType;
  if (manager) {
    if (text(req.body.originBranch)) shipment.originBranch = text(req.body.originBranch);
    shipment.expectedDeliveryDate = isBlank(req.body.expectedDeliveryDate) ? undefined : req.body.expectedDeliveryDate;
  }
  await shipment.save();
  res.json(shipment);
}

async function cancelShipment(req, res) {
  const shipment = await findShipmentForUser(req.user, { _id: req.params.id });
  if (req.user.role === "customer" && shipment.status !== "created") {
    throw new ApiError(409, "This shipment has been picked up. Please contact the branch to cancel it.");
  }
  const result = await workflow.addCheckpoint({
    shipment,
    status: "cancelled",
    location: shipment.currentLocation || shipment.originBranch,
    note: text(req.body && req.body.note).slice(0, 300) || undefined,
    user: req.user,
  });
  res.json(result.shipment);
}

async function deleteShipment(req, res) {
  const shipment = await Shipment.findById(req.params.id);
  if (!shipment) throw new ApiError(404, "Shipment not found");
  await workflow.deleteShipment(shipment);
  res.json({ message: "Shipment deleted" });
}

module.exports = { listShipments, getShipment, createShipment, updateShipment, cancelShipment, deleteShipment };
