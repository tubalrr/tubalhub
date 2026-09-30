import {auth} from "../assets/js/firebase-config.js";
import {getFirestore,doc,getDoc,setDoc,serverTimestamp} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const db=getFirestore();
const BETA_REF=doc(db,"tubalhub_config","beta");
const ADMIN_EMAIL="tubalrr@gmail.com";
const DEFAULT_ADMIN_EMAIL="range.tubal.50@gmail.com";
const TEST_VERSION="";
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

function prepareGoLive(){ toast("Legacy release action retired. Use Release Control / version.json."); }

auth.authStateReady?.().then(loadBeta).catch(()=>{});
if(!auth.authStateReady)auth.authStateReady?.().then(loadBeta).catch(()=>{});
if(!auth.authStateReady)auth.onAuthStateChanged(user=>{if(user)loadBeta();});
