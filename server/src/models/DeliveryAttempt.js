const mongoose = require("mongoose");
const { ATTEMPT_OUTCOMES, FAILURE_REASONS } = require("./constants");

const deliveryAttemptSchema = new mongoose.Schema(
  {
    shipment: { type: mongoose.Schema.Types.ObjectId, ref: "Shipment", required: true },
    assignment: { type: mongoose.Schema.Types.ObjectId, ref: "Assignment", required: true },
    agent: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    attemptNumber: { type: Number, required: true, min: 1 },
    outcome: { type: String, enum: ATTEMPT_OUTCOMES, required: true },
    failureReason: { type: String, enum: Object.keys(FAILURE_REASONS) },
    receivedBy: { type: String, trim: true, maxlength: 80 },
    location: { type: String, required: true, trim: true, maxlength: 120 },
    note: { type: String, trim: true, maxlength: 300 },
    attemptedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

deliveryAttemptSchema.index({ shipment: 1, attemptNumber: 1 }, { unique: true });
deliveryAttemptSchema.index({ agent: 1, attemptedAt: -1 });
deliveryAttemptSchema.index({ outcome: 1, attemptedAt: -1 });

module.exports = mongoose.model("DeliveryAttempt", deliveryAttemptSchema);
