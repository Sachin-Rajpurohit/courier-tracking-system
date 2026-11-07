import { Link, useRouteError } from "react-router-dom";
import { EmptyState } from "../components/Feedback";

function NotFound() {
  const error = useRouteError();
  const crashed = error && error.status !== 404;

  return (
    <div className="centered-page">
      <EmptyState
        title={crashed ? "Something went wrong" : "Page not found"}
        action={
          <Link to="/" className="btn btn-primary">
            Back to tracking
          </Link>
        }
      >
        {crashed ? "Please reload the page and try again." : "That page doesn't exist or has moved."}
      </EmptyState>
    </div>
  );
}

export default NotFound;
