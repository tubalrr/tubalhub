import { app, auth } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import {
  getFirestore, collection, doc, setDoc, updateDoc, deleteDoc,
  query, where, onSnapshot, serverTimestamp, getDoc
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';

const db = getFirestore(app);
let user = null;
let pc = null;
let localStream = null;
let remoteStream = null;
let callRef = null;
let stopCall = null;
let stopCandidates = null;
let stopIncoming = null;
let pendingIce = [];
let incomingId = null;

const ICE = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' }
];

const $ = id => document.getElementById(id);
const isReal = () => !!user && !user.isAnonymous;
const displayName = u => u?.displayName || u?.email?.split('@')[0] || 'Member';

function initials(n){
  return (n || 'Member').trim().split(/\s+/).slice(0,2)
    .map(x => x[0]).join('').toUpperCase() || 'M';
}

function injectUI(){
  if($('videoCallUI')) return;
  document.body.insertAdjacentHTML('beforeend', `
    <div id="videoCallUI" class="vc-overlay" hidden>
      <div class="vc-card vc-active-card">
        <div class="vc-head">
          <div><strong id="vcTitle">Video Call</strong><span id="vcStatus">Connecting…</span></div>
          <button id="vcCloseTop" class="vc-x" type="button">×</button>
        </div>
        <div class="vc-videos">
          <video id="vcRemote" autoplay playsinline></video>
          <video id="vcLocal" autoplay muted playsinline></video>
          <div id="vcRemotePlaceholder" class="vc-placeholder">Waiting for video…</div>
        </div>
        <div class="vc-controls">
          <button id="vcMute" type="button">🎙 Mute</button>
          <button id="vcCamera" type="button">📷 Camera</button>
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
    </div>`);

  $('vcEnd').onclick = () => endCall(true);
  $('vcCloseTop').onclick = () => endCall(true);
  $('vcDecline').onclick = declineIncoming;
  $('vcAccept').onclick = acceptIncoming;
  $('vcMute').onclick = toggleMute;
  $('vcCamera').onclick = toggleCamera;
}

function showActive(title, status){
  injectUI();
  $('vcTitle').textContent = title || 'Video Call';
  $('vcStatus').textContent = status || 'Connecting…';
  $('videoCallUI').hidden = false;
}
function hideActive(){ if($('videoCallUI')) $('videoCallUI').hidden = true; }
function showIncoming(d){
  injectUI();
  const n = d.callerName || 'Member';

  // Open the video-call window immediately when the call arrives.
  // The Accept dialog remains on top so the receiver still explicitly
  // chooses whether to join the call.
  showActive('Incoming video call from ' + n, 'Waiting for you to accept…');

  $('vcIncomingName').textContent = n;
  $('vcIncomingText').textContent = 'Incoming video call from ' + n;
  $('vcIncomingAvatar').textContent = initials(n);
  $('vcIncoming').hidden = false;
}
function hideIncoming(){ if($('vcIncoming')) $('vcIncoming').hidden = true; }

async function getMedia(wantVideo){
  if(!navigator.mediaDevices?.getUserMedia) throw new Error('MEDIA_NOT_SUPPORTED');
  if(wantVideo){
    try{
      return await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' }, audio: true
      });
    }catch(videoError){
      console.warn('Video unavailable; retrying microphone only', videoError);
    }
  }
  try{
    return await navigator.mediaDevices.getUserMedia({video:false, audio:true});
  }catch(audioError){
    const e = new Error('MICROPHONE_FAILED');
    e.original = audioError;
    throw e;
  }
}

function mediaError(e){
  if(e?.message === 'MEDIA_NOT_SUPPORTED')
    return 'Hindi supported ng browser ang camera/microphone. Gumamit ng Chrome o Edge.';
  if(e?.message === 'MICROPHONE_FAILED'){
    if(['NotAllowedError','SecurityError'].includes(e.original?.name))
      return 'Blocked ang microphone permission. I-check ang TUBAL HUB → Site settings → Microphone → Allow.';
    if(['NotFoundError','DevicesNotFoundError'].includes(e.original?.name))
      return 'Walang microphone na nakita ng device.';
    return 'Hindi ma-access ang microphone.';
  }
  if(e?.name === 'NotAllowedError')
    return 'Blocked ang camera o microphone permission.';
  return 'Hindi ma-start ang call. Check camera/microphone permission.';
}

