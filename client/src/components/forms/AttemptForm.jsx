import { api } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import useFormState from "../../hooks/useFormState";
import { FAILURE_REASONS, toOptions } from "../../utils/format";
import { validateAttempt } from "../../utils/validation";
import { FormError } from "../Feedback";
import Field from "../Field";

function AttemptForm({ attempt, shipment, onSaved, onCancel }) {
  const toast = useToast();
  const isNew = !attempt;
  const { values, errors, formError, submitting, handleChange, submit } = useFormState({
    trackingNumber: shipment?.trackingNumber || "",
    outcome: attempt?.outcome || "",
    failureReason: attempt?.failureReason || "",
    receivedBy: attempt?.receivedBy || "",
    location: attempt?.location || shipment?.currentLocation || "",
    note: attempt?.note || "",
  });

  function handleSubmit(event) {
    event.preventDefault();
    submit(validateAttempt(values, { isNew }), async () => {
      if (isNew) {
        await api("/delivery-attempts", { method: "POST", body: values });
      } else {
        await api(`/delivery-attempts/${attempt._id}`, {
          method: "PUT",
          body: { receivedBy: values.receivedBy, failureReason: values.failureReason, note: values.note },
        });
      }
      toast.success(isNew ? "Delivery attempt recorded" : "Attempt updated");
      onSaved();
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <FormError message={formError} />
      {isNew && !shipment && (
        <Field
          label="Tracking number"
          name="trackingNumber"
          value={values.trackingNumber}
          onChange={handleChange}
          error={errors.trackingNumber}
          placeholder="CTS7KQ2MZ94XP"
        />
      )}
      {isNew && (
        <Field
          as="select"
          label="Outcome"
          name="outcome"
          value={values.outcome}
          onChange={handleChange}
          error={errors.outcome}
          options={[
            { value: "delivered", label: "Delivered" },
            { value: "failed", label: "Could not deliver" },
          ]}
          placeholderOption="Select an outcome"
        />
      )}
      {values.outcome === "delivered" && (
        <Field label="Received by" name="receivedBy" value={values.receivedBy} onChange={handleChange} error={errors.receivedBy} />
      )}
      {values.outcome === "failed" && (
        <Field
          as="select"
          label="Reason"
          name="failureReason"
          value={values.failureReason}
          onChange={handleChange}
          error={errors.failureReason}
          options={toOptions(FAILURE_REASONS)}
          placeholderOption="Select a reason"
        />
      )}
      {isNew && <Field label="Location" name="location" value={values.location} onChange={handleChange} error={errors.location} />}
      <Field as="textarea" label="Note" optional name="note" value={values.note} onChange={handleChange} error={errors.note} />
      <div className="form-actions">
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? "Saving…" : isNew ? "Record attempt" : "Save changes"}
        </button>
      </div>
    </form>
  );
}

export default AttemptForm;
