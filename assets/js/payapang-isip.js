import { app } from "./firebase-config.js";

const MOODS=[
  {emoji:"😊",label:"Happy",value:5},
  {emoji:"😐",label:"Okay",value:3},
  {emoji:"😔",label:"Sad",value:2},
  {emoji:"😤",label:"Frustrated",value:2},
  {emoji:"😴",label:"Tired",value:2},
  {emoji:"🥹",label:"Tender",value:4}
];
const TIPS=[
  {icon:"🌿",title:"Step outside",text:"A few quiet minutes with fresh air can create space between thoughts.",link:"Take a pause"},
  {icon:"🧘",title:"Unclench the day",text:"Drop your shoulders, soften your jaw, and give yourself one slow breath.",link:"Try breathing"},
  {icon:"💤",title:"Protect your rest",text:"A calmer evening routine can make winding down easier.",link:"Open rest tips"},
  {icon:"📖",title:"Write it down",text:"Put one honest thought on the page without judging it.",link:"Open journal"},
  {icon:"🤝",title:"Stay connected",text:"A trusted person can make a hard day feel a little lighter.",link:"Find support"}
];
const TRACKS=[
  {title:"5 min Calm Breathing",seconds:300,type:"soft"},
  {title:"3 min Quiet Reset",seconds:180,type:"reset"},
  {title:"7 min Evening Wind-down",seconds:420,type:"wind"}
];

