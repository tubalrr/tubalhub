/* TUBAL HUB — Global Spotlight Search */
import {app,auth} from "./firebase-config.js";
import {onAuthStateChanged} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {getFirestore,collection,getDocs,limit,query} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const db=getFirestore(app);
const RECENT_KEY="tubalhub.search.recent.v1";
let modal=null,input=null,results=[],activeIndex=0,debounceId=null,cache=null,cacheAt=0,readyUser=false;

const esc=v=>{const d=document.createElement("div");d.textContent=String(v??"");return d.innerHTML};
const norm=v=>String(v??"").toLowerCase().trim();
const highlight=(value,q)=>{
  const safe=esc(value),s=norm(q);
  if(!s)return safe;
  const rx=new RegExp("("+s.replace(/[.*+?^$()|[\]\\]/g,"\\$&")+")","ig");
  return safe.replace(rx,'<mark class="th-search-mark">$1</mark>');
};
function recent(){
  try{const x=JSON.parse(localStorage.getItem(RECENT_KEY)||"[]");return Array.isArray(x)?x.slice(0,5):[]}catch(_){return[]}
}
function saveRecent(q){
  q=String(q||"").trim();if(!q)return;
  const next=[q].concat(recent().filter(x=>norm(x)!==norm(q))).slice(0,5);
  try{localStorage.setItem(RECENT_KEY,JSON.stringify(next))}catch(_){}
}
function ensureUi(){
  if(document.getElementById("thSearchOverlay"))return;
  document.body.insertAdjacentHTML("beforeend",
    '<div class="th-overlay th-search-overlay" id="thSearchOverlay" hidden>'+
      '<section class="th-search-modal" id="thSearchModal" role="dialog" aria-modal="true">'+
        '<div class="th-search-input-row"><span class="th-search-input-icon" aria-hidden="true">⌕</span>'+
        '<input class="th-search-input" id="thGlobalSearchInput" autocomplete="off" spellcheck="false" placeholder="Search TUBAL HUB..." aria-label="Search TUBAL HUB">'+
        '<kbd class="th-search-esc">ESC</kbd><button class="th-search-clear" id="thSearchClear" type="button" aria-label="Clear search">×</button></div>'+
        '<div class="th-search-body" id="thSearchBody"></div>'+
        '<footer class="th-search-footer"><span><kbd>↑↓</kbd> Navigate</span><span><kbd>Enter</kbd> Select</span><span><kbd>ESC</kbd> Close</span></footer>'+
      '</section>'+
    '</div>');
  modal=document.getElementById("thSearchOverlay");
  input=document.getElementById("thGlobalSearchInput");
  modal.onclick=e=>{if(e.target===modal)close()};
  document.getElementById("thSearchClear").onclick=()=>{input.value="";render("")};
  input.oninput=()=>{clearTimeout(debounceId);const q=input.value;debounceId=setTimeout(()=>render(q),200)};
  input.onkeydown=onKey;
  modal.style.display="none";modal.style.pointerEvents="none";
  window.__tubalOpenSearch=()=>open("");
}
async function docs(name,count){
  try{return(await getDocs(query(collection(db,name),limit(count)))).docs}catch(_){return[]}
}
function ms(x){return x?.toMillis?.()||x?.seconds*1000||0}
async function loadData(){
  const now=Date.now();
  if(cache&&now-cacheAt<60000)return cache;
  const out={people:[],posts:[],products:[],games:[],events:[],pages:[
    {title:"Feeds",meta:"Social feed",icon:"▣",url:"pages/feeds.html"},
    {title:"CTRLZONE",meta:"Games",icon:"🎮",url:"pages/ctrlzone.html"},
    {title:"News",meta:"Latest updates",icon:"▤",url:"pages/news.html"},
    {title:"Shop",meta:"Products",icon:"🛒",url:"pages/shop.html"},
    {title:"Community",meta:"Community hub",icon:"◉",url:"pages/community.html"},
    {title:"Events",meta:"Hub events",icon:"◫",url:"pages/events.html"},
    {title:"Profiles",meta:"Members",icon:"◌",url:"pages/profiles.html"},
    {title:"Global Chat",meta:"Live chat",icon:"💬",url:"pages/chat.html"}
  ]};
  const [people,hub,products,presence]=await Promise.all([
    readyUser?docs("users",100):Promise.resolve([]),
    docs("hubPosts",200),
    docs("products",100),
    docs("presence",100)
  ]);
  const pmap=new Map();
  presence.forEach(d=>{const x=d.data();pmap.set(String(x.uid||d.id),x)});
  out.people=people.map(d=>{
    const x=d.data(),p=pmap.get(String(x.uid||d.id));
    return {id:d.id,uid:x.uid||d.id,name:x.displayName||x.name||"Member",handle:x.username||x.handle||"",photo:x.photoURL||"",online:!!p&&p.online===true};
  }).sort((a,b)=>Number(b.online)-Number(a.online)||String(a.name).localeCompare(String(b.name)));
  hub.forEach(d=>{
    const x=d.data(),type=norm(x.contentType),dest=Array.isArray(x.destinations)?x.destinations.map(norm):[];
    const title=String(x.title||x.text||"").trim();if(!title)return;
    const base={id:d.id,title,author:x.authorName||"TUBAL HUB",image:x.imageUrl||x.image||"",createdAt:ms(x.createdAt)};
    if(type==="post"&&(dest.length===0||dest.includes("feeds")))out.posts.push({...base,kind:"posts",meta:"by "+base.author,url:"pages/feeds.html"});
    if(type==="game"&&(dest.length===0||dest.includes("games"))){const count=Number.isFinite(Number(x.playersOnline))?Number(x.playersOnline):(Number.isFinite(Number(x.onlineCount))?Number(x.onlineCount):null);out.games.push({...base,kind:"games",meta:count!==null?"Players online: "+count:"CTRLZONE",onlineCount:count,url:"pages/ctrlzone.html"});}
    if(type==="event"&&(dest.length===0||dest.includes("events")))out.events.push({...base,kind:"events",meta:"Events",url:"pages/events.html"});
    if(type==="news")out.posts.push({...base,kind:"posts",meta:"News · "+base.author,url:"pages/news.html"});
  });
  out.products=products.map(d=>{
    const x=d.data();return{id:d.id,title:String(x.name||x.title||"").trim(),price:x.price??"",shop:x.shopName||x.category||"Shop",image:x.imageUrl||x.image||"",url:"pages/shop.html",kind:"products"};
  }).filter(x=>x.title);
  cache=out;cacheAt=now;return out;
}
function open(q){
  ensureUi();modal.hidden=false;modal.style.display="grid";modal.style.pointerEvents="auto";
  document.querySelector(".search-box")?.classList.add("is-open");
  requestAnimationFrame(()=>{modal.classList.add("is-open");input.value=q||"";render(q||"");input.focus({preventScroll:true})});
}
function close(){
  if(!modal)return;
  modal.classList.remove("is-open");document.querySelector(".search-box")?.classList.remove("is-open");
  setTimeout(()=>{if(!modal.classList.contains("is-open")){modal.hidden=true;modal.style.display="none";modal.style.pointerEvents="none"}},230);
}
function score(x,q){
  const terms=norm(q).split(/\s+/).filter(Boolean),hay=norm([x.title,x.name,x.handle,x.author,x.shop,x.meta].join(" "));
  let n=0;terms.forEach(t=>{if(hay.includes(t))n+=hay.startsWith(t)?4:1});
  if(norm(x.title).includes(norm(q)))n+=4;return n;
}
function makeGroups(data,q){
  const qn=norm(q);
  const groups=[
    ["People",data.people.filter(x=>norm([x.name,x.handle].join(" ")).includes(qn)).slice(0,6).map(x=>({...x,kind:"people",title:x.name,meta:x.handle?"@"+x.handle:"Member",icon:"◌"}))],
    ["Posts",data.posts.filter(x=>score(x,qn)>0).sort((a,b)=>score(b,qn)-score(a,qn)).slice(0,6)],
    ["Products",data.products.filter(x=>score(x,qn)>0).slice(0,6)],
    ["Games",data.games.filter(x=>score(x,qn)>0).slice(0,6)],
    ["Events",data.events.filter(x=>score(x,qn)>0).slice(0,6)],
    ["Pages",data.pages.filter(x=>score(x,qn)>0).slice(0,6)]
  ];
  return groups.filter(g=>g[1].length);
}
function visual(x){
  if(x.kind==="people")return '<div class="th-search-person"><div class="th-search-thumb"><img src="'+esc(x.photo||"tubal-hub-logo.png")+'" alt=""></div><span class="th-search-person-dot '+(x.online?"online":"offline")+'"></span></div>';
  if(x.photo||x.image)return '<div class="th-search-thumb"><img src="'+esc(x.photo||x.image)+'" alt=""></div>';
  return '<div class="th-search-icon-box">'+esc(x.icon||"⌕")+'</div>';
}
function itemHtml(x,index){
  const title=x.title||x.name||"Result";
  let meta=x.meta||"";
  if(x.kind==="people")meta=x.online?'<span class="online">Online now</span>':esc(meta);else meta=esc(meta);
  const price=x.kind==="products"&&x.price!==""?'<div class="th-search-result-price">'+(String(x.price).trim().startsWith("₱")?"":"₱")+esc(x.price)+'</div>':"";
  return '<div class="th-search-result" role="option" tabindex="-1" data-index="'+index+'">'+visual(x)+'<div class="th-search-result-copy"><div class="th-search-result-title">'+highlight(title,input.value)+'</div><div class="th-search-result-meta">'+meta+'</div>'+price+'</div><span class="th-search-result-arrow">›</span></div>';
}
function renderQuickAccess(){
  const body=document.getElementById("thSearchBody");if(!body)return;
  const r=recent();
  body.innerHTML='<section class="th-search-section"><h3 class="th-search-section-title">Quick Access</h3><div class="th-search-chips">'+
    ["Feeds","Create Story","CTRLZONE","Shop","Global Chat","News"].map(x=>'<button class="th-search-chip" data-shortcut="'+esc(x)+'">'+esc(x)+'</button>').join("")+
    '</div></section>'+
    (r.length?'<section class="th-search-section"><h3 class="th-search-section-title">Recent Searches</h3><div class="th-search-chips">'+r.map(x=>'<button class="th-search-chip" data-chip="'+esc(x)+'">'+esc(x)+'</button>').join("")+'</div></section>':"")+
    '<section class="th-search-section" id="thSearchTrending"><h3 class="th-search-section-title">Trending</h3><div class="th-search-chips"><span class="th-search-chip" style="cursor:default;opacity:.6">Loading live content…</span></div></section>';
  bindChips();
}
async function render(q){
  ensureUi();
  const body=document.getElementById("thSearchBody");if(!body)return;
  const queryText=String(q||"").trim();
  if(!queryText){
    results=[];activeIndex=0;renderQuickAccess();
    try{
      const d=await loadData();
      if(String(input?.value||"").trim())return;
      const trend=[...d.posts,...d.products,...d.games].sort((a,b)=>b.createdAt-a.createdAt).slice(0,6);
      const section=document.getElementById("thSearchTrending");
      if(section){
        section.innerHTML='<h3 class="th-search-section-title">Trending</h3><div class="th-search-chips">'+
          (trend.length?trend.map(x=>'<button class="th-search-chip" data-chip="'+esc(x.title)+'">'+esc(x.title).slice(0,42)+'</button>').join(""):'<span class="th-search-chip" style="cursor:default;opacity:.6">No live content yet</span>')+
          '</div>';
        bindChips();
      }
    }catch(_){}
    return;
  }
  body.innerHTML='<div class="th-search-empty"><div class="th-search-empty-icon">⌕</div><strong>Searching…</strong><span>Finding people, posts, products and pages.</span></div>';
  try{
    const d=await loadData(),groups=makeGroups(d,queryText);
    if(!groups.length){
      results=[];activeIndex=0;
      body.innerHTML='<div class="th-search-empty"><div class="th-search-empty-icon">⌕</div><strong>No results for “'+esc(queryText)+'”</strong><span>Try a different search.</span></div>';
      return;
    }
    results=[];let html="";
    groups.forEach(g=>{
      html+='<section class="th-search-results-group"><h3 class="th-search-section-title">'+esc(g[0])+'</h3>';
      g[1].forEach(x=>{const index=results.length;results.push(x);html+=itemHtml(x,index)});
      html+="</section>";
    });
    body.innerHTML=html;activeIndex=0;refreshActive();
    body.querySelectorAll(".th-search-result").forEach((el,i)=>{
      el.onmouseenter=()=>{activeIndex=i;refreshActive()};
      el.onclick=()=>select(i);
    });
  }catch(_){
    results=[];activeIndex=0;renderQuickAccess();
    const status=document.getElementById("thSearchTrending");
    if(status)status.innerHTML='<h3 class="th-search-section-title">Search status</h3><div class="th-search-chips"><span class="th-search-chip" style="cursor:default;opacity:.6">Live content unavailable</span></div>';
    bindChips();
  }
}
function refreshActive(){document.querySelectorAll(".th-search-result").forEach((el,i)=>el.classList.toggle("active",i===activeIndex))}
function select(i){const x=results[i];if(!x)return;saveRecent(input.value);window.location.href=x.url||"index.html"}
function bindChips(){
  document.querySelectorAll("[data-chip]").forEach(b=>b.onclick=()=>{input.value=b.dataset.chip||"";render(input.value)});
  document.querySelectorAll("[data-shortcut]").forEach(b=>b.onclick=()=>{
    const x=b.dataset.shortcut,map={Feeds:"pages/feeds.html",CTRLZONE:"pages/ctrlzone.html",Shop:"pages/shop.html","Global Chat":"pages/chat.html",News:"pages/news.html","Create Story":"pages/feeds.html"};
    if(map[x]){saveRecent(x);window.location.href=map[x]}
  });
}
function onKey(e){
  if(e.key==="Escape"){e.preventDefault();close();return}
  if(e.key==="ArrowDown"){e.preventDefault();if(results.length){activeIndex=(activeIndex+1)%results.length;refreshActive();document.querySelectorAll(".th-search-result")[activeIndex]?.scrollIntoView({block:"nearest"})}return}
  if(e.key==="ArrowUp"){e.preventDefault();if(results.length){activeIndex=(activeIndex-1+results.length)%results.length;refreshActive();document.querySelectorAll(".th-search-result")[activeIndex]?.scrollIntoView({block:"nearest"})}return}
  if(e.key==="Enter"){e.preventDefault();select(activeIndex)}
}
onAuthStateChanged(auth,u=>{readyUser=!!u&&!u.isAnonymous;cache=null;cacheAt=0});
ensureUi();
document.querySelector(".search-box")?.addEventListener("click",e=>{if(e.target.closest(".search-shortcut")){e.preventDefault();open("");return}if(!e.target.closest("input")){e.preventDefault();open("")}});
const topSearch=document.querySelector(".search-box input");
topSearch?.addEventListener("focus",()=>{if(modal?.hidden)open(topSearch.value||"")});
topSearch?.addEventListener("input",()=>{if(modal?.hidden)open(topSearch.value||"")});
document.querySelector(".search-box")?.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();open(document.querySelector(".search-box input")?.value||"")}});
document.addEventListener("keydown",e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="k"){e.preventDefault();open("");return}if(e.key==="Tab"&&modal&&!modal.hidden){const focusables=[...modal.querySelectorAll("input,button,[href],[tabindex]:not([tabindex=\"-1\"])")];if(!focusables.length)return;const first=focusables[0],last=focusables[focusables.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}});
