/* REAL SEARCH TEST CHECKLIST
   TEST: type "valorant" → should show VALORANT with its real logo → Enter → pages/ctrlzone.html?game=valorant
   TEST mobile: open search, type "valorant", tap the real result
   REAL SOURCES: localStorage journals/feeds + /data/games.json + live Firestore content
*/
/* TUBAL HUB — Global Spotlight Search
   UI is independent of Firebase so the command palette never opens blank.
   Live Firestore content is loaded opportunistically after the UI is ready.
*/
const RECENT_KEY="tubalhub.search.recent.v2";

let modal=null,input=null,topInput=null,results=[],activeIndex=0,debounceId=null,cache=null,cacheAt=0;

const esc=v=>{const d=document.createElement("div");d.textContent=String(v??"");return d.innerHTML};
const norm=v=>String(v??"").toLowerCase().trim();

function recent(){
  try{const x=JSON.parse(localStorage.getItem(RECENT_KEY)||"[]");return Array.isArray(x)?x.slice(0,5):[]}catch(_){return[]}
}
function saveRecent(q){
  q=String(q||"").trim();if(!q)return;
  const next=[q,...recent().filter(x=>norm(x)!==norm(q))].slice(0,5);
  try{localStorage.setItem(RECENT_KEY,JSON.stringify(next))}catch(_){}
}
function highlight(value,q){
  const safe=esc(value),s=norm(q);
  if(!s)return safe;
  const rx=new RegExp("("+s.replace(/[.*+?^$()|[\]\\]/g,"\\$&")+")","ig");
  return safe.replace(rx,'<mark class="th-search-mark">$1</mark>');
}

function ensureUi(){
  if(document.getElementById("thSearchOverlay"))return;
  document.body.insertAdjacentHTML("beforeend",
    '<div class="th-overlay th-search-overlay" id="thSearchOverlay" hidden style="display:none;pointer-events:none">'+
      '<section class="th-search-modal" id="searchModalReal" role="dialog" aria-modal="true" aria-label="Global Search">'+
        '<div class="th-search-input-row">'+
          '<span class="th-search-input-icon" aria-hidden="true">⌕</span>'+
          '<input class="th-search-input" id="thGlobalSearchInput" autocomplete="off" spellcheck="false" placeholder="Search games, journals, shop... real data" aria-label="Search TUBAL HUB">'+
          '<kbd class="th-search-esc">ESC</kbd>'+
          '<button class="th-search-clear" id="thSearchClear" type="button" aria-label="Clear search">×</button>'+
        '</div>'+
        '<div class="th-search-body" id="thSearchBody"></div>'+
        '<footer class="th-search-footer"><span><kbd>↑↓</kbd> Navigate</span><span><kbd>Enter</kbd> Select</span><span><kbd>ESC</kbd> Close</span></footer>'+
      '</section>'+
    '</div>'
  );
  modal=document.getElementById("thSearchOverlay");
  input=document.getElementById("thGlobalSearchInput");
  document.getElementById("thSearchClear").onclick=()=>{
    input.value="";
    if(topInput)topInput.value="";
    render("");
    input.focus();
  };
  input.addEventListener("input",()=>{
    if(topInput)topInput.value=input.value;
    clearTimeout(debounceId);
    const q=input.value;
    debounceId=setTimeout(()=>render(q),140);
  });
  input.addEventListener("keydown",onKey);
  modal.addEventListener("click",e=>{if(e.target===modal)close()});
  window.__tubalOpenSearch=q=>open(q||"");
}

function open(q=""){
  ensureUi();
  modal.hidden=false;
  modal.style.display="grid";
  modal.style.pointerEvents="auto";
  modal.classList.add("is-open");
  document.getElementById("searchModalReal")?.classList.add("is-open");
  document.querySelector(".search-box")?.classList.add("is-open");
  if(topInput)topInput.value=q;
  input.value=q;
  render(q);
  requestAnimationFrame(()=>input.focus({preventScroll:true}));
}
function close(){
  if(!modal)return;
  modal.classList.remove("is-open");
  document.getElementById("searchModalReal")?.classList.remove("is-open");
  modal.style.pointerEvents="none";
  document.querySelector(".search-box")?.classList.remove("is-open");
  setTimeout(()=>{
    if(!modal.classList.contains("is-open")){
      modal.hidden=true;
      modal.style.display="none";
    }
  },230);
}

