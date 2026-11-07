import { useEffect, useRef, useState } from "react";

function Modal({ title, onClose, children }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  return (
    <dialog
      className="modal"
      ref={dialogRef}
      aria-labelledby="modal-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="modal-head">
        <h2 id="modal-title">{title}</h2>
        <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
          ×
        </button>
      </div>
      <div className="modal-body">{children}</div>
    </dialog>
  );
}

export function ConfirmDialog({ title, message, confirmLabel = "Delete", danger = true, onConfirm, onClose }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleConfirm() {
    setBusy(true);
    setError("");
    try {
      await onConfirm();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
      <p>{message}</p>
      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}
      <div className="form-actions">
        <button type="button" className="btn" onClick={onClose}>
          Keep it
        </button>
        <button
          type="button"
          className={danger ? "btn btn-danger" : "btn btn-primary"}
          disabled={busy}
          onClick={handleConfirm}
        >
          {busy ? "Working…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

export default Modal;
