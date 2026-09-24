import { auth, onAuthStateChanged, getUserProfile } from "./auth.js";
import { db, doc, getDoc, setDoc, collection, addDoc, serverTimestamp } from "./firebase-init.js";

var WHATSAPP_NUMBER = "2349068602575"; // CHIDEX Tech Hub

var currentUser = null;
var cartItems = [];

var listEl = document.getElementById("cart-list");
var emptyEl = document.getElementById("cart-empty");
var summaryEl = document.getElementById("cart-summary");
var totalEl = document.getElementById("cart-total");
var checkoutBtn = document.getElementById("checkout-btn");
var checkoutStatus = document.getElementById("checkout-status");

function formatNaira(n) {
  return "₦" + Number(n).toLocaleString("en-NG");
}

function escapeHtml(str) {
  var div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
}

function computeTotal() {
  return cartItems.reduce(function (sum, it) { return sum + (it.price * it.qty); }, 0);
}

function render() {
  if (cartItems.length === 0) {
    listEl.innerHTML = "";
    emptyEl.classList.remove("hidden");
    summaryEl.classList.add("hidden");
    return;
  }
  emptyEl.classList.add("hidden");
  summaryEl.classList.remove("hidden");

  listEl.innerHTML = cartItems.map(function (it, i) {
    var img = it.imageUrl && it.imageUrl.trim() ? it.imageUrl : "assets/products/placeholder-accessory.svg";
    return (
      '<div class="cart-item">' +
        '<div class="cart-item-img"><img src="' + img + '" alt="' + escapeHtml(it.name) + '"></div>' +
        '<div class="cart-item-info">' +
          '<div class="cart-item-name">' + escapeHtml(it.name) + '</div>' +
          '<div class="cart-item-price">' + formatNaira(it.price) + ' × ' +
            '<button class="qty-btn" style="width:22px;height:22px;font-size:0.8rem;" data-action="dec" data-i="' + i + '">−</button> ' +
            '<span style="font-family:var(--font-mono);">' + it.qty + '</span> ' +
            '<button class="qty-btn" style="width:22px;height:22px;font-size:0.8rem;" data-action="inc" data-i="' + i + '">+</button>' +
          '</div>' +
        '</div>' +
        '<button class="cart-item-remove" data-action="remove" data-i="' + i + '">Remove</button>' +
      '</div>'
    );
  }).join("");

  totalEl.textContent = formatNaira(computeTotal());
}

async function saveCart() {
  await setDoc(doc(db, "carts", currentUser.uid), { items: cartItems, updatedAt: serverTimestamp() });
}

async function loadCart() {
  var snap = await getDoc(doc(db, "carts", currentUser.uid));
  cartItems = snap.exists() ? (snap.data().items || []) : [];
  render();
}

function buildWhatsAppMessage(profile) {
  var lines = [];
  lines.push("Hello CHIDEX Tech Hub, I'd like to order:");
  lines.push("");
  cartItems.forEach(function (it) {
    lines.push("• " + it.name + " x" + it.qty + " — " + formatNaira(it.price * it.qty));
  });
  lines.push("");
  lines.push("Total: " + formatNaira(computeTotal()));
  if (profile && profile.name) lines.push("");
  if (profile && profile.name) lines.push("Name: " + profile.name);
  if (profile && profile.phone) lines.push("Phone: " + profile.phone);
  lines.push("");
  lines.push("I'd like to confirm availability and pricing.");
  return lines.join("\n");
}

document.addEventListener("DOMContentLoaded", function () {
  listEl.addEventListener("click", function (e) {
    var btn = e.target.closest("button[data-action]");
    if (!btn) return;
    var i = parseInt(btn.dataset.i, 10);

    if (btn.dataset.action === "inc") {
      cartItems[i].qty += 1;
    } else if (btn.dataset.action === "dec") {
      cartItems[i].qty = Math.max(1, cartItems[i].qty - 1);
    } else if (btn.dataset.action === "remove") {
      cartItems.splice(i, 1);
    }
    render();
    saveCart();
  });

  checkoutBtn.addEventListener("click", async function () {
    checkoutBtn.disabled = true;
    checkoutStatus.textContent = "Preparing your order…";
    checkoutStatus.className = "form-msg";

    try {
      var profile = await getUserProfile(currentUser.uid);

      await addDoc(collection(db, "orders"), {
        uid: currentUser.uid,
        customerName: profile ? profile.name : (currentUser.displayName || ""),
        customerPhone: profile ? profile.phone : "",
        items: cartItems,
        total: computeTotal(),
        status: "pending_whatsapp",
        createdAt: serverTimestamp()
      });

      var text = buildWhatsAppMessage(profile);
      var url = "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(text);
      window.open(url, "_blank");

      checkoutStatus.textContent = "Order saved — continue in WhatsApp to confirm with us.";
      checkoutStatus.className = "form-msg success";
    } catch (err) {
      checkoutStatus.textContent = "Something went wrong saving your order. Please try again.";
      checkoutStatus.className = "form-msg error";
    } finally {
      checkoutBtn.disabled = false;
    }
  });

  onAuthStateChanged(auth, function (user) {
    if (!user) {
      window.location.href = "login.html?redirect=cart.html";
      return;
    }
    currentUser = user;
    loadCart();
  });
});
