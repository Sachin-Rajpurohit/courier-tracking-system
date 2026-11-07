import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import AttemptForm from "../components/forms/AttemptForm";
import ListPage from "../components/ListPage";
import Modal, { ConfirmDialog } from "../components/Modal";
import StatusBadge from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { FAILURE_REASONS, formatDateTime, toOptions } from "../utils/format";

function DeliveryAttempts() {
  const { user } = useAuth();
  const toast = useToast();
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
    await api(`/delivery-attempts/${deleting._id}`, { method: "DELETE" });
    toast.success("Delivery attempt deleted");
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
    { key: "attemptNumber", label: "Attempt", sortField: "attemptNumber" },
    {
      key: "outcome",
      label: "Outcome",
      sortField: "outcome",
      render: (item) => <StatusBadge status={item.outcome} label={item.outcome === "delivered" ? "Delivered" : "Failed"} />,
    },
    {
      key: "details",
      label: "Details",
      render: (item) => (item.outcome === "delivered" ? `Received by ${item.receivedBy}` : FAILURE_REASONS[item.failureReason]),
    },
    { key: "agent", label: "Agent", render: (item) => item.agent?.name || "—" },
    { key: "location", label: "Location" },
    { key: "attemptedAt", label: "Time", sortField: "attemptedAt", render: (item) => formatDateTime(item.attemptedAt) },
    {
      key: "actions",
      label: "Actions",
      className: "cell-actions",
      render: (item) => (
        <>
          <button type="button" className="link-btn" onClick={() => setEditing(item)}>
            Edit
          </button>
          {user.role === "admin" && (
            <button type="button" className="link-btn link-danger" onClick={() => setDeleting(item)}>
              Delete
            </button>
          )}
        </>
      ),
    },
  ];

  const addButton = (
    <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
      Record attempt
    </button>
  );

  return (
    <>
      <ListPage
        title="Delivery attempts"
        endpoint="/delivery-attempts"
        columns={columns}
        searchParam="tracking"
        filters={[
          {
            name: "outcome",
            label: "Outcome",
            options: [
              { value: "delivered", label: "Delivered" },
              { value: "failed", label: "Failed" },
            ],
          },
          { name: "failureReason", label: "Reason", options: toOptions(FAILURE_REASONS) },
          { name: "from", label: "From", type: "date" },
          { name: "to", label: "To", type: "date" },
        ]}
        defaultSort="-attemptedAt"
        searchPlaceholder="Tracking number"
        actions={addButton}
        emptyTitle="No delivery attempts yet"
        emptyText="Attempts can be recorded while a shipment is out for delivery."
        reloadKey={reloadKey}
      />

      {creating && (
        <Modal title="Record delivery attempt" onClose={() => setCreating(false)}>
          <AttemptForm onSaved={closeAndReload} onCancel={() => setCreating(false)} />
        </Modal>
      )}
      {editing && (
        <Modal title={`Edit attempt ${editing.attemptNumber}`} onClose={() => setEditing(null)}>
          <AttemptForm attempt={editing} onSaved={closeAndReload} onCancel={() => setEditing(null)} />
        </Modal>
      )}
      {deleting && (
        <ConfirmDialog
          title="Delete this attempt?"
          message="Only a shipment's latest attempt can be deleted. Its tracking event is removed too, and the shipment goes back to its previous status."
          onConfirm={handleDelete}
          onClose={() => setDeleting(null)}
        />
      )}
    </>
  );
}

export default DeliveryAttempts;
