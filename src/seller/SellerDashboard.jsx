
import { useCallback, useEffect, useState } from "react";
import { sellerApiRequest } from "../services/sellerApi";
import { uploadProductImage } from "../services/adminApi";
import "./SellerDashboard.css";

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

export default function SellerDashboard() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadProducts = useCallback(async () => {
    try {
      const data = await sellerApiRequest(
        "/seller/products/my-products"
      );
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  
useEffect(() => {
  let cancelled = false;

  async function loadDashboard() {
    try {
      const data = await sellerApiRequest(
        "/seller/products/my-products"
      );

      if (!cancelled) {
        setProducts(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      if (!cancelled) {
        setError(err.message);
      }
    } finally {
      if (!cancelled) {
        setLoading(false);
      }
    }

    try {
      const data = await sellerApiRequest("/categories");

      if (!cancelled) {
        setCategories(Array.isArray(data) ? data : []);
      }
    } catch {
      if (!cancelled) {
        setCategories([]);
      }
    }
  }

  loadDashboard();

  return () => {
    cancelled = true;
  };
}, []);


  function handleChange(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));

    if (name === "name") {
      setForm((previous) => ({
        ...previous,
        name: value,
        slug: value
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, ""),
      }));
    }
  }

  async function handleImageUpload() {
    if (!imageFile) {
      setError("Please select a product image first.");
      return;
    }

    try {
      setUploading(true);
      setError("");
      setMessage("");

      const imageUrl = await uploadProductImage(imageFile);
      setForm((previous) => ({ ...previous, imageUrl }));
      setMessage("Image uploaded successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!form.imageUrl) {
      setError("Please upload the product image first.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        ...form,
        categoryId: Number(form.categoryId),
        price: Number(form.price),
        initialStock: Number(form.initialStock),
        imageUrl: form.imageUrl,
      };

      await sellerApiRequest("/seller/products", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setForm(initialForm);
      setImageFile(null);
      setMessage(
        "Product added successfully. It may need admin activation before appearing in the store."
      );

      await loadProducts();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="seller-dashboard">
      <header className="seller-dashboard-header">
        <div>
          <p>SELLER CENTER</p>
          <h1>Seller Dashboard</h1>
          <span>Manage your products and store inventory.</span>
        </div>

        <button
          type="button"
          onClick={() => {
            window.location.hash = "#/";
          }}
        >
          Back to Store
        </button>
      </header>

      {error && <div role="alert" className="seller-error">{error}</div>}
      {message && <div role="status" className="seller-success">{message}</div>}

      <section className="seller-panel">
        <h2>Add New Product</h2>

        <form onSubmit={handleSubmit} className="seller-product-form">
          <label>
            Product Name
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            Category ID
            <select
              name="categoryId"
              value={form.categoryId}
              onChange={handleChange}
              required
            >
              <option value="">Select category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Slug
            <input
              name="slug"
              value={form.slug}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            SKU
            <input
              name="sku"
              value={form.sku}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            Price (INR)
            <input
              name="price"
              type="number"
              min="0.01"
              step="0.01"
              value={form.price}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            Initial Stock
            <input
              name="initialStock"
              type="number"
              min="0"
              value={form.initialStock}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            Variant Name
            <input
              name="variantName"
              value={form.variantName}
              onChange={handleChange}
            />
          </label>

          <label>
            Description
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={4}
            />
          </label>

          <label>
            Product Image
            <input
              type="file"
              accept="image/*"
              onChange={(event) => {
                setImageFile(event.target.files?.[0] || null);
                setForm((previous) => ({
                  ...previous,
                  imageUrl: "",
                }));
                setMessage("");
              }}
              required={!form.imageUrl}
            />
          </label>

          <button
            type="button"
            onClick={handleImageUpload}
            disabled={!imageFile || uploading}
          >
            {uploading ? "Uploading..." : "Upload Image"}
          </button>

          {form.imageUrl && (
            <div className="seller-image-preview">
              <img
                src={form.imageUrl}
                alt="Product preview"
                width="140"
              />
              <p>Image uploaded</p>
            </div>
          )}

          <button type="submit" disabled={saving || uploading}>
            {saving ? "Saving Product..." : "Add Product"}
          </button>
        </form>
      </section>

      <section className="seller-panel">
        <h2>My Products</h2>

        {loading ? (
          <p>Loading products...</p>
        ) : products.length === 0 ? (
          <p>You have not added any products yet.</p>
        ) : (
          <div className="seller-products-list">
            {products.map((product) => (
              <article
                key={product.id}
                className="seller-product-item"
              >
                {product.imageUrl && (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    width="90"
                  />
                )}

                <div>
                  <h3>{product.name}</h3>
                  <p>Price: ₹{product.price}</p>
                  <p>Status: {product.status}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
