const jwt = require("jsonwebtoken");
const { User } = require("../models");
const ApiError = require("../utils/ApiError");
const { pick } = require("../validators/rules");

function signToken(user) {
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

async function register(req, res) {
  // Public sign-up can only create customers. Other roles are created by an admin.
  const user = await User.create({ ...pick(req.body, ["name", "email", "phone"]), password: req.body.password });
  res.status(201).json({ token: signToken(user), user });
}

async function login(req, res) {
  const email = req.body.email.trim().toLowerCase();
  const user = await User.findOne({ email }).select("+password");

  if (!user || !(await user.comparePassword(req.body.password))) {
    throw new ApiError(401, "Incorrect email or password");
  }
  if (!user.isActive) {
    throw new ApiError(403, "This account has been deactivated. Please contact an administrator.");
  }
  res.json({ token: signToken(user), user });
}

// A JWT is kept by the browser, so logging out means the browser deletes it.
function logout(req, res) {
  res.json({ message: "Logged out" });
}

function me(req, res) {
  res.json({ user: req.user });
}

async function updateProfile(req, res) {
  Object.assign(req.user, pick(req.body, ["name", "phone"]));
  await req.user.save();
  res.json({ user: req.user });
}

async function changePassword(req, res) {
  const user = await User.findById(req.user._id).select("+password");
  if (!(await user.comparePassword(req.body.currentPassword))) {
    throw new ApiError(400, "Please correct the highlighted fields", {
      currentPassword: "Current password is incorrect",
    });
  }
  user.password = req.body.newPassword;
  await user.save();
  res.json({ message: "Password updated" });
}

module.exports = { register, login, logout, me, updateProfile, changePassword };
