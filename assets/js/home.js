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
const isMobileHome=()=>window.innerWidth<768;
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
  })).filter(entry=>entry.text).slice(0,10);
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
  track.innerHTML=musicTracks.slice(0,10).map(t=>'<article class="real-data-card music-real-card data-track-card" data-music-id="'+esc(t.id)+'"><div class="music-real-cover"><span class="music-real-emoji home-emoji" aria-hidden="true">🎵</span><button class="music-real-play" type="button" data-play-music="'+esc(t.id)+'" aria-label="Play '+esc(t.title||"saved track")+'">▶</button></div><div class="music-mini-wave"><i></i><i></i><i></i></div><div class="music-real-meta"><h3 class="music-real-title">'+esc(t.title||"Saved track")+'</h3><p class="music-real-sub">'+esc(t.genre||"AI Music")+" · "+Number(plays[t.id]||0)+" plays</p></div></article>').join("");
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
    document.querySelectorAll(".music-real-card.is-playing").forEach(card=>card.classList.remove("is-playing"));
    document.querySelector('.music-real-card[data-music-id="'+CSS.escape(String(id))+'"]')?.classList.add("is-playing");
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

function storageAvatar(){
  try{return localStorage.getItem("tubalhub_avatar")||""}catch(_){return ""}
}

function parseStoredPosts(){
  return readFirstArray(FEED_KEYS).map((post,index)=>({
    id:post.id||String(index),author:post.author||post.authorName||post.userName||"Member",
    avatar:post.avatar||post.authorPhotoURL||post.photoURL||"",text:String(post.text||post.content||post.message||"").trim(),
    likes:Number(post.likes||0),comments:Number(post.comments||0),createdAt:post.createdAt||post.date||0
  })).filter(post=>post.text||post.title);
}
async function firestorePosts(){
  try{
    const snap=await getDocs(query(collection(db,"hubPosts"),orderBy("createdAt","desc"),limit(10)));
    return snap.docs.map(d=>{const x=d.data();return{id:d.id,author:x.authorName||"Member",avatar:x.authorPhotoURL||"",text:String(x.text||x.title||"").trim(),likes:Number(x.likes||0),comments:Number(x.comments||0),createdAt:x.createdAt?.toMillis?.()||x.createdAt?.seconds*1000||0}}).filter(x=>x.text);
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
    return '<article class="real-data-card feed-update-card data-track-card" data-feed-id="'+esc(p.id)+'" data-base-likes="'+base+'"><div class="feed-update-head"><div class="feed-update-avatar">'+(avatar?'<img class="feed-avatar-img" src="'+esc(avatar)+'" alt="" loading="lazy">':esc((p.author||"M").trim().charAt(0).toUpperCase()))+'</div><div class="feed-update-author"><strong>'+esc(p.author)+'</strong><small>'+esc(formatDate(p.createdAt))+'</small></div></div><p class="feed-update-text">'+esc((p.text||"").slice(0,220))+(String(p.text||"").length>220?"…":"")+'</p><div class="feed-update-art">'+(avatar?'<img class="feed-real-image" src="'+esc(avatar)+'" alt="" loading="lazy">':'<span class="home-emoji" aria-hidden="true">📱</span>')+'</div><div class="feed-update-stats"><span data-home-like-count="'+esc(p.id)+'">'+(base+(liked?1:0))+' likes</span><span>'+Number(p.comments||0)+' comments</span><button type="button" class="like-btn '+(liked?"liked":"")+'" data-feed-like="'+esc(p.id)+'">'+(liked?"Liked":"Like")+'</button></div></article>';
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
  document.querySelectorAll('.home-premium-footer a[href^="#"]').forEach(link=>{
    link.addEventListener("click",event=>{
      const id=link.getAttribute("href"),target=id&&document.querySelector(id);
      if(!target)return;
      event.preventDefault();
      target.scrollIntoView({behavior:"smooth",block:"start"});
      history.replaceState(null,"",id);
    });
  });
}
async function initFooter(){
  try{
    const r=await fetch("version.json?t="+Date.now(),{cache:"no-store"});if(!r.ok)throw new Error();
    const data=await r.json();$("#homeVersion").textContent="v"+(data.version||"—");
  }catch(_){$("#homeVersion").textContent="Version unavailable"}
  const update=()=>{$("#homeOnlineDot")?.classList.toggle("offline",!navigator.onLine)};
  update();
  const textEl=$("#homeOnlineText");
  if(textEl)textEl.textContent=navigator.onLine?"Online":"Offline";
  addEventListener("online",()=>{update();if(textEl)textEl.textContent="Online"});
  addEventListener("offline",()=>{update();if(textEl)textEl.textContent="Offline"});
  try{
    const bytes=[...Array(localStorage.length)].reduce((sum,_,i)=>{const k=localStorage.key(i)||"",v=localStorage.getItem(k)||"";return sum+(k.length+v.length)*2},0);
    const storage=$("#homeStorage");if(storage)storage.textContent=(bytes/1024).toFixed(1)+" KB local data";
  }catch(_){}
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
function init(){
  initSpotlight();
  initHeroSlider();
  renderGameScores();
  renderJournal();
  loadMusic();
  renderFeeds();
  initHorizontalSections();
  renderAllSliderDots();
  loadFeaturedGames();
  initFooter();
  initFooterNewsletter();
  initFooterSmoothLinks();
  initScrollReveal();
  $("#homeMusicAudio")?.addEventListener("ended",()=>{
    document.querySelectorAll(".music-real-card.is-playing").forEach(card=>card.classList.remove("is-playing"));
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
let lastHomeMobile=window.innerWidth<768;
let resizeTimer=0;

function handleHomeBreakpoint(){
  const nowMobile=window.innerWidth<768;
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
