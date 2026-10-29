import { useEffect, useMemo, useState } from "react";

import "./App.css";

import "./AuthModal.css";

import ProfilePage from "./ProfilePage";

import Cart from "./Cart/Cart";

import Checkout from "./checkout/Checkout";

import AdminDashboard from "./admin/AdminDashboard";

const API_URL = "http://localhost:8080/api/products";

const API_BASE_URL = "http://localhost:8080/api";

// Storefront categories are shown even when the backend currently has only
// generic category names such as "Category 1". Real backend category names
// are added after these common shopping categories.
const STORE_CATEGORIES = [
  "Mobiles & Tablets",
  "Laptops & Computers",
  "Audio & Headphones",
  "Smart Watches",
  "Home & Kitchen",
  "Fashion",
  "Beauty & Personal Care",
  "Sports & Fitness",
  "Toys & Baby Products",
  "Books & Stationery",
  "Automotive",
  "Bags & Accessories",
];

const STORE_CATEGORY_KEYWORDS = {
  "Mobiles & Tablets": ["mobile", "phone", "smartphone", "iphone", "tablet", "ipad", "galaxy", "android", "oneplus", "pixel"],
  "Laptops & Computers": ["laptop", "notebook", "computer", "desktop", "macbook", "monitor", "keyboard", "mouse", "printer", "pc"],
  "Audio & Headphones": ["headphone", "earbud", "earphone", "speaker", "audio", "soundbar", "airpods", "bluetooth headset", "headset"],
  "Smart Watches": ["smartwatch", "smart watch", "watch", "fitness band", "band tracker"],
  "Home & Kitchen": ["home", "kitchen", "cookware", "mixer", "grinder", "blender", "vacuum", "furniture", "lamp", "bedding", "decor", "appliance", "air fryer"],
  Fashion: ["fashion", "shirt", "t-shirt", "jeans", "dress", "hoodie", "jacket", "kurta", "saree", "clothing", "apparel", "shirt"],
  "Beauty & Personal Care": ["beauty", "skin care", "skincare", "makeup", "cosmetic", "shampoo", "perfume", "fragrance", "trimmer", "grooming", "cream", "lipstick"],
  "Sports & Fitness": ["sport", "fitness", "gym", "yoga", "football", "cricket", "running", "dumbbell", "cycle", "exercise", "sportswear"],
  "Toys & Baby Products": ["toy", "baby", "kids", "kid's", "doll", "lego", "puzzle", "stroller", "diaper", "rattle"],
  "Books & Stationery": ["book", "notebook", "pen", "pencil", "stationery", "novel", "journal", "paper", "school"],
  Automotive: ["auto", "car", "bike", "motorcycle", "helmet", "dashcam", "vehicle", "tyre", "tire", "car charger"],
  "Bags & Accessories": ["bag", "backpack", "wallet", "belt", "sunglasses", "suitcase", "luggage", "handbag", "accessory", "purse"],
};

function productMatchesCategory(product, category) {
  if (!category || category === "All categories") return true;

  const target = String(category).trim().toLowerCase();
  const directCategory = String(product.category || "").trim().toLowerCase();
  if (directCategory === target) return true;

  const keywords = STORE_CATEGORY_KEYWORDS[category];
  if (!keywords) return false;

  // Include likely catalog metadata but exclude placeholder backend names
  // such as "Category 1" from deciding the retail category.
  const metadata = [
    product.name,
    product.description,
    product.brand?.name || product.brand,
    product.subcategory,
    product.subCategory,
    ...(Array.isArray(product.tags) ? product.tags : []),
  ].filter(Boolean).join(" ").toLowerCase();

  return keywords.some((keyword) => metadata.includes(keyword));
}

async function apiRequest(path, options = {}) {

  const token = localStorage.getItem("token");

  const response = await fetch(`${API_BASE_URL}${path}`, {

    ...options,

    headers: {

      Accept: "application/json",

      ...(options.body ? { "Content-Type": "application/json" } : {}),

      ...(token ? { Authorization: `Bearer ${token}` } : {}),

      ...options.headers,

    },

  });

  const raw = await response.text();

  let data = {};

  if (raw) {

    try {

      data = JSON.parse(raw);

    } catch {

      data = { message: raw };

    }

  }

  if (!response.ok) {

    throw new Error(

      data.message || data.error || `Request failed (${response.status})`

    );

  }

  return data;

}

const money = (value) => {

  if (value === null || value === undefined || value === "") {

    return "Price unavailable";

  }

  const number = Number(value);

  if (!Number.isFinite(number)) return "Price unavailable";

  return number.toLocaleString("en-IN", {

    style: "currency",

    currency: "INR",

    maximumFractionDigits: 2,

  });

};

function getProductVariant(product) {

  if (Array.isArray(product.variants) && product.variants.length > 0) {

    return product.variants[0];

  }

  if (product.variant && product.variant.id) {

    return product.variant;

  }

  return null;

}

function getProductPrice(product) {

  const variant = getProductVariant(product);

  const possiblePrices = [

    variant?.price,

    product.price,

    product.sellingPrice,

    product.salePrice,

    product.finalPrice,

  ];

  for (const value of possiblePrices) {

    if (value !== null && value !== undefined && value !== "") {

      const number = Number(value);

      if (Number.isFinite(number)) {

        return number;

      }

    }

  }

  return null;

}

function getProductImage(product) {

  const possibleImages = [

    product.imageUrl,

    product.image,

    product.thumbnail,

    product.primaryImage,

    product.images?.[0]?.url,

    product.images?.[0]?.imageUrl,

    product.images?.[0],

  ];

  return (

    possibleImages.find(

      (value) =>

        typeof value === "string" && value.trim() !== ""

    ) || ""

  );

}

function normalizeProduct(product) {

  const variant = getProductVariant(product);

  return {

    ...product,

    id: product.id,

    name: product.name || "Unnamed product",

    description:

      product.description || "Product details coming soon.",

    category:

      product.category?.name ||

      product.categoryName ||

      (product.categoryId

        ? `Category ${product.categoryId}`

        : "General"),

    price: getProductPrice(product),

    image: getProductImage(product),

    variantId: variant?.id ?? product.variantId ?? product.defaultVariantId ?? null,

    slug: product.slug || "",

    status: product.status || "UNKNOWN",

  };

}

function attachVariantToProduct(product, variants) {

  const variant = variants.find(

    (item) =>

      Number(item.productId) === Number(product.id) &&

      item.active === true

  );

  return {

    ...product,

    variantId: variant?.id ?? null,

    price: variant?.price ?? product.price ?? null,

    variantName: variant?.variantName ?? "",

    sku: variant?.sku ?? "",

  };

}


function getOriginalPrice(product) {
  const variant = getProductVariant(product);
  const values = [
    variant?.originalPrice,
    variant?.mrp,
    variant?.listPrice,
    variant?.compareAtPrice,
    product.originalPrice,
    product.mrp,
    product.listPrice,
    product.compareAtPrice,
    product.mrpPrice,
  ];
  for (const value of values) {
    if (value !== null && value !== undefined && value !== "") {
      const amount = Number(value);
      if (Number.isFinite(amount) && amount > 0) return amount;
    }
  }
  return null;
}

