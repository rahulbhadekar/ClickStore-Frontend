
import { useCallback, useEffect, useState } from "react";
import {
  adminApiRequest,
  uploadProductImage,
} from "../services/adminApi";

const initialForm = {
  sellerId: "",
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

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [activatingId, setActivatingId] = useState(null);

  const [form, setForm] = useState(initialForm);
  const [imagePreview, setImagePreview] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  const loadProducts = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setError("");

    try {
      const data = await adminApiRequest("/products/admin/all");
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Could not load products.");
    } finally {
      if (showLoader) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchProducts() {
      try {
        const data = await adminApiRequest("/products/admin/all");

        if (!cancelled) {
          setProducts(Array.isArray(data) ? data : []);
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Could not load products.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchProducts();

    return () => {
      cancelled = true;
    };
  }, []);

  function resetForm() {
    setForm(initialForm);
    setImagePreview("");
    setFormError("");
    setFormMessage("");
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
      setFormError("Sirf JPG, PNG ya WEBP image select karo.");
      input.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFormError("Image size 5 MB ya usse kam honi chahiye.");
      input.value = "";
      return;
    }

    setFormError("");
    setFormMessage("");
    setUploadingImage(true);

    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);

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

      setFormMessage("Image successfully Cloudinary par upload ho gayi.");
    } catch (err) {
      setImagePreview("");
      setFormError(err.message || "Image upload nahi ho payi.");

      setForm((current) => ({
        ...current,
        imageUrl: "",
      }));

      URL.revokeObjectURL(previewUrl);
    } finally {
      setUploadingImage(false);
      input.value = "";
    }
  }

  async function handleCreateProduct(event) {
    event.preventDefault();

    if (uploadingImage) {
      setFormError("Image upload complete hone ka wait karo.");
      return;
    }

    if (!form.imageUrl) {
      setFormError("Product create karne se pehle image upload karo.");
      return;
    }

    const payload = {
      sellerId: Number(form.sellerId),
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
      !Number.isInteger(payload.sellerId) ||
      payload.sellerId <= 0 ||
      !Number.isInteger(payload.categoryId) ||
      payload.categoryId <= 0 ||
      !payload.name ||
      !payload.slug ||
      !payload.sku ||
      !Number.isFinite(payload.price) ||
      payload.price <= 0 ||
      !Number.isInteger(payload.initialStock) ||
      payload.initialStock < 0
    ) {
      setFormError(
        "Required fields check karo. Price positive aur stock non-negative whole number hona chahiye."
      );
      return;
    }

    setSaving(true);
    setFormError("");
    setFormMessage("");

    try {
      await adminApiRequest("/products", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      resetForm();
      setShowAddForm(false);
      setFormMessage("Product create ho gaya. Initial status DRAFT hai.");

      await loadProducts(false);
    } catch (err) {
      setFormError(err.message || "Product create nahi ho paya.");
    } finally {
      setSaving(false);
    }
  }

  async function handleActivateProduct(product) {
    const confirmed = window.confirm(
      `Activate "${product.name}"? Ye product storefront par visible ho sakta hai.`
    );

    if (!confirmed) return;

    setActivatingId(product.id);
    setError("");
    setFormMessage("");

    try {
      await adminApiRequest(
        `/products/admin/${product.id}/activate`,
        { method: "PUT" }
      );

      setFormMessage(
        `Product "${product.name}" activated successfully.`
      );

      await loadProducts(false);
    } catch (err) {
      setError(err.message || "Product activation failed.");
    } finally {
      setActivatingId(null);
    }
  }

  return (
    <section className="admin-content-card">
      <div className="admin-applications-heading">
        <div>
          <span className="admin-eyebrow">ADMIN WORKSPACE</span>
          <h2>Product Management</h2>
          <p>Manage products, images, drafts and active listings.</p>
        </div>

        <div className="admin-application-actions">
          <button
            type="button"
            className="admin-action-button"
            onClick={() => loadProducts(true)}
            disabled={loading}
          >
            {loading ? "Loading..." : "Refresh"}
          </button>

          <button
            type="button"
            className="admin-approve-button"
            onClick={() => {
              if (showAddForm) resetForm();

              setShowAddForm((current) => !current);
              setFormError("");
              setFormMessage("");
            }}
          >
            {showAddForm ? "Cancel" : "+ Add Product"}
          </button>
        </div>
      </div>

      {formMessage && (
        <p className="admin-success-message" role="status">
          {formMessage}
        </p>
      )}

      {showAddForm && (
        <form
          className="admin-product-form"
          onSubmit={handleCreateProduct}
        >
          <h3>Create Product</h3>

          {formError && (
            <p className="admin-error-message" role="alert">
              {formError}
            </p>
          )}

          <div className="admin-product-form-grid">
            <label>
              Seller ID *
              <input
                name="sellerId"
                type="number"
                min="1"
                step="1"
                required
                value={form.sellerId}
                onChange={handleFormChange}
              />
            </label>

            <label>
              Category ID *
              <input
                name="categoryId"
                type="number"
                min="1"
                step="1"
                required
                value={form.categoryId}
                onChange={handleFormChange}
              />
            </label>

            <label>
              Product Name *
              <input
                name="name"
                required
                value={form.name}
                onChange={handleFormChange}
              />
            </label>

            <label>
              Slug *
              <input
                name="slug"
                required
                placeholder="wireless-headphones"
                value={form.slug}
                onChange={handleFormChange}
              />
            </label>

            <label>
              SKU *
              <input
                name="sku"
                required
                value={form.sku}
                onChange={handleFormChange}
              />
            </label>

            <label>
              Price (₹) *
              <input
                name="price"
                type="number"
                min="0.01"
                step="0.01"
                required
                value={form.price}
                onChange={handleFormChange}
              />
            </label>

            <label>
              Initial Stock *
              <input
                name="initialStock"
                type="number"
                min="0"
                step="1"
                required
                value={form.initialStock}
                onChange={handleFormChange}
              />
            </label>

            <label>
              Variant Name
              <input
                name="variantName"
                value={form.variantName}
                onChange={handleFormChange}
              />
            </label>

            <label className="admin-product-description">
              Description
              <textarea
                name="description"
                rows={3}
                value={form.description}
                onChange={handleFormChange}
              />
            </label>

            <label className="admin-product-description">
              Product Image *
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageChange}
                disabled={uploadingImage || saving}
              />

              <small>JPG, PNG ya WEBP · Maximum 5 MB</small>

              {imagePreview && (
                <img
                  src={imagePreview}
                  alt="Product preview"
                  style={{
                    display: "block",
                    width: "160px",
                    height: "160px",
                    objectFit: "contain",
                    marginTop: "12px",
                    borderRadius: "8px",
                  }}
                />
              )}

              {uploadingImage && (
                <small>Uploading image to Cloudinary...</small>
              )}

              {form.imageUrl && !uploadingImage && (
                <small>Image upload successful.</small>
              )}
            </label>
          </div>

          <button
            type="submit"
            className="admin-approve-button"
            disabled={saving || uploadingImage || !form.imageUrl}
          >
            {uploadingImage
              ? "Uploading Image..."
              : saving
                ? "Creating..."
                : "Create Product"}
          </button>
        </form>
      )}

      {error && (
        <p className="admin-error-message" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p>Loading products...</p>
      ) : products.length === 0 && !error ? (
        <div className="admin-empty-state">
          <h3>No products found</h3>
          <p>Products will appear here when available.</p>
        </div>
      ) : (
        <div className="admin-product-table-wrapper">
          <table className="admin-product-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Image</th>
                <th>Product</th>
                <th>Category ID</th>
                <th>Seller ID</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td>{product.id ?? "—"}</td>

                  <td>
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name || "Product"}
                        loading="lazy"
                        style={{
                          width: "60px",
                          height: "60px",
                          objectFit: "contain",
                          borderRadius: "8px",
                        }}
                      />
                    ) : (
                      "No image"
                    )}
                  </td>

                  <td>
                    <strong>{product.name || "Unnamed product"}</strong>
                    <br />
                    <small>{product.slug || ""}</small>
                  </td>

                  <td>{product.categoryId ?? "—"}</td>
                  <td>{product.sellerId ?? "—"}</td>

                  <td>
                    <span className="admin-product-status">
                      {product.status || "UNKNOWN"}
                    </span>
                  </td>

                  <td>
                    {product.status === "DRAFT" ? (
                      <button
                        type="button"
                        className="admin-approve-button"
                        disabled={activatingId === product.id}
                        onClick={() => handleActivateProduct(product)}
                      >
                        {activatingId === product.id
                          ? "Activating..."
                          : "Activate"}
                      </button>
                    ) : (
                      <span>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
