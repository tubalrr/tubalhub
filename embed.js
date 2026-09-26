/* TUBAL HUB SHOP SCANNER EMBED
   Add:
   <script src="https://tubalrr.github.io/tubalhub/embed.js"></script>
*/
(function(){
  "use strict";
  if(window.__TUBAL_HUB_EMBED__) return;
  window.__TUBAL_HUB_EMBED__ = true;

  const FEEDS_URL = "https://tubalrr.github.io/tubalhub/pages/feeds.html";
  const KEY = "tubalhub_feeds";

  const css = document.createElement("style");
  css.textContent =
    ".th-scan-btn{position:fixed;right:20px;bottom:20px;width:56px;height:56px;border-radius:50%;border:1px solid #C6A87D;background:#C6A87D;color:#0E0E0C;font:500 9px Inter,Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;z-index:2147483646;cursor:pointer}" +
    ".th-scan-backdrop{position:fixed;inset:0;background:rgba(14,14,12,.9);display:none;align-items:center;justify-content:center;padding:16px;z-index:2147483647}" +
    ".th-scan-backdrop.open{display:flex}" +
    ".th-scan-modal{width:min(560px,100%);background:#FFFBF2;color:#171713;border:1px solid #E8E2DC;border-radius:2px;overflow:hidden;font-family:Inter,Arial,sans-serif}" +
    ".th-scan-head{display:flex;align-items:center;justify-content:space-between;padding:15px 16px;border-bottom:1px solid #E8E2DC}" +
    ".th-scan-title{margin:0;font:300 24px Georgia,serif}" +
    ".th-scan-close{border:0;background:none;color:#8C958D;font-size:9px;letter-spacing:.1em;text-transform:uppercase;cursor:pointer}" +
    ".th-scan-body{padding:16px}.th-scan-stage{position:relative;aspect-ratio:4/3;background:#11110e;border:1px solid #8C958D;overflow:hidden}" +
    ".th-scan-stage video{width:100%;height:100%;object-fit:cover}.th-scan-guide{position:absolute;inset:18% 14%;border:1px solid rgba(198,168,125,.85);pointer-events:none}" +
    ".th-scan-copy{padding:12px 0;color:#8C958D;font-size:10px;line-height:1.55}.th-scan-manual{display:grid;grid-template-columns:1fr auto;gap:8px}" +
    ".th-scan-manual input{min-width:0;height:36px;border:1px solid #8C958D;border-radius:2px;background:transparent;padding:0 10px;color:#171713;outline:0;font-size:10px}" +
    ".th-scan-add{height:36px;border:1px solid #C6A87D;border-radius:2px;background:#C6A87D;color:#0E0E0C;padding:0 14px;font-size:9px;letter-spacing:.1em;text-transform:uppercase;cursor:pointer}";
  document.head.appendChild(css);

  const btn = document.createElement("button");
  btn.className = "th-scan-btn";
  btn.type = "button";
  btn.textContent = "Scan";
  btn.setAttribute("aria-label","Open TUBAL HUB scanner");
  document.body.appendChild(btn);

  const backdrop = document.createElement("div");
  backdrop.className = "th-scan-backdrop";
  backdrop.innerHTML =
    '<section class="th-scan-modal" role="dialog" aria-modal="true" aria-labelledby="thScanTitle">' +
      '<div class="th-scan-head"><h2 class="th-scan-title" id="thScanTitle">Scan item</h2><button class="th-scan-close" type="button">Close</button></div>' +
      '<div class="th-scan-body">' +
        '<div class="th-scan-stage"><video id="thScanVideo" playsinline muted></video><div class="th-scan-guide"></div></div>' +
        '<div class="th-scan-copy" id="thScanCopy">Align a QR code or barcode inside the guide.</div>' +
        '<div class="th-scan-manual"><input id="thScanManual" placeholder="Enter QR / barcode value"><button class="th-scan-add" type="button">Add</button></div>' +
      '</div>' +
    '</section>';
  document.body.appendChild(backdrop);

  const video = backdrop.querySelector("#thScanVideo");
  const copy = backdrop.querySelector("#thScanCopy");
  const manual = backdrop.querySelector("#thScanManual");
  const close = backdrop.querySelector(".th-scan-close");
  const add = backdrop.querySelector(".th-scan-add");

  let stream = null;
  let detector = null;
  let timer = null;
  let qr = null;

  function loadScript(src){
    return new Promise((resolve,reject)=>{
      const s = document.createElement("script");
      s.src = src; s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function fallbackFeeds(){
    try{
      const raw = localStorage.getItem(KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    }catch(e){ return []; }
  }

  function makeItem(code){
    return {
      id:"embed-scan-" + Date.now(),
      author:"SCANNED ITEM",
      avatar:"S",
      time:"now",
      productName:"Scanned item · " + String(code),
      price:"Price on request",
      stock:"In stock",
      image:"",
      url:FEEDS_URL + "?tubalhub_scan=" + encodeURIComponent(String(code)),
      scanCode:String(code),
      source:"embed"
    };
  }

  function post(code){
    const value = String(code || "").trim();
    if(!value) return;
    const item = makeItem(value);
    try{
      const feeds = fallbackFeeds().filter(x => !String(x.id || "").startsWith("fallback-"));
      localStorage.setItem(KEY,JSON.stringify([item,...feeds].slice(0,100)));
    }catch(e){}
    copy.textContent = "Added. Opening feed…";
    stop();
    // Cross-origin pages cannot directly write tubalrr.github.io localStorage.
    // The feed page consumes this one-time bridge payload and persists it in its own origin.
    window.open(FEEDS_URL + "?tubalhub_scan=" + encodeURIComponent(value),"tubalhub-feeds");
    setTimeout(()=>{backdrop.classList.remove("open");},450);
  }

  async function start(){
    copy.textContent = "Requesting camera…";
    try{
      stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"}},audio:false});
      video.srcObject = stream;
      await video.play();
    }catch(e){
      copy.textContent = "Camera unavailable. Use the field below to add a code.";
      return;
    }

    if("BarcodeDetector" in window){
      try{
        detector = new BarcodeDetector({
          formats:["qr_code","code_128","code_39","code_93","ean_13","ean_8","upc_a","upc_e"]
        });
        scanLoop();
        return;
      }catch(e){}
    }

    try{
      if(!window.Html5Qrcode) await loadScript("https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js");
      qr = new Html5Qrcode("__tubalhub_embed_reader");
    }catch(e){
      copy.textContent = "Automatic scan is unavailable here. Enter the code below.";
    }
  }

  async function scanLoop(){
    if(!detector || !video || video.readyState < 2){
      timer = setTimeout(scanLoop,250); return;
    }
    try{
      const results = await detector.detect(video);
      if(results && results[0] && results[0].rawValue){ post(results[0].rawValue); return; }
    }catch(e){}
    timer = setTimeout(scanLoop,220);
  }

  function stop(){
    if(timer) clearTimeout(timer);
    timer = null;
    if(qr){ try{qr.stop().catch(()=>{});qr.clear();}catch(e){} qr=null; }
    if(stream){ stream.getTracks().forEach(t=>t.stop()); stream=null; }
    if(video) video.srcObject = null;
  }

  btn.addEventListener("click",()=>{
    backdrop.classList.add("open");
    copy.textContent = "Align a QR code or barcode inside the guide.";
    start();
  });
  close.addEventListener("click",()=>{stop();backdrop.classList.remove("open");});
  backdrop.addEventListener("click",e=>{if(e.target===backdrop){stop();backdrop.classList.remove("open");}});
  add.addEventListener("click",()=>post(manual.value));
  manual.addEventListener("keydown",e=>{if(e.key==="Enter") post(manual.value);});
})();