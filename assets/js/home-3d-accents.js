(()=>{
  "use strict";
  if(window.__tubal3DAccentsLoaded)return;
  window.__tubal3DAccentsLoaded=true;
  const SELECTORS=[
    ".bento-home-page .bento-card",".bento-home-page .brand-card",
    ".bento-home-page .live-card",".bento-home-page .social-card",
    ".bento-home-page .journal-card",".bento-home-page .ai-card",
    ".bento-home-page .music-real-card",".bento-home-page .game-feature-card",
    ".bento-home-page .feed-card",".bento-home-page .real-data-card",
    ".bento-home-page .video-card",".bento-home-page .th-pillar",
    ".bento-home-page .sponsored-container-real",".bento-home-page .featured-feature-card"
  ];
  function addAccent(container,index){
    if(!(container instanceof HTMLElement)||container.dataset.th3dAccent)return;
    container.dataset.th3dAccent="1";
    if(getComputedStyle(container).position==="static")container.style.position="relative";
    const wrap=document.createElement("div");
    wrap.className="th-card-3d-accent";
    wrap.style.setProperty("--th-accent-delay",((index%7)*0.32)+"s");
    wrap.setAttribute("aria-hidden","true");
    wrap.innerHTML='<span class="th-card-3d-shadow"></span><span class="th-card-3d-ring th-card-3d-ring-a"></span><span class="th-card-3d-ring th-card-3d-ring-b"></span><span class="th-card-3d-orb"></span><i class="th-card-3d-particle th-card-3d-p1"></i><i class="th-card-3d-particle th-card-3d-p2"></i>';
    container.appendChild(wrap);
  }
  function scan(){
    let index=0;
    document.querySelectorAll(SELECTORS.join(",")).forEach(node=>addAccent(node,index++));
  }
  function boot(){
    scan();
    const observer=new MutationObserver(scan);
    observer.observe(document.body,{childList:true,subtree:true});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});
  else boot();
})();
