
const API_BASE_URL = "http://localhost:8080/api";

export async function sellerApiRequest(path, options = {}) {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error("Login session nahi mila. Please logout karke dobara login karo.");
  }

  const headers = new Headers(options.headers || {});
  headers.set("Accept", "application/json");
  headers.set("Authorization", `Bearer ${token}`);

  // JSON body ke liye Content-Type set karo.
  // FormData upload ke liye ise manually set mat karna.
  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
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

  if (response.status === 401) {
    throw new Error(
      "401 Unauthorized: Login token invalid ya expired hai. Logout karke dobara login karo."
    );
  }

  if (response.status === 403) {
    throw new Error(
      "403 Forbidden: Is action ke liye seller approval ya required role nahi mila."
    );
  }

  if (!response.ok) {
    throw new Error(
      data?.message ||
        data?.error ||
        `Request failed (${response.status})`
    );
  }

  return data;
}
