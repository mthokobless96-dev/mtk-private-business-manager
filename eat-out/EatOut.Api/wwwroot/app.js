const menuElement = document.querySelector("#menu");
const statusElement = document.querySelector("#status");
const ownerButton = document.querySelector("#ownerButton");
const ownerDialog = document.querySelector("#ownerDialog");
const itemDialog = document.querySelector("#itemDialog");
const order = new Map();
const MENU_STORAGE_KEY = "eat-out-public-menu-v1";
const ORDER_STORAGE_KEY = "eat-out-customer-order-v1";
const SETTINGS_STORAGE_KEY = "eat-out-public-settings-v1";
let menuItems = [];
let isOwner = false;
let setupRequired = false;
let whatsappNumber = "";
let deferredInstallPrompt = null;
let toastTimer;
let refreshInProgress = false;
let menuRefreshInProgress = false;
let menuServedFromCache = false;

try {
  const savedSettings = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) || "null");
  if (typeof savedSettings?.whatsappNumber === "string") {
    whatsappNumber = savedSettings.whatsappNumber;
  }
} catch (error) {
  console.warn("Could not read the saved Eat Out order settings.", error);
}

function readStoredMenu() {
  try {
    const stored = JSON.parse(localStorage.getItem(MENU_STORAGE_KEY) || "null");
    if (!Array.isArray(stored) || stored.some(item =>
      !Number.isInteger(item.id) ||
      typeof item.name !== "string" ||
      typeof item.description !== "string" ||
      typeof item.category !== "string" ||
      !Number.isFinite(item.price) ||
      typeof item.isAvailable !== "boolean"
    )) return [];
    return stored.filter(item => item.isAvailable);
  } catch (error) {
    console.warn("Could not read the saved Eat Out menu.", error);
    return [];
  }
}

function storeMenu(items) {
  try {
    localStorage.setItem(MENU_STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    console.warn("Could not save the Eat Out menu on this phone.", error);
  }
}

function readStoredOrder() {
  try {
    const stored = JSON.parse(localStorage.getItem(ORDER_STORAGE_KEY) || "[]");
    if (!Array.isArray(stored)) return;
    for (const [id, quantity] of stored) {
      if (Number.isInteger(id) && Number.isInteger(quantity) && quantity > 0) order.set(id, quantity);
    }
  } catch (error) {
    console.warn("Could not restore the saved Eat Out order.", error);
  }
}

function storeOrder() {
  try {
    localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify([...order.entries()]));
  } catch (error) {
    console.warn("Could not save the Eat Out order on this phone.", error);
  }
}

readStoredOrder();

const money = amount => new Intl.NumberFormat("en-ZA", {
  style: "currency",
  currency: "ZAR",
  minimumFractionDigits: 2
}).format(amount);

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    ...(url === "/api/menu" ? { cache: "no-store" } : {}),
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers
    }
  });
  if (url === "/api/menu") {
    menuServedFromCache = response.headers.get("X-Eat-Out-Offline") === "true";
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message || `Request failed (${response.status}). Please try again.`);
  }
  return response.status === 204 ? null : response.json();
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("visible"), 2500);
}

function updateOwnerControls() {
  ownerButton.textContent = isOwner ? "Owner mode on" : "Owner sign in";
  document.querySelector("#ownerPanel").classList.toggle("hidden", !isOwner);
  renderMenu();
}

function renderMenu() {
  if (!menuItems.length) {
    menuElement.innerHTML = navigator.onLine
      ? '<p class="empty-menu">The menu is being prepared. Please check back soon.</p>'
      : '<p class="empty-menu">Connect to the internet once to save the menu on this phone for offline use.</p>';
    return;
  }

  const categories = new Map();
  for (const item of menuItems) {
    if (!categories.has(item.category)) categories.set(item.category, []);
    categories.get(item.category).push(item);
  }

  menuElement.innerHTML = [...categories.entries()].map(([category, items]) => `
    <section class="menu-section" aria-label="${escapeHtml(category)}">
      <h2 class="section-title">${escapeHtml(category)}</h2>
      ${items.map(item => {
        const quantity = order.get(item.id) || 0;
        return `<article class="menu-item">
          <div class="item-copy">
            <span class="item-name">${escapeHtml(item.name)}</span>
            ${item.description ? `<span class="item-description">${escapeHtml(item.description)}</span>` : ""}
          </div>
          <span class="item-price">${money(item.price)}</span>
          ${isOwner
            ? `<button class="owner-edit" type="button" data-edit="${item.id}" aria-label="Edit ${escapeHtml(item.name)}">Edit</button>`
            : `<button class="add-button" type="button" data-add="${item.id}" aria-label="Add ${escapeHtml(item.name)} to your order">${quantity ? quantity : "+"}</button>`}
        </article>`;
      }).join("")}
    </section>`).join("");
}