function cleanup(){
  if(stopCall){stopCall(); stopCall=null;}
  if(stopCandidates){stopCandidates(); stopCandidates=null;}
  if(pc){
    pc.ontrack = null; pc.onicecandidate = null;
    try{ pc.close(); }catch{}
    pc = null;
  }
  if(localStream){localStream.getTracks().forEach(t=>t.stop()); localStream=null;}
  if(remoteStream){remoteStream.getTracks().forEach(t=>t.stop()); remoteStream=null;}
  pendingIce = [];
  if($('vcLocal')){
    $('vcLocal').pause?.();
    $('vcLocal').srcObject = null;
    $('vcLocal').style.display = 'none';
  }
  if($('vcRemote')){
    $('vcRemote').pause?.();
    $('vcRemote').srcObject = null;
    $('vcRemote').load?.();
    $('vcRemote').style.display = 'none';
  }
  if($('vcRemotePlaceholder')){
    $('vcRemotePlaceholder').textContent = 'Waiting for video…';
    $('vcRemotePlaceholder').classList.remove('hide');
  }
  if($('vcMute')) $('vcMute').textContent = '🎙 Mute';
  if($('vcCamera')) $('vcCamera').textContent = '📷 Camera';
}

function attachRemote(track, streams){
  // Always build a fresh stream for the current call. This is important
  // when the same two users make another call after ending the first one.
  if(!remoteStream) remoteStream = new MediaStream();

  const existing = remoteStream.getTracks().find(t => t.id === track.id);
  if(!existing) remoteStream.addTrack(track);

  const v = $('vcRemote');
  // Do not keep the previous call's MediaStream object.
  v.srcObject = remoteStream;

  const hasVideo = remoteStream.getVideoTracks().length > 0;
  const hasAudio = remoteStream.getAudioTracks().length > 0;

  v.style.display = (hasVideo || hasAudio) ? 'block' : 'none';
  $('vcRemotePlaceholder').textContent = hasVideo
    ? 'Connecting video…'
    : 'Voice connected • Waiting for camera…';
  $('vcRemotePlaceholder').classList.toggle('hide', hasVideo);

  if(hasVideo){
    $('vcStatus').textContent = 'Video connected';
  }else if(hasAudio){
    $('vcStatus').textContent = 'Voice connected';
  }

  // Force the media element to attach/play again for repeated calls.
  v.load();
  v.play().catch(()=>{});
}

function installPeerEvents(ref){
  pc.ontrack = e => attachRemote(e.track, e.streams);
  pc.onicecandidate = e => {
    if(!e.candidate) return;
    setDoc(doc(collection(db,'videoCalls',ref.id,'candidates')), {
      senderId:user.uid,
      candidate:e.candidate.toJSON(),
      createdAt:serverTimestamp()
    }).catch(err => console.error('ICE write', err));
  };
  pc.onconnectionstatechange = () => {
    console.log('[TUBAL HUB WebRTC]', pc.connectionState, pc.iceConnectionState);
    if(['failed','disconnected'].includes(pc.connectionState))
      $('vcStatus').textContent = 'Connection problem…';
  };
}

function listenCandidates(ref){
  if(stopCandidates) stopCandidates();
  stopCandidates = onSnapshot(
    collection(db,'videoCalls',ref.id,'candidates'),
    snap => {
      snap.docChanges().forEach(ch => {
        if(ch.type !== 'added') return;
        const c = ch.doc.data();
        if(!c.candidate || c.senderId === user.uid) return;
        const ice = new RTCIceCandidate(c.candidate);
        if(pc?.remoteDescription) pc.addIceCandidate(ice).catch(console.error);
        else pendingIce.push(ice);
      });
    },
    err => console.error('Candidate listener', err)
  );
}

async function flushIce(){
  if(!pc?.remoteDescription) return;
  for(const c of pendingIce.splice(0)){
    try{ await pc.addIceCandidate(c); }catch(e){ console.error('ICE',e); }
  }
}

async function createCallerPeer(ref, wantLocalVideo){
  pc = new RTCPeerConnection({iceServers:ICE, iceCandidatePoolSize:10});
  remoteStream = new MediaStream();
  installPeerEvents(ref);

  localStream = await getMedia(wantLocalVideo);
  $('vcLocal').srcObject = localStream;
  $('vcLocal').style.display = localStream.getVideoTracks().length ? 'block' : 'none';
  $('vcCamera').style.display = localStream.getVideoTracks().length ? 'inline-flex' : 'none';

  if(localStream.getAudioTracks()[0])
    pc.addTrack(localStream.getAudioTracks()[0], localStream);

  const videoTrack = localStream.getVideoTracks()[0];
  if(videoTrack){
    pc.addTrack(videoTrack, localStream);
  }else{
    pc.addTransceiver('video', {direction:'recvonly'});
  }
  listenCandidates(ref);
}

