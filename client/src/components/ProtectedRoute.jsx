import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Loading } from "./Feedback";

// Only for logged-in users. Everyone else goes to the login page.
export function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return <Loading label="Signing you in…" />;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

// Only for the listed roles. Everyone else goes to their dashboard.
export function RoleRoute({ roles }) {
  const { user } = useAuth();
  if (!roles.includes(user.role)) return <Navigate to="/app/dashboard" replace />;
  return <Outlet />;
}

// Only for people who aren't logged in, like the login and register pages.
export function GuestRoute() {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (user) return <Navigate to="/app/dashboard" replace />;
  return <Outlet />;
}
