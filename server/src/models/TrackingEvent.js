const mongoose = require("mongoose");
const { SHIPMENT_STATUSES } = require("./constants");

const trackingEventSchema = new mongoose.Schema(
  {
    shipment: { type: mongoose.Schema.Types.ObjectId, ref: "Shipment", required: true },
    status: { type: String, enum: SHIPMENT_STATUSES, required: true },
    location: { type: String, required: true, trim: true, maxlength: 120 },
    // description is shown on the public tracking page; note is for signed-in users only.
    description: { type: String, required: true, trim: true, maxlength: 200 },
    note: { type: String, trim: true, maxlength: 300 },
    attempt: { type: mongoose.Schema.Types.ObjectId, ref: "DeliveryAttempt", default: null },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    occurredAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

trackingEventSchema.index({ shipment: 1, occurredAt: -1 });
trackingEventSchema.index({ status: 1, occurredAt: -1 });

module.exports = mongoose.model("TrackingEvent", trackingEventSchema);
