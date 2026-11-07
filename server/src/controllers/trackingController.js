const { Shipment, TrackingEvent, DeliveryAttempt } = require("../models");
const ApiError = require("../utils/ApiError");
const { TRACKING_PATTERN } = require("../utils/trackingNumber");

// Public endpoint: only cities and status history, never names, phones, streets or staff notes.
async function trackShipment(req, res) {
  const trackingNumber = req.params.trackingNumber.trim().toUpperCase();
  if (!TRACKING_PATTERN.test(trackingNumber)) {
    throw new ApiError(404, "We couldn't find a shipment with that tracking number");
  }

  const shipment = await Shipment.findOne({ trackingNumber }).populate([
    { path: "senderAddress", select: "city state" },
    { path: "receiverAddress", select: "city state" },
  ]);
  if (!shipment) {
    throw new ApiError(404, "We couldn't find a shipment with that tracking number");
  }

  const [events, attemptCount] = await Promise.all([
    TrackingEvent.find({ shipment: shipment._id })
      .sort({ occurredAt: -1, _id: -1 })
      .select("status location description occurredAt -_id"),
    DeliveryAttempt.countDocuments({ shipment: shipment._id }),
  ]);

  res.json({
    trackingNumber: shipment.trackingNumber,
    status: shipment.status,
    serviceType: shipment.serviceType,
    currentLocation: shipment.currentLocation,
    origin: `${shipment.senderAddress.city}, ${shipment.senderAddress.state}`,
    destination: `${shipment.receiverAddress.city}, ${shipment.receiverAddress.state}`,
    expectedDeliveryDate: shipment.expectedDeliveryDate,
    deliveredAt: shipment.deliveredAt,
    attemptCount,
    events,
  });
}

module.exports = { trackShipment };
