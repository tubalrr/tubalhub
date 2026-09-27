import {auth} from "../assets/js/firebase-config.js";
import {getFirestore,doc,getDoc,setDoc,serverTimestamp} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const db=getFirestore();
const BETA_REF=doc(db,"tubalhub_config","beta");
const ADMIN_EMAIL="tubalrr@gmail.com";
const DEFAULT_ADMIN_EMAIL="range.tubal.50@gmail.com";
const TEST_VERSION="v1.2.18";
const $=id=>document.getElementById(id);

function toast(message){
  const el=$("toast"); if(!el)return;
  el.textContent=message; el.classList.add("show");
  setTimeout(()=>el.classList.remove("show"),3000);
}
function currentAdmin(){
  const u=auth.currentUser;
  return !!u && String(u.email||"").toLowerCase()===ADMIN_EMAIL;
}
function cleanEmail(value){return String(value||"").trim().toLowerCase();}
function escapeHtml(value){
  return String(value||"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
}

let betaEmails=[];
function render(){
  const list=$("betaList"); if(!list)return;
  list.innerHTML=betaEmails.length
    ? betaEmails.map((email,i)=>'<div class="beta-row"><span>'+escapeHtml(email)+'</span><button type="button" data-beta-remove="'+i+'">Remove</button></div>').join("")
    : '<div class="analytics-empty">No beta testers added.</div>';
  if($("betaStatus"))$("betaStatus").textContent=betaEmails.length+"/3 beta tester slots used.";
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
  }catch(e){
    if($("betaStatus"))$("betaStatus").textContent="Unable to load beta access: "+(e.message||"Firestore error");
  }
}

$("betaAdd")?.addEventListener("click",()=>{
  const email=cleanEmail($("betaEmailInput")?.value);
  if(!email||!email.includes("@"))return toast("Enter a valid email.");
  if(betaEmails.includes(email))return toast("Email is already a beta tester.");
  if(betaEmails.length>=3)return toast("Maximum 3 beta testers only.");
  betaEmails.push(email);
  if($("betaEmailInput"))$("betaEmailInput").value="";
  render();
});
$("betaEmailInput")?.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();$("betaAdd")?.click();}});
document.addEventListener("click",e=>{
  const b=e.target.closest("[data-beta-remove]"); if(!b)return;
  betaEmails.splice(Number(b.dataset.betaRemove),1); render();
});
$("betaSave")?.addEventListener("click",async()=>{
  if(!currentAdmin())return toast("Admin session required.");
  try{
    await setDoc(BETA_REF,{
      admin_email:DEFAULT_ADMIN_EMAIL,
      beta_emails:betaEmails.slice(0,3),
      test_version:TEST_VERSION,
      updatedAt:serverTimestamp(),
      updatedBy:auth.currentUser.uid
    },{merge:true});
    render(); toast("Beta testers saved.");
  }catch(e){toast(e.message||"Save failed.");}
});

async function prepareGoLive(){
  if(!currentAdmin())return toast("Primary admin only.");
  if(!confirm("I-Go Live v1.2.18? Makikita na ng lahat"))return;

  const button=$("betaGoLive");
  if(button){button.disabled=true;button.textContent="Preparing v1.2.18...";}

  try{
    const response=await fetch("../version.json?release="+Date.now(),{cache:"no-store"});
    if(!response.ok)throw new Error("Hindi mabasa ang current version.json.");
    const manifest=await response.json();

    const current=String(manifest.version||"").replace(/^v/i,"");
    if(current!=="1.2.17" && current!=="1.2.18"){
      throw new Error("Expected v1.2.17 before release, found v"+current+".");
    }

    manifest.version="1.2.18";
    manifest.date="2026-05-13";
    manifest.changes="Beta v1.2.18 — compact Feeds, Event and Games test release.";
    manifest.build="2026-05-13_1218";
    manifest.releasedAtReal=new Date().toISOString();
    manifest.releasedByReal=auth.currentUser?.email||"tubalrr";
    manifest.updatesReal=[
      "v1.2.18 beta release — compact Feeds, Event and Games layout.",
      ...(Array.isArray(manifest.updatesReal)?manifest.updatesReal:[])
    ];
    manifest.changelog=[
      {version:"1.2.18",date:"2026-05-13",changes:"Beta v1.2.18 — compact Feeds, Event and Games test release."},
      ...(Array.isArray(manifest.changelog)?manifest.changelog:[])
    ];

    await setDoc(BETA_REF,{
      admin_email:DEFAULT_ADMIN_EMAIL,
      beta_emails:betaEmails.slice(0,3),
      test_version:"",
      updatedAt:serverTimestamp(),
      updatedBy:auth.currentUser.uid
    },{merge:true});

    await setDoc(doc(db,"systemSettings","updateRelease"),{
      targetVersion:"1.2.18",
      releaseAt:new Date().toISOString(),
      timeZone:"Asia/Manila",
      status:"DRAFT",
      testMode:false,
      testVersion:"",
      updatedAt:serverTimestamp(),
      updatedBy:auth.currentUser.uid,
      updatedByEmail:auth.currentUser.email||""
    },{merge:true});

    localStorage.removeItem("tubalhub_test");

    const blob=new Blob([JSON.stringify(manifest,null,2)+"\n"],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;
    a.download="version-v1.2.18.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);

    if(button){
      button.textContent="⬇️ version.json ready";
      button.disabled=false;
    }
    toast("v1.2.18 release file ready. Upload it to GitHub as version.json.");
    alert("Prepared na ang v1.2.18. Na-download ang version-v1.2.18.json. I-upload/replace ito bilang version.json sa GitHub para maging live sa lahat.");
  }catch(e){
    if(button){button.disabled=false;button.textContent="✅ Go Live v1.2.18";}
    toast(e?.message||"Release preparation failed.");
    alert("Hindi naihanda ang release: "+(e?.message||"Unknown error"));
  }
}

$("betaGoLive")?.addEventListener("click",prepareGoLive);
auth.authStateReady?.().then(loadBeta).catch(()=>{});
if(!auth.authStateReady)auth.onAuthStateChanged(user=>{if(user)loadBeta();});

function mountGoLiveButton(){
  if(!currentAdmin()||document.getElementById("betaGoLive"))return;
  const b=document.createElement("button");
  b.type="button"; b.id="betaGoLive"; b.className="tubal-go-live-v1218";
  b.textContent="✅ Go Live v1.2.18";
  b.addEventListener("click",prepareGoLive);
  document.body.appendChild(b);
}
auth.onAuthStateChanged(user=>{
  if(user&&currentAdmin())mountGoLiveButton();
  else document.getElementById("betaGoLive")?.remove();
});