async function createCalleePeer(ref, offer){
  pc = new RTCPeerConnection({iceServers:ICE, iceCandidatePoolSize:10});
  remoteStream = new MediaStream();
  installPeerEvents(ref);

  await pc.setRemoteDescription(new RTCSessionDescription(offer));

  const wantsRemoteVideo = pc.getTransceivers().some(
    t => t.receiver?.track?.kind === 'video'
  );

  localStream = await getMedia(wantsRemoteVideo);
  $('vcLocal').srcObject = localStream;
  $('vcLocal').style.display = localStream.getVideoTracks().length ? 'block' : 'none';
  $('vcCamera').style.display = localStream.getVideoTracks().length ? 'inline-flex' : 'none';

  const audioTrack = localStream.getAudioTracks()[0];
  const videoTrack = localStream.getVideoTracks()[0];

  const audioTr = pc.getTransceivers().find(t => t.receiver?.track?.kind === 'audio');
  const videoTr = pc.getTransceivers().find(t => t.receiver?.track?.kind === 'video');

  if(audioTrack && audioTr){
    await audioTr.sender.replaceTrack(audioTrack);
    audioTr.direction = 'sendrecv';
  }else if(audioTrack){
    pc.addTrack(audioTrack, localStream);
  }

  if(videoTrack && videoTr){
    await videoTr.sender.replaceTrack(videoTrack);
    videoTr.direction = 'sendrecv';
  }else if(videoTrack){
    pc.addTrack(videoTrack, localStream);
  }

  listenCandidates(ref);
}

async function startCall(target){
  if(!isReal() || !target?.uid || target.uid === user.uid || callRef) return;

  // Reset every media element before creating a new peer connection.
  // This prevents the second call from inheriting the first call's video state.
  cleanup();

  try{
    const ref = doc(collection(db,'videoCalls'));
    callRef = ref;
    showActive('Calling '+(target.displayName||'Member'),'Opening camera…');

    let hasCamera = false;
    try{
      hasCamera = (await navigator.mediaDevices.enumerateDevices())
        .some(d => d.kind === 'videoinput');
    }catch{}

    await createCallerPeer(ref, hasCamera);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    await setDoc(ref,{
      callerId:user.uid,
      calleeId:target.uid,
      callerName:displayName(user),
      callerPhotoURL:user.photoURL||'',
      calleeName:target.displayName||'Member',
      media:'video',
      status:'ringing',
      offer:{type:offer.type,sdp:offer.sdp},
      createdAt:serverTimestamp(),
      updatedAt:serverTimestamp()
    });

    showActive('Video call to '+(target.displayName||'Member'),
      hasCamera ? 'Ringing…' : 'Ringing • Remote video requested…');

    listenCall(ref,true);
  }catch(e){
    console.error('startCall',e);
    alert(mediaError(e));
    if(callRef) try{await deleteDoc(callRef)}catch{}
    callRef = null;
    cleanup();
    hideActive();
  }
}

function listenCall(ref, callerSide){
  if(stopCall) stopCall();
  stopCall = onSnapshot(ref, async snap => {
    if(!snap.exists()){ endLocal(); return; }
    const d = snap.data();

    if(d.status === 'declined'){
      alert('The call was declined.');
      endLocal();
      return;
    }
    if(d.status === 'ended'){
      endLocal();
      return;
    }

    if(callerSide && d.answer && pc && !pc.currentRemoteDescription){
      await pc.setRemoteDescription(new RTCSessionDescription(d.answer));
      await flushIce();
      $('vcStatus').textContent = 'Connected';
    }
  }, e => console.error('Call listener',e));
}

