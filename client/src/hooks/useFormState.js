import { useState } from "react";

export default function useFormState(initialValues) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    setField(name, type === "checkbox" ? checked : value);
  }

  function setField(name, value) {
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  }

  // Runs client validation, then the request, and shows server field errors next to their inputs.
  async function submit(clientErrors, action) {
    const failed = Object.values(clientErrors).some(Boolean);
    setErrors(clientErrors);
    setFormError("");
    if (failed) return;

    setSubmitting(true);
    try {
      await action();
    } catch (err) {
      setErrors(err.fieldErrors || {});
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return { values, setValues, setField, errors, formError, submitting, handleChange, submit };
}
