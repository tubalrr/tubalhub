import {auth} from "./firebase-config.js";
import {getFirestore,doc,getDoc,onSnapshot} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const db=getFirestore();
const CONFIG=doc(db,"tubаlhub_config","beta".replace("а","a"));
const TEST_KEY="tubalhub_test";
const TEST_VERSION="v1.2.18";
let isAllowed=false;
let config={admin_email:"range.tubal.50@gmail.com",beta_emails:[],test_version:TEST_VERSION};

const $=id=>document.getElementById(id);

function emailOf(user){return String(user?.email||"").trim().toLowerCase();}
function allowedEmail(email){
  const e=emailOf({email});
  return !!e && [config.admin_email,...(Array.isArray(config.beta_emails)?config.beta_emails:[])].map(x=>String(x||"").trim().toLowerCase()).includes(e);
}
function isTestStored(){return localStorage.getItem(TEST_KEY)===TEST_VERSION;}
function showBar(user){
  let bar=$("tubalBetaTestBar");
  if(!bar){
    bar=document.createElement("div");
    bar.id="tubalBetaTestBar";
    bar.className="tubal-beta-test-bar";
    bar.innerHTML='<span>👑 Admin / 🧪 Beta <b>Test v1.2.18</b></span><button type="button" id="tubalBetaStart">Start Test</button><button type="button" id="tubalBetaClose">Close Test</button>';
    document.body.appendChild(bar);
    $("tubalBetaStart").onclick=()=>applyTestMode();
    $("tubalBetaClose").onclick=()=>closeTestMode();
  }
  bar.hidden=false;
  $("tubalBetaStart").textContent=isTestStored()?"Test Active":"Start Test";
  $("tubalBetaStart").disabled=isTestStored();
}
function hideBar(){
  const bar=$("tubalBetaTestBar"); if(bar) bar.remove();
}
function applyTestMode(){
  if(!isAllowed)return;
  localStorage.setItem(TEST_KEY,TEST_VERSION);
  document.body.classList.add("test-v1218");
  showBar(auth.currentUser);
}
function closeTestMode(){
  localStorage.removeItem(TEST_KEY);
  document.body.classList.remove("test-v1218");
  location.reload();
}
function syncMode(){
  if(!isAllowed){
    localStorage.removeItem(TEST_KEY);
    document.body.classList.remove("test-v1218");
    hideBar();
    return;
  }
  if(isTestStored())document.body.classList.add("test-v1218");
  showBar(auth.currentUser);
}
onSnapshot(CONFIG,snap=>{
  if(snap.exists()) config={...config,...snap.data()};
  config.test_version=config.test_version||TEST_VERSION;
  syncMode();
},err=>console.warn("[TUBAL HUB Beta] config unavailable:",err));

onAuthStateChanged(auth,user=>{
  isAllowed=!!user&&allowedEmail(emailOf(user));
  syncMode();
});

window.tubalHubBetaTest={
  applyTestMode,
  closeTestMode,
  isAllowed:()=>isAllowed
};
