import {auth} from "../assets/js/firebase-config.js";
import {getFirestore,doc,getDoc,serverTimestamp,setDoc} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const db=getFirestore();
const $=id=>document.getElementById(id);
const CONFIG_PATH=["systemSettings","updateRelease"];
const VERSION_URL="../version.json";
const TEST_KEY="tubalhub_updater_test_release";
const CURRENT_FALLBACK="1.2.18";

let currentVersion=CURRENT_FALLBACK;
let config={};

function toast(message){
  const el=$("toast");
  if(!el)return;
  el.textContent=message;
  el.classList.add("show");
  setTimeout(()=>el.classList.remove("show"),3200);
}
function pad(n){return String(n).padStart(2,"0");}
function getOffsetMinutes(date,timeZone){
  try{
    const parts=new Intl.DateTimeFormat("en-US",{timeZone,timeZoneName:"longOffset",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"}).formatToParts(date);
    const tz=parts.find(x=>x.type==="timeZoneName")?.value||"GMT";
    const m=tz.match(/GMT([+-])(\d{2}):?(\d{2})?/);
    if(!m)return 0;
    return (m[1]==="-"?-1:1)*(Number(m[2])*60+Number(m[3]||0));
  }catch(_){return 0;}
}
function localInputToIso(value,timeZone){
  if(!value)return "";
  const [datePart,timePart]=value.split("T");
  const [y,mo,d]=datePart.split("-").map(Number);
  const [h,mi]=timePart.split(":").map(Number);
  let guess=Date.UTC(y,mo-1,d,h,mi,0);
  for(let i=0;i<3;i++){
    const offset=getOffsetMinutes(new Date(guess),timeZone);
    guess=Date.UTC(y,mo-1,d,h,mi,0)-offset*60000;
  }
  return new Date(guess).toISOString();
}
function isoToLocalInput(iso,timeZone){
  if(!iso)return "";
  const d=new Date(iso);
  if(Number.isNaN(d.getTime()))return "";
  const p=new Intl.DateTimeFormat("en-CA",{timeZone,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(d);
  const v=Object.fromEntries(p.filter(x=>x.type!=="literal").map(x=>[x.type,x.value]));
  return v.year+"-"+v.month+"-"+v.day+"T"+v.hour+":"+v.minute;
}
function fmt(iso,tz){
  if(!iso)return "Not scheduled";
  const d=new Date(iso);
  if(Number.isNaN(d.getTime()))return "Invalid schedule";
  return new Intl.DateTimeFormat("en-PH",{timeZone:tz||"Asia/Manila",dateStyle:"medium",timeStyle:"short"}).format(d)+" • "+(tz||"Asia/Manila");
}
function computeStatus(c){
  if(!c?.targetVersion)return "DRAFT";
  if(c.status==="CANCELLED")return "CANCELLED";
  if(c.status==="DRAFT")return "DRAFT";
  if(c.releaseAt && Date.now()>=new Date(c.releaseAt).getTime())return "LIVE";
  return "SCHEDULED";
}

async function fetchGitHubJson(url){
  const response=await fetch(url,{cache:"no-store",headers:{Accept:"application/vnd.github+json"}});
  if(!response.ok)throw new Error("GitHub API "+response.status);
  return response.json();
}
function summarizeChangedFiles(files){
  const groups={};
  const add=(title,desc,icon,type="Improved")=>{
    if(!groups[title])groups[title]={type,icon,title,desc};
  };
  for(const file of (files||[])){
    const p=String(file.filename||"").toLowerCase();
    if(/messenger|chat|global-chat/.test(p)) add("Messenger & Chat","Updated Messenger/Chat files and related behavior.","💬","Improved");
    else if(/feed|comment|reaction/.test(p)) add("Feeds & Community","Updated feed, comments, reactions, or community behavior.","📰","Improved");
    else if(/admin|updater/.test(p)) add("Admin & Updates","Updated admin controls and release/update handling.","⚙️","Improved");
    else if(/firebase|firestore|rules|function|storage/.test(p)) add("Backend & Security","Updated Firebase/backend rules, functions, or storage behavior.","🛡️","Improved");
    else if(/assets\/css|\.css$/.test(p)) add("Interface & Design","Updated interface styling and responsive layout.","🎨","Improved");
    else if(/assets\/js|\.js$/.test(p)) add("Website Functions","Updated website scripts and interactive features.","⚡","Improved");
    else if(/index\.html|pages\//.test(p)) add("Pages & Navigation","Updated website pages or navigation.","📄","Improved");
    else add("General Updates","Updated website files and functionality.","✨","Improved");
  }
  return Object.values(groups).slice(0,8);
}
async function generateAutoChangelog(){
  try{
    const head=await fetchGitHubJson("https://api.github.com/repos/tubalrr/tubalhub/commits/main");
    const currentManifest=await fetchGitHubJson("https://raw.githubusercontent.com/tubalrr/tubalhub/main/version.json?t="+Date.now());
    const until=encodeURIComponent(currentManifest.releasedAtReal||new Date().toISOString());
    const history=await fetchGitHubJson("https://api.github.com/repos/tubalrr/tubalhub/commits?path=version.json&until="+until+"&per_page=1");
    const base=history?.[0]?.sha;
    if(!base || !head?.sha || base===head.sha) return {autoChangelog:[],targetCommit:head?.sha||""};
    const comparison=await fetchGitHubJson("https://api.github.com/repos/tubalrr/tubalhub/compare/"+base+"..."+head.sha);
    const files=(comparison.files||[]).filter(f=>f.status!=="removed");
    return {autoChangelog:summarizeChangedFiles(files),targetCommit:head.sha};
  }catch(error){
    console.warn("[Updater auto changelog]",error);
    return {autoChangelog:[],targetCommit:""};
  }
}

async function fetchCurrentVersion(){
  try{
    const r=await fetch(VERSION_URL+"?t="+Date.now(),{cache:"no-store"});
    if(!r.ok)throw new Error("version.json "+r.status);
    const d=await r.json();
    currentVersion=String(d.version||CURRENT_FALLBACK).replace(/^v/,"");
  }catch(_){}
  $("updaterCurrentVersion")&&( $("updaterCurrentVersion").textContent="v"+currentVersion );
}
async function loadConfig(){
  const snap=await getDoc(doc(db,...CONFIG_PATH));
  config=snap.exists()?snap.data():{};
  renderConfig();
}
function renderConfig(){
  const tz=config.timeZone||"Asia/Manila";
  $("updaterTargetVersion").value=config.targetVersion||"";
  $("updaterReleaseAt").value=isoToLocalInput(config.releaseAt,tz);
  $("updaterTimezone").value=tz;
  $("updaterTestMode").checked=config.testMode===true;
  $("updaterTestVersion").value=config.testVersion||config.targetVersion||"9.9.99";
  $("updaterLastCheck").textContent=config.updatedAt?.toDate?fmt(config.updatedAt.toDate().toISOString(),tz):(config.updatedAt||"—");
  $("updaterStatus").textContent=computeStatus(config);
  $("updaterStatus").dataset.status=computeStatus(config);
  $("updaterScheduleText").textContent=config.releaseAt?fmt(config.releaseAt,tz):"No scheduled release";
}
async function saveConfig(statusOverride){
  const user=auth.currentUser;
  if(!user)return toast("Admin session not ready.");
  const target=String($("updaterTargetVersion").value||"").trim().replace(/^v/,"");
  const tz=$("updaterTimezone").value||"Asia/Manila";
  const releaseInput=$("updaterReleaseAt").value;
  const releaseAt=releaseInput?localInputToIso(releaseInput,tz):null;
  if(!target)return toast("Enter target version first.");
  if(releaseAt && Number.isNaN(new Date(releaseAt).getTime()))return toast("Invalid release date/time.");
  const auto=await generateAutoChangelog();
  const payload={
    targetVersion:target,
    autoChangelog:auto.autoChangelog,
    targetCommit:auto.targetCommit,
    releaseAt,
    timeZone:tz,
    status:statusOverride||"SCHEDULED",
    testMode:$("updaterTestMode").checked===true,
    testVersion:String($("updaterTestVersion").value||"9.9.99").trim().replace(/^v/,""),
    updatedAt:serverTimestamp(),
    updatedBy:user.uid,
    updatedByEmail:user.email||""
  };
  await setDoc(doc(db,...CONFIG_PATH),payload,{merge:true});
  config={...config,...payload,updatedAt:new Date().toISOString()};
  renderConfig();
  toast(payload.status==="CANCELLED"?"Scheduled release cancelled.":"Updater schedule saved.");
}
function runTest(){
  const version=String($("updaterTestVersion").value||"9.9.99").trim().replace(/^v/,"");
  if(!version)return toast("Enter a test version.");
  localStorage.setItem(TEST_KEY,JSON.stringify({
    enabled:true,
    targetVersion:version,
    releaseAt:new Date(Date.now()-1000).toISOString(),
    timeZone:"Asia/Manila",
    status:"LIVE",
    createdAt:new Date().toISOString()
  }));
  localStorage.removeItem("tubalhub_last_seen_version");
  localStorage.removeItem("tubalhub_has_update");
  toast("Updater Test Mode armed for v"+version+". Opening public site…");
  setTimeout(()=>window.open("../index.html?updaterTest=1","_blank","noopener"),250);
}
function clearTest(){
  localStorage.removeItem(TEST_KEY);
  localStorage.removeItem("tubalhub_has_update");
  toast("Updater Test Mode cleared.");
}
function checkNow(){
  $("updaterLastCheck").textContent="Checking…";
  fetchCurrentVersion().then(loadConfig).catch(e=>toast(e.message||"Check failed."));
}
$("updaterSave")?.addEventListener("click",()=>saveConfig("SCHEDULED").catch(e=>toast(e.message||"Save failed.")));
$("updaterPublishNow")?.addEventListener("click",()=>saveConfig("LIVE").catch(e=>toast(e.message||"Publish failed.")));
$("updaterCancel")?.addEventListener("click",()=>saveConfig("CANCELLED").catch(e=>toast(e.message||"Cancel failed.")));
$("updaterCheckNow")?.addEventListener("click",checkNow);
$("updaterRunTest")?.addEventListener("click",runTest);
$("updaterClearTest")?.addEventListener("click",clearTest);
$("updaterTestMode")?.addEventListener("change",async e=>{
  try{
    await setDoc(doc(db,...CONFIG_PATH),{testMode:e.target.checked,updatedAt:serverTimestamp(),updatedBy:auth.currentUser?.uid||null},{merge:true});
    toast(e.target.checked?"Test Mode enabled.":"Test Mode disabled.");
  }catch(err){e.target.checked=!e.target.checked;toast(err.message||"Unable to change Test Mode.")}
});
$("updaterTimezone")?.addEventListener("change",()=>{ if(config.releaseAt) $("updaterReleaseAt").value=isoToLocalInput(config.releaseAt,$("updaterTimezone").value); });
await fetchCurrentVersion();
await loadConfig();
