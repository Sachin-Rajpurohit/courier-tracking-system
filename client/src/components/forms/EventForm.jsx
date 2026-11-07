import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import useFormState from "../../hooks/useFormState";
import { CHECKPOINT_OPTIONS, CHECKPOINT_STATUSES, STATUS_LABELS, toOptions } from "../../utils/format";
import { validateEvent } from "../../utils/validation";
import { FormError } from "../Feedback";
import Field from "../Field";

function EventForm({ event: existing, shipment, onSaved, onCancel }) {
  const { user } = useAuth();
  const toast = useToast();
  const isNew = !existing;

  // From a shipment page, only the statuses it can move to next are offered.
  const allowed = shipment ? CHECKPOINT_OPTIONS[shipment.status] : CHECKPOINT_STATUSES;
  const statusChoices = allowed.filter((status) => status !== "cancelled" || user.role !== "agent");

  const { values, errors, formError, submitting, handleChange, submit } = useFormState({
    trackingNumber: shipment?.trackingNumber || "",
    status: "",
    location: existing?.location || "",
    note: existing?.note || "",
  });

  function handleSubmit(event) {
    event.preventDefault();
    submit(validateEvent(values, { isNew }), async () => {
      if (isNew) {
        await api("/tracking-events", { method: "POST", body: values });
      } else {
        await api(`/tracking-events/${existing._id}`, {
          method: "PUT",
          body: { location: values.location, note: values.note },
        });
      }
      toast.success(isNew ? "Checkpoint added" : "Event updated");
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
          label="New status"
          name="status"
          value={values.status}
          onChange={handleChange}
          error={errors.status}
          options={toOptions(STATUS_LABELS, statusChoices)}
          placeholderOption="Select a status"
        />
      )}
      <Field
        label="Location"
        name="location"
        value={values.location}
        onChange={handleChange}
        error={errors.location}
        placeholder="Nagpur Sorting Centre"
        hint="Shown on the public tracking page."
      />
      <Field
        as="textarea"
        label="Note"
        optional
        name="note"
        value={values.note}
        onChange={handleChange}
        error={errors.note}
        hint="Only visible to signed-in users on this shipment."
      />
      <div className="form-actions">
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? "Saving…" : isNew ? "Add checkpoint" : "Save changes"}
        </button>
      </div>
    </form>
  );
}

export default EventForm;