function getProductRating(product) {
  const raw = product.rating ?? product.averageRating ?? product.avgRating ?? product.reviewRating;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function categoryIcon(category) {
  const value = String(category || "").toLowerCase();
  if (value.includes("mobile") || value.includes("phone")) return "▣";
  if (value.includes("laptop") || value.includes("computer")) return "▤";
  if (value.includes("audio") || value.includes("headphone")) return "♫";
  if (value.includes("watch")) return "◷";
  if (value.includes("home") || value.includes("kitchen")) return "⌂";
  if (value.includes("fashion") || value.includes("cloth")) return "♧";
  if (value.includes("beauty")) return "✿";
  if (value.includes("sport")) return "⚽";
  if (value.includes("toy") || value.includes("baby")) return "♧";
  if (value.includes("book") || value.includes("stationery")) return "▤";
  if (value.includes("auto")) return "▱";
  return "◇";
}

function ProductImage({ product, large = false }) {

  const [imageFailed, setImageFailed] = useState(false);

  if (!product.image || imageFailed) {

    return (

      <div

        className={`image-placeholder ${

          large ? "image-placeholder-large" : ""

        }`}

      >

        <span aria-hidden="true">▧</span>

        <span>Image coming soon</span>

      </div>

    );

  }

  return (

    <img

      src={product.image}

      alt={product.name}

      loading="lazy"

      onError={() => setImageFailed(true)}

    />

  );

}

function ProductCard({ product, onOpen, onAddWishlist, isWishlisted, onAddToCart }) {
  const originalPrice = getOriginalPrice(product);
  const discount = originalPrice && product.price && originalPrice > product.price
    ? Math.round((1 - product.price / originalPrice) * 100)
    : null;
  const rating = getProductRating(product);
  const brand = product.brand?.name || product.brand || "ClickStore pick";

  return (
    <article className="cs-product-card">
      <div className="cs-card-image-wrap">
        <button className="cs-card-image" type="button" onClick={() => onOpen(product)} aria-label={`View ${product.name}`}>
          <ProductImage product={product} />
        </button>
        {discount ? <span className="cs-discount-badge">{discount}% OFF</span> : null}
        {product.status && product.status !== "ACTIVE" ? <span className="cs-status-badge">{product.status}</span> : null}
        <button
          className={`cs-heart-button ${isWishlisted ? "is-wishlisted" : ""}`}
          type="button"
          aria-label={isWishlisted ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
          onClick={() => onAddWishlist(product)}
        >{isWishlisted ? "♥" : "♡"}</button>
      </div>
      <div className="cs-card-info">
        <span className="cs-product-category">{product.category}</span>
        <h3><button type="button" onClick={() => onOpen(product)}>{product.name}</button></h3>
        <div className="cs-product-meta">
          {rating ? <><span className="cs-stars" aria-label={`${rating} out of 5 stars`}>★★★★★</span><span>{rating.toFixed(1)}</span></> : <span className="cs-brand-label">{brand}</span>}
          {Number(product.reviewCount ?? product.reviewsCount) > 0 ? <span className="cs-review-count">({Number(product.reviewCount ?? product.reviewsCount).toLocaleString("en-IN")})</span> : null}
        </div>
        <div className="cs-price-row">
          <strong>{money(product.price)}</strong>
          {discount ? <del>{money(originalPrice)}</del> : null}
        </div>
        <button className="cs-add-cart-button" type="button" onClick={() => onAddToCart(product)}>
          <span aria-hidden="true">🛒</span> Add to Cart
        </button>
      </div>
    </article>
  );
}

function Header({
  search,
  setSearch,
  selectedCategory,
  wishlistCount,
  onHome,
  onWishlist,
  onAccount,
  onBag,
}) {
  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <>
      <div className="cs-top-strip">
        <div className="cs-top-inner">
          <span>♧ <b>Free shipping</b> on eligible orders</span>
          <span>◇ Best deals every day</span>
          <span>♢ Secure shopping experience</span>
          <div className="cs-top-links"><button type="button" onClick={() => scrollTo("customer-support")}>Help &amp; Support</button><i /> <button type="button" onClick={() => scrollTo("products")}>Track Order</button><i /> <button type="button" onClick={onAccount}>Sell on ClickStore</button></div>
        </div>
      </div>

      <header className="cs-header">
        <button className="cs-logo" type="button" onClick={onHome} aria-label="ClickStore home">
          <span className="cs-logo-icon">▣</span>
          <span className="cs-logo-copy"><strong>Click<span>Store</span></strong><small>Shop More. Live Better.</small></span>
        </button>

        <form className="cs-search" onSubmit={(event) => { event.preventDefault(); scrollTo("products"); }}>
          <span aria-hidden="true" className="cs-search-icon">⌕</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search for products, brands and more..." aria-label="Search products" />
          {search && <button type="button" className="cs-clear-search" onClick={() => setSearch("")} aria-label="Clear search">×</button>}
          <button className="cs-search-submit" type="submit">Search</button>
        </form>

        <div className="cs-header-actions">
          <button type="button" onClick={onWishlist} aria-label="Open wishlist"><span className="cs-action-icon">♡</span><small>Wishlist{wishlistCount ? ` (${wishlistCount})` : ""}</small></button>
          <button type="button" onClick={onBag} aria-label="Open cart"><span className="cs-action-icon cs-cart-icon">🛒</span><small>Cart</small></button>
          <button type="button" onClick={onAccount} aria-label="Open account"><span className="cs-action-icon">♙</span><small>Account⌄</small></button>
        </div>
      </header>

      <nav className="cs-nav" aria-label="Store navigation">
        <div className="cs-nav-inner">
          <button className={selectedCategory === "All categories" ? "active" : ""} type="button" onClick={onHome}>Home</button>
          <button type="button" onClick={() => scrollTo("categories")}>Categories</button>
          <button type="button" onClick={() => scrollTo("featured")}>Deals</button>
          <button type="button" onClick={() => scrollTo("featured")}>New Arrivals</button>
          <button type="button" onClick={() => scrollTo("featured")}>Top Selling</button>
          <button type="button" onClick={() => scrollTo("products")}>Brands</button>
          <button className="cs-todays-deals" type="button" onClick={() => scrollTo("featured")}>🔥 Today’s Deals</button>
        </div>
      </nav>
    </>
  );
}

function CategorySidebar({ categories, selectedCategory, onSelect }) {
  // Keep 12 recognizable shopping categories visible in the sidebar.
  const shownCategories = categories.slice(0, 12);
  const scrollToAllCategories = () =>
    document.getElementById("categories")?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <aside className="cs-sidebar" aria-label="Product categories">
      <button className="cs-sidebar-title" type="button" onClick={() => onSelect("All categories")}>
        <span>☰</span> All Categories <span className="cs-sidebar-count">12</span>
      </button>
      <div className="cs-sidebar-list">
        {shownCategories.map((category) => (
          <button
            key={category}
            type="button"
            className={`cs-sidebar-item ${selectedCategory === category ? "active" : ""}`}
            onClick={() => onSelect(category)}
            aria-pressed={selectedCategory === category}
            title={`Browse ${category}`}
          >
            <span className="cs-category-icon" aria-hidden="true">{categoryIcon(category)}</span>
            <span className="cs-category-name">{category}</span>
            <span className="cs-category-chevron" aria-hidden="true">›</span>
          </button>
        ))}
        <button type="button" className="cs-sidebar-item cs-more-categories" onClick={scrollToAllCategories}>
          <span className="cs-category-icon" aria-hidden="true">▦</span>
          <span className="cs-category-name">More Categories</span>
          <span className="cs-category-chevron" aria-hidden="true">›</span>
        </button>
      </div>
    </aside>
  );
}



function HeroBanner({ onShop }) {
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);

  const slides = [
    {
      tag: "UPGRADE YOUR EVERYDAY",
      title: "Big Finds.",
      accent: "Better Living.",
      description: "Discover your next favourite from our latest collections.",
      products: [
        {
          name: "Premium Laptop",
          image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=600&q=85"
        },
        {
          name: "Wireless Headphones",
          image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=85"
        },
        {
          name: "Smartphone",
          image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=600&q=85"
        }
      ]
    },
    {
      tag: "TECH THAT MOVES WITH YOU",
      title: "Meet Your",
      accent: "Next Favourite.",
      description: "Fresh tech, smart essentials and more to explore.",
      products: [
        {
          name: "Smart Watch",
          image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=85"
        },
        {
          name: "Camera",
          image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=600&q=85"
        },
        {
          name: "Headphones",
          image: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=600&q=85"
        }
      ]
    },
    {
      tag: "FIND YOUR OWN STYLE",
      title: "Style That",
      accent: "Feels Like You.",
      description: "Explore everyday fashion, sneakers and standout picks.",
      products: [
        {
          name: "Classic Sneakers",
          image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=85"
        },
        {
          name: "Everyday Bag",
          image: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=600&q=85"
        },
        {
          name: "Wrist Watch",
          image: "https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=600&q=85"
        }
      ]
    },
    {
      tag: "GOOD FINDS START HERE",
      title: "More Choice.",
      accent: "More to Love.",
      description: "Your everyday shopping destination, all in one place.",
      products: [
        {
          name: "Home Essentials",
          image: "https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=600&q=85"
        },
        {
          name: "Modern Sneakers",
          image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=85"
        },
        {
          name: "Camera Gear",
          image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=600&q=85"
        }
      ]
    }
  ];

  useEffect(() => {
    if (paused) return undefined;

    const timer = window.setInterval(() => {
      setSlide((current) => (current + 1) % slides.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [paused]);

  const current = slides[slide];

  const goTo = (index) => {
    setSlide((index + slides.length) % slides.length);
  };

  return (
    <section
      className="cs-hero-premium"
      aria-label="Featured ClickStore collections"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setPaused(false);
        }
      }}
    >
      <div className="cs-premium-copy" key={`copy-${slide}`}>
        <span className="cs-premium-tag">
          <span className="cs-premium-tag-dot" />
          {current.tag}
        </span>

        <h1>
          {current.title}
          <br />
          <span>{current.accent}</span>
        </h1>

        <p>{current.description}</p>

        <button
          type="button"
          className="cs-premium-cta"
          onClick={onShop}
        >
          Explore Collection <span>→</span>
        </button>

        <div className="cs-premium-note">
          <span>✦</span> Discover something new every day
        </div>
      </div>

      <div className="cs-premium-gallery" key={`gallery-${slide}`}>
        <div className="cs-premium-orbit cs-premium-orbit-one" />
        <div className="cs-premium-orbit cs-premium-orbit-two" />

        {current.products.map((product, index) => (
          <article
            className={`cs-premium-card cs-premium-card-${index + 1}`}
            key={product.name}
            style={{ "--card-index": index }}
          >
            <div className="cs-premium-photo">
              <img
                src={product.image}
                alt={product.name}
                loading="lazy"
                onError={(event) => {
                  event.currentTarget.style.opacity = "0";
                }}
              />
            </div>
            <div className="cs-premium-card-caption">
              <span>DISCOVER</span>
              <strong>{product.name}</strong>
            </div>
          </article>
        ))}

        <div className="cs-premium-sticker">
          <span>YOUR NEXT</span>
          <strong>Great Find ✦</strong>
        </div>
      </div>

      <button
        type="button"
        className="cs-premium-arrow cs-premium-prev"
        onClick={() => goTo(slide - 1)}
        aria-label="Previous banner"
      >
        ‹
      </button>

      <button
        type="button"
        className="cs-premium-arrow cs-premium-next"
        onClick={() => goTo(slide + 1)}
        aria-label="Next banner"
      >
        ›
      </button>

      <div className="cs-premium-pagination">
        <span className="cs-premium-count">
          0{slide + 1} <span>/ 0{slides.length}</span>
        </span>

        <div className="cs-premium-dots">
          {slides.map((item, index) => (
            <button
              key={item.tag}
              type="button"
              className={index === slide ? "active" : ""}
              onClick={() => goTo(index)}
              aria-label={`Show banner ${index + 1}`}
              aria-current={index === slide ? "true" : undefined}
            />
          ))}
        </div>
      </div>
    </section>
  );
}


function ShoppingBenefits() {
  const items = [
    ["♧", "Free Shipping", "On eligible orders"],
    ["◇", "Secure Payments", "Checkout with confidence"],
    ["♧", "Customer Support", "Here when you need help"],
    ["↻", "Returns Info", "Policy shown at checkout"],
    ["◇", "Best Offers", "Explore current prices"],
  ];
  return <section className="cs-benefits" aria-label="Shopping benefits">{items.map(([icon, title, detail]) => <div className="cs-benefit-item" key={title}><span className="cs-benefit-icon" aria-hidden="true">{icon}</span><span><b>{title}</b><small>{detail}</small></span></div>)}</section>;
}

