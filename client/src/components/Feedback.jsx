export function Loading({ label = "Loading…" }) {
  return (
    <div className="state" role="status">
      <span className="spinner" aria-hidden="true"></span>
      <p>{label}</p>
    </div>
  );
}

export function EmptyState({ title, children, action }) {
  return (
    <div className="state">
      <svg className="state-icon" viewBox="0 0 48 48" aria-hidden="true">
        <path d="M8 16l16-8 16 8v17l-16 8-16-8z M8 16l16 8 16-8 M24 24v17" />
      </svg>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="state" role="alert">
      <h3>That didn't load</h3>
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="btn" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function FormError({ message }) {
  if (!message) return null;
  return (
    <div className="form-error" role="alert">
      {message}
    </div>
  );
}
