const KEY='lifehub-knowledge-vault-v1';
const TYPES=[
 {id:'Notes',icon:'📝'},
 {id:"Du'as",icon:'🤲'},
 {id:'Links',icon:'🔗'},
 {id:'Places',icon:'📍'},
 {id:'Tips',icon:'💡'}
];
const samples=[
{id:1,type:'Notes',title:'Paano mag-budget 50/30/20 - Pinoy edition + padala',content:'Needs 50%, wants 30%, savings 20%. Ihiwalay muna ang padala at fixed bills bago ang wants.',tags:['budget','Pinoy','padala'],date:'2026-09-12',pinned:true},
{id:2,type:'Tips',title:'Tip: Auto-debit 1 day after sweldo',content:'I-schedule ang important bills at savings transfer the day after payday para hindi makalimutan.',tags:['money','routine'],date:'2026-09-10',pinned:true},
{id:3,type:"Du'as",title:'Daily Inspiration',content:'A short reminder to pause, be grateful, and ask for guidance before starting the day.',tags:['daily','prayer'],date:'2026-09-08',pinned:true},
{id:4,type:'Places',title:'Weekend places to explore',content:'List of calm places, cafés, parks, and nature spots to visit when planning a free weekend.',tags:['travel','weekend'],date:'',pinned:false},
{id:5,type:'Links',title:'Useful tools bookmark list',content:'Keep useful websites and references here. No calendar date needed—just a knowledge bookmark.',tags:['tools','reference'],date:'',pinned:false},
{id:6,type:'Notes',title:'Ideas for future projects',content:'Small ideas worth saving: features, layouts, content concepts, and experiments to revisit later.',tags:['ideas','projects'],date:'2026-08-30',pinned:false}
];
let notes=JSON.parse(localStorage.getItem(KEY)||'null')||samples;
let filter='All',query='';
function save(){localStorage.setItem(KEY,JSON.stringify(notes))}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function typeObj(t){return TYPES.find(x=>x.id===t)||TYPES[0]}
function dateText(d){if(!d)return 'Undated';return new Date(d+'T00:00:00').toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'})}
function matches(n){let hay=[n.title,n.content,n.type,(n.tags||[]).join(' ')].join(' ').toLowerCase();return hay.includes(query.toLowerCase())}
function card(n){let t=typeObj(n.type);return `<article class="note ${n.pinned?'pinned':''}">
<div class="note-top"><span class="type">${t.icon} ${esc(t.id)}</span><button class="pin ${n.pinned?'active':''}" title="${n.pinned?'Unpin':'Pin'}" data-pin="${n.id}">${n.pinned?'📌':'📍'}</button></div>
<h3 class="title">${esc(n.title)}</h3><div class="desc">${esc(n.content)}</div>
<div class="tags">${(n.tags||[]).map(x=>`<span class="tag">#${esc(x)}</span>`).join('')}</div><div class="date">${dateText(n.date)}</div></article>`}
function render(){
 const all=notes.filter(matches), pinned=notes.filter(n=>n.pinned&&matches(n)), rest=all.filter(n=>!n.pinned);
 const pinFeed=notes.filter(n=>n.pinned);
 document.querySelector('#app').innerHTML=`
 <main class="shell">
  <header class="top"><div><div class="eyebrow">LifeHub • Personal OS</div><h1>Notes / Knowledge Vault</h1><p class="tagline">Baul ng alam — save it now, use it later. 🧠</p></div><button class="btn" id="add">＋ Add Note</button></header>
  <div class="search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg><input id="search" value="${esc(query)}" placeholder="Search title, notes, category or tags…"><span class="key">Ctrl K</span></div>
  <div class="filters"><button class="pill ${filter==='All'?'active':''}" data-filter="All">✨ All</button>${TYPES.map(t=>`<button class="pill ${filter===t.id?'active':''}" data-filter="${t.id}">${t.icon} ${t.id}</button>`).join('')}</div>
  <section class="section"><div class="section-head"><h2>📌 Pinned / Daily Inspiration</h2><span class="muted">${pinFeed.length} pinned</span></div>
   <div class="pinned">${pinned.length?pinned.map(card).join(''):'<div class="empty">Wala pang pinned note. Pin your important notes para madaling makita dito.</div>'}</div>
  </section>
  <section class="section"><div class="section-head"><h2>Knowledge Vault</h2><span class="muted">${all.length} entries</span></div>
   <div class="vault">${rest.length?rest.map(card).join(''):'<div class="empty">Wala pang matching notes. Try another search or add a new one.</div>'}</div>
  </section>
 </main>`;
 bind();
}
function bind(){
 document.querySelector('#add').onclick=openModal;
 const s=document.querySelector('#search');s.oninput=e=>{query=e.target.value;render();const x=document.querySelector('#search');x.focus();x.setSelectionRange(query.length,query.length)};
 document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;render()});
 document.querySelectorAll('[data-pin]').forEach(b=>b.onclick=()=>{let n=notes.find(x=>x.id==b.dataset.pin);if(n){n.pinned=!n.pinned;save();render()}});
}
function openModal(){
 const m=document.querySelector('#modal');
 m.innerHTML=`<div class="dialog"><h2>Add to Knowledge Vault ✨</h2><form class="form" id="noteForm">
 <label>Type<select name="type">${TYPES.map(t=>`<option value="${t.id}">${t.icon} ${t.id}</option>`).join('')}</select></label>
 <label>Title<input name="title" required placeholder="Halimbawa: New idea worth saving"></label>
 <label>Content / notes<textarea name="content" rows="7" required placeholder="Isulat dito ang note, verse, tip, link details, place info…"></textarea></label>
 <label>Tags<input name="tags" placeholder="budget, work, idea (comma separated)"></label>
 <label>Date <span class="muted">optional — blank = Undated</span><input name="date" type="date"></label>
 <label class="check"><input name="pinned" type="checkbox"> 📌 Pin this note / Daily Inspiration</label>
 <div class="actions"><button type="button" class="btn" style="background:#fff;color:#1E1B16;border:1px solid #EEE6DB" id="cancel">Cancel</button><button class="btn">Save Note</button></div>
 </form></div>`;
 m.classList.add('show');m.setAttribute('aria-hidden','false');m.querySelector('#cancel').onclick=closeModal;
 m.onclick=e=>{if(e.target===m)closeModal()};
 m.querySelector('form').onsubmit=e=>{e.preventDefault();let f=new FormData(e.target);notes.unshift({id:Date.now(),type:f.get('type'),title:f.get('title').trim(),content:f.get('content').trim(),tags:f.get('tags').split(',').map(x=>x.trim()).filter(Boolean),date:f.get('date'),pinned:f.get('pinned')==='on'});save();closeModal();render()};
}
function closeModal(){let m=document.querySelector('#modal');m.classList.remove('show');m.innerHTML=''}
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();document.querySelector('#search')?.focus()}if(e.key==='Escape')closeModal()});
render();