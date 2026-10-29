
import { useEffect, useState } from "react";
import { getAdminSellers } from "../services/adminApi";

function AdminSellers() {
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch approved sellers from backend
  const loadSellers = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getAdminSellers();
      setSellers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to load sellers.");
    } finally {
      setLoading(false);
    }
  };

  // Load sellers when the page opens
  useEffect(() => {
  let ignore = false;

  const fetchSellers = async () => {
    try {
      setError("");

      const data = await getAdminSellers();

      if (!ignore) {
        setSellers(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      if (!ignore) {
        setError(err.message || "Failed to load sellers.");
      }
    } finally {
      if (!ignore) {
        setLoading(false);
      }
    }
  };

  fetchSellers();

  return () => {
    ignore = true;
  };
}, []);

  // Loading state
  if (loading) {
    return (
      <div className="admin-page">
        <h2>Approved Sellers</h2>
        <p>Loading sellers...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="admin-page">
        <div className="admin-page-header">
          <h2>Approved Sellers</h2>
          <button onClick={loadSellers}>Retry</button>
        </div>
        <p>{error}</p>
      </div>
    );
  }

  // Sellers page
  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h2>Approved Sellers</h2>
          <p>View all approved stores on ClickStore.</p>
        </div>

        <button onClick={loadSellers}>Refresh</button>
      </div>

      <div className="admin-stats">
        <div className="admin-stat-card">
          <h3>Total Approved Sellers</h3>
          <p>{sellers.length}</p>
        </div>
      </div>

      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Store Name</th>
              <th>Store Slug</th>
              <th>Owner User ID</th>
              <th>Status</th>
              <th>Created At</th>
            </tr>
          </thead>

          <tbody>
            {sellers.length === 0 ? (
              <tr>
                <td colSpan={6}>No approved sellers found.</td>
              </tr>
            ) : (
              sellers.map((seller) => (
                <tr key={seller.id}>
                  <td>{seller.id}</td>
                  <td>{seller.storeName}</td>
                  <td>{seller.storeSlug}</td>
                  <td>{seller.userId}</td>
                  <td>
                    <span className="seller-status">
                      {seller.status}
                    </span>
                  </td>
                  <td>
                    {seller.createdAt
                      ? new Date(seller.createdAt).toLocaleDateString()
                      : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminSellers;
