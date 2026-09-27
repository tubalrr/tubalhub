import {getSavedItems,removeSaved} from "../assets/js/retention.js";

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
