import { createContext, useContext, useState } from "react";

const ToastContext = createContext(null);

// Small pop-up messages, such as "Address added". Any page can use them with useToast().
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  function dismiss(id) {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }

  function show(message, type) {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, message, type }]);
    setTimeout(() => dismiss(id), 5000);
  }

  const toast = {
    success: (message) => show(message, "success"),
    error: (message) => show(message, "error"),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((item) => (
          <div key={item.id} className={`toast toast-${item.type}`}>
            <span aria-hidden="true">{item.type === "error" ? "!" : "✓"}</span>
            <p>{item.message}</p>
            <button type="button" className="toast-close" aria-label="Dismiss" onClick={() => dismiss(item.id)}>
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
