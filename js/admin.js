import { auth, onAuthStateChanged, isAdmin } from "./auth.js";
import {
  db, collection, addDoc, doc, setDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, serverTimestamp
} from "./firebase-init.js";

var CATEGORIES = ["Laptops", "Phones", "Tablets", "Storage", "Monitors", "Desktops", "Printers", "Accessories"];

var gateNotice = document.getElementById("gate-notice");
var adminContent = document.getElementById("admin-content");
var form = document.getElementById("product-form");
var formTitle = document.getElementById("form-title");
var formMsg = document.getElementById("form-msg");
var tableBody = document.getElementById("product-table-body");
var cancelEditBtn = document.getElementById("cancel-edit");

var editingId = null;

function formatNaira(n) {
  return "₦" + Number(n).toLocaleString("en-NG");
}

function escapeHtml(str) {
  var div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
}

function resetForm() {
  editingId = null;
  form.reset();
  formTitle.textContent = "Add a product";
  form.querySelector('button[type="submit"]').textContent = "Add product";
  cancelEditBtn.classList.add("hidden");
}

function renderTable(products) {
  if (products.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="6" style="color:var(--muted); text-align:center; padding:32px;">No products yet — add your first one on the left.</td></tr>';
    return;
  }

  tableBody.innerHTML = products.map(function (p) {
    var img = p.imageUrl && p.imageUrl.trim() ? p.imageUrl : "assets/products/placeholder-accessory.svg";
    return (
      '<tr>' +
        '<td><img src="' + img + '" alt=""></td>' +
        '<td>' + escapeHtml(p.name) + '</td>' +
        '<td><span class="badge">' + escapeHtml(p.category) + '</span></td>' +
        '<td>' + formatNaira(p.price) + '</td>' +
        '<td>' + (p.stock != null ? p.stock : "—") + '</td>' +
        '<td class="admin-actions">' +
          '<button class="btn btn-ghost btn-sm" data-action="edit" data-id="' + p.id + '">Edit</button>' +
          '<button class="btn btn-danger btn-sm" data-action="delete" data-id="' + p.id + '">Delete</button>' +
        '</td>' +
      '</tr>'
    );
  }).join("");
}

var currentProducts = [];

function watchProducts() {
  var q = query(collection(db, "products"), orderBy("createdAt", "desc"));
  onSnapshot(q, function (snap) {
    currentProducts = snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
    renderTable(currentProducts);
  });
}

function startEdit(id) {
  var p = currentProducts.find(function (x) { return x.id === id; });
  if (!p) return;
  editingId = id;
  form.name.value = p.name || "";
  form.category.value = p.category || "";
  form.price.value = p.price || "";
  form.stock.value = p.stock != null ? p.stock : "";
  form.imageUrl.value = p.imageUrl || "";
  form.description.value = p.description || "";
  formTitle.textContent = "Edit product";
  form.querySelector('button[type="submit"]').textContent = "Save changes";
  cancelEditBtn.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function deleteProduct(id) {
  if (!window.confirm("Delete this product? This can't be undone.")) return;
  await deleteDoc(doc(db, "products", id));
}

document.addEventListener("DOMContentLoaded", function () {
  CATEGORIES.forEach(function (cat) {
    var opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    form.category.appendChild(opt);
  });

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    formMsg.textContent = "";
    formMsg.className = "form-msg";

    var data = {
      name: form.name.value.trim(),
      category: form.category.value,
      price: Number(form.price.value),
      stock: form.stock.value === "" ? null : Number(form.stock.value),
      imageUrl: form.imageUrl.value.trim(),
      description: form.description.value.trim()
    };

    if (!data.name || !data.category || !data.price) {
      formMsg.textContent = "Please fill in name, category and price.";
      formMsg.className = "form-msg error";
      return;
    }

    try {
      if (editingId) {
        await updateDoc(doc(db, "products", editingId), data);
        formMsg.textContent = "Product updated.";
      } else {
        data.createdAt = serverTimestamp();
        await addDoc(collection(db, "products"), data);
        formMsg.textContent = "Product added.";
      }
      formMsg.className = "form-msg success";
      resetForm();
    } catch (err) {
      formMsg.textContent = "Couldn't save that product. Please try again.";
      formMsg.className = "form-msg error";
    }
  });

  cancelEditBtn.addEventListener("click", resetForm);

  tableBody.addEventListener("click", function (e) {
    var btn = e.target.closest("button[data-action]");
    if (!btn) return;
    if (btn.dataset.action === "edit") startEdit(btn.dataset.id);
    if (btn.dataset.action === "delete") deleteProduct(btn.dataset.id);
  });

  onAuthStateChanged(auth, async function (user) {
    if (!user) {
      window.location.href = "login.html?redirect=admin.html";
      return;
    }
    var admin = await isAdmin(user.uid);
    if (!admin) {
      gateNotice.classList.remove("hidden");
      adminContent.classList.add("hidden");
      var uidLine = document.createElement("p");
      uidLine.style.fontFamily = "var(--font-mono)";
      uidLine.style.fontSize = "0.75rem";
      uidLine.style.wordBreak = "break-all";
      uidLine.style.color = "var(--gold-bright)";
      uidLine.style.marginTop = "16px";
      uidLine.textContent = "Your UID: " + user.uid;
      gateNotice.appendChild(uidLine);

      var promoteBtn = document.createElement("button");
      promoteBtn.className = "btn btn-gold btn-sm";
      promoteBtn.style.marginTop = "18px";
      promoteBtn.textContent = "Make me admin";
      promoteBtn.addEventListener("click", async function () {
        promoteBtn.disabled = true;
        promoteBtn.textContent = "Working…";
        try {
          await setDoc(doc(db, "admins", user.uid), { isAdmin: true, promotedAt: serverTimestamp() });
          window.location.reload();
        } catch (err) {
          promoteBtn.textContent = "Couldn't do that — try again";
          promoteBtn.disabled = false;
        }
      });
      gateNotice.appendChild(promoteBtn);
      return;
    }
    gateNotice.classList.add("hidden");
    adminContent.classList.remove("hidden");
    watchProducts();
  });
});
