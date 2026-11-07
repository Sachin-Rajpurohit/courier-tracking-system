import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { BarList } from "../components/Charts";
import { ErrorState, Loading } from "../components/Feedback";
import { useAuth } from "../context/AuthContext";
import { STATUS_LABELS, formatDate } from "../utils/format";

function Tile({ label, value }) {
  return (
    <div className="card tile">
      <p className="tile-label">{label}</p>
      <p className="tile-value">{value}</p>
    </div>
  );
}

function Dashboard() {
  const { user } = useAuth();
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    setError("");
    api("/reports/summary")
      .then((data) => setReport(data))
      .catch((err) => setError(err.message));
  }, [retry]);

  if (error) return <ErrorState message={error} onRetry={() => setRetry(retry + 1)} />;
  if (!report) return <Loading label="Loading your dashboard…" />;

  const { totals, byStatus, daily, agentPerformance } = report;

  return (
    <section>
      <header className="page-head">
        <div>
          <h1>Hello, {user.name.split(" ")[0]}</h1>
          <p className="muted">Here's a summary of {user.role === "admin" || user.role === "staff" ? "all shipments" : "your shipments"}.</p>
        </div>
        {user.role !== "agent" && (
          <div className="page-actions">
            <Link to="/app/shipments/new" className="btn btn-primary">
              New shipment
            </Link>
          </div>
        )}
      </header>

      <div className="tiles">
        <Tile label="Total shipments" value={totals.shipments} />
        <Tile label="In progress" value={totals.open} />
        <Tile label="Delivered" value={totals.delivered} />
        <Tile label="Failed attempts to retry" value={totals.failed} />
      </div>

      <div className="chart-grid-layout">
        <BarList
          title="Shipments by current status"
          rows={byStatus.map((row) => ({ label: STATUS_LABELS[row.status], value: row.count }))}
        />

        <div className="card chart">
          <h2 className="chart-title">Last 7 days</h2>
          <div className="table-wrap">
            <table className="table table-plain">
              <thead>
                <tr>
                  <th>Date</th>
                  <th className="num">Created</th>
                  <th className="num">Delivered</th>
                </tr>
              </thead>
              <tbody>
                {daily.map((day) => (
                  <tr key={day.date}>
                    <td>{formatDate(day.date)}</td>
                    <td className="num">{day.created}</td>
                    <td className="num">{day.delivered}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {agentPerformance && (
          <div className="card chart">
            <h2 className="chart-title">Delivery agents</h2>
            {agentPerformance.length === 0 ? (
              <p className="muted">No delivery attempts recorded yet.</p>
            ) : (
              <div className="table-wrap">
                <table className="table table-plain">
                  <thead>
                    <tr>
                      <th>Agent</th>
                      <th className="num">Delivered</th>
                      <th className="num">Failed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agentPerformance.map((agent) => (
                      <tr key={agent._id}>
                        <td>{agent.name}</td>
                        <td className="num">{agent.delivered}</td>
                        <td className="num">{agent.failed}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export default Dashboard;
