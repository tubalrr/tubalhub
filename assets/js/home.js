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

function initSpotlight(){
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

export function createSlider(trackId,prevId,nextId,dotsId){
  const track=$("#"+trackId);if(!track)return null;
  const prev=$("#"+prevId),next=$("#"+nextId),dots=$("#"+dotsId);
  const slides=$$(".hero-slide",track);
  const horizontal=track.dataset.horizontal==="true";
  let index=0,startX=0,deltaX=0,dragging=false,autoTimer=null;
  const renderDots=()=>{
    if(!dots)return;
    dots.innerHTML=slides.map((_,i)=>'<button class="hero-dot '+(i===index?"active":"")+'" type="button" aria-label="Go to slide '+(i+1)+'"></button>').join("");
    $$(".hero-dot",dots).forEach((dot,i)=>dot.addEventListener("click",()=>go(i,true)));
  };
  const render=()=>{
    if(horizontal){
      const card=track.firstElementChild;if(card)track.scrollTo({left:index*card.getBoundingClientRect().width+(index*16),behavior:"smooth"});
    }else{
      track.style.transform="translate3d("+(-index*100)+"%,0,0)";
    }
    $$(".hero-dot",dots).forEach((dot,i)=>dot.classList.toggle("active",i===index));
  };
  const go=nextIndex=>{
    index=(nextIndex+slides.length)%slides.length;
    render();
  };
  const startAuto=()=>{
    clearInterval(autoTimer);autoTimer=setInterval(()=>go(index+1),horizontal?4000:5000);
  };
  const stopAuto=()=>clearInterval(autoTimer);
  prev?.addEventListener("click",()=>{go(index-1);startAuto()});
  next?.addEventListener("click",()=>{go(index+1);startAuto()});
  renderDots();render();
  track.addEventListener("pointerdown",e=>{
    dragging=true;startX=e.clientX;deltaX=0;track.classList.add("is-dragging");track.setPointerCapture?.(e.pointerId);
  });
  track.addEventListener("pointermove",e=>{if(dragging)deltaX=e.clientX-startX});
  const end=()=>{
    if(!dragging)return;dragging=false;track.classList.remove("is-dragging");
    if(Math.abs(deltaX)>=50)go(index+(deltaX<0?1:-1));else render();
    deltaX=0;startAuto();
  };
  track.addEventListener("pointerup",end);track.addEventListener("pointercancel",end);
  track.addEventListener("mouseenter",stopAuto);track.addEventListener("mouseleave",startAuto);
  track.addEventListener("touchstart",()=>{stopAuto()},{passive:true});
  track.addEventListener("touchend",()=>{startAuto()},{passive:true});
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
    mood:entry.mood||entry.emoji||"",
    createdAt:entry.createdAt||entry.date||entry.updatedAt||0
  })).filter(entry=>entry.text).slice(0,10);
}

function renderJournal(){
  const track=$("#journalTrack");if(!track)return;
  const entries=journalEntries();
  if(!entries.length){
    track.innerHTML='<div class="empty-card home-glass"><div><span class="home-emoji" aria-hidden="true">🌿</span><strong>Wala ka pang journal entry.</strong><span>Mag-save muna ng real entry sa Payapang Isip.</span></div></div>';
    return;
  }
  track.innerHTML=entries.map(e=>'<article class="journal-card data-track-card home-glass"><div class="journal-card-top"><span class="journal-mood home-emoji">'+esc(e.mood||"📝")+'</span><span class="journal-date">'+esc(formatDate(e.createdAt))+'</span></div><h3>Real journal entry</h3><p>'+esc(e.text.slice(0,260))+(e.text.length>260?"…":"")+'</p></article>').join("");
}

