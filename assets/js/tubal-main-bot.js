(() => {
  "use strict";

  const fallback = {
    version: "current",
    latest: "TUBAL HUB currently connects its main branches and core community services."
  };

  const q = (id) => document.getElementById(id);

  async function getRelease() {
    try {
      const response = await fetch(`version.json?mainbot=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) throw new Error("release fetch failed");
      const data = await response.json();
      const updates = Array.isArray(data.updatesReal) ? data.updatesReal : [];
      return {
        version: String(data.version || "current"),
        latest: String(updates[0] || fallback.latest)
          .replace(/^v\d+\.\d+\.\d+\s*/i, "")
          .replace(/^\b(FEAT|FIX|UI|SECURITY|ADMIN|BUILD|CLEANUP|REFACTOR|AUDIT|PERF|META)\b\s*[—:-]?\s*/i, "")
      };
    } catch (_) {
      return fallback;
    }
  }

  function buildMessage(release, isNew) {
    const updateLine = isNew
      ? `A new TUBAL HUB update is available: version ${release.version}. ${release.latest}`
      : `The current TUBAL HUB release is version ${release.version}. The latest update is: ${release.latest}`;

    return (
      "Welcome to TUBAL HUB. This is the main hub for our digital ecosystem. " +
      "Payapang Isip is the wellness branch for journals, wellness tools, AI music, and calm digital experiences. " +
      "TUBAL HUB Shop is the commerce branch for real products and digital offerings, including the Kapeng Barako featured store. " +
      "Gaming Zone is the gaming branch for official game links, featured sessions, and gaming content. " +
      "You can also explore Feeds, News, Community, Profiles, AI Music, LifeHub, Personal OS, and other connected services from the main navigation. " +
      updateLine +
      " Explore the hub and choose the area that matches what you need."
    );
  }

  function init() {
    const root = q("tubalMainBot");
    const toggle = q("tubalMainBotToggle");
    const bubble = q("tubalMainBotBubble");
    const listen = q("tubalMainBotListen");
    const replay = q("tubalMainBotReplay");
    const text = q("tubalMainBotText");
    if (!root || !toggle || !bubble || !listen) return;

    if (!("speechSynthesis" in window)) {
      listen.disabled = true;
      return;
    }

    let voice = null;
    let spokenAutomatically = false;
    let message = "Welcome to TUBAL HUB.";

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
        utterance.rate = 0.94;
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

      message = buildMessage(release, isNew);
      if (text) {
        text.textContent = isNew
          ? `New update detected · v${release.version}. ${release.latest}`
          : `Current release · v${release.version}. ${release.latest}`;
      }

      // Automatically open the floating bot and start its English welcome narration on entry.
      bubble.hidden = false;
      toggle.setAttribute("aria-expanded", "true");
      window.setTimeout(() => {
        if (!spokenAutomatically) {
          spokenAutomatically = true;
          speak();
        }
      }, 850);

      // Fallback for browsers that block speech autoplay.
      const gestureFallback = () => {
        if (!speechSynthesis.speaking && !spokenAutomatically) {
          spokenAutomatically = true;
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
