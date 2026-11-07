const {
  ROLES,
  SERVICE_TYPES,
  CHECKPOINT_STATUSES,
  ATTEMPT_OUTCOMES,
  FAILURE_REASONS,
} = require("../models/constants");
const { TRACKING_PATTERN } = require("../utils/trackingNumber");
const {
  POSTAL_CODE,
  isBlank,
  checkText,
  checkEnum,
  checkId,
  checkPassword,
  checkEmail,
  checkPhone,
} = require("./rules");

function register(body) {
  const errors = {};
  checkText(errors, body, "name", "Name", { min: 2, max: 80 });
  checkEmail(errors, body);
  checkPhone(errors, body);
  checkPassword(errors, body);
  return errors;
}

function login(body) {
  const errors = {};
  checkEmail(errors, body);
  if (isBlank(body.password) || typeof body.password !== "string") errors.password = "Password is required";
  return errors;
}

function updateProfile(body) {
  const errors = {};
  checkText(errors, body, "name", "Name", { min: 2, max: 80 });
  checkPhone(errors, body);
  return errors;
}

function changePassword(body) {
  const errors = {};
  if (isBlank(body.currentPassword) || typeof body.currentPassword !== "string") {
    errors.currentPassword = "Current password is required";
  }
  checkPassword(errors, body, "newPassword");
  return errors;
}

function checkUserFields(errors, body) {
  checkText(errors, body, "name", "Name", { min: 2, max: 80 });
  checkEmail(errors, body);
  checkPhone(errors, body);
  checkEnum(errors, body, "role", "Role", ROLES);
  checkText(errors, body, "branch", "Branch", { required: false, max: 80 });
  if (!isBlank(body.isActive) && typeof body.isActive !== "boolean") errors.isActive = "Active must be true or false";
}

function createUser(body) {
  const errors = {};
  checkUserFields(errors, body);
  checkPassword(errors, body);
  return errors;
}

function updateUser(body) {
  const errors = {};
  checkUserFields(errors, body);
  checkPassword(errors, body, "password", { required: false });
  return errors;
}

function address(body, req) {
  const errors = {};
  if (req.user.role !== "customer") checkId(errors, body, "owner", "Owner");
  checkText(errors, body, "label", "Label", { max: 40 });
  checkText(errors, body, "contactName", "Contact name", { max: 80 });
  checkPhone(errors, body);
  checkText(errors, body, "line1", "Address line 1", { max: 120 });
  checkText(errors, body, "line2", "Address line 2", { required: false, max: 120 });
  checkText(errors, body, "city", "City", { max: 60 });
  checkText(errors, body, "state", "State", { max: 60 });
  checkText(errors, body, "postalCode", "Postal code", {
    max: 10,
    pattern: POSTAL_CODE,
    patternMessage: "Enter a valid postal code",
  });
  checkText(errors, body, "country", "Country", { required: false, max: 60 });
  return errors;
}

function checkDate(errors, body, field, label) {
  if (isBlank(body[field])) return;
  const date = new Date(body[field]);
  if (typeof body[field] !== "string" || Number.isNaN(date.getTime())) {
    errors[field] = `${label} is not a valid date`;
  }
}

function shipment(body, req) {
  const errors = {};
  if (req.user.role !== "customer") {
    checkId(errors, body, "customer", "Customer");
    checkText(errors, body, "originBranch", "Origin branch", { required: false, max: 80 });
    checkDate(errors, body, "expectedDeliveryDate", "Expected delivery date");
  }
  checkId(errors, body, "senderAddress", "Sender address");
  checkId(errors, body, "receiverAddress", "Receiver address");
  if (!errors.senderAddress && !errors.receiverAddress && body.senderAddress === body.receiverAddress) {
    errors.receiverAddress = "Receiver address must be different from the sender address";
  }
  checkText(errors, body, "description", "Description", { min: 3, max: 200 });
  const weight = Number(body.weightKg);
  if (isBlank(body.weightKg)) {
    errors.weightKg = "Weight is required";
  } else if (typeof body.weightKg === "object" || !Number.isFinite(weight) || weight < 0.01 || weight > 1000) {
    errors.weightKg = "Weight must be between 0.01 and 1000 kg";
  }
  checkEnum(errors, body, "serviceType", "Service type", SERVICE_TYPES);
  return errors;
}

function checkTrackingNumber(errors, body) {
  if (isBlank(body.trackingNumber)) {
    errors.trackingNumber = "Tracking number is required";
  } else if (typeof body.trackingNumber !== "string" || !TRACKING_PATTERN.test(body.trackingNumber.trim().toUpperCase())) {
    errors.trackingNumber = "Enter a valid tracking number";
  }
}

function createEvent(body) {
  const errors = {};
  checkTrackingNumber(errors, body);
  checkEnum(errors, body, "status", "Status", CHECKPOINT_STATUSES);
  checkText(errors, body, "location", "Location", { min: 2, max: 120 });
  checkText(errors, body, "note", "Note", { required: false, max: 300 });
  return errors;
}

function updateEvent(body) {
  const errors = {};
  checkText(errors, body, "location", "Location", { min: 2, max: 120 });
  checkText(errors, body, "note", "Note", { required: false, max: 300 });
  return errors;
}

function createAssignment(body) {
  const errors = {};
  checkTrackingNumber(errors, body);
  checkId(errors, body, "agent", "Delivery agent");
  checkText(errors, body, "note", "Note", { required: false, max: 300 });
  return errors;
}

function updateAssignment(body) {
  const errors = {};
  checkText(errors, body, "note", "Note", { required: false, max: 300 });
  if (!isBlank(body.status) && body.status !== "cancelled") {
    errors.status = "An assignment can only be changed to cancelled";
  }
  return errors;
}

function checkAttemptDetails(errors, body, outcome) {
  if (outcome === "delivered") {
    checkText(errors, body, "receivedBy", "Received by", { max: 80 });
  } else if (outcome === "failed") {
    checkEnum(errors, body, "failureReason", "Failure reason", Object.keys(FAILURE_REASONS));
  }
  checkText(errors, body, "note", "Note", { required: false, max: 300 });
}

function createAttempt(body) {
  const errors = {};
  checkTrackingNumber(errors, body);
  checkEnum(errors, body, "outcome", "Outcome", ATTEMPT_OUTCOMES);
  checkText(errors, body, "location", "Location", { min: 2, max: 120 });
  checkAttemptDetails(errors, body, body.outcome);
  return errors;
}

// The stored outcome decides which details are required, so it isn't taken from the request.
function updateAttempt(body) {
  const errors = {};
  checkText(errors, body, "receivedBy", "Received by", { required: false, max: 80 });
  checkEnum(errors, body, "failureReason", "Failure reason", Object.keys(FAILURE_REASONS), { required: false });
  checkText(errors, body, "note", "Note", { required: false, max: 300 });
  return errors;
}

module.exports = {
  register,
  login,
  updateProfile,
  changePassword,
  createUser,
  updateUser,
  address,
  shipment,
  createEvent,
  updateEvent,
  createAssignment,
  updateAssignment,
  createAttempt,
  updateAttempt,
};
