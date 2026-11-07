import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import useFormState from "../../hooks/useFormState";
import { ROLE_LABELS, toOptions } from "../../utils/format";
import { validateUser } from "../../utils/validation";
import { FormError } from "../Feedback";
import Field from "../Field";

function UserForm({ editing, onSaved, onCancel }) {
  const { user } = useAuth();
  const toast = useToast();
  const isNew = !editing;
  const isAdmin = user.role === "admin";
  const isSelf = editing?._id === user._id;

  const { values, errors, formError, submitting, handleChange, submit } = useFormState({
    name: editing?.name || "",
    email: editing?.email || "",
    phone: editing?.phone || "",
    role: editing?.role || (isAdmin ? "" : "customer"),
    branch: editing?.branch || "",
    isActive: editing?.isActive ?? true,
    password: "",
  });

  function handleSubmit(event) {
    event.preventDefault();
    submit(validateUser(values, { isNew }), async () => {
      const body = { ...values };
      if (!body.password) delete body.password;
      if (isNew) await api("/users", { method: "POST", body });
      else await api(`/users/${editing._id}`, { method: "PUT", body });
      toast.success(isNew ? "User created" : "User updated");
      onSaved();
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <FormError message={formError} />
      <div className="form-grid">
        <Field label="Name" name="name" value={values.name} onChange={handleChange} error={errors.name} />
        <Field label="Email" name="email" type="email" value={values.email} onChange={handleChange} error={errors.email} />
        <Field label="Phone" name="phone" type="tel" value={values.phone} onChange={handleChange} error={errors.phone} />
        {isAdmin && (
          <Field
            as="select"
            label="Role"
            name="role"
            value={values.role}
            onChange={handleChange}
            error={errors.role}
            options={toOptions(ROLE_LABELS)}
            placeholderOption="Select a role"
            disabled={isSelf}
          />
        )}
        {isAdmin && (
          <Field label="Branch" optional name="branch" value={values.branch} onChange={handleChange} error={errors.branch} />
        )}
        <Field
          label={isNew ? "Password" : "New password"}
          optional={!isNew}
          name="password"
          type="password"
          autoComplete="new-password"
          value={values.password}
          onChange={handleChange}
          error={errors.password}
          hint={isNew ? "At least 8 characters." : "Leave empty to keep the current password."}
        />
      </div>
      {isAdmin && !isNew && !isSelf && (
        <label className="checkbox">
          <input type="checkbox" name="isActive" checked={values.isActive} onChange={handleChange} />
          Account is active
        </label>
      )}
      <div className="form-actions">
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? "Saving…" : "Save user"}
        </button>
      </div>
    </form>
  );
}

export default UserForm;
