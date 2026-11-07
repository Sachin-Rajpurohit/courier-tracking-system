import { Link, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Brand } from "./Layout";

function PublicLayout() {
  const { user } = useAuth();

  return (
    <div className="public">
      <header className="public-head">
        <Brand />
        <nav aria-label="Account" className="public-nav">
          {user ? (
            <Link to="/app/dashboard" className="btn btn-primary">
              Go to dashboard
            </Link>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost">
                Log in
              </Link>
              <Link to="/register" className="btn btn-primary">
                Create account
              </Link>
            </>
          )}
        </nav>
      </header>
      <main className="public-main">
        <Outlet />
      </main>
    </div>
  );
}

export default PublicLayout;
