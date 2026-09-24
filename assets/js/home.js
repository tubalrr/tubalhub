import { app, auth } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {
  getFirestore, collection, query, orderBy, limit, getDocs
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const db = getFirestore(app);
const JOURNAL_KEYS = ["tubalhub_journal","payapang-isip-journal-v1","payapang-journal"];
const FEED_KEYS = ["tubalhub_feeds","tubalhub-feed"];
const MUSIC_DB = "tubalhub-ai-music";
const MUSIC_STORE = "tracks";
const LIKES_KEY = "tubalhub_real_likes";
const PLAYS_KEY = "tubalhub_real_plays";
const state = {
  heroIndex:0,
  selectedMusic:null,
  musicUrl:null,
  audioContext:null,
  analyser:null,
  source:null,
  visualFrame:0,
  heroTimer:null,
  dragging:false
};

const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const safeJson=(key,fallback=[])=>{
  try{const raw=localStorage.getItem(key);const value=raw?JSON.parse(raw):fallback;return value??fallback}catch(_){return fallback}
};
const readFirstArray=(keys)=>{
  for(const key of keys){const value=safeJson(key,null);if(Array.isArray(value)&&value.length)return value}
  return [];
};
const formatDate=value=>{
  const date=new Date(value||0);if(Number.isNaN(date.getTime()))return "Date unavailable";
  return date.toLocaleDateString("en-PH",{month:"short",day:"numeric",year:"numeric"});
};
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const isMobileHome=()=>window.innerWidth<=768;
const homeCardLimit=()=>isMobileHome()?4:6;

function initSpotlight(){
  if(window.matchMedia?.("(hover: none), (pointer: coarse)").matches)return;
  let frame=0,x=innerWidth/2,y=innerHeight/2;
  addEventListener("pointermove",e=>{
    x=e.clientX;y=e.clientY;if(frame)return;
    frame=requestAnimationFrame(()=>{
      document.documentElement.style.setProperty("--mx",x+"px");
      document.documentElement.style.setProperty("--my",y+"px");
      frame=0;
    });
  },{passive:true});
}

export function createSlider(trackId,prevId,nextId,dotsId,slideSelector=".hero-slide"){
  const track=$("#"+trackId);if(!track)return null;
  const prev=$("#"+prevId),next=$("#"+nextId),dots=$("#"+dotsId);
  const horizontal=track.dataset.horizontal==="true";
  const slides=Array.from(track.querySelectorAll(slideSelector));
  if(!slides.length)return null;
  let index=0,startX=0,deltaX=0,dragging=false,autoTimer=null;
  const gap=()=>horizontal?(parseFloat(getComputedStyle(track).columnGap||getComputedStyle(track).gap)||0):0;
  const renderDots=()=>{
    if(!dots)return;
    dots.innerHTML=slides.map((_,i)=>'<button class="hero-dot '+(i===index?"active":"")+'" type="button" aria-label="Go to slide '+(i+1)+'"></button>').join("");
    $(".hero-dot",dots).forEach((dot,i)=>dot.addEventListener("click",()=>go(i)));
  };
  const render=()=>{
    if(horizontal){
      const card=slides[index];
      if(card)track.scrollTo({left:card.offsetLeft,behavior:"smooth"});
    }else{
      track.style.transform="translate3d("+(-index*100)+"%,0,0)";
    }
    $(".hero-dot",dots).forEach((dot,i)=>dot.classList.toggle("active",i===index));
  };
  const go=nextIndex=>{
    index=(nextIndex+slides.length)%slides.length;
    render();
  };
  const startAuto=()=>{
    clearInterval(autoTimer);autoTimer=setInterval(()=>go(index+1),horizontal?4000:5000);
  };
  const stopAuto=()=>{
    clearInterval(autoTimer);autoTimer=null;
  };
  prev?.addEventListener("click",()=>{go(index-1);startAuto()});
  next?.addEventListener("click",()=>{go(index+1);startAuto()});
  renderDots();render();
  track.setAttribute("data-slide-count",String(slides.length));
  track.addEventListener("pointerdown",e=>{
    dragging=true;startX=e.clientX;deltaX=0;track.classList.add("is-dragging");track.setPointerCapture?.(e.pointerId);
  });
  track.addEventListener("pointermove",e=>{if(dragging)deltaX=e.clientX-startX});
  const end=()=>{
    if(!dragging)return;
    dragging=false;track.classList.remove("is-dragging");
    if(Math.abs(deltaX)>=50)go(index+(deltaX<0?1:-1));else render();
    deltaX=0;startAuto();
  };
  track.addEventListener("pointerup",end);track.addEventListener("pointercancel",end);
  track.addEventListener("mouseenter",stopAuto);track.addEventListener("mouseleave",startAuto);
  track.addEventListener("touchstart",stopAuto,{passive:true});track.addEventListener("touchend",startAuto,{passive:true});
  startAuto();
  return {go,stopAuto,startAuto,get index(){return index}};
}

function initHeroSlider(){
  const slider=createSlider("heroTrack","heroPrev","heroNext","heroDots");
  $("#heroTrack")?.addEventListener("transitionend",()=>{});
  return slider;
}

function openDb(){
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open(MUSIC_DB,1);
    request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains(MUSIC_STORE)){const store=db.createObjectStore(MUSIC_STORE,{keyPath:"id"});store.createIndex("createdAt","createdAt")}};
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error||new Error("IndexedDB unavailable."));
  });
}
async function dbAll(){
  const database=await openDb();
  const rows=await new Promise((resolve,reject)=>{
    const tx=database.transaction(MUSIC_STORE,"readonly"),req=tx.objectStore(MUSIC_STORE).getAll();
    req.onsuccess=()=>resolve(req.result||[]);req.onerror=()=>reject(req.error||new Error("Library unavailable."));
  });
  database.close();
  return rows.sort((a,b)=>Number(b.createdAt||0)-Number(a.createdAt||0));
}
function audioExt(type){
  const t=String(type||"").toLowerCase();if(t.includes("mpeg"))return"mp3";if(t.includes("wav"))return"wav";if(t.includes("ogg"))return"ogg";if(t.includes("webm"))return"webm";return"audio";
}
function musicLikes(){return safeJson(LIKES_KEY,{})}
function musicPlays(){return safeJson(PLAYS_KEY,{})}

function journalEntries(){
  const raw=readFirstArray(JOURNAL_KEYS);
  return raw.map((entry,index)=>({
    id:entry.id||String(index),
    text:String(entry.text||entry.content||entry.body||"").trim(),
    mood:String(entry.mood||entry.emoji||"").trim(),
    createdAt:entry.createdAt||entry.date||entry.updatedAt||0
  })).filter(entry=>entry.text).slice(0,homeCardLimit());
}
function journalStarterCards(){
  const today=new Date().toLocaleDateString("en-PH",{month:"short",day:"numeric",year:"numeric"});
  const prompts=[
    ["🌿","A quiet moment","Isulat ang isang bagay na nagbigay sa iyo ng gaan ngayon."],
    ["😌","Check in","Ano ang gusto mong maalala tungkol sa araw na ito?"],
    ["☀️","Small win","Ano ang isang maliit na bagay na nagawa mo ngayong araw?"],
    ["🌙","Evening note","Ano ang gusto mong bitawan bago magpahinga?"],
    ["🍃","Gratitude","Anong simpleng bagay ang pinasasalamatan mo ngayon?"],
    ["💭","Mind dump","Isulat ang nasa isip mo ngayon, kahit isang pangungusap lang."]
  ];
  return prompts.slice(0,homeCardLimit()).map((p,i)=>({id:"starter-"+i,icon:p[0],title:p[1],text:p[2],date:today}));
}

function renderGameScores(){
  const box=$("#gameScoreStack");if(!box)return;
  const readNumber=(keys)=>{
    for(const key of keys){
      const raw=localStorage.getItem(key);
      if(raw===null||raw==="")continue;
      const n=Number(raw);
      if(Number.isFinite(n))return n;
    }
    return null;
  };
  const stats=[
    ["Kills",readNumber(["ctrlzone_kills","tubalhub_game_kills"])],
    ["Wins",readNumber(["ctrlzone_wins","tubalhub_game_wins"])],
    ["Rank",localStorage.getItem("ctrlzone_rank")||localStorage.getItem("tubalhub_game_rank")||"—"]
  ];
  box.innerHTML=stats.map(([label,value])=>"<div class=\"game-score\"><strong>"+esc(value===null?"—":value)+"</strong><span>"+label+"</span></div>").join("");
}

function renderJournal(){
  const track=$("#journalTrack");if(!track)return;
  const entries=journalEntries();
  if(entries.length){
    track.innerHTML=entries.map(e=>'<article class="real-data-card journal-real-card data-track-card"><div class="journal-real-top"><span class="journal-real-icon home-emoji" aria-hidden="true">'+esc(e.mood||"📝")+'</span><span class="journal-real-date">'+esc(formatDate(e.createdAt))+'</span></div><div class="journal-real-mood">REAL JOURNAL</div><h3 class="journal-real-title">Saved entry</h3><p class="journal-real-text">'+esc(e.text.slice(0,220))+(e.text.length>220?"…":"")+'</p></article>').join("");
  }else{
    track.innerHTML=journalStarterCards().map(e=>'<article class="real-data-card journal-real-card home-starter-card" data-starter="true"><div class="journal-real-top"><span class="journal-real-icon home-emoji" aria-hidden="true">'+e.icon+'</span><span class="journal-real-date">'+esc(e.date)+'</span></div><div class="journal-real-mood">JOURNAL STARTER</div><h3 class="journal-real-title">'+esc(e.title)+'</h3><p class="journal-real-text">'+esc(e.text)+'</p><a class="starter-label" href="pages/payapang-isip.html">Open Journal →</a></article>').join("");
  }
}

