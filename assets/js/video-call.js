import { app, auth } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import { getFirestore, collection, doc, setDoc, updateDoc, deleteDoc, query, where, onSnapshot, serverTimestamp, getDoc } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';

const db = getFirestore(app);
let user = null;
let peer = null;
let localStream = null;
let remoteStream = null;
let activeCallRef = null;
let stopCallDoc = null;
let stopCandidates = null;
let pendingCandidates = [];
let incomingId = null;
let callTimer = null;
let callStartedAt = 0;

const ICE = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' }
];

function esc(v){const d=document.createElement('div');d.textContent=v??'';return d.innerHTML}
function isReal(){return !!user && !user.isAnonymous}
function nameOf(u){return u?.displayName || u?.email?.split('@')[0] || 'Member'}
function initials(n){return (n||'Member').trim().split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'M'}

function injectUI(){
  if(document.getElementById('videoCallUI')) return;
  document.body.insertAdjacentHTML('beforeend', `
    <div id="videoCallUI" class="vc-overlay" hidden>
      <div class="vc-card vc-active-card">
        <div class="vc-head"><div><strong id="vcTitle">Video Call</strong><span id="vcStatus">Connecting…</span></div><button id="vcCloseTop" class="vc-x" type="button" aria-label="Close">×</button></div>
        <div class="vc-videos"><video id="vcRemote" autoplay playsinline></video><video id="vcLocal" autoplay muted playsinline></video><div id="vcRemotePlaceholder" class="vc-placeholder">Waiting for video…</div></div>
        <div class="vc-controls"><button id="vcMute" type="button">🎙 Mute</button><button id="vcCamera" type="button">📷 Camera</button><button id="vcEnd" class="vc-end" type="button">☎ End Call</button></div>
      </div>
    </div>
    <div id="vcIncoming" class="vc-overlay" hidden>
      <div class="vc-card vc-incoming-card">
        <div class="vc-in-avatar" id="vcIncomingAvatar">TH</div>
        <h3 id="vcIncomingName">Incoming video call</h3>
        <p id="vcIncomingText">Someone is calling you.</p>
        <div class="vc-in-actions"><button id="vcDecline" class="vc-decline" type="button">Decline</button><button id="vcAccept" class="vc-accept" type="button">Accept</button></div>
      </div>
    </div>`);

  document.getElementById('vcEnd').onclick=()=>endCall(true);
  document.getElementById('vcCloseTop').onclick=()=>endCall(true);
  document.getElementById('vcDecline').onclick=()=>declineIncoming();
  document.getElementById('vcAccept').onclick=()=>acceptIncoming();
  document.getElementById('vcMute').onclick=()=>toggleMute();
  document.getElementById('vcCamera').onclick=()=>toggleCamera();
}

function showActive(title,status){
  injectUI();
  document.getElementById('vcTitle').textContent=title || 'Video Call';
  document.getElementById('vcStatus').textContent=status || 'Connecting…';
  document.getElementById('videoCallUI').hidden=false;
}
function hideActive(){const x=document.getElementById('videoCallUI');if(x)x.hidden=true}
function showIncoming(data){
  injectUI();
  const n=data.callerName||'Member';
  document.getElementById('vcIncomingName').textContent=n;
  document.getElementById('vcIncomingText').textContent='Incoming video call from '+n;
  document.getElementById('vcIncomingAvatar').textContent=initials(n);
  document.getElementById('vcIncoming').hidden=false;
}
function hideIncoming(){const x=document.getElementById('vcIncoming');if(x)x.hidden=true}

function cleanupPeer(){
  if(stopCallDoc){stopCallDoc();stopCallDoc=null}
  if(stopCandidates){stopCandidates();stopCandidates=null}
  if(peer){try{peer.onicecandidate=null;peer.ontrack=null;peer.close()}catch{}peer=null}
  if(localStream){localStream.getTracks().forEach(t=>t.stop());localStream=null}
  if(remoteStream){remoteStream.getTracks().forEach(t=>t.stop());remoteStream=null}
  pendingCandidates=[];
  const l=document.getElementById('vcLocal'),r=document.getElementById('vcRemote');
  if(l)l.srcObject=null;if(r)r.srcObject=null;
  if(callTimer){clearInterval(callTimer);callTimer=null}
  callStartedAt=0;
  document.getElementById('vcRemotePlaceholder')?.classList.remove('hide');
}

