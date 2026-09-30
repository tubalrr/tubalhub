(() => {
  const message = "Welcome to TUBAL DARK. Here you will find Gaming Setups and Gear, Scripts and Custom Tools, and the Simulation and Modding Hub. Choose a room and explore.";
  const speakBtn = document.getElementById("tdSpeakBtn");
  const replayBtn = document.getElementById("tdReplayBtn");
  if (!("speechSynthesis" in window) || !speakBtn) {
    if (speakBtn) speakBtn.disabled = true;
    return;
  }
  let voice = null;
  const loadVoice = () => {
    const voices = speechSynthesis.getVoices();
    voice = voices.find(v => /^en-PH$/i.test(v.lang)) ||
            voices.find(v => /^en/i.test(v.lang)) ||
            voices[0] || null;
  };
  loadVoice();
  speechSynthesis.addEventListener?.("voiceschanged", loadVoice);

  function speak() {
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.rate = 0.98;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    if (voice) utterance.voice = voice;
    speakBtn.classList.add("is-speaking");
    speakBtn.textContent = "🔊 Speaking…";
    utterance.onend = () => {
      speakBtn.classList.remove("is-speaking");
      speakBtn.textContent = "🔊 Pakinggan";
    };
    utterance.onerror = () => {
      speakBtn.classList.remove("is-speaking");
      speakBtn.textContent = "🔊 Pakinggan";
    };
    speechSynthesis.speak(utterance);
  }

  speakBtn.addEventListener("click", speak);
  replayBtn?.addEventListener("click", speak);

  try {
    const key = "tubaldark_welcome_voice_seen";
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, "1");
      setTimeout(() => {
        try { speak(); } catch (_) {}
      }, 900);
    }
  } catch (_) {}
})();
