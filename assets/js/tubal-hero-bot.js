(() => {
  "use strict";

  function init() {
    const root = document.getElementById("tubalMainBot");
    const visual = document.getElementById("tubalMainBotToggle");
    const bubble = document.getElementById("tubalMainBotBubble");
    const title = document.getElementById("tubalMainBotTitle");
    const text = document.getElementById("tubalMainBotText");
    const sound = document.getElementById("tubalMainBotSound");
    if (!root || !visual || !bubble) return;

    const style = document.createElement("style");
    style.textContent = `
      body.hub-home #bentoHero .th-hero-welcome-bot{pointer-events:auto!important}
      body.hub-home #bentoHero .th-hero-bot-visual{pointer-events:auto!important;cursor:pointer!important;position:relative!important;overflow:visible!important;isolation:isolate!important}
      body.hub-home #bentoHero .th-hero-bot-dialog{display:block!important;pointer-events:auto!important}
      body.hub-home #bentoHero .th-hero-bot-sound{display:grid!important;pointer-events:auto!important}
      .th-live-bot-mouth{position:absolute;z-index:8;left:50%;top:38.5%;width:24px;height:5px;transform:translate(-50%,-50%);border-radius:999px;background:rgba(89,180,255,.82);box-shadow:0 0 12px rgba(45,145,255,.72);opacity:.35;transition:opacity .15s,height .15s;pointer-events:none}
      .th-live-bot-mouth.is-speaking{opacity:1;height:10px;width:28px;animation:thLiveMouth .13s ease-in-out infinite alternate}
      .th-live-bot-hand{position:absolute;z-index:7;width:46px;height:62px;border:2px solid rgba(65,145,255,.65);border-radius:45% 45% 48% 48%;background:linear-gradient(145deg,rgba(80,150,255,.13),rgba(10,18,30,.05));box-shadow:0 0 14px rgba(42,117,255,.45),inset 0 0 12px rgba(42,117,255,.22);pointer-events:none;transform-origin:50% 10%}
      .th-live-bot-hand:before{content:"";position:absolute;left:8px;right:8px;top:10px;height:3px;border-radius:99px;background:#62a8ff;box-shadow:0 10px #62a8ff,0 20px #62a8ff;opacity:.75}
      .th-live-bot-hand:after{content:"";position:absolute;width:8px;height:8px;border-radius:50%;left:50%;bottom:7px;transform:translateX(-50%);background:#8bc1ff;box-shadow:0 0 12px #3787ff}
      .th-live-bot-hand-left{left:calc(50% - 105px);top:52%;animation:thLiveLeftHand .9s ease-in-out infinite alternate}
      .th-live-bot-hand-right{right:calc(50% - 105px);top:52%;animation:thLiveRightHand .72s ease-in-out infinite alternate}
      .th-live-bot-hand-left:before{transform:rotate(-8deg)}
      .th-live-bot-hand-right:before{transform:rotate(8deg)}
      .th-live-bot-hand.is-speaking{animation-duration:.42s}
      .th-live-bot-hand-left.is-speaking{animation-name:thLiveLeftHandFast}
      .th-live-bot-hand-right.is-speaking{animation-name:thLiveRightHandFast}
      .th-live-bot-status-live{position:absolute;right:14px;bottom:14px;z-index:10;display:flex;align-items:center;gap:5px;padding:5px 8px;border:1px solid rgba(70,160,255,.3);border-radius:999px;background:rgba(5,10,17,.82);color:#8fc3ff;font:900 7px/1 inherit;letter-spacing:1px;box-shadow:0 6px 16px rgba(0,0,0,.3);pointer-events:none}
      .th-live-bot-status-live i{width:6px;height:6px;border-radius:50%;background:#43a1ff;box-shadow:0 0 9px #368dff;animation:thLiveDot .7s ease-in-out infinite alternate}
      .th-live-bot-dialog.is-speaking{border-color:rgba(68,150,255,.42)!important;box-shadow:0 18px 45px rgba(0,0,0,.38),0 0 24px rgba(44,116,255,.12)!important}
      @keyframes thLiveLeftHand{from{transform:rotate(12deg) translateY(0)}to{transform:rotate(-18deg) translateY(-7px)}}
      @keyframes thLiveRightHand{from{transform:rotate(-12deg) translateY(0)}to{transform:rotate(20deg) translateY(-9px)}}
      @keyframes thLiveLeftHandFast{from{transform:rotate(25deg) translateY(1px)}to{transform:rotate(-24deg) translateY(-10px)}}
      @keyframes thLiveRightHandFast{from{transform:rotate(-25deg) translateY(1px)}to{transform:rotate(26deg) translateY(-11px)}}
      @keyframes thLiveMouth{from{transform:translate(-50%,-50%) scaleY(.35)}to{transform:translate(-50%,-50%) scaleY(1.2)}}
      @keyframes thLiveDot{to{transform:scale(1.45);opacity:.55}}
      @media(max-width:600px){.th-live-bot-hand-left{left:calc(50% - 82px);top:51%;transform:scale(.82)}.th-live-bot-hand-right{right:calc(50% - 82px);top:51%;transform:scale(.82)}}
      @media(prefers-reduced-motion:reduce){.th-live-bot-hand,.th-live-bot-hand.is-speaking,.th-live-bot-mouth.is-speaking,.th-live-bot-status-live i{animation:none!important}}
    `;
    document.head.appendChild(style);

    ["th-bot-stage","th-bot-showcase"].forEach(cls => root.querySelectorAll("." + cls).forEach(node => node.remove()));

    const mouth = document.createElement("span");
    mouth.className = "th-live-bot-mouth";
    visual.appendChild(mouth);

    const leftHand = document.createElement("span");
    leftHand.className = "th-live-bot-hand th-live-bot-hand-left";
    const rightHand = document.createElement("span");
    rightHand.className = "th-live-bot-hand th-live-bot-hand-right";
    visual.append(leftHand, rightHand);

    const live = document.createElement("span");
    live.className = "th-live-bot-status-live";
    live.innerHTML = "<i></i> LIVE BOT";
    visual.appendChild(live);

    if (title) title.textContent = "Hello! Ako ang TUBAL HUB Bot";
    const message = "Hello! Welcome sa TUBAL HUB. Ako ang iyong interactive guide. I can talk, wave, and guide you around Payapang Isip, Shop, Gaming Zone, Community, at LifeHub.";
    if (text) text.textContent = message;
    bubble.hidden = false;
    visual.setAttribute("aria-label", "TUBAL HUB interactive robot — click to talk");

    const speechAvailable = "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
    let muted = false;
    try { muted = localStorage.getItem("tubal_welcome_bot_muted") === "1"; } catch (_) {}

    function setSpeaking(on){
      root.classList.toggle("is-speaking", on && !muted);
      bubble.classList.toggle("is-speaking", on && !muted);
      mouth.classList.toggle("is-speaking", on && !muted);
      leftHand.classList.toggle("is-speaking", on && !muted);
      rightHand.classList.toggle("is-speaking", on && !muted);
    }

    function speak(msg=message){
      if (!speechAvailable || muted) return;
      try{
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(msg);
        const voices = speechSynthesis.getVoices();
        u.voice = voices.find(v => /^en-US$/i.test(v.lang)) || voices.find(v => /^en-GB$/i.test(v.lang)) || voices[0] || null;
        u.lang = "en-US";
        u.rate = .92; u.pitch = 1.02; u.volume = 1;
        setSpeaking(true);
        u.onend = () => setSpeaking(false);
        u.onerror = () => setSpeaking(false);
        speechSynthesis.speak(u);
      }catch(_){ setSpeaking(false); }
    }

    if (sound) {
      sound.style.display = "grid";
      sound.addEventListener("click", e => {
        e.stopPropagation();
        muted = !muted;
        try { localStorage.setItem("tubal_welcome_bot_muted", muted ? "1" : "0"); } catch (_) {}
        if (muted && speechAvailable) speechSynthesis.cancel();
        setSpeaking(false);
        sound.setAttribute("aria-pressed", String(muted));
      });
    }

    visual.addEventListener("click", e => {
      if (sound && (e.target === sound || sound.contains(e.target))) return;
      bubble.hidden = false;
      if (speechAvailable) speak();
    });

    window.setTimeout(() => { if (!muted) speak(); }, 1400);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true});
  else init();
})();