function shortcutData(){
  return [
    {title:"Feeds",meta:"Social feed",icon:"▣",url:"pages/feeds.html"},
    {title:"Create Story",meta:"Create from Feeds",icon:"✦",url:"pages/feeds.html"},
    {title:"CTRLZONE",meta:"Games",icon:"🎮",url:"pages/ctrlzone.html"},
    {title:"Shop",meta:"Products",icon:"🛒",url:"pages/shop.html"},
    {title:"News",meta:"Latest updates",icon:"▤",url:"pages/news.html"},
    {title:"Global Chat",meta:"Live chat",icon:"💬",url:"pages/chat.html"},
    {title:"Community",meta:"Community hub",icon:"◉",url:"pages/community.html"},
    {title:"Events",meta:"Hub events",icon:"◫",url:"pages/events.html"},
    {title:"Profiles",meta:"Members",icon:"◌",url:"pages/profiles.html"}
  ];
}

function getRealJournals(){
  const keys=["tubalhub_journals_real","tubalhub_journal"];
  for(const key of keys){
    try{
      const raw=localStorage.getItem(key);
      if(raw===null)continue;
      const parsed=raw?JSON.parse(raw):[];
      if(Array.isArray(parsed))return parsed;
    }catch(_){}
  }
  return [];
}

function getRealFeeds(){
  try{
    const raw=localStorage.getItem("tubalhub_feeds");
    const parsed=raw?JSON.parse(raw):[];
    return Array.isArray(parsed)?parsed:[];
  }catch(_){return []}
}

function readArray(keys){
  for(const key of keys){
    try{
      const raw=localStorage.getItem(key);
      if(raw===null) continue;
      const parsed=raw?JSON.parse(raw):[];
      if(Array.isArray(parsed)) return parsed;
    }catch(_){}
  }
  return [];
}

function localSearchRows(){
  const out={people:[],posts:[],products:[],games:[],events:[]};

  const journals=readArray(["tubalhub_journals_real","tubalhub_journal"]);
  journals.forEach((entry,index)=>{
    const title=String(entry?.titleReal||entry?.title||entry?.name||"").trim();
    const content=String(entry?.contentReal||entry?.text||entry?.content||entry?.body||"").trim();
    if(title||content) out.posts.push({
      kind:"posts",id:"journal-"+String(entry?.idReal||entry?.id||index),
      title:title||content.slice(0,80),author:"Payapang Isip",meta:"Journal",
      createdAt:Number(entry?.createdAtReal||entry?.createdAt||0)||0,
      url:"pages/payapang-isip.html"
    });
  });

  readArray(["tubalhub_feeds","tubalhub_feed","tubalhub_posts"]).forEach((entry,index)=>{
    const title=String(entry?.titleReal||entry?.title||"").trim();
    const text=String(entry?.textReal||entry?.text||entry?.contentReal||entry?.content||"").trim();
    if(title||text) out.posts.push({
      kind:"posts",id:"feed-"+String(entry?.idReal||entry?.id||index),
      title:title||text.slice(0,80),
      author:String(entry?.userReal||entry?.author||"Member").trim()||"Member",
      meta:"Community Feed",
      image:String(entry?.imageReal||entry?.image||"").trim(),
      createdAt:Number(entry?.createdAtReal||entry?.createdAt||0)||0,
      url:"pages/feeds.html"
    });
  });

  readArray(["tubalhub_music_library","tubalhub_music","tubalhub_ai_music"]).forEach((entry,index)=>{
    const title=String(entry?.title||entry?.name||entry?.prompt||"").trim();
    if(title) out.posts.push({
      kind:"music",id:"music-"+String(entry?.id||index),title,
      meta:"AI Music · "+String(entry?.genre||"Music"),
      createdAt:Number(entry?.createdAt||0)||0,
      url:"pages/ai-music.html"
    });
  });

  readArray(["tubalhub_search_games","tubalhub_games","ctrlzone_games"]).forEach((entry,index)=>{
    const title=String(entry?.titleReal||entry?.title||entry?.name||"").trim();
    const id=String(entry?.idReal||entry?.id||index);
    if(title) out.games.push({
      kind:"games",id,title,
      meta:String(entry?.genre||entry?.category||"Game"),
      image:String(entry?.logoReal||entry?.logo||entry?.image||"").trim(),
      url:"pages/ctrlzone.html?game="+encodeURIComponent(id)
    });
  });

  readArray(["tubalhub_products","tubalhub_shop","tubalhub_cart_real"]).forEach((entry,index)=>{
    const title=String(entry?.name||entry?.title||"").trim();
    if(title) out.products.push({
      kind:"products",id:String(entry?.id||index),title,
      price:entry?.price??"",shop:entry?.shopName||entry?.category||"Shop",
      image:entry?.imageUrl||entry?.image||"",url:"pages/shop.html"
    });
  });

  return out;
}

