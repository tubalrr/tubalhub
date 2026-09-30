/* TUBAL HUB — Silent AI Female Showcase Guide v1.2.83
 * The top Welcome Bot remains the site's voice layer.
 * This Hero guide only demonstrates the site's real sections visually.
 */
(() => {
  "use strict";

  const root=document.getElementById("thHeroAiGuide");
  const stage=document.getElementById("thPresenterPanelStage");
  const title=document.getElementById("thPresenterTitle");
  const text=document.getElementById("thPresenterText");
  const count=document.getElementById("thPresenterCount");
  const nav=[...root?.querySelectorAll(".th-ai-guide-nav span")||[]];
  if(!root||!stage) return;

  const items=[
    {icon:"🌿",title:"Payapang Isip",meta:"Wellness tools · journals · AI music",open:"EXPLORE",href:"pages/payapang-isip.html",desc:"A calm digital space for wellness tools, journals, and creative AI experiences."},
    {icon:"🛒",title:"TUBAL HUB Shop",meta:"Commerce · digital products · offers",open:"SHOP",href:"pages/shop.html",desc:"Browse the connected commerce branch and current TUBAL HUB offerings."},
    {icon:"🎮",title:"Gaming Zone",meta:"Games · gaming catalog · entertainment",open:"PLAY",href:"pages/gaming-zone.html",desc:"The gaming branch with the current catalog and gaming-focused experiences."},
    {icon:"📰",title:"News & Updates",meta:"Announcements · releases · system changes",open:"READ",href:"pages/news.html",desc:"Stay informed about published news, announcements, and system releases."},
    {icon:"💬",title:"Community & Chat",meta:"Community · global chat · events",open:"JOIN",href:"pages/community.html",desc:"Connect with the TUBAL HUB community through discussion, chat, and events."},
    {icon:"🎵",title:"AI Music",meta:"Creative audio · saved tracks",open:"CREATE",href:"pages/ai-music.html",desc:"Create and explore the AI Music area and its saved audio experience."},
    {icon:"▣",title:"LifeHub & Personal OS",meta:"Personal organization · tools",open:"OPEN",href:"lifehub/index.html",desc:"Personal productivity spaces for organizing your own work and information."}
  ];

  const cards=items.map((item,i)=>{
    const card=document.createElement("a");
    card.className="th-ai-show-card"+(i===0?" is-active":"");
    card.href=item.href;
    card.dataset.index=String(i);
    card.innerHTML='<span class="th-ai-show-icon" aria-hidden="true">'+item.icon+'</span><span class="th-ai-show-copy"><strong>'+item.title+'</strong><small>'+item.meta+'</small></span><span class="th-ai-show-open">'+item.open+' →</span>';
    stage.appendChild(card);
    return card;
  });

  let index=0;
  let timer=null;

  function select(next){
    index=(next+items.length)%items.length;
    cards.forEach((card,i)=>card.classList.toggle("is-active",i===index));
    root.dataset.active = String(index);
    nav.forEach((n,i)=>n.classList.toggle("is-active",i===index));
    const item=items[index];
    root.classList.remove("is-showing");
    void root.offsetWidth;
    root.classList.add("is-showing");
    if(title) title.textContent=item.title;
    if(text) text.textContent=item.desc;
    if(count) count.textContent=String(index+1).padStart(2,"0")+" / "+String(items.length).padStart(2,"0");
  }

  function restart(){
    if(timer) window.clearInterval(timer);
    timer=window.setInterval(()=>select(index+1),3600);
  }

  root.addEventListener("pointerenter",()=>{if(timer)window.clearInterval(timer);},{passive:true});
  root.addEventListener("pointerleave",restart,{passive:true});

  select(0);
  restart();
})();
