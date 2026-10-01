(() => {
  "use strict";

  function init() {
    const root = document.getElementById("tubalMainBot");
    const visual = document.getElementById("tubalMainBotToggle");
    const bubble = document.getElementById("tubalMainBotBubble");
    const title = document.getElementById("tubalMainBotTitle");
    const text = document.getElementById("tubalMainBotText");
    const sound = document.getElementById("tubalMainBotSound");
    const hero = document.getElementById("bentoHero");
    if (!root || !visual || !bubble || !hero) return;

    const style = document.createElement("style");
    style.textContent = `
      /* =========================================================
         TUBAL HUB HERO ROBOT — pure HTML/CSS, no image asset
         ========================================================= */
      body.hub-home #bentoHero .th-hero-bot-visual{
        position:relative!important;
        width:330px!important;height:330px!important;
        display:grid!important;place-items:center!important;
        overflow:visible!important;
        border:0!important;border-radius:0!important;
        background:transparent!important;
        box-shadow:none!important;
        pointer-events:auto!important;
        cursor:pointer!important;
        isolation:isolate!important;
      }
      .th-code-bot{
        --blue:#48a9ff;--blue2:#126bdb;--cyan:#79d7ff;
        position:relative;width:190px;height:285px;
        transform-origin:50% 80%;
        filter:drop-shadow(0 24px 25px rgba(0,0,0,.58));
        transition:filter .25s ease;
      }
      .th-code-bot:before{
        content:"";position:absolute;left:22px;right:22px;bottom:0;height:15px;
        border-radius:50%;background:rgba(40,116,210,.18);
        filter:blur(9px);z-index:-1;
      }
      .th-code-antenna{
        position:absolute;left:50%;top:0;width:4px;height:34px;
        transform:translateX(-50%);background:linear-gradient(#66717e,#202936);
        border-radius:99px;z-index:5;
      }
      .th-code-antenna:before{
        content:"";position:absolute;left:50%;top:-8px;width:13px;height:13px;
        transform:translateX(-50%);border-radius:50%;background:#7cff9b;
        box-shadow:0 0 8px #39ff72,0 0 22px rgba(57,255,114,.7);
        animation:thCodePulse 1.2s ease-in-out infinite alternate;
      }
      .th-code-head{
        position:absolute;left:30px;top:25px;width:130px;height:91px;
        border-radius:30px 30px 24px 24px;
        background:linear-gradient(145deg,#111922 0%,#05090e 55%,#172331 100%);
        border:2px solid #273747;
        box-shadow:inset 0 0 24px rgba(93,166,255,.08),0 12px 25px rgba(0,0,0,.45);
        z-index:4;overflow:hidden;
      }
      .th-code-head:after{
        content:"";position:absolute;left:7px;right:7px;top:6px;height:20px;
        border-radius:20px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.08),transparent);
        transform:skewX(-18deg);
      }
      .th-code-face{
        position:absolute;left:14px;right:14px;top:27px;height:44px;
        border-radius:18px;background:#03070b;border:1px solid #203242;
        box-shadow:inset 0 0 18px rgba(20,110,210,.16);
      }
      .th-code-eye{
        position:absolute;top:13px;width:25px;height:9px;border-radius:99px;
        background:linear-gradient(90deg,#0b65dc,#70cfff,#0b65dc);
        box-shadow:0 0 8px #2497ff,0 0 18px rgba(36,151,255,.6);
        animation:thCodeBlink 4s infinite;
      }
      .th-code-eye.left{left:14px}.th-code-eye.right{right:14px}
      .th-code-mouth{
        position:absolute;left:50%;bottom:7px;width:24px;height:3px;
        transform:translateX(-50%);border-radius:99px;background:#54b8ff;
        box-shadow:0 0 9px #278fff;opacity:.9;
      }
      .th-code-badge{
        position:absolute;right:9px;top:8px;font:900 6px/1 Arial,sans-serif;
        color:#83c8ff;letter-spacing:.5px;opacity:.8;
      }
      .th-code-neck{
        position:absolute;left:78px;top:111px;width:34px;height:18px;
        background:#182532;border:1px solid #304354;border-radius:7px;z-index:2;
      }
      .th-code-body{
        position:absolute;left:24px;top:119px;width:142px;height:112px;
        border-radius:28px 28px 22px 22px;
        background:linear-gradient(145deg,#192531,#060b10 62%,#121d29);
        border:2px solid #293c4d;
        box-shadow:inset 0 0 28px rgba(48,130,220,.08),0 16px 28px rgba(0,0,0,.45);
        z-index:3;
      }
      .th-code-chest{
        position:absolute;left:29px;top:18px;width:84px;height:53px;
        border-radius:14px;border:1px solid #304456;
        background:linear-gradient(145deg,#0a1118,#111e2b);
        box-shadow:inset 0 0 15px rgba(53,146,235,.1);
      }
      .th-code-logo{
        position:absolute;left:50%;top:8px;transform:translateX(-50%);
        width:31px;height:25px;display:grid;place-items:center;
        color:#dceeff;font:900 9px/1 Arial,sans-serif;letter-spacing:-.5px;
        border:1px solid rgba(95,171,255,.55);border-radius:7px;
        background:linear-gradient(145deg,#0f2740,#06111c);
        box-shadow:0 0 12px rgba(38,140,255,.18);
      }
      .th-code-core{
        position:absolute;left:50%;bottom:8px;width:26px;height:5px;
        transform:translateX(-50%);border-radius:99px;background:#2b91ff;
        box-shadow:0 0 10px #258cff,0 0 20px rgba(37,140,255,.5);
        animation:thCodeCore 1.1s ease-in-out infinite alternate;
      }
      .th-code-panel{
        position:absolute;left:50%;bottom:7px;width:44px;height:18px;
        transform:translateX(-50%);border:1px solid #31495e;border-radius:6px;
      }
      .th-code-arm{
        position:absolute;top:126px;width:27px;height:100px;z-index:2;
        border-radius:16px;background:linear-gradient(145deg,#172432,#060b10);
        border:2px solid #293d4e;transform-origin:50% 12px;
        will-change:transform;
      }
      .th-code-arm:before{
        content:"";position:absolute;left:50%;top:38px;width:21px;height:21px;
        transform:translateX(-50%);border-radius:50%;
        background:radial-gradient(circle,#3a5368 0 28%,#0a1118 31% 100%);
        border:1px solid #31495b;
      }
      .th-code-arm.left{left:4px;transform:rotate(9deg)}
      .th-code-arm.right{right:4px;transform:rotate(-9deg)}
      .th-code-hand{
        position:absolute;bottom:-14px;left:50%;width:29px;height:25px;
        transform:translateX(-50%);border-radius:11px 11px 15px 15px;
        background:#0b1219;border:2px solid #304556;
      }
      .th-code-hand:after{
        content:"";position:absolute;left:6px;right:6px;top:6px;height:3px;
        border-radius:99px;background:#3d9eff;box-shadow:0 7px #3d9eff;
        opacity:.75;
      }
      .th-code-leg{
        position:absolute;top:218px;width:39px;height:57px;z-index:1;
        border-radius:10px 10px 16px 16px;background:linear-gradient(145deg,#172432,#060b10);
        border:2px solid #293d4e;transform-origin:50% 6px;
      }
      .th-code-leg.left{left:52px}.th-code-leg.right{right:52px}
      .th-code-foot{
        position:absolute;left:50%;bottom:-8px;width:49px;height:17px;
        transform:translateX(-50%);border-radius:10px 14px 7px 7px;
        background:#080e14;border:2px solid #2e4253;
      }
      .th-code-foot:after{content:"";position:absolute;left:8px;right:8px;bottom:3px;height:3px;border-radius:99px;background:#277fd1}
      .th-code-bot.is-speaking .th-code-mouth{
        height:11px;width:27px;border-radius:5px;
        animation:thCodeTalk .12s ease-in-out infinite alternate;
      }
      .th-code-bot.is-speaking .th-code-eye{animation:thCodeEye .55s ease-in-out infinite}
      .th-code-bot.is-speaking .th-code-arm.left{animation:thCodeTalkArmL .9s ease-in-out infinite}
      .th-code-bot.is-speaking .th-code-arm.right{animation:thCodeTalkArmR 1.05s ease-in-out infinite}
      .th-code-bot.is-greeting .th-code-arm.right{animation:thCodeGreeting .72s cubic-bezier(.35,.1,.25,1) 4}
      .th-code-bot.is-presenting .th-code-arm.left{animation:thCodePresentL 1.25s ease-in-out infinite}
      .th-code-bot.is-presenting .th-code-arm.right{animation:thCodePresentR 1.4s ease-in-out infinite}
      .th-code-bot.is-speaking{animation:thCodeTalkBody .85s ease-in-out infinite alternate}
      .th-code-bot.is-idle{animation:thCodeIdle 3.2s ease-in-out infinite}
      .th-code-bot.is-speaking .th-code-leg.left{animation:thCodeWeightL 1.2s ease-in-out infinite alternate}
      .th-code-bot.is-speaking .th-code-leg.right{animation:thCodeWeightR 1.2s ease-in-out infinite alternate}
      .th-code-bot-shadow{position:absolute;left:50%;bottom:2px;width:135px;height:22px;transform:translateX(-50%);border-radius:50%;background:rgba(23,113,219,.18);filter:blur(8px);animation:thCodeShadow 3.2s ease-in-out infinite}
      @keyframes thCodeIdle{0%,100%{transform:translateY(3px) rotate(0)}50%{transform:translateY(-7px) rotate(-1deg)}}
      @keyframes thCodeShadow{0%,100%{transform:translateX(-50%) scale(.92);opacity:.55}50%{transform:translateX(-50%) scale(1.06);opacity:.85}}
      @keyframes thCodePulse{to{transform:translateX(-50%) scale(1.25);opacity:.65}}
      @keyframes thCodeBlink{0%,44%,48%,100%{opacity:1}46%{opacity:.05}}
      @keyframes thCodeEye{50%{transform:scaleY(.35)}}
      @keyframes thCodeTalk{from{transform:translateX(-50%) scaleY(.35)}to{transform:translateX(-50%) scaleY(1.15)}}
      @keyframes thCodeTalkBody{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-3px) rotate(-.6deg)}}
      @keyframes thCodeTalkArmL{0%,100%{transform:rotate(8deg)}45%{transform:rotate(20deg) translateY(-2px)}75%{transform:rotate(2deg) translateY(1px)}}
      @keyframes thCodeTalkArmR{0%,100%{transform:rotate(-8deg)}35%{transform:rotate(-19deg) translateY(-2px)}70%{transform:rotate(-3deg) translateY(2px)}}
      @keyframes thCodeGreeting{0%,100%{transform:rotate(-8deg)}25%{transform:rotate(-32deg) translateY(-8px)}50%{transform:rotate(-50deg) translateY(-12px)}75%{transform:rotate(-32deg) translateY(-8px)}}
      @keyframes thCodePresentL{0%,100%{transform:rotate(8deg)}50%{transform:rotate(32deg) translateY(-2px)}}
      @keyframes thCodePresentR{0%,100%{transform:rotate(-8deg)}50%{transform:rotate(-20deg) translateY(-3px)}}
      @keyframes thCodeWeightL{0%,100%{transform:rotate(3deg)}50%{transform:rotate(-3deg) translateY(2px)}}
      @keyframes thCodeWeightR{0%,100%{transform:rotate(-3deg)}50%{transform:rotate(4deg) translateY(-1px)}}
      @media(max-width:600px){
        body.hub-home #bentoHero .th-hero-bot-visual{width:260px!important;height:280px!important}
        .th-code-bot{transform:scale(.84);transform-origin:50% 85%}
      }
      @media(prefers-reduced-motion:reduce){
        .th-code-bot,.th-code-bot.is-speaking,.th-code-bot.is-idle,.th-code-shadow,.th-code-antenna:before,
        .th-code-eye,.th-code-bot.is-speaking .th-code-arm.left,.th-code-bot.is-speaking .th-code-arm.right,
        .th-code-bot.is-speaking .th-code-leg.left,.th-code-bot.is-speaking .th-code-leg.right{animation:none!important}
      }
    `;
    document.head.appendChild(style);

    // Remove the old slideshow/CSS bot and build the robot entirely from HTML/CSS.
    hero.querySelectorAll(".th-bot-stage,.th-bot-showcase").forEach(node => node.remove());
    visual.style.background = "transparent";
    visual.innerHTML = `
      <div class="th-code-bot is-idle" aria-hidden="true">
        <div class="th-code-antenna"></div>
        <div class="th-code-head">
          <span class="th-code-badge">TH</span>
          <div class="th-code-face">
            <i class="th-code-eye left"></i><i class="th-code-eye right"></i>
            <span class="th-code-mouth"></span>
          </div>
        </div>
        <div class="th-code-neck"></div>
        <div class="th-code-arm left"><span class="th-code-hand"></span></div>
        <div class="th-code-arm right"><span class="th-code-hand"></span></div>
        <div class="th-code-body">
          <div class="th-code-chest">
            <div class="th-code-logo">TH</div>
            <div class="th-code-panel"></div>
            <div class="th-code-core"></div>
          </div>
        </div>
        <div class="th-code-leg left"><span class="th-code-foot"></span></div>
        <div class="th-code-leg right"><span class="th-code-foot"></span></div>
      </div>
      <div class="th-code-bot-shadow"></div>
    `;

    const bot = visual.querySelector(".th-code-bot");
    if (title) title.textContent = "Hello! Ako ang TUBAL HUB Bot";
    const fallbackMessage = "Hello! Welcome sa TUBAL HUB. Ako ang interactive guide mo. Ipapakita ko ang latest website version at mga bagong features.";
    let message = fallbackMessage;
    if (text) text.textContent = message;
    bubble.hidden = false;
    visual.setAttribute("aria-label", "TUBAL HUB update guide robot — click to hear the latest version and features");

    async function loadLatestWebsiteUpdate(){
      try{
        const res = await fetch("/tubalhub/version.json?bot=" + Date.now(), {cache:"no-store"});
        if (!res.ok) throw new Error("version.json unavailable");
        const data = await res.json();
        const version = data.version || "unknown";
        const updates = Array.isArray(data.updatesReal) ? data.updatesReal : [];
        const clean = value => String(value || "")
          .replace(/^v?\\d+(?:\\.\\d+){1,3}\\s*/i, "")
          .replace(/^(FEAT|FIX|ADMIN|SECURITY|UI|BUILD|AUDIT|CLEANUP|REMOVE|REFACTOR)\\s*[—:-]?\\s*/i, "")
          .trim();
        const latest = updates.slice(0, 4).map(clean).filter(Boolean);
        const latestText = latest.length
          ? latest.map((item, i) => (i + 1) + ". " + item).join(" ")
          : String(data.changes || "May mga bagong improvements at fixes sa website.");
        message = "Welcome sa TUBAL HUB. Ang current website version ay " + version + ". Narito ang latest updates. " + latestText;
        if (text) text.textContent = "Version " + version + " • " + (latest[0] || "Latest website updates available.");
        return message;
      }catch(_){
        return message;
      }
    }

    const speechAvailable = "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
    let muted = false;
    try { muted = localStorage.getItem("tubal_welcome_bot_muted") === "1"; } catch (_) {}

    function setSpeaking(on){
      bot.classList.toggle("is-speaking", on && !muted);
      bot.classList.toggle("is-idle", !on || muted);
      root.classList.toggle("is-speaking", on && !muted);
      bubble.classList.toggle("is-speaking", on && !muted);
    }

    function speak(msg=message){
      if (!speechAvailable || muted) return;
      try{
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(msg);
        const voices = speechSynthesis.getVoices();
        u.voice = voices.find(v => /^en-US$/i.test(v.lang)) || voices.find(v => /^en-GB$/i.test(v.lang)) || voices[0] || null;
        u.lang = "en-US"; u.rate = .92; u.pitch = 1.02; u.volume = 1;
        setSpeaking(true);
        bot.classList.remove("is-greeting","is-presenting");
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

    window.setTimeout(async () => {
      if (muted) return;
      const latestMessage = await loadLatestWebsiteUpdate();
      bot.classList.add("is-greeting");
      speak(latestMessage);
      window.setTimeout(() => bot.classList.remove("is-greeting"), 3200);
    }, 1400);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true});
  else init();
})();