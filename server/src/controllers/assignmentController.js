const { Assignment, DeliveryAttempt, Shipment } = require("../models");
const { ASSIGNMENT_STATUSES } = require("../models/constants");
const ApiError = require("../utils/ApiError");
const { text, searchRegex, parseList, enumFilter, idFilter, withoutEmpty, paginate } = require("../utils/listQuery");
const { isManager, findShipmentForUser } = require("../utils/access");
const workflow = require("../services/shipmentWorkflow");

const POPULATE = [
  { path: "shipment", select: "trackingNumber status currentLocation" },
  { path: "agent", select: "name phone" },
  { path: "assignedBy", select: "name" },
];

async function listAssignments(req, res) {
  const options = parseList(req.query, ["assignedAt", "status"], "-assignedAt");
  const tracking = text(req.query.tracking);

  const filter = withoutEmpty({
    status: enumFilter(req.query.status, ASSIGNMENT_STATUSES, "status"),
    agent: idFilter(req.query.agent, "agent"),
  });
  if (tracking) {
    filter.shipment = {
      $in: await Shipment.find({ trackingNumber: searchRegex(tracking) }).distinct("_id"),
    };
  }
  if (!isManager(req.user)) filter.agent = req.user._id;

  res.json(await paginate(Assignment, filter, options, POPULATE));
}

async function findAssignment(req) {
  const scope = isManager(req.user) ? {} : { agent: req.user._id };
  const assignment = await Assignment.findOne({ _id: req.params.id, ...scope });
  if (!assignment) throw new ApiError(404, "Assignment not found");
  return assignment;
}

async function getAssignment(req, res) {
  const assignment = await findAssignment(req);
  await assignment.populate(POPULATE);
  res.json(assignment);
}

async function createAssignment(req, res) {
  const shipment = await findShipmentForUser(req.user, {
    trackingNumber: req.body.trackingNumber.trim().toUpperCase(),
  });
  const assignment = await workflow.assignAgent({
    shipment,
    agentId: req.body.agent,
    note: text(req.body.note) || undefined,
    user: req.user,
  });
  res.status(201).json(assignment);
}

async function updateAssignment(req, res) {
  const assignment = await findAssignment(req);
  if (req.body.status === "cancelled" && assignment.status !== "active") {
    throw new ApiError(409, "Only an active assignment can be cancelled");
  }

  assignment.note = text(req.body.note) || undefined;
  await assignment.save();
  if (req.body.status === "cancelled") await workflow.unassign(assignment);
  res.json(await Assignment.findById(assignment._id));
}

async function deleteAssignment(req, res) {
  const assignment = await findAssignment(req);
  if (await DeliveryAttempt.exists({ assignment: assignment._id })) {
    throw new ApiError(409, "This assignment has delivery attempts and can't be deleted");
  }
  if (assignment.status === "active") await workflow.unassign(assignment);
  await assignment.deleteOne();
  res.json({ message: "Assignment deleted" });
}

module.exports = { listAssignments, getAssignment, createAssignment, updateAssignment, deleteAssignment };