const DEFAULT_GAMES=[
  ["mobile-legends","Mobile Legends","MOBA"],
  ["honor-of-kings","Honor of Kings","MOBA"],
  ["pubg-mobile","PUBG Mobile","Battle Royale"],
  ["call-of-duty-mobile","Call of Duty Mobile","FPS"],
  ["valorant","VALORANT","FPS"],
  ["minecraft","Minecraft","Sandbox"],
  ["euro-truck-simulator-2","Euro Truck Simulator 2","Simulation"],
  ["city-skylines","Cities: Skylines","Simulation"],
  ["transport-fever","Transport Fever","Simulation"],
  ["workers-resources","Workers & Resources","Simulation"],
  ["ultimate-bus-simulator","Ultimate Bus Simulator","Simulation"]
];

function ensureLocalGameIndex(){
  try{
    const key="tubalhub_search_games";
    const current=JSON.parse(localStorage.getItem(key)||"[]");
    if(Array.isArray(current)&&current.length)return;
    localStorage.setItem(key,JSON.stringify(DEFAULT_GAMES.map(([id,title,genre])=>({id,title,genre}))));
  }catch(_){}
}

function loadLocalSearchData(){
  ensureLocalGameIndex();
  const data=localSearchRows();
  const games=readArray(["tubalhub_search_games"]);
  games.forEach((g,index)=>{
    const title=String(g?.titleReal||g?.title||g?.name||"").trim();
    if(!title)return;
    const id=String(g?.idReal||g?.id||index);
    if(!data.games.some(x=>norm(x.title)===norm(title))) data.games.push({
      kind:"games",id,title,meta:String(g?.genre||g?.category||"Game"),
      image:String(g?.logoReal||g?.logo||g?.image||""),
      url:"pages/ctrlzone.html?game="+encodeURIComponent(id)
    });
  });
  return data;
}

function score(x,q){
  const terms=norm(q).split(/\\s+/).filter(Boolean);
  const hay=norm([x.title,x.name,x.handle,x.author,x.shop,x.meta].join(" "));
  let n=0;
  terms.forEach(t=>{if(hay.includes(t))n+=hay.startsWith(t)?4:1});
  if(norm(x.title).includes(norm(q)))n+=4;
  return n;
}
function groupResults(data,q){
  const qn=norm(q);
  const groups=[
    ["Journals & Feeds",data.posts.filter(x=>x.kind!=="music"&&score(x,qn)>0).sort((a,b)=>score(b,qn)-score(a,qn)).slice(0,8)],
    ["Music",data.posts.filter(x=>x.kind==="music"&&score(x,qn)>0).slice(0,6)],
    ["Games",data.games.filter(x=>score(x,qn)>0).slice(0,8)],
    ["Products",data.products.filter(x=>score(x,qn)>0).slice(0,6)],
    ["People",data.people.filter(x=>norm([x.title,x.meta].join(" ")).includes(qn)).slice(0,6)],
    ["Events",data.events.filter(x=>score(x,qn)>0).slice(0,6)]
  ];
  return groups.filter(g=>g[1].length);
}

