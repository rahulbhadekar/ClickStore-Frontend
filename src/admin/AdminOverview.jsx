
import { useEffect, useState } from "react";
import { adminApiRequest } from "../services/adminApi";

const initialMetrics = [
  {
    label: "Total Sales",
    value: "—",
    note: "Sales data not connected",
    icon: "₹",
  },
  {
    label: "Total Orders",
    value: "—",
    note: "Order data not connected",
    icon: "▤",
  },
  {
    label: "Products",
    value: "—",
    note: "Loading products...",
    icon: "▦",
  },
  {
    label: "Customers",
    value: "—",
    note: "Customer data not connected",
    icon: "♧",
  },
];

export default function AdminOverview({ onNavigate }) {
  const [productCount, setProductCount] = useState(null);
  const [pendingSellerCount, setPendingSellerCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadStatistics() {
      setLoading(true);
      setError("");

      const results = await Promise.allSettled([
        adminApiRequest("/products/admin/all"),
        adminApiRequest("/admin/sellers/pending"),
      ]);

      if (cancelled) return;

      const [productsResult, sellersResult] = results;
      const errors = [];

      if (productsResult.status === "fulfilled") {
        if (Array.isArray(productsResult.value)) {
          setProductCount(productsResult.value.length);
        } else {
          setProductCount(null);
          errors.push("Invalid products response.");
        }
      } else {
        setProductCount(null);
        errors.push(productsResult.reason?.message || "Could not load products.");
      }

      if (sellersResult.status === "fulfilled") {
        if (Array.isArray(sellersResult.value)) {
          setPendingSellerCount(sellersResult.value.length);
        } else {
          setPendingSellerCount(null);
          errors.push("Invalid seller applications response.");
        }
      } else {
        setPendingSellerCount(null);
        errors.push(
          sellersResult.reason?.message ||
            "Could not load seller applications."
        );
      }

      setError(errors.join(" "));
      setLoading(false);
    }

    loadStatistics();

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const handleRefresh = () => {
    setRefreshKey((current) => current + 1);
  };

  const metrics = initialMetrics.map((metric) => {
    if (metric.label === "Products") {
      return {
        ...metric,
        value: loading
          ? "..."
          : productCount !== null
            ? productCount.toLocaleString("en-IN")
            : "—",
        note:
          productCount !== null
            ? "All products, including drafts"
            : "Product data unavailable",
      };
    }

    return metric;
  });

  return (
    <div className="admin-overview">
      <section className="admin-welcome-card">
        <div>
          <span className="admin-eyebrow">CONTROL CENTER</span>
          <h2>Your marketplace, at a glance.</h2>
          <p>
            Review seller requests and manage your store operations
            from this workspace.
          </p>
          <button
            type="button"
            onClick={() => onNavigate("applications")}
          >
            Review seller applications →
          </button>
        </div>
        <div className="admin-welcome-symbol">C</div>
      </section>

      <section className="admin-metrics">
        {metrics.map((metric) => (
          <article className="admin-metric-card" key={metric.label}>
            <div className="admin-metric-top">
              <span>{metric.label}</span>
              <span className="admin-metric-icon">{metric.icon}</span>
            </div>
            <strong className="admin-metric-value">
              {metric.value}
            </strong>
            <small>{metric.note}</small>
          </article>
        ))}

        <article className="admin-metric-card">
          <div className="admin-metric-top">
            <span>Pending Seller Applications</span>
            <span className="admin-metric-icon">♙</span>
          </div>
          <strong className="admin-metric-value">
            {loading
              ? "..."
              : pendingSellerCount !== null
                ? pendingSellerCount.toLocaleString("en-IN")
                : "—"}
          </strong>
          <small>
            {pendingSellerCount !== null
              ? "Applications awaiting review"
              : "Seller data unavailable"}
          </small>
        </article>
      </section>

      {error && (
        <section className="admin-content-card">
          <p className="admin-error-message">{error}</p>
          <button type="button" onClick={handleRefresh}>
            Try again
          </button>
        </section>
      )}

      <section className="admin-content-card">
        <div className="admin-content-heading">
          <div>
            <h3>Marketplace operations</h3>
            <p>Choose a section to manage your store.</p>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "↻ Refresh statistics"}
          </button>
        </div>

        <div className="admin-quick-actions">
          <button
            type="button"
            onClick={() => onNavigate("applications")}
          >
            <span>♙</span>
            <strong>Seller Applications</strong>
            <small>Review requests →</small>
          </button>

          <button
            type="button"
            onClick={() => onNavigate("products")}
          >
            <span>▦</span>
            <strong>Products</strong>
            <small>Manage catalog →</small>
          </button>

          <button
            type="button"
            onClick={() => onNavigate("orders")}
          >
            <span>▤</span>
            <strong>Orders</strong>
            <small>Review orders →</small>
          </button>
        </div>
      </section>
    </div>
  );
}
