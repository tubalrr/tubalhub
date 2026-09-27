const KEY='lifehub-goals-v1';
const cats=['All','Career','Money','Health','Family','Personal'];
const samples=[
{id:1,title:'Condo Hunt',category:'Money',date:'2026-06-30',why:'Makahanap ng place na swak sa budget at future plans.',subs:['Research area','Check budget','Visit 3 units']},
{id:2,title:'Build My Portfolio',category:'Career',date:'2026-04-30',why:'Mas maipakita ang skills at projects ko.',subs:['Choose projects','Write case studies','Publish portfolio']},
{id:3,title:'Healthy Routine',category:'Health',date:'2026-09-30',why:'Mas consistent at energized araw-araw.',subs:['Walk 30 min','Drink enough water','Sleep routine']},
{id:4,title:'Family Weekend Plan',category:'Family',date:'2026-05-31',why:'Magkaroon ng intentional family time.',subs:['Pick date','Plan food','Book activity']},
{id:5,title:'Emergency Fund',category:'Money',date:'2026-12-31',why:'Mas prepared para sa unexpected expenses.',subs:['Set monthly target','Track savings','Reach year-end goal']}
];
let goals=JSON.parse(localStorage.getItem(KEY)||'null')||samples.map(g=>({...g,done:g.subs.map(()=>false)}));
let filter='All';

