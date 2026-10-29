
import { useEffect, useState } from "react";
import "./ProfilePage.css";
import Addresses from "./addresses/Addresses";
import SellerRegistration from "./seller/SellerRegistration";

export default function ProfilePage({
  authData,
  wishlist = [],
  wishlistProducts = [],
  onRemoveWishlist,
  onBack,
  onLogout,
}) {
  const [activeSection, setActiveSection] = useState("profile");
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState("");

  async function requestProfile(path, options = {}) {
    const token = localStorage.getItem("token");

    if (!token) {
      throw new Error("Please login again to continue.");
    }

    const response = await fetch(
      `http://localhost:8080/api/auth${path}`,
      {
        ...options,
        headers: {
          Accept: "application/json",
          ...(options.body
            ? { "Content-Type": "application/json" }
            : {}),
          Authorization: `Bearer ${token}`,
          ...options.headers,
        },
      }
    );

    const raw = await response.text();
    let data = {};

    if (raw) {
      try {
        data = JSON.parse(raw);
      } catch {
        data = { message: raw };
      }
    }

    if (!response.ok) {
      throw new Error(
        data.message || data.error || `Request failed (${response.status})`
      );
    }

    return data;
  }

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        setProfileLoading(true);
        setProfileError("");

        const data = await requestProfile("/profile");

        if (!cancelled) {
          setProfile(data);
          setFullName(data.fullName || "");
          setPhone(data.phone || "");
        }
      } catch (error) {
        if (!cancelled) {
          setProfileError(error.message || "Could not load your profile.");
        }
      } finally {
        if (!cancelled) {
          setProfileLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  const user = profile || authData?.user || {};

  useEffect(() => {
  if (activeSection !== "orders") return;

  let cancelled = false;

  async function loadOrders() {
    setOrdersLoading(true);
    setOrdersError("");

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error("Please log in to view your orders.");
      }

      const response = await fetch(
        "http://localhost:8080/api/customer/orders",
        {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json().catch(() => []);

      if (!response.ok) {
        throw new Error(
          data.message || data.error || "Could not load orders."
        );
      }

      if (!cancelled) {
        setOrders(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      if (!cancelled) {
        setOrdersError(error.message || "Could not load orders.");
      }
    } finally {
      if (!cancelled) {
        setOrdersLoading(false);
      }
    }
  }

  loadOrders();

  return () => {
    cancelled = true;
  };
}, [activeSection]);

  const startEditing = () => {
    setFullName(profile?.fullName || "");
    setPhone(profile?.phone || "");
    setMessage("");
    setSaveError("");
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setFullName(profile?.fullName || "");
    setPhone(profile?.phone || "");
    setSaveError("");
    setIsEditing(false);
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    setMessage("");
    setSaveError("");

    const cleanedName = fullName.trim();
    const cleanedPhone = phone.trim();

    if (!cleanedName) {
      setSaveError("Full name is required.");
      return;
    }

    if (cleanedPhone && !/^[0-9]{10}$/.test(cleanedPhone)) {
      setSaveError("Phone number must contain exactly 10 digits.");
      return;
    }

    try {
      setSaving(true);

      const updatedProfile = await requestProfile("/profile", {
        method: "PUT",
        body: JSON.stringify({
          fullName: cleanedName,
          phone: cleanedPhone,
        }),
      });

      setProfile(updatedProfile);
      setFullName(updatedProfile.fullName || "");
      setPhone(updatedProfile.phone || "");
      setIsEditing(false);
      setMessage("Profile updated successfully!");
    } catch (error) {
      setSaveError(error.message || "Could not update your profile.");
    } finally {
      setSaving(false);
    }
  };

  const menuItems = [
    { id: "profile", label: "My Profile", icon: "👤" },
    { id: "orders", label: "My Orders", icon: "📦" },
    { id: "addresses", label: "My Addresses", icon: "📍" },
    { id: "wishlist", label: "Wishlist", icon: "♡" },
    { id: "seller", label: "Become a Seller", icon: "🏪" },
  ];

 
const handleMenuClick = (section) => {
  setMessage("");
  setSaveError("");
  setActiveSection(section);
};


  return (
    <div className="account-page">
      <header className="account-topbar">
        <button
          type="button"
          className="account-back"
          onClick={onBack}
        >
          ← Back to Store
        </button>

        <strong>
          ClickStore <span>My Account</span>
        </strong>
      </header>

      <div className="account-layout">
        <aside className="account-sidebar">
          <div className="account-user-summary">
            <div className="account-avatar">
              {(user.fullName || "U").charAt(0).toUpperCase()}
            </div>
            <strong>{user.fullName || "Customer"}</strong>
            <small>{user.email || ""}</small>
          </div>

          <nav className="account-menu" aria-label="Account navigation">
            {menuItems.map((item) => (
              <button
                type="button"
                key={item.id}
                className={activeSection === item.id ? "active" : ""}
                aria-current={
                  activeSection === item.id ? "page" : undefined
                }
                onClick={() => handleMenuClick(item.id)}
              >
                <span>{item.icon}</span>
                {item.label}

                {item.id === "wishlist" && (
                  <small>{wishlist.length}</small>
                )}
              </button>
            ))}

            <button
              type="button"
              className="account-logout"
              onClick={onLogout}
            >
              <span>↪</span> Logout
            </button>
          </nav>
        </aside>

        <main className="account-content">
          {activeSection === "profile" && (
            <>
              <p className="account-eyebrow">ACCOUNT SETTINGS</p>
              <h1>My Profile</h1>
              <p className="account-description">
                Manage your personal account information.
              </p>

              {profileLoading && (
                <section className="account-info-card">
                  <p>Loading your profile...</p>
                </section>
              )}

              {!profileLoading && profileError && (
                <section className="account-info-card" role="alert">
                  <h2>Unable to load profile</h2>
                  <p>{profileError}</p>
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                  >
                    Try Again
                  </button>
                </section>
              )}

              {!profileLoading && !profileError && (
                <>
                  {message && (
                    <p className="profile-success" role="status">
                      ✓ {message}
                    </p>
                  )}

                  {saveError && (
                    <p className="profile-error" role="alert">
                      {saveError}
                    </p>
                  )}

                  <section className="account-info-card">
                    <div className="profile-card-heading">
                      <div>
                        <h2>Personal Information</h2>
                        <p className="account-description">
                          Your ClickStore account details.
                        </p>
                      </div>

                      {!isEditing && (
                        <button
                          type="button"
                          className="profile-edit-button"
                          onClick={startEditing}
                        >
                          ✎ Edit Profile
                        </button>
                      )}
                    </div>

                    {isEditing ? (
                      <form
                        className="profile-edit-form"
                        onSubmit={handleSaveProfile}
                      >
                        <label htmlFor="profile-full-name">
                          Full Name
                        </label>
                        <input
                          id="profile-full-name"
                          type="text"
                          value={fullName}
                          onChange={(event) =>
                            setFullName(event.target.value)
                          }
                          maxLength={150}
                          required
                          autoComplete="name"
                        />

                        <label htmlFor="profile-email">
                          Email Address
                        </label>
                        <input
                          id="profile-email"
                          type="email"
                          value={profile?.email || ""}
                          disabled
                        />
                        <small>
                          Email cannot be changed from this form.
                        </small>

                        <label htmlFor="profile-phone">
                          Phone Number
                        </label>
                        <input
                          id="profile-phone"
                          type="tel"
                          value={phone}
                          onChange={(event) =>
                            setPhone(event.target.value)
                          }
                          placeholder="Enter 10-digit phone number"
                          inputMode="numeric"
                          maxLength={10}
                          autoComplete="tel"
                        />

                        <div className="profile-form-actions">
                          <button
                            type="button"
                            className="profile-cancel-button"
                            onClick={cancelEditing}
                            disabled={saving}
                          >
                            Cancel
                          </button>

                          <button
                            type="submit"
                            className="profile-save-button"
                            disabled={saving}
                          >
                            {saving ? "Saving..." : "Save Changes"}
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <div className="account-info-row">
                          <span>Full Name</span>
                          <strong>
                            {user.fullName || "Not available"}
                          </strong>
                        </div>

                        <div className="account-info-row">
                          <span>Email Address</span>
                          <strong>
                            {user.email || "Not available"}
                          </strong>
                        </div>

                        <div className="account-info-row">
                          <span>Phone Number</span>
                          <strong>{user.phone || "Not added"}</strong>
                        </div>

                        <div className="account-info-row">
                          <span>Customer ID</span>
                          <strong>{user.id ?? "Not available"}</strong>
                        </div>
                      </>
                    )}
                  </section>
                </>
              )}
            </>
          )}

          
{activeSection === "orders" && (
  <>
    <p className="account-eyebrow">YOUR PURCHASES</p>
    <h1>My Orders</h1>
    <p className="account-description">
      View your order history and purchase details.
    </p>

    {ordersLoading ? (
      <section className="account-info-card">
        <p>Loading your orders...</p>
      </section>
    ) : ordersError ? (
      <section className="account-info-card">
        <h2>Unable to load orders</h2>
        <p>{ordersError}</p>
        <button
          type="button"
          onClick={() => setActiveSection("profile")}
        >
          Back to Profile
        </button>
        <button
          type="button"
          onClick={() => setActiveSection("orders")}
        >
          Try Again
        </button>
      </section>
    ) : orders.length === 0 ? (
      <section className="account-info-card account-empty">
        <span>📦</span>
        <h2>No orders yet</h2>
        <p>Your completed and recent purchases will appear here.</p>
      </section>
    ) : (
      <div className="account-orders-list">
        {orders.map((order) => (
          <article
            className="account-info-card account-order-card"
            key={order.id}
          >
            <div className="account-order-heading">
              <div>
                <span className="account-order-label">ORDER NUMBER</span>
                <h2>{order.orderNumber || `Order #${order.id}`}</h2>
              </div>

              <span
                className={`account-order-status status-${String(
                  order.status || "PLACED"
                ).toLowerCase()}`}
              >
                {String(order.status || "PLACED").replaceAll("_", " ")}
              </span>
            </div>

            <div className="account-order-details">
              <div>
                <span>Order date</span>
                <strong>
                  {order.placedAt
                    ? new Date(order.placedAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "Date unavailable"}
                </strong>
              </div>

              <div>
                <span>Total amount</span>
                <strong>
                  {order.currencyCode || "INR"}{" "}
                  {Number(order.grandTotal || 0).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </strong>
              </div>
            </div>

            <div className="account-order-shipping">
              <strong>Delivery address</strong>
              <p>
                {order.recipientName}
                {order.shippingPhone ? ` · ${order.shippingPhone}` : ""}
              </p>
              <p>
                {[
                  order.shippingAddressLine1,
                  order.shippingAddressLine2,
                  order.shippingLandmark,
                  order.shippingCity,
                  order.shippingState,
                  order.shippingPostalCode,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            </div>
          </article>
        ))}
      </div>
    )}
  </>
)}


         {activeSection === "addresses" && (
  <>
    <p className="account-eyebrow">DELIVERY DETAILS</p>
    <h1>My Addresses</h1>
    <p className="account-description">
      Manage your saved delivery addresses.
    </p>

    <Addresses embedded />
  </>
)}

          {activeSection === "wishlist" && (
            <>
              <p className="account-eyebrow">SAVED PRODUCTS</p>
              <h1>My Wishlist</h1>
              <p className="account-description">
                Your favourite products, all in one place.
              </p>

              {wishlistProducts.length === 0 ? (
                <section className="account-info-card account-empty">
                  <span>♡</span>
                  <h2>Your wishlist is empty</h2>
                  <p>Save a product from the store to see it here.</p>
                </section>
              ) : (
                <div className="account-wishlist-grid">
                  {wishlistProducts.map((product) => (
                    <article
                      className="account-wishlist-card"
                      key={product.id}
                    >
                      <div className="account-wishlist-image">
                        {product.image ? (
                          <img src={product.image} alt={product.name} />
                        ) : (
                          <span>▧</span>
                        )}
                      </div>

                      <div className="account-wishlist-info">
                        <h2>{product.name}</h2>
                        <strong>
                          {product.price == null
                            ? "Price unavailable"
                            : Number(product.price).toLocaleString("en-IN", {
                                style: "currency",
                                currency: "INR",
                                maximumFractionDigits: 2,
                              })}
                        </strong>
                        <button
                          type="button"
                          className="account-wishlist-remove"
                          onClick={() => onRemoveWishlist?.(product.id)}
                        >
                          ♡ Remove from Wishlist
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}



          {activeSection === "seller" && (
          <SellerRegistration />
        )}





        </main>
      </div>
    </div>
  );
}
