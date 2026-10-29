
import { useCallback, useEffect, useState } from "react";
import {
  getAdminOrders,
  updateAdminOrderStatus,
} from "../services/adminApi";

const ORDER_STATUSES = [
  "PLACED",
  "CONFIRMED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
];

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedStatuses, setSelectedStatuses] = useState({});
  const [updatingIds, setUpdatingIds] = useState([]);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadOrders() {
      try {
        const data = await getAdminOrders();

        if (!Array.isArray(data)) {
          throw new Error("Invalid orders response.");
        }

        if (!cancelled) {
          setOrders(data);
          setSelectedStatuses((previous) => {
            const next = { ...previous };

            data.forEach((order) => {
              if (!(order.id in next)) {
                next[order.id] = order.status;
              }
            });

            return next;
          });
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Could not load orders.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadOrders();

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const handleRefresh = useCallback(() => {
    setLoading(true);
    setError("");
    setSuccessMessage("");
    setRefreshKey((current) => current + 1);
  }, []);

  const handleStatusChange = (orderId, status) => {
    setSelectedStatuses((previous) => ({
      ...previous,
      [orderId]: status,
    }));
    setError("");
    setSuccessMessage("");
  };

  const handleUpdateStatus = async (order) => {
    const newStatus = selectedStatuses[order.id];

    if (!newStatus || newStatus === order.status) {
      setError("Please select a different status.");
      return;
    }

    if (["DELIVERED", "CANCELLED"].includes(order.status)) {
      setError("Delivered or cancelled orders cannot be updated.");
      return;
    }

    setUpdatingIds((previous) => [...previous, order.id]);
    setError("");
    setSuccessMessage("");

    try {
      const updatedOrder = await updateAdminOrderStatus(
        order.id,
        newStatus
      );

      setOrders((previous) =>
        previous.map((item) =>
          item.id === order.id ? updatedOrder : item
        )
      );

      setSelectedStatuses((previous) => ({
        ...previous,
        [order.id]: updatedOrder.status,
      }));

      setSuccessMessage(`Order #${order.id} updated to ${updatedOrder.status}.`);
    } catch (err) {
      setError(err.message || "Could not update order status.");
    } finally {
      setUpdatingIds((previous) =>
        previous.filter((id) => id !== order.id)
      );
    }
  };

  const formatCurrency = (amount, currency = "INR") =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(Number(amount) || 0);

  if (loading) {
    return <div className="admin-content-card">Loading orders...</div>;
  }

  return (
    <section className="admin-content-card">
      <div className="admin-content-heading">
        <div>
          <h3>Order Management</h3>
          <p>{orders.length} total orders</p>
        </div>

        <button type="button" onClick={handleRefresh}>
          ↻ Refresh
        </button>
      </div>

      {error && <p className="admin-error-message">{error}</p>}

      {successMessage && (
        <p role="status" style={{ color: "green" }}>
          {successMessage}
        </p>
      )}

      {!error && orders.length === 0 && <p>No orders found.</p>}

      {orders.length > 0 && (
        <div className="admin-product-table-wrapper">
          <table className="admin-product-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Order Number</th>
                <th>Customer</th>
                <th>Total</th>
                <th>Current Status</th>
                <th>Update Status</th>
                <th>Date</th>
              </tr>
            </thead>

            <tbody>
              {orders.map((order) => {
                const terminalStatus = [
                  "DELIVERED",
                  "CANCELLED",
                ].includes(order.status);

                const isUpdating = updatingIds.includes(order.id);

                return (
                  <tr key={order.id}>
                    <td>#{order.id}</td>
                    <td>{order.orderNumber}</td>
                    <td>
                      {order.recipientName ||
                        `Customer #${order.customerId}`}
                    </td>
                    <td>
                      {formatCurrency(
                        order.grandTotal,
                        order.currencyCode
                      )}
                    </td>
                    <td>
                      <span className="admin-product-status">
                        {order.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "grid", gap: "8px", minWidth: "150px" }}>
                        <select
                          aria-label={`Status for order ${order.id}`}
                          value={selectedStatuses[order.id] ?? order.status}
                          disabled={terminalStatus || isUpdating}
                          onChange={(event) =>
                            handleStatusChange(order.id, event.target.value)
                          }
                        >
                          {ORDER_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          disabled={
                            terminalStatus ||
                            isUpdating ||
                            !selectedStatuses[order.id] ||
                            selectedStatuses[order.id] === order.status
                          }
                          onClick={() => handleUpdateStatus(order)}
                        >
                          {isUpdating ? "Updating..." : "Update Status"}
                        </button>
                      </div>
                    </td>
                    <td>
                      {order.createdAt
                        ? new Date(order.createdAt).toLocaleDateString("en-IN")
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
