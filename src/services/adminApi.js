const API_BASE_URL = "http://localhost:8080/api";

export async function adminApiRequest(path, options = {}) {
  const token = localStorage.getItem("token");

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body && !(options.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const raw = await response.text();
  let data = null;

  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = { message: raw };
    }
  }

  if (!response.ok) {
    throw new Error(
      data?.message || data?.error || `Request failed (${response.status})`
    );
  }

  return data;
}

export async function getPendingSellerApplications() {
  return adminApiRequest("/admin/sellers/pending");
}

export async function approveSellerApplication(sellerId) {
  return adminApiRequest(`/admin/sellers/${sellerId}/approve`, {
    method: "PUT",
  });
}

export async function rejectSellerApplication(sellerId, reason = "") {
  return adminApiRequest(`/admin/sellers/${sellerId}/reject`, {
    method: "PUT",
    body: JSON.stringify({ reason }),
  });
}

export async function getAdminOrders() {
  return adminApiRequest("/admin/orders");
}

export async function updateAdminOrderStatus(orderId, status) {
  return adminApiRequest(`/admin/orders/${orderId}/status`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
}

export async function getAdminCustomers() {
  return adminApiRequest("/admin/customers");
}

export const getAdminSellers = () =>
  adminApiRequest("/admin/sellers");

export async function uploadProductImage(file) {
  const token = localStorage.getItem("token");

  if (!file) {
    throw new Error("Please select an image.");
  }

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/products/images`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  const raw = await response.text();
  let data = null;

  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = { message: raw };
    }
  }

  if (!response.ok) {
    throw new Error(
      data?.message ||
        data?.error ||
        `Image upload failed (${response.status})`
    );
  }

  if (!data || !data.imageUrl) {
    throw new Error("Backend response mein imageUrl nahi mila.");
  }

  return data.imageUrl;
}