async function setupPeer(callRef, otherId){
  peer=new RTCPeerConnection({iceServers:ICE});
  localStream=await navigator.mediaDevices.getUserMedia({video:true,audio:true});
  remoteStream=new MediaStream();
  document.getElementById('vcLocal').srcObject=localStream;
  document.getElementById('vcRemote').srcObject=remoteStream;
  localStream.getTracks().forEach(t=>peer.addTrack(t,localStream));
  peer.ontrack=e=>{e.streams[0]?.getTracks().forEach(t=>remoteStream.addTrack(t));document.getElementById('vcRemotePlaceholder')?.classList.add('hide');};
  peer.onicecandidate=e=>{if(e.candidate)setDoc(doc(collection(db,'videoCalls',callRef.id,'candidates')), {senderId:user.uid,candidate:e.candidate.toJSON(),createdAt:serverTimestamp()}).catch(()=>{})};
  stopCandidates=onSnapshot(collection(db,'videoCalls',callRef.id,'candidates'),snap=>{snap.docChanges().forEach(ch=>{if(ch.type!=='added')return;const c=ch.doc.data();if(c.senderId===user.uid||!c.candidate)return;const ice=new RTCIceCandidate(c.candidate);if(peer?.remoteDescription)peer.addIceCandidate(ice).catch(()=>{});else pendingCandidates.push(ice)})});
  return peer;
}
async function flushCandidates(){if(!peer?.remoteDescription)return;for(const c of pendingCandidates.splice(0)){try{await peer.addIceCandidate(c)}catch{}}}

