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
      "Welcome to TUBAL HUB. I am your Welcome Bot.",
      "I will automatically guide you around the Hub and explain what is available.",
      "TUBAL HUB is a connected digital ecosystem with three main branches.",
      "Payapang Isip is the wellness branch with breathing and grounding activities, journals, calm digital experiences, AI Music, and wellness-focused tools.",
      "TUBAL HUB Shop is the commerce branch with the shared product catalog, physical and digital offerings, gaming products, mods and add-ons, media, wellness items, and the featured Kapeng Barako storefront.",
      "Gaming Zone is the gaming branch for game discovery, featured sessions, official game links, and gaming-focused content.",
      "Kapeng Barako is a featured brand inside TUBAL HUB with its own dedicated landing page and live shop connection.",
      "The main site also includes Feeds, News and Announcements, Events and Live, Community and Global Chat, Profiles and Friends, AI Music, LifeHub, Personal OS, TUBAL Academy, and Library.",
      "Login, Sign Up, Settings, Help, FAQ, Contact, Privacy, Cookies, Terms, License, Copyright, and Community Guidelines are also available.",
      "Please follow the site rules. Do not harass, threaten, bully, impersonate, spam, scam, post unlawful material, distribute malicious code, bypass authentication, access another user's account, attack the service, or upload content you do not have the right to share.",
      "AI and automated features can be inaccurate, so specialized decisions should be checked with qualified professionals.",
      updateLine,
      "Whenever the site publishes a newer release, I read version.json and automatically announce what changed.",
      "Enjoy exploring TUBAL HUB."
    ].join(" ");
  }

  function init() {
    const root = el("tubalMainBot");
    const toggle = el("tubalMainBotToggle");
    const bubble = el("tubalMainBotBubble");
    const sound = el("tubalMainBotSound");
    const text = el("tubalMainBotText");
    const title = el("tubalMainBotTitle");

    if (!root || !toggle || !bubble || !sound) return;

    const speechAvailable = "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;

    let voice = null;
    let message = "Welcome to TUBAL HUB. I am your Welcome Bot.";
    let initialized = false;
    let gestureFallbackBound = false;

    let muted = false;
    try {
      muted = localStorage.getItem("tubal_welcome_bot_muted") === "1";
    } catch (_) {}

    const setMutedUI = () => {
      sound.setAttribute("aria-pressed", String(muted));
      sound.setAttribute("aria-label", muted ? "Unmute Welcome Bot voice" : "Mute Welcome Bot voice");
      sound.title = muted ? "Unmute Welcome Bot voice" : "Mute Welcome Bot voice";
      root.classList.toggle("is-muted", muted);
      if (muted && speechAvailable) {
        speechSynthesis.cancel();
      }
    };

    const loadVoice = () => {
      if (!speechAvailable) return;
      const voices = speechSynthesis.getVoices();
      voice =
        voices.find(v => /^en-US$/i.test(v.lang)) ||
        voices.find(v => /^en-GB$/i.test(v.lang)) ||
        voices.find(v => /^en(-|_)/i.test(v.lang)) ||
        voices[0] ||
        null;
    };

    const setSpeaking = (active) => {
      root.classList.toggle("is-speaking", active && !muted);
      root.classList.toggle("is-idle", !active || muted);
    };

    const speak = () => {
      if (!speechAvailable || muted || !message) return;

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

    const armGestureFallback = () => {
      if (gestureFallbackBound || !speechAvailable || muted) return;
      gestureFallbackBound = true;

      const fallback = () => {
        if (!muted && !speechSynthesis.speaking) speak();
        document.removeEventListener("pointerdown", fallback);
        document.removeEventListener("keydown", fallback);
      };

      document.addEventListener("pointerdown", fallback, { once: true, passive: true });
      document.addEventListener("keydown", fallback, { once: true });
    };

    sound.addEventListener("click", (event) => {
      event.stopPropagation();
      muted = !muted;

      try {
        localStorage.setItem("tubal_welcome_bot_muted", muted ? "1" : "0");
      } catch (_) {}

      if (muted) {
        if (speechAvailable) speechSynthesis.cancel();
        setSpeaking(false);
      } else if (initialized) {
        speak();
      }
      setMutedUI();
    });

    toggle.addEventListener("click", (event) => {
      if (event.target === sound || sound.contains(event.target)) return;
      bubble.hidden = !bubble.hidden;
      toggle.setAttribute("aria-expanded", String(!bubble.hidden));
      if (!muted && !speechAvailable) return;
    });

    setMutedUI();

    if (!speechAvailable) {
      root.classList.add("speech-unavailable");
      if (text) text.textContent = "Voice narration is not available in this browser, but the Welcome Bot guide remains visible.";
      return;
    }

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
          ? `New update · v${release.version}. I will automatically explain what changed and guide you around the site.`
          : `Current release · v${release.version}. I automatically explain the Hub, rules, and latest update.`;
      }

      bubble.hidden = false;
      toggle.setAttribute("aria-expanded", "true");
      initialized = true;

      if (!muted) {
        window.setTimeout(() => {
          if (!muted && !speechSynthesis.speaking) speak();
          armGestureFallback();
        }, 500);
      }
    })();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();