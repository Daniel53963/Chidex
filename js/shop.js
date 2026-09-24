import { auth, onAuthStateChanged } from "./auth.js";
import { db, collection, getDocs, doc, getDoc, setDoc, query, orderBy, serverTimestamp } from "./firebase-init.js";

var CATEGORY_PLACEHOLDER = {
  "Laptops": "assets/products/placeholder-laptop.svg",
  "Phones": "assets/products/placeholder-phone.svg",
  "Tablets": "assets/products/placeholder-tablet.svg",
  "Storage": "assets/products/placeholder-storage.svg",
  "Monitors": "assets/products/placeholder-monitor.svg",
  "Desktops": "assets/products/placeholder-desktop.svg",
  "Printers": "assets/products/placeholder-printer.svg",
  "Accessories": "assets/products/placeholder-accessory.svg"
};

var allProducts = [];
var activeCategory = "All";
var currentUser = null;

var grid = document.getElementById("product-grid");
var filterRow = document.getElementById("filter-row");
var emptyState = document.getElementById("empty-state");

function formatNaira(n) {
  return "₦" + Number(n).toLocaleString("en-NG");
}

function renderProducts() {
  var list = activeCategory === "All" ? allProducts : allProducts.filter(function (p) { return p.category === activeCategory; });

  if (list.length === 0) {
    grid.innerHTML = "";
    emptyState.classList.remove("hidden");
    return;
  }
  emptyState.classList.add("hidden");

  grid.innerHTML = list.map(function (p) {
    var img = p.imageUrl && p.imageUrl.trim() ? p.imageUrl : CATEGORY_PLACEHOLDER[p.category] || "assets/products/placeholder-accessory.svg";
    var outOfStock = Number(p.stock) <= 0;
    return (
      '<div class="product-card">' +
        '<div class="product-image"><img src="' + img + '" alt="' + escapeHtml(p.name) + '" loading="lazy"></div>' +
        '<div class="product-body">' +
          '<div class="product-cat">' + escapeHtml(p.category) + '</div>' +
          '<h3 class="product-name">' + escapeHtml(p.name) + '</h3>' +
          '<div class="product-price">' + formatNaira(p.price) + '</div>' +
          '<div class="product-stock ' + (outOfStock ? "out" : "") + '">' + (outOfStock ? "Out of stock" : (p.stock ? p.stock + " in stock" : "")) + '</div>' +
          (outOfStock
            ? '<button class="btn btn-ghost btn-block btn-sm" disabled>Out of stock</button>'
            : (
              '<div class="qty-row">' +
                '<button class="qty-btn" data-action="dec" data-id="' + p.id + '">−</button>' +
                '<span class="qty-value" id="qty-' + p.id + '">1</span>' +
                '<button class="qty-btn" data-action="inc" data-id="' + p.id + '">+</button>' +
              '</div>' +
              '<button class="btn btn-gold btn-block btn-sm" data-action="add" data-id="' + p.id + '">Add to cart</button>'
            )
          ) +
        '</div>' +
      '</div>'
    );
  }).join("");
}

function escapeHtml(str) {
  var div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
}

async function loadProducts() {
  var q = query(collection(db, "products"), orderBy("createdAt", "desc"));
  var snap = await getDocs(q);
  allProducts = snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
  renderProducts();
}

async function addToCart(productId, qty) {
  if (!currentUser) return;
  var product = allProducts.find(function (p) { return p.id === productId; });
  if (!product) return;

  var cartRef = doc(db, "carts", currentUser.uid);
  var snap = await getDoc(cartRef);
  var items = snap.exists() ? (snap.data().items || []) : [];

  var existing = items.find(function (it) { return it.productId === productId; });
  if (existing) {
    existing.qty += qty;
  } else {
    items.push({
      productId: productId,
      name: product.name,
      price: product.price,
      category: product.category,
      imageUrl: product.imageUrl || "",
      qty: qty
    });
  }

  await setDoc(cartRef, { items: items, updatedAt: serverTimestamp() });

  var btn = document.querySelector('[data-action="add"][data-id="' + productId + '"]');
  if (btn) {
    var original = btn.textContent;
    btn.textContent = "Added ✓";
    setTimeout(function () { btn.textContent = original; }, 1200);
  }
}

document.addEventListener("DOMContentLoaded", function () {
  filterRow.addEventListener("click", function (e) {
    var chip = e.target.closest(".filter-chip");
    if (!chip) return;
    document.querySelectorAll(".filter-chip").forEach(function (c) { c.classList.remove("active"); });
    chip.classList.add("active");
    activeCategory = chip.dataset.category;
    renderProducts();
  });

  grid.addEventListener("click", function (e) {
    var btn = e.target.closest("button[data-action]");
    if (!btn) return;
    var id = btn.dataset.id;
    var qtyEl = document.getElementById("qty-" + id);

    if (btn.dataset.action === "inc" && qtyEl) {
      qtyEl.textContent = parseInt(qtyEl.textContent, 10) + 1;
    } else if (btn.dataset.action === "dec" && qtyEl) {
      qtyEl.textContent = Math.max(1, parseInt(qtyEl.textContent, 10) - 1);
    } else if (btn.dataset.action === "add") {
      var qty = qtyEl ? parseInt(qtyEl.textContent, 10) : 1;
      addToCart(id, qty);
    }
  });

  onAuthStateChanged(auth, function (user) {
    if (!user) {
      window.location.href = "login.html?redirect=shop.html";
      return;
    }
    currentUser = user;
    loadProducts();
  });
});