function renderOrder() {
  const orderSection = document.querySelector("#order");
  const lines = [...order.entries()]
    .map(([id, quantity]) => ({ item: menuItems.find(item => item.id === id), quantity }))
    .filter(line => line.item);
  orderSection.classList.toggle("hidden", lines.length === 0);
  if (!lines.length) return;

  document.querySelector("#orderItems").innerHTML = lines.map(({ item, quantity }) => `
    <div class="order-row">
      <span>${escapeHtml(item.name)}</span>
      <div class="quantity" aria-label="${quantity} ordered">
        <button type="button" data-quantity="${item.id}" data-change="-1" aria-label="Remove one ${escapeHtml(item.name)}">−</button>
        <span>${quantity}</span>
        <button type="button" data-quantity="${item.id}" data-change="1" aria-label="Add one ${escapeHtml(item.name)}">+</button>
      </div>
      <strong>${money(item.price * quantity)}</strong>
    </div>`).join("");
  const total = lines.reduce((sum, line) => sum + line.item.price * line.quantity, 0);
  document.querySelector("#orderTotal").textContent = money(total);
}

function addToOrder(id, change = 1) {
  const quantity = Math.max(0, (order.get(id) || 0) + change);
  if (quantity) order.set(id, quantity);
  else order.delete(id);
  storeOrder();
  renderMenu();
  renderOrder();
}

function getOrderMessage() {
  const lines = [...order.entries()]
    .map(([id, quantity]) => ({ item: menuItems.find(item => item.id === id), quantity }))
    .filter(line => line.item);
  const total = lines.reduce((sum, line) => sum + line.item.price * line.quantity, 0);
  return [
    "Hi Eat Out! I'd like to order:",
    ...lines.map(({ item, quantity }) => `${quantity} × ${item.name} — ${money(item.price * quantity)}`),
    `Total: ${money(total)}`
  ].join("\n");
}

async function loadApp() {
  if (refreshInProgress) return;
  refreshInProgress = true;
  menuItems = readStoredMenu();
  renderMenu();
  renderOrder();
  statusElement.textContent = menuItems.length
    ? "Showing your saved menu while checking for updates…"
    : "Loading the menu…";
  try {
    const [menuResult, configResult, ownerResult] = await Promise.allSettled([
      api("/api/menu"),
      api("/api/config"),
      api("/api/owner/session")
    ]);

    if (menuResult.status === "fulfilled") {
      menuItems = menuResult.value.filter(item => item.isAvailable);
      storeMenu(menuResult.value);
      for (const id of order.keys()) {
        if (!menuItems.some(item => item.id === id)) order.delete(id);
      }
      storeOrder();
      statusElement.textContent = menuServedFromCache || !navigator.onLine
        ? "Offline — showing the last menu saved on this phone. Reconnect for current prices."
        : "";
      statusElement.removeAttribute("role");
    } else if (menuItems.length) {
      statusElement.textContent = "Offline — showing the last menu saved on this phone. Reconnect for current prices.";
      statusElement.setAttribute("role", "status");
    } else {
      throw menuResult.reason;
    }

    if (configResult.status === "fulfilled") {
      whatsappNumber = configResult.value.whatsappNumber;
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(configResult.value));
      } catch (error) {
        console.warn("Could not save the Eat Out order settings on this phone.", error);
      }
    } else {
      console.warn("Could not load optional Eat Out order settings.", configResult.reason);
    }

    if (ownerResult.status === "fulfilled") {
      isOwner = ownerResult.value.isOwner;
      setupRequired = ownerResult.value.setupRequired;
    } else {
      isOwner = false;
      console.warn("Could not load the optional Eat Out owner session.", ownerResult.reason);
    }

    updateOwnerControls();
    renderOrder();
  } catch (error) {
    statusElement.textContent = `Could not load the menu. ${error.message}`;
    statusElement.setAttribute("role", "alert");
    renderMenu();
  } finally {
    refreshInProgress = false;
  }
}

