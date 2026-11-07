const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    label: { type: String, required: true, trim: true, maxlength: 40 },
    contactName: { type: String, required: true, trim: true, maxlength: 80 },
    phone: { type: String, required: true, trim: true, match: /^\+?[0-9][0-9 -]{6,18}$/ },
    line1: { type: String, required: true, trim: true, maxlength: 120 },
    line2: { type: String, trim: true, maxlength: 120 },
    city: { type: String, required: true, trim: true, maxlength: 60 },
    state: { type: String, required: true, trim: true, maxlength: 60 },
    postalCode: { type: String, required: true, trim: true, match: /^[A-Za-z0-9 -]{3,10}$/ },
    country: { type: String, trim: true, maxlength: 60, default: "India" },
  },
  { timestamps: true },
);

addressSchema.index({ owner: 1, createdAt: -1 });
addressSchema.index({ city: 1, postalCode: 1 });

module.exports = mongoose.model("Address", addressSchema);
