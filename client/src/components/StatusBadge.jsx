import { STATUS_LABELS } from "../utils/format";

const TONES = {
  created: "neutral",
  picked_up: "info",
  in_transit: "info",
  out_for_delivery: "info",
  failed_attempt: "critical",
  delivered: "good",
  returned: "warning",
  cancelled: "neutral",
  active: "info",
  completed: "good",
  failed: "critical",
};

function StatusBadge({ status, label }) {
  return (
    <span className={`badge badge-${TONES[status] || "neutral"}`}>
      <span className="badge-dot" aria-hidden="true"></span>
      {label || STATUS_LABELS[status] || status}
    </span>
  );
}

export default StatusBadge;