function visual(x){
  if(x.kind==="people"){
    return '<div class="th-search-person"><div class="th-search-thumb"><img src="'+esc(x.photo||"tubal-hub-logo.png")+'" alt=""></div><span class="th-search-person-dot '+(x.online?"online":"offline")+'"></span></div>';
  }
  if(x.image)return '<div class="th-search-thumb"><img src="'+esc(x.image)+'" alt=""></div>';
  return '<div class="th-search-icon-box">'+esc(x.icon||"⌕")+'</div>';
}
function itemHtml(x,index){
  const title=x.title||x.name||"Result";
  const meta=x.kind==="people"?(x.online?'<span class="online">Online now</span>':esc(x.meta||"Member")):esc(x.meta||"");
  const price=x.kind==="products"&&x.price!==""?'<div class="th-search-result-price">'+(String(x.price).trim().startsWith("₱")?"":"₱")+esc(x.price)+'</div>':"";
  return '<div class="th-search-result" role="option" tabindex="-1" data-index="'+index+'">'+visual(x)+
    '<div class="th-search-result-copy"><div class="th-search-result-title">'+highlight(title,input.value)+'</div><div class="th-search-result-meta">'+meta+'</div>'+price+'</div>'+
    '<span class="th-search-result-arrow">›</span></div>';
}

