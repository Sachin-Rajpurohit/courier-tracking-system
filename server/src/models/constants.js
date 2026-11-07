const ROLES = ["admin", "staff", "agent", "customer"];

const SHIPMENT_STATUSES = [
  "created",
  "picked_up",
  "in_transit",
  "out_for_delivery",
  "failed_attempt",
  "delivered",
  "returned",
  "cancelled",
];

const TERMINAL_STATUSES = ["delivered", "returned", "cancelled"];

const SERVICE_TYPES = ["standard", "express", "overnight"];

const ASSIGNMENT_STATUSES = ["active", "completed", "cancelled"];

const ATTEMPT_OUTCOMES = ["delivered", "failed"];

const FAILURE_REASONS = {
  recipient_unavailable: "Recipient not available",
  wrong_address: "Incorrect address",
  refused: "Delivery refused",
  access_issue: "Unable to access the location",
  other: "Other reason",
};

// A shipment can repeat in_transit because each hub scan is a new checkpoint.
// delivered and failed_attempt are only reachable by recording a delivery attempt.
const TRANSITIONS = {
  created: ["picked_up", "cancelled"],
  picked_up: ["in_transit", "cancelled"],
  in_transit: ["in_transit", "out_for_delivery", "returned"],
  out_for_delivery: ["in_transit", "delivered", "failed_attempt"],
  failed_attempt: ["in_transit", "out_for_delivery", "returned"],
  delivered: [],
  returned: [],
  cancelled: [],
};

const CHECKPOINT_STATUSES = ["picked_up", "in_transit", "out_for_delivery", "returned", "cancelled"];

const STATUS_DESCRIPTIONS = {
  created: "Shipment created",
  picked_up: "Picked up from sender",
  in_transit: "In transit",
  out_for_delivery: "Out for delivery",
  failed_attempt: "Delivery attempt failed",
  delivered: "Delivered",
  returned: "Returned to sender",
  cancelled: "Shipment cancelled",
};

module.exports = {
  ROLES,
  SHIPMENT_STATUSES,
  TERMINAL_STATUSES,
  SERVICE_TYPES,
  ASSIGNMENT_STATUSES,
  ATTEMPT_OUTCOMES,
  FAILURE_REASONS,
  TRANSITIONS,
  CHECKPOINT_STATUSES,
  STATUS_DESCRIPTIONS,
};
