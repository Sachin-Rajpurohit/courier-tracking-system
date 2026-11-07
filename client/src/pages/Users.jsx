import { useState } from "react";
import { api } from "../api/client";
import UserForm from "../components/forms/UserForm";
import ListPage from "../components/ListPage";
import Modal, { ConfirmDialog } from "../components/Modal";
import StatusBadge from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { ROLE_LABELS, formatDate, toOptions } from "../utils/format";

function Users() {
  const { user } = useAuth();
  const toast = useToast();
  const isAdmin = user.role === "admin";
  const [reloadKey, setReloadKey] = useState(0);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(null);

  function closeForm() {
    setCreating(false);
    setEditing(null);
  }

  function closeAndReload() {
    closeForm();
    setDeleting(null);
    setReloadKey((key) => key + 1);
  }

  async function handleDelete() {
    await api(`/users/${deleting._id}`, { method: "DELETE" });
    toast.success("User deleted");
    closeAndReload();
  }

  const columns = [
    { key: "name", label: "Name", sortField: "name" },
    { key: "email", label: "Email", sortField: "email" },
    { key: "phone", label: "Phone" },
    { key: "role", label: "Role", sortField: "role", render: (item) => ROLE_LABELS[item.role] },
    { key: "branch", label: "Branch", render: (item) => item.branch || "—" },
    {
      key: "isActive",
      label: "Status",
      render: (item) => <StatusBadge status={item.isActive ? "completed" : "cancelled"} label={item.isActive ? "Active" : "Inactive"} />,
    },
    { key: "createdAt", label: "Joined", sortField: "createdAt", render: (item) => formatDate(item.createdAt) },
    ...(isAdmin
      ? [
          {
            key: "actions",
            label: "Actions",
            className: "cell-actions",
            render: (item) => (
              <>
                <button type="button" className="link-btn" onClick={() => setEditing(item)}>
                  Edit
                </button>
                {item._id !== user._id && (
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

  const roleOptions = isAdmin ? toOptions(ROLE_LABELS) : toOptions(ROLE_LABELS, ["customer", "agent"]);

  return (
    <>
      <ListPage
        title={isAdmin ? "Users" : "Customers & agents"}
        endpoint="/users"
        columns={columns}
        filters={[
          { name: "role", label: "Role", options: roleOptions },
          {
            name: "active",
            label: "Status",
            options: [
              { value: "true", label: "Active" },
              { value: "false", label: "Inactive" },
            ],
          },
        ]}
        defaultSort="name"
        searchPlaceholder="Name, email or phone"
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
            {isAdmin ? "Add user" : "Add customer"}
          </button>
        }
        emptyTitle="No users yet"
        reloadKey={reloadKey}
      />

      {(creating || editing) && (
        <Modal title={editing ? `Edit ${editing.name}` : isAdmin ? "Add user" : "Add customer"} onClose={closeForm}>
          <UserForm editing={editing} onSaved={closeAndReload} onCancel={closeForm} />
        </Modal>
      )}
      {deleting && (
        <ConfirmDialog
          title={`Delete ${deleting.name}?`}
          message="This account and its unused addresses will be permanently deleted. Accounts with shipment records can only be deactivated."
          onConfirm={handleDelete}
          onClose={() => setDeleting(null)}
        />
      )}
    </>
  );
}

export default Users;
