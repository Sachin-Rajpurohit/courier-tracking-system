const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+?[0-9][0-9 -]{6,18}$/;
const POSTAL_CODE = /^[A-Za-z0-9 -]{3,10}$/;
export const TRACKING_NUMBER = /^CTS[2-9A-HJ-NP-Z]{10}$/;

function required(errors, values, field, label) {
  if (!String(values[field] ?? "").trim()) errors[field] = `${label} is required`;
}

function checkEmail(errors, values) {
  if (!values.email.trim()) errors.email = "Email is required";
  else if (!EMAIL.test(values.email.trim())) errors.email = "Enter a valid email";
}

function checkPhone(errors, values) {
  if (!values.phone.trim()) errors.phone = "Phone is required";
  else if (!PHONE.test(values.phone.trim())) errors.phone = "Enter a valid phone number";
}

function checkName(errors, values) {
  if (values.name.trim().length < 2) errors.name = "Name must be at least 2 characters";
}

function checkPassword(errors, values, field = "password") {
  if (!values[field]) errors[field] = "Password is required";
  else if (values[field].length < 8) errors[field] = "Password must be at least 8 characters";
  else if (new TextEncoder().encode(values[field]).length > 72) errors[field] = "Password must be at most 72 characters";
}

function checkTrackingNumber(errors, values) {
  const value = values.trackingNumber.trim().toUpperCase();
  if (!value) errors.trackingNumber = "Tracking number is required";
  else if (!TRACKING_NUMBER.test(value)) errors.trackingNumber = "Enter a valid tracking number, like CTS7KQ2MZ94XP";
}

export function validateLogin(values) {
  const errors = {};
  checkEmail(errors, values);
  required(errors, values, "password", "Password");
  return errors;
}

export function validateRegister(values) {
  const errors = {};
  checkName(errors, values);
  checkEmail(errors, values);
  checkPhone(errors, values);
  checkPassword(errors, values);
  if (values.confirmPassword !== values.password) errors.confirmPassword = "Passwords don't match";
  return errors;
}

export function validateProfile(values) {
  const errors = {};
  checkName(errors, values);
  checkPhone(errors, values);
  return errors;
}

export function validatePasswordChange(values) {
  const errors = {};
  required(errors, values, "currentPassword", "Current password");
  checkPassword(errors, values, "newPassword");
  if (values.confirmPassword !== values.newPassword) errors.confirmPassword = "Passwords don't match";
  return errors;
}

export function validateUser(values, { isNew }) {
  const errors = {};
  checkName(errors, values);
  checkEmail(errors, values);
  checkPhone(errors, values);
  required(errors, values, "role", "Role");
  if (isNew || values.password) checkPassword(errors, values);
  return errors;
}

export function validateAddress(values, { needsOwner }) {
  const errors = {};
  if (needsOwner) required(errors, values, "owner", "Customer");
  required(errors, values, "label", "Label");
  required(errors, values, "contactName", "Contact name");
  checkPhone(errors, values);
  required(errors, values, "line1", "Address line 1");
  required(errors, values, "city", "City");
  required(errors, values, "state", "State");
  if (!values.postalCode.trim()) errors.postalCode = "Postal code is required";
  else if (!POSTAL_CODE.test(values.postalCode.trim())) errors.postalCode = "Enter a valid postal code";
  return errors;
}

export function validateShipment(values, { needsCustomer }) {
  const errors = {};
  if (needsCustomer) required(errors, values, "customer", "Customer");
  required(errors, values, "senderAddress", "Sender address");
  required(errors, values, "receiverAddress", "Receiver address");
  if (values.senderAddress && values.senderAddress === values.receiverAddress) {
    errors.receiverAddress = "Receiver address must be different from the sender address";
  }
  if (values.description.trim().length < 3) errors.description = "Description must be at least 3 characters";
  const weight = Number(values.weightKg);
  if (!values.weightKg) errors.weightKg = "Weight is required";
  else if (!Number.isFinite(weight) || weight < 0.01 || weight > 1000) {
    errors.weightKg = "Weight must be between 0.01 and 1000 kg";
  }
  required(errors, values, "serviceType", "Service type");
  return errors;
}

export function validateEvent(values, { isNew }) {
  const errors = {};
  if (isNew) {
    checkTrackingNumber(errors, values);
    required(errors, values, "status", "Status");
  }
  if (values.location.trim().length < 2) errors.location = "Location must be at least 2 characters";
  return errors;
}

export function validateAssignment(values, { isNew }) {
  const errors = {};
  if (isNew) {
    checkTrackingNumber(errors, values);
    required(errors, values, "agent", "Delivery agent");
  }
  return errors;
}

export function validateAttempt(values, { isNew }) {
  const errors = {};
  if (isNew) {
    checkTrackingNumber(errors, values);
    required(errors, values, "outcome", "Outcome");
    if (values.location.trim().length < 2) errors.location = "Location must be at least 2 characters";
  }
  if (values.outcome === "delivered") required(errors, values, "receivedBy", "Received by");
  if (values.outcome === "failed") required(errors, values, "failureReason", "Failure reason");
  return errors;
}

export function validateTrackingSearch(value) {
  const number = value.trim().toUpperCase();
  if (!number) return "Enter a tracking number";
  if (!TRACKING_NUMBER.test(number)) return "That doesn't look right. Tracking numbers look like CTS7KQ2MZ94XP.";
  return "";
}