let musicTracks=[];
function musicStarterCards(){
  const names=["Create your first track","Build a night ambience","Try a chill texture","Make a study loop","Explore a new mood","Generate a fresh idea"];
  return names.slice(0,homeCardLimit()).map((title,i)=>({title,icon:["🎵","🌌","🌿","📚","🌙","✨"][i],sub:"No saved audio yet"}));
}
async function loadMusic(){
  const track=$("#musicTrack");if(!track)return;
  try{musicTracks=await dbAll()}catch(_){musicTracks=[]}
  if(!musicTracks.length){
    track.innerHTML=musicStarterCards().map((t)=>'<article class="real-data-card music-real-card home-starter-card"><div class="music-real-cover"><span class="music-real-emoji home-emoji" aria-hidden="true">'+t.icon+'</span><button class="music-real-play" type="button" disabled aria-label="'+esc(t.title)+' unavailable">▶</button></div><div class="music-mini-wave"><i></i><i></i><i></i></div><div class="music-real-meta"><h3 class="music-real-title">'+esc(t.title)+'</h3><p class="music-real-sub">'+esc(t.sub)+'</p></div><div class="music-starter-actions"><a class="music-starter-link" href="pages/ai-music.html">Open AI Music →</a></div></article>').join("");
    return;
  }
  const plays=musicPlays();
  track.innerHTML=musicTracks.slice(0,homeCardLimit()).map(t=>'<article class="real-data-card music-real-card data-track-card" data-music-id="'+esc(t.id)+'"><div class="music-real-cover"><span class="music-real-emoji home-emoji" aria-hidden="true">🎵</span><button class="music-real-play" type="button" data-play-music="'+esc(t.id)+'" aria-label="Play '+esc(t.title||"saved track")+'">▶</button></div><div class="music-mini-wave"><i></i><i></i><i></i></div><div class="music-real-meta"><h3 class="music-real-title">'+esc(t.title||"Saved track")+'</h3><p class="music-real-sub">'+esc(t.genre||"AI Music")+" · "+Number(plays[t.id]||0)+" plays</p></div></article>').join("");
  track.querySelectorAll("[data-play-music]").forEach(button=>button.addEventListener("click",()=>playMusic(button.dataset.playMusic)));
}

async function getMusic(id){try{return musicTracks.find(t=>String(t.id)===String(id))||await (async()=>{const rows=await dbAll();return rows.find(t=>String(t.id)===String(id))})()}catch(_){return null}}
async function playMusic(id){
  const track=await getMusic(id);if(!track||!track.blob)return;
  const audio=$("#homeMusicAudio");
  if(!audio)return;
  if(state.musicUrl)URL.revokeObjectURL(state.musicUrl);
  state.musicUrl=URL.createObjectURL(track.blob);state.selectedMusic=track;audio.src=state.musicUrl;
  try{
    await ensureAnalyser(audio);
    await audio.play();
    document.querySelectorAll(".music-real-card.is-playing,.bento-music-item.is-playing").forEach(card=>card.classList.remove("is-playing"));
    document.querySelector('.music-real-card[data-music-id="'+CSS.escape(String(id))+'"]')?.classList.add("is-playing");
    document.querySelector('.bento-music-item[data-bento-music-id="'+CSS.escape(String(id))+'"]')?.classList.add("is-playing");
    drawBentoWave();
    const wave=$("#heroMusicWaveform");
    if(wave)wave.hidden=false;
  }catch(_){showHomeToast("Press play again to start the saved audio.")}
}
async function ensureAnalyser(audio){
  if(state.analyser){
    if(state.audioContext?.state==="suspended")await state.audioContext.resume();
    return;
  }
  const Ctx=window.AudioContext||window.webkitAudioContext;if(!Ctx)throw new Error("Web Audio is not supported.");
  state.audioContext=new Ctx();
  state.analyser=state.audioContext.createAnalyser();state.analyser.fftSize=128;state.analyser.smoothingTimeConstant=.78;
  state.source=state.audioContext.createMediaElementSource(audio);state.source.connect(state.analyser);state.analyser.connect(state.audioContext.destination);
  drawHeroWave();
}
function drawHeroWave(){
  const canvas=$("#heroMusicCanvas"),ctx=canvas?.getContext("2d");if(!canvas||!ctx||!state.analyser)return;
  const data=new Uint8Array(state.analyser.frequencyBinCount);
  const frame=()=>{
    state.visualFrame=requestAnimationFrame(frame);
    const rect=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2),width=Math.max(1,Math.floor(rect.width*dpr)),height=Math.max(1,Math.floor(rect.height*dpr));
    if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height}
    ctx.clearRect(0,0,width,height);
    state.analyser.getByteFrequencyData(data);
    const bars=Math.min(64,data.length),gap=Math.max(2,width/620),barW=Math.max(2,(width-gap*(bars-1))/bars);
    for(let i=0;i<bars;i++){
      const amp=data[i]/255,barH=Math.max(2,amp*height*.72),x=i*(barW+gap),y=(height-barH)/2;
      const grad=ctx.createLinearGradient(0,y,0,y+barH);grad.addColorStop(0,"#1dff91");grad.addColorStop(.55,"#8ed66d");grad.addColorStop(1,"#7d5aff");
      ctx.fillStyle=grad;ctx.fillRect(x,y,barW,barH);
    }
  };
  cancelAnimationFrame(state.visualFrame);frame();
}


function drawBentoWave(){
  if(!state.analyser)return;
  const bars=[...document.querySelectorAll("#bentoMusicList .bento-music-wave i")],data=new Uint8Array(state.analyser.frequencyBinCount);
  const frame=()=>{
    state.analyser.getByteFrequencyData(data);
    bars.forEach((bar,i)=>{const idx=Math.min(data.length-1,Math.floor(i*data.length/3));bar.style.height=(6+Math.round((data[idx]/255)*18))+"px"});
    if(document.querySelector(".bento-music-item.is-playing"))state.bentoWaveFrame=requestAnimationFrame(frame);
  };
  cancelAnimationFrame(state.bentoWaveFrame);state.bentoWaveFrame=requestAnimationFrame(frame);
}

function storageAvatar(){
  try{return localStorage.getItem("tubalhub_avatar")||""}catch(_){return ""}
}

function parseStoredPosts(){
  return readFirstArray(FEED_KEYS).map((post,index)=>({
    id:post.id||String(index),author:post.author||post.authorName||post.userName||"Member",
    avatar:post.avatar||post.authorPhotoURL||post.photoURL||"",image:post.image||post.imageUrl||post.mediaUrl||"",text:String(post.text||post.content||post.message||"").trim(),
    likes:Number(post.likes||0),comments:Number(post.comments||0),createdAt:post.createdAt||post.date||0
  })).filter(post=>post.text||post.title);
}
async function firestorePosts(){
  try{
    const snap=await getDocs(query(collection(db,"hubPosts"),orderBy("createdAt","desc"),limit(10)));
    return snap.docs.map(d=>{const x=d.data();return{id:d.id,author:x.authorName||"Member",avatar:x.authorPhotoURL||"",image:x.imageUrl||x.image||x.mediaUrl||"",text:String(x.text||x.title||"").trim(),likes:Number(x.likes||0),comments:Number(x.comments||0),createdAt:x.createdAt?.toMillis?.()||x.createdAt?.seconds*1000||0}}).filter(x=>x.text);
  }catch(_){return[]}
}
async function renderFeeds(){
  const track=$("#feedTrack");if(!track)return;
  let posts=parseStoredPosts();
  if(!posts.length)posts=await firestorePosts();
  if(!posts.length){
    try{
      const r=await fetch("version.json?t="+Date.now(),{cache:"no-store"});
      const data=await r.json();
      const changes=Array.isArray(data.changelog)?data.changelog.slice(-6).reverse():[];
      if(changes.length){
        track.innerHTML=changes.slice(0,homeCardLimit()).map((c,i)=>'<article class="real-data-card feed-update-card feed-update-fallback"><div class="feed-update-head"><span class="feed-update-avatar home-emoji" aria-hidden="true">'+esc(c.icon||"📢")+'</span><div class="feed-update-author"><strong>TUBAL HUB Updates</strong><small>'+esc(data.date||"Current release")+'</small></div></div><p class="feed-update-text">'+esc(c.desc||c.title||"Website update")+'</p><div class="feed-update-art"><span class="home-emoji" aria-hidden="true">'+esc(c.icon||"📢")+'</span></div><div class="feed-update-stats"><span>'+esc(c.type||"Update")+'</span><span class="feed-update-source">Real changelog</span></div></article>').join("");
        return;
      }
    }catch(_){}
    track.innerHTML='<div class="real-data-card feed-update-card"><div class="feed-update-head"><span class="feed-update-avatar home-emoji" aria-hidden="true">📱</span><div class="feed-update-author"><strong>TUBAL HUB Feeds</strong><small>Ready for real posts</small></div></div><p class="feed-update-text">Published community posts will appear here automatically when available.</p><div class="feed-update-art"><span class="home-emoji" aria-hidden="true">📱</span></div><div class="feed-update-stats"><span>Real data only</span></div></div>';
    return;
  }
  const likes=safeJson("tubalhub_home_feed_likes",{});
  const myAvatar=storageAvatar();
  const myUid=auth.currentUser?.uid||"";
  track.innerHTML=posts.slice(0,homeCardLimit()).map(p=>{
    const avatar=(p.id===myUid||p.author===auth.currentUser?.displayName)&&myAvatar?myAvatar:p.avatar;
    const liked=likes[p.id]===true;
    const base=Number(p.likes||0);
    return '<article class="real-data-card feed-update-card data-track-card" data-feed-id="'+esc(p.id)+'" data-base-likes="'+base+'"><div class="feed-update-head"><div class="feed-update-avatar">'+(avatar?'<img class="feed-avatar-img" src="'+esc(avatar)+'" alt="" loading="lazy">':esc((p.author||"M").trim().charAt(0).toUpperCase()))+'</div><div class="feed-update-author"><strong>'+esc(p.author)+'</strong><small>'+esc(formatDate(p.createdAt))+'</small></div></div><p class="feed-update-text">'+esc((p.text||"").slice(0,220))+(String(p.text||"").length>220?"…":"")+'</p><div class="feed-update-art">'+(p.image?'<img class="feed-real-image" src="'+esc(p.image)+'" alt="" loading="lazy">':avatar?'<img class="feed-real-image" src="'+esc(avatar)+'" alt="" loading="lazy">':'<span class="home-emoji" aria-hidden="true">📱</span>')+'</div><div class="feed-update-stats"><span data-home-like-count="'+esc(p.id)+'">'+(base+(liked?1:0))+' likes</span><span>'+Number(p.comments||0)+' comments</span><button type="button" class="like-btn '+(liked?"liked":"")+'" data-feed-like="'+esc(p.id)+'">'+(liked?"Liked":"Like")+'</button></div></article>';
  }).join("");
  $$("#feedTrack [data-feed-like]").forEach(button=>button.addEventListener("click",()=>toggleFeedLike(button)));
}

function toggleFeedLike(button){
  const id=button.dataset.feedLike;
  const key="tubalhub_home_feed_likes",likes=safeJson(key,{});
  const next=!Boolean(likes[id]);likes[id]=next;localStorage.setItem(key,JSON.stringify(likes));
  button.classList.toggle("liked",next);button.textContent=next?"Liked":"Like";
  button.classList.remove("bursting");void button.offsetWidth;button.classList.add("bursting");
  const card=button.closest(".feed-card");
  const base=Number(card?.dataset.baseLikes||0);
  const stat=card?.querySelector("[data-home-like-count]");
  if(stat)stat.textContent=(base+(next?1:0))+" likes";
  showHomeToast(next?"Liked this post.":"Like removed.");
}
function showHomeToast(message){
  const toast=$("#homeToast");if(!toast)return;
  toast.textContent=message;toast.classList.add("open");clearTimeout(showHomeToast.timer);
  showHomeToast.timer=setTimeout(()=>toast.classList.remove("open"),2000);
}
const GAMES_URL="data/games.json";
const GAMES_KEY="tubalhub_ctrlzone_games";
const GAME_STATS_KEY="tubalhub_ctrlzone_game_stats";
let featuredGames=[];
let gamesSlider=null;