function save(){localStorage.setItem(KEY,JSON.stringify(goals))}
function esc(s){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function pct(g){return Math.round(g.done.filter(Boolean).length/g.done.length*100)}
function status(g){let p=pct(g);return p===100?'Done':p?'In progress':'Not started'}
function dateText(d){return new Date(d+'T00:00:00').toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'})}
function render(){
 const visible=filter==='All'?goals:goals.filter(g=>g.category===filter);
 const done=goals.filter(g=>pct(g)===100).length, overall=goals.length?Math.round(goals.reduce((a,g)=>a+pct(g),0)/goals.length):0;
 document.querySelector('#app').innerHTML=`
 <main class="shell">
  <header class="top"><div><div class="eyebrow">LifeHub • Personal OS</div><h1>Goals Tracker</h1><p class="tagline">Pangarap mo, tuparin mo. ✨</p></div><button class="btn" id="add">＋ Add Goal</button></header>
  <section class="summary"><div class="card summary-main"><div><div class="eyebrow">This year</div><div class="big">${done} <span class="muted">/ ${goals.length}</span></div><div class="muted">goals done • Malapit na!</div></div><div class="ring" style="--p:${overall}" data-p="${overall}%"></div></div><div class="card"><div class="eyebrow">Categories</div><div class="filters" style="margin-top:12px">${cats.map(c=>`<button class="pill ${filter===c?'active':''}" data-filter="${c}">${c}</button>`).join('')}</div></div></section>
  <div class="section-title"><h2>My Goals</h2><span class="muted">${visible.length} goals</span></div>
  <div class="goals">${visible.length?visible.map((g,idx)=>goalHTML(g,idx)).join(''):'<div class="card empty">Wala pa dito. Add ka muna ng goal besh ✨</div>'}</div>
  <div class="section-title"><h2>2026 Year View</h2><span class="muted">Q1 — Q4</span></div>
  <section class="card year"><div class="quarters">${[1,2,3,4].map(q=>quarterHTML(q)).join('')}</div></section>
  <div class="section-title"><h2>Vision Board</h2><span class="muted">Keep going</span></div>
  <section class="card"><div class="vision">
   <div class="vision-tile">🏡<span><b>Dream Home</b>Isipin. Planuhin. Gawin.</span></div>
   <div class="vision-tile">💼<span><b>Career Growth</b>Small steps, big progress.</span></div>
   <div class="vision-tile">💰<span><b>Financial Peace</b>Ipon pa more.</span></div>
   <div class="vision-tile">❤️<span><b>Life & Family</b>Make time for what matters.</span></div>
  </div><p class="tagline" style="text-align:center;margin:18px 0 0">“Konti pa, kaya mo yan!”</p></section>
 </main>`;
 bind();
}
function goalHTML(g){
 const p=pct(g),st=status(g);
 return `<article class="card goal ${st==='Done'?'done':''}"><div class="goal-head"><div><h3 class="goal-title">${esc(g.title)}</h3><div class="meta"><span class="badge">${esc(g.category)}</span><span class="badge">Target: ${dateText(g.date)}</span><span class="badge status">${st}</span></div></div><strong>${p}%</strong></div><div class="progress-row"><span>Progress from subtasks</span><span>${g.done.filter(Boolean).length}/${g.done.length}</span></div><div class="bar"><i style="width:${p}%"></i></div>${g.why?`<div class="why">Why: ${esc(g.why)}</div>`:''}<div class="subs">${g.subs.map((s,i)=>`<label class="sub ${g.done[i]?'done':''}"><input type="checkbox" data-id="${g.id}" data-i="${i}" ${g.done[i]?'checked':''}> ${esc(s)}</label>`).join('')}</div></article>`
}
function quarterHTML(q){
 const names=['Q1','Q2','Q3','Q4'], start=(q-1)*3+1,end=q*3;
 const list=goals.filter(g=>{let m=new Date(g.date+'T00:00:00').getMonth()+1;return m>=start&&m<=end});
 return `<div class="q"><strong>${names[q-1]}</strong>${list.length?list.map(g=>`<div class="q-item">${pct(g)===100?'✓ ':''}${esc(g.title)} <span class="muted">· ${pct(g)}%</span></div>`).join(''):'<span class="muted">No goals yet</span>'}</div>`
}
function bind(){
 document.querySelector('#add').onclick=openModal;
 document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;render()});
 document.querySelectorAll('.sub input').forEach(input=>input.onchange=()=>toggle(input.dataset.id,+input.dataset.i));
}
function toggle(id,i){
 const g=goals.find(x=>x.id==id); if(!g)return;
 const was=pct(g)===100; g.done[i]=!g.done[i]; save(); render();
 if(!was&&pct(g)===100) celebrate();
}
function openModal(){
 const m=document.querySelector('#modal');m.innerHTML=`<div class="dialog"><h2>Add Goal ✨</h2><form class="form" id="goalForm">
 <label>Goal title<input name="title" required placeholder="Halimbawa: Learn a new skill"></label>
 <label>Category<select name="category">${cats.slice(1).map(c=>`<option>${c}</option>`).join('')}</select></label>
 <label>Target date<input name="date" type="date" value="2026-12-31" required></label>
 <label>Why / motivation<textarea name="why" rows="3" placeholder="Bakit importante ito sa'yo?"></textarea></label>
 <label>Subtasks <div class="sub-inputs" id="subInputs"><input name="sub" placeholder="Research area" required><input name="sub" placeholder="Next small step"></div></label>
 <button type="button" class="btn alt" id="moreSub">＋ Add subtask</button>
 <div class="form-actions"><button type="button" class="btn alt" id="cancel">Cancel</button><button class="btn">Create Goal</button></div>
 </form></div>`;
 m.classList.add('show');m.setAttribute('aria-hidden','false');
 m.querySelector('#cancel').onclick=closeModal;
 m.onclick=e=>{if(e.target===m)closeModal()};
 m.querySelector('#moreSub').onclick=()=>{let i=document.createElement('input');i.name='sub';i.placeholder='Another small step';m.querySelector('#subInputs').appendChild(i)};
 m.querySelector('form').onsubmit=e=>{e.preventDefault();let f=new FormData(e.target),subs=[...e.target.querySelectorAll('[name=sub]')].map(x=>x.value.trim()).filter(Boolean);if(!subs.length)return;goals.push({id:Date.now(),title:f.get('title').trim(),category:f.get('category'),date:f.get('date'),why:f.get('why').trim(),subs,done:subs.map(()=>false)});save();closeModal();render()};
}
function closeModal(){const m=document.querySelector('#modal');m.classList.remove('show');m.innerHTML=''}
function celebrate(){
 const box=document.querySelector('#celebrate');box.classList.add('show');box.innerHTML='';
 for(let i=0;i<55;i++){let x=document.createElement('i');x.className='confetti';x.style.left=Math.random()*100+'vw';x.style.setProperty('--x',(Math.random()*260-130)+'px');x.style.animationDelay=Math.random()*.25+'s';x.style.transform=`rotate(${Math.random()*180}deg)`;box.appendChild(x)}
 setTimeout(()=>{box.classList.remove('show');box.innerHTML=''},1700)
}
render();