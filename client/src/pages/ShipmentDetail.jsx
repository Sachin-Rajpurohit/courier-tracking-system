import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import AssignmentForm from "../components/forms/AssignmentForm";
import AttemptForm from "../components/forms/AttemptForm";
import EventForm from "../components/forms/EventForm";
import { ErrorState, Loading } from "../components/Feedback";
import Modal, { ConfirmDialog } from "../components/Modal";
import StatusBadge from "../components/StatusBadge";
import Timeline from "../components/Timeline";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import {
  ASSIGNMENT_LABELS,
  CHECKPOINT_OPTIONS,
  FAILURE_REASONS,
  SERVICE_LABELS,
  TERMINAL_STATUSES,
  addressLines,
  formatDate,
  formatDateTime,
} from "../utils/format";

function AddressCard({ title, address }) {
  return (
    <div>
      <h3 className="detail-label">{title}</h3>
      <address>
        {addressLines(address).map((line) => (
          <span key={line}>{line}</span>
        ))}
      </address>
    </div>
  );
}

function ShipmentDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState(null);

  function load() {
    setError("");
    api(`/shipments/${id}`)
      .then((result) => setData(result))
      .catch((err) => setError(err.message));
  }

  useEffect(load, [id]);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return <Loading label="Loading shipment…" />;

  const { shipment, events, attempts, assignments } = data;
  const isManager = user.role === "admin" || user.role === "staff";
  const isCustomer = user.role === "customer";
  const closed = TERMINAL_STATUSES.includes(shipment.status);
  const canEdit = !closed && (isManager || (isCustomer && shipment.status === "created"));
  const canCancel = (isManager && ["created", "picked_up"].includes(shipment.status)) || (isCustomer && shipment.status === "created");
  const canCheckpoint = !isCustomer && CHECKPOINT_OPTIONS[shipment.status].length > 0;
  const canAttempt = !isCustomer && shipment.status === "out_for_delivery";

  function closeAndReload() {
    setDialog(null);
    load();
  }

  async function handleCancel() {
    await api(`/shipments/${shipment._id}/cancel`, { method: "POST" });
    toast.success("Shipment cancelled");
    closeAndReload();
  }

  async function handleDelete() {
    await api(`/shipments/${shipment._id}`, { method: "DELETE" });
    toast.success("Shipment deleted");
    navigate("/app/shipments");
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/track/${shipment.trackingNumber}`);
      toast.success("Tracking link copied");
    } catch {
      toast.error("Couldn't copy the link. You can copy it from the public tracking page.");
    }
  }

  return (
    <section>
      <header className="page-head">
        <div>
          <p className="eyebrow">
            <Link to="/app/shipments">← Shipments</Link>
          </p>
          <div className="title-row">
            <h1 className="tracking-number">{shipment.trackingNumber}</h1>
            <StatusBadge status={shipment.status} />
          </div>
          <p className="muted">
            {shipment.description} · Now at {shipment.currentLocation || shipment.originBranch}
          </p>
        </div>
        <div className="page-actions">
          {canAttempt && (
            <button type="button" className="btn btn-primary" onClick={() => setDialog("attempt")}>
              Record delivery attempt
            </button>
          )}
          {canCheckpoint && (
            <button type="button" className={canAttempt ? "btn" : "btn btn-primary"} onClick={() => setDialog("event")}>
              Add checkpoint
            </button>
          )}
          {isManager && !closed && (
            <button type="button" className="btn" onClick={() => setDialog("assign")}>
              {shipment.assignedAgent ? "Reassign agent" : "Assign agent"}
            </button>
          )}
          <button type="button" className="btn" onClick={copyLink}>
            Copy tracking link
          </button>
        </div>
      </header>

      <div className="detail-grid">
        <div className="card detail-card">
          <h2>Tracking history</h2>
          <Timeline events={events} showNotes />
        </div>

        <div className="detail-side">
          <div className="card detail-card">
            <h2>Shipment details</h2>
            <dl className="facts facts-stack">
              <div>
                <dt>Service</dt>
                <dd>{SERVICE_LABELS[shipment.serviceType]}</dd>
              </div>
              <div>
                <dt>Weight</dt>
                <dd>{shipment.weightKg} kg</dd>
              </div>
              <div>
                <dt>Origin branch</dt>
                <dd>{shipment.originBranch}</dd>
              </div>
              <div>
                <dt>Expected delivery</dt>
                <dd>{formatDate(shipment.expectedDeliveryDate)}</dd>
              </div>
              {shipment.deliveredAt && (
                <div>
                  <dt>Delivered</dt>
                  <dd>{formatDateTime(shipment.deliveredAt)}</dd>
                </div>
              )}
              <div>
                <dt>Created</dt>
                <dd>{formatDateTime(shipment.createdAt)}</dd>
              </div>
              {!isCustomer && (
                <div>
                  <dt>Customer</dt>
                  <dd>
                    {shipment.customer?.name}
                    <br />
                    <span className="muted">{shipment.customer?.phone}</span>
                  </dd>
                </div>
              )}
              <div>
                <dt>Delivery agent</dt>
                <dd>{shipment.assignedAgent?.name || "Not assigned yet"}</dd>
              </div>
            </dl>
            {(canEdit || canCancel || user.role === "admin") && (
              <div className="detail-actions">
                {canEdit && (
                  <Link to={`/app/shipments/${shipment._id}/edit`} className="btn">
                    Edit
                  </Link>
                )}
                {canCancel && (
                  <button type="button" className="btn" onClick={() => setDialog("cancel")}>
                    Cancel shipment
                  </button>
                )}
                {user.role === "admin" && (
                  <button type="button" className="btn btn-danger-ghost" onClick={() => setDialog("delete")}>
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="card detail-card address-pair">
            <AddressCard title="From" address={shipment.senderAddress} />
            <AddressCard title="To" address={shipment.receiverAddress} />
          </div>

          <div className="card detail-card">
            <h2>Delivery attempts</h2>
            {attempts.length === 0 ? (
              <p className="muted">No delivery attempts yet.</p>
            ) : (
              <ul className="plain-list">
                {attempts.map((attempt) => (
                  <li key={attempt._id}>
                    <div className="timeline-head">
                      <strong>Attempt {attempt.attemptNumber}</strong>
                      <StatusBadge status={attempt.outcome} label={attempt.outcome === "delivered" ? "Delivered" : "Failed"} />
                    </div>
                    <p className="muted">{formatDateTime(attempt.attemptedAt)}</p>
                    {attempt.failureReason && <p>{FAILURE_REASONS[attempt.failureReason]}</p>}
                    {attempt.receivedBy && <p>Received by {attempt.receivedBy}</p>}
                    {attempt.agent?.name && <p className="muted">Agent: {attempt.agent.name}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {isManager && (
            <div className="card detail-card">
              <h2>Assignment history</h2>
              {assignments.length === 0 ? (
                <p className="muted">No agent has been assigned yet.</p>
              ) : (
                <ul className="plain-list">
                  {assignments.map((assignment) => (
                    <li key={assignment._id}>
                      <div className="timeline-head">
                        <strong>{assignment.agent?.name}</strong>
                        <StatusBadge status={assignment.status} label={ASSIGNMENT_LABELS[assignment.status]} />
                      </div>
                      <p className="muted">
                        {formatDateTime(assignment.assignedAt)} by {assignment.assignedBy?.name}
                      </p>
                      {assignment.note && <p>{assignment.note}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      {dialog === "event" && (
        <Modal title="Add checkpoint" onClose={() => setDialog(null)}>
          <EventForm shipment={shipment} onSaved={closeAndReload} onCancel={() => setDialog(null)} />
        </Modal>
      )}
      {dialog === "attempt" && (
        <Modal title="Record delivery attempt" onClose={() => setDialog(null)}>
          <AttemptForm shipment={shipment} onSaved={closeAndReload} onCancel={() => setDialog(null)} />
        </Modal>
      )}
      {dialog === "assign" && (
        <Modal title={shipment.assignedAgent ? "Reassign agent" : "Assign agent"} onClose={() => setDialog(null)}>
          <AssignmentForm shipment={shipment} onSaved={closeAndReload} onCancel={() => setDialog(null)} />
        </Modal>
      )}
      {dialog === "cancel" && (
        <ConfirmDialog
          title="Cancel this shipment?"
          message={`${shipment.trackingNumber} will be marked as cancelled and can't be restarted.`}
          confirmLabel="Cancel shipment"
          onConfirm={handleCancel}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === "delete" && (
        <ConfirmDialog
          title="Delete this shipment?"
          message={`${shipment.trackingNumber} and all of its tracking events, assignments and delivery attempts will be permanently deleted.`}
          onConfirm={handleDelete}
          onClose={() => setDialog(null)}
        />
      )}
    </section>
  );
}

export default ShipmentDetail;