function AuthModal({ onClose, onLoginSuccess }) {

  const [mode, setMode] = useState("login");

  const [name, setName] = useState("");

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const [message, setMessage] = useState("");

  useEffect(() => {

    function handleEscape(event) {

      if (event.key === "Escape") onClose();

    }

    window.addEventListener("keydown", handleEscape);

    return () => window.removeEventListener("keydown", handleEscape);

  }, [onClose]);

  async function handleSubmit(event) {

    event.preventDefault();

    setMessage("");

    setLoading(true);

    const isRegister = mode === "register";

    const endpoint = isRegister

      ? "http://localhost:8080/api/auth/register"

      : "http://localhost:8080/api/auth/login";

const payload = isRegister

  ? { fullName: name.trim(), email: email.trim(), password }

  : { email: email.trim(), password };

    try {

      const response = await fetch(endpoint, {

        method: "POST",

        headers: {

          "Content-Type": "application/json",

          Accept: "application/json",

        },

        body: JSON.stringify(payload),

      });

      const raw = await response.text();

      let data = {};

      if (raw) {

        try {

          data = JSON.parse(raw);

        } catch {

          data = { message: raw };

        }

      }

      if (!response.ok) {

        throw new Error(

          data.message ||

          data.error ||

          (response.status === 401

            ? "Wrong Email or password."

            : `Request failed (${response.status}).`)

        );

      }

      if (isRegister) {

        setMessage(data.message || "Registration successful! Ab login karo.");

        setMode("login");

        setPassword("");

        return;

      }

      const token =

        data.token ||

        data.accessToken ||

        data.access_token ||

        data.jwt ||

        data.jwtToken;

      if (token) {

        try {

          localStorage.setItem("token", token);

        } catch {

          // The session can still be acknowledged if storage is unavailable.*

        }

      }

const userData = data.user || {

  id: data.userId,

  fullName: data.fullName,

  email: data.email,

  roles: data.roles || [],

};

const user = {

  ...userData,

  roles: Array.isArray(userData.roles)

    ? userData.roles

    : Array.isArray(data.roles)

      ? data.roles

      : [],

};

try {

  if (token) {

    localStorage.setItem("token", token);

  }

  localStorage.setItem("clickstore-user", JSON.stringify(user));

} catch (error) {

  console.error("Could not save login session:", error);

}

onLoginSuccess({

  token: token || localStorage.getItem("token") || "",

  user,

});

onClose();

} catch (error) {

  console.error("ClickStore authentication error:", error);

  setMessage(

    error.message ||

      "Login failed. Please check your backend connection and API endpoint."

  );

} finally {

  setLoading(false);

}

  }

  return (

    <div

      className="auth-overlay"

      role="presentation"

      onMouseDown={(event) => {

        if (event.target === event.currentTarget) onClose();

      }}

    >

      <section

        className="auth-modal"

        role="dialog"

        aria-modal="true"

        aria-labelledby="auth-title"

      >

        <button

          className="auth-close"

          type="button"

          onClick={onClose}

          aria-label="Close login popup"

        >

          ×

        </button>

        <div className="auth-brand-mark">C</div>

        <p className="auth-eyebrow">WELCOME TO CLICKSTORE</p>

        <h2 id="auth-title">

          {mode === "login" ? "Welcome back" : "Create your account"}

        </h2>

        <p className="auth-subtitle">

          {mode === "login"

            ? "Sign in to continue your shopping."

            : "Join ClickStore for a smoother shopping experience."}

        </p>

        <div className="auth-mode-switch" role="tablist" aria-label="Account type">

          <button

            type="button"

            role="tab"

            aria-selected={mode === "login"}

            className={mode === "login" ? "active" : ""}

            onClick={() => {

              setMode("login");

              setMessage("");

            }}

          >

            Login

          </button>

          <button

            type="button"

            role="tab"

            aria-selected={mode === "register"}

            className={mode === "register" ? "active" : ""}

            onClick={() => {

              setMode("register");

              setMessage("");

            }}

          >

            Register

          </button>

        </div>

        <form className="auth-form" onSubmit={handleSubmit}>

          {mode === "register" && (

            <label>

              Full name

              <input

                type="text"

                autoComplete="name"

                value={name}

                onChange={(event) => setName(event.target.value)}

                placeholder="Enter your full name"

                required

              />

            </label>

          )}

          <label>

            Email address

            <input

              type="email"

              autoComplete="email"

              value={email}

              onChange={(event) => setEmail(event.target.value)}

              placeholder="you@example.com"

              required

            />

          </label>

          <label>

            Password

            <input

              type="password"

              autoComplete={mode === "login" ? "current-password" : "new-password"}

              value={password}

              onChange={(event) => setPassword(event.target.value)}

              placeholder="Enter your password"

              minLength={6}

              required

            />

          </label>

          {message && (

            <p className="auth-message" role="status">

              {message}

            </p>

          )}

          <button className="auth-submit" type="submit" disabled={loading}>

            {loading

              ? "Please wait..."

              : mode === "login"

                ? "Login to ClickStore"

                : "Create account"}

          </button>

        </form>

        <p className="auth-secure-note">

          <span aria-hidden="true">✓</span> Your account details are sent securely to your backend.

        </p>

      </section>

    </div>

  );

}


