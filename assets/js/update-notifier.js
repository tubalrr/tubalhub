(() => {
  if (window.__tubalHubUpdateNotifierLoaded) return;
  window.__tubalHubUpdateNotifierLoaded = true;

  const script = document.currentScript;
  const scriptUrl = script ? new URL(script.src, document.baseURI) : new URL("assets/js/update-notifier.js", document.baseURI);
  const rootUrl = new URL("../../", scriptUrl);
  const versionUrl = new URL("version.json", rootUrl).href;
  const indexUrl = new URL("index.html", rootUrl).href;
  const componentUrl = new URL("components/update-notifier.html", rootUrl).href;
  const cssUrl = new URL("assets/css/update-notifier.css", rootUrl).href;
  const VERSION_KEY = "tubalhub_version";
  const UPDATE_KEY = "tubalhub_has_update";
  const INDEX_SIG_KEY = "tubalhub_index_signature";
  const LAST_EVENT_KEY = "tubalhub_update_event";
  const POLL_MS = 30000;
  const TOAST_MS = 30000;

  let remoteVersion = null;
  let remoteSignature = "";
  let toastTimer = null;
  let bannerDismissed = false;
  let loadedUi = false;
  let applying = false;
  let channel = null;

  const $ = id => document.getElementById(id);

  function ensureCss() {
    if (document.querySelector('link[data-tubal-update-css]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = cssUrl + "?v=" + encodeURIComponent(Date.now());
    link.dataset.tubalUpdateCss = "1";
    document.head.appendChild(link);
  }

  function ensureVersionLink() {
    if (document.querySelector('link[data-tubal-version-json]')) return;
    const link = document.createElement("link");
    link.rel = "alternate";
    link.type = "application/json";
    link.href = versionUrl;
    link.dataset.tubalVersionJson = "1";
    document.head.appendChild(link);
  }

  async function loadUi() {
    ensureCss();
    ensureVersionLink();
    if (document.querySelector("#thUpdateBanner")) { loadedUi = true; return; }
    const holder = document.querySelector("#update-banner");
    if (!holder) return;
    const response = await fetch(componentUrl, {cache:"no-store"});
    if (!response.ok) throw new Error("Update notifier UI unavailable: " + response.status);
    holder.innerHTML = await response.text();
    loadedUi = true;
    bindUi();
    setVersionBadge(localStorage.getItem(VERSION_KEY) || "—", "current");
  }

  function setVersionBadge(version, state="current") {
    const badge = $("thVersionBadge"), text = $("thVersionText");
    if (!badge || !text) return;
    text.textContent = "v" + (version || "—");
    badge.classList.toggle("is-update", state === "update");
    badge.classList.toggle("is-current", state !== "update");
  }

  async function ensureUiReady() {
    if (loadedUi) return true;
    try { await loadUi(); return true; } catch (error) {
      console.warn("[TUBAL HUB update notifier]", error);
      return false;
    }
  }

  function buildMessage(data) {
    return (data?.message || "A new TUBAL HUB website update is ready.") + " • v" + (data?.version || "—");
  }

  async function addNotificationCenterEntry(data) {
    try {
      const mod = await import(new URL("assets/js/notifications.js", rootUrl).href);
      if (typeof mod.addNotification === "function") {
        await mod.addNotification({
          type:"system",
          icon:"🚀",
          title:"Website Updated!",
          message:data.message || "",
          time:"Just now",
          unread:true,
          action:"Refresh"
        });
      }
    } catch (error) {
      window.dispatchEvent(new CustomEvent("tubalhub:update-notification", {detail:data}));
    }
  }

  function notifyChannel(data) {
    try { channel?.postMessage({type:"website-update",data}); } catch (_) {}
  }

  function showRealUpdateNotify(data, source="poll") {
    if (!data || !data.version || applying) return;
    const eventKey = String(data.version) + "|" + String(data.time || "");
    if (localStorage.getItem(LAST_EVENT_KEY) === eventKey && source === "poll") return;
    localStorage.setItem(UPDATE_KEY, "true");
    localStorage.setItem(LAST_EVENT_KEY, eventKey);
    remoteVersion = data.version;
    remoteSignature = data.signature || remoteSignature;
    notifyChannel(data);
    ensureUiReady().then(ok => {
      if (!ok) return;
      const banner = $("thUpdateBanner"), toast = $("thUpdateToast");
      if (!banner || !toast) return;
      $("thUpdateBannerMessage").textContent = buildMessage(data);
      $("thUpdateToastVersion").textContent = "v" + data.version;
      $("thUpdateToastMessage").textContent = data.message || "A new website update is ready.";
      setVersionBadge(data.version, "update");
      banner.hidden = false;
      toast.hidden = false;
      requestAnimationFrame(() => {
        banner.classList.add("is-open");
        toast.classList.add("is-open");
      });
      const progress = $("thUpdateToastProgress");
      progress?.classList.remove("is-running");
      void progress?.offsetWidth;
      progress?.classList.add("is-running");
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => {
        toast.classList.remove("is-open");
        setTimeout(() => { toast.hidden = true; }, 220);
      }, TOAST_MS);
    });
    addNotificationCenterEntry(data);
  }

  function setCurrentState(data, signature) {
    remoteVersion = data.version;
    remoteSignature = signature || "";
    localStorage.setItem(VERSION_KEY, data.version);
    if (signature) localStorage.setItem(INDEX_SIG_KEY, signature);
    localStorage.removeItem(UPDATE_KEY);
    setVersionBadge(data.version, "current");
  }

  async function fetchVersion() {
    const response = await fetch(versionUrl + "?t=" + Date.now(), {cache:"no-store"});
    if (!response.ok) throw new Error("version.json " + response.status);
    const data = await response.json();
    if (!data?.version) throw new Error("version.json missing version");
    return data;
  }

  async function fetchIndexSignature() {
    try {
      const response = await fetch(indexUrl + "?t=" + Date.now(), {method:"HEAD",cache:"no-store"});
      return response.headers.get("etag") || response.headers.get("last-modified") || "";
    } catch (_) { return ""; }
  }

  function compareAndNotify(versionData, signature) {
    const localVersion = localStorage.getItem(VERSION_KEY);
    const savedSignature = localStorage.getItem(INDEX_SIG_KEY) || "";
    if (!localVersion) {
      setCurrentState(versionData, signature);
      return;
    }
    const versionChanged = versionData.version !== localVersion;
    const signatureChanged = Boolean(signature && savedSignature && signature !== savedSignature);
    if (versionChanged || signatureChanged) {
      const payload = {...versionData,signature};
      showRealUpdateNotify(payload);
      return;
    }
    setVersionBadge(versionData.version, "current");
  }

  async function poll() {
    try {
      const [versionData,signature] = await Promise.all([fetchVersion(),fetchIndexSignature()]);
      compareAndNotify(versionData,signature);
    } catch (error) {
      console.warn("[TUBAL HUB update check]", error);
    }
  }

  async function refreshNow() {
    if (applying) return;
    applying = true;
    await ensureUiReady();
    const overlay = $("thUpdateOverlay");
    const banner = $("thUpdateBanner");
    const toast = $("thUpdateToast");
    if (overlay) { overlay.hidden = false; requestAnimationFrame(() => overlay.classList.add("is-open")); }
    banner?.classList.remove("is-open");
    toast?.classList.remove("is-open");
    if (banner) setTimeout(() => { banner.hidden = true; }, 220);
    if (toast) setTimeout(() => { toast.hidden = true; }, 220);

    try {
      const [versionData] = await Promise.all([fetchVersion(), new Promise(resolve => setTimeout(resolve, 0))]);
      localStorage.setItem(VERSION_KEY, versionData.version);
      localStorage.removeItem(UPDATE_KEY);
      if (remoteSignature) localStorage.setItem(INDEX_SIG_KEY, remoteSignature);
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(key => caches.delete(key)));
      }
      if (navigator.serviceWorker) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(reg => reg.unregister()));
      }
    } catch (error) {
      console.warn("[TUBAL HUB update refresh]", error);
    }
    try {
      location.reload(true);
    } catch (_) {
      location.href = location.href.split("#")[0];
    }
  }

  function dismissBanner() {
    bannerDismissed = true;
    const banner = $("thUpdateBanner");
    banner?.classList.remove("is-open");
    setTimeout(() => { if (banner) banner.hidden = true; }, 220);
  }

  function dismissToast() {
    const toast = $("thUpdateToast");
    toast?.classList.remove("is-open");
    clearTimeout(toastTimer);
    setTimeout(() => { if (toast) toast.hidden = true; }, 220);
  }

  function bindUi() {
    $("thUpdateRefreshTop")?.addEventListener("click",refreshNow);
    $("thUpdateRefreshToast")?.addEventListener("click",refreshNow);
    $("thUpdateDismissTop")?.addEventListener("click",dismissBanner);
    $("thUpdateDismissToast")?.addEventListener("click",dismissToast);
    $("thUpdateLater")?.addEventListener("click",dismissToast);
  }

  function listenServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.addEventListener("controllerchange",() => {
      if (!applying) poll();
    });
    navigator.serviceWorker.ready.then(reg => {
      reg.addEventListener("updatefound",() => {
        const worker = reg.installing;
        if (!worker) return;
        worker.addEventListener("statechange",() => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) {
            poll();
          }
        });
      });
    }).catch(() => {});
  }

  function openChannel() {
    if (!("BroadcastChannel" in window)) return;
    try {
      channel = new BroadcastChannel("tubalhub_update");
      channel.addEventListener("message",event => {
        if (event.data?.type === "website-update" && event.data.data) {
          showRealUpdateNotify(event.data.data,"broadcast");
        }
      });
    } catch (_) {}
  }

  async function init() {
    await ensureUiReady();
    openChannel();
    listenServiceWorker();
    await poll();
    setInterval(poll,POLL_MS);
  }

  init();
})();