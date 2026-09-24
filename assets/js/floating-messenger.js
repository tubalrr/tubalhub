import { app, auth } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { getFirestore, collection, query, where, onSnapshot, addDoc, limit, doc, getDocsFromServer } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const db=getFirestore(app);
let me=null,target=null,stopUsers=null,stopMessages=null,stopUnread=null,stopOwnPresence=null,lastSend=0,incomingReady=false,audioCtx=null;

const esc=v=>{const d=document.createElement("div");d.textContent=v??"";return d.innerHTML};
const initials=n=>(n||"Member").trim().split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase()||"M";

function loadPremiumCss(){
  if(document.querySelector('link[data-tubal-floating-premium]'))return;
  const css=document.createElement("link");
  css.rel="stylesheet";css.dataset.tubalFloatingPremium="";
  css.href=new URL("/tubalhub/assets/css/floating-messenger-premium.css?v=20260924-msg1",window.location.origin).href;
  document.head.appendChild(css);
}
function setLauncherOnline(online){
  const b=document.getElementById("tubalMsgLauncher");if(!b)return;
  b.dataset.online=online?"true":"false";
  b.classList.toggle("online",online);b.classList.toggle("offline",!online);
}
function animateLauncher(){
  const b=document.getElementById("tubalMsgLauncher"),badge=document.getElementById("tubalMsgBadge");if(!b)return;
  b.classList.remove("msg-shake");void b.offsetWidth;b.classList.add("msg-shake");
  setTimeout(()=>b.classList.remove("msg-shake"),340);
  if(badge&&!badge.hidden){badge.classList.remove("is-bounce");void badge.offsetWidth;badge.classList.add("is-bounce");setTimeout(()=>badge.classList.remove("is-bounce"),470)}
}
function playMessageSound(){
  try{audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==="suspended")audioCtx.resume();const now=audioCtx.currentTime,o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type="sine";o.frequency.setValueAtTime(880,now);o.frequency.exponentialRampToValueAtTime(1320,now+.09);g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(.12,now+.015);g.gain.exponentialRampToValueAtTime(.0001,now+.22);o.connect(g);g.connect(audioCtx.destination);o.start(now);o.stop(now+.24)}catch(_){}
}
function ui(){
  if(document.getElementById("tubalMessenger"))return;
  const markup = [
    '<button id="tubalMsgLauncher" class="tubal-msg-launcher offline" data-online="false" aria-label="Messages">',
      '<svg class="tubal-msg-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 4.5A2.5 2.5 0 0 0 17.5 2h-11A4.5 4.5 0 0 0 2 6.5v6A4.5 4.5 0 0 0 6.5 17H8l-3.5 4 6.3-4H17.5a4.5 4.5 0 0 0 4.5-4.5v-8ZM6.5 7h11a1 1 0 1 1 0 2h-11a1 1 0 0 1 0-2Zm0 4h7a1 1 0 1 1 0 0 2h-7a1 1 0 1 1 0-2Z"/></svg>',
      '<span id="tubalMsgStatus" class="tubal-msg-status" aria-hidden="true"></span>',
      '<span id="tubalMsgTooltip" class="tubal-msg-tooltip">Messages (0)</span>',
      '<span id="tubalMsgBadge" class="tubal-msg-badge" hidden>0</span>',
    '</button>',
    '<div id="tubalMsgBackdrop" class="tubal-msg-backdrop" hidden></div>',
    '<section id="tubalMessenger" class="tubal-msg-panel" hidden>',
      '<header class="tubal-msg-head"><strong>Messages</strong><span style="font-size:10px;color:#70ffe0">● Online</span><button id="tubalMsgClose" class="tubal-msg-close" type="button" aria-label="Close messages">×</button></header>',
      '<div id="tubalMsgList" class="tubal-msg-list"><div class="tubal-msg-loading">Loading members…</div></div>',
    '</section>',
    '<section id="tubalMsgWindow" class="tubal-msg-window" hidden>',
      '<header class="tubal-msg-window-head"><button type="button" id="tubalMsgProfile" class="tubal-msg-profile"><div id="tubalMsgAvatar" class="tubal-msg-avatar">M</div><div><strong id="tubalMsgName">Member</strong><div class="tubal-msg-status">● Online</div></div></button><button type="button" id="tubalMsgCall" title="Video call" aria-label="Video call">📹</button><button type="button" id="tubalMsgWindowClose" aria-label="Close private chat">×</button></header>',
      '<div id="tubalMsgBody" class="tubal-msg-body"></div>',
      '<form id="tubalMsgCompose" class="tubal-msg-compose"><input id="tubalMsgInput" maxlength="500" placeholder="Message…" autocomplete="off"><button type="submit" id="tubalMsgSend">Send</button></form>',
    '</section>'
  ].join("");
  document.body.insertAdjacentHTML("beforeend",markup);

  const launcher=document.getElementById("tubalMsgLauncher"),panel=document.getElementById("tubalMessenger"),backdrop=document.getElementById("tubalMsgBackdrop");
  const openDrawer=()=>{panel.hidden=false;backdrop.hidden=false;requestAnimationFrame(()=>panel.classList.add("msg-open"));launcher.classList.remove("is-pop");void launcher.offsetWidth;launcher.classList.add("is-pop");setTimeout(()=>launcher.classList.remove("is-pop"),470)};
  const closeDrawer=()=>{panel.classList.remove("msg-open");backdrop.hidden=true;setTimeout(()=>{if(!panel.classList.contains("msg-open"))panel.hidden=true},220)};
  launcher.onclick=e=>{e.preventDefault();panel.hidden?openDrawer():closeDrawer()};
  document.getElementById("tubalMsgClose").onclick=closeDrawer;
  backdrop.onclick=closeDrawer;

  panel.addEventListener("pointermove",e=>{const r=panel.getBoundingClientRect();panel.style.setProperty("--mx",e.clientX-r.left+"px");panel.style.setProperty("--my",e.clientY-r.top+"px")},{passive:true});
  document.getElementById("tubalMsgWindowClose").onclick=()=>{target=null;if(stopMessages){stopMessages();stopMessages=null}document.getElementById("tubalMsgWindow").hidden=true};
  document.getElementById("tubalMsgProfile").onclick=e=>{e.preventDefault();e.stopPropagation();if(target)openUser(target)};
  document.getElementById("tubalMsgCall").onclick=e=>{e.preventDefault();e.stopPropagation();if(target)window.dispatchEvent(new CustomEvent("tubalhub-private-call",{detail:target}))};
  document.getElementById("tubalMsgCompose").onsubmit=async e=>{
    e.preventDefault();e.stopPropagation();
    const input=document.getElementById("tubalMsgInput"),text=input.value.trim();
    if(!text||!target||!me||Date.now()-lastSend<700)return;
    lastSend=Date.now();
    try{await addDoc(collection(db,"messages"),{uid:me.uid,senderId:me.uid,receiverId:target.uid,participants:[me.uid,target.uid],displayName:me.displayName||me.email?.split("@")[0]||"Member",senderPhotoURL:me.photoURL||"",text,type:"text",createdAt:new Date()});input.value="";input.focus()}
    catch(err){console.error("[TUBAL HUB] floating message",err);alert("Message was not sent. Check Firestore Rules.")}
  };
}
function markSeen(uid,ms){try{localStorage.setItem("tubalMsgSeen:"+uid,String(ms||Date.now()));localStorage.removeItem("tubalMsgUnread:"+uid)}catch(_){}updateBadge()}
function updateBadge(){
  const badge=document.getElementById("tubalMsgBadge"),tip=document.getElementById("tubalMsgTooltip"),launcher=document.getElementById("tubalMsgLauncher");
  if(!badge||!tip||!launcher)return 0;
  let total=0;
  try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k?.startsWith("tubalMsgUnread:"))total+=Number(localStorage.getItem(k)||0)}}catch(_){}
  badge.textContent=total>99?"99+":String(total);badge.hidden=total<1;tip.textContent="Messages ("+total+")";launcher.hidden=!me;return total;
}
function watchUnread(){
  if(stopUnread)stopUnread();incomingReady=false;
  const q=query(collection(db,"messages"),where("participants","array-contains",me.uid),limit(200));
  stopUnread=onSnapshot(q,s=>{
    const counts={},incoming=[];
    s.docChanges().forEach(ch=>{if(ch.type!=="added")return;const d=ch.doc.data();if(d.receiverId!==me.uid||d.senderId===me.uid)return;const ms=messageMs(d),seen=Number(localStorage.getItem("tubalMsgSeen:"+d.senderId)||0);if(ms>seen)incoming.push(d)});
    s.forEach(x=>{const d=x.data();if(d.receiverId!==me.uid||d.senderId===me.uid)return;const ms=messageMs(d),seen=Number(localStorage.getItem("tubalMsgSeen:"+d.senderId)||0);if(ms>seen)counts[d.senderId]=(counts[d.senderId]||0)+1});
    try{
      Object.keys(counts).forEach(uid=>localStorage.setItem("tubalMsgUnread:"+uid,String(counts[uid])));
      for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k?.startsWith("tubalMsgUnread:")&&!counts[k.slice(15)])localStorage.removeItem(k)}
    }catch(_){}
    const total=updateBadge();
    if(incoming.length)animateLauncher();
    if(!incomingReady){incomingReady=true;return}
    const d=incoming[incoming.length-1];
    if(d){playMessageSound();openIncomingChat({uid:d.senderId,displayName:d.displayName||"Member",photoURL:d.senderPhotoURL||d.photoURL||""})}
  },e=>console.error("[TUBAL HUB] incoming messages",e));
}
function messageMs(d){return d.createdAt?.toMillis?.()||d.createdAt?.seconds*1000||(d.createdAt instanceof Date?d.createdAt.getTime():0)||0}
function openIncomingChat(u){target=u;const w=document.getElementById("tubalMsgWindow");document.getElementById("tubalMsgName").textContent=u.displayName||"Member";document.getElementById("tubalMsgAvatar").innerHTML=u.photoURL?'<img src="'+esc(u.photoURL)+'" alt="">':esc(initials(u.displayName));w.hidden=false;document.getElementById("tubalMessenger").hidden=true;document.getElementById("tubalMsgBackdrop").hidden=true;subscribeMessages();document.getElementById("tubalMsgInput").focus()}
function openUser(u){target=u;markSeen(u.uid,Date.now());const w=document.getElementById("tubalMsgWindow");document.getElementById("tubalMsgName").textContent=u.displayName||"Member";document.getElementById("tubalMsgAvatar").innerHTML=u.photoURL?'<img src="'+esc(u.photoURL)+'" alt="">':esc(initials(u.displayName));w.hidden=false;document.getElementById("tubalMessenger").hidden=true;document.getElementById("tubalMsgBackdrop").hidden=true;subscribeMessages();document.getElementById("tubalMsgInput").focus()}
function subscribeMessages(){
  if(stopMessages)stopMessages();
  const q=query(collection(db,"messages"),where("participants","array-contains",me.uid),limit(200));
  stopMessages=onSnapshot(q,s=>{
    const list=[];s.forEach(x=>{const d=x.data();if(Array.isArray(d.participants)&&d.participants.includes(target.uid))list.push(d)});
    list.sort((a,b)=>messageMs(a)-messageMs(b));
    const b=document.getElementById("tubalMsgBody");
    b.innerHTML=list.length?list.map(d=>'<div class="tubal-msg-bubble '+(d.senderId===me.uid?"me":"")+'">'+esc(d.text||"")+"</div>").join(""):'<div style="color:#8fa39a;text-align:center;padding:30px 10px;font-size:12px">No messages yet. Say hello! 👋</div>';
    b.scrollTop=b.scrollHeight;
    if(target)markSeen(target.uid,list.length?messageMs(list[list.length-1]):Date.now());
  },e=>console.error("[TUBAL HUB] message listener",e));
}
function watchUsers(){
  if(stopUsers){stopUsers();stopUsers=null}
  if(!me)return;

  const usersRef=collection(db,"users");
  const presenceRef=collection(db,"presence");
  let usersMap=new Map(),presenceMap=new Map();
  let usersLoaded=false,presenceLoaded=false;
  let stopUsersSnapshot=null,stopPresenceSnapshot=null;
  let refreshTimer=null,timeoutId=null;

  const onlineCutoff=()=>Date.now()-180000;
  const lastSeenMs=value=>{
    if(typeof value==="number")return value;
    return value?.toMillis?.()||value?.toDate?.()?.getTime?.()||0;
  };
  const syncMap=(snap,map)=>{
    map.clear();
    snap.forEach(d=>{
      const x=d.data();
      map.set(x.uid||d.id,{...x,uid:x.uid||d.id});
    });
  };

  const render=(errorMessage="")=>{
    const box=document.getElementById("tubalMsgList");
    if(!box)return;

    if(errorMessage&&!usersLoaded&&!presenceLoaded){
      box.innerHTML='<div class="tubal-msg-empty"><strong>Messages unavailable.</strong><span>'+esc(errorMessage)+'</span></div>';
      return;
    }
    if(!usersLoaded&&!presenceLoaded){
      box.innerHTML='<div class="tubal-msg-loading">Loading members…</div>';
      return;
    }

    const list=[...usersMap.values()]
      .filter(u=>u.uid&&u.uid!==me.uid)
      .map(u=>{
        const p=presenceMap.get(u.uid);
        const online=!!p&&p.online===true&&lastSeenMs(p.lastSeen)>=onlineCutoff();
        return {...u,online};
      })
      .sort((a,b)=>Number(b.online)-Number(a.online)||String(a.displayName||"").localeCompare(String(b.displayName||"")));

    if(!list.length){
      box.innerHTML='<div class="tubal-msg-empty"><strong>No other members yet.</strong><span>Other registered TUBAL HUB members will appear here.</span></div>';
      return;
    }

    box.innerHTML=list.map(u=>'<button type="button" class="tubal-msg-user '+(u.online?'is-online':'is-offline')+'" data-uid="'+esc(u.uid)+'">'+
      '<div class="tubal-msg-avatar">'+(u.photoURL?'<img src="'+esc(u.photoURL)+'" alt="">':esc(initials(u.displayName||u.email)))+'</div>'+
      '<div class="tubal-msg-user-copy"><b>'+esc(u.displayName||u.email?.split("@")[0]||"Member")+'</b>'+
      '<span class="tubal-msg-user-status">'+(u.online?'● Online':'○ Offline')+' · Message</span></div></button>').join("");

    box.querySelectorAll(".tubal-msg-user").forEach(button=>{
      const user=list.find(x=>x.uid===button.dataset.uid);
      button.onclick=e=>{e.preventDefault();e.stopPropagation();if(user)openUser(user)};
    });
  };

  const loadInitial=async()=>{
    try{
      const [usersSnap,presenceSnap]=await Promise.all([
        getDocsFromServer(query(usersRef,limit(100))),
        getDocsFromServer(query(presenceRef,limit(100)))
      ]);
      usersLoaded=true;presenceLoaded=true;
      syncMap(usersSnap,usersMap);syncMap(presenceSnap,presenceMap);
      render();
    }catch(err){
      console.error("[TUBAL HUB] floating Firebase member load",err);
      render(err?.code==="permission-denied"?"Firestore denied member reads. Check Firestore Rules.":"Firebase member data could not be loaded.");
    }
  };

  stopUsersSnapshot=onSnapshot(query(usersRef,limit(100)),snap=>{
    usersLoaded=true;
    syncMap(snap,usersMap);
    render();
  },err=>{
    usersLoaded=true;
    console.error("[TUBAL HUB] floating users listener",err);
    render(err?.code==="permission-denied"?"Firestore denied member reads. Check Firestore Rules.":"Firebase users listener failed.");
  });

  stopPresenceSnapshot=onSnapshot(query(presenceRef,limit(100)),snap=>{
    presenceLoaded=true;
    syncMap(snap,presenceMap);
    render();
  },err=>{
    presenceLoaded=true;
    console.error("[TUBAL HUB] floating presence listener",err);
    render(err?.code==="permission-denied"?"Firestore denied presence reads. Check Firestore Rules.":"Firebase presence listener failed.");
  });

  timeoutId=setTimeout(()=>{
    if(!usersLoaded&&!presenceLoaded)render("Firebase is not responding. Check your connection or Firestore configuration.");
  },3500);

  refreshTimer=setInterval(render,30000);
  loadInitial();

  stopUsers=()=>{
    stopUsersSnapshot?.();
    stopPresenceSnapshot?.();
    clearInterval(refreshTimer);
    clearTimeout(timeoutId);
  };
}
function watchOwnPresence(){
  if(stopOwnPresence)stopOwnPresence();
  if(!me)return;
  setLauncherOnline(true);
  stopOwnPresence=onSnapshot(doc(db,"presence",me.uid),snap=>setLauncherOnline(snap.exists()?snap.data()?.online===true:true),()=>setLauncherOnline(true));
}
loadPremiumCss();ui();
onAuthStateChanged(auth,u=>{
  me=u&&!u.isAnonymous?u:null;
  const launcher=document.getElementById("tubalMsgLauncher");
  if(!me){
    setLauncherOnline(false);if(launcher)launcher.hidden=true;
    if(stopUsers)stopUsers();if(stopMessages)stopMessages();if(stopUnread)stopUnread();if(stopOwnPresence)stopOwnPresence();
    const backdrop=document.getElementById("tubalMsgBackdrop"),panel=document.getElementById("tubalMessenger");
    if(backdrop)backdrop.hidden=true;if(panel){panel.classList.remove("msg-open");panel.hidden=true}return;
  }
  if(launcher)launcher.hidden=false;setLauncherOnline(true);watchOwnPresence();watchUsers();watchUnread();updateBadge();
});