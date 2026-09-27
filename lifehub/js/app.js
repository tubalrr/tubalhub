const KEY='lifehub-v1';const $=s=>document.querySelector(s);const $$=s=>[...document.querySelectorAll(s)];
const iso=d=>new Date(d.getFullYear(),d.getMonth(),d.getDate()).toISOString().slice(0,10);
const today=new Date();const todayISO=iso(today);
const defaults={tasks:[
{id:1,name:'Bayaran PhilHealth',date:todayISO,priority:'high',tag:'Bayaran',done:false,recurring:true},
{id:2,name:'Submit portfolio',date:todayISO,priority:'mid',tag:'Work',done:false,recurring:false},
{id:3,name:'Tawagan si Mama',date:todayISO,priority:'low',tag:'Pamilya',done:false,recurring:false},
{id:4,name:'Ayusin files',date:iso(new Date(today.getFullYear(),today.getMonth(),today.getDate()-2)),priority:'mid',tag:'Admin',done:false,recurring:false}],projects:[
{name:'Personal OS',done:7,total:10},{name:'Portfolio refresh',done:4,total:8},{name:'Home reset',done:9,total:12}],renewals:[
{name:'PhilHealth',date:iso(new Date(today.getFullYear(),today.getMonth(),today.getDate()+12))},
{name:'Driver license',date:iso(new Date(today.getFullYear(),today.getMonth(),today.getDate()+24))},
{name:'Domain renewal',date:iso(new Date(today.getFullYear(),today.getMonth(),today.getDate()+52))}],budgets:[
{name:'Food',spent:6200,limit:9000},{name:'Bills',spent:4100,limit:6000},{name:'Transport',spent:1850,limit:3000}],birthdays:[
{name:'Mama',emoji:'🌷',date:'12-03'},{name:'Ate',emoji:'🎂',date:'10-18'},{name:'Kuya',emoji:'🎈',date:'07-09'}],vault:[
{icon:'✦',title:'Idea bank',text:'Mga random idea na ayaw mong mawala.'},{icon:'⌁',title:'Useful links',text:'Links, tools at references na lagi mong hinahanap.'},{icon:'☼',title:'Life tips',text:'Small lessons na worth balikan.'},{icon:'⌘',title:'Work notes',text:'Short notes para hindi paulit-ulit ang trabaho.'}]};
let state=JSON.parse(localStorage.getItem(KEY)||'null')||defaults;
const save=()=>localStorage.setItem(KEY,JSON.stringify(state));
const fmt=d=>new Intl.DateTimeFormat('fil-PH',{month:'short',day:'numeric',year:'numeric'}).format(new Date(d+'T00:00:00'));
const daysLeft=d=>Math.ceil((new Date(d+'T00:00:00')-new Date(todayISO+'T00:00:00'))/86400000);
$('#today').textContent=new Intl.DateTimeFormat('fil-PH',{weekday:'long',month:'long',day:'numeric',year:'numeric'}).format(today);
function nav(id){$$('.section').forEach(s=>s.classList.toggle('active',s.id===id));$$('.nav-item').forEach(n=>n.classList.toggle('active',n.dataset.section===id));$('#sidebar').classList.remove('open');window.scrollTo({top:0,behavior:'smooth'})}
$$('.nav-item').forEach(n=>n.onclick=()=>nav(n.dataset.section));$$('[data-section-link]').forEach(b=>b.onclick=()=>nav(b.dataset.sectionLink));
$('#menuBtn').onclick=()=>$('#sidebar').classList.toggle('open');
function render(){renderKPIs();renderTasks();renderProjects();renderRenewals();renderFinance();renderFamily();renderVault();renderDash()}
function renderKPIs(){const overdue=state.tasks.filter(t=>!t.done&&t.date<todayISO).length,todayN=state.tasks.filter(t=>!t.done&&t.date===todayISO).length,weekEnd=new Date(today);weekEnd.setDate(today.getDate()+7);const week=state.tasks.filter(t=>!t.done&&new Date(t.date+'T00:00:00')>=today&&new Date(t.date+'T00:00:00')<weekEnd).length,ren=state.renewals.filter(r=>daysLeft(r.date)>=0&&daysLeft(r.date)<30).length;$('#kpiOverdue').textContent=overdue;$('#kpiToday').textContent=todayN;$('#kpiWeek').textContent=week;$('#kpiRenewals').textContent=ren}
function taskHTML(t){return '<div class="task '+(t.done?'done':'')+'"><input type="checkbox" '+(t.done?'checked':'')+' data-task="'+t.id+'"><div><div class="task-name">'+escapeHTML(t.name)+'</div><div class="task-meta"><span class="pill '+t.priority+'">'+t.priority+'</span><span class="pill tag">'+escapeHTML(t.tag)+'</span>'+(t.recurring?'<span title="Recurring">↻</span>':'')+'</div></div><span class="muted">'+fmt(t.date)+'</span></div>'}
function renderTasks(){const f=$('#taskFilter').value;let list=state.tasks.filter(t=>f==='all'||(f==='open'&&!t.done)||(f==='done'&&t.done)||(f===t.priority));$('#taskList').innerHTML=list.map(taskHTML).join('')||'<div class="muted">Walang tasks dito. ✦</div>';$('#taskCount').textContent=list.length+' task'+(list.length===1?'':'s');$$('[data-task]').forEach(x=>x.onchange=()=>{const t=state.tasks.find(t=>t.id==x.dataset.task);t.done=x.checked;save();render()})}
$('#taskFilter').onchange=renderTasks;
function addTask(){const name=$('#taskInput').value.trim();if(!name)return;state.tasks.unshift({id:Date.now(),name,date:todayISO,priority:$('#priorityInput').value,tag:'General',done:false,recurring:false});$('#taskInput').value='';save();render();nav('tasks')}
$('#saveTask').onclick=addTask;$('#quickAdd').onclick=()=>{nav('tasks');setTimeout(()=>$('#taskInput').focus(),80)};$('#addTaskBtn').onclick=()=>$('#taskInput').focus();$('#taskInput').onkeydown=e=>{if(e.key==='Enter')addTask()};
function renderProjects(){$('#projectGrid').innerHTML=state.projects.map(p=>{const pct=Math.round(p.done/p.total*100);return '<article class="card project"><div class="title">'+escapeHTML(p.name)+'</div><div class="progress"><i style="width:'+pct+'%"></i></div><div class="project-foot"><span>'+p.done+'/'+p.total+' tasks</span><b>'+pct+'%</b></div></article>'}).join('')}
function renderRenewals(){$('#renewalGrid').innerHTML=state.renewals.map(r=>{const d=daysLeft(r.date),cls=d<15?'high':d<30?'mid':'low';return '<article class="card renewal"><div class="title">'+escapeHTML(r.name)+'</div><div class="days">'+d+' <span>days left</span></div><div class="renewal-foot"><span>'+fmt(r.date)+'</span><span class="pill '+cls+'">'+(d<0?'Expired':d<30?'Soon':'Okay')+'</span></div></article>'}).join('')}
function renderFinance(){$('#budgetList').innerHTML=state.budgets.map(b=>{const pct=Math.min(100,Math.round(b.spent/b.limit*100));return '<div class="budget"><div class="budget-top"><span>'+escapeHTML(b.name)+'</span><strong>₱'+b.spent.toLocaleString()+' / ₱'+b.limit.toLocaleString()+'</strong></div><div class="progress"><i style="width:'+pct+'%"></i></div></div>'}).join('')}
function birthdayDays(md){const [m,d]=md.split('-').map(Number);let x=new Date(today.getFullYear(),m-1,d);if(x<new Date(today.getFullYear(),today.getMonth(),today.getDate()))x.setFullYear(today.getFullYear()+1);return Math.ceil((x-today)/86400000)}
function renderFamily(){$('#birthdayGrid').innerHTML=state.birthdays.map(b=>'<article class="birthday"><span class="countdown">'+birthdayDays(b.date)+' days</span><div class="emoji">'+b.emoji+'</div><h3>'+escapeHTML(b.name)+'</h3><p>Birthday · '+b.date+'</p></article>').join('')}
function renderVault(){$('#vaultGrid').innerHTML=state.vault.map(v=>'<article class="card vault-card"><div class="vault-icon">'+v.icon+'</div><h3>'+escapeHTML(v.title)+'</h3><p>'+escapeHTML(v.text)+'</p></article>').join('')}
function renderDash(){$('#dashTasks').innerHTML=state.tasks.filter(t=>!t.done).slice(0,4).map(t=>'<div class="compact-item"><span>'+escapeHTML(t.name)+'</span><span class="pill '+t.priority+'">'+t.priority+'</span></div>').join('')||'<div class="muted">All clear. Nice! ✦</div>';$('#dashRenewals').innerHTML=state.renewals.slice().sort((a,b)=>daysLeft(a.date)-daysLeft(b.date)).slice(0,3).map(r=>'<div class="compact-item"><span>'+escapeHTML(r.name)+'</span><span class="muted">'+daysLeft(r.date)+'d</span></div>').join('')}
function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
render();