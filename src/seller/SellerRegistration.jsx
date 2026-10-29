
import { useEffect, useState } from "react";
import "./SellerRegistration.css";
import { uploadProductImage } from "../services/adminApi";

const API_BASE = "http://localhost:8080/api";

const initialForm = {
  categoryId: "",
  name: "",
  slug: "",
  sku: "",
  price: "",
  initialStock: "0",
  variantName: "Default",
  description: "",
  imageUrl: "",
};

export default function SellerRegistration() {
  const [storeName, setStoreName] = useState("");
  const [application, setApplication] = useState(null);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [imagePreview, setImagePreview] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [message, setMessage] = useState("");

  async function apiRequest(path, options = {}) {
    const token = localStorage.getItem("token");

    if (!token) {
      throw new Error("Please login to continue.");
    }

    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        Accept: "application/json",
        ...(options.body
          ? { "Content-Type": "application/json" }
          : {}),
        Authorization: `Bearer ${token}`,
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
      if (response.status === 404 && path === "/seller/application") {
        return null;
      }

      throw new Error(
        data?.message ||
          data?.detail ||
          data?.error ||
          `Request failed (${response.status})`
      );
    }

    return data;
  }

  async function loadMyProducts() {
    setLoadingProducts(true);

    try {
      const data = await apiRequest("/seller/products/my-products");
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      setFormError(err.message || "Could not load your products.");
    } finally {
      setLoadingProducts(false);
    }
  }

  async function loadSellerData() {
    try {
      const [categoryData, productData] = await Promise.all([
        apiRequest("/categories"),
        apiRequest("/seller/products/my-products"),
      ]);

      setCategories(
        Array.isArray(categoryData) ? categoryData : []
      );

      setProducts(
        Array.isArray(productData) ? productData : []
      );
    } catch (err) {
      setFormError(
        err.message || "Seller information could not be loaded."
      );
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadApplication() {
      try {
        const data = await apiRequest("/seller/application");

        if (cancelled) return;

        setApplication(data);

        if (data?.status === "APPROVED") {
          const [categoryResult, productResult] = await Promise.all([
            apiRequest("/categories"),
            apiRequest("/seller/products/my-products"),
          ]);

          if (!cancelled) {
            setCategories(
              Array.isArray(categoryResult) ? categoryResult : []
            );

            setProducts(
              Array.isArray(productResult) ? productResult : []
            );
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Could not load seller information.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadApplication();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!storeName.trim()) {
      setError("Please enter your store name.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const data = await apiRequest("/seller/apply", {
        method: "POST",
        body: JSON.stringify({
          storeName: storeName.trim(),
        }),
      });

      setApplication(data);
    } catch (err) {
      setError(err.message || "Application could not be submitted.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleFormChange(event) {
    const { name, value } = event.target;

    if (name === "name") {
      const slug = value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      setForm((current) => ({
        ...current,
        name: value,
        slug,
      }));

      return;
    }

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleImageChange(event) {
    const input = event.target;
    const file = input.files?.[0];

    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setFormError("Please select a JPG, PNG or WEBP image.");
      input.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFormError("Image size must be 5 MB or less.");
      input.value = "";
      return;
    }

    const previewUrl = URL.createObjectURL(file);

    setImagePreview(previewUrl);
    setFormError("");
    setMessage("");
    setUploadingImage(true);

    setForm((current) => ({
      ...current,
      imageUrl: "",
    }));

    try {
      const imageUrl = await uploadProductImage(file);

      setForm((current) => ({
        ...current,
        imageUrl,
      }));

      setMessage("Product image uploaded successfully.");
    } catch (err) {
      URL.revokeObjectURL(previewUrl);
      setImagePreview("");

      setFormError(
        err.message || "Product image upload failed."
      );
    } finally {
      setUploadingImage(false);
      input.value = "";
    }
  }

  function resetForm() {
    setForm(initialForm);
    setImagePreview("");
    setFormError("");
  }

  async function handleCreateProduct(event) {
    event.preventDefault();

    setFormError("");
    setMessage("");

    if (uploadingImage) {
      setFormError("Please wait for the image upload to finish.");
      return;
    }

    const payload = {
      categoryId: Number(form.categoryId),
      name: form.name.trim(),
      slug: form.slug.trim(),
      sku: form.sku.trim(),
      price: Number(form.price),
      initialStock: Number(form.initialStock),
      variantName: form.variantName.trim() || "Default",
      description: form.description.trim(),
      imageUrl: form.imageUrl,
    };

    if (
      !Number.isInteger(payload.categoryId) ||
      payload.categoryId <= 0 ||
      !payload.name ||
      !payload.slug ||
      !payload.sku ||
      !Number.isFinite(payload.price) ||
      payload.price <= 0 ||
      !Number.isInteger(payload.initialStock) ||
      payload.initialStock < 0 ||
      !payload.imageUrl
    ) {
      setFormError(
        "Please complete all required fields. Price must be positive, stock cannot be negative, and an image is required."
      );
      return;
    }

    try {
      setSaving(true);

      await apiRequest("/seller/products", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setMessage(
        "Product submitted successfully. Its status depends on your store's product approval workflow."
      );

      resetForm();
      await loadMyProducts();
    } catch (err) {
      setFormError(err.message || "Product could not be created.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p>Loading seller information...</p>;
  }

  return (
    <div className="seller-registration">
      <p className="account-eyebrow">SELL ON CLICKSTORE</p>
      <h1>Become a Seller</h1>

      <p className="account-description">
        Manage your store and products from your existing account.
      </p>

      {error && (
        <p className="profile-error" role="alert">
          {error}
        </p>
      )}

      {!application ? (
        <section className="account-info-card">
          <h2>Create your store</h2>

          <form
            onSubmit={handleSubmit}
            className="profile-edit-form"
          >
            <label htmlFor="seller-store-name">Store Name</label>

            <input
              id="seller-store-name"
              type="text"
              placeholder="e.g. Rahul Electronics"
              value={storeName}
              onChange={(event) => setStoreName(event.target.value)}
              maxLength={150}
              required
            />

            <button
              type="submit"
              className="profile-save-button"
              disabled={submitting}
            >
              {submitting
                ? "Submitting..."
                : "Apply to Become a Seller"}
            </button>
          </form>
        </section>
      ) : (
        <>
          <section className="account-info-card">
            <h2>{application.storeName || "My Store"}</h2>

            <p>
              Application status:{" "}
              <strong>{application.status}</strong>
            </p>

            {application.status === "PENDING" && (
              <p>
                Your application is under review. You can add products
                after the admin approves your seller application.
              </p>
            )}

            {application.status === "REJECTED" && (
              <p>
                Your application was rejected.
                {application.rejectionReason
                  ? ` Reason: ${application.rejectionReason}`
                  : ""}
              </p>
            )}
          </section>

          {application.status === "APPROVED" && (
            <>
              <section className="account-info-card">
                <h2>Add New Product</h2>

                {formError && (
                  <p className="profile-error" role="alert">
                    {formError}
                  </p>
                )}

                {message && (
                  <p role="status">{message}</p>
                )}

                <form
                  className="profile-edit-form"
                  onSubmit={handleCreateProduct}
                >
                  <label htmlFor="seller-product-name">
                    Product Name
                  </label>
                  <input
                    id="seller-product-name"
                    name="name"
                    value={form.name}
                    onChange={handleFormChange}
                    placeholder="Enter product name"
                    maxLength={180}
                    required
                  />

                  <label htmlFor="seller-product-category">
                    Category
                  </label>
                  <select
                    id="seller-product-category"
                    name="categoryId"
                    value={form.categoryId}
                    onChange={handleFormChange}
                    required
                  >
                    <option value="">Select a category</option>
                    {categories
                      .filter((category) => category.active !== false)
                      .map((category) => (
                        <option
                          key={category.id}
                          value={category.id}
                        >
                          {category.name}
                        </option>
                      ))}
                  </select>

                  <label htmlFor="seller-product-sku">SKU</label>
                  <input
                    id="seller-product-sku"
                    name="sku"
                    value={form.sku}
                    onChange={handleFormChange}
                    placeholder="e.g. RAH-ELEC-001"
                    required
                  />

                  <label htmlFor="seller-product-price">
                    Price (₹)
                  </label>
                  <input
                    id="seller-product-price"
                    name="price"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.price}
                    onChange={handleFormChange}
                    placeholder="Enter price"
                    required
                  />

                  <label htmlFor="seller-product-stock">
                    Initial Stock
                  </label>
                  <input
                    id="seller-product-stock"
                    name="initialStock"
                    type="number"
                    min="0"
                    step="1"
                    value={form.initialStock}
                    onChange={handleFormChange}
                    required
                  />

                  <label htmlFor="seller-product-variant">
                    Variant Name
                  </label>
                  <input
                    id="seller-product-variant"
                    name="variantName"
                    value={form.variantName}
                    onChange={handleFormChange}
                    placeholder="Default"
                  />

                  <label htmlFor="seller-product-description">
                    Description
                  </label>
                  <textarea
                    id="seller-product-description"
                    name="description"
                    value={form.description}
                    onChange={handleFormChange}
                    placeholder="Describe your product"
                    rows={4}
                  />

                  <label htmlFor="seller-product-image">
                    Product Image (JPG, PNG or WEBP; max 5 MB)
                  </label>
                  <input
                    id="seller-product-image"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageChange}
                  />

                  {imagePreview && (
                    <img
                      src={imagePreview}
                      alt="Product preview"
                      style={{
                        display: "block",
                        width: "160px",
                        maxHeight: "160px",
                        objectFit: "contain",
                        marginTop: "12px",
                      }}
                    />
                  )}

                  {uploadingImage && (
                    <p>Uploading image...</p>
                  )}

                  <button
                    type="submit"
                    className="profile-save-button"
                    disabled={saving || uploadingImage}
                  >
                    {saving ? "Saving Product..." : "Add Product"}
                  </button>
                </form>
              </section>

              <section className="account-info-card">
                <h2>My Products</h2>

                <button
                  type="button"
                  className="profile-save-button"
                  onClick={loadSellerData}
                  disabled={loadingProducts}
                >
                  Refresh Products
                </button>

                {loadingProducts ? (
                  <p>Loading your products...</p>
                ) : products.length === 0 ? (
                  <p>You have not added any products yet.</p>
                ) : (
                  <div>
                    {products.map((product) => (
                      <article
                        key={product.id}
                        style={{
                          display: "flex",
                          gap: "16px",
                          alignItems: "center",
                          padding: "14px 0",
                          borderBottom: "1px solid #dddddd",
                        }}
                      >
                        {product.imageUrl && (
                          <img
                            src={product.imageUrl}
                            alt={product.name || "Product"}
                            style={{
                              width: "72px",
                              height: "72px",
                              objectFit: "contain",
                            }}
                          />
                        )}

                        <div>
                          <h3>{product.name || "Unnamed product"}</h3>
                          <p>
                            Price: ₹{product.price ?? "N/A"}
                          </p>
                          <p>
                            Status: {product.status || "Pending"}
                          </p>
                          <p>
                            Stock: {product.stockQuantity ??
                              product.stock ??
                              product.initialStock ??
                              "N/A"}
                          </p>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}