function readObject(key){
  try{const value=JSON.parse(localStorage.getItem(key)||"{}");return value&&typeof value==="object"&&!Array.isArray(value)?value:{}}
  catch(_){return {}}
}
function readGamesFromStorage(){
  try{
    const value=JSON.parse(localStorage.getItem(GAMES_KEY)||"null");
    return Array.isArray(value)?value:[];
  }catch(_){return []}
}
async function loadFeaturedGames(){
  let list=readGamesFromStorage();
  if(!list.length){
    try{
      const r=await fetch(GAMES_URL+"?t="+Date.now(),{cache:"no-store"});
      if(!r.ok)throw new Error("games.json "+r.status);
      const data=await r.json();
      list=Array.isArray(data)?data:Array.isArray(data.games)?data.games:[];
    }catch(error){
      console.warn("[TUBAL HUB featured games]",error);
      list=[];
    }
  }
  featuredGames=list.filter(g=>g&&g.id&&g.title&&g.emoji&&g.description&&g.officialUrl).slice(0,isMobileHome()?4:12);
  renderFeaturedGames();
}
function gameStats(game){
  const all=readObject(GAME_STATS_KEY),s=(all[game.id]&&typeof all[game.id]==="object")?all[game.id]:{};
  const players=Number.isFinite(Number(s.players))?Number(s.players):Number.isFinite(Number(game.players))?Number(game.players):null;
  const rating=Number.isFinite(Number(s.rating))?Number(s.rating):Number.isFinite(Number(game.rating))?Number(game.rating):null;
  const lastPlayed=Number(s.lastPlayed||game.lastPlayed||0);
  return {players:Number.isFinite(players)?players:null,rating:Number.isFinite(rating)?rating:null,lastPlayed:Number.isFinite(lastPlayed)?lastPlayed:0};
}
function formatLastPlayed(value){
  if(!value)return "Never";
  const d=new Date(value);if(Number.isNaN(d.getTime()))return "—";
  return d.toLocaleString("en-PH",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"});
}
function gameStatMarkup(game){
  const s=gameStats(game);
  return '<div class="game-feature-stat"><span class="home-emoji" aria-hidden="true">👥</span><strong title="Saved local player count">'+esc(s.players===null?"—":s.players)+'</strong></div>'+
         '<div class="game-feature-stat"><span class="home-emoji" aria-hidden="true">⭐</span><strong title="Saved local rating">'+esc(s.rating===null?"—":s.rating)+'</strong></div>'+
         '<div class="game-feature-stat"><span class="home-emoji" aria-hidden="true">⏱️</span><strong title="Last played on this device">'+esc(formatLastPlayed(s.lastPlayed))+'</strong></div>';
}
function featuredGameMarkup(game){
  const safeA=game.colorA||"#173b2a",safeB=game.colorB||"#07100b";
  const category=["New","Hot","Trending"].includes(game.category)?game.category:"Featured";
  return '<article class="game-feature-card" data-game-id="'+esc(game.id)+'" style="--game-a:'+esc(safeA)+';--game-b:'+esc(safeB)+'">'+
    '<div class="game-feature-cover"><span class="game-feature-emoji" aria-hidden="true">'+esc(game.emoji)+'</span><button class="game-feature-play" type="button" data-feature-play="'+esc(game.id)+'" aria-label="Play '+esc(game.title)+'">▶️</button></div>'+
    '<div class="game-feature-body"><div class="game-feature-top"><h3>'+esc(game.title)+'</h3><span class="game-category" data-category="'+esc(category)+'">'+esc(category)+'</span></div>'+
    '<p class="game-feature-desc">'+esc(game.description)+'</p><div class="game-feature-stats">'+gameStatMarkup(game)+'</div></div>'+
    '<div class="game-feature-footer"><button class="game-feature-playnow" type="button" data-feature-play="'+esc(game.id)+'">Play Now</button></div>'+
    '</article>';
}
function renderFeaturedGames(){
  const track=$("#gamesTrack");if(!track)return;
  if(!featuredGames.length){
    track.innerHTML='<div class="empty-card home-glass"><div><span class="home-emoji" aria-hidden="true">🎮</span><strong>No real featured games are available yet.</strong><span>Add games to data/games.json or tubalhub_ctrlzone_games.</span></div></div>';
    if(gamesSlider)gamesSlider.stopAuto();
    return;
  }
  track.innerHTML=featuredGames.map(featuredGameMarkup).join("");
  if(!window.matchMedia?.("(hover: none), (pointer: coarse)").matches){
    track.querySelectorAll(".game-feature-card").forEach(card=>{
      card.addEventListener("pointermove",e=>{
        const r=card.getBoundingClientRect(),px=(e.clientX-r.left)/r.width,py=(e.clientY-r.top)/r.height;
        const rx=clamp((.5-py)*10,-10,10),ry=clamp((px-.5)*10,-10,10);
        card.style.setProperty("--rx",rx+"deg");card.style.setProperty("--ry",ry+"deg");
      },{passive:true});
      card.addEventListener("pointerleave",()=>{
        card.style.setProperty("--rx","0deg");card.style.setProperty("--ry","0deg");
      });
    });
  }
  gamesSlider?.stopAuto();
  gamesSlider=null;
  renderAllSliderDots();
}
function saveGameStats(all){
  try{localStorage.setItem(GAME_STATS_KEY,JSON.stringify(all))}catch(_){}
}
function playFeaturedGame(id,button){
  const game=featuredGames.find(g=>String(g.id)===String(id));if(!game)return;
  const all=readObject(GAME_STATS_KEY),current=(all[game.id]&&typeof all[game.id]==="object")?all[game.id]:{};
  const players=Number.isFinite(Number(current.players))?Number(current.players):Number.isFinite(Number(game.players))?Number(game.players):0;
  all[game.id]={...current,players:players+1,lastPlayed:Date.now()};
  saveGameStats(all);
  burstGameButton(button,6);
  button?.classList.remove("is-pop");void button?.offsetWidth;button?.classList.add("is-pop");
  renderFeaturedGames();
  window.location.href="pages/ctrlzone.html?game="+encodeURIComponent(game.id);
}
function burstGameButton(button,count=6){
  if(!button)return;
  const r=button.getBoundingClientRect();
  for(let i=0;i<count;i++){
    const dot=document.createElement("i");dot.className="game-burst-dot";
    const angle=(Math.PI*2/count)*i,dx=Math.cos(angle)*(26+i*3),dy=Math.sin(angle)*(26+i*3);
    dot.style.left=(r.left+r.width/2)+"px";dot.style.top=(r.top+r.height/2)+"px";
    document.body.appendChild(dot);
    dot.animate([{transform:"translate(-50%,-50%) scale(1)",opacity:1},{transform:"translate(calc(-50% + "+dx+"px),calc(-50% + "+dy+"px)) scale(.2)",opacity:0}],{duration:480,fill:"forwards",easing:"cubic-bezier(.16,1,.3,1)"}).onfinish=()=>dot.remove();
  }
}
function burstFooterSend(button,count=6){
  if(!button)return;
  const r=button.getBoundingClientRect();
  for(let i=0;i<count;i++){
    const dot=document.createElement("i");dot.className="footer-send-dot";
    const angle=(Math.PI*2/count)*i,dx=Math.cos(angle)*(24+i*3),dy=Math.sin(angle)*(24+i*3);
    dot.style.left=(r.left+r.width/2)+"px";dot.style.top=(r.top+r.height/2)+"px";
    document.body.appendChild(dot);
    dot.animate([{transform:"translate(-50%,-50%) scale(1)",opacity:1},{transform:"translate(calc(-50% + "+dx+"px),calc(-50% + "+dy+"px)) scale(.2)",opacity:0}],{duration:480,fill:"forwards",easing:"cubic-bezier(.16,1,.3,1)"}).onfinish=()=>dot.remove();
  }
}
function initFooterNewsletter(){
  const form=$("#footerNewsletterForm"),input=$("#footerNewsletterEmail"),status=$("#footerNewsletterStatus"),button=$("#footerNewsletterSend");
  if(!form||!input||!status||!button)return;
  form.addEventListener("submit",event=>{
    event.preventDefault();
    const email=input.value.trim().toLowerCase();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
      status.textContent="Please enter a valid email address.";
      status.className="footer-newsletter-status is-error";
      return;
    }
    let list=[];
    try{const raw=JSON.parse(localStorage.getItem("tubalhub_newsletter_subscribers")||"[]");list=Array.isArray(raw)?raw:[]}catch(_){}
    if(!list.includes(email))list.push(email);
    try{localStorage.setItem("tubalhub_newsletter_subscribers",JSON.stringify(list))}catch(_){}
    input.value="";
    status.textContent="Saved on this device.";
    status.className="footer-newsletter-status is-ok";
    button.classList.remove("is-pop");void button.offsetWidth;button.classList.add("is-pop");
    burstFooterSend(button,6);
  });
}
function initFooterSmoothLinks(){
  document.querySelectorAll('#mainFooter a[href^="#"]').forEach(link=>{
    link.addEventListener("click",event=>{
      const id=link.getAttribute("href"),target=id&&document.querySelector(id);
      if(!target)return;
      event.preventDefault();
      target.scrollIntoView({behavior:"smooth",block:"start"});
      history.replaceState(null,"",id);
    });
  });
}

function initFooterSpotlight(){
  const footer=$("#mainFooter");
  if(!footer||window.matchMedia?.("(hover: none), (pointer: coarse)").matches)return;
  let frame=0;
  footer.addEventListener("pointermove",event=>{
    const rect=footer.getBoundingClientRect(),x=event.clientX-rect.left,y=event.clientY-rect.top;
    if(frame)return;
    frame=requestAnimationFrame(()=>{
      footer.style.setProperty("--footer-x",x+"px");
      footer.style.setProperty("--footer-y",y+"px");
      frame=0;
    });
  },{passive:true});
}

function initFooterMessages(){
  const button=$("#footerMessagesButton");
  if(!button)return;
  button.addEventListener("click",()=>{
    const aiFab=$("#tubalAiFab");
    if(aiFab){
      aiFab.click();
    }else{
      window.location.href="pages/chat.html";
    }
  });
}

function initFooterQr(){
  const box=$("#footerQrCode");
  if(!box||box.dataset.ready==="1")return;
  box.dataset.ready="1";
  const img=document.createElement("img");
  img.src="https://quickchart.io/qr?size=96&margin=1&text="+encodeURIComponent("https://tubalrr.github.io/tubalhub/");
  img.alt="TUBAL HUB QR code";
  img.loading="lazy";
  img.decoding="async";
  box.appendChild(img);
}

async function initFooter(){
  try{
    const r=await fetch("version.json?t="+Date.now(),{cache:"no-store"});if(!r.ok)throw new Error();
    const data=await r.json();
    const version=$("#homeVersion");if(version)version.textContent="v"+(data.version||"—");
  }catch(_){const version=$("#homeVersion");if(version)version.textContent="Version unavailable"}
  const update=()=>$("#homeOnlineDot")?.classList.toggle("offline",!navigator.onLine);
  update();
  const textEl=$("#homeOnlineText");
  if(textEl)textEl.textContent=navigator.onLine?"Online":"Offline";
  addEventListener("online",()=>{update();if(textEl)textEl.textContent="Online"});
  addEventListener("offline",()=>{update();if(textEl)textEl.textContent="Offline"});
  try{
    const bytes=[...Array(localStorage.length)].reduce((sum,_,i)=>{const k=localStorage.key(i)||"",v=localStorage.getItem(k)||"";return sum+(k.length+v.length)*2},0);
    const storage=$("#homeStorage");if(storage)storage.textContent=(bytes/1024).toFixed(1)+" KB local data";
  }catch(_){}
  initFooterSpotlight();
  initFooterMessages();
  initFooterQr();
}
const sliderTimers=new Map();

