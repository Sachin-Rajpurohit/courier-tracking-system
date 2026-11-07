const mongoose = require("mongoose");
const { ASSIGNMENT_STATUSES } = require("./constants");

const assignmentSchema = new mongoose.Schema(
  {
    shipment: { type: mongoose.Schema.Types.ObjectId, ref: "Shipment", required: true },
    agent: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ASSIGNMENT_STATUSES, default: "active" },
    note: { type: String, trim: true, maxlength: 300 },
    assignedAt: { type: Date, default: Date.now },
    closedAt: { type: Date },
  },
  { timestamps: true },
);

// A shipment can only have one active assignment at a time.
assignmentSchema.index(
  { shipment: 1 },
  { unique: true, partialFilterExpression: { status: "active" }, name: "one_active_per_shipment" },
);
assignmentSchema.index({ shipment: 1, assignedAt: -1 });
assignmentSchema.index({ agent: 1, status: 1, assignedAt: -1 });

module.exports = mongoose.model("Assignment", assignmentSchema);
