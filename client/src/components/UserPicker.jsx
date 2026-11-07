import { useEffect, useState } from "react";
import { api } from "../api/client";

// A dropdown of active users with one role, like all customers or all agents.
function UserPicker({ label, role, value, onChange, error, initialLabel, disabled }) {
  const [users, setUsers] = useState([]);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (disabled) return;
    api("/users", { params: { role, active: "true", limit: "100" } })
      .then((data) => setUsers(data.items))
      .catch((err) => setLoadError(err.message));
  }, [role, disabled]);

  // When editing, the customer can't change, so it is shown as plain text.
  if (disabled) {
    return (
      <div className="field">
        <span className="field-label">{label}</span>
        <p className="field-static">{initialLabel}</p>
      </div>
    );
  }

  return (
    <div className={`field${error ? " field-invalid" : ""}`}>
      <label htmlFor={`${role}-picker`}>{label}</label>
      <select id={`${role}-picker`} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Select one</option>
        {users.map((user) => (
          <option key={user._id} value={user._id}>
            {user.name} ({user.email})
          </option>
        ))}
      </select>
      {loadError && <p className="field-message">{loadError}</p>}
      {error && <p className="field-message">{error}</p>}
    </div>
  );
}

export default UserPicker;
