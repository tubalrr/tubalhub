import {app,auth} from "./firebase-config.js";
import {onAuthStateChanged} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {getFirestore,collection,getDocs,query,orderBy,limit,onSnapshot} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import {publishHubPost,subscribeHubPosts} from "./hub-content.js";

const db=getFirestore(app);
const state={auth:null,items:[],products:[],hubPosts:[],users:[],saved:new Set(readLocal("tubalhub-feed-saved",[])),likes:readLocal("tubalhub-feed-likes",{}),comments:readLocal("tubalhub-feed-comments",{}),currentCommentId:null,filter:"all",query:"",sort:"latest",page:0,pageSize:5,loading:false,savedMode:false};

const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
function readLocal(k,f){try{const v=JSON.parse(localStorage.getItem(k)||"null");return v??f}catch(_){return f}}
function writeLocal(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(_){}}
function initials(n){return(String(n||"Member").trim().split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase()||"M")}
function millis(v){return v?.toMillis?.()||v?.seconds*1000||(typeof v==="number"?v:0)}
function timeLabel(v){const t=millis(v),d=new Date(t||Date.now());return Number.isNaN(d.getTime())?"":d.toLocaleDateString([],{month:"short",day:"numeric"})}
function displayName(u){return u?.displayName||u?.name||u?.email?.split("@")[0]||"Member"}
function photoOf(u){return u?.photoURL||u?.avatarURL||u?.avatar||""}
function readMinutes(x){const words=String(x.body||x.text||x.description||"").trim().split(/\s+/).filter(Boolean).length;return words?Math.max(1,Math.ceil(words/220))+" min read":""}

const games=[
 ["Mobile Legends: Bang Bang","ML","moba","https://play.google.com/store/apps/details?id=com.mobile.legends","https://commons.wikimedia.org/wiki/Special:Redirect/file/Mobile_Legends_Logo.webp"],
 ["Honor of Kings","HOK","moba","https://www.honorofkings.com/","https://commons.wikimedia.org/wiki/Special:Redirect/file/Honor_of_Kings_Wordmark_Logo.png"],
 ["Valorant","VAL","fps","https://playvalorant.com/","https://commons.wikimedia.org/wiki/Special:Redirect/file/Valorant_logo.svg"],
 ["PUBG: Battlegrounds","PUBG","battle-royale","https://pubg.com/","https://commons.wikimedia.org/wiki/Special:Redirect/file/PUBG_Studios_Logo.svg"],
 ["Minecraft","MC","sandbox","https://www.minecraft.net/","https://commons.wikimedia.org/wiki/Special:Redirect/file/Minecraft_Logo-en.svg"],
 ["Ultimate Bus Simulator","UBS","simulation","https://play.google.com/store/apps/details?id=com.dynamicgames.ultimatetrucksimulator",""],
 ["Euro Truck Simulator 2","ETS2","simulation","https://eurotrucksimulator2.com/",""],
 ["Cities: Skylines","CS","simulation","https://www.paradoxinteractive.com/games/cities-skylines/about",""],
 ["Transport Fever 2","TF2","strategy","https://www.transportfever2.com/",""]
];

function normalizeProduct(docSnap){
 const x=docSnap.data();
 return {id:"product-"+docSnap.id,type:"product",title:x.name||x.title||"Product",description:x.description||x.excerpt||"",image:x.imageURL||x.imageUrl||x.image||x.thumbnailUrl||"",price:x.price??x.cost??"",stock:x.stock??x.inventory??"",createdAt:x.createdAt||0,author:x.shopName||x.authorName||"TUBAL HUB Shop",sponsored:x.sponsored===true,likes:Number(x.likes||0)}
}
function gameItem(g){return{id:"game-"+g[0].toLowerCase().replace(/[^a-z0-9]+/g,"-"),type:"game",title:g[0],description:g[1]+" • "+g[2],image:g[4],url:g[3],createdAt:0,author:"CTRLZONE",likes:0}}
function hubItem(x){
 const kind=x.contentType||"post";
 const type=kind==="product"?"product":kind==="game"?"game":kind==="video"?"video":"text";
 return {id:"hub-"+x.id,type,title:x.title||"",description:x.text||"",text:x.text||"",image:x.imageUrl||"",mediaUrl:x.mediaUrl||"",url:x.productUrl||"",productUrl:x.productUrl||"",price:x.price??"",stock:x.stock??"",author:x.authorName||"Member",photo:x.authorPhotoURL||"",createdAt:x.createdAt||0,likes:Number(x.likes||0),comments:Number(x.comments||0),shares:Number(x.shares||0),sponsored:x.sponsored===true,sourceCollection:x.sourceCollection||"",sourceId:x.sourceId||x.id,destinations:Array.isArray(x.destinations)?x.destinations:[],contentType:kind};
}
function contentKey(x){return x.sourceCollection&&x.sourceId?x.sourceCollection+":"+x.sourceId:x.type+":"+x.id}

