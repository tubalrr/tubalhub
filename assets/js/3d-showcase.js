(()=>{
  "use strict";
  if(window.__tubal3DShowcaseLoaded)return;
  window.__tubal3DShowcaseLoaded=true;
  const scenes=[...document.querySelectorAll("#latest3dShowcase .th-3d-scene")];
  if(!scenes.length)return;
  let current=0;
  const labels=[["01","ORB"],["02","CUBE"],["03","TORUS"]];
  const labelWrap=document.querySelector("#latest3dShowcase .th-3d-scenes-label");
  function setScene(next){
    current=(next+scenes.length)%scenes.length;
    scenes.forEach((scene,i)=>scene.classList.toggle("is-active",i===current));
    if(labelWrap){
      labelWrap.innerHTML=labels.map((item,i)=>"<span class=\"" + (i===current?"is-current":"") + "\">" + item[0] + "</span><span>" + item[1] + "</span>").join("");
    }
  }
  setScene(0);
  setInterval(()=>setScene(current+1),5200);
  const versionEl=document.getElementById("latest3dVersion");
  const descEl=document.getElementById("latest3dDescription");
  fetch("version.json?3d="+Date.now(),{cache:"no-store"}).then(r=>r.ok?r.json():null).then(data=>{
    if(!data)return;
    if(versionEl&&data.version)versionEl.textContent="LIVE · v"+data.version;
    if(descEl){
      const latest=Array.isArray(data.updatesReal)&&data.updatesReal[0];
      if(latest)descEl.textContent=latest.replace(/^v[^ ]+\s+(FEAT|FIX|UI|PERF|BUILD|SECURITY|ADMIN|CLEANUP|AUDIT|REFACTOR)\s*[—-]?\s*/i,"");
    }
  }).catch(()=>{});
})();
