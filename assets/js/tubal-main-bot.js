(() => {
  "use strict";

  const el = (id) => document.getElementById(id);
  const WELCOME_USER_KEY = "tubal_welcome_bot_last_user";
  const LAST_VERSION_KEY = "tubal_welcome_bot_last_version";
  const MUTED_KEY = "tubal_welcome_bot_muted";
  const GUEST_ID = "__guest__";

  const fallback = {
    version: "current",
    latest: "The current release information is temporarily unavailable.",
    latestItems: []
  };

  async function getRelease() {
    try {
      const response = await fetch(`version.json?mainbot=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) throw new Error("release fetch failed");

      const data = await response.json();
      const updates = Array.isArray(data.updatesReal) ? data.updatesReal : [];
      const latestItems = updates.slice(0, 8).map(item => {
        const raw = String(item || "").trim();
        const versionMatch = raw.match(/^(v?\d+\.\d+\.\d+)/i);
        const version = versionMatch ? versionMatch[1].replace(/^v/i, "") : "";
        const clean = raw
          .replace(/^v\d+\.\d+\.\d+\s*/i, "")
          .replace(/^\b(FEAT|FIX|UI|SECURITY|ADMIN|BUILD|CLEANUP|REFACTOR|AUDIT|PERF|META)\b\s*[—:-]?\s*/i, "")
          .replace(/^—\s*/, "")
          .trim();
        return { version, text: clean };
      }).filter(item => item.text || item.version);

      return {
        version: String(data.version || "current"),
        latest: latestItems[0]?.text || fallback.latest,
        latestItems
      };
    } catch (_) {
      return fallback;
    }
  }

  function buildWelcomeGuide(release) {
    return [
      "Welcome to TUBAL HUB. I am your Welcome Bot.",
      "I will guide you around the Hub and explain the main areas available.",
      "TUBAL HUB has three main branches: Payapang Isip for wellness, TUBAL HUB Shop for commerce, and Gaming Zone for gaming.",
      "Kapeng Barako is a featured brand inside TUBAL HUB with its own landing page and live shop connection.",
      "The main site also includes Feeds, News and Announcements, Events and Live, Community and Global Chat, Profiles, AI Music, LifeHub, Personal OS, TUBAL Academy, Library, Settings, Help, FAQ, Contact, Privacy, Terms, License, and Community Guidelines.",
      "Please follow the site rules. Do not harass, threaten, bully, impersonate, spam, scam, distribute malicious code, bypass authentication, access another user's account, attack the service, or upload content you do not have the right to share.",
      "AI and automated features can be inaccurate, so specialized decisions should be checked with qualified professionals.",
      `The current TUBAL HUB release is version ${release.version}.`,
      "Enjoy exploring TUBAL HUB."
    ].join(" ");
  }

  function buildUpdateMessage(release, items) {
    const top = (items?.length ? items : [{
      version: release.version,
      text: release.latest
    }]).slice(0, 4);

    const details = top.map((item, index) =>
      `${index === 0 ? "" : " Also, "}${item.text || "A new system change is now available."}`
    ).join("");

    return `TUBAL HUB update detected. Version ${release.version} is now live. ${details}`;
  }

  function setLatestItem(latestEl, item, animate = true) {
    if (!latestEl) return;
    const version = item?.version ? `v${item.version}` : "LIVE";
    const message = item?.text || "Checking latest updates…";
    latestEl.textContent = `LATEST · ${version} · ${message}`;
    latestEl.title = latestEl.textContent;

    if (animate) {
      latestEl.classList.remove("is-changing");
      void latestEl.offsetWidth;
      latestEl.classList.add("is-changing");
    }
  }

  function startLatestTicker(latestEl, items) {
    if (!latestEl) return () => {};
    const list = Array.isArray(items) && items.length ? items : [];
    let index = 0;
    let timer = null;

    setLatestItem(latestEl, list[0] || {version:"",text:"Live system updates"}, false);

    if (list.length > 1) {
      timer = window.setInterval(() => {
        index = (index + 1) % list.length;
        setLatestItem(latestEl, list[index], true);
      }, 4200);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }

  async function loadAuth() {
    try {
      const mod = await import("./firebase-config.js");
      const authMod = await import("https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js");
      return {
        auth: mod.auth,
        onAuthStateChanged: authMod.onAuthStateChanged
      };
    } catch (error) {
      console.warn("[TUBAL HUB Welcome Bot] auth bridge unavailable:", error);
      return null;
    }
  }

  function init() {
    const root = el("tubalMainBot");
    const toggle = el("tubalMainBotToggle");
    const bubble = el("tubalMainBotBubble");
    const sound = el("tubalMainBotSound");
    const text = el("tubalMainBotText");
    const title = el("tubalMainBotTitle");
    const latestEl = el("tubalMainBotLatest");

    if (!root || !toggle || !bubble || !sound) return;

    const speechAvailable = "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;

    let voice = null;
    let message = "";
    let muted = false;
    let initialized = false;
    let activeUserId = null;
    let stopTicker = null;
    let welcomeSpokenForState = false;

    try {
      muted = localStorage.getItem(MUTED_KEY) === "1";
    } catch (_) {}

    const setMutedUI = () => {
      sound.setAttribute("aria-pressed", String(muted));
      sound.setAttribute("aria-label", muted ? "Unmute Welcome Bot voice" : "Mute Welcome Bot voice");
      sound.title = muted ? "Unmute Welcome Bot voice" : "Mute Welcome Bot voice";
      root.classList.toggle("is-muted", muted);
      if (muted && speechAvailable) speechSynthesis.cancel();
    };

    const setSpeaking = (active) => {
      root.classList.toggle("is-speaking", Boolean(active) && !muted);
      root.classList.toggle("is-idle", !active || muted);
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

    const speak = (overrideMessage) => {
      const nextMessage = String(overrideMessage ?? message).trim();
      if (!speechAvailable || muted || !nextMessage) return;

      try {
        loadVoice();
        speechSynthesis.cancel();
        speechSynthesis.resume();

        const utterance = new SpeechSynthesisUtterance(nextMessage);
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

    const speakOnce = (nextMessage) => {
      if (welcomeSpokenForState || muted) return;
      welcomeSpokenForState = true;
      speak(nextMessage);
    };

    const showWelcome = (release) => {
      message = buildWelcomeGuide(release);
      if (title) title.textContent = "Welcome to TUBAL HUB";
      if (text) text.textContent = `Current release · v${release.version}. Welcome guide ready.`;
      speakOnce(message);
    };

    const showUpdate = (release, items) => {
      message = buildUpdateMessage(release, items);
      if (title) title.textContent = "New update detected";
      if (text) text.textContent = `New update · v${release.version}. I will explain what changed.`;
      welcomeSpokenForState = true;
      speak(message);
    };

    const shouldUseUpdateMessage = (releaseVersion) => {
      try {
        const lastVersion = localStorage.getItem(LAST_VERSION_KEY);
        return Boolean(lastVersion && releaseVersion && lastVersion !== releaseVersion);
      } catch (_) {
        return false;
      }
    };

    const rememberVersion = (releaseVersion) => {
      try {
        if (releaseVersion) localStorage.setItem(LAST_VERSION_KEY, releaseVersion);
      } catch (_) {}
    };

    const processState = async (user) => {
      const userId = user?.uid || GUEST_ID;
      activeUserId = userId;

      const release = await getRelease();
      stopTicker?.();
      stopTicker = startLatestTicker(latestEl, release.latestItems);

      bubble.hidden = false;
      toggle.setAttribute("aria-expanded", "true");

      let lastUser = null;
      try {
        lastUser = localStorage.getItem(WELCOME_USER_KEY);
      } catch (_) {}

      const changedUser = lastUser !== userId;
      const hasNewRelease = shouldUseUpdateMessage(release.version);

      if (changedUser) {
        welcomeSpokenForState = false;
        try {
          localStorage.setItem(WELCOME_USER_KEY, userId);
        } catch (_) {}
      }

      if (!initialized) {
        initialized = true;

        if (hasNewRelease) {
          if (!muted) showUpdate(release, release.latestItems);
        } else if (changedUser && !muted) {
          showWelcome(release);
        }
      } else if (changedUser && !muted) {
        // Happens after logout → login without a full page refresh.
        if (hasNewRelease) {
          showUpdate(release, release.latestItems);
        } else {
          welcomeSpokenForState = false;
          showWelcome(release);
        }
      }

      rememberVersion(release.version);
    };

    sound.addEventListener("click", (event) => {
      event.stopPropagation();
      muted = !muted;

      try {
        localStorage.setItem(MUTED_KEY, muted ? "1" : "0");
      } catch (_) {}

      if (muted) {
        if (speechAvailable) speechSynthesis.cancel();
        setSpeaking(false);
      }

      setMutedUI();
    });

    toggle.addEventListener("click", (event) => {
      if (event.target === sound || sound.contains(event.target)) return;
      bubble.hidden = !bubble.hidden;
      toggle.setAttribute("aria-expanded", String(!bubble.hidden));
    });

    setMutedUI();

    if (!speechAvailable) {
      root.classList.add("speech-unavailable");
      if (text) text.textContent = "Voice narration is not available in this browser.";
    }

    loadVoice();
    if (speechAvailable) {
      speechSynthesis.addEventListener?.("voiceschanged", loadVoice);
    }

    // Direct link from the live update notifier while the page is open.
    document.addEventListener("tubalhub:live-update", async (event) => {
      const data = event.detail?.data;
      if (!data?.version || muted) return;

      const release = await getRelease();
      if (String(release.version) !== String(data.version)) return;

      rememberVersion(release.version);
      showUpdate(release, release.latestItems);
    });

    loadAuth().then(bridge => {
      if (!bridge?.auth || !bridge?.onAuthStateChanged) {
        // Public/guest fallback: one welcome per browser until a real user session is created.
        processState(null);
        return;
      }

      if (typeof bridge.auth.authStateReady === "function") {
        bridge.auth.authStateReady()
          .then(() => bridge.onAuthStateChanged(bridge.auth, user => {
            if (!user) {
              activeUserId = null;
              welcomeSpokenForState = false;
              try { localStorage.removeItem(WELCOME_USER_KEY); } catch (_) {}
              return;
            }
            processState(user);
          }))
          .catch(() => processState(bridge.auth.currentUser || null));
      } else {
        bridge.onAuthStateChanged(bridge.auth, user => {
          if (!user) {
            activeUserId = null;
            welcomeSpokenForState = false;
            try { localStorage.removeItem(WELCOME_USER_KEY); } catch (_) {}
            return;
          }
          processState(user);
        });
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();