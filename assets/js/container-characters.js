(() => {
  "use strict";

  if (window.__tubalContainerCharactersLoaded) return;
  window.__tubalContainerCharactersLoaded = true;

  const SELECTORS = [
    ".bento-home-page .bento-card",
    ".bento-home-page .glass-card-real",
    ".bento-home-page .glass-section",
    ".bento-home-page .th-pillar",
    ".bento-home-page .th-target-grid-card",
    ".bento-home-page .sponsored-container-real",
    ".bento-home-page #ctrlzoneCard",
    ".bento-home-page .featured-slide",
    ".bento-home-page .th-branch-card",
    ".bento-home-page .th-kapeng-highlight",
    ".bento-home-page .featured-preview-card",
    ".bento-home-page .featured-feature-card",
    ".bento-home-page .brand-card",
    ".bento-home-page .live-card",
    ".bento-home-page .social-card",
    ".bento-home-page .journal-card",
    ".bento-home-page .music-real-card",
    ".bento-home-page .game-feature-card",
    ".bento-home-page .feed-card",
    ".bento-home-page .real-data-card",
    ".bento-home-page .video-card"
  ].join(",");

  const personSvg = () => `
    <svg viewBox="0 0 78 48" role="img" aria-label="Animated male and female characters" focusable="false">
      <defs>
        <linearGradient id="thFemaleDress" x1="0" x2="1">
          <stop offset="0" stop-color="#8b6cff"/>
          <stop offset="1" stop-color="#bf9cff"/>
        </linearGradient>
        <linearGradient id="thMaleTop" x1="0" x2="1">
          <stop offset="0" stop-color="#3d79ff"/>
          <stop offset="1" stop-color="#6fa0ff"/>
        </linearGradient>
        <filter id="thPeopleGlow" x="-40%" y="-60%" width="180%" height="220%">
          <feGaussianBlur stdDeviation="2.2"/>
        </filter>
      </defs>

      <ellipse class="th-character-aura" cx="27" cy="43" rx="13" ry="3.4" fill="rgba(138,108,255,.26)" filter="url(#thPeopleGlow)"/>
      <ellipse class="th-character-aura" cx="53" cy="43" rx="13" ry="3.4" fill="rgba(61,121,255,.24)" filter="url(#thPeopleGlow)"/>

      <!-- Female -->
      <g class="th-container-person th-container-female">
        <circle cx="27" cy="12" r="6.3" fill="#f3c6ad" class="th-face"/>
        <path d="M20.5 11.5c.4-5.3 3-8.2 7.2-7.5 3.2.5 5 3 5 6.3-2.2-1.8-4.2-2.6-6.2-2.4-1.7.2-3.5 1.4-6 3.6Z" fill="#2a2434"/>
        <circle cx="24.8" cy="12.2" r=".7" fill="#17131d"/>
        <circle cx="29.4" cy="12.2" r=".7" fill="#17131d"/>
        <path d="M25 15c1 .8 2.8.8 3.8 0" fill="none" stroke="#9b5f65" stroke-width=".8" stroke-linecap="round"/>
        <path d="M19 24c1.8-4.5 4.6-6.4 8-6.4s6.2 1.9 8 6.4l-2.5 14H21.5Z" fill="url(#thFemaleDress)" stroke="rgba(255,255,255,.25)" stroke-width="1"/>
        <path class="th-character-arm-f" d="M32.8 23.2c3.5-.7 5.3-2.8 6.3-6" fill="none" stroke="#f3c6ad" stroke-width="3" stroke-linecap="round"/>
        <path d="M24 37.5 22.2 44M30 37.5 32 44" stroke="#d9b0a0" stroke-width="2.3" stroke-linecap="round"/>
        <path d="M19.8 44h5.2M29.2 44h5.1" stroke="#17131d" stroke-width="2.2" stroke-linecap="round"/>
      </g>

      <!-- Male -->
      <g class="th-container-person th-container-male">
        <circle cx="53" cy="11.5" r="6.3" fill="#c98f6d" class="th-face"/>
        <path d="M47 10.8c.2-4.4 2.7-7.3 6.7-7.3 3.8 0 6.2 2.5 6.6 6.2-2.5-2.2-4.1-2.7-6.1-2.6-2.1.1-4.3 1.4-7.2 3.7Z" fill="#202229"/>
        <circle cx="50.7" cy="11.8" r=".7" fill="#111318"/>
        <circle cx="55.4" cy="11.8" r=".7" fill="#111318"/>
        <path d="M51 14.4c1 .6 2.5.6 3.5 0" fill="none" stroke="#7b4f48" stroke-width=".8" stroke-linecap="round"/>
        <path d="M45 23.5c1.7-4 4.3-5.8 8-5.8s6.3 1.8 8 5.8l-2 14.5H47Z" fill="url(#thMaleTop)" stroke="rgba(255,255,255,.25)" stroke-width="1"/>
        <path class="th-character-arm-m" d="M46.4 23.6c-3.3-.7-5.3-2.5-6.1-5.2" fill="none" stroke="#c98f6d" stroke-width="3" stroke-linecap="round"/>
        <path d="M50.5 37.5 49 44M56 37.5 57.8 44" stroke="#b9795a" stroke-width="2.4" stroke-linecap="round"/>
        <path d="M46.5 44h5.2M55.5 44h5.1" stroke="#171a21" stroke-width="2.2" stroke-linecap="round"/>
      </g>
    </svg>
  `;

  function addCharacters(container, index) {
    if (!(container instanceof HTMLElement) || container.querySelector(".th-container-people")) return;

    const wrap = document.createElement("div");
    wrap.className = "th-container-people";
    wrap.dataset.characterIndex = String(index);
    wrap.innerHTML = personSvg();

    container.appendChild(wrap);

    // Slightly different timing keeps the whole page from moving in sync.
    const delay = (index % 6) * 0.22;
    wrap.style.setProperty("--th-character-delay", `${delay}s`);
  }

  function scan() {
    document.querySelectorAll(SELECTORS).forEach((node, index) => addCharacters(node, index));
  }

  scan();

  const observer = new MutationObserver(() => scan());
  observer.observe(document.body, { childList: true, subtree: true });

  window.setTimeout(scan, 500);
  window.setTimeout(scan, 1500);
})();
