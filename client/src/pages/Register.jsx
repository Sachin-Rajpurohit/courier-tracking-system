import { Link, useNavigate } from "react-router-dom";
import { FormError } from "../components/Feedback";
import Field from "../components/Field";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import useFormState from "../hooks/useFormState";
import { validateRegister } from "../utils/validation";

function Register() {
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { values, errors, formError, submitting, handleChange, submit } = useFormState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  function handleSubmit(event) {
    event.preventDefault();
    submit(validateRegister(values), async () => {
      await register({ name: values.name, email: values.email, phone: values.phone, password: values.password });
      toast.success("Your account is ready");
      navigate("/app/dashboard", { replace: true });
    });
  }

  return (
    <div className="auth-card card">
      <h1>Create your account</h1>
      <p className="muted">Book shipments and follow them from one place.</p>
      <form onSubmit={handleSubmit} noValidate>
        <FormError message={formError} />
        <Field label="Full name" name="name" autoComplete="name" value={values.name} onChange={handleChange} error={errors.name} />
        <Field label="Email" name="email" type="email" autoComplete="email" value={values.email} onChange={handleChange} error={errors.email} />
        <Field label="Phone" name="phone" type="tel" autoComplete="tel" value={values.phone} onChange={handleChange} error={errors.phone} />
        <Field label="Password" name="password" type="password" autoComplete="new-password" value={values.password} onChange={handleChange} error={errors.password} hint="At least 8 characters." />
        <Field label="Confirm password" name="confirmPassword" type="password" autoComplete="new-password" value={values.confirmPassword} onChange={handleChange} error={errors.confirmPassword} />
        <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? "Creating account…" : "Create account"}
        </button>
      </form>
      <p className="muted auth-switch">
        Already registered? <Link to="/login">Log in</Link>
      </p>
    </div>
  );
}

export default Register;
