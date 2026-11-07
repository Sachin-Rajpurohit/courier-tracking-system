import { Link } from "react-router-dom";
import ListPage from "../components/ListPage";
import StatusBadge from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";
import { SERVICE_LABELS, STATUS_LABELS, formatDate, toOptions } from "../utils/format";

function Shipments() {
  const { user } = useAuth();
  const isManager = user.role === "admin" || user.role === "staff";
  const canCreate = user.role !== "agent";

  const columns = [
    {
      key: "trackingNumber",
      label: "Tracking number",
      sortField: "trackingNumber",
      render: (item) => (
        <Link className="tracking-link" to={`/app/shipments/${item._id}`}>
          {item.trackingNumber}
        </Link>
      ),
    },
    { key: "status", label: "Status", sortField: "status", render: (item) => <StatusBadge status={item.status} /> },
    { key: "description", label: "Contents" },
    {
      key: "route",
      label: "Route",
      render: (item) => `${item.senderAddress?.city || "—"} → ${item.receiverAddress?.city || "—"}`,
    },
    { key: "serviceType", label: "Service", sortField: "serviceType", render: (item) => SERVICE_LABELS[item.serviceType] },
    { key: "weightKg", label: "Weight", sortField: "weightKg", render: (item) => `${item.weightKg} kg` },
    ...(isManager
      ? [
          { key: "customer", label: "Customer", render: (item) => item.customer?.name || "—" },
          { key: "agent", label: "Agent", render: (item) => item.assignedAgent?.name || "Unassigned" },
        ]
      : []),
    { key: "createdAt", label: "Created", sortField: "createdAt", render: (item) => formatDate(item.createdAt) },
  ];

  const filters = [
    { name: "status", label: "Status", options: toOptions(STATUS_LABELS) },
    { name: "serviceType", label: "Service", options: toOptions(SERVICE_LABELS) },
    { name: "from", label: "Created from", type: "date" },
    { name: "to", label: "Created to", type: "date" },
  ];

  const newButton = canCreate && (
    <Link to="/app/shipments/new" className="btn btn-primary">
      New shipment
    </Link>
  );

  return (
    <ListPage
      title={user.role === "agent" ? "My deliveries" : user.role === "customer" ? "My shipments" : "Shipments"}
      endpoint="/shipments"
      columns={columns}
      filters={filters}
      defaultSort="-createdAt"
      searchPlaceholder="Tracking number, contents or branch"
      actions={newButton}
      emptyTitle={user.role === "agent" ? "No deliveries assigned to you" : "No shipments yet"}
      emptyText={
        user.role === "agent"
          ? "Shipments will appear here when branch staff assign them to you."
          : "Create a shipment to get a tracking number."
      }
      emptyAction={newButton}
    />
  );
}

export default Shipments;
