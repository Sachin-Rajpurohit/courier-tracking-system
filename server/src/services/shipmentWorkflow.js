// The main business rules of the app live in this file.
const { Shipment, TrackingEvent, Assignment, DeliveryAttempt, User } = require("../models");
const {
  TRANSITIONS,
  TERMINAL_STATUSES,
  STATUS_DESCRIPTIONS,
  FAILURE_REASONS,
} = require("../models/constants");
const ApiError = require("../utils/ApiError");

function closeActiveAssignment(shipmentId, status) {
  return Assignment.updateOne({ shipment: shipmentId, status: "active" }, { status, closedAt: new Date() });
}

// Adds a checkpoint: checks the move is allowed, updates the shipment, saves the event.
async function addCheckpoint({ shipment, status, location, note, user }) {
  if (!TRANSITIONS[shipment.status].includes(status)) {
    throw new ApiError(409, `A shipment that is ${shipment.status} can't move to ${status}`);
  }
  if (status === "out_for_delivery" && !shipment.assignedAgent) {
    throw new ApiError(409, "Assign a delivery agent before sending this shipment out for delivery");
  }

  shipment.status = status;
  shipment.currentLocation = location;
  await shipment.save();

  const event = await TrackingEvent.create({
    shipment: shipment._id,
    status,
    location,
    note,
    description: STATUS_DESCRIPTIONS[status],
    recordedBy: user._id,
  });

  if (status === "returned") await closeActiveAssignment(shipment._id, "completed");
  if (status === "cancelled") await closeActiveAssignment(shipment._id, "cancelled");

  return { shipment, event };
}

// Gives a shipment to an agent. Any previous agent's assignment is cancelled first.
async function assignAgent({ shipment, agentId, note, user }) {
  if (TERMINAL_STATUSES.includes(shipment.status)) {
    throw new ApiError(409, "This shipment is closed and can't be assigned");
  }
  const agent = await User.findOne({ _id: agentId, role: "agent", isActive: true });
  if (!agent) {
    throw new ApiError(400, "Please correct the highlighted fields", { agent: "Choose an active delivery agent" });
  }
  if (String(shipment.assignedAgent) === String(agent._id)) {
    throw new ApiError(409, "This agent is already assigned to the shipment");
  }

  await closeActiveAssignment(shipment._id, "cancelled");
  const assignment = await Assignment.create({
    shipment: shipment._id,
    agent: agent._id,
    assignedBy: user._id,
    note,
  });

  shipment.assignedAgent = agent._id;
  await shipment.save();
  return assignment;
}

async function unassign(assignment) {
  await closeActiveAssignment(assignment.shipment, "cancelled");
  await Shipment.updateOne({ _id: assignment.shipment }, { assignedAgent: null });
}

// Records one delivery try. This is the only way a shipment can become delivered.
async function recordAttempt({ shipment, outcome, failureReason, receivedBy, location, note }) {
  if (shipment.status !== "out_for_delivery") {
    throw new ApiError(409, "A delivery attempt can only be recorded while the shipment is out for delivery");
  }
  const assignment = await Assignment.findOne({ shipment: shipment._id, status: "active" });
  if (!assignment) {
    throw new ApiError(409, "This shipment has no active delivery agent");
  }

  const delivered = outcome === "delivered";
  const previousAttempts = await DeliveryAttempt.countDocuments({ shipment: shipment._id });

  const attempt = await DeliveryAttempt.create({
    shipment: shipment._id,
    assignment: assignment._id,
    agent: assignment.agent,
    attemptNumber: previousAttempts + 1,
    outcome,
    failureReason: delivered ? undefined : failureReason,
    receivedBy: delivered ? receivedBy : undefined,
    location,
    note,
  });

  shipment.status = delivered ? "delivered" : "failed_attempt";
  shipment.currentLocation = location;
  if (delivered) shipment.deliveredAt = attempt.attemptedAt;
  await shipment.save();

  await TrackingEvent.create({
    shipment: shipment._id,
    status: shipment.status,
    location,
    note,
    description: attemptDescription(attempt),
    attempt: attempt._id,
    recordedBy: assignment.agent,
    occurredAt: attempt.attemptedAt,
  });

  if (delivered) await closeActiveAssignment(shipment._id, "completed");
  return { attempt, shipment };
}

function attemptDescription(attempt) {
  if (attempt.outcome === "delivered") return STATUS_DESCRIPTIONS.delivered;
  return `${STATUS_DESCRIPTIONS.failed_attempt}: ${FAILURE_REASONS[attempt.failureReason]}`;
}

// After a correction, makes the shipment match its newest remaining event.
async function syncShipment(shipmentId) {
  const latest = await TrackingEvent.findOne({ shipment: shipmentId }).sort({ occurredAt: -1, _id: -1 });
  const shipment = await Shipment.findById(shipmentId);
  shipment.status = latest.status;
  shipment.currentLocation = latest.location;
  shipment.deliveredAt = latest.status === "delivered" ? latest.occurredAt : undefined;
  await shipment.save();
}

async function deleteEvent(event) {
  if (event.attempt) {
    throw new ApiError(409, "This event belongs to a delivery attempt. Delete the attempt instead.");
  }
  if (event.status === "created") {
    throw new ApiError(409, "The first event of a shipment can't be deleted");
  }
  if (TERMINAL_STATUSES.includes(event.status)) {
    throw new ApiError(409, "The event that closed a shipment can't be deleted");
  }
  await event.deleteOne();
  await syncShipment(event.shipment);
}

async function deleteAttempt(attempt) {
  const newer = await DeliveryAttempt.exists({
    shipment: attempt.shipment,
    attemptNumber: { $gt: attempt.attemptNumber },
  });
  if (newer) throw new ApiError(409, "Only the latest attempt of a shipment can be deleted");

  await TrackingEvent.deleteOne({ attempt: attempt._id });
  await attempt.deleteOne();
  await syncShipment(attempt.shipment);

  // Undoing a delivery gives the job back to the agent.
  if (attempt.outcome === "delivered") {
    await Assignment.updateOne({ _id: attempt.assignment }, { status: "active", $unset: { closedAt: 1 } });
  }
}

async function deleteShipment(shipment) {
  await TrackingEvent.deleteMany({ shipment: shipment._id });
  await DeliveryAttempt.deleteMany({ shipment: shipment._id });
  await Assignment.deleteMany({ shipment: shipment._id });
  await shipment.deleteOne();
}

module.exports = {
  addCheckpoint,
  assignAgent,
  unassign,
  recordAttempt,
  attemptDescription,
  syncShipment,
  deleteEvent,
  deleteAttempt,
  deleteShipment,
};
