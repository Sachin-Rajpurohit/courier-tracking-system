import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import useFormState from "../../hooks/useFormState";
import { validateAddress } from "../../utils/validation";
import { FormError } from "../Feedback";
import Field from "../Field";
import UserPicker from "../UserPicker";

const EMPTY = {
  owner: "",
  label: "",
  contactName: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "India",
};

function AddressForm({ address, ownerId, ownerLabel, onSaved, onCancel }) {
  const { user } = useAuth();
  const toast = useToast();
  const needsOwner = user.role !== "customer";
  const { values, setField, errors, formError, submitting, handleChange, submit } = useFormState(
    address
      ? { ...EMPTY, ...address, owner: address.owner?._id || address.owner || "", line2: address.line2 || "" }
      : { ...EMPTY, owner: ownerId || "" },
  );

  function handleSubmit(event) {
    event.preventDefault();
    submit(validateAddress(values, { needsOwner }), async () => {
      const body = {
        owner: values.owner,
        label: values.label,
        contactName: values.contactName,
        phone: values.phone,
        line1: values.line1,
        line2: values.line2,
        city: values.city,
        state: values.state,
        postalCode: values.postalCode,
        country: values.country,
      };
      const saved = address
        ? await api(`/addresses/${address._id}`, { method: "PUT", body })
        : await api("/addresses", { method: "POST", body });
      toast.success(address ? "Address updated" : "Address added");
      onSaved(saved);
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <FormError message={formError} />
      {needsOwner && (
        <UserPicker
          label="Customer"
          role="customer"
          value={values.owner}
          onChange={(value) => setField("owner", value)}
          error={errors.owner}
          disabled={Boolean(ownerId)}
          initialLabel={ownerLabel || address?.owner?.name}
        />
      )}
      <div className="form-grid">
        <Field label="Label" name="label" value={values.label} onChange={handleChange} error={errors.label} placeholder="Home, Office…" />
        <Field label="Contact name" name="contactName" value={values.contactName} onChange={handleChange} error={errors.contactName} />
        <Field label="Phone" name="phone" type="tel" value={values.phone} onChange={handleChange} error={errors.phone} />
        <Field label="Address line 1" name="line1" value={values.line1} onChange={handleChange} error={errors.line1} />
        <Field label="Address line 2" optional name="line2" value={values.line2} onChange={handleChange} error={errors.line2} />
        <Field label="City" name="city" value={values.city} onChange={handleChange} error={errors.city} />
        <Field label="State" name="state" value={values.state} onChange={handleChange} error={errors.state} />
        <Field label="Postal code" name="postalCode" value={values.postalCode} onChange={handleChange} error={errors.postalCode} />
        <Field label="Country" optional name="country" value={values.country} onChange={handleChange} error={errors.country} />
      </div>
      <div className="form-actions">
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? "Saving…" : "Save address"}
        </button>
      </div>
    </form>
  );
}

export default AddressForm;