async function acceptIncoming(){
  if(!incomingId || callRef) return;

  const id = incomingId;
  hideIncoming();
  incomingId = null;
  const ref = doc(db,'videoCalls',id);

  try{
    const snap = await getDoc(ref);
    if(!snap.exists()) return;
    const d = snap.data();
    if(d.calleeId !== user.uid || d.status !== 'ringing') return;

    callRef = ref;
    showActive('Video call with '+(d.callerName||'Member'),'Connecting…');

    await createCalleePeer(ref,d.offer);

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    await updateDoc(ref,{
      status:'accepted',
      calleeMedia:localStream.getVideoTracks().length ? 'video' : 'audio',
      answer:{type:answer.type,sdp:answer.sdp},
      updatedAt:serverTimestamp()
    });

    listenCall(ref,false);
    $('vcStatus').textContent = 'Connected';
    await flushIce();
  }catch(e){
    console.error('acceptIncoming',e);
    alert(mediaError(e));
    try{await updateDoc(ref,{status:'ended',updatedAt:serverTimestamp()})}catch{}
    endLocal();
  }
}

async function declineIncoming(){
  const id = incomingId;
  hideIncoming();
  incomingId = null;
  if(!id) return;
  try{
    const ref = doc(db,'videoCalls',id);
    const snap = await getDoc(ref);
    if(snap.exists() && snap.data().calleeId === user.uid)
      await updateDoc(ref,{status:'declined',updatedAt:serverTimestamp()});
  }catch(e){ console.error('decline',e); }
}

async function endCall(notify=true){
  const ref = callRef;
  if(notify && ref){
    try{await updateDoc(ref,{status:'ended',updatedAt:serverTimestamp()})}catch{}
  }
  endLocal();
}
function endLocal(){
  const ref = callRef;
  callRef = null;
  cleanup();
  hideActive();
  // Keep the signaling document briefly so the other device has
  // time to receive the final status even on a slow connection.
  if(ref) setTimeout(async()=>{
    try{
      const s = await getDoc(ref);
      if(s.exists() && ['ended','declined'].includes(s.data().status))
        await deleteDoc(ref);
    }catch{}
  },15000);
}

function toggleMute(){
  const t = localStream?.getAudioTracks?.()[0];
  if(!t) return;
  t.enabled = !t.enabled;
  $('vcMute').textContent = t.enabled ? '🎙 Mute' : '🔇 Unmute';
}
function toggleCamera(){
  const t = localStream?.getVideoTracks?.()[0];
  if(!t) return;
  t.enabled = !t.enabled;
  $('vcCamera').textContent = t.enabled ? '📷 Camera' : '🚫 Camera';
}

function watchIncoming(){
  if(stopIncoming){stopIncoming(); stopIncoming=null;}
  if(!isReal()) return;

  // Only watch active ringing calls addressed to this user.
  // Filtering by status also prevents old ended/declined documents
  // from interfering with the incoming-call UI.
  const q = query(
    collection(db,'videoCalls'),
    where('calleeId','==',user.uid),
    where('status','==','ringing')
  );

  stopIncoming = onSnapshot(q, snap => {
    if(!isReal()) return;

    const ringing = [];
    snap.forEach(s => {
      const d = s.data();
      if(d.calleeId === user.uid && d.status === 'ringing'){
        ringing.push({id:s.id, data:d});
      }
    });

    // Prefer the newest ringing call if more than one exists.
    ringing.sort((a,b) => {
      const ta = a.data.createdAt?.toMillis?.() || 0;
      const tb = b.data.createdAt?.toMillis?.() || 0;
      return tb - ta;
    });

    if(callRef){
      hideIncoming();
      incomingId = null;
      return;
    }

    if(ringing.length){
      const next = ringing[0];
      if(incomingId !== next.id){
        incomingId = next.id;
        showIncoming(next.data);
        console.log('[TUBAL HUB] Incoming call:', next.id, next.data.callerName || 'Member');
      }
    }else{
      hideIncoming();
      incomingId = null;
    }
  }, e => {
    console.error('[TUBAL HUB] Incoming call listener', e);
    hideIncoming();
    incomingId = null;
  });
}

function addButtons(){
  const list=$('memberList');
  if(!list || !isReal()) return;
  list.querySelectorAll('.member').forEach(div=>{
    const uid=div.dataset.uid;
    if(!uid || uid===user.uid || div.querySelector('.vc-call-btn')) return;
    const b=document.createElement('button');
    b.type='button'; b.className='vc-call-btn';
    b.title='Video call'; b.textContent='📹';
    b.onclick=()=>{
      const name=div.querySelector('.member-info b')?.textContent||'Member';
      const img=div.querySelector('.mini img');
      startCall({uid,displayName:name,photoURL:img?.src||''});
    };
    div.appendChild(b);
  });
}

function observeMembers(){
  const list=$('memberList');
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
    incomingId=null;
    return;
  }
  watchIncoming();
  addButtons();
});
