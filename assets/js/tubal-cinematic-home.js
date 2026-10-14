/* TUBAL HUB — progressive cinematic reveal; no external dependencies. */
(() => {
  const root = document.documentElement;
  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const selectors = [
    "#bentoHero",
    ".home-quicknav",
    ".bento-feed-real",
    "#thValueTitle",
    "#thBrandPillars",
    "#ctrlzoneCard",
    ".bento-row-real",
    "#featuredWebsite",
    "#sponsoredContainerReal2",
    "#mainFooter"
  ];
  const init = () => {
    const targets = [...new Set(selectors.flatMap(selector => [...document.querySelectorAll(selector)]))];
    if (!targets.length || reduceMotion || !("IntersectionObserver" in window)) return;
    targets.forEach(el => el.classList.add("th-cinematic-reveal"));
    root.classList.add("th-cinematic-ready");
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("th-cinematic-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    targets.forEach(el => observer.observe(el));
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
