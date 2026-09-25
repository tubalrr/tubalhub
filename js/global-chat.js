/* TUBAL HUB — GLOBAL CHAT PREMIUM UI
   UI enhancement only. Real messages/presence/auth remain backed by the existing
   Firebase Global Chat implementation in pages/chat.html.
   No hardcoded community messages or fake online users are generated here.
*/
(() => {
  "use strict";

  const CHANNELS = {
    general: "Global Chat",
    "payapang-isip": "# payapang-isip",
    ctrlzone: "# ctrlzone",
    "shop-talk": "# shop-talk",
    announcements: "# announcements"
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  function safeJson(raw, fallback = null) {
    try {
      return raw ? JSON.parse(raw) : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function realUserName() {
    const keys = [
      "tubalhub_user_real",
      "tubal_username",
      "tubalhub_username_real",
      "user_real",
      "username"
    ];

    for (const key of keys) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = safeJson(raw, raw);
      const value =
        typeof parsed === "string"
          ? parsed
          : parsed?.nameReal || parsed?.displayName || parsed?.username || parsed?.name || "";
      const clean = String(value || "").trim();
      if (clean) return /rr/i.test(clean) ? "RR Tubal" : clean;
    }

    const profile = $("#profileName");
    return String(profile?.textContent || "").trim();
  }

  function wireSidebarToggle() {
    const toggle = $("#sidebarToggle");
    const rail = $("#chatLeftRail");
    if (!toggle || !rail || toggle.dataset.ready === "1") return;
    toggle.dataset.ready = "1";

    const setOpen = (open) => {
      const mobile = window.matchMedia?.("(max-width:900px)").matches;
      if (mobile) rail.classList.toggle("open", open);
      else rail.classList.toggle("global-chat-sidebar-collapsed", !open);
      toggle.classList.toggle("is-active", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    };

    toggle.addEventListener("click", () => {
      const mobile = window.matchMedia?.("(max-width:900px)").matches;
      const open = mobile
        ? rail.classList.contains("open")
        : !rail.classList.contains("global-chat-sidebar-collapsed");
      setOpen(!open);
    });

    $("#closeLeftRail")?.addEventListener("click", () => setOpen(false));

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && window.matchMedia?.("(max-width:900px)").matches) {
        setOpen(false);
      }
    });

    window.addEventListener("resize", () => {
      if (!window.matchMedia?.("(max-width:900px)").matches) {
        rail.classList.remove("open");
        rail.classList.remove("global-chat-sidebar-collapsed");
        toggle.classList.remove("is-active");
        toggle.setAttribute("aria-expanded", "true");
      }
    }, { passive: true });

    // Desktop keeps the rail visible by default. Mobile starts closed.
    if (window.matchMedia?.("(max-width:900px)").matches) setOpen(false);
    else setOpen(true);
  }

  function wireChannels() {
    const buttons = $$(".channelReal");
    if (!buttons.length) return;

    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        const channel = button.dataset.channel || "general";
        if (typeof window.tubalHubSetChatChannelReal === "function") {
          window.tubalHubSetChatChannelReal(channel);
        }
        const title = $("#globalChatChannelTitle");
        if (title) title.textContent = CHANNELS[channel] || "Global Chat";
      });
    });
  }

  async function loadVersionBadge() {
    const badge = $("#globalChatVersionBadge");
    const marker = $("#chatBuildMarkerReal");
    const title = $("#globalChatVersionTitle");

    let version = "1.2.10";
    let build = "2026-09-25_1015";

    try {
      const response = await fetch("../version.json?v=1.2.10&t=" + Date.now(), { cache: "no-store" });
      if (!response.ok) throw new Error("version " + response.status);
      const data = await response.json();
      if (String(data?.version || "").trim()) version = String(data.version).trim();
      if (String(data?.build || "").trim()) build = String(data.build).trim();
    } catch (_) {}

    if (badge) badge.textContent = "● LIVE v" + version;
    if (marker) marker.textContent = "Today • v" + version + " • build " + build;
    if (title) title.textContent = "Global Chat • v" + version;
  }

  function syncRealProfileHeader() {
    const name = realUserName();
    const profileName = $("#profileName");
    if (name && profileName && profileName.textContent.trim() !== name) profileName.textContent = name;

    const status = $("#profileStatus");
    if (status && /checking/i.test(status.textContent || "")) status.textContent = "● Online";
  }

  function closeLegacyHardcodedLabels() {
    // Prevent stale copy from older chat markup while retaining real Firebase data.
    const debug = $("#presenceDebug");
    if (debug && /checking/i.test(debug.textContent || "")) {
      debug.textContent = "Live presence • Firebase";
    }
  }

  function markPremium() {
    document.body.classList.add("global-chat-premium-ready");
  }

  function init() {
    markPremium();
    wireSidebarToggle();
    wireChannels();
    syncRealProfileHeader();
    closeLegacyHardcodedLabels();
    loadVersionBadge();

    window.addEventListener("storage", syncRealProfileHeader);
    window.addEventListener("focus", syncRealProfileHeader, { passive: true });

    // Do not fabricate a typing indicator. Only real Firebase events belong in chat.
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();

/* Shared real moderation + rate-limit guard for Global Chat messages and replies. */
(() => {
  const BANNED_WORDS_REAL = [
    "fuck","fucking","shit","bitch","asshole","bastard","damn",
    "putangina","puta","gago","tanga","bobo","ulol","tarantado","leche","bwisit","buwisit","hayop","hinayupak",
    "p*tangina","p*tang ina","putang ina","g*go","t*nga","b*bo","bw3sit","bwesit"
  ];
  const normalize = (value) => String(value || "").toLowerCase().replace(/[0@]/g,"o").replace(/[1!|]/g,"i").replace(/[3]/g,"e").replace(/[4@]/g,"a").replace(/[$5]/g,"s").replace(/[7]/g,"t").replace(/[._*\-]+/g,"").replace(/\s+/g," ").trim();
  const escapeRegex = (value) => String(value).replace(/[.*+?^$()|[\]\\]/g,"\\$&");
  const patterns = BANNED_WORDS_REAL.map(word => new RegExp("(?<![a-z0-9])" + escapeRegex(word).replace(/\\s+/g,"\\\\s*") + "(?![a-z0-9])","i"));
  function moderateTextReal(textReal){
    const raw = String(textReal || "");
    if(!raw.trim()) return {allowed:false,reason:"Empty",cleanText:"",hadBadWord:false};
    const normalized = normalize(raw);
    const found = BANNED_WORDS_REAL.find((word,index) => patterns[index].test(raw) || patterns[index].test(normalized));
    if(!found) return {allowed:true,reason:"",cleanText:raw.trim(),hadBadWord:false};
    return {allowed:false,reason:found,cleanText:"",hadBadWord:true};
  }
  function isRateLimitedReal(uid){
    const safeUid = String(uid || "").trim();
    if(!safeUid) return false;
    const key = "tubalhub_ratelimit_" + safeUid;
    const now = Date.now();
    const last = Number(localStorage.getItem(key) || 0);
    if(now - last < 2000) return true;
    localStorage.setItem(key,String(now));
    return false;
  }
  window.tubalHubChatGuardReal = Object.freeze({moderateTextReal,isRateLimitedReal});
})();