let musicTracks=[];
async function loadMusic(){
  try{musicTracks=await dbAll()}catch(_){musicTracks=[]}
  const track=$("#musicTrack");if(!track)return;
  if(!musicTracks.length){
    track.innerHTML='<div class="empty-card home-glass"><div><span class="home-emoji" aria-hidden="true">🎵</span><strong>Wala ka pang generated music.</strong><span>Generate a real track sa AI Music Studio.</span></div></div>';
    return;
  }
  const likes=musicLikes(),plays=musicPlays();
  track.innerHTML=musicTracks.slice(0,10).map(t=>'<article class="ai-card data-track-card home-glass" data-music-id="'+esc(t.id)+'"><div class="ai-cover"><span class="home-emoji" aria-hidden="true">🎵</span></div><div class="ai-mini-wave" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="ai-card-body"><h3>'+esc(t.title||"Untitled track")+'</h3><small>'+esc(t.genre||"AI Music")+' · '+Number(plays[t.id]||0)+' plays</small><div class="ai-card-actions"><button class="ai-play" type="button" data-play-music="'+esc(t.id)+'">▶</button><span class="ai-meta">'+(likes[t.id]===true?"Liked":"Real audio")+'</span></div></div></article>').join("");
  $$("#musicTrack [data-play-music]").forEach(button=>button.addEventListener("click",()=>playMusic(button.dataset.playMusic)));
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
    track.innerHTML='<div class="empty-card home-glass"><div><span class="home-emoji" aria-hidden="true">📱</span><strong>Wala pang real posts sa Feeds.</strong><span>Kapag may published content, lalabas dito.</span></div></div>';
    return;
  }
  track.innerHTML=posts.slice(0,10).map(p=>'<article class="feed-card data-track-card home-glass" data-feed-id="'+esc(p.id)+'"><div class="feed-head"><div class="feed-avatar">'+(p.avatar?'<img src="'+esc(p.avatar)+'" alt="" loading="lazy">':esc((p.author||"M").trim().charAt(0).toUpperCase()))+'</div><div class="feed-author"><strong>'+esc(p.author)+'</strong><small>'+esc(formatDate(p.createdAt))+'</small></div></div><p>'+esc((p.text||"").slice(0,220))+(String(p.text||"").length>220?"…":"")+'</p><div class="feed-stats"><span>'+p.likes+' likes</span><span>'+p.comments+' comments</span><button type="button" class="like-btn" data-feed-like="'+esc(p.id)+'">Like</button></div></article>').join("");
  $$("#feedTrack [data-feed-like]").forEach(button=>button.addEventListener("click",()=>toggleFeedLike(button)));
}
function toggleFeedLike(button){
  const id=button.dataset.feedLike;
  const key="tubalhub_home_feed_likes",likes=safeJson(key,{});
  const next=!Boolean(likes[id]);likes[id]=next;localStorage.setItem(key,JSON.stringify(likes));
  button.classList.toggle("liked",next);button.classList.remove("bursting");void button.offsetWidth;button.classList.add("bursting");
  showHomeToast(next?"Liked this post.":"Like removed.");
}
function showHomeToast(message){
  const toast=$("#homeToast");if(!toast)return;
  toast.textContent=message;toast.classList.add("open");clearTimeout(showHomeToast.timer);
  showHomeToast.timer=setTimeout(()=>toast.classList.remove("open"),2000);
}
async function initFooter(){
  try{
    const r=await fetch("version.json?t="+Date.now(),{cache:"no-store"});if(!r.ok)throw new Error();
    const data=await r.json();$("#homeVersion").textContent="v"+(data.version||"—");
  }catch(_){$("#homeVersion").textContent="Version unavailable"}
  const update=()=>{$("#homeOnlineDot")?.classList.toggle("offline",!navigator.onLine)};
  update();addEventListener("online",update);addEventListener("offline",update);
  try{
    const bytes=[...Array(localStorage.length)].reduce((sum,_,i)=>{const k=localStorage.key(i)||"",v=localStorage.getItem(k)||"";return sum+(k.length+v.length)*2},0);
    const storage=$("#homeStorage");if(storage)storage.textContent=(bytes/1024).toFixed(1)+" KB local data";
  }catch(_){}
}
function bindSectionSliderButtons(id,step){
  const track=$("#"+id);if(!track)return;
  const move=direction=>{
    const first=track.querySelector(".data-track-card");if(!first)return;
    const width=first.getBoundingClientRect().width+16;track.scrollBy({left:direction*width*step,behavior:"smooth"});
  };
  $("#"+id+"Prev")?.addEventListener("click",()=>move(-1));$("#"+id+"Next")?.addEventListener("click",()=>move(1));
}
function initHorizontalSections(){
  bindSectionSliderButtons("journalTrack",1);
  bindSectionSliderButtons("musicTrack",2);
  bindSectionSliderButtons("feedTrack",1);
}
function cleanup(){
  if(state.heroTimer)clearInterval(state.heroTimer);
  if(state.musicUrl)URL.revokeObjectURL(state.musicUrl);
  cancelAnimationFrame(state.visualFrame);
  try{state.audioContext?.close()}catch(_){}
}
function init(){
  initSpotlight();initHeroSlider();renderJournal();loadMusic();renderFeeds();initHorizontalSections();initFooter();
  $("#homeMusicAudio")?.addEventListener("ended",()=>showHomeToast("Audio finished."));
  addEventListener("beforeunload",cleanup);
}
onAuthStateChanged(auth,user=>{
  const nameEl=$("#homeAuthName");
  if(nameEl)nameEl.textContent=user?(user.displayName||user.email?.split("@")[0]||"Member"):"";
});
init();