const CLICKSTORE_STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
.clickstore-app{--cs-blue:#0866f5;--cs-blue-dark:#0754d8;--cs-ink:#101828;--cs-muted:#667085;--cs-line:#e6ebf2;--cs-pale:#eff6ff;color:var(--cs-ink);background:#fff;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;min-height:100vh}
.clickstore-app *{box-sizing:border-box}
.clickstore-app button,.clickstore-app input,.clickstore-app select{font:inherit}
.clickstore-app button{cursor:pointer}
.cs-top-strip{background:#f5f8fd;border-bottom:1px solid #e9eef6;color:#26344c;font-size:12px}
.cs-top-inner{max-width:1450px;margin:0 auto;min-height:35px;padding:7px 20px;display:flex;align-items:center;gap:30px}
.cs-top-inner>span{white-space:nowrap}.cs-top-inner>span:first-letter{color:var(--cs-blue)}
.cs-top-links{margin-left:auto;display:flex;align-items:center;gap:12px;white-space:nowrap}.cs-top-links button{border:0;background:transparent;color:#344054;font-size:12px;padding:0}.cs-top-links i{height:14px;border-left:1px solid #cbd5e1}
.cs-header{max-width:1450px;margin:0 auto;min-height:87px;padding:15px 20px;display:grid;grid-template-columns:270px minmax(300px,1fr) auto;align-items:center;gap:32px;background:#fff}
.cs-logo{display:flex;align-items:center;gap:11px;border:0;background:transparent;text-align:left;padding:0;min-width:0;color:var(--cs-ink)}
.cs-logo-icon{width:44px;height:44px;border-radius:12px;background:var(--cs-blue);color:#fff;display:grid;place-items:center;font-size:27px;font-weight:800;box-shadow:0 7px 16px #0866f527}
.cs-logo-copy{display:flex;flex-direction:column;gap:2px}.cs-logo-copy strong{font-size:27px;line-height:1;font-weight:800;letter-spacing:-1.2px}.cs-logo-copy strong span{color:var(--cs-blue)}.cs-logo-copy small{text-transform:capitalize;color:#667085;font-size:11px;margin-top:4px;letter-spacing:.1px}
.cs-search{height:49px;display:flex;align-items:center;background:#f7f9fc;border:1px solid #dfe6f1;border-radius:8px;overflow:hidden;box-shadow:0 1px 2px #10182808}.cs-search:focus-within{border-color:#8eb8ff;box-shadow:0 0 0 3px #0866f516}.cs-search-icon{color:#7b879a;font-size:28px;padding:0 14px;line-height:1}.cs-search input{flex:1;min-width:0;border:0;outline:0;background:transparent;font-size:13px;color:#344054}.cs-search input::placeholder{color:#7b879a}.cs-search-submit{height:40px;margin:4px;padding:0 25px;border:0;border-radius:6px;background:var(--cs-blue);color:#fff;font-size:13px;font-weight:700}.cs-search-submit:hover,.cs-primary-button:hover,.cs-add-cart-button:hover{background:var(--cs-blue-dark)}.cs-clear-search{border:0;background:transparent;color:#667085;font-size:21px;padding:0 6px}
.cs-header-actions{display:flex;align-items:center;gap:20px}.cs-header-actions>button{border:0;background:transparent;color:#121b2b;display:flex;align-items:center;gap:7px;padding:5px 0;white-space:nowrap}.cs-header-actions small{font-size:12px;font-weight:600}.cs-action-icon{font-size:26px;line-height:1;color:#17243a}.cs-cart-icon{font-size:22px}
.cs-nav{border-bottom:1px solid #e9edf4;background:#fff}.cs-nav-inner{max-width:1450px;margin:0 auto;padding:0 20px;min-height:43px;display:flex;align-items:stretch;gap:8px}.cs-nav-inner>button{border:0;border-bottom:3px solid transparent;background:transparent;padding:0 14px;color:#17233a;font-size:13px;font-weight:600;white-space:nowrap}.cs-nav-inner>button.active{border-bottom-color:var(--cs-blue);color:var(--cs-blue)}.cs-nav-inner>button:hover{color:var(--cs-blue)}.cs-nav-inner .cs-todays-deals{margin-left:auto;align-self:center;min-height:30px;border:0;border-radius:9px;padding:0 13px;background:#fff0ef;color:#c93221}
.clickstore-app .page-container{max-width:1450px;margin:0 auto;padding:14px 20px 48px}.cs-store-layout{display:grid;grid-template-columns:245px minmax(0,1fr);gap:19px;align-items:start}.cs-wishlist-layout{grid-template-columns:minmax(0,1fr)}.cs-sidebar{border:1px solid #e5ebf4;border-radius:10px;overflow:hidden;background:#fff;box-shadow:0 2px 6px #10182805;position:sticky;top:12px}.cs-sidebar-title{width:100%;min-height:42px;display:flex;align-items:center;gap:12px;padding:0 16px;background:var(--cs-blue);border:0;color:#fff;text-align:left;font-weight:700;font-size:13px}.cs-sidebar-title span{font-size:20px}.cs-sidebar-list{padding:7px 0}.cs-sidebar-item{width:100%;min-height:34px;padding:6px 13px;display:flex;align-items:center;gap:11px;border:0;background:#fff;color:#17243a;text-align:left;font-size:12px;font-weight:500}.cs-sidebar-item:hover,.cs-sidebar-item.active{background:#f0f6ff;color:var(--cs-blue)}.cs-category-icon{width:19px;display:grid;place-items:center;color:#25344d;font-size:17px;flex-shrink:0}.cs-sidebar-item.active .cs-category-icon{color:var(--cs-blue)}.cs-category-chevron{margin-left:auto;font-size:21px;line-height:1;color:#7a8ba3}.cs-sidebar-hint{padding:0 14px 14px;font-size:12px;color:var(--cs-muted)}.cs-main-column{min-width:0}
.cs-hero{height:292px;position:relative;overflow:hidden;display:grid;grid-template-columns:46% 54%;align-items:center;border-radius:11px;background:linear-gradient(105deg,#edf5ff 0%,#e5f1ff 47%,#c8e2ff 100%);isolation:isolate}.cs-hero:before{content:"";position:absolute;width:62%;height:155%;right:-6%;top:-28%;border-radius:50%;background:linear-gradient(135deg,#b8d9ff99,#e8f4ff88);z-index:-1}.cs-hero-copy{padding:24px 16px 23px clamp(30px,7.5%,110px);z-index:2}.cs-hero-eyebrow{display:block;color:var(--cs-blue);font-size:14px;font-weight:800;letter-spacing:.35px;margin-bottom:13px}.cs-hero-copy h1{font-size:clamp(30px,3.1vw,49px);line-height:1.04;letter-spacing:-1.7px;margin:0;color:#101828;font-weight:800}.cs-hero-copy h1 span{color:var(--cs-blue)}.cs-hero-copy p{max-width:390px;font-size:15px;line-height:1.55;color:#536681;margin:13px 0 16px}.cs-primary-button{min-height:44px;border:0;border-radius:7px;background:var(--cs-blue);color:white;font-weight:700;font-size:13px;padding:0 25px;box-shadow:0 5px 14px #0866f51b;transition:background .15s,transform .15s}.cs-primary-button span{margin-left:8px}.cs-primary-button:hover{transform:translateY(-1px)}.cs-hero-art{position:relative;height:100%;display:flex;align-items:center;justify-content:center;min-width:0}.cs-hero-circle{position:absolute;border-radius:50%;pointer-events:none}.cs-hero-circle-one{width:350px;height:350px;border:1px solid #ffffff99;right:2%;top:-15%}.cs-hero-circle-two{width:255px;height:255px;border:1px solid #ffffffad;right:16%;top:5%}.cs-hero-main-product{z-index:3;position:absolute;right:22%;top:10%;width:42%;height:74%;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:6px;border:0;background:transparent}.cs-hero-main-product img{max-width:100%;max-height:72%;object-fit:contain;filter:drop-shadow(0 18px 18px #496b9228)}.cs-hero-product-caption{display:flex;flex-direction:column;text-align:center;gap:3px;margin-top:8px;padding:6px 10px;border-radius:8px;background:#ffffffd9;box-shadow:0 4px 14px #224c7e10;max-width:100%}.cs-hero-product-caption small{font-size:9px;color:#62728a}.cs-hero-product-caption strong{max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;color:#17243a}.cs-hero-product-caption b{font-size:11px;color:var(--cs-blue)}.cs-hero-floating-product{position:absolute;width:20%;height:38%;z-index:2;display:grid;place-items:center;border:1px solid #ffffffb5;border-radius:12px;background:#ffffffdb;box-shadow:0 10px 25px #395f8522;padding:8px}.cs-hero-floating-product img{max-width:100%;max-height:100%;object-fit:contain}.cs-hero-floating-1{left:6%;top:16%;transform:rotate(-5deg)}.cs-hero-floating-2{right:3%;top:17%;transform:rotate(5deg)}.cs-hero-floating-3{right:7%;bottom:8%;width:18%;height:32%;transform:rotate(-4deg)}.cs-hero-empty-art{height:190px;width:190px;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#ffffff8c;color:#0866f5;gap:8px}.cs-hero-empty-art span{font-size:60px}.cs-hero-empty-art b{font-size:12px}.cs-hero-arrow{position:absolute;z-index:5;top:50%;transform:translateY(-50%);height:39px;width:39px;border:0;border-radius:50%;background:#fff;color:#1b2a41;font-size:27px;line-height:1;box-shadow:0 3px 11px #10182814}.cs-hero-prev{left:12px}.cs-hero-next{right:12px}.cs-hero-dots{position:absolute;z-index:4;bottom:12px;left:50%;transform:translateX(-50%);display:flex;gap:8px}.cs-hero-dots button{width:8px;height:8px;border:0;border-radius:50%;padding:0;background:#b8c4d4}.cs-hero-dots button.active{background:var(--cs-blue)}
.cs-benefits{margin:17px 0 24px;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));align-items:center;background:#fff}.cs-benefit-item{min-width:0;display:flex;align-items:center;gap:11px;padding:6px 12px;border-right:1px solid #e4eaf2}.cs-benefit-item:last-child{border-right:0}.cs-benefit-icon{width:49px;height:49px;flex-shrink:0;border-radius:50%;display:grid;place-items:center;background:#edf5ff;color:var(--cs-blue);font-size:25px;font-weight:600}.cs-benefit-item>span:last-child{display:flex;flex-direction:column;gap:4px;min-width:0}.cs-benefit-item b{font-size:12px;color:#17243a}.cs-benefit-item small{font-size:10px;color:#758196;line-height:1.3}
.cs-featured-section,.cs-categories-section{margin:0 0 29px;scroll-margin-top:16px}.cs-featured-heading{display:flex;align-items:center;justify-content:space-between;gap:15px;margin-bottom:13px}.cs-featured-heading h2{font-size:24px;letter-spacing:-.6px;margin:0;color:#101828;font-weight:800}.cs-featured-heading p{font-size:12px;color:#667085;margin:5px 0 0}.cs-featured-heading>button{border:0;background:transparent;color:var(--cs-blue);font-size:13px;font-weight:700;white-space:nowrap;padding:8px 0}.cs-featured-heading>button span{font-size:17px;margin-left:4px}.cs-product-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:13px}.cs-product-card{border:1px solid #e7ebf2;border-radius:10px;overflow:hidden;background:#fff;min-width:0;display:flex;flex-direction:column;transition:box-shadow .18s,border-color .18s,transform .18s}.cs-product-card:hover{border-color:#cad8ed;box-shadow:0 9px 24px #1a35570d;transform:translateY(-2px)}.cs-card-image-wrap{height:133px;position:relative;display:flex;align-items:center;justify-content:center;padding:12px 12px 3px;background:linear-gradient(180deg,#fff,#fcfdff)}.cs-card-image{width:100%;height:100%;border:0;background:transparent;padding:0;display:grid;place-items:center}.cs-card-image img{height:100%;width:100%;object-fit:contain;mix-blend-mode:multiply}.cs-card-image .image-placeholder{width:100%;height:100%;min-height:100px;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:4px;background:#f7f9fc;color:#8795aa;font-size:11px}.cs-card-image .image-placeholder span:first-child{font-size:29px}.cs-discount-badge{position:absolute;top:10px;left:10px;padding:4px 7px;border-radius:6px;background:#fa442f;color:#fff;font-size:10px;font-weight:800;box-shadow:0 2px 4px #fa442f25}.cs-status-badge{position:absolute;bottom:8px;left:10px;font-size:8px;letter-spacing:.3px;color:#19724a;background:#eaf8f0;border-radius:4px;padding:3px 5px}.cs-heart-button{position:absolute;right:9px;top:7px;width:27px;height:27px;border:0;background:#ffffffeb;color:#72819a;font-size:22px;line-height:1;border-radius:50%;padding:0}.cs-heart-button.is-wishlisted{color:#eb3f53}.cs-card-info{padding:8px 11px 11px;display:flex;flex-direction:column;flex:1;min-width:0}.cs-product-category{font-size:9px;color:#8a96a8;text-transform:uppercase;letter-spacing:.45px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.cs-card-info h3{font-size:12px;line-height:1.35;font-weight:650;margin:5px 0 6px;min-height:31px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.cs-card-info h3 button{border:0;background:transparent;color:#17243a;text-align:left;padding:0;font-weight:650;width:100%;font-size:inherit;line-height:inherit}.cs-product-meta{min-height:15px;display:flex;align-items:center;gap:4px;font-size:10px;color:#667085;overflow:hidden}.cs-stars{color:#f5a623;letter-spacing:-1px;font-size:12px;white-space:nowrap}.cs-review-count{color:#8590a1;white-space:nowrap}.cs-brand-label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.cs-price-row{display:flex;align-items:baseline;flex-wrap:wrap;gap:6px;margin:6px 0 9px;min-height:20px}.cs-price-row strong{font-size:13px;color:#101828;font-weight:800}.cs-price-row del{font-size:10px;color:#98a2b3}.cs-add-cart-button{margin-top:auto;width:100%;min-height:34px;border:0;border-radius:6px;background:var(--cs-blue);color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;gap:7px;transition:background .15s}.cs-add-cart-button span{font-size:13px}
.cs-categories-section{padding-top:4px}.cs-category-tiles{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.cs-category-tile{min-height:105px;border:1px solid #e5eaf2;background:#fff;border-radius:9px;padding:13px;display:flex;flex-direction:column;align-items:flex-start;gap:5px;text-align:left}.cs-category-tile:hover,.cs-category-tile.active{border-color:#9ec4ff;background:#f5f9ff}.cs-category-tile>span{color:var(--cs-blue);font-size:21px}.cs-category-tile b{font-size:12px;color:#17243a}.cs-category-tile small{font-size:10px;color:#7c8798}
.cs-all-products{padding-top:6px;scroll-margin-top:20px}.clickstore-app .cs-all-products .section-title{display:flex;align-items:end;justify-content:space-between;gap:18px;margin-bottom:17px}.clickstore-app .cs-all-products .section-title h2{font-size:27px;letter-spacing:-.7px;margin:4px 0 5px}.clickstore-app .cs-all-products .section-title p{margin:0;color:#6b778c;font-size:12px}.clickstore-app .cs-all-products .eyebrow{color:var(--cs-blue);font-weight:800;font-size:10px;letter-spacing:.8px}.clickstore-app .cs-all-products .product-controls{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.clickstore-app .cs-all-products .product-controls label{font-size:12px;color:#667085}.clickstore-app .cs-all-products .product-controls select{border:1px solid #dfe5ed;background:#fff;border-radius:6px;padding:8px 10px;font-size:12px;color:#344054}.cs-all-product-grid{grid-template-columns:repeat(4,minmax(0,1fr));gap:15px}.cs-all-product-grid .cs-card-image-wrap{height:180px}.cs-all-product-grid .cs-card-info{padding:10px 12px 13px}.cs-all-product-grid .cs-card-info h3{font-size:14px;min-height:38px}.cs-all-product-grid .cs-price-row strong{font-size:15px}.cs-lower-promo{margin:28px 0 8px;border-radius:11px;padding:25px 30px;background:linear-gradient(110deg,#edf5ff,#d7eaff);display:flex;align-items:center;justify-content:space-between;gap:20px}.cs-lower-promo span{color:var(--cs-blue);font-size:10px;font-weight:800;letter-spacing:.7px}.cs-lower-promo h2{margin:7px 0;font-size:22px}.cs-lower-promo p{font-size:12px;color:#5d6e86;margin:0}.cs-featured-loading{padding:30px 0;color:#667085;font-size:13px}.cs-featured-loading .loading-spinner{margin-right:10px;vertical-align:middle}
.cs-header+ .cs-nav + .page-container{}.clickstore-app .site-footer{margin-top:30px}.clickstore-app .site-footer a{cursor:pointer}
@media (max-width:1250px){.cs-header{grid-template-columns:220px minmax(240px,1fr);gap:20px}.cs-header-actions{grid-column:2;justify-self:end;margin-top:-1px}.cs-search{grid-column:2;grid-row:1}.cs-header-actions{grid-row:2}.cs-product-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.cs-benefits{grid-template-columns:repeat(3,minmax(0,1fr));row-gap:12px}.cs-benefit-item:nth-child(3){border-right:0}.cs-benefit-item:nth-child(4){padding-left:12px}}
@media (max-width:900px){.cs-top-inner{gap:13px;flex-wrap:wrap}.cs-top-inner>span:nth-child(3){display:none}.cs-top-links{display:none}.cs-header{grid-template-columns:1fr auto;gap:13px;padding:13px 16px}.cs-logo-copy strong{font-size:23px}.cs-search{grid-column:1/-1;grid-row:2}.cs-header-actions{grid-column:2;grid-row:1;margin:0;gap:12px}.cs-header-actions small{font-size:10px}.cs-header-actions>button{gap:4px}.cs-nav-inner{overflow-x:auto;padding:0 13px;gap:0}.cs-nav-inner>button{padding:0 11px}.cs-store-layout{grid-template-columns:190px minmax(0,1fr);gap:12px}.clickstore-app .page-container{padding:12px 14px 35px}.cs-sidebar-item{font-size:11px;gap:7px;padding:6px 9px}.cs-hero{height:275px;grid-template-columns:53% 47%}.cs-hero-copy{padding-left:26px}.cs-hero-copy h1{font-size:32px}.cs-hero-floating-product{width:25%;height:33%}.cs-benefit-item{padding:5px 7px;gap:7px}.cs-benefit-icon{width:38px;height:38px;font-size:20px}.cs-benefit-item b{font-size:10px}.cs-benefit-item small{font-size:9px}.cs-category-tiles{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:650px){.cs-top-inner{justify-content:center;padding:7px 10px;font-size:10px}.cs-top-inner>span:nth-child(2){display:none}.cs-header{padding:11px 12px;gap:11px}.cs-logo-icon{height:37px;width:37px;font-size:23px}.cs-logo-copy strong{font-size:21px}.cs-logo-copy small{font-size:9px}.cs-action-icon{font-size:21px}.cs-header-actions{gap:10px}.cs-header-actions small{display:none}.cs-search{height:44px}.cs-search-submit{padding:0 13px}.cs-nav-inner>button{font-size:11px;min-height:39px;padding:0 9px}.cs-nav-inner .cs-todays-deals{display:none}.clickstore-app .page-container{padding:10px 12px 26px}.cs-store-layout{grid-template-columns:minmax(0,1fr)}.cs-sidebar{position:static;margin-bottom:13px}.cs-sidebar-title{min-height:38px}.cs-sidebar-list{display:flex;overflow-x:auto;padding:6px;gap:5px}.cs-sidebar-item{flex:0 0 auto;width:auto;border:1px solid #e5ebf4;border-radius:7px;min-height:34px;padding:6px 9px}.cs-sidebar-item .cs-category-chevron{display:none}.cs-sidebar-item span:nth-child(2){max-width:120px;white-space:nowrap}.cs-sidebar-list .cs-sidebar-item:last-child{display:none}.cs-hero{height:auto;min-height:370px;grid-template-columns:1fr;grid-template-rows:auto 180px;padding-bottom:22px}.cs-hero-copy{padding:27px 25px 5px}.cs-hero-copy h1{font-size:34px;letter-spacing:-1px}.cs-hero-copy p{font-size:13px;max-width:300px;margin:9px 0 12px}.cs-hero-eyebrow{font-size:11px;margin-bottom:9px}.cs-primary-button{min-height:40px;padding:0 18px;font-size:12px}.cs-hero-art{height:180px}.cs-hero-main-product{height:92%;width:38%;right:31%;top:0}.cs-hero-main-product img{max-height:65%}.cs-hero-floating-product{height:46%;width:19%;padding:4px}.cs-hero-floating-1{left:12%;top:19%}.cs-hero-floating-2{right:12%;top:12%}.cs-hero-floating-3{right:18%;bottom:1%}.cs-hero-circle-one{width:220px;height:220px;right:8%;top:-10%}.cs-hero-circle-two{width:165px;height:165px;right:19%;top:5%}.cs-hero-arrow{width:31px;height:31px;font-size:22px}.cs-hero-prev{left:7px}.cs-hero-next{right:7px}.cs-hero-dots{bottom:8px}.cs-benefits{grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin:14px 0 22px}.cs-benefit-item{border:0;padding:4px 0}.cs-benefit-item:nth-child(3){border:0}.cs-benefit-icon{width:35px;height:35px;font-size:18px}.cs-benefit-item b{font-size:10px}.cs-benefit-item small{font-size:8px}.cs-featured-heading h2{font-size:21px}.cs-featured-heading p{font-size:10px}.cs-product-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.cs-card-image-wrap{height:130px}.cs-card-info{padding:7px 9px 9px}.cs-card-info h3{font-size:12px}.cs-product-meta{font-size:9px}.cs-price-row strong{font-size:12px}.cs-add-cart-button{min-height:33px;font-size:10px}.cs-category-tiles{grid-template-columns:repeat(2,minmax(0,1fr))}.clickstore-app .cs-all-products .section-title{align-items:flex-start;flex-direction:column}.clickstore-app .cs-all-products .section-title h2{font-size:23px}.cs-all-product-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.cs-all-product-grid .cs-card-image-wrap{height:135px}.cs-all-product-grid .cs-card-info h3{font-size:12px;min-height:32px}.cs-lower-promo{padding:20px;flex-direction:column;align-items:flex-start}.cs-lower-promo h2{font-size:20px}}
@media (prefers-reduced-motion:reduce){.cs-product-card,.cs-primary-button{transition:none}}
/* Category sidebar polish: clear labels and a compact count in the blue heading. */
.cs-sidebar-title{position:relative;padding-right:42px}
.cs-sidebar-title .cs-sidebar-count{margin-left:auto;display:inline-grid;place-items:center;width:23px;height:23px;border-radius:50%;font-size:10px;background:#ffffff2b;color:#fff}
.cs-sidebar-item .cs-category-name{min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cs-sidebar-item[aria-pressed="true"]{font-weight:750;box-shadow:inset 3px 0 0 var(--cs-blue)}
.cs-sidebar-item:focus-visible,.cs-sidebar-title:focus-visible{outline:2px solid #83b7ff;outline-offset:-2px}
.cs-sidebar-item.cs-more-categories{margin-top:4px;border-top:1px solid #edf1f6;padding-top:9px;color:#1768e8;font-weight:700}
.cs-category-tile{transition:transform .16s ease,border-color .16s ease,box-shadow .16s ease}
.cs-category-tile:hover{transform:translateY(-2px);box-shadow:0 8px 18px #1a35570b}
.cs-add-cart-button:hover,.cs-primary-button:hover,.cs-search-submit:hover{filter:brightness(.96)}
.cs-product-card:focus-within{outline:2px solid #b8d6ff;outline-offset:2px}
@media (max-width:650px){.cs-sidebar-title .cs-sidebar-count{margin-left:auto}.cs-sidebar-list{scrollbar-width:thin}.cs-sidebar-item .cs-category-name{max-width:175px}.cs-sidebar-item.cs-more-categories{margin-top:0;border-top:0;padding-top:6px}}
/* Product sorting and price range controls */
.clickstore-app .cs-all-products .cs-catalogue-filters{max-width:100%;justify-content:flex-end;gap:7px}
.clickstore-app .cs-catalogue-filters select{min-width:115px;max-width:190px}
.clickstore-app .cs-catalogue-filters .cs-price-filter-input{width:82px;min-width:0;border:1px solid #dfe5ed;border-radius:6px;background:#fff;padding:8px 9px;color:#344054;font-size:12px;outline:none}
.clickstore-app .cs-catalogue-filters .cs-price-filter-input:focus{border-color:#8eb8ff;box-shadow:0 0 0 3px #0866f516}
.cs-price-filter-label{white-space:nowrap}
.cs-price-range-separator{color:#98a2b3;font-size:12px}
.cs-reset-filters{border:1px solid #dbe7fa;border-radius:6px;padding:8px 10px;background:#f4f8ff;color:#1768e8;font-size:12px;font-weight:700;white-space:nowrap}
.cs-reset-filters:hover{background:#eaf2ff}
@media (max-width:1050px){.clickstore-app .cs-all-products .section-title{align-items:flex-start;flex-direction:column}.clickstore-app .cs-all-products .cs-catalogue-filters{justify-content:flex-start}}
@media (max-width:650px){.clickstore-app .cs-catalogue-filters{display:grid!important;grid-template-columns:auto minmax(0,1fr) auto minmax(0,1fr);align-items:center;gap:7px!important;width:100%}.clickstore-app .cs-catalogue-filters label{font-size:11px!important}.clickstore-app .cs-catalogue-filters select{min-width:0;max-width:none;width:100%;font-size:11px;padding:8px 6px}.clickstore-app .cs-catalogue-filters .cs-price-filter-input{width:100%;box-sizing:border-box;font-size:12px}.clickstore-app .cs-catalogue-filters .cs-price-filter-label{grid-column:1}.cs-price-range-separator{display:none}.clickstore-app .cs-catalogue-filters #min-product-price{grid-column:2}.clickstore-app .cs-catalogue-filters #max-product-price{grid-column:4}.clickstore-app .cs-catalogue-filters .cs-reset-filters{grid-column:1/-1;justify-self:start}}
`;

export default function App() {

  const [showProfile, setShowProfile] = useState(() => {

  try {

    return (

      window.location.hash.startsWith("#/account") &&

      Boolean(localStorage.getItem("token")) &&

      Boolean(localStorage.getItem("clickstore-user"))

    );

  } catch {

    return false;

  }

});

  const [authData, setAuthData] = useState(() => {

  try {

    const token = localStorage.getItem("token");

    const savedUser = localStorage.getItem("clickstore-user");

    if (!token) return null;

    return {

      token,

      user: savedUser ? JSON.parse(savedUser) : null,

    };

  } catch (error) {

    console.error("Could not restore login session:", error);

    return null;

  }

});

  const [showCart, setShowCart] = useState(false);

  // Keep route state declared before the hashchange effect uses its setter.
  const [showWishlist, setShowWishlist] = useState(false);

  const [showCheckout, setShowCheckout] = useState(false);

  const [orderSuccess, setOrderSuccess] = useState(null);

  const [selectedCartItemIds, setSelectedCartItemIds] = useState([]);

  useEffect(() => {

  function handleHashChange() {

    const hash = window.location.hash;

    setShowCart(hash.startsWith("#/cart"));

    setShowCheckout(hash.startsWith("#/checkout"));

    setShowWishlist(hash.startsWith("#/wishlist"));

  }

  window.addEventListener("hashchange", handleHashChange);

  handleHashChange();

  return () => {

    window.removeEventListener("hashchange", handleHashChange);

  };

}, []);

  
const [products, setProducts] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState("");
const [search, setSearch] = useState("");

const [selectedCategory, setSelectedCategory] =
  useState("All categories");

// Client-side catalogue controls
const [minPrice, setMinPrice] = useState("");
const [maxPrice, setMaxPrice] = useState("");
const [sortBy, setSortBy] = useState("recommended");

const [selectedProduct, setSelectedProduct] = useState(null);

// Load saved wishlist from localStorage
const [wishlist, setWishlist] = useState(() => {
  try {
    const savedWishlist = localStorage.getItem("clickstore-wishlist");
    const parsedWishlist = savedWishlist
      ? JSON.parse(savedWishlist)
      : [];

    return Array.isArray(parsedWishlist) ? parsedWishlist : [];
  } catch (error) {
    console.error("Could not load wishlist:", error);
    return [];
  }
});

const [showAuthModal, setShowAuthModal] = useState(false);

// Save wishlist whenever it changes
useEffect(() => {
  try {
    localStorage.setItem(
      "clickstore-wishlist",
      JSON.stringify(wishlist)
    );
  } catch (error) {
    console.error("Could not save wishlist:", error);
  }
}, [wishlist]);


  useEffect(() => {

    const controller = new AbortController();

    async function loadProducts() {

      setLoading(true);

      setError("");

      try {

        const response = await fetch(API_URL, {

          method: "GET",

          headers: { Accept: "application/json" },

          signal: controller.signal,

        });

        if (!response.ok) {

          throw new Error(`Server returned HTTP ${response.status}`);

        }

        const data = await response.json();

        if (!Array.isArray(data)) {

          throw new Error("The products API did not return a list.");

        }

const variants = await apiRequest("/products/variants", {

  signal: controller.signal,

});

console.log("ClickStore products:", data);

console.log("ClickStore variants:", variants);

const normalizedProducts = data.map(normalizeProduct);

const productsWithVariants = normalizedProducts.map((product) =>

  attachVariantToProduct(product, variants)

);

setProducts(productsWithVariants);

      } catch (err) {

        if (err.name !== "AbortError") {

          console.error("ClickStore products API error:", err);

          setError(

            "Products load nahi ho paaye. Backend run ho raha hai ya nahi check karo."

          );

        }

      } finally {

        if (!controller.signal.aborted) {

          setLoading(false);

        }

      }

    }

    loadProducts();

    return () => controller.abort();

  }, []);

  const categories = useMemo(() => {
    const backendCategories = [...new Set(products.map((product) => product.category))]
      .filter((category) => category && !/^category\s+\d+$/i.test(category.trim()))
      .sort((a, b) => a.localeCompare(b));

    const defaults = [...STORE_CATEGORIES];
    const additional = backendCategories.filter(
      (category) => !defaults.some((item) => item.toLowerCase() === category.toLowerCase())
    );

    return [...defaults, ...additional];
  }, [products]);

  const filteredProducts = useMemo(() => {

    const query = search.trim().toLowerCase();

    return products.filter((product) => {

      const matchesSearch =

        !query ||

        product.name.toLowerCase().includes(query) ||

        product.description.toLowerCase().includes(query) ||

        product.category.toLowerCase().includes(query) ||

        String(product.brand?.name || product.brand || "")

          .toLowerCase()

          .includes(query);

      const matchesCategory = productMatchesCategory(product, selectedCategory);

      return matchesSearch && matchesCategory;

    });

  }, [products, search, selectedCategory]);

  const wishlistProducts = products.filter((product) =>

    wishlist.some((id) => String(id) === String(product.id))

  );

  async function addToCart(productToAdd = selectedProduct) {

  if (!authData?.user) {

    setShowAuthModal(true);

    return;

  }

  if (!productToAdd) {

    alert("Please select a product first.");

    return;

  }

  const variantId =

    productToAdd.variantId ??

    productToAdd.defaultVariantId ??

    productToAdd.variants?.[0]?.id;

  if (!variantId) {

    alert("Product variant ID nahi mili.");

    console.log("Selected product:", productToAdd);

    return;

  }

  try {

    const result = await apiRequest("/customer/cart/items", {

      method: "POST",

      body: JSON.stringify({

        variantId: Number(variantId),

        quantity: 1,

      }),

    });

    alert(result.message || "Item added to cart successfully");

  } catch (error) {

    alert(error.message || "Could not add item to cart");

  }

}

  function toggleWishlist(product) {

    setWishlist((current) =>

      current.some((id) => String(id) === String(product.id))

        ? current.filter((id) => String(id) !== String(product.id))

        : [...current, product.id]

    );

  }

  function goHome() {

    setSelectedProduct(null);

    setShowWishlist(false);

    setSelectedCategory("All categories");

    window.location.hash = "/";

  }

  function chooseCategory(category) {

    setSelectedCategory(category);

    setSelectedProduct(null);

    setShowWishlist(false);

    window.location.hash = "/products";

  }

  const visibleProducts = useMemo(() => {
    const baseProducts = showWishlist ? wishlistProducts : filteredProducts;
    const min = minPrice.trim() === "" ? null : Number(minPrice);
    const max = maxPrice.trim() === "" ? null : Number(maxPrice);

    const matchesPriceRange = (product) => {
      const price = Number(product.price);
      const hasPrice = product.price !== null && product.price !== undefined && product.price !== "" && Number.isFinite(price);
      if (min !== null && Number.isFinite(min) && (!hasPrice || price < min)) return false;
      if (max !== null && Number.isFinite(max) && (!hasPrice || price > max)) return false;
      return true;
    };

    const result = baseProducts.filter(matchesPriceRange);
    result.sort((a, b) => {
      const aPrice = Number(a.price);
      const bPrice = Number(b.price);
      const aHasPrice = a.price !== null && a.price !== undefined && a.price !== "" && Number.isFinite(aPrice);
      const bHasPrice = b.price !== null && b.price !== undefined && b.price !== "" && Number.isFinite(bPrice);

      // Keep products without prices at the end for price-based sorting.
      if (sortBy === "price-low-high" || sortBy === "price-high-low") {
        if (aHasPrice !== bHasPrice) return aHasPrice ? -1 : 1;
        if (!aHasPrice && !bHasPrice) return 0;
        return sortBy === "price-low-high" ? aPrice - bPrice : bPrice - aPrice;
      }
      if (sortBy === "name-a-z") return String(a.name || "").localeCompare(String(b.name || ""));
      if (sortBy === "name-z-a") return String(b.name || "").localeCompare(String(a.name || ""));
      return 0;
    });
    return result;
  }, [showWishlist, wishlistProducts, filteredProducts, minPrice, maxPrice, sortBy]);

  const resetCatalogueFilters = () => {
    setMinPrice("");
    setMaxPrice("");
    setSortBy("recommended");
  };

const userRoles = authData?.user?.roles || [];

const isAdmin = userRoles.some(

  (role) => ["ADMIN", "ROLE_ADMIN"].includes(role)

);
if (window.location.hash.startsWith("#/admin")) {

  if (!authData?.token || !isAdmin) {

    return (

<div className="clickstore-app">

        <main className="page-container">

          <h2>Admin access required</h2>

          <p>Please log in with an administrator account.</p>

          <button

            type="button"

            onClick={() => {

              window.location.hash = "/";

              setShowAuthModal(true);

            }}

          >

            Go to Login

          </button>

        </main>

      </div>

    );

  }

  return (

    <AdminDashboard

      authData={authData}

      onLogout={() => {

        localStorage.removeItem("token");

        localStorage.removeItem("clickstore-user");

        setAuthData(null);

        setShowProfile(false);

        setShowAuthModal(false);

        window.location.hash = "/";

      }}

    />

  );

}

  return (

    <div className="clickstore-app">
      <style>{CLICKSTORE_STYLES}</style>

      {!showCart && (

  <Header

    search={search}

    setSearch={setSearch}

    selectedCategory={selectedCategory}

    wishlistCount={wishlist.length}

    onHome={goHome}

    onWishlist={() => {

      setSelectedProduct(null);

      setShowWishlist(true);

      window.location.hash = "/wishlist";

      window.scrollTo({ top: 0, behavior: "smooth" });

    }}

    onAccount={() => {

      if (authData?.user) {

        setShowProfile(true);

        window.location.hash = "/account";

      } else {

        setShowAuthModal(true);

      }

    }}

    onBag={() => {

      setShowCart(true);

      setShowCheckout(false);

      setOrderSuccess(null);

      setSelectedProduct(null);

      setShowWishlist(false);

      setShowProfile(false);

      window.location.hash = "/cart";

    }}

  />

)}

{showProfile && (

  <ProfilePage

    authData={authData}

    wishlist={wishlist}

    wishlistProducts={wishlistProducts}

    onRemoveWishlist={(productId) => {

  setWishlist((current) =>

    current.filter((id) => id !== productId)

  );

}}

    onBack={() => setShowProfile(false)}

    onOpenAddresses={() => {

      setShowProfile(false);

    }}

    onLogout={() => {

      localStorage.removeItem("token");

      localStorage.removeItem("clickstore-user");

      setAuthData(null);

      setShowProfile(false);

      setShowAuthModal(false);

      window.location.hash = "/";

    }}

  />

)}

     {orderSuccess ? (

  <main className="checkout-page">

    <section className="checkout-panel">

      <h1>Order placed successfully! 🎉</h1>

      <p>Order number:</p>

      <strong>

        {orderSuccess.orderNumber || `Order #${orderSuccess.orderId || orderSuccess.id || ""}`}

      </strong>

      <p>Thank you for shopping with ClickStore.</p>

      <button

        className="checkout-place-button"

        onClick={() => {

          setOrderSuccess(null);

          setShowCheckout(false);

          setShowCart(false);

          setSelectedProduct(null);

          window.location.hash = "/products";

        }}

      >

        Continue Shopping

      </button>

    </section>

  </main>

) : showCheckout ? (

  <Checkout

  selectedCartItemIds={selectedCartItemIds}

  onBackToCart={() => {

    setShowCheckout(false);

    setShowCart(true);

    window.location.hash = "/cart";

  }}

  onOrderSuccess={(order) => {

    setOrderSuccess(order);

    setShowCheckout(false);

    setShowCart(false);

    setSelectedCartItemIds([]);

  }}

/>

) : showCart ? (

  <Cart

    onContinueShopping={() => {

      setShowCart(false);

      window.location.hash = "/products";

    }}

    onCheckout={(ids) => {

  if (!Array.isArray(ids) || ids.length === 0) {

    alert("Please select at least one product.");

    return;

  }

  setSelectedCartItemIds(ids);

  setShowCart(false);

  setShowCheckout(true);

  window.location.hash = "/checkout";

}}

  />

) : (

      <main className="page-container">

        {selectedProduct ? (

          <section className="product-detail-page cs-product-detail-page">

            <button

              className="back-link"

              type="button"

              onClick={() => setSelectedProduct(null)}

            >

              ← Back to products

            </button>

            <div className="product-detail-layout">

              <div className="detail-image">

                <ProductImage product={selectedProduct} large />

              </div>

              <div className="detail-copy">

                <span className="eyebrow">CLICKSTORE EXCLUSIVE</span>

                <h1>{selectedProduct.name}</h1>

                <p className="detail-rating">

                  {selectedProduct.brand?.name ||

                    selectedProduct.brand ||

                    selectedProduct.category}

                </p>

                <div className="detail-price">

                  <strong>{money(selectedProduct.price)}</strong>

                </div>

                <p className="detail-description">

                  {selectedProduct.description}

                </p>

                <ul className="detail-points">

                  <li>✓ Product information from ClickStore</li>

                  <li>✓ Secure shopping experience</li>

                  <li>✓ Customer support available</li>

                </ul>

                <div className="detail-actions">

                  <button

                    className="button-primary"

                    type="button"

                    onClick={() => addToCart()}

                  >

                    Add to bag

                  </button>

                  <button

                    className="button-secondary"

                    type="button"

                    onClick={() => toggleWishlist(selectedProduct)}

                  >

                    {wishlist.some((id) => String(id) === String(selectedProduct.id))

                      ? "♥ Wishlisted"

                      : "♡ Add to wishlist"}

                  </button>

                </div>

                <small className="demo-note">

                  Price, stock and image will appear when these fields are

                  available from your backend.

                </small>

              </div>

            </div>

          </section>

        ) : showWishlist ? (
          <section className="cs-wishlist-page" aria-labelledby="cs-wishlist-title">
            <div className="cs-wishlist-breadcrumb-row">
              <button
                className="cs-wishlist-back"
                type="button"
                onClick={() => {
                  setShowWishlist(false);
                  setSelectedCategory("All categories");
                  setMinPrice("");
                  setMaxPrice("");
                  setSortBy("recommended");
                  window.location.hash = "/products";
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                <span aria-hidden="true">←</span> Continue shopping
              </button>
              <div className="cs-wishlist-breadcrumb">Home <span>/</span> <strong>Wishlist</strong></div>
            </div>

            <header className="cs-wishlist-hero">
              <div className="cs-wishlist-hero-copy">
                <span className="cs-wishlist-kicker"><span aria-hidden="true">♥</span> YOUR SAVED PICKS</span>
                <h1 id="cs-wishlist-title">My Wishlist <span className="cs-wishlist-count-pill">{wishlistProducts.length}</span></h1>
                <p>Keep the things you love in one place. Your favourites are ready whenever you are.</p>
                <div className="cs-wishlist-hero-points">
                  <span><b aria-hidden="true">✓</b> Easy to find</span>
                  <span><b aria-hidden="true">✓</b> Ready to shop</span>
                </div>
              </div>
              <div className="cs-wishlist-hero-art" aria-hidden="true">
                <span className="cs-wishlist-art-circle cs-wishlist-art-circle-one" />
                <span className="cs-wishlist-art-circle cs-wishlist-art-circle-two" />
                <span className="cs-wishlist-big-heart">♡</span>
                <span className="cs-wishlist-art-spark cs-wishlist-art-spark-one">✦</span>
                <span className="cs-wishlist-art-spark cs-wishlist-art-spark-two">✧</span>
              </div>
            </header>

            <div className="cs-wishlist-content">
              <section className="cs-wishlist-main" aria-label="Saved products">
                <div className="cs-wishlist-section-heading">
                  <div>
                    <h2>Your saved items</h2>
                    <p>{loading ? "Loading your saved products..." : `${visibleProducts.length} item${visibleProducts.length === 1 ? "" : "s"} in your wishlist`}</p>
                  </div>
                  <span className="cs-wishlist-section-count"><span aria-hidden="true">♡</span> {wishlistProducts.length} saved</span>
                </div>

                <div className="cs-wishlist-toolbar">
                  <label className="cs-wishlist-sort-field" htmlFor="sort-products">
                    <span>Sort by</span>
                    <select id="sort-products" value={sortBy} onChange={(event) => setSortBy(event.target.value)} aria-label="Sort wishlist products">
                      <option value="recommended">Recommended</option>
                      <option value="price-low-high">Price: Low to High</option>
                      <option value="price-high-low">Price: High to Low</option>
                      <option value="name-a-z">Name: A–Z</option>
                      <option value="name-z-a">Name: Z–A</option>
                    </select>
                  </label>
                  <div className="cs-wishlist-price-filter">
                    <label htmlFor="min-product-price">Price range</label>
                    <div className="cs-wishlist-price-inputs">
                      <input id="min-product-price" type="number" min="0" step="1" inputMode="numeric" value={minPrice} onChange={(event) => setMinPrice(event.target.value)} placeholder="Min ₹" aria-label="Minimum wishlist price" />
                      <span aria-hidden="true">–</span>
                      <input id="max-product-price" type="number" min="0" step="1" inputMode="numeric" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} placeholder="Max ₹" aria-label="Maximum wishlist price" />
                    </div>
                  </div>
                  {(minPrice !== "" || maxPrice !== "" || sortBy !== "recommended") && (
                    <button className="cs-wishlist-reset" type="button" onClick={resetCatalogueFilters}>Reset filters</button>
                  )}
                </div>

                {loading && (
                  <div className="cs-wishlist-state">
                    <span className="loading-spinner" />
                    <h3>Loading your favourites...</h3>
                    <p>We are bringing your saved products together.</p>
                  </div>
                )}
                {!loading && error && (
                  <div className="cs-wishlist-state cs-wishlist-state-error">
                    <span className="cs-wishlist-state-icon" aria-hidden="true">!</span>
                    <h3>We couldn’t load your wishlist</h3>
                    <p>{error}</p>
                    <button className="cs-wishlist-primary" type="button" onClick={() => window.location.reload()}>Try again</button>
                  </div>
                )}
                {!loading && !error && visibleProducts.length === 0 && (
                  <div className="cs-wishlist-state cs-wishlist-empty">
                    <span className="cs-wishlist-state-icon" aria-hidden="true">♡</span>
                    <h3>{wishlist.length === 0 ? "Your wishlist is waiting" : "No saved products to show"}</h3>
                    <p>{wishlist.length === 0 ? "Tap the heart on any product you love and it will be saved here for later." : "Your saved products may no longer be available, or your current price filters may be hiding them."}</p>
                    <button
                      className="cs-wishlist-primary"
                      type="button"
                      onClick={() => {
                        setShowWishlist(false);
                        setMinPrice("");
                        setMaxPrice("");
                        setSortBy("recommended");
                        setSearch("");
                        window.location.hash = "/products";
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    >
                      Explore products <span aria-hidden="true">→</span>
                    </button>
                  </div>
                )}
                {!loading && !error && visibleProducts.length > 0 && (
                  <div className="cs-product-grid cs-all-product-grid cs-wishlist-grid">
                    {visibleProducts.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        onOpen={setSelectedProduct}
                        onAddWishlist={toggleWishlist}
                        isWishlisted={wishlist.some((id) => String(id) === String(product.id))}
                        onAddToCart={addToCart}
                      />
                    ))}
                  </div>
                )}
              </section>

              <aside className="cs-wishlist-aside">
                <div className="cs-wishlist-aside-icon" aria-hidden="true">♡</div>
                <span className="cs-wishlist-aside-kicker">YOUR PERSONAL COLLECTION</span>
                <h2>Good things are worth saving.</h2>
                <p>Your wishlist makes it easy to revisit favourite finds and add them to your bag whenever you’re ready.</p>
                <div className="cs-wishlist-aside-stat">
                  <span>Products saved</span>
                  <strong>{wishlistProducts.length}</strong>
                </div>
                <button
                  className="cs-wishlist-aside-button"
                  type="button"
                  onClick={() => {
                    setShowWishlist(false);
                    setSelectedCategory("All categories");
                    setMinPrice("");
                    setMaxPrice("");
                    setSortBy("recommended");
                    window.location.hash = "/products";
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  Discover more products <span aria-hidden="true">→</span>
                </button>
                <div className="cs-wishlist-aside-note"><span aria-hidden="true">✓</span><span>Your saved list stays on this browser after refresh.</span></div>
              </aside>
            </div>
          </section>
        ) : (
          <div className="cs-store-layout">
            {!showWishlist && <CategorySidebar categories={categories} selectedCategory={selectedCategory} onSelect={chooseCategory} />}
            <div className="cs-main-column">
              {!showWishlist && (
                <>
                  <HeroBanner
                    products={products}
                    onOpen={setSelectedProduct}
                    onShop={() => document.getElementById("products")?.scrollIntoView({ behavior: "smooth" })}
                  />
                  <ShoppingBenefits />

                  <section className="cs-featured-section" id="featured">
                    <div className="cs-featured-heading">
                      <div><h2>Featured Products</h2><p>Popular picks from the ClickStore collection</p></div>
                      <button type="button" onClick={() => document.getElementById("products")?.scrollIntoView({ behavior: "smooth" })}>View All <span aria-hidden="true">→</span></button>
                    </div>
                    {loading ? (
                      <div className="cs-featured-loading"><span className="loading-spinner" /> Loading featured products...</div>
                    ) : !error && products.length > 0 ? (
                      <div className="cs-product-grid">
                        {products.slice(0, 6).map((product) => (
                          <ProductCard
                            key={product.id}
                            product={product}
                            onOpen={setSelectedProduct}
                            onAddWishlist={toggleWishlist}
                            isWishlisted={wishlist.some((id) => String(id) === String(product.id))}
                            onAddToCart={addToCart}
                          />
                        ))}
                      </div>
                    ) : null}
                  </section>

                  <section className="cs-categories-section" id="categories">
                    <div className="cs-featured-heading"><div><h2>Shop by Category</h2><p>Choose a category to narrow down your search.</p></div></div>
                    <div className="cs-category-tiles">
                      <button type="button" className={`cs-category-tile ${selectedCategory === "All categories" ? "active" : ""}`} onClick={() => chooseCategory("All categories")}><span>▦</span><b>All Products</b><small>Explore the collection</small></button>
                      {categories.slice(0, 12).map((category) => <button key={category} type="button" className={`cs-category-tile ${selectedCategory === category ? "active" : ""}`} onClick={() => chooseCategory(category)}><span>{categoryIcon(category)}</span><b>{category}</b><small>Browse products</small></button>)}
                    </div>
                  </section>
                </>
              )}

              <section className="products-section cs-all-products" id="products">
                <div className="section-title">
                  <div>
                    <span className="eyebrow">{showWishlist ? "YOUR SAVED PICKS" : "THE CLICKSTORE COLLECTION"}</span>
                    <h2>{showWishlist ? "Your wishlist" : selectedCategory === "All categories" ? "Explore All Products" : selectedCategory}</h2>
                    <p>{loading ? "Loading products from your store..." : `${visibleProducts.length} product${visibleProducts.length === 1 ? "" : "s"} found`}</p>
                  </div>
                  <div className="product-controls cs-catalogue-filters">
                    {!showWishlist && <>
                      <label htmlFor="category-filter">Category</label>
                      <select id="category-filter" value={selectedCategory} onChange={(event) => chooseCategory(event.target.value)}>
                        <option value="All categories">All categories</option>
                        {categories.map((category) => <option key={category} value={category}>{category}</option>)}
                      </select>
                    </>}
                    <label htmlFor="sort-products">Sort</label>
                    <select id="sort-products" value={sortBy} onChange={(event) => setSortBy(event.target.value)} aria-label="Sort products">
                      <option value="recommended">Recommended</option>
                      <option value="price-low-high">Price: Low to High</option>
                      <option value="price-high-low">Price: High to Low</option>
                      <option value="name-a-z">Name: A–Z</option>
                      <option value="name-z-a">Name: Z–A</option>
                    </select>
                    <label className="cs-price-filter-label" htmlFor="min-product-price">Price ₹</label>
                    <input className="cs-price-filter-input" id="min-product-price" type="number" min="0" step="1" inputMode="numeric" value={minPrice} onChange={(event) => setMinPrice(event.target.value)} placeholder="Min" aria-label="Minimum price" />
                    <span className="cs-price-range-separator" aria-hidden="true">–</span>
                    <input className="cs-price-filter-input" id="max-product-price" type="number" min="0" step="1" inputMode="numeric" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} placeholder="Max" aria-label="Maximum price" />
                    {(minPrice !== "" || maxPrice !== "" || sortBy !== "recommended") && <button className="cs-reset-filters" type="button" onClick={resetCatalogueFilters}>Reset</button>}
                    {showWishlist && <button className="text-link" type="button" onClick={() => { setShowWishlist(false); window.location.hash = "/products"; }}>All products →</button>}
                  </div>
                </div>

                {loading && <div className="products-message"><span className="loading-spinner" /><h3>Finding your products...</h3><p>Connecting to ClickStore.</p></div>}
                {!loading && error && <div className="products-message error-message"><h3>Couldn't load products</h3><p>{error}</p><button className="button-primary" type="button" onClick={() => window.location.reload()}>Try again</button></div>}
                {!loading && !error && visibleProducts.length === 0 && <div className="products-message"><h3>{showWishlist ? "Your wishlist is empty" : search ? "No matching products found" : "No products available yet"}</h3><p>{showWishlist ? "Save a product to find it here later." : search ? "Try another product name or category." : "Add products in your backend to show them here."}</p>{(search || showWishlist) && <button className="button-secondary" type="button" onClick={() => { setSearch(""); setShowWishlist(false); }}>Browse all products</button>}</div>}
                {!loading && !error && visibleProducts.length > 0 && (
                  <div className="cs-product-grid cs-all-product-grid">
                    {visibleProducts.map((product) => <ProductCard key={product.id} product={product} onOpen={setSelectedProduct} onAddWishlist={toggleWishlist} isWishlisted={wishlist.some((id) => String(id) === String(product.id))} onAddToCart={addToCart} />)}
                  </div>
                )}
              </section>

              {!showWishlist && !loading && !error && <section className="cs-lower-promo" id="customer-support"><div><span>THE SMARTER WAY TO SHOP</span><h2>Find your next favourite.</h2><p>Browse the collection and discover more from ClickStore.</p></div><button className="cs-primary-button" type="button" onClick={() => document.getElementById("products")?.scrollIntoView({ behavior: "smooth" })}>Explore Products →</button></section>}
            </div>
          </div>
        )}

      </main>

      )}

      {!showCart && (

      <footer className="site-footer">

        <div className="footer-main">

          <div>

            <div className="footer-brand">Click<span>Store</span></div>

            <p>Your destination for everyday shopping.</p>

            <small>Shop more. Live better.</small>

          </div>

          <div>

            <b>Shop</b>

            <a href="#products" onClick={() => setShowWishlist(false)}>All products</a>

            <a href="#categories">Categories</a>

            <a href="#wishlist" onClick={() => setShowWishlist(true)}>Wishlist</a>

          </div>

          <div>

            <b>Customer service</b>

            <a href="#help">Help centre</a>

            <a href="#orders">Track orders</a>

            <a href="#returns">Returns and refunds</a>

          </div>

          <div>

            <b>About ClickStore</b>

            <a href="#about">About us</a>

            <a href="#contact">Contact</a>

            <a href="#privacy">Privacy policy</a>

          </div>

        </div>

        <div className="footer-bottom">

          <span>© {new Date().getFullYear()} ClickStore. All rights reserved.</span>

          <span>Built with care for a smarter shopping experience.</span>

        </div>

      </footer>

      )}

{showAuthModal && (

  <AuthModal

    onClose={() => setShowAuthModal(false)}

    onLoginSuccess={(session) => {

      setAuthData(session);

      setShowAuthModal(false);

      setShowProfile(false);

      const roles = session?.user?.roles || [];

      if (

        roles.some((role) =>

          ["ADMIN", "ROLE_ADMIN"].includes(role)

        )

      ) {

        window.location.hash = "/admin";

      } else {

        // Customers and sellers land on the storefront after login.

        // Approved sellers can open the dashboard from Account > Become a Seller.

        window.location.hash = "/";

      }

    }}

  />

)}

    </div>

  );

}