async function refreshMenuForCustomers() {
  if (!navigator.onLine || menuRefreshInProgress || refreshInProgress || document.visibilityState === "hidden") return;
  menuRefreshInProgress = true;
  try {
    const updatedItems = (await api("/api/menu", { cache: "no-store" }))
      .filter(item => item.isAvailable);
    if (menuServedFromCache) return;
    const previousMenu = JSON.stringify(menuItems);
    const updatedMenu = JSON.stringify(updatedItems);
    if (previousMenu === updatedMenu) return;

    menuItems = updatedItems;
    storeMenu(updatedItems);
    for (const id of order.keys()) {
      if (!menuItems.some(item => item.id === id)) order.delete(id);
    }
    storeOrder();
    renderMenu();
    renderOrder();
    statusElement.textContent = "Menu updated — showing the latest prices.";
    statusElement.setAttribute("role", "status");
    window.setTimeout(() => {
      if (statusElement.textContent === "Menu updated — showing the latest prices.") {
        statusElement.textContent = "";
      }
    }, 3500);
  } catch (error) {
    console.warn("Could not refresh the Eat Out menu.", error);
  } finally {
    menuRefreshInProgress = false;
  }
}

function openOwnerDialog() {
  document.querySelector("#ownerForm").reset();
  document.querySelector("#ownerError").textContent = "";
  document.querySelector("#ownerPassword").minLength = setupRequired ? 12 : 1;
  document.querySelector("#ownerPassword").autocomplete = setupRequired ? "new-password" : "current-password";
  document.querySelector("#ownerFormEyebrow").textContent = setupRequired ? "FIRST-TIME SETUP" : "OWNER ACCESS";
  document.querySelector("#ownerFormTitle").textContent = setupRequired ? "Create your owner password" : "Sign in to edit your menu";
  document.querySelector("#ownerFormCopy").textContent = setupRequired
    ? "Choose a strong password. Only the owner can add menu items or change prices."
    : "Menu prices and items can only be changed by the owner.";
  document.querySelector("#ownerPasswordLabel").textContent = setupRequired ? "Create owner password" : "Owner password";
  document.querySelector("#setupHint").classList.toggle("hidden", !setupRequired);
  document.querySelector("#ownerSubmit").textContent = setupRequired ? "Create password" : "Sign in";
  ownerDialog.showModal();
  document.querySelector("#ownerPassword").focus();
}

function openItemDialog(item) {
  document.querySelector("#itemForm").reset();
  document.querySelector("#itemError").textContent = "";
  document.querySelector("#itemId").value = item?.id ?? "";
  document.querySelector("#itemName").value = item?.name ?? "";
  document.querySelector("#itemDescription").value = item?.description ?? "";
  document.querySelector("#itemCategory").value = item?.category ?? "Toasted Kota";
  document.querySelector("#itemPrice").value = item?.price ?? "";
  document.querySelector("#itemFormTitle").textContent = item ? "Edit menu item" : "Add a menu item";
  itemDialog.showModal();
  document.querySelector("#itemName").focus();
}

