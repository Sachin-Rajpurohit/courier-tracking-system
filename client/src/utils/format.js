export const STATUS_LABELS = {
  created: "Created",
  picked_up: "Picked up",
  in_transit: "In transit",
  out_for_delivery: "Out for delivery",
  failed_attempt: "Delivery failed",
  delivered: "Delivered",
  returned: "Returned",
  cancelled: "Cancelled",
};

export const TERMINAL_STATUSES = ["delivered", "returned", "cancelled"];

// Mirrors the server's rules. The server has the final say; this just offers valid choices.
export const CHECKPOINT_OPTIONS = {
  created: ["picked_up", "cancelled"],
  picked_up: ["in_transit", "cancelled"],
  in_transit: ["in_transit", "out_for_delivery", "returned"],
  out_for_delivery: ["in_transit"],
  failed_attempt: ["in_transit", "out_for_delivery", "returned"],
  delivered: [],
  returned: [],
  cancelled: [],
};

export const CHECKPOINT_STATUSES = ["picked_up", "in_transit", "out_for_delivery", "returned", "cancelled"];

export const SERVICE_LABELS = { standard: "Standard", express: "Express", overnight: "Overnight" };

export const ROLE_LABELS = { admin: "Admin", staff: "Branch staff", agent: "Delivery agent", customer: "Customer" };

export const FAILURE_REASONS = {
  recipient_unavailable: "Recipient not available",
  wrong_address: "Incorrect address",
  refused: "Delivery refused",
  access_issue: "Unable to access the location",
  other: "Other reason",
};

export const ASSIGNMENT_LABELS = { active: "Active", completed: "Completed", cancelled: "Cancelled" };

export function toOptions(labels, keys = Object.keys(labels)) {
  return keys.map((value) => ({ value, label: labels[value] }));
}

export function formatDateTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", { dateStyle: "medium" });
}

export function toDateInput(value) {
  return value ? new Date(value).toISOString().slice(0, 10) : "";
}

export function addressLines(address) {
  if (!address) return [];
  return [
    address.contactName,
    address.line1,
    address.line2,
    `${address.city}, ${address.state} ${address.postalCode}`,
    address.phone,
  ].filter(Boolean);
}
