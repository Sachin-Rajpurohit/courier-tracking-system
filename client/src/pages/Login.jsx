import { Link, useNavigate } from "react-router-dom";
import { FormError } from "../components/Feedback";
import Field from "../components/Field";
import { useAuth } from "../context/AuthContext";
import useFormState from "../hooks/useFormState";
import { validateLogin } from "../utils/validation";

function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { values, errors, formError, submitting, handleChange, submit } = useFormState({ email: "", password: "" });

  function handleSubmit(event) {
    event.preventDefault();
    submit(validateLogin(values), async () => {
      await login({ email: values.email, password: values.password });
      navigate("/app/dashboard", { replace: true });
    });
  }

  return (
    <div className="auth-card card">
      <h1>Log in</h1>
      <form onSubmit={handleSubmit} noValidate>
        <FormError message={formError} />
        <Field label="Email" name="email" type="email" autoComplete="email" value={values.email} onChange={handleChange} error={errors.email} />
        <Field label="Password" name="password" type="password" autoComplete="current-password" value={values.password} onChange={handleChange} error={errors.password} />
        <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? "Logging in…" : "Log in"}
        </button>
      </form>
      <p className="muted auth-switch">
        New here? <Link to="/register">Create an account</Link>
      </p>
    </div>
  );
}

export default Login;