function renderAllSliderDots(){
  document.querySelectorAll(".slider-track").forEach(track=>{
    const cards=[...track.children].filter(el=>el.offsetWidth>0);
    if(!cards.length)return;
    let dots=track.parentElement.querySelector(".auto-slider-dots");
    if(!dots){
      dots=document.createElement("div");
      dots.className="auto-slider-dots";
      track.parentElement.appendChild(dots);
    }
    if(dots.dataset.count!==String(cards.length)){
      dots.dataset.count=String(cards.length);
      dots.innerHTML=cards.map((_,i)=>'<button type="button" data-slider-index="'+i+'" aria-label="Go to card '+(i+1)+'"></button>').join("");
      dots.querySelectorAll("button").forEach((b,i)=>b.addEventListener("click",()=>cards[i]&&track.scrollTo({left:cards[i].offsetLeft,behavior:"smooth"})));
    }
    const active=()=>{
      let best=0,min=Infinity;
      cards.forEach((c,i)=>{const d=Math.abs(track.scrollLeft-c.offsetLeft);if(d<min){min=d;best=i}});
      dots.querySelectorAll("button").forEach((b,i)=>b.classList.toggle("active",i===best));
    };
    if(track.dataset.dotsScrollReady!=="1"){
      track.dataset.dotsScrollReady="1";
      track.addEventListener("scroll",active,{passive:true});
    }
    active();
  });
}

function initAllSliders(){
  document.querySelectorAll(".slider-track").forEach(track=>{
    if(track.dataset.sliderReady==="1")return;
    track.dataset.sliderReady="1";
    const id=track.id;
    const prev=$("#"+id+"Prev"),next=$("#"+id+"Next");
    const cards=()=>Array.from(track.children).filter(el=>el.offsetWidth>0);
    let startX=0,dragX=0,dragging=false,touchStartX=0;

    const cardStep=()=>{
      const card=cards()[0];
      return card?card.getBoundingClientRect().width+(isMobileHome()?12:20):0;
    };
    const scrollByCards=dir=>{
      const step=cardStep();
      if(!step)return;
      const visible=Math.max(1,Math.floor(track.clientWidth/Math.max(step,1)));
      track.scrollBy({left:dir*step*visible,behavior:"smooth"});
    };
    prev?.addEventListener("click",()=>scrollByCards(-1));
    next?.addEventListener("click",()=>scrollByCards(1));

    // Desktop pointer drag.
    track.addEventListener("pointerdown",e=>{
      if(e.pointerType==="touch")return;
      dragging=true;startX=e.clientX;dragX=0;
      track.classList.add("is-dragging");
      track.setPointerCapture?.(e.pointerId);
    });
    track.addEventListener("pointermove",e=>{
      if(dragging)dragX=e.clientX-startX;
    });
    const endPointer=()=>{
      if(!dragging)return;
      dragging=false;
      track.classList.remove("is-dragging");
      if(Math.abs(dragX)>=50)track.scrollBy({left:dragX<0?cardStep()||300:-(cardStep()||300),behavior:"smooth"});
      dragX=0;
    };
    track.addEventListener("pointerup",endPointer);
    track.addEventListener("pointercancel",endPointer);

    // Mobile touch swipe: threshold 50px, then snap one card.
    track.addEventListener("touchstart",e=>{
      if(!e.touches?.length)return;
      touchStartX=e.touches[0].clientX;
    },{passive:true});
    track.addEventListener("touchmove",e=>{
      if(!e.touches?.length)return;
      const delta=e.touches[0].clientX-touchStartX;
      if(Math.abs(delta)>10)track.classList.add("is-touching");
    },{passive:true});
    track.addEventListener("touchend",e=>{
      const touch=e.changedTouches?.[0];
      if(!touch)return;
      const delta=touch.clientX-touchStartX;
      if(Math.abs(delta)>=50){
        const step=cardStep()||300;
        track.scrollBy({left:delta<0?step:-step,behavior:"smooth"});
      }
      track.classList.remove("is-touching");
      touchStartX=0;
    },{passive:true});

    const timer=setInterval(()=>{
      if(document.hidden)return;
      if(isMobileHome() && track.classList.contains("is-touching"))return;
      if(track.matches(":hover"))return;
      const step=cardStep()||300;
      track.scrollBy({left:step,behavior:"smooth"});
    },5000);
    sliderTimers.set(id,timer);
    if("MutationObserver" in window){
      const observer=new MutationObserver(()=>requestAnimationFrame(renderAllSliderDots));
      observer.observe(track,{childList:true});
    }
  });
}
function initHorizontalSections(){initAllSliders();}
function cleanup(){
  if(state.heroTimer)clearInterval(state.heroTimer);
  if(state.musicUrl)URL.revokeObjectURL(state.musicUrl);
  cancelAnimationFrame(state.visualFrame);
  try{state.audioContext?.close()}catch(_){}
}
function initScrollReveal(){
  const animate=(el,i=0)=>{
    if(el.dataset.revealed==="1")return;
    el.dataset.revealed="1";
    if(!el.animate){el.style.opacity="1";return}
    el.animate(
      [{opacity:0,transform:"translate3d(0,18px,0)"},{opacity:1,transform:"translate3d(0,0,0)"}],
      {duration:600,delay:(i%10)*80,easing:"cubic-bezier(.16,1,.3,1)",fill:"none"}
    ).onfinish=()=>{el.style.opacity="1";el.style.removeProperty("transform")}
  };
  const scan=()=>{
    document.querySelectorAll("#journalTrack > *,#musicTrack > *,#feedTrack > *,#gamesTrack > *").forEach((el,i)=>animate(el,i));
  };
  scan();
  if("MutationObserver" in window){
    const mo=new MutationObserver(()=>scan());
    ["journalTrack","musicTrack","feedTrack","gamesTrack"].forEach(id=>{
      const node=$("#"+id);if(node)mo.observe(node,{childList:true});
    });
  }
}

/* =========================================================
   CANVA-LIKE DESIGN STUDIO — vanilla Canvas, real local data
   ========================================================= */
const CANVA_STUDIO_VERSION="1.0.0";
const CANVA_DESIGN_KEY="tubalhub_canva_current";
const CANVA_DESIGNS_KEY="tubalhub_canva_designs";
const CANVA_DRAFT_DB="tubalhub_canva_drafts";
const CANVA_DRAFT_STORE="drafts";
const CANVA_W=700;
const CANVA_H=400;
const canvaStudioState={
  canvas:null,ctx:null,objects:[],background:{type:"transparent"},selectedId:null,activeTool:"",
  interaction:null,drawPreview:null,renderQueued:false,imageCache:new Map(),templateIndex:0
};
const CANVA_TEMPLATES=[
  {id:"gradient-green",name:"Gradient Green",format:"600×400",background:{type:"gradient",from:"#1dff91",to:"#7d5aff",angle:135},objects:[
    {type:"text",x:56,y:58,text:"TUBAL HUB",fontSize:48,color:"#020604",fontFamily:"Inter",bold:true,italic:false,align:"left",rotation:0},
    {type:"text",x:60,y:126,text:"DESIGN STUDIO",fontSize:22,color:"#ffffff",fontFamily:"Poppins",bold:true,italic:false,align:"left",rotation:0},
    {type:"shape",shape:"circle",x:458,y:84,w:82,h:82,color:"rgba(255,255,255,.24)",rotation:0}
  ]},
  {id:"midnight-aurora",name:"Midnight Aurora",format:"600×400",background:{type:"gradient",from:"#020604",to:"#173b2a",angle:115},objects:[
    {type:"text",x:48,y:50,text:"MIDNIGHT",fontSize:50,color:"#ffffff",fontFamily:"Inter",bold:true,italic:false,align:"left",rotation:0},
    {type:"text",x:50,y:112,text:"AURORA",fontSize:42,color:"#1dff91",fontFamily:"Poppins",bold:true,italic:false,align:"left",rotation:0},
    {type:"text",x:52,y:180,text:"A quiet glow for bold ideas.",fontSize:18,color:"#dce9e2",fontFamily:"Inter",bold:false,italic:true,align:"left",rotation:0}
  ]},
  {id:"forest-organic",name:"Forest Organic",format:"600×400",background:{type:"gradient",from:"#0a1f12",to:"#234a31",angle:135},objects:[
    {type:"emoji",x:64,y:58,char:"🌿",fontSize:72,rotation:0},
    {type:"text",x:58,y:150,text:"FOREST NOTES",fontSize:38,color:"#f4f4e8",fontFamily:"Poppins",bold:true,italic:false,align:"left",rotation:0},
    {type:"text",x:60,y:208,text:"organic • calm • local",fontSize:18,color:"#b7c9bd",fontFamily:"Inter",bold:false,italic:false,align:"left",rotation:0}
  ]},
  {id:"light-minimal",name:"Light Minimal",format:"600×400",background:{type:"solid",color:"#f8f7f2"},objects:[
    {type:"text",x:52,y:54,text:"LESS, BUT BETTER",fontSize:38,color:"#101513",fontFamily:"Inter",bold:true,italic:false,align:"left",rotation:0},
    {type:"shape",shape:"rect",x:54,y:138,w:150,h:8,color:"#1dff91",rotation:0},
    {type:"text",x:54,y:170,text:"Clean space. Clear message.",fontSize:19,color:"#5b665f",fontFamily:"Poppins",bold:false,italic:false,align:"left",rotation:0}
  ]},
  {id:"payapang-calm",name:"Payapang Isip",format:"1080×1080",background:{type:"gradient",from:"#dbeadf",to:"#8fae95",angle:135},objects:[
    {type:"emoji",x:68,y:54,char:"🌿",fontSize:62,rotation:0},
    {type:"text",x:58,y:138,text:"Payapang Isip",fontSize:44,color:"#193225",fontFamily:"Poppins",bold:true,italic:false,align:"left",rotation:0},
    {type:"text",x:60,y:206,text:"Huminga. Huminto. Magpatuloy.",fontSize:18,color:"#355443",fontFamily:"Inter",bold:false,italic:true,align:"left",rotation:0}
  ]},
  {id:"ai-music-neon",name:"AI Music Neon",format:"500×500",background:{type:"gradient",from:"#170b31",to:"#071b22",angle:125},objects:[
    {type:"emoji",x:60,y:44,char:"🎵",fontSize:68,rotation:0},
    {type:"text",x:58,y:136,text:"AI MUSIC",fontSize:46,color:"#ffffff",fontFamily:"Inter",bold:true,italic:false,align:"left",rotation:0},
    {type:"text",x:60,y:202,text:"NEW SOUND / NEW MOOD",fontSize:17,color:"#1dff91",fontFamily:"Poppins",bold:true,italic:false,align:"left",rotation:0},
    {type:"shape",shape:"circle",x:456,y:230,w:54,h:54,color:"rgba(125,90,255,.85)",rotation:0}
  ]},
  {id:"ctrlzone-gaming",name:"CTRLZONE Gaming",format:"1280×720",background:{type:"gradient",from:"#07100b",to:"#173b2a",angle:140},objects:[
    {type:"emoji",x:52,y:52,char:"🎮",fontSize:64,rotation:0},
    {type:"text",x:50,y:136,text:"CTRLZONE",fontSize:52,color:"#1dff91",fontFamily:"Inter",bold:true,italic:false,align:"left",rotation:0},
    {type:"text",x:54,y:202,text:"PLAY • CREATE • CONNECT",fontSize:18,color:"#e8f5ed",fontFamily:"Poppins",bold:true,italic:false,align:"left",rotation:0},
    {type:"shape",shape:"rect",x:52,y:252,w:496,h:5,color:"#1dff91",rotation:0}
  ]},
  {id:"creator-quote",name:"Creator Quote",format:"1080×1080",background:{type:"gradient",from:"#121218",to:"#2a2542",angle:135},objects:[
    {type:"text",x:52,y:54,text:"MAKE IT YOURS.",fontSize:44,color:"#ffffff",fontFamily:"Poppins",bold:true,italic:false,align:"left",rotation:0},
    {type:"text",x:54,y:132,text:"Your idea deserves a canvas.",fontSize:24,color:"#d5cffd",fontFamily:"Inter",bold:false,italic:true,align:"left",rotation:0},
    {type:"shape",shape:"circle",x:492,y:286,w:52,h:52,color:"#7d5aff",rotation:0}
  ]},
  {id:"podcast-cover",name:"Podcast Cover",format:"1400×1400",background:{type:"gradient",from:"#0c0d0d",to:"#3a2416",angle:125},objects:[
    {type:"shape",shape:"circle",x:54,y:42,w:88,h:88,color:"#d4a082",rotation:0},
    {type:"text",x:54,y:156,text:"THE NIGHT SHOW",fontSize:42,color:"#fff8ef",fontFamily:"Inter",bold:true,italic:false,align:"left",rotation:0},
    {type:"text",x:56,y:220,text:"CONVERSATIONS AFTER DARK",fontSize:16,color:"#d9bda8",fontFamily:"Poppins",bold:true,italic:false,align:"left",rotation:0}
  ]},
  {id:"youtube-thumbnail",name:"YouTube Thumbnail",format:"1280×720",background:{type:"gradient",from:"#07100b",to:"#41214f",angle:135},objects:[
    {type:"text",x:42,y:42,text:"NEW VIDEO",fontSize:22,color:"#1dff91",fontFamily:"Inter",bold:true,italic:false,align:"left",rotation:0},
    {type:"text",x:42,y:100,text:"MAKE SOMETHING",fontSize:44,color:"#ffffff",fontFamily:"Poppins",bold:true,italic:false,align:"left",rotation:0},
    {type:"text",x:44,y:158,text:"PEOPLE WILL REMEMBER",fontSize:30,color:"#ffffff",fontFamily:"Inter",bold:true,italic:false,align:"left",rotation:0},
    {type:"shape",shape:"rect",x:44,y:224,w:178,h:48,color:"#7d5aff",rotation:0},
    {type:"text",x:61,y:233,text:"WATCH →",fontSize:20,color:"#ffffff",fontFamily:"Poppins",bold:true,italic:false,align:"left",rotation:0}
  ]},
  {id:"event-poster",name:"Event Poster",format:"1080×1350",background:{type:"gradient",from:"#0a1f12",to:"#0b2e34",angle:135},objects:[
    {type:"text",x:50,y:48,text:"COMMUNITY NIGHT",fontSize:38,color:"#ffffff",fontFamily:"Poppins",bold:true,italic:false,align:"left",rotation:0},
    {type:"shape",shape:"rect",x:52,y:116,w:160,h:6,color:"#1dff91",rotation:0},
    {type:"text",x:52,y:150,text:"LIVE • LOCAL • OPEN",fontSize:20,color:"#a7c6b5",fontFamily:"Inter",bold:true,italic:false,align:"left",rotation:0},
    {type:"emoji",x:482,y:286,char:"✨",fontSize:58,rotation:0}
  ]},
  {id:"product-promo",name:"Product Promo",format:"1080×1080",background:{type:"gradient",from:"#141b17",to:"#33254d",angle:135},objects:[
    {type:"text",x:50,y:48,text:"NEW DROP",fontSize:24,color:"#1dff91",fontFamily:"Inter",bold:true,italic:false,align:"left",rotation:0},
    {type:"text",x:50,y:98,text:"YOUR PRODUCT",fontSize:44,color:"#ffffff",fontFamily:"Poppins",bold:true,italic:false,align:"left",rotation:0},
    {type:"text",x:52,y:164,text:"Put your real product image here.",fontSize:18,color:"#c5cdc8",fontFamily:"Inter",bold:false,italic:false,align:"left",rotation:0},
    {type:"shape",shape:"circle",x:478,y:268,w:72,h:72,color:"#1dff91",rotation:0}
  ]}
];