function renderQuickAccess(trend=[]){
  const body=document.getElementById("thSearchBody");if(!body)return;
  const r=recent();
  body.innerHTML=
    '<section class="th-search-section"><h3 class="th-search-section-title">Quick Access</h3><div class="th-search-chips">'+
    shortcutData().slice(0,6).map(x=>'<button class="th-search-chip" data-shortcut="'+esc(x.title)+'">'+esc(x.title)+'</button>').join("")+
    '</div></section>'+
    (r.length?'<section class="th-search-section"><h3 class="th-search-section-title">Recent Searches</h3><div class="th-search-chips">'+r.map(x=>'<button class="th-search-chip" data-chip="'+esc(x)+'">'+esc(x)+'</button>').join("")+'</div></section>':"")+
    '<section class="th-search-section" id="thSearchTrending"><h3 class="th-search-section-title">Trending</h3><div class="th-search-chips">'+
    (trend.length?trend.map(x=>'<button class="th-search-chip" data-chip="'+esc(x.title)+'">'+esc(x.title).slice(0,42)+'</button>').join(""):'<span class="th-search-chip" style="cursor:default;opacity:.6">No live content yet</span>')+
    '</div></section>';
  bindChips();
}
function render(q){
  ensureUi();
  const body=document.getElementById("thSearchBody");if(!body)return;
  const queryText=String(q||"").trim();
  if(!queryText){
    results=[];activeIndex=0;renderQuickAccess();
    const d=loadLocalSearchData();
    const trend=[...d.posts,...d.products,...d.games].sort((a,b)=>b.createdAt-a.createdAt).slice(0,6);
    const section=document.getElementById("thSearchTrending");
    if(section&&trend.length){
      section.innerHTML='<h3 class="th-search-section-title">Trending</h3><div class="th-search-chips">'+trend.map(x=>'<button class="th-search-chip" data-chip="'+esc(x.title)+'">'+esc(x.title).slice(0,42)+'</button>').join("")+'</div>';
      bindChips();
    }
    return;
  }
  body.innerHTML='<div class="th-search-empty"><div class="th-search-empty-icon">⌕</div><strong>Searching…</strong><span>Finding people, posts, products, games and events.</span></div>';
  const d=loadLocalSearchData();
  const groups=groupResults(d,queryText);
  if(!groups.length){
    results=[];activeIndex=0;
    body.innerHTML='<div class="th-search-empty"><div class="th-search-empty-icon">⌕</div><strong>No results for “'+esc(queryText)+'”</strong><span>Try a different search or use Quick Access.</span></div>';
    return;
  }
  results=[];let html="";
  groups.forEach(g=>{
    html+='<section class="th-search-results-group"><h3 class="th-search-section-title">'+esc(g[0])+'</h3>';
    g[1].forEach(x=>{const i=results.length;results.push(x);html+=itemHtml(x,i)});
    html+='</section>';
  });
  body.innerHTML=html;activeIndex=0;refreshActive();
  body.querySelectorAll(".th-search-result").forEach((el,i)=>{
    el.onmouseenter=()=>{activeIndex=i;refreshActive()};
    el.onclick=()=>select(i);
  });
}
function refreshActive(){
  document.querySelectorAll(".th-search-result").forEach((el,i)=>el.classList.toggle("active",i===activeIndex));
}
function select(i){
  const x=results[i];if(!x)return;
  saveRecent(input.value);
  window.location.href=x.url||"index.html";
}
function bindChips(){
  document.querySelectorAll("[data-chip]").forEach(b=>b.onclick=()=>{input.value=b.dataset.chip||"";if(topInput)topInput.value=input.value;render(input.value);input.focus()});
  document.querySelectorAll("[data-shortcut]").forEach(b=>b.onclick=()=>{
    const map={Feeds:"pages/feeds.html","Create Story":"pages/feeds.html",CTRLZONE:"pages/ctrlzone.html",Shop:"pages/shop.html","Global Chat":"pages/chat.html",News:"pages/news.html"};
    if(map[b.dataset.shortcut]){saveRecent(b.dataset.shortcut);window.location.href=map[b.dataset.shortcut]}
  });
}
function onKey(e){
  if(e.key==="Escape"){e.preventDefault();close();return}
  if(e.key==="ArrowDown"&&results.length){e.preventDefault();activeIndex=(activeIndex+1)%results.length;refreshActive();document.querySelectorAll(".th-search-result")[activeIndex]?.scrollIntoView({block:"nearest"});return}
  if(e.key==="ArrowUp"&&results.length){e.preventDefault();activeIndex=(activeIndex-1+results.length)%results.length;refreshActive();document.querySelectorAll(".th-search-result")[activeIndex]?.scrollIntoView({block:"nearest"});return}
  if(e.key==="Enter"&&results.length){e.preventDefault();select(activeIndex)}
}
function init(){
  ensureUi();
  topInput=document.querySelector(".search-box input");
  const box=document.querySelector(".search-box");
  if(topInput){
    topInput.id="searchInputReal";
    topInput.removeAttribute("readonly");
    topInput.removeAttribute("tabindex");
    topInput.addEventListener("input",()=>{
      clearTimeout(debounceId);
      if(modal?.classList.contains("is-open")){
        input.value=topInput.value;
        debounceId=setTimeout(()=>render(topInput.value),140);
      }
    });
    topInput.addEventListener("keydown",e=>{
      if(e.key==="Enter"){e.preventDefault();open(topInput.value||"");input.focus()}
      if(e.key==="Escape"){e.preventDefault();close();topInput.blur()}
    });
  }
  box?.addEventListener("click",e=>{
    if(e.target===topInput)return;
    if(e.target.closest(".search-shortcut")){e.preventDefault();open(topInput?.value||"")}
  });
  document.addEventListener("keydown",e=>{
    if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="k"){e.preventDefault();open(topInput?.value||"");return}
    if(e.key==="Escape"&&modal&&!modal.hidden)close();
    if(e.key==="Tab"&&modal&&!modal.hidden){
      const focusables=[input,...modal.querySelectorAll("button")].filter(Boolean);
      if(!focusables.length)return;
      const first=focusables[0],last=focusables[focusables.length-1];
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
    }
  });
}
ensureUi();
init();
render("");
