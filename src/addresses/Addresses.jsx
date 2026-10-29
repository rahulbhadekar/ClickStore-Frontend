
import { useEffect, useState } from "react";
import "./Addresses.css";

const API = "http://localhost:8080/api/customer/addresses";

const EMPTY_FORM = {
  recipientName: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  landmark: "",
  city: "",
  state: "",
  postalCode: "",
  countryCode: "IN",
  defaultAddress: false,
};

async function apiRequest(url, options = {}) {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error("Please login to manage your addresses.");
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  const raw = await response.text();
  let data = null;

  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = { message: raw };
    }
  }

  if (!response.ok) {
    throw new Error(
      data?.message || data?.error || `Request failed (${response.status})`
    );
  }

  return data;
}

export default function Addresses({ onBack, embedded = false }) {
  const [addresses, setAddresses] = useState([]);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);

  async function fetchAddresses() {
    const data = await apiRequest(API);
    return Array.isArray(data) ? data : [];
  }

  useEffect(() => {
    let cancelled = false;

    async function loadInitialAddresses() {
      try {
        const data = await fetchAddresses();

        if (!cancelled) {
          setAddresses(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Could not load addresses.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadInitialAddresses();

    return () => {
      cancelled = true;
    };
  }, []);

  async function refreshAddresses() {
    const data = await fetchAddresses();
    setAddresses(data);
  }

  function handleChange(event) {
    const { name, value, checked, type } = event.target;

    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function resetForm() {
  setForm({ ...EMPTY_FORM });
  setEditingId(null);
  setShowForm(false);
}

  function startEdit(address) {
    const id = address.addressId ?? address.id;

    setEditingId(id);
    setShowForm(true);
    setForm({
      recipientName: address.recipientName || "",
      phone: address.phone || "",
      addressLine1: address.addressLine1 || "",
      addressLine2: address.addressLine2 || "",
      landmark: address.landmark || "",
      city: address.city || "",
      state: address.state || "",
      postalCode: address.postalCode || "",
      countryCode: address.countryCode || "IN",
      defaultAddress: Boolean(address.defaultAddress),
    });

    setError("");
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const isEditing = editingId !== null;
      const url = isEditing ? `${API}/${editingId}` : API;

      await apiRequest(url, {
        method: isEditing ? "PUT" : "POST",
        body: JSON.stringify(form),
      });

      resetForm();
      setMessage(
        isEditing
          ? "Address updated successfully."
          : "Address added successfully."
      );

      try {
        await refreshAddresses();
      } catch {
        setError(
          "Address save ho gaya, lekin list refresh nahi hui. Page reload karke check karo."
        );
      }
    } catch (err) {
      setError(err.message || "Could not save address.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteAddress(address) {
    const id = address.addressId ?? address.id;

    if (id == null) {
      setError("Address ID nahi mila. Address delete nahi kiya.");
      return;
    }

    if (!window.confirm("Are you sure you want to delete this address?")) {
      return;
    }

    setError("");
    setMessage("");

    try {
      await apiRequest(`${API}/${id}`, { method: "DELETE" });

      setMessage("Address deleted successfully.");

      if (String(editingId) === String(id)) {
        resetForm();
      }

      await refreshAddresses();
    } catch (err) {
      setError(err.message || "Could not delete address.");
    }
  }

  return (
    <main className={embedded ? "addresses-embedded" : "addresses-page"}>
      {!embedded && (
      <div className="addresses-heading">
        <div>
          <p className="addresses-eyebrow">YOUR ACCOUNT</p>
          <h1>My Addresses</h1>
          <p className="addresses-subtitle">
            Manage your delivery addresses for ClickStore orders.
          </p>
        </div>

        {onBack && (
          <button
            type="button"
            className="addresses-back"
            onClick={onBack}
          >
            ← Back
          </button>
        )}
      </div>
      )}

      {error && (
        <p className="addresses-alert addresses-alert-error" role="alert">
          {error}
        </p>
      )}

      {message && (
        <p className="addresses-alert addresses-alert-success" role="status">
          {message}
        </p>
      )}

      <div className="addresses-toolbar">
  <button
    type="button"
    className="addresses-primary"
    onClick={() => {
      resetForm();
      setShowForm(true);
    }}
  >
    + Add New Address
  </button>
</div>

      {showForm && (
  <section className="addresses-form-panel">
        <h2>{editingId !== null ? "Edit address" : "Add a new address"}</h2>

        <form onSubmit={handleSubmit}>
          <div className="addresses-form-grid">
            <label>
              Recipient name *
              <input
                name="recipientName"
                value={form.recipientName}
                onChange={handleChange}
                required
                maxLength={100}
                autoComplete="name"
                placeholder="Full name"
              />
            </label>

            <label>
              Phone number *
              <input
                name="phone"
                type="tel"
                value={form.phone}
                onChange={handleChange}
                required
                maxLength={20}
                autoComplete="tel"
                placeholder="Mobile number"
              />
            </label>

            <label className="addresses-full-width">
              Address line 1 *
              <input
                name="addressLine1"
                value={form.addressLine1}
                onChange={handleChange}
                required
                maxLength={200}
                autoComplete="address-line1"
                placeholder="House number, street, area"
              />
            </label>

            <label className="addresses-full-width">
              Address line 2
              <input
                name="addressLine2"
                value={form.addressLine2}
                onChange={handleChange}
                maxLength={200}
                autoComplete="address-line2"
                placeholder="Apartment, building (optional)"
              />
            </label>

            <label>
              Landmark
              <input
                name="landmark"
                value={form.landmark}
                onChange={handleChange}
                maxLength={150}
                placeholder="Nearby landmark (optional)"
              />
            </label>

            <label>
              City *
              <input
                name="city"
                value={form.city}
                onChange={handleChange}
                required
                maxLength={100}
                autoComplete="address-level2"
                placeholder="City"
              />
            </label>

            <label>
              State *
              <input
                name="state"
                value={form.state}
                onChange={handleChange}
                required
                maxLength={100}
                autoComplete="address-level1"
                placeholder="State"
              />
            </label>

            <label>
              PIN code *
              <input
                name="postalCode"
                value={form.postalCode}
                onChange={handleChange}
                required
                maxLength={12}
                autoComplete="postal-code"
                placeholder="PIN code"
              />
            </label>

            <label>
              Country code *
              <input
                name="countryCode"
                value={form.countryCode}
                onChange={handleChange}
                required
                maxLength={3}
                placeholder="IN"
              />
            </label>
          </div>

          <label className="addresses-default-option">
            <input
              type="checkbox"
              name="defaultAddress"
              checked={form.defaultAddress}
              onChange={handleChange}
            />
            Set as default address
          </label>

          <div className="addresses-form-actions">
            <button
              type="submit"
              className="addresses-primary"
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : editingId !== null
                  ? "Save changes"
                  : "Add address"}
            </button>

            {editingId !== null && (
              <button
                type="button"
                className="addresses-secondary"
                onClick={resetForm}
                disabled={saving}
              >
                Cancel edit
              </button>
            )}
          </div>
        </form>
      </section>
      )}

      <section className="addresses-saved-section">
        <h2>Saved addresses</h2>

        {loading ? (
          <p>Loading addresses...</p>
        ) : addresses.length === 0 ? (
          <div className="addresses-empty">
            <span aria-hidden="true">📍</span>
            <h3>No saved addresses yet</h3>
            <p>Add an address above to use it during checkout.</p>
          </div>
        ) : (
          <div className="addresses-list">
            {addresses.map((address) => {
              const id = address.addressId ?? address.id;

              return (
                <article className="addresses-card" key={id}>
                  <div className="addresses-card-heading">
                    <h3>{address.recipientName}</h3>

                    {address.defaultAddress && (
                      <span className="addresses-default-badge">
                        Default
                      </span>
                    )}
                  </div>

                  <p>{address.phone}</p>

                  <p>
                    {[
                      address.addressLine1,
                      address.addressLine2,
                      address.landmark,
                      address.city,
                      address.state,
                      address.postalCode,
                      address.countryCode,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </p>

                  <div className="addresses-card-actions">
                    <button
                      type="button"
                      className="addresses-secondary"
                      onClick={() => startEdit(address)}
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      className="addresses-delete"
                      onClick={() => deleteAddress(address)}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
