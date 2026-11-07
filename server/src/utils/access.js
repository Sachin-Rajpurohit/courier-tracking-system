const { Shipment } = require("../models");
const ApiError = require("./ApiError");

function isManager(user) {
  return user.role === "admin" || user.role === "staff";
}

// Records outside a user's scope return 404 so they can't probe for other people's data.
function shipmentScope(user) {
  if (user.role === "customer") return { customer: user._id };
  if (user.role === "agent") return { assignedAgent: user._id };
  return {};
}

async function findShipmentForUser(user, filter) {
  const shipment = await Shipment.findOne({ ...filter, ...shipmentScope(user) });
  if (!shipment) throw new ApiError(404, "Shipment not found");
  return shipment;
}

// Filter for records that belong to a shipment (events), narrowed by scope and tracking number search.
async function shipmentIdFilter(user, trackingSearch) {
  const scope = shipmentScope(user);
  const filter = { ...scope };
  if (trackingSearch) filter.trackingNumber = trackingSearch;
  if (Object.keys(filter).length === 0) return undefined;
  const ids = await Shipment.find(filter).distinct("_id");
  return { $in: ids };
}

module.exports = { isManager, shipmentScope, findShipmentForUser, shipmentIdFilter };
