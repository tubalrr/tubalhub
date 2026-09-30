(() => {
  const message = "Welcome to TUBAL DARK. Here you will find Gaming Setups and Gear, Scripts and Custom Tools, and the Simulation and Modding Hub. Choose a room and explore.";

  function initDarkBot() {
    const speakBtn = document.getElementById("tdSpeakBtn");
    const replayBtn = document.getElementById("tdReplayBtn");
    const botFace = document.querySelector(".td-welcome-bot-face");
    if (!speakBtn) return;

    if (!("speechSynthesis" in window)) {
      speakBtn.disabled = true;
      return;
    }

    let voice = null;
    let hasSpokenAutomatically = false;

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

        const utterance = new SpeechSynthesisUtterance(message);
        utterance.lang = "en-US";
        utterance.rate = 0.96;
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

    // Best-effort automatic narration every time the TUBAL DARK page is entered.
    const autoSpeak = () => {
      if (hasSpokenAutomatically) return;
      speak("auto");
    };

    // Try after the page is visually ready.
    window.setTimeout(autoSpeak, 650);

    // Some browsers populate system voices slightly later.
    window.setTimeout(() => {
      if (!hasSpokenAutomatically) loadVoice();
    }, 1200);

    // Browser policies may require a user gesture. The first click/tap then activates the bot voice.
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
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initDarkBot, { once: true });
  } else {
    initDarkBot();
  }
})();