const $=s=>document.querySelector(s);
const $$=s=>document.querySelectorAll(s);
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const fmtTime=iso=>new Date(iso).toLocaleString("en-PH",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"});
const moodByValue=v=>MOODS.find(m=>m.label===v)||null;

const state={
  mood:null,
  entries:[],
  breathing:{running:false,phase:"Ready",count:0,timer:null},
  grounding:["","","","",""],
  trackIndex:0,
  playing:false,
  audio:null,
  audioGain:null,
  startedAt:0,
  elapsed:0,
  playerTimer:null,
  chat:[
    {who:"Mina",text:"Take your time. You do not have to figure everything out at once.",me:false,online:true},
    {who:"You",text:"Thanks. I’m taking a quiet minute.",me:true,online:true},
    {who:"Lio",text:"That sounds like a good place to start. One small step is enough.",me:false,online:false}
  ],
  chatBusy:false
};

const els={
  moodGrid:$("#moodGrid"),streak:$("#moodStreak"),chart:$("#moodChart"),journal:$("#journalEntries"),journalInput:$("#journalInput"),
  breathOrbit:$("#breathOrbit"),breathPhase:$("#breathPhase"),breathCount:$("#breathCount"),breathStart:$("#startBreathing"),exerciseStart:$("#exerciseStart"),exerciseStatus:$("#exerciseStatus"),
  grounding:$("#groundingRows"),groundingSave:$("#saveGrounding"),chatWindow:$("#supportChatWindow"),chatInput:$("#supportChatInput"),
  chatSend:$("#supportChatSend"),playerTitle:$("#playerTitle"),playerProgress:$("#playerProgress"),playerElapsed:$("#playerElapsed"),playerDuration:$("#playerDuration"),
  playerBtn:$("#playerToggle"),playerTrack:$("#playerTrack"),visualizer:$("#visualizer"),toast:$("#piToast"),particles:$("#piParticles"),tipGrid:$("#tipsGrid")
};

function burstAt(el,count=6){
  if(!el)return;
  const r=el.getBoundingClientRect();
  for(let i=0;i<count;i++){
    const p=document.createElement("i");p.className="pi-particle";p.style.left=(r.left+r.width/2)+"px";p.style.top=(r.top+r.height/2)+"px";
    const a=(Math.PI*2/count)*i,d=18+Math.random()*20;
    p.style.setProperty("--dx",Math.cos(a)*d+"px");p.style.setProperty("--dy",Math.sin(a)*d+"px");
    if(i%2)p.style.background="#1dff91";
    els.particles.appendChild(p);setTimeout(()=>p.remove(),700);
  }
}
function notify(msg){
  els.toast.textContent=msg;els.toast.classList.add("open");clearTimeout(notify.t);
  notify.t=setTimeout(()=>els.toast.classList.remove("open"),2200);
}

function loadMood(){
  try{
    const saved=JSON.parse(localStorage.getItem("payapang-mood-history")||"[]");
    return Array.isArray(saved)?saved.filter(x=>x&&x.date&&x.label):[];
  }catch(_){return []}
}
function saveMoodHistory(list){try{localStorage.setItem("payapang-mood-history",JSON.stringify(list.slice(-90)))}catch(_){}}
function streakCount(list){
  const days=new Set(list.map(x=>x.date));
  let d=new Date();let n=0;
  while(days.has(d.toISOString().slice(0,10))){n++;d.setDate(d.getDate()-1)}
  return n;
}
function renderMood(){
  els.moodGrid.innerHTML=MOODS.map(m=>'<button class="mood-btn '+(state.mood?.label===m.label?"selected":"")+'" data-mood="'+esc(m.label)+'" type="button"><span class="emoji">'+m.emoji+'</span><small>'+m.label+'</small></button>').join("");
  const history=loadMood();
  const streak=streakCount(history);
  els.streak.textContent="🔥 "+streak+" day"+(streak===1?"":"s")+" calm";
  renderChart(history);
}
function selectMood(label,btn){
  const mood=moodByValue(label);if(!mood)return;
  state.mood=mood;
  const today=new Date().toISOString().slice(0,10);
  const history=loadMood().filter(x=>x.date!==today);
  history.push({date:today,label:mood.label,emoji:mood.emoji,value:mood.value});
  saveMoodHistory(history);
  $$(".mood-btn").forEach(b=>b.classList.remove("selected"));
  btn.classList.add("selected");burstAt(btn,6);notify(mood.label+" mood saved");
  renderMood();
}
function renderChart(history){
  const days=[];const now=new Date();
  for(let i=6;i>=0;i--){const d=new Date(now);d.setDate(now.getDate()-i);days.push(d.toISOString().slice(0,10))}
  const vals=days.map(d=>history.find(x=>x.date===d)?.value??0);
  const points=vals.map((v,i)=>{const x=8+i*15.1;const y=v?58-(v/5)*42:60;return [x,y]});
  const path=points.map((p,i)=>(i?"L":"M")+p[0].toFixed(1)+" "+p[1].toFixed(1)).join(" ");
  els.chart.innerHTML='<svg viewBox="0 0 100 70" preserveAspectRatio="none"><path class="chart-path" d="'+path+'"></path>'+points.map((p,i)=>vals[i]?'<circle class="chart-dot" cx="'+p[0]+'" cy="'+p[1]+'" r="2.2"></circle>':"").join("")+'</svg>';
}

function saveJournal(){
  const text=els.journalInput.value.trim();if(!text){notify("Write something first");els.journalInput.focus();return}
  const entry={id:Date.now().toString(36)+Math.random().toString(36).slice(2,6),text,mood:state.mood?.emoji||"•",createdAt:new Date().toISOString()};
  state.entries.unshift(entry);persistEntries();els.journalInput.value="";renderEntries();burstAt(els.journal,8);notify("Journal entry saved");
}
function persistEntries(){try{localStorage.setItem("payapang-journal",JSON.stringify(state.entries))}catch(_){}}
function loadEntries(){try{const x=JSON.parse(localStorage.getItem("payapang-journal")||"[]");return Array.isArray(x)?x:[]}catch(_){return []}}
function renderEntries(){
  if(!state.entries.length){els.journal.innerHTML='<div class="journal-empty">Your saved entries will appear here.</div>';return}
  els.journal.innerHTML=state.entries.map(e=>'<article class="journal-entry" data-entry-id="'+esc(e.id)+'"><div class="journal-meta"><div><span class="journal-mood">'+esc(e.mood)+"</span></div><div class="entry-actions"><button data-edit-entry=""+esc(e.id)+"" type="button" aria-label="Edit entry">✎</button><button data-delete-entry=""+esc(e.id)+"" type="button" aria-label="Delete entry">×</button></div></div><div class="journal-time">'+esc(fmtTime(e.createdAt))+'</div><div class="journal-text">'+esc(e.text)+'</div></article>').join("");
}
function editEntry(id){
  const e=state.entries.find(x=>x.id===id);if(!e)return;
  const next=prompt("Edit your journal entry:",e.text);if(next===null)return;
  const text=next.trim();if(!text)return;
  e.text=text;e.createdAt=new Date().toISOString();persistEntries();renderEntries();notify("Entry updated");
}
function deleteEntry(id){
  state.entries=state.entries.filter(x=>x.id!==id);persistEntries();renderEntries();notify("Entry deleted");
}

function resetBreathing(){
  clearTimeout(state.breathing.timer);state.breathing.timer=null;state.breathing.running=false;state.breathing.phase="Ready";state.breathing.count=0;
  els.breathOrbit.classList.remove("is-active");els.breathPhase.textContent="Ready";els.breathCount.textContent="";
  if(els.breathStart)els.breathStart.textContent="Start Breathing";
  if(els.exerciseStart)els.exerciseStart.textContent="Start Cycle";
  if(els.exerciseStatus)els.exerciseStatus.textContent="Ready when you are.";
}
function runBreathCycle(){
  if(!state.breathing.running)return;
  const phases=[{name:"Breathe In",seconds:4},{name:"Hold",seconds:4},{name:"Breathe Out",seconds:6}];
  let phaseIndex=state.breathing.phaseIndex||0;
  const phase=phases[phaseIndex%phases.length];let left=phase.seconds;
  els.breathPhase.textContent=phase.name;els.breathCount.textContent=String(left);if(els.exerciseStatus)els.exerciseStatus.textContent=phase.name+" • "+left+"s";
  const tick=()=>{if(!state.breathing.running)return;left--;els.breathCount.textContent=left>0?String(left):"0";if(left<=0){state.breathing.phaseIndex=(phaseIndex+1)%phases.length;state.breathing.count++;runBreathCycle()}else{state.breathing.timer=setTimeout(tick,1000)}};state.breathing.timer=setTimeout(tick,1000);
}
function startBreathing(){
  if(state.breathing.running){resetBreathing();return}
  state.breathing.running=true;state.breathing.phaseIndex=0;els.breathOrbit.classList.add("is-active");els.breathStart.textContent="Stop Breathing";if(els.exerciseStart)els.exerciseStart.textContent="Stop Cycle";runBreathCycle();notify("Breathing exercise started");
}
function bindBreathingButton(){els.breathStart.addEventListener("click",()=>{burstAt(els.breathStart,6);startBreathing();if(!state.breathing.running)els.breathStart.textContent="Start Breathing"})}

function renderTips(){els.tipGrid.innerHTML=TIPS.map((t,i)=>'<article class="tip-card" style="--stagger:'+(i*.06)+'s"><div class="tip-icon">'+t.icon+'</div><h3>'+esc(t.title)+'</h3><p>'+esc(t.text)+'</p><a href="#tips" data-tip="'+i+'">'+esc(t.link)+' →</a></article>').join("")}

function initGrounding(){
  const labels=["5 things you see","4 things you feel","3 things you hear","2 things you smell","1 thing you taste"];
  els.grounding.innerHTML=labels.map((l,i)=>'<div class="grounding-row"><label>'+l+'</label><input data-grounding="'+i+'" type="text" maxlength="120"></div>').join("");
  const saved=localStorage.getItem("payapang-grounding");
  if(saved){try{JSON.parse(saved).forEach((v,i)=>{const input=els.grounding.querySelector('[data-grounding="'+i+'"]');if(input)input.value=v})}catch(_){}}
  $("[data-grounding]")?.closest("div");
}
function saveGrounding(){
  const values=[...els.grounding.querySelectorAll("input")].map(x=>x.value.trim());
  localStorage.setItem("payapang-grounding",JSON.stringify(values));burstAt(els.groundingSave,6);notify("Grounding notes saved");
}

let audioCtx=null,masterGain=null;
function ensureAudio(){
  if(audioCtx)return;
  const C=window.AudioContext||window.webkitAudioContext;if(!C)return;
  audioCtx=new C();masterGain=audioCtx.createGain();masterGain.gain.value=.035;masterGain.connect(audioCtx.destination);
}
function stopTone(){
  if(state.audio){try{state.audio.osc.stop()}catch(_){}state.audio=null}
}
function playToneTrack(){
  ensureAudio();if(!audioCtx)return;
  stopTone();
  const osc=audioCtx.createOscillator(),gain=audioCtx.createGain();
  osc.type="sine";
  const base=[196,174,220][state.trackIndex];
  osc.frequency.setValueAtTime(base,audioCtx.currentTime);
  gain.gain.setValueAtTime(0,audioCtx.currentTime);gain.gain.linearRampToValueAtTime(.14,audioCtx.currentTime+.45);
  gain.gain.linearRampToValueAtTime(0,audioCtx.currentTime+2.5);
  osc.connect(gain);gain.connect(masterGain);osc.start();
  state.audio={osc};setTimeout(()=>{if(state.playing)playToneTrack()},2600);
}
function switchTrack(index){
  state.trackIndex=(index+TRACKS.length)%TRACKS.length;const t=TRACKS[state.trackIndex];
  els.playerTitle.textContent=t.title;els.playerDuration.textContent=fmtDuration(t.seconds);state.elapsed=0;updatePlayer();
}
function fmtDuration(s){return Math.floor(s/60)+":"+String(s%60).padStart(2,"0")}
function updatePlayer(){
  const t=TRACKS[state.trackIndex];els.playerElapsed.textContent=fmtDuration(Math.min(state.elapsed,t.seconds));els.playerDuration.textContent=fmtDuration(t.seconds);
  els.playerProgress.style.width=(t.seconds?Math.min(100,(state.elapsed/t.seconds)*100):0)+"%";
}
function togglePlayer(){
  state.playing=!state.playing;
  if(state.playing){
    ensureAudio();audioCtx?.resume();playToneTrack();els.visualizer.classList.add("active");els.playerBtn.textContent="❚❚";
    state.startedAt=performance.now()-state.elapsed*1000;
    clearInterval(state.playerTimer);state.playerTimer=setInterval(()=>{
      state.elapsed=Math.floor((performance.now()-state.startedAt)/1000);
      const t=TRACKS[state.trackIndex];
      if(state.elapsed>=t.seconds){state.elapsed=0;switchTrack(state.trackIndex+1);playToneTrack()}
      updatePlayer();
    },250);
  }else{
    stopTone();els.visualizer.classList.remove("active");els.playerBtn.textContent="▶";clearInterval(state.playerTimer);
  }
}
function bindPlayer(){
  els.playerBtn.addEventListener("click",togglePlayer);
  $(".player-volume")?.addEventListener("input",e=>{if(masterGain)masterGain.gain.value=.035*Number(e.target.value)/.35});
  els.playerTrack.addEventListener("click",e=>{
    const r=els.playerTrack.getBoundingClientRect(),pct=clamp((e.clientX-r.left)/r.width,0,1);
    state.elapsed=Math.round(TRACKS[state.trackIndex].seconds*pct);updatePlayer();
    if(state.playing)state.startedAt=performance.now()-state.elapsed*1000;
  });
  els.playerTitle.addEventListener("click",()=>{switchTrack(state.trackIndex+1);notify(TRACKS[state.trackIndex].title)});
}

function renderChat(){
  els.chatWindow.innerHTML=state.chat.map(m=>'<div class="chat-bubble '+(m.me?"me":"")+'"><div class="chat-meta"><span class="chat-avatar '+(!m.online?"offline":"")+'">'+(m.me?"🌿":"●")+'</span><span>'+esc(m.who)+'</span></div>'+esc(m.text)+'</div>').join("");
  if(state.chatBusy)els.chatWindow.innerHTML+='<div class="chat-bubble"><div class="chat-meta"><span class="chat-avatar">●</span><span>Support</span></div><span class="typing-dots"><i></i><i></i><i></i></span></div>';
  els.chatWindow.scrollTop=els.chatWindow.scrollHeight;
}
function sendChat(){
  const text=els.chatInput.value.trim();if(!text)return;
  state.chat.push({who:"You",text,me:true,online:true});els.chatInput.value="";renderChat();notify("Message added to demo chat");
  state.chatBusy=true;renderChat();setTimeout(()=>{
    state.chatBusy=false;
    state.chat.push({who:"Support",text:"Thanks for sharing. Take the next small step that feels manageable.",me:false,online:true});
    renderChat();
  },1200);
}
function react(btn){
  burstAt(btn,5);notify("Reaction sent");
}

function initThemes(){
  const sync=()=>{const t=localStorage.getItem("tubalhub-theme")||"forest";document.body.classList.remove("theme-midnight","theme-forest","theme-light");document.body.classList.add("theme-"+t)};
  sync();window.addEventListener("tubalhubthemechange",sync);
}
function bind(){
  els.moodGrid.addEventListener("click",e=>{const b=e.target.closest("[data-mood]");if(b)selectMood(b.dataset.mood,b)});
  $("#saveJournal").addEventListener("click",saveJournal);
  els.journal.addEventListener("click",e=>{const edit=e.target.closest("[data-edit-entry]");if(edit)editEntry(edit.dataset.editEntry);const del=e.target.closest("[data-delete-entry]");if(del)deleteEntry(del.dataset.deleteEntry)});
  els.groundingSave.addEventListener("click",saveGrounding);
  els.chatSend.addEventListener("click",sendChat);els.chatInput.addEventListener("keydown",e=>{if(e.key==="Enter")sendChat()});
  $$(".support-reacts button").forEach(b=>b.addEventListener("click",()=>react(b)));
  $$(".tip-card a").forEach(a=>a.addEventListener("click",()=>notify("Open the "+a.textContent.replace(" →","").toLowerCase()+" section")));
  bindBreathingButton();els.exerciseStart?.addEventListener("click",()=>{burstAt(els.exerciseStart,6);startBreathing();if(!state.breathing.running&&els.exerciseStatus)els.exerciseStatus.textContent="Ready when you are."});bindPlayer();
}
function init(){
  state.entries=loadEntries();renderMood();renderEntries();renderTips();initGrounding();renderChat();initThemes();switchTrack(0);bind();updatePlayer();
}
init();