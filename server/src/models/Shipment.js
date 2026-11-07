const mongoose = require("mongoose");
const { SHIPMENT_STATUSES, SERVICE_TYPES } = require("./constants");

const shipmentSchema = new mongoose.Schema(
  {
    trackingNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    senderAddress: { type: mongoose.Schema.Types.ObjectId, ref: "Address", required: true },
    receiverAddress: { type: mongoose.Schema.Types.ObjectId, ref: "Address", required: true },
    description: { type: String, required: true, trim: true, maxlength: 200 },
    weightKg: { type: Number, required: true, min: 0.01, max: 1000 },
    serviceType: { type: String, enum: SERVICE_TYPES, default: "standard" },
    status: { type: String, enum: SHIPMENT_STATUSES, default: "created" },
    originBranch: { type: String, required: true, trim: true, maxlength: 80 },
    currentLocation: { type: String, trim: true, maxlength: 120 },
    // Copy of the active assignment's agent, so agent lists stay a simple indexed query.
    assignedAgent: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    expectedDeliveryDate: { type: Date },
    deliveredAt: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

shipmentSchema.index({ customer: 1, createdAt: -1 });
shipmentSchema.index({ assignedAgent: 1, status: 1 });
shipmentSchema.index({ status: 1, createdAt: -1 });
shipmentSchema.index({ deliveredAt: 1 });

module.exports = mongoose.model("Shipment", shipmentSchema);