function canvaClone(value){return JSON.parse(JSON.stringify(value))}
function canvaNewId(prefix="obj"){return prefix+"-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,8)}
function canvaStatus(message){const el=$("#canvaSaveStatus");if(el)el.textContent=message}
function canvaFont(obj){return (obj.italic?"italic ":"")+(obj.bold?"700 ":"400 ")+Number(obj.fontSize||24)+"px "+(obj.fontFamily||"Inter")+", sans-serif"}
function canvaMeasure(obj){
  if(obj.type==="text"){const ctx=canvaStudioState.ctx;ctx.save();ctx.font=canvaFont(obj);const width=Math.max(12,ctx.measureText(String(obj.text||"")).width);ctx.restore();return{w:Math.min(CANVA_W,Math.max(12,width)),h:Math.max(16,Number(obj.fontSize||24)*1.25)}}
  if(obj.type==="emoji")return{w:Number(obj.fontSize||48),h:Number(obj.fontSize||48)}
  if(obj.type==="image")return{w:Number(obj.w||160),h:Number(obj.h||120)}
  if(obj.type==="path"){const pts=Array.isArray(obj.points)?obj.points:[];if(!pts.length)return{w:20,h:20};const xs=pts.map(p=>p.x),ys=pts.map(p=>p.y);return{w:Math.max(20,Math.max(...xs)-Math.min(...xs)),h:Math.max(20,Math.max(...ys)-Math.min(...ys))}}
  return{w:Number(obj.w||120),h:Number(obj.h||80)}
}
function canvaBounds(obj){const s=canvaMeasure(obj);return{x:Number(obj.x||0),y:Number(obj.y||0),w:s.w,h:s.h,cx:Number(obj.x||0)+s.w/2,cy:Number(obj.y||0)+s.h/2}}
function canvaRotatePoint(px,py,cx,cy,deg){const r=deg*Math.PI/180,c=Math.cos(r),s=Math.sin(r),dx=px-cx,dy=py-cy;return{x:dx*c+dy*s+cx,y:-dx*s+dy*c+cy}}
function canvaInversePoint(px,py,b){return canvaRotatePoint(px,py,b.cx,b.cy,-b.rotation)}
function canvaHitObject(obj,x,y){const b={...canvaBounds(obj),rotation:Number(obj.rotation||0)},p=canvaInversePoint(x,y,b),pad=4;return p.x>=b.x-pad&&p.x<=b.x+b.w+pad&&p.y>=b.y-pad&&p.y<=b.y+b.h+pad}
function canvaGetHandlePoints(obj){
  const b={...canvaBounds(obj),rotation:Number(obj.rotation||0)},raw=[["nw",b.x,b.y],["n",b.x+b.w/2,b.y],["ne",b.x+b.w,b.y],["e",b.x+b.w,b.y+b.h/2],["se",b.x+b.w,b.y+b.h],["s",b.x+b.w/2,b.y+b.h],["sw",b.x,b.y+b.h],["w",b.x,b.y+b.h/2]];
  const handles=raw.map(v=>({name:v[0],...canvaRotatePoint(v[1],v[2],b.cx,b.cy,b.rotation)})),top=handles[1],angle=b.rotation*Math.PI/180;
  return{box:b,handles,rotate:{x:top.x+Math.sin(angle)*28,y:top.y-Math.cos(angle)*28}}
}
function canvaPointerPosition(e){const canvas=canvaStudioState.canvas,rect=canvas.getBoundingClientRect();return{x:clamp((e.clientX-rect.left)*(canvas.width/rect.width),0,CANVA_W),y:clamp((e.clientY-rect.top)*(canvas.height/rect.height),0,CANVA_H)}}
function canvaFindHandle(x,y){
  const obj=canvaStudioState.objects.find(o=>o.id===canvaStudioState.selectedId);if(!obj)return null;const hp=canvaGetHandlePoints(obj);
  for(const h of hp.handles)if(Math.hypot(h.x-x,h.y-y)<10)return{type:"resize",handle:h.name};
  if(Math.hypot(hp.rotate.x-x,hp.rotate.y-y)<14)return{type:"rotate"};return null;
}
function canvaDrawBackground(){
  const ctx=canvaStudioState.ctx,bg=canvaStudioState.background||{type:"transparent"};
  if(bg.type==="solid"){ctx.fillStyle=bg.color||"#020604";ctx.fillRect(0,0,CANVA_W,CANVA_H);return}
  if(bg.type==="gradient"){const angle=(Number(bg.angle)||135)*Math.PI/180,dx=Math.cos(angle),dy=Math.sin(angle),cx=CANVA_W/2,cy=CANVA_H/2,len=Math.hypot(CANVA_W,CANVA_H),g=ctx.createLinearGradient(cx-dx*len/2,cy-dy*len/2,cx+dx*len/2,cy+dy*len/2);g.addColorStop(0,bg.from||"#020604");g.addColorStop(1,bg.to||"#1dff91");ctx.fillStyle=g;ctx.fillRect(0,0,CANVA_W,CANVA_H)}
}
function canvaDrawObject(obj){
  const ctx=canvaStudioState.ctx,b=canvaBounds(obj);ctx.save();ctx.translate(b.cx,b.cy);ctx.rotate(Number(obj.rotation||0)*Math.PI/180);
  if(obj.type==="text"){ctx.font=canvaFont(obj);ctx.fillStyle=obj.color||"#fff";ctx.textBaseline="top";ctx.textAlign=obj.align||"left";const anchor=obj.align==="center"?0:obj.align==="right"?b.w/2:-b.w/2;ctx.fillText(String(obj.text||""),anchor,-b.h/2)}
  else if(obj.type==="emoji"){ctx.font=Number(obj.fontSize||48)+"px system-ui, sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(String(obj.char||"🌿"),0,0)}
  else if(obj.type==="shape"){ctx.fillStyle=obj.color||"#1dff91";if(obj.shape==="circle"){ctx.beginPath();ctx.ellipse(0,0,b.w/2,b.h/2,0,0,Math.PI*2);ctx.fill()}else ctx.fillRect(-b.w/2,-b.h/2,b.w,b.h)}
  else if(obj.type==="image"){const img=canvaStudioState.imageCache.get(obj.id)||canvaStudioState.imageCache.get(obj.src);if(img?.complete)ctx.drawImage(img,-b.w/2,-b.h/2,b.w,b.h)}
  else if(obj.type==="path"){const pts=Array.isArray(obj.points)?obj.points:[];if(pts.length){ctx.strokeStyle=obj.color||"#1dff91";ctx.lineWidth=Number(obj.lineWidth||4);ctx.lineCap="round";ctx.lineJoin="round";ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p.x-b.cx,p.y-b.cy):ctx.moveTo(p.x-b.cx,p.y-b.cy));ctx.stroke()}}
  ctx.restore();
}
function canvaDrawSelection(obj){
  const ctx=canvaStudioState.ctx,hp=canvaGetHandlePoints(obj);ctx.save();ctx.strokeStyle="#1dff91";ctx.lineWidth=2;ctx.setLineDash([6,4]);ctx.beginPath();
  hp.handles.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.stroke();ctx.setLineDash([]);
  hp.handles.forEach(p=>{ctx.fillStyle="#fff";ctx.strokeStyle="#1dff91";ctx.lineWidth=2;ctx.fillRect(p.x-4,p.y-4,8,8);ctx.strokeRect(p.x-4,p.y-4,8,8)});
  ctx.strokeStyle="#1dff91";ctx.beginPath();ctx.moveTo(hp.handles[1].x,hp.handles[1].y);ctx.lineTo(hp.rotate.x,hp.rotate.y);ctx.stroke();
  ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(hp.rotate.x,hp.rotate.y,10,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle="#1dff91";ctx.font="12px sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("↻",hp.rotate.x,hp.rotate.y);ctx.restore();
}
function canvaRender(){
  if(!canvaStudioState.ctx)return;const ctx=canvaStudioState.ctx;ctx.clearRect(0,0,CANVA_W,CANVA_H);canvaDrawBackground();canvaStudioState.objects.forEach(canvaDrawObject);if(canvaStudioState.drawPreview)canvaDrawObject(canvaStudioState.drawPreview);
  const selected=canvaStudioState.objects.find(o=>o.id===canvaStudioState.selectedId);if(selected)canvaDrawSelection(selected);$("#canvaCanvasShell")?.classList.toggle("has-design",!!canvaStudioState.objects.length||canvaStudioState.background.type!=="transparent");
}
function canvaRequestRender(){if(canvaStudioState.renderQueued)return;canvaStudioState.renderQueued=true;requestAnimationFrame(()=>{canvaStudioState.renderQueued=false;canvaRender()})}
function canvaSaveCurrent(){
  const payload={version:CANVA_STUDIO_VERSION,updatedAt:Date.now(),background:canvaClone(canvaStudioState.background),objects:canvaClone(canvaStudioState.objects)};
  try{
    localStorage.setItem(CANVA_DESIGN_KEY,JSON.stringify(payload));
    const saved=Array.isArray(JSON.parse(localStorage.getItem(CANVA_DESIGNS_KEY)||"[]"))?JSON.parse(localStorage.getItem(CANVA_DESIGNS_KEY)||"[]"):[];
    saved.unshift(payload);
    localStorage.setItem(CANVA_DESIGNS_KEY,JSON.stringify(saved.slice(0,20)));
    canvaStatus("Saved locally");
  }catch(_){canvaStatus("Local save unavailable")}
}
function canvaLoadCurrent(){
  try{const raw=localStorage.getItem(CANVA_DESIGN_KEY);if(!raw)return;const data=JSON.parse(raw);if(!data||!Array.isArray(data.objects)||!data.background)return;canvaStudioState.objects=data.objects;canvaStudioState.background=data.background;canvaStudioState.objects.filter(o=>o.type==="image"&&o.src).forEach(o=>canvaLoadImage(o.src,img=>canvaStudioState.imageCache.set(o.id,img)));canvaStatus("Loaded saved design")}catch(_){canvaStatus("New canvas")}
}
function canvaSelect(id){
  canvaStudioState.selectedId=id||null;canvaUpdateProperties();canvaRenderLayers();
  const selected=canvaStudioState.objects.find(o=>o.id===id),status=$("#canvaSelectionStatus");
  if(status)status.textContent=selected?(selected.type==="text"?"Text selected":selected.type==="image"?"Image selected":selected.type==="emoji"?"Emoji selected":selected.type==="shape"?"Shape selected":"Drawing selected"):"No element selected";
  canvaRequestRender();
}
function canvaAddObject(obj){obj.id=obj.id||canvaNewId();canvaStudioState.objects.push(obj);canvaSelect(obj.id);canvaSaveCurrent()}
function addText(){const text=window.prompt("Text to add:","");if(text===null||!text.trim())return;canvaAddObject({type:"text",x:70,y:70,text:text.trim(),fontSize:32,color:"#1dff91",fontFamily:"Inter",bold:false,italic:false,align:"left",rotation:0})}
function addEmoji(char="🌿"){canvaAddObject({type:"emoji",x:120,y:100,char,fontSize:58,rotation:0})}
function addShape(shape="rect"){canvaAddObject({type:"shape",shape:shape==="circle"?"circle":"rect",x:180,y:130,w:180,h:110,color:"#1dff91",rotation:0})}
function changeBackground(value){
  if(typeof value==="string"&&value.startsWith("linear-gradient"))canvaStudioState.background={type:"gradient",from:"#1dff91",to:"#7d5aff",angle:135};
  else if(typeof value==="string")canvaStudioState.background={type:"solid",color:value};
  else if(value?.type)canvaStudioState.background=canvaClone(value);
  canvaSaveCurrent();canvaRequestRender();
}
function canvaLoadImage(src,callback){const cached=canvaStudioState.imageCache.get(src);if(cached){callback?.(cached);return}const img=new Image();img.onload=()=>{canvaStudioState.imageCache.set(src,img);callback?.(img);canvaRequestRender()};img.onerror=()=>canvaStatus("Image could not be loaded");img.src=src}
function uploadImage(file){
  if(!file||!file.type.startsWith("image/"))return;const reader=new FileReader();reader.onload=()=>{const src=String(reader.result||""),img=new Image();img.onload=()=>{
    const max=220,scale=Math.min(1,max/Math.max(img.width,img.height)),obj={type:"image",src,x:Math.round((CANVA_W-img.width*scale)/2),y:Math.round((CANVA_H-img.height*scale)/2),w:Math.max(40,Math.round(img.width*scale)),h:Math.max(40,Math.round(img.height*scale)),rotation:0};
    canvaAddObject(obj);canvaStudioState.imageCache.set(obj.id,img);canvaStudioState.imageCache.set(src,img);canvaRequestRender();
  };img.src=src};reader.readAsDataURL(file);
}
function canvaDeleteSelected(){
  const id=canvaStudioState.selectedId;if(!id)return;canvaStudioState.objects=canvaStudioState.objects.filter(o=>o.id!==id);canvaStudioState.selectedId=null;canvaUpdateProperties();canvaRenderLayers();canvaSaveCurrent();canvaRequestRender();canvaStatus("Element deleted");
}
function canvaObjectAt(x,y){for(let i=canvaStudioState.objects.length-1;i>=0;i--)if(canvaHitObject(canvaStudioState.objects[i],x,y))return canvaStudioState.objects[i];return null}
function handleMouseDown(e){
  const p=canvaPointerPosition(e),tool=canvaStudioState.activeTool;canvaStudioState.canvas.setPointerCapture?.(e.pointerId);
  if(tool==="draw"){canvaStudioState.interaction={mode:"draw",startX:p.x,startY:p.y};canvaStudioState.drawPreview={type:"path",x:0,y:0,points:[{x:p.x,y:p.y}],color:"#1dff91",lineWidth:4,rotation:0};canvaRequestRender();return}
  if(canvaStudioState.selectedId){const handle=canvaFindHandle(p.x,p.y),obj=canvaStudioState.objects.find(o=>o.id===canvaStudioState.selectedId);if(handle&&obj){const b=canvaBounds(obj);canvaStudioState.interaction={mode:handle.type,handle:handle.handle,startX:p.x,startY:p.y,startObj:canvaClone(obj),startAngle:Math.atan2(p.y-b.cy,p.x-b.cx)};return}}
  const target=canvaObjectAt(p.x,p.y);if(target){canvaSelect(target.id);canvaStudioState.interaction={mode:"drag",startX:p.x,startY:p.y,startObj:canvaClone(target)}}else canvaSelect(null);
}
function handleMouseMove(e){
  const interaction=canvaStudioState.interaction;if(!interaction)return;const p=canvaPointerPosition(e),id=canvaStudioState.selectedId,obj=canvaStudioState.objects.find(o=>o.id===id);
  if(interaction.mode==="draw"){canvaStudioState.drawPreview.points.push({x:p.x,y:p.y});canvaRequestRender();return}
  if(!obj)return;
  if(interaction.mode==="drag"){const s=interaction.startObj,w=canvaMeasure(obj).w,h=canvaMeasure(obj).h;obj.x=clamp(s.x+(p.x-interaction.startX),0,CANVA_W-w);obj.y=clamp(s.y+(p.y-interaction.startY),0,CANVA_H-h)}
  else if(interaction.mode==="rotate"){const b=canvaBounds(interaction.startObj),now=Math.atan2(p.y-b.cy,p.x-b.cx);obj.rotation=interaction.startObj.rotation+(now-interaction.startAngle)*180/Math.PI}
  else if(interaction.mode==="resize"){
    const start=interaction.startObj,dx=p.x-interaction.startX,dy=p.y-interaction.startY;let w=start.w??canvaMeasure(start).w,h=start.h??canvaMeasure(start).h,x=start.x,y=start.y;
    if(interaction.handle.includes("e"))w=Math.max(24,w+dx);if(interaction.handle.includes("s"))h=Math.max(24,h+dy);if(interaction.handle.includes("w")){w=Math.max(24,w-dx);x=start.x+dx}if(interaction.handle.includes("n")){h=Math.max(24,h-dy);y=start.y+dy}
    if(obj.type==="circle"){const size=Math.max(24,Math.max(Math.abs(w),Math.abs(h)));w=size;h=size}
    obj.w=clamp(w,24,CANVA_W);obj.h=clamp(h,24,CANVA_H);obj.x=clamp(x,0,CANVA_W-obj.w);obj.y=clamp(y,0,CANVA_H-obj.h);
    if(obj.type==="text"){const base=start.w||canvaMeasure(start).w;obj.fontSize=clamp(Math.round((start.fontSize||32)*(obj.w/base)),12,72)}
    if(obj.type==="emoji"){const base=start.w||start.fontSize||48;obj.fontSize=clamp(Math.round((start.fontSize||48)*(obj.w/base)),18,120)}
  }
  canvaRequestRender();
}
function handleMouseUp(){
  const interaction=canvaStudioState.interaction;if(!interaction)return;
  if(interaction.mode==="draw"&&canvaStudioState.drawPreview?.points?.length>1){const pts=canvaStudioState.drawPreview.points,xs=pts.map(pt=>pt.x),ys=pts.map(pt=>pt.y),path={type:"path",x:Math.min(...xs),y:Math.min(...ys),points:pts.map(pt=>({x:pt.x,y:pt.y})),color:"#1dff91",lineWidth:4,rotation:0};path.id=canvaNewId("draw");canvaStudioState.objects.push(path);canvaSelect(path.id)}
  canvaStudioState.interaction=null;canvaStudioState.drawPreview=null;canvaSaveCurrent();canvaRequestRender();
}
function canvaRenderLayers(){
  const box=$("#canvaLayers"),count=$("#canvaLayerCount");if(!box)return;const rows=[...canvaStudioState.objects].reverse();if(count)count.textContent=String(canvaStudioState.objects.length);
  if(!rows.length){box.innerHTML='<div class="canva-properties-empty">No layers yet. Add text, emoji, shapes or an image.</div>';return}
  const icons={text:"T",image:"🖼️",emoji:"😀",shape:"🔷",path:"🖌️"};
  box.innerHTML=rows.map((o,i)=>'<div class="canva-layer '+(o.id===canvaStudioState.selectedId?"selected":"")+'" draggable="true" data-canva-layer="'+esc(o.id)+'"><span class="canva-layer-drag">⋮⋮</span><span class="canva-layer-icon">'+icons[o.type]+'</span><span class="canva-layer-name">'+esc(o.type==="text"?o.text:o.type==="emoji"?o.char:o.type==="shape"?o.shape:"Drawing")+'</span><span class="canva-layer-z">'+(canvaStudioState.objects.length-i)+'</span></div>').join("");
  box.querySelectorAll("[data-canva-layer]").forEach(el=>{
    el.addEventListener("click",()=>canvaSelect(el.dataset.canvaLayer));el.addEventListener("dragstart",e=>{e.dataTransfer?.setData("text/plain",el.dataset.canvaLayer);el.classList.add("dragging")});
    el.addEventListener("dragend",()=>el.classList.remove("dragging"));el.addEventListener("dragover",e=>e.preventDefault());
    el.addEventListener("drop",e=>{e.preventDefault();const fromId=e.dataTransfer?.getData("text/plain");if(!fromId||fromId===el.dataset.canvaLayer)return;const from=canvaStudioState.objects.findIndex(o=>o.id===fromId),to=canvaStudioState.objects.findIndex(o=>o.id===el.dataset.canvaLayer);if(from<0||to<0)return;const [item]=canvaStudioState.objects.splice(from,1);canvaStudioState.objects.splice(to,0,item);canvaSaveCurrent();canvaRenderLayers();canvaRequestRender()});
  });
}
function canvaUpdateProperties(){
  const empty=$("#canvaPropertiesEmpty"),props=$("#canvaTextProperties"),obj=canvaStudioState.objects.find(o=>o.id===canvaStudioState.selectedId),isText=obj?.type==="text";
  if(empty)empty.hidden=isText;if(props)props.hidden=!isText;if(!isText)return;
  const size=$("#canvaFontSize"),sizeValue=$("#canvaFontSizeValue"),color=$("#canvaTextColor"),family=$("#canvaFontFamily"),bold=$("#canvaBold"),italic=$("#canvaItalic");
  if(size){size.value=String(clamp(Number(obj.fontSize||32),12,72));if(sizeValue)sizeValue.textContent=size.value+"px"}if(color)color.value=obj.color||"#fff";if(family)family.value=obj.fontFamily||"Inter";
  bold?.classList.toggle("active",!!obj.bold);italic?.classList.toggle("active",!!obj.italic);$("#canvaProperties .canva-align-btn").forEach(b=>b.classList.toggle("active",b.dataset.canvaAlign===(obj.align||"left")));
}
function canvaBindTextControls(){
  const size=$("#canvaFontSize"),sizeValue=$("#canvaFontSizeValue"),color=$("#canvaTextColor"),family=$("#canvaFontFamily"),bold=$("#canvaBold"),italic=$("#canvaItalic"),selectedText=()=>canvaStudioState.objects.find(o=>o.id===canvaStudioState.selectedId&&o.type==="text");
  size?.addEventListener("input",()=>{const o=selectedText();if(!o)return;o.fontSize=clamp(Number(size.value),12,72);if(sizeValue)sizeValue.textContent=size.value+"px";canvaSaveCurrent();canvaRequestRender()});
  color?.addEventListener("input",()=>{const o=selectedText();if(!o)return;o.color=color.value;canvaSaveCurrent();canvaRequestRender()});
  family?.addEventListener("change",()=>{const o=selectedText();if(!o)return;o.fontFamily=family.value;canvaSaveCurrent();canvaRequestRender()});
  bold?.addEventListener("click",()=>{const o=selectedText();if(!o)return;o.bold=!o.bold;canvaUpdateProperties();canvaSaveCurrent();canvaRequestRender()});
  italic?.addEventListener("click",()=>{const o=selectedText();if(!o)return;o.italic=!o.italic;canvaUpdateProperties();canvaSaveCurrent();canvaRequestRender()});
  $("#canvaProperties .canva-align-btn").forEach(b=>b.addEventListener("click",()=>{const o=selectedText();if(!o)return;o.align=b.dataset.canvaAlign;canvaUpdateProperties();canvaSaveCurrent();canvaRequestRender()}));
}
function canvaTemplateCard(t,compact=false){
  const bg=t.background?.type==="solid"?t.background.color:"linear-gradient(135deg,"+(t.background?.from||"#1dff91")+","+(t.background?.to||"#7d5aff")+")";
  return '<button type="button" class="'+(compact?"canva-quick-template":"canva-template-card")+'" data-canva-template="'+esc(t.id)+'"><span class="canva-template-thumb" style="--template-bg:'+esc(bg)+'"></span><strong>'+esc(t.name)+'</strong><small>'+esc(t.format)+'</small></button>';
}
function canvaRenderTemplates(){
  const quick=$("#canvaQuickTemplateTrack"),strip=$("#canvaTemplateStrip"),grid=$("#canvaTemplateGrid"),quickTemplates=CANVA_TEMPLATES.slice(0,4);
  if(quick)quick.innerHTML=quickTemplates.map(t=>canvaTemplateCard(t,true)).join("");if(strip)strip.innerHTML=CANVA_TEMPLATES.map(t=>canvaTemplateCard(t,false)).join("");if(grid)grid.innerHTML=CANVA_TEMPLATES.map(t=>canvaTemplateCard(t,false)).join("");
  document.querySelectorAll("[data-canva-template]").forEach(b=>b.addEventListener("click",()=>canvaApplyTemplate(b.dataset.canvaTemplate)));
}
function canvaApplyTemplate(id){
  const template=CANVA_TEMPLATES.find(t=>t.id===id);if(!template)return;canvaStudioState.background=canvaClone(template.background);canvaStudioState.objects=canvaClone(template.objects).map(o=>({...o,id:canvaNewId("layer")}));
  canvaStudioState.selectedId=null;canvaSaveCurrent();canvaUpdateProperties();canvaRenderLayers();canvaStatus("Template loaded");canvaRequestRender();
}
async function openCanvaDraftDb(){
  return new Promise((resolve,reject)=>{const req=indexedDB.open(CANVA_DRAFT_DB,1);req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(CANVA_DRAFT_STORE))db.createObjectStore(CANVA_DRAFT_STORE,{keyPath:"id"})};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||new Error("Draft storage unavailable."))});
}
async function canvaSaveDraft(){
  try{
    const db=await openCanvaDraftDb(),payload={id:"latest",savedAt:Date.now(),version:CANVA_STUDIO_VERSION,background:canvaClone(canvaStudioState.background),objects:canvaClone(canvaStudioState.objects)};
    await new Promise((resolve,reject)=>{const tx=db.transaction(CANVA_DRAFT_STORE,"readwrite"),req=tx.objectStore(CANVA_DRAFT_STORE).put(payload);req.onsuccess=resolve;req.onerror=()=>reject(req.error||new Error("Draft save failed."))});
    db.close();canvaStatus("Draft saved to IndexedDB");showHomeToast("Draft saved locally.");
  }catch(_){canvaStatus("Draft storage unavailable");showHomeToast("Could not save the draft.")}
}
function canvaDownloadPng(){
  try{canvaRender();const url=canvaStudioState.canvas.toDataURL("image/png"),a=document.createElement("a");a.href=url;a.download="tubal-hub-design-"+Date.now()+".png";document.body.appendChild(a);a.click();a.remove();canvaStatus("PNG exported");showHomeToast("PNG exported.")}catch(_){canvaStatus("PNG export failed");showHomeToast("PNG export failed.")}
}
function canvaShareToFeeds(){
  try{
    canvaRender();const image=canvaStudioState.canvas.toDataURL("image/png"),current=auth.currentUser,posts=safeJson("tubalhub_feeds",[]);
    if(!Array.isArray(posts))throw new Error("Feed storage unavailable");const author=current?.displayName||current?.email?.split("@")[0]||"You",avatar=typeof storageAvatar==="function"?storageAvatar():"";
    posts.unshift({id:"studio-"+Date.now().toString(36),author,avatar,text:"Shared from TUBAL HUB Design Studio",title:"Design Studio export",image,createdAt:Date.now(),likes:0,comments:0,source:"canva-studio"});
    localStorage.setItem("tubalhub_feeds",JSON.stringify(posts.slice(0,30)));renderFeeds();showHomeToast("Design shared to your local Feeds.");canvaStatus("Shared to local Feeds");
  }catch(e){console.warn("[Design Studio] feed share failed",e);canvaStatus("Feed storage unavailable");showHomeToast("Could not save the design to local Feeds.")}
}
function canvaToolBurst(button){if(!button)return;button.classList.remove("burst");void button.offsetWidth;button.classList.add("burst");setTimeout(()=>button.classList.remove("burst"),620)}
function canvaSetTool(tool){
  canvaStudioState.activeTool=canvaStudioState.activeTool===tool?"":tool;$("#canvaToolbar .canva-tool").forEach(b=>b.classList.toggle("active",b.dataset.canvaTool===canvaStudioState.activeTool));
  $("#canvaCanvasShell")?.classList.toggle("is-drawing",canvaStudioState.activeTool==="draw");if(canvaStudioState.canvas)canvaStudioState.canvas.style.cursor=canvaStudioState.activeTool==="draw"?"crosshair":"default";
}
function canvaQuickTemplateScroll(direction){$("#canvaQuickTemplateTrack")?.scrollBy({left:direction*128,behavior:"smooth"})}
function canvaBindStudio(){
  const canvas=canvaStudioState.canvas;
  canvas.addEventListener("pointerdown",handleMouseDown);canvas.addEventListener("pointermove",handleMouseMove);canvas.addEventListener("pointerup",handleMouseUp);canvas.addEventListener("pointercancel",handleMouseUp);
  canvas.addEventListener("dblclick",e=>{const p=canvaPointerPosition(e),o=canvaObjectAt(p.x,p.y);if(o?.type==="text")canvaSelect(o.id)});
  canvas.addEventListener("dragover",e=>{e.preventDefault();canvas.classList.add("canva-drop-active")});canvas.addEventListener("dragleave",()=>canvas.classList.remove("canva-drop-active"));
  canvas.addEventListener("drop",e=>{e.preventDefault();canvas.classList.remove("canva-drop-active");const file=[...(e.dataTransfer?.files||[])].find(f=>f.type.startsWith("image/"));if(file)uploadImage(file)});
  $("#canvaToolbar .canva-tool").forEach(b=>b.addEventListener("click",()=>{canvaToolBurst(b);const tool=b.dataset.canvaTool;if(tool==="text"){canvaSetTool("");addText()}else if(tool==="image"){canvaSetTool("");$("#canvaImageInput")?.click()}else if(tool==="emoji"){canvaSetTool("");addEmoji("🌿")}else if(tool==="shape"){canvaSetTool("");addShape("rect")}else if(tool==="background")$("#canvaBgPicker")?.click();else if(tool==="draw")canvaSetTool("draw")}));
  $("#canvaImageInput")?.addEventListener("change",e=>{const file=e.target.files?.[0];if(file)uploadImage(file);e.target.value=""});$("#canvaBgPicker")?.addEventListener("input",e=>changeBackground(e.target.value));
  $("#canvaDownloadPng")?.addEventListener("click",canvaDownloadPng);$("#canvaShareFeeds")?.addEventListener("click",canvaShareToFeeds);$("#canvaSaveDraft")?.addEventListener("click",canvaSaveDraft);
  $("#canvaQuickPrev")?.addEventListener("click",()=>canvaQuickTemplateScroll(-1));$("#canvaQuickNext")?.addEventListener("click",()=>canvaQuickTemplateScroll(1));
  $("#canvaTemplateViewAll")?.addEventListener("click",()=>{const all=$("#canvaTemplateAll"),button=$("#canvaTemplateViewAll");if(!all)return;all.hidden=!all.hidden;button.textContent=all.hidden?"View All":"Hide"});
  canvaBindTextControls();
}
function initCanvaStudio(){
  const canvas=$("#designCanvas");if(!canvas)return;canvaStudioState.canvas=canvas;canvaStudioState.ctx=canvas.getContext("2d",{alpha:true,desynchronized:true});if(!canvaStudioState.ctx)return;
  canvaLoadCurrent();canvaRenderTemplates();canvaRenderLayers();canvaUpdateProperties();canvaBindStudio();canvaRequestRender();
  document.addEventListener("keydown",e=>{
    if((e.key==="Delete"||e.key==="Backspace")&&canvaStudioState.selectedId&&!/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName||"")){e.preventDefault();canvaDeleteSelected()}
    if(e.key==="Escape"&&canvaStudioState.activeTool==="draw")canvaSetTool("");
  });
}


