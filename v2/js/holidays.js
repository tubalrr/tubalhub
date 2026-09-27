(function(){
const API='https://date.nager.at/api/v3/PublicHolidays/';
const KEY='tubalhub_ph_holidays';
let H={items:[],year:String(new Date().getFullYear()),source:'loading'};

function cache(){try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch(e){return{}}}
function escH(v){return typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function label(x){return x.localName||x.name||'Public Holiday'}
function setH(items,source){H={items:Array.isArray(items)?items:[],year:String(new Date().getFullYear()),source};}

async function loadH(force){
 const year=String(new Date().getFullYear()), c=cache();
 if(!force&&c[year]?.items){setH(c[year].items,'cache');if(route==='calendar')render();return}
 try{
  const res=await fetch(API+year+'/PH',{headers:{Accept:'application/json'},cache:'no-store'});
  if(!res.ok)throw new Error('HTTP '+res.status);
  const items=await res.json();
  c[year]={items:items,fetchedAt:new Date().toISOString()};
  localStorage.setItem(KEY,JSON.stringify(c));
  setH(items,'api');
 }catch(e){
  if(c[year]?.items)setH(c[year].items,'cache');else setH([],'fallback');
 }
 if(route==='calendar')render();
}

window.calendar=function(){
 const d=new Date(),y=d.getFullYear(),m=d.getMonth(),first=(new Date(y,m,1).getDay()+6)%7,last=new Date(y,m+1,0).getDate();
 let cells='';
 for(let i=0;i<first;i++)cells+='<div></div>';
 for(let n=1;n<=last;n++){
  const date=iso(new Date(y,m,n)), h=H.items.find(x=>x.date===date);
  const items=[...S.events.filter(e=>e.date===date),...S.tasks.filter(t=>t.date===date).map(t=>({title:t.title,color:'blue'}))];
  cells+='<div class="day '+(date===TODAY?'today ':'')+(h?'has-holiday':'')+'"><b>'+n+'</b>'+
   (h?'<span class="chip orange" title="'+escH(label(h))+'">🇵🇭 '+escH(label(h))+'</span>':'')+
   items.slice(0,h?4:5).map(e=>'<span class="chip '+(e.color||'blue')+'">'+escH(e.title)+'</span>').join('')+'</div>';
 }
 const month=String(m+1).padStart(2,'0'), list=H.items.filter(x=>String(x.date).slice(0,7)===y+'-'+month);
 const status=H.source==='api'?'LIVE · Nager.Date':H.source==='cache'?'CACHED · Nager.Date':H.source==='loading'?'UPDATING…':'UNAVAILABLE';
 return shell('Calendar',section('YOUR DAYS','Calendar',
  '<div class="toolbar"><button class="btn" data-action="addEvent">+ Add event</button><button class="btn alt" data-action="addTask">+ Task</button></div>'+
  '<div class="prayer-line">🇵🇭 PH Holidays · '+status+' · '+list.length+' this month</div>'+
  (list.length?'<div class="card" style="margin-top:14px"><div class="head"><h3>🇵🇭 Philippine Holidays</h3><span class="muted">'+y+'</span></div>'+list.map(x=>'<div class="row"><span><b>'+fmt(x.date)+'</b><br><small class="muted">'+escH(label(x))+'</small></span><span class="pill orange">Public</span></div>').join('')+'</div>':'')+
  (S.settings.prayerGuard?'<div class="prayer-line">🕌 Prayer · Fajr '+PRAYERS.fajr+' · Dhuhr '+PRAYERS.dhuhr+' · Asr '+PRAYERS.asr+' · Maghrib '+PRAYERS.maghrib+' · Isha '+PRAYERS.isha+' <small style="margin-left:8px;opacity:.7">'+(prayerTimesMeta.source==='api'?'LIVE · AlAdhan':prayerTimesMeta.source==='loading'?'UPDATING…':'CACHED/FALLBACK')+'</small></div>':'')+
  '<div class="card" style="margin-top:14px"><div class="head"><h3>'+new Intl.DateTimeFormat('fil-PH',{month:'long',year:'numeric'}).format(d)+'</h3><span class="muted">Lun–Lin</span></div><div class="calendar-wrap"><div class="calendar-grid"><div class="weekday">Lun</div><div class="weekday">Mar</div><div class="weekday">Miy</div><div class="weekday">Huw</div><div class="weekday">Biy</div><div class="weekday">Sab</div><div class="weekday">Lin</div>'+cells+'</div></div></div>'));
};

loadH(false);
setInterval(()=>loadH(false),6*60*60*1000);
})();