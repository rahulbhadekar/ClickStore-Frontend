
import { useState } from "react";
import AdminSidebar from "./AdminSidebar";
import AdminTopbar from "./AdminTopbar";
import AdminOverview from "./AdminOverview";
import AdminSellerApplications from "./AdminSellerApplications";
import "./AdminDashboard.css";
import AdminProducts from "./AdminProducts";
import AdminOrders from "./AdminOrders";
import AdminCustomers from "./AdminCustomers";
import AdminSellers from "./AdminSellers";

const sectionLabels = {
  applications: "Seller Applications",
  products: "Product Management",
  orders: "Order Management",
  customers: "Customers",
  sellers: "Sellers",
};

export default function AdminDashboard({ authData, onLogout }) {
  const [activeSection, setActiveSection] = useState("overview");

  function renderSection() {
    if (activeSection === "overview") {
      return <AdminOverview onNavigate={setActiveSection} />;
    }

    if (activeSection === "applications") {
      return <AdminSellerApplications />;
    }

    if (activeSection === "products") {
    return <AdminProducts />;
    }

    if (activeSection === "orders") {
    return <AdminOrders />;
    }

    if (activeSection === "customers") {
    return <AdminCustomers />;
    }

    if (activeSection === "sellers") {
    return <AdminSellers />;
    }

    return (
      <section className="admin-content-card">
        <span className="admin-eyebrow">ADMIN WORKSPACE</span>
        <h2>{sectionLabels[activeSection]}</h2>
        <p>
          This section is ready for backend integration.
          Real data and actions will be connected in the next step.
        </p>
      </section>
    );
  }

  return (
    <div className="admin-layout">
      <AdminSidebar
        activeSection={activeSection}
        onNavigate={setActiveSection}
        onLogout={onLogout}
      />

      <main className="admin-main">
        <AdminTopbar
          activeSection={activeSection}
          user={authData?.user}
        />

        {renderSection()}
      </main>
    </div>
  );
}