/* =========================================================
   REAL BENTO HOMEPAGE DATA — no slider dependency
   ========================================================= */
async function bentoReadMusicDb(name){
  return new Promise(resolve=>{
    try{
      const req=indexedDB.open(name);
      req.onsuccess=()=>{
        const database=req.result;
        const stores=[MUSIC_STORE,"tracks"].filter((n,i,a)=>a.indexOf(n)===i&&database.objectStoreNames.contains(n));
        if(!stores.length){database.close();resolve([]);return}
        const get=database.transaction(stores[0],"readonly").objectStore(stores[0]).getAll();
        get.onsuccess=()=>{const rows=Array.isArray(get.result)?get.result:[];database.close();resolve(rows)};
        get.onerror=()=>{database.close();resolve([])};
      };
      req.onerror=()=>resolve([]);
    }catch(_){resolve([])}
  });
}
async function bentoMusicRows(){
  let rows=await bentoReadMusicDb("tubalhub_music_real");
  if(!rows.length)rows=await dbAll().catch(()=>[]);
  return rows.sort((a,b)=>Number(b.createdAt||0)-Number(a.createdAt||0));
}
async function bentoOnlineCount(){
  try{
    const snap=await getDocs(query(collection(db,"presence"),limit(500))),online=new Set();
    snap.forEach(s=>{const x=s.data();if(x?.online===true)online.add(s.id||x.uid)});
    return online.size;
  }catch(_){return null}
}
function bentoJournalItems(){
  return readFirstArray(JOURNAL_KEYS).map((e,i)=>({
    id:e.id||String(i),text:String(e.text||e.content||e.body||"").trim(),
    mood:String(e.mood||e.emoji||"📝").trim(),createdAt:e.createdAt||e.date||e.updatedAt||0
  })).filter(e=>e.text).slice(0,3);
}
function bentoRenderJournal(){
  const box=$("#bentoJournalList");if(!box)return;
  const rows=bentoJournalItems();
  if(!rows.length){box.innerHTML='<div class="bento-empty">Wala pang saved journal entry. Real entries from Payapang Isip will appear here.</div>';return}
  box.innerHTML=rows.map(e=>'<a class="bento-journal-item" href="pages/payapang-isip.html"><span class="bento-journal-mood">'+esc(e.mood||"📝")+'</span><span class="bento-item-copy"><strong>Saved entry</strong><p>'+esc(e.text)+'</p></span><span class="bento-item-date">'+esc(formatDate(e.createdAt))+'</span></a>').join("");
}
function bentoMusicCover(track){
  const seed=String(track?.id||track?.title||"music"),hash=[...seed].reduce((n,ch)=>n+ch.charCodeAt(0),0),h1=hash%360,h2=(h1+86)%360;
  return "linear-gradient(135deg,hsl("+h1+" 75% 55%),hsl("+h2+" 65% 42%))";
}
function bentoRenderMusic(rows){
  const box=$("#bentoMusicList");if(!box)return;
  if(!rows.length){box.innerHTML='<div class="bento-empty">Wala pang saved audio sa browser. Gumawa muna ng track sa AI Music.</div>';return}
  box.innerHTML=rows.slice(0,3).map(t=>'<div class="bento-music-item" data-bento-music-id="'+esc(t.id)+'"><div class="bento-music-cover" style="background:'+esc(bentoMusicCover(t))+'"><span>🎵</span></div><button class="bento-music-play" data-bento-play="'+esc(t.id)+'" type="button" aria-label="Play '+esc(t.title||"saved track")+'">▶</button><div class="bento-item-copy"><strong>'+esc(t.title||"Saved track")+'</strong><p>'+esc(t.genre||t.prompt||"AI Music")+'</p></div><div class="bento-music-wave"><i></i><i></i><i></i></div></div>').join("");
  box.querySelectorAll("[data-bento-play]").forEach(b=>b.addEventListener("click",()=>playMusic(b.dataset.bentoPlay)));
}
function bentoRenderFeeds(rows){
  const box=$("#bentoFeedsList");if(!box)return;
  if(!rows.length){box.innerHTML='<div class="bento-empty">Wala pang published posts. Real Feeds content will appear here.</div>';return}
  box.innerHTML=rows.slice(0,4).map(p=>{
    const avatar=p.avatar||"",image=p.image||"";
    return '<article class="bento-feed-card"><div class="bento-feed-head"><span class="bento-feed-avatar">'+(avatar?'<img src="'+esc(avatar)+'" alt="" loading="lazy">':esc((p.author||"M").trim().charAt(0).toUpperCase()))+'</span><div class="bento-feed-author"><strong>'+esc(p.author||"Member")+'</strong><small>'+esc(formatDate(p.createdAt))+'</small></div></div><p class="bento-feed-text">'+esc(p.text||"")+'</p>'+(image?'<img class="bento-feed-image" src="'+esc(image)+'" alt="" loading="lazy">':'<div class="bento-feed-image-placeholder">📱</div>')+'<div class="bento-feed-foot"><span class="bento-like-value">'+Number(p.likes||0)+' likes</span><a class="bento-viewall" href="pages/feeds.html">Open →</a></div></article>';
  }).join("");
}
function bentoRenderGames(){
  const box=$("#bentoGamesGrid");if(!box)return;
  const rows=featuredGames.slice(0,4);
  if(!rows.length){box.innerHTML='<div class="bento-empty">No real games are available from the CTRLZONE catalog.</div>';return}
  box.innerHTML=rows.map(g=>{
    const stats=gameStats(g),players=stats.players===null?"No saved stats":String(stats.players)+" players";
    return '<article class="bento-game-card" style="--game-a:'+esc(g.colorA||"#07100b")+';--game-b:'+esc(g.colorB||"#173b2a")+'"><div class="bento-game-cover"><span class="bento-game-emoji">'+esc(g.emoji)+'</span><span class="bento-game-local">LOCAL DATA</span></div><div class="bento-game-body"><div class="bento-game-title">'+esc(g.title)+'</div><div class="bento-game-meta"><span>'+esc(players)+'</span><a class="bento-play-btn" href="'+esc(g.officialUrl)+'" target="_blank" rel="noopener">Play Now</a></div></div></article>';
  }).join("");
  if(!window.matchMedia?.("(hover:none),(pointer:coarse)").matches){
    box.querySelectorAll(".bento-game-card").forEach(card=>{
      card.addEventListener("pointermove",e=>{const r=card.getBoundingClientRect(),px=(e.clientX-r.left)/r.width,py=(e.clientY-r.top)/r.height;card.style.setProperty("--rx",clamp((.5-py)*10,-10,10)+"deg");card.style.setProperty("--ry",clamp((px-.5)*10,-10,10)+"deg")},{passive:true});
      card.addEventListener("pointerleave",()=>{card.style.setProperty("--rx","0deg");card.style.setProperty("--ry","0deg")});
    });
  }
}
async function renderRealData(){
  bentoRenderJournal();
  const [music,online]=await Promise.all([bentoMusicRows(),bentoOnlineCount()]);
  bentoRenderMusic(music);
  if($("#bentoOnlineUsers"))$("#bentoOnlineUsers").textContent=online===null?"—":String(online);
  let posts=parseStoredPosts();
  if(!posts.length)posts=await firestorePosts();
  bentoRenderFeeds(posts);
  await loadFeaturedGames();
  bentoRenderGames();
  const stats=$("#bentoHeroStats"),journalCount=bentoJournalItems().length;
  if(stats)stats.innerHTML='<div class="bento-hero-stat"><small>Journal</small><strong>'+journalCount+'</strong></div><div class="bento-hero-stat"><small>Audio Tracks</small><strong>'+music.length+'</strong></div><div class="bento-hero-stat"><small>Design</small><strong>'+(localStorage.getItem(CANVA_DESIGN_KEY)?"Saved":"New")+'</strong></div>';
}
function initBento(){
  renderRealData().catch(e=>console.warn("[TUBAL HUB Bento]",e));
  window.addEventListener("storage",e=>{
    if(JOURNAL_KEYS.includes(e.key)||FEED_KEYS.includes(e.key)||e.key==="tubalhub_canva_current"||e.key==="tubalhub_ctrlzone_game_stats")renderRealData();
  });
}

