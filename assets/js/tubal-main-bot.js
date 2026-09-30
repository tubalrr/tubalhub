(() => {
  "use strict";

  const fallback = {
    version: "current",
    latest: "The current release information is temporarily unavailable."
  };

  const el = (id) => document.getElementById(id);

  async function getRelease() {
    try {
      const response = await fetch(`version.json?mainbot=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) throw new Error("release fetch failed");
      const data = await response.json();
      const updates = Array.isArray(data.updatesReal) ? data.updatesReal : [];
      const latest = String(updates[0] || fallback.latest)
        .replace(/^v\d+\.\d+\.\d+\s*/i, "")
        .replace(/^\b(FEAT|FIX|UI|SECURITY|ADMIN|BUILD|CLEANUP|REFACTOR|AUDIT|PERF|META)\b\s*[—:-]?\s*/i, "")
        .trim();
      return { version: String(data.version || "current"), latest };
    } catch (_) {
      return fallback;
    }
  }

  function buildFullGuide(release, isNew) {
    const updateLine = isNew
      ? `There is a new TUBAL HUB update: version ${release.version}. ${release.latest}`
      : `The current TUBAL HUB release is version ${release.version}. The latest release note says: ${release.latest}`;

    return [
      "Welcome to TUBAL HUB. This bot is your full site guide.",
      "TUBAL HUB is a connected digital ecosystem with three main branches.",
      "First, Payapang Isip is the wellness branch. It contains breathing and grounding activities, journals, calm digital experiences, AI Music, and other wellness-focused tools.",
      "Second, TUBAL HUB Shop is the commerce branch. It contains the shared product catalog, physical products, digital products, apps and software, gaming-related products, mods and add-ons, media, wellness items, and the featured Kapeng Barako storefront.",
      "Third, Gaming Zone is the gaming branch. It is for game discovery, featured sessions, official game links, and gaming-focused content.",
      "Kapeng Barako is a featured brand inside TUBAL HUB, with its own dedicated landing page and live shop connection.",
      "The main site also includes Feeds for posts and community content; News and Announcements for stories and official notices; Events and Live for scheduled activities and live sessions; Community and Global Chat for user interaction; Profiles and Friends for member activity; AI Music for music creation and playback; LifeHub and Personal OS for personal organization; TUBAL Academy for learning; and Library for saved content.",
      "The site also provides Login and Sign Up, Settings for profile, theme, notifications, privacy, sound, language, and account controls, plus Help, FAQ, Contact, and informational pages.",
      "There are also Privacy, Cookies, Terms, License, Copyright, and Community Guidelines pages so visitors can understand how the platform is used and how content is handled.",
      "Here are the important rules. Do not harass, threaten, bully, impersonate other people, spam, scam, post unlawful material, distribute malicious code, or deliberately disrupt the service.",
      "Do not bypass authentication, access another user's account, interfere with databases or APIs, scan or attack the service, or introduce malware or other harmful code.",
      "Do not upload content you do not have the right to share. Do not redistribute, resell, modify, or claim ownership of protected digital content when the applicable license or purchase terms do not allow it.",
      "AI and automated features can be inaccurate. Do not treat automated output as professional legal, medical, financial, or other specialized advice.",
      updateLine,
      "Whenever the site publishes a newer release, this bot checks version.json and updates its welcome message so visitors can hear what changed.",
      "Choose any area of TUBAL HUB from the navigation and explore."
    ].join(" ");
  }

  function init() {
    const root = el("tubalMainBot");
    const toggle = el("tubalMainBotToggle");
    const bubble = el("tubalMainBotBubble");
    const listen = el("tubalMainBotListen");
    const replay = el("tubalMainBotReplay");
    const text = el("tubalMainBotText");
    const title = el("tubalMainBotTitle");

    if (!root || !toggle || !bubble || !listen) return;

    if (!("speechSynthesis" in window)) {
      listen.disabled = true;
      if (text) text.textContent = "Browser speech synthesis is not available. The guide is still visible here.";
      return;
    }

    let voice = null;
    let spokeEntry = false;
    let message = "Welcome to TUBAL HUB. This bot is your full site guide.";

    const loadVoice = () => {
      const voices = speechSynthesis.getVoices();
      voice =
        voices.find(v => /^en-US$/i.test(v.lang)) ||
        voices.find(v => /^en-GB$/i.test(v.lang)) ||
        voices.find(v => /^en(-|_)/i.test(v.lang)) ||
        null;
    };

    const setSpeaking = (active) => {
      toggle.classList.toggle("is-speaking", active);
      listen.textContent = active ? "🔊 Speaking…" : "🔊 Listen";
    };

    const speak = () => {
      try {
        loadVoice();
        speechSynthesis.cancel();
        speechSynthesis.resume();

        const utterance = new SpeechSynthesisUtterance(message);
        utterance.lang = "en-US";
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 1;
        if (voice) utterance.voice = voice;

        setSpeaking(true);
        utterance.onend = () => setSpeaking(false);
        utterance.onerror = () => setSpeaking(false);
        speechSynthesis.speak(utterance);
      } catch (_) {
        setSpeaking(false);
      }
    };

    toggle.addEventListener("click", () => {
      const opening = bubble.hidden;
      bubble.hidden = !opening;
      toggle.setAttribute("aria-expanded", String(opening));
      if (opening && !speechSynthesis.speaking) speak();
    });

    listen.addEventListener("click", speak);
    replay?.addEventListener("click", speak);
    loadVoice();
    speechSynthesis.addEventListener?.("voiceschanged", loadVoice);

    (async () => {
      const release = await getRelease();
      let isNew = false;

      try {
        const seen = sessionStorage.getItem("tubal_main_bot_seen_version");
        isNew = Boolean(seen && release.version !== "current" && seen !== release.version);
        sessionStorage.setItem("tubal_main_bot_seen_version", release.version);
      } catch (_) {}

      message = buildFullGuide(release, isNew);

      if (title) title.textContent = isNew ? "New update detected" : "Welcome to TUBAL HUB";
      if (text) {
        text.textContent = isNew
          ? `New update · v${release.version}. The bot will explain the full site and what changed.`
          : `Current release · v${release.version}. Full site guide, rules, and latest update included.`;
      }

      // Open the floating guide and attempt automatic narration on every homepage entry.
      bubble.hidden = false;
      toggle.setAttribute("aria-expanded", "true");
      window.setTimeout(() => {
        if (!spokeEntry) {
          spokeEntry = true;
          speak();
        }
      }, 800);

      // Browser autoplay fallback: first user interaction activates speech when autoplay is blocked.
      const gestureFallback = () => {
        if (!speechSynthesis.speaking && !spokeEntry) {
          spokeEntry = true;
          speak();
        }
      };
      document.addEventListener("pointerdown", gestureFallback, { once: true, passive: true });
      document.addEventListener("keydown", gestureFallback, { once: true });
    })();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