async function startCall(target){
  if(!isReal() || !target?.uid || target.uid===user.uid || activeCallRef) return;
  if(!navigator.mediaDevices?.getUserMedia){alert('Your browser does not support camera/microphone access.');return}
  try{
    const callRef=doc(collection(db,'videoCalls'));
    activeCallRef=callRef;
    showActive('Calling '+(target.displayName||'Member'),'Requesting camera and microphone…');
    await setupPeer(callRef,target.uid);
    const offer=await peer.createOffer();
    await peer.setLocalDescription(offer);
    await setDoc(callRef,{callerId:user.uid,calleeId:target.uid,callerName:nameOf(user),callerPhotoURL:user.photoURL||'',calleeName:target.displayName||'Member',status:'ringing',offer:{type:offer.type,sdp:offer.sdp},createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
    listenCall(callRef,true,target.displayName||'Member');
    startTimer();
  }catch(e){console.error(e);alert('Could not start the video call. Check your camera/microphone permissions.');await safeDelete(activeCallRef);activeCallRef=null;cleanupPeer();hideActive()}
}

function listenCall(callRef,callerSide,otherName){
  stopCallDoc=onSnapshot(callRef,async snap=>{
    if(!snap.exists()){endLocal();return}
    const d=snap.data();
    if(d.status==='declined'){alert('The call was declined.');endLocal();return}
    if(d.status==='ended'){endLocal();return}
    if(callerSide && d.answer && peer && !peer.currentRemoteDescription){
      await peer.setRemoteDescription(new RTCSessionDescription(d.answer));
      await flushCandidates();
      document.getElementById('vcStatus').textContent='Connected';
      callStartedAt=callStartedAt||Date.now();
    }
    if(d.status==='accepted' && !callerSide){
      document.getElementById('vcStatus').textContent='Connected';
    }
  });
}

async function acceptIncoming(){
  if(!incomingId||activeCallRef)return;
  const callId=incomingId;hideIncoming();incomingId=null;
  const ref=doc(db,'videoCalls',callId);
  try{
    const snap=await getDoc(ref);if(!snap.exists())return;const d=snap.data();
    if(d.calleeId!==user.uid||d.status!=='ringing')return;
    activeCallRef=ref;showActive('Video call with '+(d.callerName||'Member'),'Requesting camera and microphone…');
    await setupPeer(ref,d.callerId);
    await peer.setRemoteDescription(new RTCSessionDescription(d.offer));
    await flushCandidates();
    const answer=await peer.createAnswer();await peer.setLocalDescription(answer);
    await updateDoc(ref,{status:'accepted',answer:{type:answer.type,sdp:answer.sdp},updatedAt:serverTimestamp()});
    listenCall(ref,false,d.callerName||'Member');startTimer();
  }catch(e){console.error(e);alert('Could not accept the call. Check camera/microphone permissions.');await safeUpdate(ref,{status:'ended',updatedAt:serverTimestamp()});endLocal()}
}
async function declineIncoming(){
  const id=incomingId;hideIncoming();incomingId=null;if(!id)return;
  const ref=doc(db,'videoCalls',id);try{const s=await getDoc(ref);if(s.exists()&&s.data().calleeId===user.uid)await updateDoc(ref,{status:'declined',updatedAt:serverTimestamp()})}catch(e){console.error(e)}
}
async function endCall(notify=true){
  const ref=activeCallRef;
  if(notify&&ref){try{await updateDoc(ref,{status:'ended',updatedAt:serverTimestamp()})}catch{}}
  endLocal();
}
function endLocal(){const ref=activeCallRef;activeCallRef=null;cleanupPeer();hideActive();if(ref)setTimeout(()=>safeDelete(ref),10000)}
async function safeDelete(ref){if(!ref)return;try{const s=await getDoc(ref);if(s.exists()&&(s.data().callerId===user?.uid||s.data().calleeId===user?.uid)&&['ended','declined'].includes(s.data().status))await deleteDoc(ref)}catch{}}
async function safeUpdate(ref,data){try{await updateDoc(ref,data)}catch{}}
function startTimer(){if(callTimer)clearInterval(callTimer);callStartedAt=Date.now();callTimer=setInterval(()=>{const s=Math.floor((Date.now()-callStartedAt)/1000),m=String(Math.floor(s/60)).padStart(2,'0'),sec=String(s%60).padStart(2,'0');const el=document.getElementById('vcStatus');if(el&&!el.textContent.includes('Connected'))el.textContent='Connected';if(el)el.dataset.time=m+':'+sec},1000)}
function toggleMute(){const t=localStream?.getAudioTracks?.()[0];if(!t)return;t.enabled=!t.enabled;document.getElementById('vcMute').textContent=t.enabled?'🎙 Mute':'🔇 Unmute'}
function toggleCamera(){const t=localStream?.getVideoTracks?.()[0];if(!t)return;t.enabled=!t.enabled;document.getElementById('vcCamera').textContent=t.enabled?'📷 Camera':'🚫 Camera'}

function watchIncoming(){
  const q=query(collection(db,'videoCalls'),where('calleeId','==',user.uid));
  onSnapshot(q,snap=>{
    snap.docChanges().forEach(ch=>{
      const d=ch.doc.data();
      if(ch.type==='added' && d.status==='ringing' && !activeCallRef && incomingId!==ch.doc.id){incomingId=ch.doc.id;showIncoming(d)}
      if(ch.type==='modified' && d.status==='ringing' && !activeCallRef && incomingId!==ch.doc.id){incomingId=ch.doc.id;showIncoming(d)}
    });
  },e=>console.error('Incoming call listener',e));
}

function addButtons(){
  const list=document.getElementById('memberList');if(!list||!isReal())return;
  list.querySelectorAll('.member').forEach(div=>{
    const uid=div.dataset.uid;if(!uid||uid===user.uid||div.querySelector('.vc-call-btn'))return;
    const b=document.createElement('button');b.type='button';b.className='vc-call-btn';b.title='Video call';b.setAttribute('aria-label','Video call');b.textContent='📹';
    b.onclick=()=>{const name=div.querySelector('.member-info b')?.textContent||'Member';const img=div.querySelector('.mini img');startCall({uid,displayName:name,photoURL:img?.src||''})};
    div.appendChild(b);
  });
}
function observeMembers(){const list=document.getElementById('memberList');if(!list)return;new MutationObserver(addButtons).observe(list,{childList:true,subtree:true});addButtons()}

injectUI();observeMembers();
onAuthStateChanged(auth,userArg=>{user=userArg||null;if(!isReal()){if(activeCallRef)endCall(true);hideIncoming();return}watchIncoming();addButtons()});
