const routes=[...document.querySelectorAll('.route')];
const nav=[...document.querySelectorAll('.nav a')];
const labKey='tubalhub_personal_lab_v1';
const nowKey='tubalhub_personal_now_v1';

function routeName(){return (location.hash||'#home').slice(1).split('?')[0]||'home'}
function renderRoute(){
  const name=routeName();
  const valid=routes.some(r=>r.dataset.page===name)?name:'home';
  routes.forEach(r=>r.classList.toggle('active',r.dataset.page===valid));
  nav.forEach(a=>a.classList.toggle('active',a.dataset.route===valid));
  if(valid!==name)history.replaceState(null,'','#home');
  window.scrollTo({top:0,behavior:'smooth'});
}
window.addEventListener('hashchange',renderRoute);
renderRoute();

const sidebar=document.getElementById('sidebar');
document.getElementById('mobileMenu')?.addEventListener('click',()=>sidebar.classList.toggle('open'));
document.querySelectorAll('.nav a').forEach(a=>a.addEventListener('click',()=>sidebar.classList.remove('open')));

const themeKey='tubalhub_personal_theme';
function applyTheme(v){document.body.classList.toggle('dark',v==='dark');localStorage.setItem(themeKey,v)}
applyTheme(localStorage.getItem(themeKey)||'light');
document.getElementById('themeToggle')?.addEventListener('click',()=>applyTheme(document.body.classList.contains('dark')?'light':'dark'));

const searchModal=document.getElementById('searchModal');
const searchInput=document.getElementById('globalSearch');
const results=document.getElementById('searchResults');
const searchData=[
 ['Home','home','Ar-ar Tubal, personal homepage, Davao'],
 ['LifeHub','lifehub','Personal OS, Tasks, Calendar, Budget, Goals, Habits, Vault'],
 ['Work','work','Projects, LifeHub Template, Client Rebrands, Payapang Isip'],
 ['Links','links','GitHub, Instagram, Email, Resume'],
 ['Tubal Lab','lab','Experiments, templates, tools and ideas'],
 ['Now','now','What I am building, learning and reading']
];
function openSearch(){searchModal.classList.add('open');searchModal.setAttribute('aria-hidden','false');setTimeout(()=>searchInput.focus(),30);renderSearch('')}
function closeSearch(){searchModal.classList.remove('open');searchModal.setAttribute('aria-hidden','true')}
function renderSearch(q){const x=q.trim().toLowerCase();const list=searchData.filter(r=>!x||r.join(' ').toLowerCase().includes(x));results.innerHTML=list.map(r=>'<a class="result" href="#'+r[1]+'"><b>'+r[0]+'</b><br><span style="color:#8b8176">'+r[2]+'</span></a>').join('')||'<div class="result">Walang match. Try “LifeHub” or “Work”.</div>'}
document.getElementById('searchTrigger')?.addEventListener('click',openSearch);
document.getElementById('closeSearch')?.addEventListener('click',closeSearch);
searchModal?.addEventListener('click',e=>{if(e.target===searchModal)closeSearch()});
searchInput?.addEventListener('input',e=>renderSearch(e.target.value));
results?.addEventListener('click',closeSearch);
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openSearch()}if(e.key==='Escape')closeSearch()});

document.getElementById('copyLink')?.addEventListener('click',async()=>{
 const status=document.getElementById('copyStatus');
 try{await navigator.clipboard.writeText(location.href.split('#')[0]);status.textContent='Copied — send mo lang.'}
 catch{status.textContent='Copy unavailable. Long-press the address bar.'}
});

const defaultLabs=[
 {tag:'Template',title:'LifeHub v2',text:'Refining the personal OS into a calmer, more complete everyday system.'},
 {tag:'Experiment',title:'Tiny tools',text:'Small utilities that solve one annoying thing without adding another dashboard.'},
 {tag:'Tool',title:'Client rebrands',text:'Exploring cleaner identities, landing pages and reusable visual systems.'}
];
function loadLabs(){try{return JSON.parse(localStorage.getItem(labKey))||defaultLabs}catch{return defaultLabs}}
function saveLabs(v){localStorage.setItem(labKey,JSON.stringify(v))}
function renderLabs(){
 const grid=document.getElementById('labGrid');if(!grid)return;
 grid.innerHTML=loadLabs().map((x,i)=>'<article class="lab-card"><span class="lab-tag">'+escapeHtml(x.tag)+'</span><h3>'+escapeHtml(x.title)+'</h3><p>'+escapeHtml(x.text)+'</p><small style="color:#aaa096">#'+String(i+1).padStart(2,'0')+'</small></article>').join('')
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
renderLabs();
document.getElementById('addLab')?.addEventListener('click',()=>{
 const title=prompt('Lab title?');if(!title)return;const text=prompt('Short note?')||'Idea in progress.';const tag=prompt('Tag: Experiment, Template, or Tool','Experiment')||'Experiment';
 const labs=loadLabs();labs.push({title,text,tag});saveLabs(labs);renderLabs();
});

const defaultNow={building:'LifeHub',learning:'Better product systems',reading:'One page at a time'};
function loadNow(){try{return {...defaultNow,...JSON.parse(localStorage.getItem(nowKey))}}catch{return defaultNow}}
function renderNow(){
 const n=loadNow();
 document.getElementById('nowBuilding').textContent=n.building;
 document.getElementById('nowLearning').textContent=n.learning;
 document.getElementById('nowReading').textContent=n.reading;
 document.getElementById('editBuilding').value=n.building;
 document.getElementById('editLearning').value=n.learning;
 document.getElementById('editReading').value=n.reading;
}
renderNow();
document.getElementById('saveNow')?.addEventListener('click',()=>{
 const n={building:document.getElementById('editBuilding').value.trim()||defaultNow.building,learning:document.getElementById('editLearning').value.trim()||defaultNow.learning,reading:document.getElementById('editReading').value.trim()||defaultNow.reading};
 localStorage.setItem(nowKey,JSON.stringify(n));renderNow();
});
