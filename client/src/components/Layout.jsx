import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ROLE_LABELS } from "../utils/format";

const NAV_BY_ROLE = {
  admin: [
    { to: "/app/dashboard", label: "Dashboard" },
    { to: "/app/shipments", label: "Shipments" },
    { to: "/app/assignments", label: "Assignments" },
    { to: "/app/tracking-events", label: "Tracking events" },
    { to: "/app/delivery-attempts", label: "Delivery attempts" },
    { to: "/app/addresses", label: "Addresses" },
    { to: "/app/users", label: "Users" },
  ],
  staff: [
    { to: "/app/dashboard", label: "Dashboard" },
    { to: "/app/shipments", label: "Shipments" },
    { to: "/app/assignments", label: "Assignments" },
    { to: "/app/tracking-events", label: "Tracking events" },
    { to: "/app/delivery-attempts", label: "Delivery attempts" },
    { to: "/app/addresses", label: "Addresses" },
    { to: "/app/users", label: "Customers & agents" },
  ],
  agent: [
    { to: "/app/dashboard", label: "Dashboard" },
    { to: "/app/shipments", label: "My deliveries" },
    { to: "/app/assignments", label: "My assignments" },
    { to: "/app/tracking-events", label: "Checkpoints" },
    { to: "/app/delivery-attempts", label: "Delivery attempts" },
  ],
  customer: [
    { to: "/app/dashboard", label: "Dashboard" },
    { to: "/app/shipments", label: "My shipments" },
    { to: "/app/addresses", label: "My addresses" },
  ],
};

export function Brand({ to = "/" }) {
  return (
    <Link to={to} className="brand">
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="7" />
        <path d="M8 12l8-4 8 4v9l-8 4-8-4z M8 12l8 4 8-4 M16 16v9" />
      </svg>
      CourierTrack
    </Link>
  );
}

function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="shell">
      <aside className={menuOpen ? "sidebar is-open" : "sidebar"}>
        <div className="sidebar-top">
          <Brand to="/app/dashboard" />
          <button
            type="button"
            className="btn menu-btn"
            aria-expanded={menuOpen}
            aria-controls="app-nav"
            onClick={() => setMenuOpen((open) => !open)}
          >
            Menu
          </button>
        </div>

        <div className="sidebar-menu" id="app-nav">
          <nav aria-label="Main">
            {NAV_BY_ROLE[user.role].map((item) => (
              <NavLink key={item.to} to={item.to} className="nav-link">
                {item.label}
              </NavLink>
            ))}
            <Link to="/" className="nav-link">
              Public tracking
            </Link>
          </nav>

          <div className="sidebar-user">
            <NavLink to="/app/profile" className="sidebar-profile">
              <strong>{user.name}</strong>
              <span>{ROLE_LABELS[user.role]}</span>
            </NavLink>
            <button type="button" className="btn" onClick={handleLogout}>
              Log out
            </button>
          </div>
        </div>
      </aside>

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
