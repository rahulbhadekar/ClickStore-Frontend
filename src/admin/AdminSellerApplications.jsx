
import { useCallback, useEffect, useState } from "react";
import {
  getPendingSellerApplications,
  approveSellerApplication,
  rejectSellerApplication,
} from "../services/adminApi";

export default function AdminSellerApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");

  const loadApplications = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await getPendingSellerApplications();
      setApplications(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Could not load seller applications.");
    } finally {
      setLoading(false);
    }
  }, []);

  
useEffect(() => {
  const load = async () => {
    await loadApplications();
  };

  load();
}, [loadApplications]);


  async function handleApprove(sellerId) {
    if (!window.confirm("Approve this seller application?")) return;

    setBusyId(sellerId);
    setError("");
    setMessage("");

    try {
      await approveSellerApplication(sellerId);
      setApplications((current) =>
        current.filter((item) => item.id !== sellerId)
      );
      setMessage("Seller application approved successfully.");
    } catch (err) {
      setError(err.message || "Could not approve this application.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(sellerId) {
    setBusyId(sellerId);
    setError("");
    setMessage("");

    try {
      await rejectSellerApplication(sellerId, reason.trim());
      setApplications((current) =>
        current.filter((item) => item.id !== sellerId)
      );
      setRejectingId(null);
      setReason("");
      setMessage("Seller application rejected.");
    } catch (err) {
      setError(err.message || "Could not reject this application.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="admin-content-card">
      <div className="admin-applications-heading">
        <div>
          <span className="admin-eyebrow">ADMIN WORKSPACE</span>
          <h2>Seller Applications</h2>
          <p>Review and manage pending seller requests.</p>
        </div>

        <button
          type="button"
          className="admin-action-button"
          onClick={loadApplications}
          disabled={loading}
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {message && <p role="status" className="admin-success-message">{message}</p>}
      {error && <p role="alert" className="admin-error-message">{error}</p>}

      {loading ? (
        <p>Loading seller applications...</p>
      ) : applications.length === 0 && !error ? (
        <div className="admin-empty-state">
          <h3>No pending applications</h3>
          <p>New seller applications will appear here.</p>
        </div>
      ) : (
        <div className="admin-application-list">
          {applications.map((seller) => {
            const sellerId = seller.id;
            const name =
              seller.businessName ||
              seller.storeName ||
              seller.companyName ||
              seller.fullName ||
              seller.name ||
              `Seller #${sellerId}`;

            return (
              <article className="admin-application-item" key={sellerId}>
                <div className="admin-application-details">
                  <h3>{name}</h3>
                  <p><strong>Application ID:</strong> {sellerId ?? "—"}</p>
                  <p><strong>Email:</strong> {seller.email || seller.contactEmail || "Not provided"}</p>
                  <p><strong>Phone:</strong> {seller.phone || seller.phoneNumber || "Not provided"}</p>
                  <p><strong>Status:</strong> {seller.status || seller.applicationStatus || "Pending"}</p>
                </div>

                {rejectingId === sellerId ? (
                  <div className="admin-reject-form">
                    <label>
                      Rejection reason (optional)
                      <textarea
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                        placeholder="Enter a reason"
                        rows={3}
                      />
                    </label>
                    <div className="admin-application-actions">
                      <button
                        type="button"
                        className="admin-reject-button"
                        disabled={busyId === sellerId}
                        onClick={() => handleReject(sellerId)}
                      >
                        {busyId === sellerId ? "Please wait..." : "Confirm Reject"}
                      </button>
                      <button
                        type="button"
                        className="admin-action-button"
                        onClick={() => {
                          setRejectingId(null);
                          setReason("");
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="admin-application-actions">
                    <button
                      type="button"
                      className="admin-approve-button"
                      disabled={busyId === sellerId || sellerId == null}
                      onClick={() => handleApprove(sellerId)}
                    >
                      {busyId === sellerId ? "Please wait..." : "Approve"}
                    </button>
                    <button
                      type="button"
                      className="admin-reject-button"
                      disabled={busyId === sellerId || sellerId == null}
                      onClick={() => {
                        setRejectingId(sellerId);
                        setReason("");
                      }}
                    >
                      Reject
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
