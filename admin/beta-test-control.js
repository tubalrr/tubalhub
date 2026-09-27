<style>
.tubal-go-live-v1218{
  position:fixed!important;right:18px!important;bottom:18px!important;z-index:9999!important;
  height:44px!important;padding:0 18px!important;border:0!important;border-radius:18px!important;
  background:#1E1B16!important;color:#fff!important;font-weight:800!important;font-size:12px!important;
  box-shadow:0 10px 28px rgba(0,0,0,.22)!important;cursor:pointer!important;
}
.tubal-go-live-v1218:disabled{opacity:.65;cursor:wait}
@media(max-width:600px){
  .tubal-go-live-v1218{right:10px!important;bottom:max(10px,env(safe-area-inset-bottom))!important}
}
</style>import {auth} from "../assets/js/firebase-config.js";
import {getFirestore,doc,getDoc,setDoc,serverTimestamp} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import {getFunctions,httpsCallable} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-functions.js";

const db=getFirestore();
const functions=getFunctions();
const BETA_REF=doc(db,"tubаlhub_config".replace("а","a"),"beta");
const ADMIN_EMAIL="tubalrr@gmail.com";
const DEFAULT_ADMIN_EMAIL="range.tubal.50@gmail.com";
const TEST_VERSION="v1.2.18";
const PRIMARY_ADMIN="tubalrr@gmail.com";
let betaEmails=[];

const $=id=>document.getElementById(id);
function toast(message){
  const el=$("toast");if(!el)return;
  el.textContent=message;el.classList.add("show");
  setTimeout(()=>el.classList.remove("show"),3000);
}
function currentAdmin(){
  const u=auth.currentUser;
  return !!u && String(u.email||"").toLowerCase()===ADMIN_EMAIL;
}
function cleanEmail(value){
  return String(value||"").trim().toLowerCase();
}
function render(){
  const list=$("betaList");if(!list)return;
  list.innerHTML=betaEmails.length?betaEmails.map((email,i)=>
    '<div class="beta-row"><span>'+email.replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))+'</span><button type="button" data-beta-remove="'+i+'">Remove</button></div>'
  ).join(""):'<div class="analytics-empty">No beta testers added.</div>';
  $("betaStatus").textContent=betaEmails.length+"/3 beta tester slots used.";
}
async function loadBeta(){
  if(!currentAdmin())return;
  try{
    const snap=await getDoc(BETA_REF);
    if(!snap.exists()){
      await setDoc(BETA_REF,{admin_email:DEFAULT_ADMIN_EMAIL,beta_emails:[],test_version:TEST_VERSION,updatedAt:serverTimestamp(),updatedBy:auth.currentUser.uid},{merge:true});
      betaEmails=[];
    }else{
      const d=snap.data()||{};
      betaEmails=Array.isArray(d.beta_emails)?d.beta_emails.map(cleanEmail).filter(Boolean).slice(0,3):[];
    }
    render();
  }catch(e){$("betaStatus").textContent="Unable to load beta access: "+(e.message||"Firestore error");}
}
$("betaAdd")?.addEventListener("click",()=>{
  const email=cleanEmail($("betaEmailInput").value);
  if(!email||!email.includes("@"))return toast("Enter a valid email.");
  if(betaEmails.includes(email))return toast("Email is already a beta tester.");
  if(betaEmails.length>=3)return toast("Maximum 3 beta testers only.");
  betaEmails.push(email);$("betaEmailInput").value="";render();
});
$("betaEmailInput")?.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();$("betaAdd")?.click();}});
document.addEventListener("click",e=>{
  const b=e.target.closest("[data-beta-remove]");if(!b)return;
  betaEmails.splice(Number(b.dataset.betaRemove),1);render();
});
$("betaSave")?.addEventListener("click",async()=>{
  if(!currentAdmin())return toast("Admin session required.");
  if(betaEmails.length>3)return toast("Maximum 3 beta testers only.");
  try{
    await setDoc(BETA_REF,{
      admin_email:DEFAULT_ADMIN_EMAIL,
      beta_emails:betaEmails.slice(0,3),
      test_version:TEST_VERSION,
      updatedAt:serverTimestamp(),
      updatedBy:auth.currentUser.uid
    },{merge:true});
    render();toast("Beta testers saved.");
  }catch(e){toast(e.message||"Save failed.");}
});
$("betaGoLive")?.addEventListener("click",async()=>{
  if(!currentAdmin())return toast("Primary admin only.");
  if(!confirm("I-Go Live v1.2.18? Makikita na ng lahat"))return;
  const button=$("betaGoLive");
  button.disabled=true;
  button.textContent="Pushing live... 3 mins";
  try{
    const release=httpsCallable(functions,"releaseV1218Real");
    const result=await release({});
    localStorage.removeItem("tubalhub_test");
    toast("Live na! v1.2.18");
    alert("Live na! v1.2.18 - check tubalrr.github.io/tubalhub/ after 3 mins");
    location.href="../index.html?v=1.2.18";
  }catch(e){
    button.disabled=false;
    button.textContent="Go Live v1.2.18";
    toast(e?.message||"Release failed.");
    alert("Hindi na-push ang release: "+(e?.message||"Unknown error"));
  }
});ort {auth} from "../assets/js/firebase-config.js";
import {getFirestore,doc,getDoc,setDoc,serverTimestamp} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import {getFunctions,httpsCallable} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-functions.js";

