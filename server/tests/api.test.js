const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");
const { MongoMemoryServer } = require("mongodb-memory-server");

let mongo;
let server;
let baseUrl;
const tokens = {};
const ids = {};

async function api(method, path, { token, body } = {}) {
  const response = await fetch(`${baseUrl}/api${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, data: await response.json() };
}

async function login(email, password) {
  const { status, data } = await api("POST", "/auth/login", { body: { email, password } });
  assert.equal(status, 200, `login failed for ${email}`);
  return data.token;
}

const addressBody = (label, city) => ({
  label,
  contactName: "Test Contact",
  phone: "+91 98000 00000",
  line1: "1 Test Street",
  city,
  state: "Rajasthan",
  postalCode: "302001",
});

before(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongo.getUri("courier_test");
  process.env.JWT_SECRET = crypto.randomBytes(48).toString("hex");
  process.env.AUTH_RATE_LIMIT = "1000";

  const connectDB = require("../src/config/db");
  const app = require("../src/app");
  const { seedDatabase } = require("../src/seed/seedData");
  await connectDB();
  await seedDatabase();

  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  tokens.admin = await login("admin@courier.test", "Admin@1234");
  tokens.staff = await login("staff@courier.test", "Staff@1234");
  tokens.agent = await login("agent@courier.test", "Agent@1234");
  tokens.customer = await login("customer@courier.test", "Customer@1234");
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await require("mongoose").disconnect();
  await mongo.stop();
});

test("register creates a customer and ignores a requested role", async () => {
  const { status, data } = await api("POST", "/auth/register", {
    body: {
      name: "New Person",
      email: "new@person.test",
      phone: "9876543210",
      password: "Password1!",
      role: "admin",
      isActive: false,
    },
  });
  assert.equal(status, 201);
  assert.equal(data.user.role, "customer");
  assert.equal(data.user.isActive, true);
  assert.equal(data.user.password, undefined);
  tokens.newCustomer = data.token;
});

test("register validates fields and rejects duplicate email", async () => {
  const invalid = await api("POST", "/auth/register", { body: { name: "", email: "bad", phone: "x", password: "1" } });
  assert.equal(invalid.status, 400);
  assert.deepEqual(Object.keys(invalid.data.errors).sort(), ["email", "name", "password", "phone"]);

  const duplicate = await api("POST", "/auth/register", {
    body: { name: "Copy", email: "NEW@person.test", phone: "9876543210", password: "Password1!" },
  });
  assert.equal(duplicate.status, 409);
});

test("login rejects wrong password and operator injection", async () => {
  const wrong = await api("POST", "/auth/login", { body: { email: "admin@courier.test", password: "nope" } });
  assert.equal(wrong.status, 401);

  const injected = await api("POST", "/auth/login", { body: { email: { $ne: null }, password: { $ne: null } } });
  assert.equal(injected.status, 400);
});

test("protected routes need a valid token", async () => {
  assert.equal((await api("GET", "/shipments")).status, 401);
  assert.equal((await api("GET", "/shipments", { token: "garbage" })).status, 401);

  const token = await login("customer3@courier.test", "Customer@1234");
  assert.equal((await api("GET", "/auth/me", { token })).status, 200);
  assert.equal((await api("POST", "/auth/logout", { token })).status, 200);
});

test("role middleware blocks other roles", async () => {
  assert.equal((await api("GET", "/users", { token: tokens.customer })).status, 403);
  assert.equal((await api("GET", "/users", { token: tokens.agent })).status, 403);
  assert.equal((await api("GET", "/addresses", { token: tokens.agent })).status, 403);
  assert.equal((await api("GET", "/assignments", { token: tokens.customer })).status, 403);
});

test("staff can't see admins or create non-customers", async () => {
  const list = await api("GET", "/users?role=admin&limit=100", { token: tokens.staff });
  assert.equal(list.status, 200);
  assert.ok(list.data.items.every((user) => user.role !== "admin"));

  const created = await api("POST", "/users", {
    token: tokens.staff,
    body: { name: "Sneaky", email: "s@x.test", phone: "9876543210", password: "Password1!", role: "admin" },
  });
  assert.equal(created.status, 403);
});

test("list search, filter, sort and pagination work", async () => {
  const page = await api("GET", "/shipments?page=2&limit=5&sort=-weightKg", { token: tokens.admin });
  assert.equal(page.status, 200);
  assert.equal(page.data.items.length, 5);
  assert.equal(page.data.page, 2);
  assert.equal(page.data.total, 30);
  assert.equal(page.data.totalPages, 6);
  const weights = page.data.items.map((item) => item.weightKg);
  assert.deepEqual(weights, [...weights].sort((a, b) => b - a));

  const delivered = await api("GET", "/shipments?status=delivered&limit=100", { token: tokens.admin });
  assert.ok(delivered.data.total > 0);
  assert.ok(delivered.data.items.every((item) => item.status === "delivered"));

  const tracking = page.data.items[0].trackingNumber;
  const search = await api("GET", `/shipments?q=${tracking}`, { token: tokens.admin });
  assert.equal(search.data.total, 1);

  assert.equal((await api("GET", "/shipments?status=nonsense", { token: tokens.admin })).status, 400);
  const regexChars = await api("GET", "/shipments?q=(.*)", { token: tokens.admin });
  assert.equal(regexChars.status, 200);
  assert.equal(regexChars.data.total, 0);
  const capped = await api("GET", "/shipments?limit=5000", { token: tokens.admin });
  assert.equal(capped.data.limit, 100);
});

test("customers only see their own shipments, even with a filter in the URL", async () => {
  const { data: me } = await api("GET", "/auth/me", { token: tokens.customer });
  const { data: all } = await api("GET", "/shipments?limit=100", { token: tokens.admin });
  const someoneElse = all.items.find((item) => item.customer._id !== me.user._id);

  // Asking for someone else's shipments still returns only their own.
  const filtered = await api("GET", `/shipments?customer=${someoneElse.customer._id}&limit=100`, { token: tokens.customer });
  assert.ok(filtered.data.items.every((item) => item.customer._id === me.user._id));

  const own = await api("GET", "/shipments?limit=100", { token: tokens.customer });
  assert.ok(own.data.total > 0);
  assert.ok(own.data.items.every((item) => item.customer._id === me.user._id));

  assert.equal((await api("GET", `/shipments/${someoneElse._id}`, { token: tokens.customer })).status, 404);

  const events = await api("GET", "/tracking-events?limit=100", { token: tokens.customer });
  assert.ok(events.data.total > 0);
  assert.ok(events.data.items.every((event) => own.data.items.some((item) => item._id === event.shipment._id)));
});

test("customers can't use another customer's address", async () => {
  const { data: others } = await api("GET", "/addresses?limit=100", { token: tokens.admin });
  const { data: me } = await api("GET", "/auth/me", { token: tokens.newCustomer });
  const foreign = others.items.find((item) => item.owner._id !== me.user._id);

  const own = await api("POST", "/addresses", { token: tokens.newCustomer, body: addressBody("Home", "Jaipur") });
  assert.equal(own.status, 201);
  ids.sender = own.data._id;

  const attempt = await api("POST", "/shipments", {
    token: tokens.newCustomer,
    body: {
      senderAddress: ids.sender,
      receiverAddress: foreign._id,
      description: "Stolen address",
      weightKg: 1,
      serviceType: "standard",
    },
  });
  assert.equal(attempt.status, 400);
  assert.ok(attempt.data.errors.receiverAddress);

  assert.equal((await api("GET", `/addresses/${foreign._id}`, { token: tokens.newCustomer })).status, 404);
  assert.equal((await api("DELETE", `/addresses/${foreign._id}`, { token: tokens.newCustomer })).status, 404);
});

test("full delivery workflow: create, assign, checkpoints, failed attempt, delivery", async () => {
  const receiver = await api("POST", "/addresses", { token: tokens.newCustomer, body: addressBody("Friend", "Pune") });
  ids.receiver = receiver.data._id;

  const created = await api("POST", "/shipments", {
    token: tokens.newCustomer,
    body: {
      senderAddress: ids.sender,
      receiverAddress: ids.receiver,
      description: "Birthday gift",
      weightKg: "2.5",
      serviceType: "express",
      customer: "ignored",
      status: "delivered",
    },
  });
  assert.equal(created.status, 201);
  assert.equal(created.data.status, "created");
  assert.match(created.data.trackingNumber, /^CTS[2-9A-HJ-NP-Z]{10}$/);
  const { trackingNumber, _id: shipmentId } = created.data;
  ids.shipment = shipmentId;
  ids.trackingNumber = trackingNumber;

  // Address in use can't be edited or removed.
  const used = await api("DELETE", `/addresses/${ids.sender}`, { token: tokens.newCustomer });
  assert.equal(used.status, 409);

  const { data: agents } = await api("GET", "/users?role=agent&q=agent@courier.test", { token: tokens.staff });
  const agentId = agents.items[0]._id;
  const { data: other } = await api("GET", "/users?role=agent&q=agent2@courier.test", { token: tokens.staff });

  // Wrong agent can't touch it, and customers can't assign.
  assert.equal(
    (await api("POST", "/assignments", { token: tokens.customer, body: { trackingNumber, agent: agentId } })).status,
    403,
  );
  assert.equal(
    (await api("POST", "/tracking-events", { token: tokens.agent, body: { trackingNumber, status: "picked_up", location: "Jaipur" } })).status,
    404,
  );

  // Non-agent users can't be assigned.
  const notAgent = await api("POST", "/assignments", {
    token: tokens.staff,
    body: { trackingNumber, agent: (await api("GET", "/auth/me", { token: tokens.newCustomer })).data.user._id },
  });
  assert.equal(notAgent.status, 400);

  // Reassigning closes the previous assignment and leaves one active.
  const first = await api("POST", "/assignments", { token: tokens.staff, body: { trackingNumber, agent: other.items[0]._id } });
  assert.equal(first.status, 201);
  const second = await api("POST", "/assignments", { token: tokens.staff, body: { trackingNumber, agent: agentId } });
  assert.equal(second.status, 201);
  const duplicate = await api("POST", "/assignments", { token: tokens.staff, body: { trackingNumber, agent: agentId } });
  assert.equal(duplicate.status, 409);
  const history = await api("GET", `/assignments?tracking=${trackingNumber}`, { token: tokens.staff });
  assert.deepEqual(history.data.items.map((item) => item.status).sort(), ["active", "cancelled"]);

  const checkpoint = (status, location) =>
    api("POST", "/tracking-events", { token: tokens.agent, body: { trackingNumber, status, location } });

  // Status can't skip ahead, can't be set to delivered by a plain checkpoint.
  assert.equal((await checkpoint("out_for_delivery", "Pune")).status, 409);
  assert.equal((await checkpoint("delivered", "Pune")).status, 400);

  assert.equal((await checkpoint("picked_up", "Jaipur Hub")).status, 201);
  assert.equal((await checkpoint("in_transit", "Nagpur Sorting Centre")).status, 201);
  assert.equal((await checkpoint("in_transit", "Pune Sorting Centre")).status, 201);

  // Attempt needs out-for-delivery first.
  const early = await api("POST", "/delivery-attempts", {
    token: tokens.agent,
    body: { trackingNumber, outcome: "failed", failureReason: "refused", location: "Pune" },
  });
  assert.equal(early.status, 409);

  assert.equal((await checkpoint("out_for_delivery", "Pune Hub")).status, 201);

  const missingReason = await api("POST", "/delivery-attempts", {
    token: tokens.agent,
    body: { trackingNumber, outcome: "failed", location: "Pune" },
  });
  assert.equal(missingReason.status, 400);

  const failed = await api("POST", "/delivery-attempts", {
    token: tokens.agent,
    body: { trackingNumber, outcome: "failed", failureReason: "recipient_unavailable", location: "Pune", note: "Gate code 4412" },
  });
  assert.equal(failed.status, 201);
  assert.equal(failed.data.attemptNumber, 1);

  assert.equal((await checkpoint("out_for_delivery", "Pune Hub")).status, 201);

  const delivered = await api("POST", "/delivery-attempts", {
    token: tokens.agent,
    body: { trackingNumber, outcome: "delivered", receivedBy: "Secret Recipient", location: "Pune" },
  });
  assert.equal(delivered.status, 201);
  assert.equal(delivered.data.attemptNumber, 2);
  ids.deliveredAttempt = delivered.data._id;

  const detail = await api("GET", `/shipments/${shipmentId}`, { token: tokens.newCustomer });
  assert.equal(detail.data.shipment.status, "delivered");
  assert.ok(detail.data.shipment.deliveredAt);
  assert.equal(detail.data.events.length, 8);
  assert.equal(detail.data.attempts.length, 2);

  // A closed shipment doesn't accept anything further.
  assert.equal((await checkpoint("in_transit", "Pune")).status, 409);
  assert.equal(
    (await api("POST", "/assignments", { token: tokens.staff, body: { trackingNumber, agent: other.items[0]._id } })).status,
    409,
  );
  const closed = await api("GET", `/assignments?tracking=${trackingNumber}&status=active`, { token: tokens.staff });
  assert.equal(closed.data.total, 0);
});

test("public tracking shows history without private details", async () => {
  const { status, data } = await api("GET", `/track/${ids.trackingNumber.toLowerCase()}`);
  assert.equal(status, 200);
  assert.equal(data.status, "delivered");
  assert.equal(data.events.length, 8);
  assert.equal(data.attemptCount, 2);
  assert.equal(data.events[1].description, "Out for delivery");

  const raw = JSON.stringify(data);
  for (const secret of ["Secret Recipient", "Gate code", "Test Contact", "1 Test Street", "98000", "customer", "recordedBy"]) {
    assert.ok(!raw.includes(secret), `public tracking leaked: ${secret}`);
  }

  assert.equal((await api("GET", "/track/CTS2222222222")).status, 404);
  assert.equal((await api("GET", "/track/not-a-number")).status, 404);
});

test("deleting the latest delivered attempt reverts the shipment and reopens the assignment", async () => {
  assert.equal((await api("DELETE", `/delivery-attempts/${ids.deliveredAttempt}`, { token: tokens.staff })).status, 403);
  assert.equal((await api("DELETE", `/delivery-attempts/${ids.deliveredAttempt}`, { token: tokens.admin })).status, 200);

  const { data } = await api("GET", `/shipments/${ids.shipment}`, { token: tokens.admin });
  assert.equal(data.shipment.status, "out_for_delivery");
  assert.equal(data.shipment.deliveredAt, undefined);
  assert.equal(data.events.length, 7);
  const active = await api("GET", `/assignments?tracking=${ids.trackingNumber}&status=active`, { token: tokens.staff });
  assert.equal(active.data.total, 1);
});

test("first event and attempt-linked events can't be deleted directly", async () => {
  const { data } = await api("GET", `/shipments/${ids.shipment}`, { token: tokens.admin });
  const firstEvent = data.events.find((event) => event.status === "created");
  const attemptEvent = data.events.find((event) => event.attempt);
  assert.equal((await api("DELETE", `/tracking-events/${firstEvent._id}`, { token: tokens.staff })).status, 409);
  assert.equal((await api("DELETE", `/tracking-events/${attemptEvent._id}`, { token: tokens.staff })).status, 409);

  const latest = data.events[0];
  assert.equal((await api("DELETE", `/tracking-events/${latest._id}`, { token: tokens.staff })).status, 200);
  const after = await api("GET", `/shipments/${ids.shipment}`, { token: tokens.admin });
  assert.equal(after.data.shipment.status, "failed_attempt");
});

test("customer can cancel only before pickup", async () => {
  const shipment = await api("POST", "/shipments", {
    token: tokens.newCustomer,
    body: {
      senderAddress: ids.sender,
      receiverAddress: ids.receiver,
      description: "Change of plan",
      weightKg: 1,
      serviceType: "standard",
    },
  });
  const cancelled = await api("POST", `/shipments/${shipment.data._id}/cancel`, { token: tokens.newCustomer });
  assert.equal(cancelled.status, 200);
  assert.equal(cancelled.data.status, "cancelled");

  const again = await api("POST", `/shipments/${shipment.data._id}/cancel`, { token: tokens.newCustomer });
  assert.equal(again.status, 409);

  const late = await api("POST", `/shipments/${ids.shipment}/cancel`, { token: tokens.newCustomer });
  assert.equal(late.status, 409);
});

test("users with records can't be deleted; admin can't lock themselves out", async () => {
  const { data: me } = await api("GET", "/auth/me", { token: tokens.admin });
  assert.equal((await api("DELETE", `/users/${me.user._id}`, { token: tokens.admin })).status, 400);

  const demote = await api("PUT", `/users/${me.user._id}`, {
    token: tokens.admin,
    body: { name: me.user.name, email: me.user.email, phone: me.user.phone, role: "customer" },
  });
  assert.equal(demote.status, 400);

  const { data: customer } = await api("GET", "/auth/me", { token: tokens.customer });
  assert.equal((await api("DELETE", `/users/${customer.user._id}`, { token: tokens.admin })).status, 409);
});

test("deactivating a user ends their session straight away", async () => {
  const created = await api("POST", "/users", {
    token: tokens.admin,
    body: { name: "Temp Agent", email: "temp@courier.test", phone: "9876543210", password: "Password1!", role: "agent" },
  });
  assert.equal(created.status, 201);
  const token = await login("temp@courier.test", "Password1!");

  const updated = await api("PUT", `/users/${created.data._id}`, {
    token: tokens.admin,
    body: { name: "Temp Agent", email: "temp@courier.test", phone: "9876543210", role: "agent", isActive: false },
  });
  assert.equal(updated.status, 200);
  assert.equal((await api("GET", "/auth/me", { token })).status, 401);
  assert.equal((await api("POST", "/auth/login", { body: { email: "temp@courier.test", password: "Password1!" } })).status, 403);

  assert.equal((await api("DELETE", `/users/${created.data._id}`, { token: tokens.admin })).status, 200);
});

test("changing password needs the current password", async () => {
  const token = await login("customer2@courier.test", "Customer@1234");
  const wrong = await api("PUT", "/auth/password", {
    token,
    body: { currentPassword: "wrong-password", newPassword: "Another@1234" },
  });
  assert.equal(wrong.status, 400);

  const changed = await api("PUT", "/auth/password", {
    token,
    body: { currentPassword: "Customer@1234", newPassword: "Another@1234" },
  });
  assert.equal(changed.status, 200);
  await login("customer2@courier.test", "Another@1234");
});

test("summary report is scoped by role", async () => {
  const admin = await api("GET", "/reports/summary", { token: tokens.admin });
  assert.equal(admin.status, 200);
  assert.ok(admin.data.totals.shipments >= 30);
  assert.equal(admin.data.daily.length, 7);
  assert.equal(admin.data.byStatus.length, 8);
  assert.ok(admin.data.agentPerformance.length > 0);

  const customer = await api("GET", "/reports/summary", { token: tokens.customer });
  assert.ok(customer.data.totals.shipments < admin.data.totals.shipments);
  assert.equal(customer.data.agentPerformance, undefined);

  const agent = await api("GET", "/reports/summary", { token: tokens.agent });
  assert.ok(agent.data.totals.shipments < admin.data.totals.shipments);
  assert.equal(agent.data.agentPerformance, undefined);
});

test("errors are clean JSON", async () => {
  const notFound = await api("GET", "/nope");
  assert.equal(notFound.status, 404);
  const badId = await api("GET", "/shipments/not-an-id", { token: tokens.admin });
  assert.equal(badId.status, 400);

  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{not json",
  });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).message, "Invalid request");
});
