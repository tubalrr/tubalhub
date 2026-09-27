const KEY='lifehub-library-v1';
const TYPES=['Books','Courses','Articles','Videos'];
const STATUSES=['Want to read','Reading','Finished'];
const samples=[
{id:1,type:'Books',title:'Atomic Habits',author:'James Clear',status:'Reading',rating:5,read:142,total:320,notes:'Small systems, consistent progress.',link:''},
{id:2,type:'Books',title:'The Psychology of Money',author:'Morgan Housel',status:'Want to read',rating:4,read:0,total:256,notes:'For money notes and reflections.',link:''},
{id:3,type:'Courses',title:'Web Development Fundamentals',author:'Online Course',status:'Finished',rating:5,read:100,total:100,notes:'Completed this year.',link:''},
{id:4,type:'Articles',title:'Building Better Daily Systems',author:'Saved article',status:'Finished',rating:4,read:100,total:100,notes:'Useful reference for routines.',link:''},
{id:5,type:'Videos',title:'Personal Finance Masterclass',author:'Video Course',status:'Reading',rating:5,read:46,total:100,notes:'Continue from the budgeting section.',link:''}
];
let items=JSON.parse(localStorage.getItem(KEY)||'null')||samples;
let type='All';
function save(){localStorage.setItem(KEY,JSON.stringify(items))}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function pct(x){return x.total?Math.min(100,Math.round(x.read/x.total*100)):0}
function stars(n){return '★'.repeat(n)+'☆'.repeat(5-n)}
function coverColor(t){return ({Books:'#80634e',Courses:'#687b9f',Articles:'#8a9876',Videos:'#9c7182'})[t]||'#777'}
function itemCard(x){let p=pct(x);return `<article class="item"><div class="cover" style="background:${coverColor(x.type)}"><div>${esc(x.title)}<small>${esc(x.type)}</small></div></div><h3>${esc(x.title)}</h3><div class="author">${esc(x.author||'Unknown author')}</div><div class="meta"><span class="status">${esc(x.status)}</span><span class="stars">${stars(Number(x.rating)||0)}</span></div><div class="progress"><i style="width:${p}%"></i></div><div class="progress-text"><span>${x.read||0} / ${x.total||0} ${x.type==='Videos'?'% watched':'pages'}</span><b>${p}%</b></div>${x.notes?`<p class="notes">${esc(x.notes)}</p>`:''}${x.link?`<a class="link" href="${esc(x.link)}" target="_blank" rel="noopener">Open link ↗</a>`:''}</article>`}
function render(){
 const filtered=type==='All'?items:items.filter(x=>x.type===type);
 const finished=items.filter(x=>x.status==='Finished'), reading=items.filter(x=>x.status==='Reading'), wishlist=items.filter(x=>x.status==='Want to read');
 const booksFinished=finished.filter(x=>x.type==='Books').length;
 const hoursWatched=items.filter(x=>x.type==='Videos').reduce((a,x)=>a+Math.round((x.read||0)/100*2),0);
 document.querySelector('#app').innerHTML=`<main class="shell">
<header class="top"><div><div class="eyebrow">LifeHub • Personal OS</div><h1>Personal Library</h1><p class="tagline">Knowledge in, growth out. 📚</p></div><button class="btn" id="add">＋ Add Item</button></header>
<section class="stats"><div class="stat"><div class="eyebrow">Books finished</div><b>${booksFinished}</b><span class="author">this year</span></div><div class="stat"><div class="eyebrow">Binabasa mo ngayon</div><b>${reading.length}</b><span class="author">active items</span></div><div class="stat"><div class="eyebrow">Hours watched</div><b>${hoursWatched}h</b><span class="author">estimated</span></div><div class="stat"><div class="eyebrow">Library total</div><b>${items.length}</b><span class="author">saved items</span></div></section>
<div class="tabs"><button class="tab ${type==='All'?'active':''}" data-type="All">✨ All</button>${TYPES.map(t=>`<button class="tab ${type===t?'active':''}" data-type="${t}">${t}</button>`).join('')}</div>
<section class="section"><div class="section-head"><h2>📖 Binabasa mo ngayon</h2><span class="author">${reading.length} active</span></div><div class="grid">${reading.length?reading.map(itemCard).join(''):'<div class="empty">Wala kang currently reading. Add something from your wishlist.</div>'}</div></section>
<section class="section"><div class="section-head"><h2>⭐ Wishlist / Want to read</h2><span class="author">${wishlist.length} items</span></div><div class="grid">${wishlist.length?wishlist.map(itemCard).join(''):'<div class="empty">Wishlist is empty. Add your next book, course, article, or video.</div>'}</div></section>
<section class="section"><div class="section-head"><h2>🏆 Tapos mo na, galing!</h2><span class="author">${finished.length} finished</span></div><div class="grid">${finished.length?finished.map(itemCard).join(''):'<div class="empty">Wala pang finished items. One page at a time. 💪</div>'}</div></section>
<section class="section"><div class="section-head"><h2>Library Shelves</h2><span class="author">${filtered.length} shown</span></div><div class="grid">${filtered.length?filtered.map(itemCard).join(''):'<div class="empty">No items in this shelf yet.</div>'}</div></section>
</main>`;
 bind();
}
function bind(){document.querySelector('#add').onclick=openModal;document.querySelectorAll('[data-type]').forEach(b=>b.onclick=()=>{type=b.dataset.type;render()})}
function openModal(){const m=document.querySelector('#modal');m.innerHTML=`<div class="dialog"><h2>Add Library Item ✨</h2><form class="form" id="form">
<label>Title<input name="title" required placeholder="Book, course, article, video…"></label>
<label>Author / creator<input name="author" placeholder="Author or creator"></label>
<label>Type<select name="type">${TYPES.map(t=>`<option>${t}</option>`).join('')}</select></label>
<label>Status<select name="status">${STATUSES.map(s=>`<option>${s}</option>`).join('')}</select></label>
<label>Rating<select name="rating"><option value="0">No rating</option><option value="5">★★★★★</option><option value="4">★★★★☆</option><option value="3">★★★☆☆</option><option value="2">★★☆☆☆</option><option value="1">★☆☆☆☆</option></select></label>
<label>Progress <span class="author">pages read / total, or % for video</span><input name="read" type="number" min="0" value="0" placeholder="Read / watched"></label>
<label>Total pages / 100%<input name="total" type="number" min="1" value="100"></label>
<label>Notes<textarea name="notes" rows="4" placeholder="Quick notes or takeaway…"></textarea></label>
<label>Link<input name="link" type="url" placeholder="https://…"></label>
<div class="actions"><button type="button" class="btn alt" id="cancel">Cancel</button><button class="btn">Save Item</button></div></form></div>`;m.classList.add('show');m.querySelector('#cancel').onclick=closeModal;m.onclick=e=>{if(e.target===m)closeModal()};m.querySelector('form').onsubmit=e=>{e.preventDefault();let f=new FormData(e.target);items.unshift({id:Date.now(),title:f.get('title').trim(),author:f.get('author').trim(),type:f.get('type'),status:f.get('status'),rating:Number(f.get('rating')),read:Number(f.get('read'))||0,total:Number(f.get('total'))||100,notes:f.get('notes').trim(),link:f.get('link').trim()});save();closeModal();render()}}
function closeModal(){let m=document.querySelector('#modal');m.classList.remove('show');m.innerHTML=''}
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});render();