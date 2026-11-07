import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import EventForm from "../components/forms/EventForm";
import ListPage from "../components/ListPage";
import Modal, { ConfirmDialog } from "../components/Modal";
import StatusBadge from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { STATUS_LABELS, formatDateTime, toOptions } from "../utils/format";

function TrackingEvents() {
  const { user } = useAuth();
  const toast = useToast();
  const isManager = user.role === "admin" || user.role === "staff";
  const [reloadKey, setReloadKey] = useState(0);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  function closeAndReload() {
    setCreating(false);
    setEditing(null);
    setDeleting(null);
    setReloadKey((key) => key + 1);
  }

  async function handleDelete() {
    await api(`/tracking-events/${deleting._id}`, { method: "DELETE" });
    toast.success("Tracking event deleted");
    closeAndReload();
  }

  const columns = [
    {
      key: "shipment",
      label: "Shipment",
      render: (item) => (
        <Link className="tracking-link" to={`/app/shipments/${item.shipment?._id}`}>
          {item.shipment?.trackingNumber}
        </Link>
      ),
    },
    { key: "status", label: "Status", sortField: "status", render: (item) => <StatusBadge status={item.status} /> },
    { key: "location", label: "Location", sortField: "location" },
    { key: "description", label: "Public message" },
    { key: "note", label: "Note", render: (item) => item.note || "—" },
    { key: "recordedBy", label: "Recorded by", render: (item) => item.recordedBy?.name || "—" },
    { key: "occurredAt", label: "Time", sortField: "occurredAt", render: (item) => formatDateTime(item.occurredAt) },
    {
      key: "actions",
      label: "Actions",
      className: "cell-actions",
      render: (item) => {
        const canEdit = isManager || item.recordedBy?._id === user._id;
        const canDelete = isManager && item.status !== "created" && !item.attempt;
        if (!canEdit && !canDelete) return "—";
        return (
          <>
            {canEdit && (
              <button type="button" className="link-btn" onClick={() => setEditing(item)}>
                Edit
              </button>
            )}
            {canDelete && (
              <button type="button" className="link-btn link-danger" onClick={() => setDeleting(item)}>
                Delete
              </button>
            )}
          </>
        );
      },
    },
  ];

  const addButton = (
    <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
      Add checkpoint
    </button>
  );

  return (
    <>
      <ListPage
        title={isManager ? "Tracking events" : "Checkpoints"}
        endpoint="/tracking-events"
        columns={columns}
        filters={[
          { name: "tracking", label: "Tracking number" },
          { name: "status", label: "Status", options: toOptions(STATUS_LABELS) },
          { name: "from", label: "From", type: "date" },
          { name: "to", label: "To", type: "date" },
        ]}
        defaultSort="-occurredAt"
        searchPlaceholder="Location or message"
        actions={addButton}
        emptyTitle="No tracking events yet"
        emptyText="Checkpoints appear here as shipments move."
        reloadKey={reloadKey}
      />

      {creating && (
        <Modal title="Add checkpoint" onClose={() => setCreating(false)}>
          <EventForm onSaved={closeAndReload} onCancel={() => setCreating(false)} />
        </Modal>
      )}
      {editing && (
        <Modal title="Edit tracking event" onClose={() => setEditing(null)}>
          <EventForm event={editing} onSaved={closeAndReload} onCancel={() => setEditing(null)} />
        </Modal>
      )}
      {deleting && (
        <ConfirmDialog
          title="Delete this event?"
          message={`The ${STATUS_LABELS[deleting.status].toLowerCase()} event at ${deleting.location} will be removed. If it's the latest event, the shipment goes back to its previous status.`}
          onConfirm={handleDelete}
          onClose={() => setDeleting(null)}
        />
      )}
    </>
  );
}

export default TrackingEvents;
