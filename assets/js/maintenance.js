/* TUBAL HUB — Firestore-controlled maintenance mode */
(() => {
  "use strict";

  if (location.pathname.includes("/admin/")) return;

  const CONFIG_PATH = ["systemSettings", "maintenance"];
  let currentConfig = null;
  let boundaryTimer = null;
  let unsubscribe = null;

  const $ = (id) => document.getElementById(id);

  function toDate(value) {
    if (!value) return null;
    if (typeof value?.toDate === "function") return value.toDate();
    if (value instanceof Date) return value;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function normalizedList(value) {
    return Array.isArray(value)
      ? [...new Set(value.map((entry) => String(entry || "").trim()).filter(Boolean))]
      : [];
  }

  function isAllowedAdmin(user, allowedUsers) {
    if (!user) return false;
    const allowed = normalizedList(allowedUsers);
    return allowed.includes(user.uid);
  }

  function isMaintenanceActive(config) {
    if (!config?.enabled) return false;

    const now = Date.now();
    const start = toDate(config.startAt);
    const end = toDate(config.endAt);

    if (start && now < start.getTime()) return false;
    if (end && now >= end.getTime()) return false;
    return true;
  }

  function clearBoundaryTimer() {
    if (boundaryTimer) {
      clearTimeout(boundaryTimer);
      boundaryTimer = null;
    }
  }

  function scheduleBoundary(config, render) {
    clearBoundaryTimer();

    const now = Date.now();
    const boundaries = [toDate(config?.startAt), toDate(config?.endAt)]
      .filter(Boolean)
      .map((date) => date.getTime())
      .filter((time) => time > now)
      .sort((a, b) => a - b);

    if (!boundaries.length) return;

    const delay = Math.min(Math.max(boundaries[0] - now + 50, 250), 2147483647);
    boundaryTimer = setTimeout(() => {
      boundaryTimer = null;
      render();
      scheduleBoundary(config, render);
    }, delay);
  }

  function ensureOverlay() {
    let overlay = document.getElementById("tubalMaintenanceOverlay");
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.id = "tubalMaintenanceOverlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "TUBAL HUB maintenance");
    overlay.innerHTML =
      '<div class="tubal-maintenance-card">' +
        '<div class="tubal-maintenance-logo-wrap">' +
          '<img class="tubal-maintenance-logo" src="/tubalhub/tubal-hub-logo.png" alt="TUBAL HUB" width="68" height="68">' +
        '</div>' +
        '<div class="tubal-maintenance-kicker">TUBAL HUB</div>' +
        '<h1 id="tubalMaintenanceTitle">We’ll be back soon</h1>' +
        '<p id="tubalMaintenanceMessage"></p>' +
        '<div class="tubal-maintenance-window" id="tubalMaintenanceWindow"></div>' +
        '<small>Please check back when the site is available again.</small>' +
      '</div>';

    document.body.appendChild(overlay);
    return overlay;
  }

  function removeOverlay() {
    document.getElementById("tubalMaintenanceOverlay")?.remove();
  }

  function render(user) {
    const config = currentConfig || {};
    const active = isMaintenanceActive(config);
    const allowed = isAllowedAdmin(user, config.allowedAdminUsers);

    if (!active || allowed) {
      removeOverlay();
      return;
    }

    const overlay = ensureOverlay();
    const message = String(config.message || "").trim() ||
      "TUBAL HUB is temporarily under maintenance while we improve the platform.";

    const title = String(config.title || "We’ll be back soon").trim() || "We’ll be back soon";
    const start = toDate(config.startAt);
    const end = toDate(config.endAt);

    const titleEl = overlay.querySelector("#tubalMaintenanceTitle");
    const messageEl = overlay.querySelector("#tubalMaintenanceMessage");
    const windowEl = overlay.querySelector("#tubalMaintenanceWindow");

    if (titleEl) titleEl.textContent = title;
    if (messageEl) messageEl.textContent = message;

    if (windowEl) {
      const parts = [];
      if (start) parts.push("Start: " + start.toLocaleString("en-PH"));
      if (end) parts.push("End: " + end.toLocaleString("en-PH"));
      windowEl.textContent = parts.join(" • ");
      windowEl.hidden = !parts.length;
    }

    scheduleBoundary(config, () => render(window.__tubalHubMaintenanceUser || null));
  }

  async function start() {
    try {
      const { app, auth } = await import("./firebase-config.js");
      const { getFirestore, doc, onSnapshot } = await import(
        "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js"
      );
      const { onAuthStateChanged } = await import(
        "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js"
      );

      const db = getFirestore(app);

      unsubscribe = onSnapshot(
        doc(db, ...CONFIG_PATH),
        (snap) => {
          currentConfig = snap.exists() ? (snap.data() || {}) : null;
          render(window.__tubalHubMaintenanceUser || null);
        },
        () => {
          currentConfig = null;
          clearBoundaryTimer();
          removeOverlay();
        }
      );

      onAuthStateChanged(auth, (user) => {
        window.__tubalHubMaintenanceUser = user || null;
        render(user || null);
      });

      auth.authStateReady?.().then(() => {
        window.__tubalHubMaintenanceUser = auth.currentUser || null;
        render(auth.currentUser || null);
      }).catch(() => {});
    } catch (error) {
      console.warn("[TUBAL HUB maintenance]", error);
      removeOverlay();
    }
  }

  window.addEventListener("beforeunload", () => {
    clearBoundaryTimer();
    unsubscribe?.();
  }, { once: true });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
