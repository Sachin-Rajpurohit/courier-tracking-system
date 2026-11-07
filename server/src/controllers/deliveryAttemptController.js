const { DeliveryAttempt, Shipment, TrackingEvent } = require("../models");
const { ATTEMPT_OUTCOMES, FAILURE_REASONS } = require("../models/constants");
const ApiError = require("../utils/ApiError");
const { text, searchRegex, parseList, enumFilter, idFilter, dateRange, withoutEmpty, paginate } = require("../utils/listQuery");
const { isManager, findShipmentForUser } = require("../utils/access");
const workflow = require("../services/shipmentWorkflow");
const { isBlank } = require("../validators/rules");

const POPULATE = [
  { path: "shipment", select: "trackingNumber status" },
  { path: "agent", select: "name" },
];

async function listAttempts(req, res) {
  const options = parseList(req.query, ["attemptedAt", "attemptNumber", "outcome"], "-attemptedAt");
  const tracking = text(req.query.tracking);

  const filter = withoutEmpty({
    outcome: enumFilter(req.query.outcome, ATTEMPT_OUTCOMES, "outcome"),
    failureReason: enumFilter(req.query.failureReason, Object.keys(FAILURE_REASONS), "failure reason"),
    agent: idFilter(req.query.agent, "agent"),
    attemptedAt: dateRange(req.query.from, req.query.to),
  });
  if (tracking) {
    filter.shipment = {
      $in: await Shipment.find({ trackingNumber: searchRegex(tracking) }).distinct("_id"),
    };
  }
  if (!isManager(req.user)) filter.agent = req.user._id;

  res.json(await paginate(DeliveryAttempt, filter, options, POPULATE));
}

async function findAttempt(req) {
  const scope = isManager(req.user) ? {} : { agent: req.user._id };
  const attempt = await DeliveryAttempt.findOne({ _id: req.params.id, ...scope });
  if (!attempt) throw new ApiError(404, "Delivery attempt not found");
  return attempt;
}

async function getAttempt(req, res) {
  const attempt = await findAttempt(req);
  await attempt.populate(POPULATE);
  res.json(attempt);
}

async function createAttempt(req, res) {
  const shipment = await findShipmentForUser(req.user, {
    trackingNumber: req.body.trackingNumber.trim().toUpperCase(),
  });
  const { attempt } = await workflow.recordAttempt({
    shipment,
    outcome: req.body.outcome,
    failureReason: req.body.failureReason,
    receivedBy: text(req.body.receivedBy) || undefined,
    location: req.body.location.trim(),
    note: text(req.body.note) || undefined,
  });
  res.status(201).json(attempt);
}

// The outcome can't change here: delete the attempt and record it again to correct it.
async function updateAttempt(req, res) {
  const attempt = await findAttempt(req);
  const errors = {};

  if (attempt.outcome === "delivered") {
    if (isBlank(req.body.receivedBy)) errors.receivedBy = "Received by is required";
    attempt.receivedBy = text(req.body.receivedBy);
  } else {
    if (isBlank(req.body.failureReason)) errors.failureReason = "Failure reason is required";
    attempt.failureReason = req.body.failureReason;
  }
  if (Object.keys(errors).length > 0) {
    throw new ApiError(400, "Please correct the highlighted fields", errors);
  }
  attempt.note = text(req.body.note) || undefined;

  await attempt.save();
  await TrackingEvent.updateOne(
    { attempt: attempt._id },
    { note: attempt.note || "", description: workflow.attemptDescription(attempt) },
  );
  res.json(attempt);
}

async function deleteAttempt(req, res) {
  const attempt = await findAttempt(req);
  await workflow.deleteAttempt(attempt);
  res.json({ message: "Delivery attempt deleted" });
}

module.exports = { listAttempts, getAttempt, createAttempt, updateAttempt, deleteAttempt };