function init(){
  initSpotlight();
  initBento();
  initCanvaStudio();
  initFooter();
  initFooterNewsletter();
  initFooterSmoothLinks();
  initScrollReveal();
  $("#homeMusicAudio")?.addEventListener("ended",()=>{
    document.querySelectorAll(".music-real-card.is-playing,.bento-music-item.is-playing").forEach(card=>card.classList.remove("is-playing"));
    showHomeToast("Audio finished.");
  });
  addEventListener("beforeunload",cleanup);
  addEventListener("storage",event=>{
    if(JOURNAL_KEYS.includes(event.key))renderJournal();
    if(event.key==="tubalhub_home_feed_likes"||FEED_KEYS.includes(event.key))renderFeeds();
    if(event.key==="ctrlzone_kills"||event.key==="ctrlzone_wins"||event.key==="ctrlzone_rank")renderGameScores();
    if(event.key===GAME_STATS_KEY||event.key===GAMES_KEY)loadFeaturedGames();
  });
}

let homeStarted=false;
let lastHomeMobile=window.innerWidth<=768;
let resizeTimer=0;

function handleHomeBreakpoint(){
  const nowMobile=window.innerWidth<=768;
  if(nowMobile===lastHomeMobile)return;
  lastHomeMobile=nowMobile;
  renderJournal();
  loadMusic();
  renderFeeds();
  loadFeaturedGames();
  requestAnimationFrame(renderAllSliderDots);
}

addEventListener("resize",()=>{
  clearTimeout(resizeTimer);
  resizeTimer=setTimeout(handleHomeBreakpoint,140);
},{passive:true});

function startHome(){
  if(homeStarted)return;
  homeStarted=true;
  onAuthStateChanged(auth,user=>{
    const nameEl=$("#homeAuthName");
    if(nameEl)nameEl.textContent=user?(user.displayName||user.email?.split("@")[0]||"Member"):"";
  });
  document.addEventListener("click",e=>{
    const play=e.target.closest?.("[data-feature-play]");
    if(play)playFeaturedGame(play.dataset.featurePlay,play);
  });
  init();
}

if(document.readyState==="loading"){
  document.addEventListener("DOMContentLoaded",startHome,{once:true});
}else{
  startHome();
}
