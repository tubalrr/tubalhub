/* TUBAL HUB — Jitsi Meet video/voice calls
   Actual media is handled by Jitsi Meet.
   Firebase is used only for the private call invitation/accept/decline signal.
*/
import { app, auth } from "./firebase-config.js";
import {
  getFirestore, collection, doc, setDoc, getDoc, updateDoc, deleteDoc,
  query, where, onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

const db = getFirestore(app);
const JITSI_DOMAIN = "meet.jit.si";

let user = null;
let callRef = null;
let callId = null;
let jitsiApi = null;
let stopIncoming = null;
let incomingId = null;
let incomingData = null;

const $ = id => document.getElementById(id);
const isReal = () => !!user && !user.isAnonymous;
const displayName = u => u?.displayName || u?.email?.split("@")[0] || "Member";
const initials = n => (n || "Member").trim().split(/\s+/).slice(0,2).map(x => x[0]).join("").toUpperCase() || "M";

function injectUI(){
  if($("videoCallUI")) return;

  const wrap = document.createElement("div");
  wrap.innerHTML = `
    <div id="videoCallUI" class="vc-overlay" hidden>
      <div class="vc-card vc-active-card vc-jitsi-card">
        <div class="vc-head">
          <div>
            <strong id="vcTitle">Video Call</strong>
            <span id="vcStatus">Connecting…</span>
          </div>
          <button id="vcCloseTop" class="vc-x" type="button" aria-label="End call">×</button>
        </div>
        <div id="jitsiContainer" class="jitsi-container"></div>
        <div class="vc-controls">
          <button id="vcEnd" class="vc-end" type="button">☎ End Call</button>
        </div>
      </div>
    </div>

    <div id="vcIncoming" class="vc-overlay" hidden>
      <div class="vc-card vc-incoming-card">
        <div class="vc-in-avatar" id="vcIncomingAvatar">TH</div>
        <h3 id="vcIncomingName">Incoming video call</h3>
        <p id="vcIncomingText">Someone is calling you.</p>
        <div class="vc-in-actions">
          <button id="vcDecline" class="vc-decline" type="button">Decline</button>
          <button id="vcAccept" class="vc-accept" type="button">Accept</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(wrap);

  $("vcEnd").onclick = () => endCall(true);
  $("vcCloseTop").onclick = () => endCall(true);
  $("vcDecline").onclick = declineIncoming;
  $("vcAccept").onclick = acceptIncoming;
}

function showActive(title, status){
  injectUI();
  $("vcTitle").textContent = title || "Video Call";
  $("vcStatus").textContent = status || "Connecting…";
  $("videoCallUI").hidden = false;
}

function hideActive(){
  if($("videoCallUI")) $("videoCallUI").hidden = true;
}

function showIncoming(d){
  injectUI();
  const n = d.callerName || "Member";
  incomingData = d;
  showActive("Incoming call from " + n, "Waiting for you to accept…");
  $("vcIncomingName").textContent = n;
  $("vcIncomingText").textContent = "Incoming video call from " + n;
  $("vcIncomingAvatar").textContent = initials(n);
  $("vcIncoming").hidden = false;
}

function hideIncoming(){
  if($("vcIncoming")) $("vcIncoming").hidden = true;
}

function loadJitsi(){
  return new Promise((resolve,reject)=>{
    if(window.JitsiMeetExternalAPI) return resolve();
    const old = document.querySelector('script[data-tubal-jitsi="1"]');
    if(old){
      old.addEventListener("load",()=>resolve(),{once:true});
      old.addEventListener("error",()=>reject(new Error("JITSI_SCRIPT_FAILED")),{once:true});
      return;
    }
    const s = document.createElement("script");
    s.src = "https://" + JITSI_DOMAIN + "/external_api.js";
    s.async = true;
    s.dataset.tubalJitsi = "1";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("JITSI_SCRIPT_FAILED"));
    document.head.appendChild(s);
  });
}

async function joinJitsi(room, otherName){
  await loadJitsi();

  const container = $("jitsiContainer");
  container.innerHTML = "";
  jitsiApi?.dispose?.();
  jitsiApi = null;

  const options = {
    roomName: room,
    parentNode: container,
    width: "100%",
    height: "100%",
    userInfo: { displayName: displayName(user) },
    configOverwrite: {
      prejoinConfig: { enabled: true },
      disableDeepLinking: true,
      startWithAudioMuted: false,
      startWithVideoMuted: false,
      disableThirdPartyRequests: true
    },
    interfaceConfigOverwrite: {
      TOOLBAR_BUTTONS: [
        "microphone", "camera", "desktop", "fullscreen",
        "hangup", "chat", "raisehand", "tileview", "settings"
      ],
      SHOW_JITSI_WATERMARK: false,
      SHOW_WATERMARK_FOR_GUESTS: false
    }
  };

  jitsiApi = new window.JitsiMeetExternalAPI(JITSI_DOMAIN, options);

  jitsiApi.addEventListener("videoConferenceJoined", () => {
    $("vcStatus").textContent = "Connected";
  });

  jitsiApi.addEventListener("videoConferenceLeft", () => {
    if(callRef) endCall(true);
  });

  jitsiApi.addEventListener("readyToClose", () => {
    if(callRef) endCall(true);
  });

  jitsiApi.addEventListener("errorOccurred", e => {
    console.error("[TUBAL HUB Jitsi]", e);
    $("vcStatus").textContent = "Call service error";
  });

  $("vcTitle").textContent = "Call with " + (otherName || "Member");
  $("vcStatus").textContent = "Opening secure call…";
}

async function startCall(target){
  if(!isReal() || !target?.uid || target.uid === user.uid || callRef) return;

  try{
    const ref = doc(collection(db,"videoCalls"));
    callRef = ref;
    callId = ref.id;

    const room = "TUBALHUB-" + ref.id;

    await setDoc(ref,{
      callerId: user.uid,
      calleeId: target.uid,
      callerName: displayName(user),
      callerPhotoURL: user.photoURL || "",
      calleeName: target.displayName || "Member",
      media: "video",
      status: "ringing",
      room,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    hideIncoming();
    showActive("Calling " + (target.displayName || "Member"), "Ringing…");

    // Open Jitsi for the caller immediately. The callee joins only after Accept.
    await joinJitsi(room, target.displayName || "Member");
  }catch(e){
    console.error("[TUBAL HUB] startCall",e);
    alert("Hindi ma-open ang video call. Subukan ulit.");
    await safeDelete(callRef);
    resetCall();
  }
}

async function acceptIncoming(){
  if(!incomingId || callRef) return;

  const id = incomingId;
  const d0 = incomingData;
  hideIncoming();
  incomingId = null;
  incomingData = null;

  const ref = doc(db,"videoCalls",id);

  try{
    const snap = await getDoc(ref);
    if(!snap.exists()) return;

    const d = snap.data();
    if(d.calleeId !== user.uid || d.status !== "ringing" || !d.room) return;

    callRef = ref;
    callId = id;

    await updateDoc(ref,{
      status:"accepted",
      updatedAt:serverTimestamp()
    });

    showActive("Call with " + (d.callerName || "Member"), "Joining…");
    await joinJitsi(d.room, d.callerName || "Member");
  }catch(e){
    console.error("[TUBAL HUB] acceptIncoming",e);
    try{ await updateDoc(ref,{status:"ended",updatedAt:serverTimestamp()}); }catch{}
    resetCall();
    alert("Hindi ma-open ang video call. Subukan ulit.");
  }
}

async function declineIncoming(){
  const id = incomingId;
  incomingId = null;
  incomingData = null;
  hideIncoming();
  hideActive();

  if(!id) return;

  try{
    const ref = doc(db,"videoCalls",id);
    const snap = await getDoc(ref);
    if(snap.exists() && snap.data().calleeId === user.uid){
      await updateDoc(ref,{status:"declined",updatedAt:serverTimestamp()});
      setTimeout(()=>safeDelete(ref),5000);
    }
  }catch(e){
    console.error("[TUBAL HUB] decline",e);
  }
}

async function endCall(notify=true){
  const ref = callRef;

  try{
    if(notify && ref){
      await updateDoc(ref,{status:"ended",updatedAt:serverTimestamp()});
    }
  }catch(e){
    console.warn("[TUBAL HUB] end signal",e);
  }

  if(jitsiApi){
    try{ jitsiApi.executeCommand("hangup"); }catch{}
    try{ jitsiApi.dispose(); }catch{}
  }

  jitsiApi = null;
  if($("jitsiContainer")) $("jitsiContainer").innerHTML = "";

  await safeDelete(ref);
  resetCall();
}

function resetCall(){
  callRef = null;
  callId = null;
  hideActive();
  hideIncoming();
  incomingId = null;
  incomingData = null;
  if(jitsiApi){
    try{jitsiApi.dispose();}catch{}
    jitsiApi = null;
  }
  if($("jitsiContainer")) $("jitsiContainer").innerHTML = "";
}

async function safeDelete(ref){
  if(!ref) return;
  try{
    const snap = await getDoc(ref);
    if(snap.exists()) await deleteDoc(ref);
  }catch(e){}
}

function watchIncoming(){
  if(stopIncoming){ stopIncoming(); stopIncoming=null; }
  if(!isReal()) return;

  const q = query(
    collection(db,"videoCalls"),
    where("calleeId","==",user.uid),
    where("status","==","ringing")
  );

  stopIncoming = onSnapshot(q, snap => {
    if(!isReal() || callRef) return;

    const calls = [];
    snap.forEach(s => {
      const d = s.data();
      if(d.calleeId === user.uid && d.status === "ringing" && d.room){
        calls.push({id:s.id,data:d});
      }
    });

    calls.sort((a,b)=>{
      const ta=a.data.createdAt?.toMillis?.()||0;
      const tb=b.data.createdAt?.toMillis?.()||0;
      return tb-ta;
    });

    if(!calls.length){
      hideIncoming();
      incomingId=null;
      incomingData=null;
      return;
    }

    const next=calls[0];
    if(incomingId !== next.id){
      incomingId=next.id;
      showIncoming(next.data);
    }
  }, e => {
    console.error("[TUBAL HUB] Incoming call listener",e);
    hideIncoming();
  });
}

function addButtons(){
  const list=$("memberList");
  if(!list || !isReal()) return;

  list.querySelectorAll(".member").forEach(div=>{
    const uid=div.dataset.uid;
    if(!uid || uid===user.uid || div.querySelector(".vc-call-btn")) return;

    const b=document.createElement("button");
    b.type="button";
    b.className="vc-call-btn";
    b.title="Video call";
    b.textContent="📹";
    b.onclick=()=>{
      const name=div.querySelector(".member-info b")?.textContent||"Member";
      const img=div.querySelector(".mini img");
      startCall({uid,displayName:name,photoURL:img?.src||""});
    };
    div.appendChild(b);
  });
}

function observeMembers(){
  const list=$("memberList");
  if(!list) return;
  new MutationObserver(addButtons).observe(list,{childList:true,subtree:true});
  addButtons();
}

injectUI();
observeMembers();

onAuthStateChanged(auth,u=>{
  user=u||null;

  if(!isReal()){
    if(stopIncoming){stopIncoming();stopIncoming=null;}
    if(callRef) endCall(true);
    hideIncoming();
    return;
  }

  watchIncoming();
  addButtons();
});
