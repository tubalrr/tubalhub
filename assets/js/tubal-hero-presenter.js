/* TUBAL HUB — Female Hero Guide v1.2.82 */
(() => {
  "use strict";

  const root = document.getElementById("thHeroPresenter");
  if (!root) return;

  const title = document.getElementById("thPresenterTitle");
  const copy = document.getElementById("thPresenterText");
  const sound = document.getElementById("thPresenterSound");

  const lines = [
    "Hi, welcome to TUBAL HUB. I’m your guide.",
    "TUBAL HUB connects three main branches in one digital home.",
    "Payapang Isip is the wellness branch for journals, calm tools, and AI music.",
    "TUBAL HUB Shop is the commerce branch for products and digital offerings.",
    "Gaming Zone is the gaming branch with the current games and entertainment catalog.",
    "You can also explore Feeds, News, Community, Global Chat, Profiles, Events, LifeHub, and Personal OS from the navigation.",
    "Use the sidebar to move around the Hub, and check the latest system updates whenever a new release is published."
  ];

  let muted = false;
  let spoken = false;
  let voice = null;
  const speechAvailable = "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;

  try {
    muted = localStorage.getItem("tubal_hero_presenter_muted") === "1";
  } catch (_) {}

  function loadVoice() {
    if (!speechAvailable) return;
    const voices = window.speechSynthesis.getVoices();
    voice =
      voices.find(v => /female|samantha|ava|victoria|karen|zira|susan/i.test(v.name)) ||
      voices.find(v => /^en(-|_)/i.test(v.lang)) ||
      voices[0] ||
      null;
  }

  function setSoundUI() {
    if (!sound) return;
    sound.setAttribute("aria-pressed", String(muted));
    sound.setAttribute("aria-label", muted ? "Unmute guide voice" : "Mute guide voice");
    sound.textContent = muted ? "🔇" : "🔊";
  }

  function speak(textToSay) {
    if (!speechAvailable || muted) return;
    try {
      loadVoice();
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(textToSay);
      utterance.lang = "en-US";
      utterance.rate = 0.88;
      utterance.pitch = 1.05;
      utterance.volume = 1;
      if (voice) utterance.voice = voice;
      utterance.onstart = () => root.classList.add("is-speaking");
      utterance.onend = () => root.classList.remove("is-speaking");
      utterance.onerror = () => root.classList.remove("is-speaking");
      window.speechSynthesis.speak(utterance);
    } catch (_) {}
  }

  function showLine(index, announce = false) {
    const textValue = lines[index] || lines[0];
    if (title) title.textContent = index === 0 ? "Hi, welcome to TUBAL HUB." : "TUBAL HUB GUIDE";
    if (copy) copy.textContent = textValue;
    if (announce) speak(textValue);
  }

  setSoundUI();
  showLine(0, false);

  if (speechAvailable) {
    window.speechSynthesis.addEventListener?.("voiceschanged", loadVoice);
  }

  const hero = document.getElementById("bentoHero");
  if (hero) {
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (entry.isIntersecting && entry.intersectionRatio > 0.45 && !spoken) {
        spoken = true;
        window.setTimeout(() => {
          showLine(0, true);
          let index = 1;
          const interval = window.setInterval(() => {
            if (!entry.isIntersecting || muted) {
              window.clearInterval(interval);
              return;
            }
            if (index >= lines.length) {
              window.clearInterval(interval);
              return;
            }
            showLine(index, true);
            index += 1;
          }, 5200);
        }, 900);
      }
    }, {threshold:[0.45]});
    observer.observe(hero);
  }

  if (sound) {
    sound.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      muted = !muted;
      try {
        localStorage.setItem("tubal_hero_presenter_muted", muted ? "1" : "0");
      } catch (_) {}
      setSoundUI();
      if (muted) {
        if (speechAvailable) window.speechSynthesis.cancel();
        root.classList.remove("is-speaking");
      } else {
        speak(copy?.textContent || lines[0]);
      }
    });
  }
})();
