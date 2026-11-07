import { api } from "../api/client";
import { FormError } from "../components/Feedback";
import Field from "../components/Field";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import useFormState from "../hooks/useFormState";
import { ROLE_LABELS } from "../utils/format";
import { validatePasswordChange, validateProfile } from "../utils/validation";

function Profile() {
  const { user, setUser } = useAuth();
  const toast = useToast();

  const profile = useFormState({ name: user.name, phone: user.phone });
  const password = useFormState({ currentPassword: "", newPassword: "", confirmPassword: "" });

  function handleProfileSubmit(event) {
    event.preventDefault();
    profile.submit(validateProfile(profile.values), async () => {
      const data = await api("/auth/me", { method: "PUT", body: profile.values });
      setUser(data.user);
      toast.success("Profile updated");
    });
  }

  function handlePasswordSubmit(event) {
    event.preventDefault();
    password.submit(validatePasswordChange(password.values), async () => {
      await api("/auth/password", {
        method: "PUT",
        body: { currentPassword: password.values.currentPassword, newPassword: password.values.newPassword },
      });
      password.setValues({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast.success("Password changed");
    });
  }

  return (
    <section className="narrow">
      <header className="page-head">
        <div>
          <h1>Your profile</h1>
          <p className="muted">
            {user.email} · {ROLE_LABELS[user.role]}
            {user.branch ? ` · ${user.branch}` : ""}
          </p>
        </div>
      </header>

      <form className="card form-card" onSubmit={handleProfileSubmit} noValidate>
        <h2>Details</h2>
        <FormError message={profile.formError} />
        <Field label="Name" name="name" value={profile.values.name} onChange={profile.handleChange} error={profile.errors.name} />
        <Field label="Phone" name="phone" type="tel" value={profile.values.phone} onChange={profile.handleChange} error={profile.errors.phone} />
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={profile.submitting}>
            {profile.submitting ? "Saving…" : "Save details"}
          </button>
        </div>
      </form>

      <form className="card form-card" onSubmit={handlePasswordSubmit} noValidate>
        <h2>Change password</h2>
        <FormError message={password.formError} />
        <Field label="Current password" name="currentPassword" type="password" autoComplete="current-password" value={password.values.currentPassword} onChange={password.handleChange} error={password.errors.currentPassword} />
        <Field label="New password" name="newPassword" type="password" autoComplete="new-password" value={password.values.newPassword} onChange={password.handleChange} error={password.errors.newPassword} hint="At least 8 characters." />
        <Field label="Confirm new password" name="confirmPassword" type="password" autoComplete="new-password" value={password.values.confirmPassword} onChange={password.handleChange} error={password.errors.confirmPassword} />
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={password.submitting}>
            {password.submitting ? "Changing…" : "Change password"}
          </button>
        </div>
      </form>
    </section>
  );
}

export default Profile;