document.querySelector("#ownerButton").addEventListener("click", () => {
  if (isOwner) {
    document.querySelector("#ownerPanel").scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  openOwnerDialog();
});

document.querySelectorAll("[data-close]").forEach(button => {
  button.addEventListener("click", () => document.getElementById(button.dataset.close).close());
});

document.querySelector("#ownerForm").addEventListener("submit", async event => {
  event.preventDefault();
  const errorElement = document.querySelector("#ownerError");
  errorElement.textContent = "";
  const password = document.querySelector("#ownerPassword").value;
  try {
    await api(setupRequired ? "/api/owner/setup" : "/api/owner/login", {
      method: "POST",
      body: JSON.stringify({ password })
    });
    isOwner = true;
    setupRequired = false;
    ownerDialog.close();
    updateOwnerControls();
    showToast("Owner mode is on.");
  } catch (error) {
    errorElement.textContent = error.message;
  }
});

document.querySelector("#ownerLogout").addEventListener("click", async () => {
  try {
    await api("/api/owner/logout", { method: "POST" });
    isOwner = false;
    updateOwnerControls();
    showToast("Signed out.");
  } catch (error) {
    showToast(error.message);
  }
});

document.querySelector("#addItemButton").addEventListener("click", () => openItemDialog());

document.querySelector("#itemForm").addEventListener("submit", async event => {
  event.preventDefault();
  const errorElement = document.querySelector("#itemError");
  errorElement.textContent = "";
  const id = document.querySelector("#itemId").value;
  const body = {
    name: document.querySelector("#itemName").value.trim(),
    description: document.querySelector("#itemDescription").value.trim(),
    category: document.querySelector("#itemCategory").value.trim(),
    price: Number(document.querySelector("#itemPrice").value)
  };
  try {
    const saved = await api(id ? `/api/menu/${encodeURIComponent(id)}` : "/api/menu", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(body)
    });
    const index = menuItems.findIndex(item => item.id === saved.id);
    if (index >= 0) menuItems[index] = saved;
    else menuItems.push(saved);
    menuItems.sort((left, right) => left.sortOrder - right.sortOrder || left.id - right.id);
    storeMenu(menuItems);
    itemDialog.close();
    renderMenu();
    statusElement.textContent = "Menu updated — customers will see these changes when their menu refreshes.";
    statusElement.setAttribute("role", "status");
    showToast(id ? "Menu item updated." : "Menu item added.");
  } catch (error) {
    errorElement.textContent = error.message;
    if (error.message.includes("401")) {
      isOwner = false;
      updateOwnerControls();
    }
  }
});

menuElement.addEventListener("click", event => {
  const addButton = event.target.closest("[data-add]");
  if (addButton) addToOrder(Number(addButton.dataset.add));
  const editButton = event.target.closest("[data-edit]");
  if (editButton && isOwner) {
    const item = menuItems.find(candidate => candidate.id === Number(editButton.dataset.edit));
    if (item) openItemDialog(item);
  }
});

document.querySelector("#orderItems").addEventListener("click", event => {
  const button = event.target.closest("[data-quantity]");
  if (button) addToOrder(Number(button.dataset.quantity), Number(button.dataset.change));
});

document.querySelector("#clearOrder").addEventListener("click", () => {
  order.clear();
  storeOrder();
  renderMenu();
  renderOrder();
});

document.querySelector("#shareOrder").addEventListener("click", async () => {
  const message = getOrderMessage();
  if (whatsappNumber) {
    window.open(`https://wa.me/${encodeURIComponent(whatsappNumber)}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
    return;
  }
  if (navigator.share) {
    try {
      await navigator.share({ title: "Eat Out order", text: message });
    } catch (error) {
      if (error.name !== "AbortError") showToast("Could not open the share menu. Please try again.");
    }
    return;
  }
  try {
    await navigator.clipboard.writeText(message);
    showToast("Order copied. Paste it into WhatsApp.");
  } catch {
    showToast("Please select and copy your order to share it.");
  }
});

window.addEventListener("online", () => {
  document.querySelector("#offlineNote").classList.add("hidden");
  loadApp();
});
window.addEventListener("focus", refreshMenuForCustomers);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") refreshMenuForCustomers();
});
window.setInterval(refreshMenuForCustomers, 30_000);
window.addEventListener("offline", () => {
  document.querySelector("#offlineNote").classList.remove("hidden");
  if (menuItems.length) {
    statusElement.textContent = "Offline — showing the last menu saved on this phone.";
    statusElement.setAttribute("role", "status");
  }
});
if (!navigator.onLine) document.querySelector("#offlineNote").classList.remove("hidden");

window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  deferredInstallPrompt = event;
  document.querySelector("#installButton").classList.remove("hidden");
});

document.querySelector("#installButton").addEventListener("click", async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  document.querySelector("#installButton").classList.add("hidden");
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(error => {
    console.error("Could not enable offline app-shell support.", error);
  });
}

loadApp();
