const mongoose = require("mongoose");
const ApiError = require("../utils/ApiError");

function notFound(req, res, next) {
  next(new ApiError(404, "Route not found"));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ message: err.message, errors: err.errors });
  }
  if (err instanceof mongoose.Error.ValidationError) {
    const errors = {};
    for (const [field, detail] of Object.entries(err.errors)) {
      errors[field] = detail.message;
    }
    return res.status(400).json({ message: "Please correct the highlighted fields", errors });
  }
  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({ message: `Invalid ${err.path}` });
  }
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || "record";
    if (field === "email") {
      return res.status(409).json({
        message: "This email is already registered",
        errors: { email: "This email is already registered" },
      });
    }
    return res.status(409).json({ message: "This record already exists or was just changed. Please refresh." });
  }
  // Raised by body-parser for invalid JSON or an oversized body.
  if (err.status >= 400 && err.status < 500) {
    return res.status(err.status).json({ message: "Invalid request" });
  }

  console.error(err);
  res.status(500).json({ message: "Something went wrong. Please try again." });
}

module.exports = { notFound, errorHandler };
