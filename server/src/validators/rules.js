const mongoose = require("mongoose");

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+?[0-9][0-9 -]{6,18}$/;
const POSTAL_CODE = /^[A-Za-z0-9 -]{3,10}$/;

function isBlank(value) {
  return value === undefined || value === null || value === "";
}

function checkText(errors, body, field, label, { required = true, min = 1, max = 200, pattern, patternMessage } = {}) {
  const value = body[field];
  if (isBlank(value) || (typeof value === "string" && value.trim() === "")) {
    if (required) errors[field] = `${label} is required`;
    return;
  }
  if (typeof value !== "string") {
    errors[field] = `${label} must be text`;
  } else if (value.trim().length < min) {
    errors[field] = `${label} must be at least ${min} characters`;
  } else if (value.trim().length > max) {
    errors[field] = `${label} must be at most ${max} characters`;
  } else if (pattern && !pattern.test(value.trim())) {
    errors[field] = patternMessage || `${label} is not valid`;
  }
}

function checkEnum(errors, body, field, label, allowed, { required = true } = {}) {
  if (isBlank(body[field])) {
    if (required) errors[field] = `${label} is required`;
  } else if (!allowed.includes(body[field])) {
    errors[field] = `${label} is not valid`;
  }
}

function checkId(errors, body, field, label, { required = true } = {}) {
  if (isBlank(body[field])) {
    if (required) errors[field] = `${label} is required`;
  } else if (typeof body[field] !== "string" || !mongoose.isValidObjectId(body[field])) {
    errors[field] = `${label} is not valid`;
  }
}

function checkPassword(errors, body, field = "password", { required = true } = {}) {
  const value = body[field];
  if (isBlank(value)) {
    if (required) errors[field] = "Password is required";
  } else if (typeof value !== "string" || value.length < 8) {
    errors[field] = "Password must be at least 8 characters";
  } else if (Buffer.byteLength(value) > 72) {
    // bcrypt only uses the first 72 bytes.
    errors[field] = "Password must be at most 72 characters";
  }
}

function checkEmail(errors, body) {
  checkText(errors, body, "email", "Email", { max: 120, pattern: EMAIL, patternMessage: "Enter a valid email" });
}

function checkPhone(errors, body) {
  checkText(errors, body, "phone", "Phone", { max: 20, pattern: PHONE, patternMessage: "Enter a valid phone number" });
}

// Copies only the listed fields, so a request can't set role, status or other protected values.
function pick(body, fields) {
  const result = {};
  for (const field of fields) {
    if (body[field] !== undefined) {
      result[field] = typeof body[field] === "string" ? body[field].trim() : body[field];
    }
  }
  return result;
}

module.exports = { POSTAL_CODE, isBlank, checkText, checkEnum, checkId, checkPassword, checkEmail, checkPhone, pick };
