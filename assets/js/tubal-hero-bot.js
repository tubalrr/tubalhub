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
      .th-bot-duo{
        position:relative;width:100%;height:100%;
        overflow:visible;box-sizing:border-box;
      }
      .th-bot-duo .th-code-bot{
        position:absolute;top:6px;width:190px;height:300px;
        transform:scale(.72);transform-origin:50% 88%;
        margin:0!important;
      }
      .th-bot-duo .th-welcome-bot{
        left:12px;
      }
      .th-bot-duo .th-announcer-bot{
        right:12px;
        --blue:#a879ff;--blue2:#6733c8;--cyan:#d0b6ff;
        filter:drop-shadow(0 24px 25px rgba(84,45,170,.34));
      }
      .th-announcer-bot .th-code-eye,
      .th-announcer-bot .th-code-mouth,
      .th-announcer-bot .th-code-core,
      .th-announcer-bot .th-code-foot:after{
        background:#b78cff;
        box-shadow:0 0 10px rgba(183,140,255,.8);
      }
      .th-announcer-bot .th-code-antenna:before{
        background:#ffd36b;
        box-shadow:0 0 8px #ffb62e,0 0 22px rgba(255,182,46,.65);
      }
      .th-announcer-bot .th-code-badge{color:#d8c2ff}
      .th-bot-duo .th-code-bot-shadow{bottom:2px;width:170px}
      @media(max-width:600px){
        .th-bot-duo{height:100%;padding:0;overflow:visible}
        .th-bot-duo .th-code-bot{
          width:190px;height:300px;transform:scale(.52);
          top:42px;margin:0!important;
        }
        .th-bot-duo .th-welcome-bot{left:6px}
        .th-bot-duo .th-announcer-bot{right:6px}
      }
      .th-code-bot{
        --blue:#48a9ff;--blue2:#126bdb;--cyan:#79d7ff;
        position:relative;width:190px;height:300px;
        transform-origin:50% 86%;
        filter:drop-shadow(0 22px 22px rgba(0,0,0,.58));
        transition:filter .25s ease;
      }
      .th-code-bot .th-code-head{
        left:18px;top:28px;width:154px;height:108px;
        border-radius:42px 42px 34px 34px;
        background:
          radial-gradient(circle at 28% 18%,rgba(255,255,255,.12),transparent 20%),
          linear-gradient(145deg,#203445 0%,#091018 48%,#1a2c3a 100%);
        border:2px solid #385062;
        box-shadow:inset 0 0 28px rgba(90,169,255,.08),0 16px 30px rgba(0,0,0,.5);
      }
      .th-code-head:before{
        content:"";position:absolute;inset:8px;border-radius:35px;
        border:1px solid rgba(255,255,255,.06);pointer-events:none;
      }
      .th-code-head:after{
        left:12px;right:12px;top:9px;height:28px;
        background:linear-gradient(90deg,transparent,rgba(255,255,255,.11),transparent);
      }
      .th-code-face{
        left:15px;right:15px;top:28px;height:57px;
        border-radius:27px;background:
          radial-gradient(circle at 50% 10%,rgba(23,122,220,.18),transparent 65%),
          #02070c;
        border:1px solid #243b4d;
      }
      .th-code-eye{
        top:16px;width:31px;height:17px;border-radius:50%;
        background:radial-gradient(circle at 50% 45%,#b9edff 0 10%,#52c6ff 25%,#1394ff 58%,#0a5dc7 100%);
        box-shadow:0 0 10px #2aa8ff,0 0 26px rgba(42,168,255,.72);
      }
      .th-code-eye.left{left:18px}.th-code-eye.right{right:18px}
      .th-code-mouth{
        bottom:7px;width:34px;height:10px;border-radius:4px 4px 18px 18px;
        border:2px solid #4db8ff;border-top:0;background:transparent;
        box-shadow:0 0 10px rgba(39,143,255,.65);
      }
      .th-code-neck{left:76px;top:128px;width:38px;height:19px;border-radius:8px}
      .th-code-body{
        left:12px;top:139px;width:166px;height:118px;border-radius:34px 34px 28px 28px;
        background:
          radial-gradient(circle at 25% 18%,rgba(255,255,255,.08),transparent 25%),
          linear-gradient(145deg,#223847,#070c11 55%,#182936 100%);
        border:2px solid #385062;
        box-shadow:inset 0 0 30px rgba(60,143,222,.1),0 18px 30px rgba(0,0,0,.5);
      }
      .th-code-chest{
        left:38px;top:17px;width:90px;height:72px;border-radius:20px;
        background:linear-gradient(145deg,#0d1720,#142433);
        border:1px solid #3c566a;
      }
      .th-code-logo{
        top:9px;width:38px;height:30px;border-radius:8px;font-size:10px;
        background:linear-gradient(145deg,#12304b,#06111c);
      }
      .th-code-panel{
        bottom:8px;width:52px;height:22px;border-radius:8px;
      }
      .th-code-core{bottom:12px;width:30px;height:6px}
      .th-code-arm{
        top:146px;width:31px;height:94px;border-radius:18px;
        border:2px solid #395164;
        background:linear-gradient(145deg,#213849,#070c11);
        transform-origin:50% 10px;
      }
      .th-code-arm.left{left:-3px}.th-code-arm.right{right:-3px}
      .th-code-hand{
        bottom:-18px;width:34px;height:30px;border-radius:13px 13px 18px 18px;
      }
      .th-code-hand:before{
        content:"";position:absolute;left:5px;top:-10px;width:8px;height:15px;border-radius:8px;
        background:#101b24;box-shadow:7px -2px 0 #101b24,14px 0 0 #101b24,21px 3px 0 #101b24;
        border:1px solid #304858;
      }
      .th-code-hand:after{left:8px;right:8px;top:17px;height:3px;box-shadow:none}
      .th-code-leg{
        top:248px;width:43px;height:52px;border-radius:13px 13px 18px 18px;
      }
      .th-code-leg.left{left:48px}.th-code-leg.right{right:48px}
      .th-code-foot{
        bottom:-9px;width:54px;height:20px;border-radius:12px 16px 8px 8px;
      }
      .th-code-bot:after{
        content:"";position:absolute;left:50%;bottom:-2px;width:118px;height:20px;
        transform:translateX(-50%);border-radius:50%;
        background:radial-gradient(ellipse,rgba(66,157,255,.28),transparent 70%);
        filter:blur(7px);z-index:-2;
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
      /* Two independent robot slots — separated, centered, never clipped */
      .th-bot-duo{
        position:relative!important;
        display:grid!important;
        grid-template-columns:140px 140px;
        gap:34px;
        align-items:end;
        justify-content:center;
        width:100%;
        height:100%;
        overflow:visible!important;
        box-sizing:border-box;
      }
      .th-bot-slot{
        position:relative;
        width:140px;height:300px;
        overflow:visible;
        border:0!important;
        outline:0!important;
        box-shadow:none!important;
        background:transparent!important;
      }
      .th-bot-slot .th-code-bot{
        position:absolute;
        left:50%;
        top:4px;
        width:190px;height:300px;
        margin-left:-95px!important;
        transform:scale(.66);
        transform-origin:50% 86%;
      }
      .th-bot-slot-welcome{order:1}
      .th-bot-slot-announcer{order:2}
      .th-bot-slot .th-code-bot.is-idle{
        animation:thCodeDuoIdle 3.2s ease-in-out infinite;
      }
      .th-bot-slot .th-code-bot.is-speaking{
        animation:thCodeDuoTalkBody .85s ease-in-out infinite alternate;
      }
      /* Remove any visual slot/container borders around either bot */
      .th-bot-duo,
      .th-bot-slot,
      .th-welcome-bot,
      .th-announcer-bot{
        border:0!important;
        outline:0!important;
        box-shadow:none!important;
        background:transparent!important;
      }
      @keyframes thCodeDuoIdle{
        0%,100%{transform:scale(.66) translateY(3px) rotate(0)}
        50%{transform:scale(.66) translateY(-7px) rotate(-1deg)}
      }
      @keyframes thCodeDuoTalkBody{
        0%,100%{transform:scale(.66) translateY(0) rotate(0)}
        50%{transform:scale(.66) translateY(-3px) rotate(-.6deg)}
      }
      @media(max-width:600px){
        .th-bot-duo{
          grid-template-columns:116px 116px;
          gap:12px;
        }
        .th-bot-slot{
          width:116px;height:290px;
        }
        .th-bot-slot .th-code-bot{
          width:190px;height:300px;
          top:18px;
          margin-left:-95px!important;
          transform:scale(.50);
        }
        .th-bot-slot .th-code-bot.is-idle{
          animation:thCodeDuoIdleMobile 3.2s ease-in-out infinite;
        }
        .th-bot-slot .th-code-bot.is-speaking{
          animation:thCodeDuoTalkMobile .85s ease-in-out infinite alternate;
        }
      }
      @keyframes thCodeDuoIdleMobile{
        0%,100%{transform:scale(.50) translateY(3px) rotate(0)}
        50%{transform:scale(.50) translateY(-6px) rotate(-1deg)}
      }
      @keyframes thCodeDuoTalkMobile{
        0%,100%{transform:scale(.50) translateY(0) rotate(0)}
        50%{transform:scale(.50) translateY(-3px) rotate(-.6deg)}
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
    const botMarkup = (role, badge) => `
      <div class="th-code-bot ${role === "announcer" ? "th-announcer-bot" : "th-welcome-bot"} is-idle" data-bot-role="${role}" aria-hidden="true">
        <div class="th-code-antenna"></div>
        <div class="th-code-head">
          <span class="th-code-badge">${badge}</span>
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
            <div class="th-code-logo">${badge}</div>
            <div class="th-code-panel"></div>
            <div class="th-code-core"></div>
          </div>
        </div>
        <div class="th-code-leg left"><span class="th-code-foot"></span></div>
        <div class="th-code-leg right"><span class="th-code-foot"></span></div>
      </div>`;

    visual.innerHTML = `
      <div class="th-bot-duo">
        <div class="th-bot-slot th-bot-slot-welcome">${botMarkup("welcome","TH")}</div>
        <div class="th-bot-slot th-bot-slot-announcer">${botMarkup("announcer","NEWS")}</div>
      </div>
      <div class="th-code-bot-shadow"></div>
    `;

    const bot = visual.querySelector(".th-welcome-bot");
    const announcerBot = visual.querySelector(".th-announcer-bot");
    const bots = [bot, announcerBot];
    if (title) title.textContent = "Hello! Ako ang TUBAL HUB Bot";
    const fallbackMessage = "Hello! Welcome to TUBAL HUB. I am your interactive guide. I will present the latest website version and new features.";
    let message = fallbackMessage;
    if (text) text.textContent = message;
    bubble.hidden = false;
    visual.setAttribute("aria-label", "TUBAL HUB update guide robot — click to hear the latest version and features");

    async function loadLatestWebsiteUpdate(){
      try{
        const manifestUrl = new URL("version.json", document.baseURI).href;
        const res = await fetch(manifestUrl + "?bot=" + Date.now(), {cache:"no-store"});
        if (!res.ok) throw new Error("version.json unavailable");
        const data = await res.json();
        const version = data.version || "unknown";
        const updates = Array.isArray(data.updatesReal) ? data.updatesReal : [];
        const clean = value => String(value || "")
          .replace(/^v?\d+(?:\.\d+){1,3}\s*/i, "")
          .replace(/^(FEAT|FIX|ADMIN|SECURITY|UI|BUILD|AUDIT|CLEANUP|REMOVE|REFACTOR)\s*[—:-]?\s*/i, "")
          .trim();
        const latest = updates.slice(0, 4).map(clean).filter(Boolean);
        const latestText = latest.length
          ? latest.map((item, i) => (i + 1) + ". " + item).join(" ")
          : String(data.changes || "There are new improvements and fixes across the website.");
        message = "Welcome to TUBAL HUB. The current website version is " + version + ". Here are the latest updates. " + latestText;
        if (text) text.textContent = "Version " + version + " • " + (latest[0] || "Latest website updates available.");
        return message;
      }catch(_){
        return message;
      }
    }

    const speechAvailable = "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
    let muted = false;
    try { muted = localStorage.getItem("tubal_welcome_bot_muted") === "1"; } catch (_) {}

    function setSpeaking(activeBot, on){
      bots.forEach(item => {
        item.classList.toggle("is-speaking", on && item === activeBot && !muted);
        item.classList.toggle("is-idle", !(on && item === activeBot) || muted);
      });
      root.classList.toggle("is-speaking", on && !muted);
      bubble.classList.toggle("is-speaking", on && !muted);
    }

    function speak(msg, activeBot=bot, options={}){
      if (!speechAvailable || muted) return Promise.resolve();
      return new Promise(resolve => {
        try{
          speechSynthesis.cancel();
          const u = new SpeechSynthesisUtterance(msg);
          const voices = speechSynthesis.getVoices();
          u.voice = voices.find(v => /^en-US$/i.test(v.lang)) || voices.find(v => /^en-GB$/i.test(v.lang)) || voices[0] || null;
          u.lang = "en-US"; u.rate = options.rate || .9; u.pitch = options.pitch || 1.02; u.volume = 1;
          setSpeaking(activeBot, true);
          bots.forEach(item => item.classList.remove("is-greeting","is-presenting"));
          if (options.greeting) activeBot.classList.add("is-greeting");
          if (options.presenting) activeBot.classList.add("is-presenting");
          const finish = () => {
            setSpeaking(activeBot, false);
            activeBot.classList.remove("is-greeting","is-presenting");
            resolve();
          };
          u.onend = finish;
          u.onerror = finish;
          speechSynthesis.speak(u);
        }catch(_){ setSpeaking(activeBot, false); resolve(); }
      });
    }

    function getSiteTour(){
      try{
        const links = [...document.querySelectorAll("a[href]")]
          .map(a => (a.textContent || "").replace(/\s+/g," ").trim())
          .filter(Boolean);
        const uniqueLinks = [...new Set(links)].slice(0, 24);

        const headings = [...document.querySelectorAll("main h1, main h2, main h3")]
          .map(h => (h.textContent || "").replace(/\s+/g," ").trim())
          .filter(Boolean);
        const uniqueHeadings = [...new Set(headings)].slice(0, 16);

        const branches = [...document.querySelectorAll(".th-branch-card, .th-pillar")]
          .map(card => {
            const title = card.querySelector("strong,h3")?.textContent?.replace(/\s+/g," ").trim();
            const desc = card.querySelector("em,.th-pillar-description,.th-pillar-content p")?.textContent?.replace(/\s+/g," ").trim();
            return title ? (desc ? title + ", " + desc : title) : "";
          })
          .filter(Boolean);

        const parts = [];
        parts.push("TUBAL HUB is the main digital home connecting its services and experiences in one website.");
        if (branches.length) parts.push("The main branches include " + [...new Set(branches)].slice(0, 6).join("; ") + ".");
        parts.push("The website also includes Feeds, News, Global Chat, TUBAL DARK, Profiles, AI Music, Community, Events, Shop, About, Contact, Settings, LifeHub, and Personal OS.");
        if (uniqueHeadings.length) parts.push("The homepage currently presents " + uniqueHeadings.slice(0, 10).join(", ") + ".");
        if (uniqueLinks.length) parts.push("Visitors can navigate directly to " + uniqueLinks.slice(0, 14).join(", ") + ".");
        return parts.join(" ");
      }catch(_){
        return "TUBAL HUB connects its main branches, community areas, shop, gaming experiences, wellness tools, music features, news, profiles, and personal spaces in one website.";
      }
    }

    function cleanUpdateForSpeech(value){
      try{
        return String(value || "")
          .replace(/^v?\d+(?:\.\d+){1,3}\s*/i,"")
          .replace(/^(FEAT|FIX|ADMIN|SECURITY|UI|BUILD|AUDIT|CLEANUP|REMOVE|REFACTOR)\s*[—:-]?\s*/i,"")
          .replace(/https?:\/\/\S+/g,"")
          .replace(/\s+/g," ")
          .trim();
      }catch(_){
        return String(value || "").trim();
      }
    }

    async function buildConversationData(latest){
      const siteTour = getSiteTour();
      let version = "the latest version";
      let updates = [];
      try{
        const manifestUrl = new URL("version.json", document.baseURI).href;
        const res = await fetch(manifestUrl + "?conversation=" + Date.now(), {cache:"no-store"});
        if(res.ok){
          const data = await res.json();
          version = String(data.version || version);
          if(Array.isArray(data.updatesReal)) updates = data.updatesReal.map(cleanUpdateForSpeech).filter(Boolean);
        }
      }catch(_){}
      if(!updates.length){
        updates = String(latest || "").split(/(?=\d+\.\d+)/).map(cleanUpdateForSpeech).filter(Boolean);
      }
      return {version,updates,siteTour};
    }

    async function botConversation(latest){
      if (muted) return;
      const data = await buildConversationData(latest);
      let siteTourDone = false;
      try { siteTourDone = sessionStorage.getItem("tubal_bot_site_tour_done") === "1"; } catch (_) {}

      const conversations = [
        {
          welcome:"Hello! Welcome to TUBAL HUB. I am the Welcome Bot. I will give you a quick tour of what is available on the website, and then my partner will announce the newest updates.",
          announce:"Hello! I am the TUBAL HUB News Announcer. The current website version is " + data.version + ". Let us go through what is new.",
          tour:"Here is the website tour: " + data.siteTour,
          update:"The newest release includes " + data.updates.slice(0,2).join(". ") + ".",
          follow:"And there is more. Recent improvements also include " + data.updates.slice(2,4).join(". ") + ".",
          close:"That is the latest TUBAL HUB briefing. Welcome, explore the Hub, and check back for future updates."
        },
        {
          welcome:"Welcome to TUBAL HUB. I am your Welcome Bot. I will introduce the website and its main experiences before we hand the microphone to our News Announcer.",
          announce:"Thank you. I am the TUBAL HUB News Announcer. We are currently running website version " + data.version + ", and I have the latest release information ready.",
          tour:"The Hub brings together these experiences: " + data.siteTour,
          update:"The most recent changes are " + data.updates.slice(0,2).join(". ") + ".",
          follow:"And the recent release history continues with " + data.updates.slice(2,4).join(". ") + ".",
          close:"Thanks for listening. This concludes today's TUBAL HUB welcome and update conversation."
        },
        {
          welcome:"Hi there! Welcome to TUBAL HUB. I am the Welcome Bot. Think of me as your guide to the whole website.",
          announce:"And I am the News Announcer. I handle version news, feature announcements, fixes, and other release information. The current version is " + data.version + ".",
          tour:"Let us start with the site itself: " + data.siteTour,
          update:"Now for the news. The latest release changes are " + data.updates.slice(0,2).join(". ") + ".",
          follow:"For the rest of the recent changes: " + data.updates.slice(2,4).join(". ") + ".",
          close:"Welcome again to TUBAL HUB. We will keep this conversation fresh as the website evolves."
        }
      ];

      let index = 0;
      try{
        index = Number(sessionStorage.getItem("tubal_bot_conversation_index") || "0");
        if(!Number.isFinite(index)) index = 0;
        sessionStorage.setItem("tubal_bot_conversation_index", String((index + 1) % conversations.length));
      }catch(_){}
      const convo = conversations[index % conversations.length];

      if(title) title.textContent = "Welcome Bot & News Announcer";
      await speak(convo.welcome, bot, {greeting:true});
      if (muted) return;
      await new Promise(r => setTimeout(r, 420));
      await speak(convo.announce, announcerBot, {greeting:true, pitch:1.04});
      if (muted) return;
      if (!siteTourDone) {
        await new Promise(r => setTimeout(r, 420));
        await speak(convo.tour, bot, {presenting:true, rate:.88});
        if (muted) return;
        try { sessionStorage.setItem("tubal_bot_site_tour_done","1"); } catch (_) {}
      }
      await new Promise(r => setTimeout(r, 420));
      await speak(convo.update, announcerBot, {presenting:true, pitch:1.04, rate:.88});
      if (muted) return;
      await new Promise(r => setTimeout(r, 420));
      if (convo.follow.replace(/\s+/g," ").trim().length > 45) {
        await speak(convo.follow, announcerBot, {presenting:true, pitch:1.04, rate:.88});
        if (muted) return;
        await new Promise(r => setTimeout(r, 420));
      }
      await speak(convo.close, bot, {presenting:true});
    }

    let liveUpdateConversationBusy = false;

    document.addEventListener("tubalhub:live-update", async event => {
      if (liveUpdateConversationBusy) return;
      const version = String(event.detail?.version || "").trim();
      if (!version) return;

      liveUpdateConversationBusy = true;
      try {
        const raw = event.detail?.data?.changelog || [];
        let updates = raw
          .map(item => item?.desc || item?.title || "")
          .map(cleanUpdateForSpeech)
          .filter(Boolean);

        if (!updates.length) {
          try {
            const manifestUrl = new URL("version.json", document.baseURI).href;
            const response = await fetch(manifestUrl + "?live-news=" + Date.now(), {cache:"no-store"});
            if (response.ok) {
              const data = await response.json();
              if (Array.isArray(data.updatesReal)) {
                updates = data.updatesReal.map(cleanUpdateForSpeech).filter(Boolean);
              }
            }
          } catch (_) {}
        }

        const newsItems = updates.slice(0, 3);
        const newsSummary = newsItems.length
          ? newsItems.join(". ")
          : "The latest release includes new features and improvements across the website.";

        if (title) title.textContent = "NEW UPDATE · News Announcer";
        if (text) text.textContent = "New update detected: Version " + version + ". The News Announcer will brief you before the page refreshes.";

        if (!muted && speechAvailable) {
          await speak(
            "News alert. A new TUBAL HUB website update has been detected. The new version is " +
            version +
            ". Here are the latest changes: " +
            newsSummary +
            ". I have announced the update, and TUBAL HUB will now refresh automatically.",
            announcerBot,
            {presenting:true, pitch:1.04, rate:.86}
          );
        }
      } catch (_) {
        // Never allow update news errors to block the updater fallback.
      } finally {
        document.dispatchEvent(new CustomEvent("tubalhub:update-announce-complete", {
          detail: {version}
        }));
        liveUpdateConversationBusy = false;
      }
    });

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
      if (speechAvailable) botConversation(message);
    });

    window.setTimeout(async () => {
      // Automatic Welcome Bot narration is triggered only by a successful login.
      // Refreshes, tab returns, and update reloads do not trigger the tour.
      let loginPending = false;
      try {
        loginPending = sessionStorage.getItem("tubalhub_bot_login_pending") === "1";
        if (loginPending) sessionStorage.removeItem("tubalhub_bot_login_pending");
      } catch (_) {}
      if (!loginPending || muted) return;

      // Let the main-page updater finish its first release check before the
      // Welcome Bot starts speaking, so the bot never briefs an older state.
      try {
        if (window.tubalHubUpdateNotifier?.ready) await window.tubalHubUpdateNotifier.ready;
      } catch (_) {}
      const latestMessage = await loadLatestWebsiteUpdate();
      await botConversation(latestMessage);
    }, 1400);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true});
  else init();
})();