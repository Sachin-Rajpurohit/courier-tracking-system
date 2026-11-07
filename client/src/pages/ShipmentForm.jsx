import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import AddressForm from "../components/forms/AddressForm";
import { ErrorState, FormError, Loading } from "../components/Feedback";
import Field from "../components/Field";
import Modal from "../components/Modal";
import UserPicker from "../components/UserPicker";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import useFormState from "../hooks/useFormState";
import { SERVICE_LABELS, toDateInput, toOptions } from "../utils/format";
import { validateShipment } from "../utils/validation";

const EMPTY = {
  customer: "",
  senderAddress: "",
  receiverAddress: "",
  description: "",
  weightKg: "",
  serviceType: "standard",
  originBranch: "",
  expectedDeliveryDate: "",
};

function ShipmentFormFields({ existing }) {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const isManager = user.role !== "customer";
  const isNew = !existing;
  const addressesLocked = existing && existing.status !== "created";

  const { values, setField, setValues, errors, formError, submitting, handleChange, submit } = useFormState(
    existing
      ? {
          customer: existing.customer._id,
          senderAddress: existing.senderAddress._id,
          receiverAddress: existing.receiverAddress._id,
          description: existing.description,
          weightKg: String(existing.weightKg),
          serviceType: existing.serviceType,
          originBranch: existing.originBranch || "",
          expectedDeliveryDate: toDateInput(existing.expectedDeliveryDate),
        }
      : { ...EMPTY, originBranch: user.branch || "" },
  );

  const [addresses, setAddresses] = useState([]);
  const [addressError, setAddressError] = useState("");
  const [addingAddress, setAddingAddress] = useState(false);

  const ownerId = isManager ? values.customer : user._id;

  function loadAddresses() {
    if (!ownerId) {
      setAddresses([]);
      return;
    }
    setAddressError("");
    api("/addresses", { params: { owner: ownerId, limit: "100", sort: "label" } })
      .then((data) => setAddresses(data.items))
      .catch((err) => setAddressError(err.message));
  }

  // Reload the address dropdowns whenever a different customer is chosen.
  useEffect(loadAddresses, [ownerId]);

  function handleCustomerChange(customer) {
    setValues((current) => ({ ...current, customer, senderAddress: "", receiverAddress: "" }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    submit(validateShipment(values, { needsCustomer: isManager }), async () => {
      const saved = isNew
        ? await api("/shipments", { method: "POST", body: values })
        : await api(`/shipments/${existing._id}`, { method: "PUT", body: values });
      toast.success(isNew ? `Shipment created: ${saved.trackingNumber}` : "Shipment updated");
      navigate(`/app/shipments/${saved._id}`);
    });
  }

  const addressOptions = addresses.map((address) => ({
    value: address._id,
    label: `${address.label}: ${address.contactName}, ${address.city}`,
  }));

  return (
    <section className="narrow">
      <header className="page-head">
        <div>
          <p className="eyebrow">
            <Link to={existing ? `/app/shipments/${existing._id}` : "/app/shipments"}>← Back</Link>
          </p>
          <h1>{isNew ? "New shipment" : `Edit ${existing.trackingNumber}`}</h1>
        </div>
      </header>

      <form className="card form-card" onSubmit={handleSubmit} noValidate>
        <FormError message={formError} />

        {isManager && (
          <UserPicker
            label="Customer"
            role="customer"
            value={values.customer}
            onChange={handleCustomerChange}
            error={errors.customer}
            disabled={!isNew}
            initialLabel={existing?.customer?.name}
          />
        )}

        <div className="form-grid">
          <Field
            as="select"
            label="Sender address"
            name="senderAddress"
            value={values.senderAddress}
            onChange={handleChange}
            error={errors.senderAddress}
            options={addressOptions}
            placeholderOption={ownerId ? "Select an address" : "Choose a customer first"}
            disabled={!ownerId || addressesLocked}
          />
          <Field
            as="select"
            label="Receiver address"
            name="receiverAddress"
            value={values.receiverAddress}
            onChange={handleChange}
            error={errors.receiverAddress}
            options={addressOptions}
            placeholderOption={ownerId ? "Select an address" : "Choose a customer first"}
            disabled={!ownerId || addressesLocked}
          />
        </div>

        {addressError && <p className="field-message">{addressError}</p>}
        {addressesLocked && <p className="field-hint">Addresses are locked once a parcel has been picked up.</p>}
        {ownerId && !addressesLocked && (
          <p className="field-hint">
            {addresses.length < 2 && "A shipment needs two addresses. "}
            <button type="button" className="link-btn" onClick={() => setAddingAddress(true)}>
              Add an address
            </button>
          </p>
        )}

        <Field label="Contents" name="description" value={values.description} onChange={handleChange} error={errors.description} placeholder="Books, documents…" />

        <div className="form-grid">
          <Field label="Weight (kg)" name="weightKg" type="number" min="0.01" max="1000" step="0.01" value={values.weightKg} onChange={handleChange} error={errors.weightKg} />
          <Field as="select" label="Service" name="serviceType" value={values.serviceType} onChange={handleChange} error={errors.serviceType} options={toOptions(SERVICE_LABELS)} />
          {isManager && (
            <>
              <Field label="Origin branch" optional name="originBranch" value={values.originBranch} onChange={handleChange} error={errors.originBranch} hint="Defaults to your branch or the sender's city." />
              <Field label="Expected delivery" optional name="expectedDeliveryDate" type="date" value={values.expectedDeliveryDate} onChange={handleChange} error={errors.expectedDeliveryDate} />
            </>
          )}
        </div>

        <div className="form-actions">
          <Link to={existing ? `/app/shipments/${existing._id}` : "/app/shipments"} className="btn">
            Cancel
          </Link>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? "Saving…" : isNew ? "Create shipment" : "Save changes"}
          </button>
        </div>
      </form>

      {addingAddress && (
        <Modal title="Add an address" onClose={() => setAddingAddress(false)}>
          <AddressForm
            ownerId={ownerId}
            ownerLabel={isManager ? "Selected customer" : user.name}
            onCancel={() => setAddingAddress(false)}
            onSaved={() => {
              setAddingAddress(false);
              loadAddresses();
            }}
          />
        </Modal>
      )}
    </section>
  );
}

function ShipmentForm() {
  const { id } = useParams();
  const [existing, setExisting] = useState(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!id) return;
    setError("");
    api(`/shipments/${id}`)
      .then((data) => setExisting(data.shipment))
      .catch((err) => setError(err.message));
  }, [id, retry]);

  if (!id) return <ShipmentFormFields />;
  if (error) return <ErrorState message={error} onRetry={() => setRetry((count) => count + 1)} />;
  if (!existing) return <Loading />;
  return <ShipmentFormFields existing={existing} />;
}

export default ShipmentForm;
