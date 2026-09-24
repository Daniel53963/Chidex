import { auth, onAuthStateChanged, isAdmin, logOut } from "./auth.js";
import { db, doc, onSnapshot } from "./firebase-init.js";

document.addEventListener("DOMContentLoaded", function () {
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.querySelector(".main-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", nav.classList.contains("open") ? "true" : "false");
    });
  }

  var path = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".main-nav a[href]").forEach(function (link) {
    if (link.getAttribute("href") === path) link.classList.add("active");
  });

  var logoutBtn = document.getElementById("nav-logout");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async function () {
      await logOut();
      window.location.href = "index.html";
    });
  }

  var navGuest = document.getElementById("nav-guest");
  var navUser = document.getElementById("nav-user");
  var navUserName = document.getElementById("nav-user-name");
  var navAdminLink = document.getElementById("nav-admin-link");
  var navOrdersLink = document.getElementById("nav-orders-link");
  var cartBadge = document.getElementById("cart-count");

  onAuthStateChanged(auth, async function (user) {
    if (user) {
      if (navGuest) navGuest.classList.add("hidden");
      if (navUser) navUser.classList.remove("hidden");
      if (navUserName) navUserName.textContent = user.displayName || user.email;

      var admin = await isAdmin(user.uid);
      if (navAdminLink) navAdminLink.classList.toggle("hidden", !admin);
      if (navOrdersLink) navOrdersLink.classList.toggle("hidden", !admin);

      if (cartBadge) {
        onSnapshot(doc(db, "carts", user.uid), function (snap) {
          var items = snap.exists() ? (snap.data().items || []) : [];
          var count = items.reduce(function (sum, it) { return sum + (it.qty || 1); }, 0);
          cartBadge.textContent = count;
          cartBadge.classList.toggle("hidden", count === 0);
        });
      }
    } else {
      if (navGuest) navGuest.classList.remove("hidden");
      if (navUser) navUser.classList.add("hidden");
      if (navAdminLink) navAdminLink.classList.add("hidden");
      if (navOrdersLink) navOrdersLink.classList.add("hidden");
      if (cartBadge) cartBadge.classList.add("hidden");
    }
  });
});
