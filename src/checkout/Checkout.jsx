
import { useEffect, useState } from "react";
import "./Checkout.css";

const API = "http://localhost:8080/api/customer";

export default function Checkout({
  onBackToCart,
  onOrderSuccess,
  selectedCartItemIds = [],
}) {
  const [addresses, setAddresses] = useState([]);
  const [addressId, setAddressId] = useState("");
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadAddresses() {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          throw new Error("Please login before checkout.");
        }

        const response = await fetch(`${API}/addresses`, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || data.error || "Could not load addresses."
          );
        }

        if (!cancelled) {
          const list = Array.isArray(data) ? data : [];
          setAddresses(list);

          const defaultAddress = list.find(
            (address) => address.defaultAddress
          );

          if (defaultAddress) {
            setAddressId(
              String(defaultAddress.addressId ?? defaultAddress.id)
            );
          } else if (list.length > 0) {
            setAddressId(String(list[0].addressId ?? list[0].id));
          }
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

    loadAddresses();

    return () => {
      cancelled = true;
    };
  }, []);

  async function placeOrder() {
    if (!addressId) {
      setError("Please select a shipping address.");
      return;
    }

    if (
      !Array.isArray(selectedCartItemIds) ||
      selectedCartItemIds.length === 0
    ) {
      setError("Please select at least one product from your cart.");
      return;
    }

    setPlacing(true);
    setError("");

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error("Please login again.");
      }

      const response = await fetch(`${API}/orders`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          addressId: Number(addressId),
          cartItemIds: selectedCartItemIds.map(Number),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || data.error || "Order could not be placed."
        );
      }

      onOrderSuccess?.(data);
    } catch (err) {
      setError(err.message || "Order could not be placed.");
    } finally {
      setPlacing(false);
    }
  }

  if (loading) {
    return (
      <main className="checkout-page">
        <p>Loading addresses...</p>
      </main>
    );
  }

  return (
    <main className="checkout-page">
      <button className="checkout-back" onClick={onBackToCart}>
        ← Back to cart
      </button>

      <h1>Checkout</h1>

      <p className="checkout-subtitle">
        Choose where your order should be delivered.
      </p>

      <p>
        Selected products: {selectedCartItemIds.length}
      </p>

      {error && (
        <p className="checkout-error" role="alert">
          {error}
        </p>
      )}

      <section className="checkout-panel">
        <h2>Shipping address</h2>

        {addresses.length === 0 ? (
          <p>
            No saved address found. Please add a shipping address from your
            account before placing an order.
          </p>
        ) : (
          <div className="checkout-address-list">
            {addresses.map((address) => {
              const id = address.addressId ?? address.id;

              return (
                <label className="checkout-address" key={id}>
                  <input
                    type="radio"
                    name="shippingAddress"
                    value={id}
                    checked={addressId === String(id)}
                    onChange={() => setAddressId(String(id))}
                  />

                  <span>
                    <strong>{address.recipientName}</strong>

                    {address.defaultAddress && (
                      <small className="checkout-default">
                        Default
                      </small>
                    )}

                    <span>{address.phone}</span>

                    <span>
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
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        )}

        <button
          className="checkout-place-button"
          onClick={placeOrder}
          disabled={
            placing ||
            addresses.length === 0 ||
            selectedCartItemIds.length === 0
          }
        >
          {placing ? "Placing order..." : "Place Order"}
        </button>
      </section>
    </main>
  );
}
