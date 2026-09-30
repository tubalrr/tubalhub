(() => {
  const fallbackMessage =
    "Welcome to TUBAL DARK. This is the gaming edition of TUBAL HUB. " +
    "The Vault has three main rooms. Gaming Setups and Gear is for hardware, peripherals, " +
    "performance accessories, and gaming station essentials. Scripts and Custom Tools is for " +
    "legitimate digital utilities, configuration helpers, diagnostics, optimization tools, and " +
    "macros for permitted workflows. Simulation and Modding Hub is for supported simulation builds, " +
    "visual packs, community add-ons, presets, world projects, and creative customization. " +
    "You can also use the Community area to connect with other users and the Updates area to see the latest releases. " +
    "Choose a room and explore TUBAL DARK.";

  const details = {
    gear: "Gaming Setups and Gear: hardware, peripherals, performance accessories, and setup essentials for a cleaner gaming station.",
    tools: "Scripts and Custom Tools: legitimate digital utilities, configuration helpers, diagnostics, optimization tools, and macros for permitted workflows.",
    modding: "Simulation and Modding Hub: supported simulation builds, visual packs, community add-ons, presets, world projects, compatibility checks, and creative customization.",
    community: "Community: a place to connect with other TUBAL HUB users.",
    updates: "Updates: the latest TUBAL DARK and TUBAL HUB release information."
  };

  function cleanUpdateText(text) {
    return String(text || "")
      .replace(/^v\d+\.\d+\.\d+\s*/i, "")
      .replace(/^\b(FEAT|FIX|UI|SECURITY|ADMIN|BUILD|CLEANUP|REFACTOR|AUDIT|PERF|META)\b\s*[—:-]?\s*/i, "")
      .trim();
  }

  async function getLatestRelease() {
    try {
      const url = `version.json?t=${Date.now()}`;
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error("version fetch failed");
      const data = await response.json();
      const version = String(data.version || "unknown");
      const list = Array.isArray(data.updatesReal) ? data.updatesReal : [];
      const latest = list.length ? cleanUpdateText(list[0]) : "No release note is available yet.";
      return { version, latest };
    } catch (_) {
      return { version: "unknown", latest: "The latest release note could not be loaded right now." };
    }
  }

  function buildMessage(release, isNewUpdate) {
    const updateIntro = isNewUpdate
      ? `There is a new TUBAL DARK update: version ${release.version}. ${release.latest} `
      : `The current TUBAL DARK release is version ${release.version}. The latest update is: ${release.latest} `;

    return (
      "Welcome to TUBAL DARK. This is the gaming edition of TUBAL HUB. " +
      details.gear + " " +
      details.tools + " " +
      details.modding + " " +
      details.community + " " +
      details.updates + " " +
      updateIntro +
      "Choose a room and explore TUBAL DARK."
    );
  }

  function initDarkBot() {
    const speakBtn = document.getElementById("tdSpeakBtn");
    const replayBtn = document.getElementById("tdReplayBtn");
    const botFace = document.querySelector(".td-welcome-bot-face");
    const updateEl = document.getElementById("tdWelcomeUpdate");
    if (!speakBtn) return;

    if (!("speechSynthesis" in window)) {
      speakBtn.disabled = true;
      if (updateEl) updateEl.textContent = "Browser speech synthesis is not available.";
      return;
    }

    let voice = null;
    let hasSpokenAutomatically = false;
    let currentMessage = fallbackMessage;
    let releaseInfo = { version: "unknown", latest: "" };

    const loadVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      voice =
        voices.find(v => /^en-US$/i.test(v.lang)) ||
        voices.find(v => /^en-GB$/i.test(v.lang)) ||
        voices.find(v => /^en(-|_)/i.test(v.lang)) ||
        null;
    };

    const setSpeakingState = (speaking) => {
      speakBtn.classList.toggle("is-speaking", speaking);
      botFace?.classList.toggle("is-speaking", speaking);
      speakBtn.textContent = speaking ? "🔊 Speaking…" : "🔊 Listen";
    };

    const speak = (source = "manual") => {
      try {
        loadVoice();
        window.speechSynthesis.cancel();
        window.speechSynthesis.resume();

        const utterance = new SpeechSynthesisUtterance(currentMessage);
        utterance.lang = "en-US";
        utterance.rate = 0.95;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        if (voice) utterance.voice = voice;

        setSpeakingState(true);
        utterance.onend = () => setSpeakingState(false);
        utterance.onerror = () => setSpeakingState(false);
        window.speechSynthesis.speak(utterance);

        if (source === "auto") hasSpokenAutomatically = true;
      } catch (_) {
        setSpeakingState(false);
      }
    };

    loadVoice();
    window.speechSynthesis.addEventListener?.("voiceschanged", loadVoice);

    speakBtn.addEventListener("click", () => speak("manual"));
    replayBtn?.addEventListener("click", () => speak("manual"));

    (async () => {
      releaseInfo = await getLatestRelease();

      let isNewUpdate = false;
      try {
        const seenVersion = sessionStorage.getItem("tubaldark_last_seen_version");
        isNewUpdate = Boolean(releaseInfo.version !== "unknown" && seenVersion && seenVersion !== releaseInfo.version);
        sessionStorage.setItem("tubaldark_last_seen_version", releaseInfo.version);
      } catch (_) {}

      currentMessage = buildMessage(releaseInfo, isNewUpdate);

      if (updateEl) {
        updateEl.textContent =
          releaseInfo.version === "unknown"
            ? "Latest update unavailable right now."
            : `Latest update · TUBAL DARK ${releaseInfo.version} · ${releaseInfo.latest}`;
      }

      // Read the complete explanation and latest release as soon as the page is entered.
      const autoSpeak = () => {
        if (hasSpokenAutomatically) return;
        speak("auto");
      };

      window.setTimeout(autoSpeak, 350);

      // Browser policies may block autoplay. First user gesture becomes the fallback activation.
      const activateOnGesture = () => {
        if (!hasSpokenAutomatically && !window.speechSynthesis.speaking) {
          speak("gesture-fallback");
        }
      };
      document.addEventListener("pointerdown", activateOnGesture, { once: true, passive: true });
      document.addEventListener("keydown", activateOnGesture, { once: true });

      window.addEventListener("pageshow", () => {
        window.setTimeout(() => {
          if (!hasSpokenAutomatically && !window.speechSynthesis.speaking) autoSpeak();
        }, 450);
      }, { once: true });
    })();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initDarkBot, { once: true });
  } else {
    initDarkBot();
  }
})();
