import { useId } from "react";

function Field({ label, name, error, hint, as = "input", options, placeholderOption, optional, ...props }) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  const shared = { id, name, "aria-invalid": Boolean(error), "aria-describedby": describedBy, ...props };

  return (
    <div className={`field${error ? " field-invalid" : ""}`}>
      <label htmlFor={id}>
        {label}
        {optional && <span className="optional"> (optional)</span>}
      </label>
      {as === "select" ? (
        <select {...shared}>
          {placeholderOption && <option value="">{placeholderOption}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : as === "textarea" ? (
        <textarea rows="3" {...shared}></textarea>
      ) : (
        <input {...shared} />
      )}
      {hint && !error && (
        <p className="field-hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
      {error && (
        <p className="field-message" id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}

export default Field;