const db=getFirestore();
const functions=getFunctions();
const BETA_REF=doc(db,"tubаlhub_config".replace("а","a"),"beta");
const ADMIN_EMAIL="tubalrr@gmail.com";
const DEFAULT_ADMIN_EMAIL="range.tubal.50@gmail.com";
const TEST_VERSION="v1.2.18";
const PRIMARY_ADMIN="tubalrr@gmail.com";
let betaEmails=[];

const $=id=>document.getElementById(id);
function toast(message){
  const el=$("toast");if(!el)return;
  el.textContent=message;el.classList.add("show");
  setTimeout(()=>el.classList.remove("show"),3000);
}
function currentAdmin(){
  const u=auth.currentUser;
  return !!u && String(u.email||"").toLowerCase()===ADMIN_EMAIL;
}
function cleanEmail(value){
  return String(value||"").trim().toLowerCase();
}
function render(){
  const list=$("betaList");if(!list)return;
  list.innerHTML=betaEmails.length?betaEmails.map((email,i)=>
    '<div class="beta-row"><span>'+email.replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))+'</span><button type="button" data-beta-remove="'+i+'">Remove</button></div>'
  ).join(""):'<div class="analytics-empty">No beta testers added.</div>';
  $("betaStatus").textContent=betaEmails.length+"/3 beta tester slots used.";
}
async function loadBeta(){
  if(!currentAdmin())return;
  try{
    const snap=await getDoc(BETA_REF);
    if(!snap.exists()){
      await setDoc(BETA_REF,{admin_email:DEFAULT_ADMIN_EMAIL,beta_emails:[],test_version:TEST_VERSION,updatedAt:serverTimestamp(),updatedBy:auth.currentUser.uid},{merge:true});
      betaEmails=[];
    }else{
      const d=snap.data()||{};
      betaEmails=Array.isArray(d.beta_emails)?d.beta_emails.map(cleanEmail).filter(Boolean).slice(0,3):[];
    }
    render();
  }catch(e){$("betaStatus").textContent="Unable to load beta access: "+(e.message||"Firestore error");}
}
$("betaAdd")?.addEventListener("click",()=>{
  const email=cleanEmail($("betaEmailInput").value);
  if(!email||!email.includes("@"))return toast("Enter a valid email.");
  if(betaEmails.includes(email))return toast("Email is already a beta tester.");
  if(betaEmails.length>=3)return toast("Maximum 3 beta testers only.");
  betaEmails.push(email);$("betaEmailInput").value="";render();
});
$("betaEmailInput")?.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();$("betaAdd")?.click();}});
document.addEventListener("click",e=>{
  const b=e.target.closest("[data-beta-remove]");if(!b)return;
  betaEmails.splice(Number(b.dataset.betaRemove),1);render();
});
$("betaSave")?.addEventListener("click",async()=>{
  if(!currentAdmin())return toast("Admin session required.");
  if(betaEmails.length>3)return toast("Maximum 3 beta testers only.");
  try{
    await setDoc(BETA_REF,{
      admin_email:DEFAULT_ADMIN_EMAIL,
      beta_emails:betaEmails.slice(0,3),
      test_version:TEST_VERSION,
      updatedAt:serverTimestamp(),
      updatedBy:auth.currentUser.uid
    },{merge:true});
    render();toast("Beta testers saved.");
  }catch(e){toast(e.message||"Save failed.");}
});
$("betaGoLive")?.addEventListener("click",async()=>{
  if(!currentAdmin())return toast("Admin session required.");
  if(!confirm("Set v1.2.18 release gate to LIVE? This does not change version.json yet."))return;
  try{
    await setDoc(doc(db,"systemSettings","updateRelease"),{
      targetVersion:"1.2.18",
      releaseAt:new Date().toISOString(),
      timeZone:"Asia/Manila",
      status:"LIVE",
      testMode:false,
      testVersion:"1.2.18",
      updatedAt:serverTimestamp(),
      updatedBy:auth.currentUser.uid,
      updatedByEmail:auth.currentUser.email||""
    },{merge:true});
    toast("v1.2.18 release gate is LIVE.");
  }catch(e){toast(e.message||"Go Live failed.");}
});
auth.authStateReady?.().then(loadBeta).catch(()=>{});
if(!auth.authStateReady) auth.onAuthStateChanged(user=>{if(user)loadBeta();});

function mountGoLiveButton(){
  if(!currentAdmin()||document.getElementById("betaGoLive"))return;
  const b=document.createElement("button");
  b.type="button";b.id="betaGoLive";b.className="tubal-go-live-v1218";
  b.textContent="✅ Go Live v1.2.18";
  document.body.appendChild(b);
}
auth.onAuthStateChanged(user=>{if(user&&currentAdmin())mountGoLiveButton();else document.getElementById("betaGoLive")?.remove();});
