const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { ROLES } = require("./constants");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    phone: { type: String, required: true, trim: true, match: /^\+?[0-9][0-9 -]{6,18}$/ },
    password: { type: String, required: true, minlength: 8, select: false },
    role: { type: String, enum: ROLES, default: "customer" },
    branch: { type: String, trim: true, maxlength: 80 },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  },
);

userSchema.index({ role: 1, isActive: 1, name: 1 });

userSchema.pre("save", async function () {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
});

userSchema.methods.comparePassword = function (plainPassword) {
  return bcrypt.compare(plainPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
