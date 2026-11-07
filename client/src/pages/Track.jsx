import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import { EmptyState, ErrorState, Loading } from "../components/Feedback";
import StatusBadge from "../components/StatusBadge";
import Timeline from "../components/Timeline";
import { SERVICE_LABELS, formatDate, formatDateTime } from "../utils/format";
import { validateTrackingSearch } from "../utils/validation";

const STEPS = [
  { status: "created", label: "Created" },
  { status: "picked_up", label: "Picked up" },
  { status: "in_transit", label: "In transit" },
  { status: "out_for_delivery", label: "Out for delivery" },
  { status: "delivered", label: "Delivered" },
];

function stepIndex(status) {
  if (status === "failed_attempt") return 3;
  return STEPS.findIndex((step) => step.status === status);
}

function Track() {
  const { trackingNumber } = useParams();
  const navigate = useNavigate();
  const [input, setInput] = useState(trackingNumber || "");
  const [inputError, setInputError] = useState("");
  const [state, setState] = useState({ loading: false, error: null, result: null });
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    setInput(trackingNumber || "");
    if (!trackingNumber) {
      setState({ loading: false, error: null, result: null });
      return;
    }
    setState({ loading: true, error: null, result: null });
    api(`/track/${encodeURIComponent(trackingNumber)}`)
      .then((result) => setState({ loading: false, error: null, result }))
      .catch((error) => setState({ loading: false, error, result: null }));
  }, [trackingNumber, retry]);

  function handleSubmit(event) {
    event.preventDefault();
    const problem = validateTrackingSearch(input);
    setInputError(problem);
    if (!problem) navigate(`/track/${input.trim().toUpperCase()}`);
  }

  const { loading, error, result } = state;
  const current = result ? stepIndex(result.status) : -1;
  const offRoute = result && current === -1;

  return (
    <div className={result ? "track track-has-result" : "track"}>
      <section className="track-search">
        <h1>Where's your parcel?</h1>
        <p>Enter your tracking number to see every checkpoint. No account needed.</p>
        <form onSubmit={handleSubmit} noValidate className="track-form" role="search">
          <label htmlFor="tracking-input" className="visually-hidden">
            Tracking number
          </label>
          <input
            id="tracking-input"
            value={input}
            placeholder="CTS7KQ2MZ94XP"
            autoCapitalize="characters"
            spellCheck="false"
            aria-invalid={Boolean(inputError)}
            aria-describedby={inputError ? "tracking-error" : undefined}
            onChange={(event) => {
              setInput(event.target.value);
              setInputError("");
            }}
          />
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Tracking…" : "Track"}
          </button>
        </form>
        {inputError && (
          <p className="field-message" id="tracking-error" role="alert">
            {inputError}
          </p>
        )}
      </section>

      {loading && (
        <div className="card">
          <Loading label="Finding your shipment…" />
        </div>
      )}

      {error && (
        <div className="card">
          {error.status === 404 ? (
            <EmptyState title="We couldn't find that shipment">
              Check the number on your receipt. It starts with CTS and has 13 characters.
            </EmptyState>
          ) : (
            <ErrorState message={error.message} onRetry={() => setRetry((count) => count + 1)} />
          )}
        </div>
      )}

      {result && (
        <section className="card track-result" aria-label="Tracking result">
          <header className="track-result-head">
            <div>
              <p className="eyebrow">Tracking number</p>
              <h2 className="tracking-number">{result.trackingNumber}</h2>
            </div>
            <StatusBadge status={result.status} />
          </header>

          <dl className="facts">
            <div>
              <dt>From</dt>
              <dd>{result.origin}</dd>
            </div>
            <div>
              <dt>To</dt>
              <dd>{result.destination}</dd>
            </div>
            <div>
              <dt>Service</dt>
              <dd>{SERVICE_LABELS[result.serviceType]}</dd>
            </div>
            <div>
              <dt>{result.deliveredAt ? "Delivered" : "Expected by"}</dt>
              <dd>{result.deliveredAt ? formatDateTime(result.deliveredAt) : formatDate(result.expectedDeliveryDate)}</dd>
            </div>
          </dl>

          {!offRoute && (
            <ol className="progress" aria-label="Delivery progress">
              {STEPS.map((step, index) => (
                <li
                  key={step.status}
                  className={index < current || result.status === "delivered" ? "is-done" : index === current ? "is-current" : ""}
                  aria-current={index === current ? "step" : undefined}
                >
                  <span className="progress-dot" aria-hidden="true"></span>
                  {step.label}
                </li>
              ))}
            </ol>
          )}

          {result.attemptCount > 0 && (
            <p className="muted">
              Delivery attempts: {result.attemptCount}
            </p>
          )}

          <h3>Tracking history</h3>
          <Timeline events={result.events} />
        </section>
      )}
    </div>
  );
}

export default Track;
