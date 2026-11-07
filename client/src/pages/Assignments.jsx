import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import AssignmentForm from "../components/forms/AssignmentForm";
import ListPage from "../components/ListPage";
import Modal, { ConfirmDialog } from "../components/Modal";
import StatusBadge from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { ASSIGNMENT_LABELS, STATUS_LABELS, formatDateTime, toOptions } from "../utils/format";

function Assignments() {
  const { user } = useAuth();
  const toast = useToast();
  const isManager = user.role === "admin" || user.role === "staff";
  const [reloadKey, setReloadKey] = useState(0);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [cancelling, setCancelling] = useState(null);
  const [deleting, setDeleting] = useState(null);

  function closeAndReload() {
    setCreating(false);
    setEditing(null);
    setCancelling(null);
    setDeleting(null);
    setReloadKey((key) => key + 1);
  }

  async function handleCancel() {
    await api(`/assignments/${cancelling._id}`, {
      method: "PUT",
      body: { note: cancelling.note || "", status: "cancelled" },
    });
    toast.success("Assignment cancelled");
    closeAndReload();
  }

  async function handleDelete() {
    await api(`/assignments/${deleting._id}`, { method: "DELETE" });
    toast.success("Assignment deleted");
    closeAndReload();
  }

  const columns = [
    {
      key: "shipment",
      label: "Shipment",
      render: (item) =>
        // An agent loses access to a shipment once it's reassigned, so only link when it's theirs.
        isManager || item.status !== "cancelled" ? (
          <Link className="tracking-link" to={`/app/shipments/${item.shipment?._id}`}>
            {item.shipment?.trackingNumber}
          </Link>
        ) : (
          item.shipment?.trackingNumber
        ),
    },
    {
      key: "shipmentStatus",
      label: "Shipment status",
      render: (item) => STATUS_LABELS[item.shipment?.status] || "—",
    },
    { key: "agent", label: "Agent", render: (item) => item.agent?.name || "—" },
    {
      key: "status",
      label: "Assignment",
      sortField: "status",
      render: (item) => <StatusBadge status={item.status} label={ASSIGNMENT_LABELS[item.status]} />,
    },
    { key: "assignedBy", label: "Assigned by", render: (item) => item.assignedBy?.name || "—" },
    { key: "note", label: "Note", render: (item) => item.note || "—" },
    { key: "assignedAt", label: "Assigned", sortField: "assignedAt", render: (item) => formatDateTime(item.assignedAt) },
    ...(isManager
      ? [
          {
            key: "actions",
            label: "Actions",
            className: "cell-actions",
            render: (item) => (
              <>
                <button type="button" className="link-btn" onClick={() => setEditing(item)}>
                  Edit note
                </button>
                {item.status === "active" && (
                  <button type="button" className="link-btn" onClick={() => setCancelling(item)}>
                    Unassign
                  </button>
                )}
                {user.role === "admin" && (
                  <button type="button" className="link-btn link-danger" onClick={() => setDeleting(item)}>
                    Delete
                  </button>
                )}
              </>
            ),
          },
        ]
      : []),
  ];

  const addButton = isManager && (
    <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
      Assign agent
    </button>
  );

  return (
    <>
      <ListPage
        title={isManager ? "Assignments" : "My assignments"}
        endpoint="/assignments"
        columns={columns}
        searchParam="tracking"
        filters={[{ name: "status", label: "Assignment", options: toOptions(ASSIGNMENT_LABELS) }]}
        defaultSort="-assignedAt"
        searchPlaceholder="Tracking number"
        actions={addButton}
        emptyTitle="No assignments yet"
        emptyText={isManager ? "Assign a delivery agent to a shipment to get started." : "Shipments assigned to you will appear here."}
        reloadKey={reloadKey}
      />

      {creating && (
        <Modal title="Assign agent" onClose={() => setCreating(false)}>
          <AssignmentForm onSaved={closeAndReload} onCancel={() => setCreating(false)} />
        </Modal>
      )}
      {editing && (
        <Modal title="Edit assignment note" onClose={() => setEditing(null)}>
          <AssignmentForm assignment={editing} onSaved={closeAndReload} onCancel={() => setEditing(null)} />
        </Modal>
      )}
      {cancelling && (
        <ConfirmDialog
          title="Unassign this agent?"
          message={`${cancelling.agent?.name} will no longer handle ${cancelling.shipment?.trackingNumber}.`}
          confirmLabel="Unassign"
          onConfirm={handleCancel}
          onClose={() => setCancelling(null)}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Delete this assignment?"
          message="Assignments with delivery attempts can't be deleted."
          onConfirm={handleDelete}
          onClose={() => setDeleting(null)}
        />
      )}
    </>
  );
}

export default Assignments;
