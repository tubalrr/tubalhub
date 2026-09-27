import {getSavedItems,removeSaved} from "../assets/js/retention.js";

const style=document.createElement("style");
style.textContent=".saved-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.saved-card{overflow:hidden;border:1px solid rgba(29,255,145,.12);border-radius:16px;background:rgba(255,255,255,.035)}.saved-media{height:130px;background:rgba(255,255,255,.04);display:grid;place-items:center;overflow:hidden}.saved-media img{width:100%;height:100%;object-fit:cover}.saved-placeholder{font-size:28px}.saved-copy{padding:12px}.saved-copy small{font-size:8px;letter-spacing:.12em;color:#6f8279}.saved-copy h3{margin:5px 0;font-size:14px}.saved-copy p{margin:0;color:#84978d;font-size:9px;line-height:1.5;min-height:28px}.saved-actions{display:flex;gap:7px;margin-top:10px}.saved-actions a,.saved-actions button{height:30px;padding:0 10px;border-radius:999px;border:1px solid rgba(29,255,145,.15);background:rgba(29,255,145,.06);color:inherit;text-decoration:none;font:800 8px/30px Inter,sans-serif;cursor:pointer}.saved-actions button{background:rgba(255,255,255,.04)}@media(max-width:600px){.saved-grid{grid-template-columns:1fr}}";
document.head.appendChild(style);

function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}
function renderSaved(){
  const host=document.getElementById("savedContent");
  if(!host)return;
  const rows=getSavedItems();
  if(!rows.length){
    host.innerHTML='<div class="empty-content premium-empty"><div class="empty-orbit">◇</div><strong>No saved content yet</strong><small>Save a Feed, Event or Game and it will appear here.</small></div>';
    return;
  }
  host.innerHTML='<div class="saved-grid">'+rows.map(x=>{
    const href=x.url||x.productUrl||"../index.html";
    const image=x.image?'<img src="'+esc(x.image)+'" alt="" loading="lazy">':'<span class="saved-placeholder">'+(x.type==="game"?"🎮":x.type==="event"?"▧":"◉")+'</span>';
    return '<article class="saved-card"><div class="saved-media">'+image+'</div><div class="saved-copy"><small>'+esc(String(x.type||"content").toUpperCase())+'</small><h3>'+esc(x.title||"Saved content")+'</h3><p>'+esc(x.description||x.author||"TUBAL HUB")+'</p><div class="saved-actions">'+(href&&href!=="../index.html"?'<a href="'+esc(href)+'" target="_blank" rel="noopener">Open</a>':"")+'<button type="button" data-unsave="'+esc(x.id)+'">Remove</button></div></div></article>';
  }).join("")+'</div>';
  host.querySelectorAll("[data-unsave]").forEach(b=>b.addEventListener("click",()=>{removeSaved(b.dataset.unsave);renderSaved()}));
}
function installSavedTab(){
  const tabs=document.getElementById("profileTabs");
  const overview=document.getElementById("overview");
  if(!tabs||!overview)return;
  if(!document.getElementById("savedTab")){
    const a=document.createElement("a");a.id="savedTab";a.href="#saved";a.textContent="Saved";tabs.appendChild(a);
  }
  if(!document.getElementById("saved")){
    const section=document.createElement("section");section.id="saved";section.className="panel content-panel";
    section.innerHTML='<div class="panel-title"><div><span class="panel-kicker">RETENTION</span><h2>Saved</h2></div><span class="real-label">LOCAL</span></div><div id="savedContent"></div>';
    overview.querySelector(".left-column")?.appendChild(section);
  }
  document.getElementById("savedTab").addEventListener("click",()=>setTimeout(renderSaved,0));
  if(location.hash==="#saved")setTimeout(()=>{document.getElementById("savedTab").click();document.getElementById("saved")?.scrollIntoView({behavior:"smooth"});},150);
  renderSaved();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",installSavedTab,{once:true});else installSavedTab();