async function loadProducts(){
 try{const snap=await getDocs(query(collection(db,"products"),orderBy("createdAt","desc"),limit(100)));state.products=snap.docs.map(normalizeProduct)}
 catch(e){console.warn("[Feeds] products unavailable",e);state.products=[]}
}
function buildFeed(){
 const raw=[...state.hubPosts.map(hubItem),...state.products,...games.map(gameItem)];
 const seen=new Set();
 state.items=raw.filter(x=>{const k=contentKey(x);if(seen.has(k))return false;seen.add(k);return true});
 renderStories();renderFeed(true);renderSponsored();renderContacts();
}

function visible(){
 let arr=state.items.filter(x=>!state.savedMode||(state.saved.has(x.id)));
 if(state.filter!=="all")arr=arr.filter(x=>x.type==={products:"product",games:"game",videos:"video"}[state.filter]);
 const q=state.query.trim().toLowerCase();
 if(q)arr=arr.filter(x=>(x.title+" "+x.description+" "+x.author).toLowerCase().includes(q));
 if(state.sort==="popular")arr.sort((a,b)=>Number(state.likes[b.id]||b.likes||0)-Number(state.likes[a.id]||a.likes||0)||millis(b.createdAt)-millis(a.createdAt));
 else arr.sort((a,b)=>millis(b.createdAt)-millis(a.createdAt));
 return arr;
}

function avatarHtml(x){
 const src=x.photo||x.authorPhotoURL||"";
 return src?"<div class='feed-avatar'><img src='"+esc(src)+"' alt=''></div>":"<div class='feed-avatar'>"+esc(initials(x.author))+"</div>";
}
function renderStories(){
 const box=document.getElementById("stories");if(!box)return;
 box.innerHTML="<button class='story-card create' id='createStory' type='button'><span class='story-plus'>+</span><strong>Create Story</strong></button>";
 const source=[...new Map(state.items.filter(x=>x.author).map(x=>[x.author,x])).values()].slice(0,10);
 source.forEach((x,i)=>{
  const photo=x.photo||x.authorPhotoURL||x.image||"";
  const b=document.createElement("button");b.type="button";b.className="story-card"+(i===0?" active-story":"");
  b.innerHTML="<div class='story-media'>"+(photo?"<img src='"+esc(photo)+"' alt=''>":"")+"</div><div class='story-overlay'></div><div class='story-avatar'>"+(x.photo?avatarHtml(x).replace(/<div class='feed-avatar'>|<\/div>/g,""):"")+"</div><span class='story-name'>"+esc(x.author||"Member")+"</span>";
  b.onclick=()=>x.type==="game"&&x.url?window.open(x.url,"_blank","noopener"):null;
  box.appendChild(b);
 });
 document.getElementById("createStory")?.addEventListener("click",openPostModal);
}
function renderContacts(){
 const box=document.getElementById("contactsList");if(!box)return;
 const contacts=state.users.filter(x=>x.uid!==state.auth?.uid).slice(0,12);
 box.innerHTML=contacts.length?contacts.map(u=>"<div class='contact-row'><div class='feed-avatar'>"+(photoOf(u)?"<img src='"+esc(photoOf(u))+"' alt=''>":esc(initials(displayName(u))))+"</div><div class='contact-copy'><b>"+esc(displayName(u))+"</b><span>Member</span></div><i class='contact-dot "+(u.online===true?"online":"")+"' title='"+(u.online===true?"Online":"Offline")+"'></i></div>").join(""):"<div class='feed-side-meta'>No registered contacts are available yet.</div>";
}
function renderSponsored(){
 const box=document.getElementById("sponsoredBox");if(!box)return;
 const p=state.products.find(x=>x.sponsored===true)||state.products[0];
 if(!p){box.innerHTML="<div class='feed-side-meta'>No sponsored product published.</div>";return}
 box.innerHTML="<div class='sponsored-art'>"+(p.image?"<img src='"+esc(p.image)+"' alt=''>":"◈")+"</div><div class='sponsored-info'><h4>"+esc(p.title)+"</h4><p>"+esc(p.description||"Published product from the shop.")+"</p>"+(p.price!==""?"<strong style='color:#1dff91'>"+esc(String(p.price))+"</strong>":"")+"</div>";
}

