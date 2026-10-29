
import { useEffect, useState } from "react";
import { getAdminCustomers } from "../services/adminApi";

export default function AdminCustomers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadCustomers() {
      try {
        const data = await getAdminCustomers();

        if (!Array.isArray(data)) {
          throw new Error("Invalid customers response.");
        }

        if (!cancelled) {
          setCustomers(data);
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Could not load customers.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadCustomers();

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const formatDate = (date) =>
    date ? new Date(date).toLocaleDateString("en-IN") : "—";

  if (loading) {
    return <section className="admin-content-card">Loading customers...</section>;
  }

  return (
    <section className="admin-content-card">
      <div className="admin-content-heading">
        <div>
          <h3>Customer Management</h3>
          <p>{customers.length} total customers</p>
        </div>

        <button
          type="button"
          onClick={() => {
            setLoading(true);
            setRefreshKey((key) => key + 1);
          }}
        >
          ↻ Refresh
        </button>
      </div>

      {error && <p className="admin-error-message">{error}</p>}

      {!error && customers.length === 0 && <p>No customers found.</p>}

      {!error && customers.length > 0 && (
        <div className="admin-product-table-wrapper">
          <table className="admin-product-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Full Name</th>
                <th>Email</th>
                <th>Account Status</th>
                <th>Joined Date</th>
                <th>Last Login</th>
              </tr>
            </thead>

            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id}>
                  <td>#{customer.id}</td>
                  <td>{customer.fullName}</td>
                  <td>{customer.email || "—"}</td>
                  <td>
                    <span className="admin-product-status">
                      {customer.accountStatus}
                    </span>
                  </td>
                  <td>{formatDate(customer.createdAt)}</td>
                  <td>{formatDate(customer.lastLoginAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
