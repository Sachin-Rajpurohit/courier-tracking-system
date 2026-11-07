import { formatDateTime } from "../utils/format";
import StatusBadge from "./StatusBadge";

function Timeline({ events, showNotes = false }) {
  return (
    <ol className="timeline">
      {events.map((event, index) => (
        <li key={event._id || `${event.occurredAt}-${index}`} className={index === 0 ? "timeline-item is-latest" : "timeline-item"}>
          <span className="timeline-marker" aria-hidden="true"></span>
          <div className="timeline-content">
            <div className="timeline-head">
              <strong>{event.description}</strong>
              <StatusBadge status={event.status} />
            </div>
            <p className="muted">
              {event.location} · <time dateTime={event.occurredAt}>{formatDateTime(event.occurredAt)}</time>
            </p>
            {showNotes && event.note && <p className="timeline-note">{event.note}</p>}
            {showNotes && event.recordedBy?.name && <p className="timeline-by">Recorded by {event.recordedBy.name}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

export default Timeline;
