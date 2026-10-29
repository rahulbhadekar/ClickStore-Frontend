
const sectionTitles = {
  overview: "Overview",
  applications: "Seller Applications",
  products: "Product Management",
  orders: "Order Management",
  customers: "Customers",
  sellers: "Sellers",
};

export default function AdminTopbar({
  activeSection,
  user,
}) {
  return (
    <header className="admin-topbar">
      <div className="admin-page-heading">
        <span>CLICKSTORE / ADMIN</span>
        <h1>{sectionTitles[activeSection] || "Overview"}</h1>
        <p>Manage your marketplace from one place.</p>
      </div>

      <div className="admin-user">
        <div className="admin-user-avatar">
          {(user?.fullName || "A").charAt(0).toUpperCase()}
        </div>
        <div className="admin-user-info">
          <strong>{user?.fullName || "Administrator"}</strong>
          <span>Administrator</span>
        </div>
      </div>
    </header>
  );
}
