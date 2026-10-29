
import { useEffect, useState } from "react";
import "./Cart.css";

const API = "http://localhost:8080/api/customer/cart/items";

export default function Cart({ onCheckout, onContinueShopping }) {
  const [items, setItems] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function request(url, options = {}) {
    const token = localStorage.getItem("token");

    if (!token) {
      throw new Error("Please login to view your cart.");
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        Accept: "application/json",
        ...(options.body
          ? { "Content-Type": "application/json" }
          : {}),
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });

   const text = await response.text();
let data = null;

if (text) {
  try {
    data = JSON.parse(text);
  } catch {
    data = { message: text };
  }
}

    if (!response.ok) {
      throw new Error(
        data?.message ||
          data?.error ||
          `Request failed: ${response.status}`
      );
    }

    return data;
  }

  async function loadCart() {
    setLoading(true);
    setError("");

    try {
      const data = await request(API);
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Cart load nahi ho paaya.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function fetchCart() {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          throw new Error("Please login to view your cart.");
        }

        const response = await fetch(API, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const text = await response.text();
        let data = null;

        try {
          data = text ? JSON.parse(text) : [];
        } catch {
          throw new Error("Invalid response received from server.");
        }

        if (!response.ok) {
          throw new Error(
            data?.message ||
              data?.error ||
              `Request failed: ${response.status}`
          );
        }

        if (!cancelled) {
          setItems(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Cart load nahi ho paaya.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchCart();

    return () => {
      cancelled = true;
    };
  }, []);

  // Keep only selections that still exist in the cart.
 

  function toggleItem(itemId) {
    setSelectedIds((previous) =>
      previous.includes(itemId)
        ? previous.filter((id) => id !== itemId)
        : [...previous, itemId]
    );
  }

  const allSelected =
    items.length > 0 &&
    items.every((item) => selectedIds.includes(item.cartItemId));

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map((item) => item.cartItemId));
    }
  }

  async function updateQuantity(item, quantity) {
    if (quantity < 1) return;

    try {
      await request(`${API}/${item.cartItemId}`, {
        method: "PUT",
        body: JSON.stringify({ quantity }),
      });

      await loadCart();
    } catch (err) {
      setError(err.message || "Quantity update nahi hui.");
    }
  }

  async function removeItem(itemId) {
    try {
      await request(`${API}/${itemId}`, {
        method: "DELETE",
      });

      await loadCart();
    } catch (err) {
      setError(err.message || "Product remove nahi hua.");
    }
  }

  const selectedItems = items.filter((item) =>
    selectedIds.includes(item.cartItemId)
  );

  const selectedTotal = selectedItems.reduce(
    (sum, item) => sum + Number(item.subtotal || 0),
    0
  );

  const money = (value) =>
    Number(value).toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
    });

  function handleCheckout() {
    if (selectedIds.length === 0) {
      setError("Please select at least one product for checkout.");
      return;
    }

    setError("");
    onCheckout?.(selectedIds);
  }

  if (loading) {
    return (
      <main className="cart-page">
        <p>Loading your cart...</p>
      </main>
    );
  }

  return (
    <main className="cart-page">
      <button className="cart-back" onClick={onContinueShopping}>
        ← Continue shopping
      </button>

      <h1>Your Shopping Bag</h1>

      <p className="cart-subtitle">
        Select the products you want to purchase.
      </p>

      {error && (
        <p className="cart-error" role="alert">
          {error}
        </p>
      )}

      {items.length === 0 ? (
        <section className="cart-empty">
          <div className="cart-empty-icon">🛒</div>
          <h2>Your cart is empty</h2>
          <p>Add products to your bag and they will appear here.</p>

          <button
            className="cart-primary"
            onClick={onContinueShopping}
          >
            Browse products
          </button>
        </section>
      ) : (
        <>
          <div className="cart-select-all">
            <label>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleSelectAll}
              />
              <strong>Select all products ({items.length})</strong>
            </label>

            <span>
              {selectedIds.length} of {items.length} selected
            </span>
          </div>

          <div className="cart-layout">
            <section className="cart-items">
              {items.map((item) => (
                <article
                  className="cart-item"
                  key={item.cartItemId}
                >
                  <div className="cart-select-checkbox">
                    <input
                      type="checkbox"
                      aria-label={`Select ${item.productName || "product"}`}
                      checked={selectedIds.includes(item.cartItemId)}
                      onChange={() => toggleItem(item.cartItemId)}
                    />
                  </div>

                  <div className="cart-product-icon">
                    {item.imageUrl ||
                    item.productImage ||
                    item.image ? (
                      <img
                        src={
                          item.imageUrl ||
                          item.productImage ||
                          item.image
                        }
                        alt={item.productName || "Product"}
                        className="cart-product-image"
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <span>📦</span>
                    )}
                  </div>

                  <div className="cart-item-info">
                    <h3>{item.productName}</h3>

                    <p>{item.variantName || "Standard variant"}</p>

                    {item.sku && <small>SKU: {item.sku}</small>}

                    <strong>{money(item.price)}</strong>

                    <div className="cart-quantity">
                      <button
                        aria-label="Decrease quantity"
                        disabled={item.quantity <= 1}
                        onClick={() =>
                          updateQuantity(item, item.quantity - 1)
                        }
                      >
                        −
                      </button>

                      <span>{item.quantity}</span>

                      <button
                        aria-label="Increase quantity"
                        onClick={() =>
                          updateQuantity(item, item.quantity + 1)
                        }
                      >
                        +
                      </button>
                    </div>

                    <button
                      className="cart-remove"
                      onClick={() => removeItem(item.cartItemId)}
                    >
                      Remove
                    </button>
                  </div>

                  <strong className="cart-line-total">
                    {money(item.subtotal)}
                  </strong>
                </article>
              ))}
            </section>

            <aside className="cart-summary">
              <h2>Order Summary</h2>

              <div className="cart-summary-row">
                <span>Products selected</span>
                <strong>{selectedItems.length}</strong>
              </div>

              <div className="cart-summary-row">
                <span>Selected subtotal</span>
                <strong>{money(selectedTotal)}</strong>
              </div>

              <div className="cart-summary-row">
                <span>Shipping</span>
                <span>Calculated at checkout</span>
              </div>

              <div className="cart-summary-total">
                <span>Estimated total</span>
                <strong>{money(selectedTotal)}</strong>
              </div>

              <button
                className="cart-primary"
                onClick={handleCheckout}
                disabled={selectedIds.length === 0}
              >
                Checkout Selected ({selectedIds.length}) →
              </button>
            </aside>
          </div>
        </>
      )}
    </main>
  );
}
