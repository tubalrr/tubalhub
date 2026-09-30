/* TUBAL HUB Homepage Runtime
   Extracted from index.html:
   - Shop navigation guard
   - PWA/service-worker registration
*/
(() => {
  "use strict";

  function openShop() {
    const base = document.baseURI || window.location.href;
    const target = new URL("pages/shop.html", base).href;
    window.location.assign(target);
  }

  function bindShopNavigation() {
    document.addEventListener("click", (event) => {
      const link = event.target?.closest?.('a[href$="pages/shop.html"]');
      if (!link) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      openShop();
    }, true);
  }

  function registerPwa() {
    if (!("serviceWorker" in navigator)) return;

    let version = "";
    try {
      const homeCss = document.querySelector("link[data-tubal-home-css]");
      version = homeCss ? new URL(homeCss.href, document.baseURI).searchParams.get("v") || "" : "";
    } catch (_) {}

    const swUrl = "./service-worker.js" + (version ? "?v=" + encodeURIComponent(version) : "");

    navigator.serviceWorker.register(swUrl, {scope: "./"})
      .then((registration) => registration.update())
      .catch((error) => {
        console.warn("TUBAL HUB PWA registration failed:", error);
      });
  }

  bindShopNavigation();

  if (document.readyState === "complete") {
    registerPwa();
  } else {
    window.addEventListener("load", registerPwa, {once: true});
  }
})();
