import { auth, onAuthStateChanged, isAdmin } from "./auth.js";
import { db, collection, query, orderBy, onSnapshot, doc, updateDoc } from "./firebase-init.js";

var gateNotice = document.getElementById("gate-notice");
var ordersContent = document.getElementById("orders-content");
var tableBody = document.getElementById("orders-table-body");
var emptyState = document.getElementById("orders-empty");

function formatNaira(n) {
  return "₦" + Number(n).toLocaleString("en-NG");
}

function formatDate(ts) {
  if (!ts || !ts.toDate) return "—";
  var d = ts.toDate();
  return d.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }) +
    " · " + d.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" });
}

function escapeHtml(str) {
  var div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
}

var STATUS_LABELS = {
  pending_whatsapp: "Pending",
  contacted: "Contacted",
  completed: "Completed"
};

function statusBadgeStyle(status) {
  if (status === "completed") return "border-color:var(--success); color:var(--success);";
  if (status === "contacted") return "border-color:var(--gold); color:var(--gold-bright);";
  return "";
}

function renderOrders(orders) {
  if (orders.length === 0) {
    tableBody.innerHTML = "";
    emptyState.classList.remove("hidden");
    return;
  }
  emptyState.classList.add("hidden");

  tableBody.innerHTML = orders.map(function (o) {
    var itemsList = (o.items || []).map(function (it) {
      return escapeHtml(it.name) + " ×" + it.qty;
    }).join("<br>");

    var status = o.status || "pending_whatsapp";
    var nextStatus = status === "pending_whatsapp" ? "contacted" : (status === "contacted" ? "completed" : "pending_whatsapp");
    var nextLabel = status === "pending_whatsapp" ? "Mark contacted" : (status === "contacted" ? "Mark completed" : "Reset to pending");

    return (
      '<tr>' +
        '<td style="white-space:nowrap; font-size:0.8rem; color:var(--muted);">' + formatDate(o.createdAt) + '</td>' +
        '<td>' + escapeHtml(o.customerName || "—") + '<br><span style="font-size:0.78rem; color:var(--muted);">' + escapeHtml(o.customerPhone || "") + '</span></td>' +
        '<td style="font-size:0.85rem;">' + itemsList + '</td>' +
        '<td>' + formatNaira(o.total || 0) + '</td>' +
        '<td><span class="badge" style="' + statusBadgeStyle(status) + '">' + (STATUS_LABELS[status] || status) + '</span></td>' +
        '<td><button class="btn btn-ghost btn-sm" data-action="advance" data-id="' + o.id + '" data-next="' + nextStatus + '">' + nextLabel + '</button></td>' +
      '</tr>'
    );
  }).join("");
}

var currentOrders = [];

function watchOrders() {
  var q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
  onSnapshot(q, function (snap) {
    currentOrders = snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
    renderOrders(currentOrders);
  });
}

document.addEventListener("DOMContentLoaded", function () {
  tableBody.addEventListener("click", async function (e) {
    var btn = e.target.closest("button[data-action='advance']");
    if (!btn) return;
    btn.disabled = true;
    try {
      await updateDoc(doc(db, "orders", btn.dataset.id), { status: btn.dataset.next });
    } catch (err) {
      btn.disabled = false;
    }
  });

  onAuthStateChanged(auth, async function (user) {
    if (!user) {
      window.location.href = "login.html?redirect=orders.html";
      return;
    }
    var admin = await isAdmin(user.uid);
    if (!admin) {
      gateNotice.classList.remove("hidden");
      ordersContent.classList.add("hidden");
      return;
    }
    gateNotice.classList.add("hidden");
    ordersContent.classList.remove("hidden");
    watchOrders();
  });
});
