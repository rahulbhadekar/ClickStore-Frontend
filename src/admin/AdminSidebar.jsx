
const menuItems = [
  { id: "overview", label: "Overview", icon: "◫" },
  { id: "applications", label: "Seller Applications", icon: "♙" },
  { id: "products", label: "Products", icon: "▦" },
  { id: "orders", label: "Orders", icon: "▤" },
  { id: "customers", label: "Customers", icon: "♧" },
  { id: "sellers", label: "Sellers", icon: "⌂" },
];

export default function AdminSidebar({
  activeSection,
  onNavigate,
  onLogout,
}) {
  return (
    <aside className="admin-sidebar">
      <div className="admin-brand">
        <span className="admin-brand-icon">C</span>
        <div>
          <strong>ClickStore</strong>
          <small>ADMIN CONSOLE</small>
        </div>
      </div>

      <p className="admin-nav-heading">WORKSPACE</p>

      <nav className="admin-nav">
        {menuItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={
              activeSection === item.id ? "active" : ""
            }
            onClick={() => onNavigate(item.id)}
          >
            <span className="admin-nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="admin-sidebar-bottom">
        <div className="admin-security-note">
          <span>✓</span>
          <div>
            <strong>Secure workspace</strong>
            <small>Administrator access</small>
          </div>
        </div>

        <button
          type="button"
          className="admin-logout"
          onClick={onLogout}
        >
          ↪ <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
