const { TrackingEvent, Shipment } = require("../models");
const { SHIPMENT_STATUSES } = require("../models/constants");
const ApiError = require("../utils/ApiError");
const { text, searchRegex, parseList, enumFilter, dateRange, withoutEmpty, paginate } = require("../utils/listQuery");
const { isManager, shipmentScope, findShipmentForUser, shipmentIdFilter } = require("../utils/access");
const workflow = require("../services/shipmentWorkflow");
const { pick } = require("../validators/rules");

const POPULATE = [
  { path: "shipment", select: "trackingNumber status" },
  { path: "recordedBy", select: "name role" },
];

async function listEvents(req, res) {
  const options = parseList(req.query, ["occurredAt", "status", "location"], "-occurredAt");
  const tracking = text(req.query.tracking);
  const q = text(req.query.q);

  const filter = withoutEmpty({
    status: enumFilter(req.query.status, SHIPMENT_STATUSES, "status"),
    occurredAt: dateRange(req.query.from, req.query.to),
    shipment: await shipmentIdFilter(req.user, tracking ? searchRegex(tracking) : undefined),
  });
  if (q) {
    const regex = searchRegex(q);
    filter.$or = [{ location: regex }, { description: regex }];
  }
  const result = await paginate(TrackingEvent, filter, options, POPULATE);
  res.json(result);
}

async function findEvent(req) {
  const event = await TrackingEvent.findById(req.params.id);
  const allowed = event && (await Shipment.exists({ _id: event.shipment, ...shipmentScope(req.user) }));
  if (!allowed) throw new ApiError(404, "Tracking event not found");
  return event;
}

async function getEvent(req, res) {
  const event = await findEvent(req);
  await event.populate(POPULATE);
  res.json(event);
}

async function createEvent(req, res) {
  const shipment = await findShipmentForUser(req.user, {
    trackingNumber: req.body.trackingNumber.trim().toUpperCase(),
  });
  if (req.body.status === "cancelled" && !isManager(req.user)) {
    throw new ApiError(403, "Only branch staff can cancel a shipment");
  }
  const { event } = await workflow.addCheckpoint({
    shipment,
    status: req.body.status,
    location: req.body.location.trim(),
    note: text(req.body.note) || undefined,
    user: req.user,
  });
  res.status(201).json(event);
}

// Status and time stay fixed so the history can't be rewritten; only corrections to text are allowed.
async function updateEvent(req, res) {
  const event = await findEvent(req);
  if (!isManager(req.user) && !event.recordedBy.equals(req.user._id)) {
    throw new ApiError(403, "You can only edit events you recorded");
  }
  Object.assign(event, pick(req.body, ["location", "note"]));
  await event.save();
  await workflow.syncShipment(event.shipment);
  res.json(event);
}

async function deleteEvent(req, res) {
  const event = await TrackingEvent.findById(req.params.id);
  if (!event) throw new ApiError(404, "Tracking event not found");
  await workflow.deleteEvent(event);
  res.json({ message: "Tracking event deleted" });
}

module.exports = { listEvents, getEvent, createEvent, updateEvent, deleteEvent };
