import { useState } from "react";
import { api } from "../api/client";
import AddressForm from "../components/forms/AddressForm";
import ListPage from "../components/ListPage";
import Modal, { ConfirmDialog } from "../components/Modal";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

function Addresses() {
  const { user } = useAuth();
  const toast = useToast();
  const [reloadKey, setReloadKey] = useState(0);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(null);

  function closeAndReload() {
    setEditing(null);
    setCreating(false);
    setDeleting(null);
    setReloadKey((key) => key + 1);
  }

  async function handleDelete() {
    await api(`/addresses/${deleting._id}`, { method: "DELETE" });
    toast.success("Address deleted");
    closeAndReload();
  }

  const columns = [
    { key: "label", label: "Label", sortField: "label" },
    { key: "contactName", label: "Contact", sortField: "contactName" },
    { key: "phone", label: "Phone" },
    { key: "line1", label: "Street", render: (item) => [item.line1, item.line2].filter(Boolean).join(", ") },
    { key: "city", label: "City", sortField: "city" },
    { key: "state", label: "State", sortField: "state" },
    { key: "postalCode", label: "Postal code" },
    ...(user.role !== "customer"
      ? [{ key: "owner", label: "Customer", render: (item) => item.owner?.name || "—" }]
      : []),
    {
      key: "actions",
      label: "Actions",
      className: "cell-actions",
      render: (item) => (
        <>
          <button type="button" className="link-btn" onClick={() => setEditing(item)}>
            Edit
          </button>
          <button type="button" className="link-btn link-danger" onClick={() => setDeleting(item)}>
            Delete
          </button>
        </>
      ),
    },
  ];

  const addButton = (
    <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
      Add address
    </button>
  );

  return (
    <>
      <ListPage
        title={user.role === "customer" ? "My addresses" : "Addresses"}
        subtitle="Addresses already used by a shipment stay locked, so shipment history stays accurate."
        endpoint="/addresses"
        columns={columns}
        filters={[{ name: "city", label: "City" }]}
        defaultSort="-createdAt"
        searchPlaceholder="Label, contact, street or postal code"
        actions={addButton}
        emptyTitle="No addresses yet"
        emptyText="Add a sender and a receiver address to book a shipment."
        emptyAction={addButton}
        reloadKey={reloadKey}
      />

      {(creating || editing) && (
        <Modal title={editing ? "Edit address" : "Add address"} onClose={() => { setCreating(false); setEditing(null); }}>
          <AddressForm
            address={editing}
            onSaved={closeAndReload}
            onCancel={() => { setCreating(false); setEditing(null); }}
          />
        </Modal>
      )}
      {deleting && (
        <ConfirmDialog
          title="Delete this address?"
          message={`"${deleting.label}" in ${deleting.city} will be permanently deleted.`}
          onConfirm={handleDelete}
          onClose={() => setDeleting(null)}
        />
      )}
    </>
  );
}

export default Addresses;