function productMarkup(x){return "<div class='product-card'><div class='product-media'>"+(x.image?"<img src='"+esc(x.image)+"' alt='' loading='lazy'>":"◈")+"</div><div class='product-info'><div class='product-info-top'><div><h3>"+esc(x.title)+"</h3><div class='product-price'>"+(x.price!==""?"₱"+esc(x.price):"")+"</div></div>"+(x.stock!==""?"<span class='stock-pill'>"+esc(x.stock)+" in stock</span>":"")+"</div><button class='buy-btn' data-buy='"+esc(x.id)+"' type='button'>Buy</button></div></div>"}
function gameMarkup(x){
 const players=x.playersOnline!==undefined&&x.playersOnline!==null?"<p class='game-online'><i class='contact-dot online'></i> "+esc(String(x.playersOnline))+" players online</p>":"";
 return "<div class='game-card'><div class='game-cover'>"+(x.image?"<img src='"+esc(x.image)+"' alt='' loading='lazy'>":"<b>"+esc(x.title.slice(0,2))+"</b>")+"</div><div class='game-info'><h3 style='margin:0;font:800 16px/1.1 \"Space Grotesk\"'>"+esc(x.title)+"</h3><p style='margin:6px 0;color:#74877e;font-size:10px'>"+esc(x.description)+"</p>"+players+"<a class='play-btn' href='"+esc(x.url)+"' target='_blank' rel='noopener'>Play Now →</a></div></div>";
}
function renderPost(x,i){
 const liked=Number(state.likes[x.id]||0)>0;
 const likes=Number(x.likes||0)+(liked?Number(state.likes[x.id]||0):0);
 const caption=x.text||x.description||"";
 let body="";
 if(x.type==="product")body=productMarkup(x);
 else if(x.type==="game")body=gameMarkup(x);
 else if(x.type==="video"&&x.mediaUrl)body="<video class='post-media feed-video' controls preload='metadata' src='"+esc(x.mediaUrl)+"'></video>";
 else if(x.image)body="<img class='post-media' src='"+esc(x.image)+"' alt='' loading='lazy'>";
 else if(x.title)body="<div class='feed-article-content'><h3>"+esc(x.title)+"</h3><p>"+esc(x.description||x.text||"")+"</p></div>";
 return "<article class='post-card' data-id='"+esc(x.id)+"' style='animation-delay:"+Math.min(i,12)*.08+"s'><div class='post-head'>"+avatarHtml(x)+"<div class='post-meta'><b>"+esc(x.author||"Member")+"</b><span>"+esc(timeLabel(x.createdAt))+" · Everyone</span></div>"+(x.sponsored?"<span class='post-sponsor'>Sponsored</span>":"")+"<span class='post-status "+(x.online===true?"online":"")+"' aria-label='"+(x.online===true?"Online":"Offline")+"'></span></div><div class='post-body'>"+(caption?"<p class='post-caption'>"+esc(caption)+"</p>":"")+body+"</div><div class='post-footer'><div class='post-stats'><span class='like-stat'>"+(likes?likes+" likes":"No reactions yet")+"</span><span>"+(x.comments?x.comments+" comments":"")+(x.shares?" · "+x.shares+" shares":"")+"</span></div><div class='post-actions'><button class='post-action "+(liked?"liked":"")+"' data-action='like'>❤️ Like</button><button class='post-action' data-action='comment'>💬 Comment</button><button class='post-action' data-action='share'>↗ Share</button></div></div></article>";
}
function renderFeed(reset){
 const list=visible(),box=document.getElementById("feedList");if(!box||state.loading)return;
 if(reset){state.page=0;box.innerHTML=""}
 const start=state.page*state.pageSize,slice=list.slice(start,start+state.pageSize);
 if(!slice.length&&state.page===0){box.innerHTML="<div class='feed-empty'><strong>No posts in your feed</strong><span>Published products, games, and your saved posts appear here.</span></div>";return}
 state.loading=true;
 const sk=document.createElement("div");sk.className="load-more-skeleton";sk.innerHTML="<div class='skeleton'></div><div class='skeleton'></div><div class='skeleton'></div>";
 box.appendChild(sk);
 setTimeout(()=>{
   sk.remove();
   box.insertAdjacentHTML("beforeend",slice.map(renderPost).join(""));
   state.page++;
   state.loading=false;
   bindPosts();
 },140);
}
function bindPosts(){
 document.querySelectorAll(".post-card:not([data-bound])").forEach(card=>{
  card.dataset.bound="1";
  card.querySelector("[data-action='like']")?.addEventListener("click",e=>{
   const b=e.currentTarget,id=card.dataset.id,current=Number(state.likes[id]||0);
   state.likes[id]=current?0:1;writeLocal("tubalhub-feed-likes",state.likes);
   b.classList.remove("is-pop");void b.offsetWidth;b.classList.add("is-pop");burst(b);
   const item=state.items.find(x=>x.id===id);if(item)item._liked=!!state.likes[id];
   const stat=card.querySelector(".like-stat"),base=Number(item?.likes||0),total=base+Number(state.likes[id]||0);if(stat)stat.textContent=total?total+" likes":"No reactions yet";
   b.classList.toggle("liked",!!state.likes[id]);
  });
  card.querySelector("[data-action='share']")?.addEventListener("click",()=>openShare(card.dataset.id));
  card.querySelector("[data-action='comment']")?.addEventListener("click",()=>openComments(card.dataset.id));
  card.querySelector("[data-buy]")?.addEventListener("click",e=>{e.stopPropagation();const b=e.currentTarget;b.classList.add("is-pop");setTimeout(()=>b.classList.remove("is-pop"),460);location.href="shop.html"});
 });
}
function burst(btn){const host=btn.parentElement,s=document.createElement("span");s.className="post-action-burst";for(let i=0;i<6;i++){const p=document.createElement("i");p.style.setProperty("--a",(i*60)+"deg");s.appendChild(p)}host.appendChild(s);setTimeout(()=>s.remove(),620)}
function openShare(id){const s=document.getElementById("shareSheet");if(!s)return;document.getElementById("shareUrl").value=location.href.split("#")[0]+"#feed-"+encodeURIComponent(id);s.classList.add("open")}
function showNotice(message){const n=document.getElementById("feedNotice");if(!n)return;n.textContent=message;n.classList.add("open");setTimeout(()=>n.classList.remove("open"),2200)}
function openPostModal(){document.getElementById("postModal").classList.add("open");document.getElementById("postText").focus()}
function closePostModal(){document.getElementById("postModal").classList.remove("open")}
async function publishLocalPost(e){
 e.preventDefault();
 if(!state.auth){showNotice("Sign in to create a post.");return}
 const text=document.getElementById("postText").value.trim();if(!text)return;
 const button=e.submitter;button?.setAttribute("disabled","true");
 try{
  await publishHubPost({contentType:"post",text,sourceCollection:"feeds",destinations:["feeds","community"]});
  document.getElementById("postText").value="";closePostModal();showNotice("Post published to TUBAL HUB.");
 }catch(err){console.error("[Feeds] publish failed",err);showNotice(err.code==="permission-denied"?"Publishing is blocked by Firestore Rules.":"Could not publish the post.")}
 finally{button?.removeAttribute("disabled")}
}
function setupComposer(){
 const trigger=document.getElementById("createPostTrigger");
 if(trigger)trigger.textContent=state.auth?"What's on your mind, "+displayName(state.auth)+"?":"What's on your mind?";
}
function setupUI(){
 document.body.addEventListener("pointermove",e=>{document.body.style.setProperty("--fd-mx",e.clientX+"px");document.body.style.setProperty("--fd-my",e.clientY+"px")},{passive:true});
 document.querySelectorAll(".feed-filter").forEach(b=>b.addEventListener("click",()=>{state.savedMode=false;state.filter=b.dataset.filter||"all";document.querySelectorAll(".feed-filter").forEach(x=>x.classList.toggle("active",x===b));renderFeed(true)}));
 document.getElementById("feedSearch")?.addEventListener("input",e=>{state.query=e.target.value;renderFeed(true)});
 document.getElementById("feedSort")?.addEventListener("change",e=>{state.sort=e.target.value;renderFeed(true)});
 document.getElementById("createPostTrigger")?.addEventListener("click",openPostModal);
 document.getElementById("liveAction")?.addEventListener("click",()=>location.href="live.html");
 document.getElementById("photoAction")?.addEventListener("click",openPostModal);
 document.getElementById("productAction")?.addEventListener("click",()=>location.href="shop.html");
 document.getElementById("cancelPost")?.addEventListener("click",closePostModal);
 document.getElementById("postForm")?.addEventListener("submit",publishLocalPost);
 document.getElementById("closeShare")?.addEventListener("click",()=>document.getElementById("shareSheet").classList.remove("open"));
 document.getElementById("copyShare")?.addEventListener("click",async()=>{const i=document.getElementById("shareUrl");try{await navigator.clipboard.writeText(i.value);showNotice("Link copied.")}catch(_){i.select();document.execCommand("copy");showNotice("Link copied.")}});
 document.getElementById("savedMenu")?.addEventListener("click",()=>{state.savedMode=true;state.filter="all";document.querySelectorAll(".feed-filter").forEach(x=>x.classList.remove("active"));renderFeed(true)});
 const sentinel=document.getElementById("feedSentinel");
 if(sentinel&&"IntersectionObserver" in window){
   const observer=new IntersectionObserver(entries=>{
     if(!entries[0].isIntersecting||state.loading)return;
     const max=Math.ceil(visible().length/state.pageSize);
     if(state.page<max)renderFeed(false);
   },{rootMargin:"700px 0px"});
   observer.observe(sentinel);
 }
 document.getElementById("postModal")?.addEventListener("click",e=>{if(e.target.id==="postModal")closePostModal()});
 document.getElementById("commentModal")?.addEventListener("click",e=>{if(e.target.id==="commentModal")closeComments()});
 document.getElementById("closeComments")?.addEventListener("click",closeComments);
 document.getElementById("commentForm")?.addEventListener("submit",e=>{
  e.preventDefault();
  const input=document.getElementById("commentInput"),text=input.value.trim(),id=state.currentCommentId;
  if(!id||!text)return;
  if(!Array.isArray(state.comments[id]))state.comments[id]=[];
  state.comments[id].push({author:displayName(state.auth)||"Member",text,createdAt:Date.now()});
  writeLocal("tubalhub-feed-comments",state.comments);input.value="";renderComments(id);
 });
}
function setupHubContent(){
 try{
  subscribeHubPosts(items=>{state.hubPosts=items;buildFeed()});
 }catch(e){console.warn("[Feeds] hub content subscription",e)}
}
function setupContacts(){
 try{
  const q=query(collection(db,"presence"),limit(100));
  onSnapshot(q,s=>{state.users=[];s.forEach(d=>{const x=d.data();if(x.uid)state.users.push({...x,uid:x.uid,online:x.online===true})});renderContacts()},e=>console.warn("[Feeds] presence unavailable",e));
 }catch(e){console.warn("[Feeds] presence setup",e)}
}
function bindUserAvatar(){const a=document.getElementById("createAvatar");if(a){a.innerHTML=photoOf(state.auth)?"<img src='"+esc(photoOf(state.auth))+"' alt=''>":esc(initials(displayName(state.auth)))}}
onAuthStateChanged(auth,async user=>{
 state.auth=user&&!user.isAnonymous?user:null;
 bindUserAvatar();setupComposer();setupUI();setupContacts();setupHubContent();await loadProducts();buildFeed();
});
