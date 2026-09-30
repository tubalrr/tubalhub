/* TUBAL HUB Admin — Maintenance Control */
import { auth } from "../assets/js/firebase-config.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  Timestamp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

(() => {
  "use strict";

  const db = getFirestore();
  const $ = (id) => document.getElementById(id);

  function toast(message) {
    const fn = window.toast;
    if (typeof fn === "function") return fn(message);
    const status = $("maintenanceStatus");
    if (status) status.textContent = message;
  }

  function toDate(value) {
    if (!value) return null;
    if (typeof value?.toDate === "function") return value.toDate();
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function toInput(value) {
    const date = toDate(value);
    if (!date) return "";
    const pad = (n) => String(n).padStart(2, "0");
    return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate()) +
      "T" + pad(date.getHours()) + ":" + pad(date.getMinutes());
  }

  function fromInput(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : Timestamp.fromDate(date);
  }

  function parseAllowedUsers(value) {
    return [...new Set(
      String(value || "")
        .split(/\s*[,\n]\s*/)
        .map((item) => item.trim())
        .filter(Boolean)
    )].slice(0, 25);
  }

  function formatStatus(data) {
    if (!data?.enabled) return "Maintenance mode is OFF.";
    const start = toDate(data.startAt);
    const end = toDate(data.endAt);
    const now = Date.now();
    if (start && now < start.getTime()) return "Maintenance is SCHEDULED to start " + start.toLocaleString("en-PH") + ".";
    if (end && now >= end.getTime()) return "Maintenance window has ended.";
    return "Maintenance mode is ON.";
  }

  function render(data) {
    $("maintenanceMode").checked = data?.enabled === true;
    $("maintenanceTitle").value = String(data?.title || "We’ll be back soon");
    $("maintenanceMessage").value = String(data?.message || "TUBAL HUB is temporarily under maintenance while we improve the platform.");
    $("maintenanceStartAt").value = toInput(data?.startAt);
    $("maintenanceEndAt").value = toInput(data?.endAt);
    $("maintenanceAllowedUsers").value = Array.isArray(data?.allowedAdminUsers) ? data.allowedAdminUsers.join("\n") : "";
    $("maintenanceStatus").textContent = formatStatus(data);

    const uid = auth.currentUser?.uid || "Secure session";
    $("maintenanceCurrentUid").textContent = uid;
  }

  async function load() {
    try {
      const snap = await getDoc(doc(db, "systemSettings", "maintenance"));
      render(snap.exists() ? (snap.data() || {}) : { enabled: false });
    } catch (error) {
      $("maintenanceStatus").textContent = "Unable to load maintenance settings.";
      console.warn("[TUBAL HUB admin maintenance]", error);
    }
  }

  async function save() {
    const user = auth.currentUser;
    if (!user) return toast("Admin session not ready.");

    const startValue = $("maintenanceStartAt").value;
    const endValue = $("maintenanceEndAt").value;
    const startAt = fromInput(startValue);
    const endAt = fromInput(endValue);

    if (startValue && !startAt) return toast("Invalid maintenance start date/time.");
    if (endValue && !endAt) return toast("Invalid maintenance end date/time.");
    if (startAt && endAt && endAt.toMillis() <= startAt.toMillis()) {
      return toast("End date/time must be later than Start date/time.");
    }

    const allowedAdminUsers = parseAllowedUsers($("maintenanceAllowedUsers").value);
    const payload = {
      enabled: $("maintenanceMode").checked === true,
      title: String($("maintenanceTitle").value || "We’ll be back soon").trim().slice(0, 120),
      message: String($("maintenanceMessage").value || "").trim().slice(0, 500),
      startAt,
      endAt,
      allowedAdminUsers,
      updatedAt: serverTimestamp(),
      updatedBy: user.uid
    };

    try {
      await setDoc(doc(db, "systemSettings", "maintenance"), payload, { merge: true });
      $("maintenanceAllowedUsers").value = allowedAdminUsers.join("\n");
      $("maintenanceStatus").textContent = formatStatus({ ...payload, updatedAt: new Date() });
      toast("Maintenance settings saved to Firestore.");
    } catch (error) {
      toast(error?.message || "Unable to save maintenance settings.");
      console.warn("[TUBAL HUB admin maintenance save]", error);
    }
  }

  function addCurrentUid() {
    const uid = auth.currentUser?.uid;
    if (!uid) return toast("Admin session not ready.");
    const users = parseAllowedUsers($("maintenanceAllowedUsers").value);
    if (!users.includes(uid)) users.push(uid);
    $("maintenanceAllowedUsers").value = users.slice(0, 25).join("\n");
    toast("Current admin UID added to Allowed Admin Users.");
  }

  function clearSchedule() {
    $("maintenanceStartAt").value = "";
    $("maintenanceEndAt").value = "";
    toast("Maintenance schedule cleared. Save to apply.");
  }

  $("maintenanceSave")?.addEventListener("click", () => save().catch((error) => toast(error?.message || "Save failed.")));
  $("maintenanceAddCurrentUid")?.addEventListener("click", addCurrentUid);
  $("maintenanceClearSchedule")?.addEventListener("click", clearSchedule);

  onAuthStateChanged(auth, (user) => {
    if (user) {
      $("maintenanceCurrentUid").textContent = user.uid;
      load();
    }
  });

  auth.authStateReady?.().then(load).catch(() => {});
})();
