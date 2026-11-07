import { api } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import useFormState from "../../hooks/useFormState";
import { validateAssignment } from "../../utils/validation";
import { FormError } from "../Feedback";
import Field from "../Field";
import UserPicker from "../UserPicker";

function AssignmentForm({ assignment, shipment, onSaved, onCancel }) {
  const toast = useToast();
  const isNew = !assignment;
  const { values, setField, errors, formError, submitting, handleChange, submit } = useFormState({
    trackingNumber: shipment?.trackingNumber || "",
    agent: "",
    note: assignment?.note || "",
  });

  function handleSubmit(event) {
    event.preventDefault();
    submit(validateAssignment(values, { isNew }), async () => {
      if (isNew) {
        await api("/assignments", { method: "POST", body: values });
      } else {
        await api(`/assignments/${assignment._id}`, { method: "PUT", body: { note: values.note } });
      }
      toast.success(isNew ? "Agent assigned" : "Assignment updated");
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
        <UserPicker
          label="Delivery agent"
          role="agent"
          value={values.agent}
          onChange={(value) => setField("agent", value)}
          error={errors.agent}
        />
      )}
      <Field as="textarea" label="Note" optional name="note" value={values.note} onChange={handleChange} error={errors.note} />
      {isNew && shipment?.assignedAgent && (
        <p className="field-hint">This replaces {shipment.assignedAgent.name} as the assigned agent.</p>
      )}
      <div className="form-actions">
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? "Saving…" : isNew ? "Assign agent" : "Save changes"}
        </button>
      </div>
    </form>
  );
}

export default AssignmentForm;
