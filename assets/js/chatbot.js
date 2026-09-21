/* TUBAL HUB — AI CHATBOT UI
   Secure mode: browser sends messages to /api/chat.
   Keep the AI provider API key on the server, never in this file.
*/
(function(){
  if(document.getElementById('tubalAiBot')) return;
  const css=document.createElement('link');css.rel='stylesheet';css.href='/tub alhub/assets/css/chatbot.css'.replace(' ','');document.head.appendChild(css);
  const panel=document.createElement('div');panel.id='tubalAiBot';panel.className='tubal-bot-panel';panel.innerHTML=
    '<div class="tubal-bot-head"><div class="tubal-bot-avatar">🤖</div><div><div class="tubal-bot-title">TUBAL HUB AI</div><div class="tubal-bot-status">● Online assistant</div></div><button class="tubal-bot-close" aria-label="Close">×</button></div>'+
    '<div class="tubal-bot-messages" id="tubalBotMessages"></div>'+
    '<div class="tubal-bot-quick"><button data-q="What is TUBAL HUB?">What is TUBAL HUB?</button><button data-q="What is CTRLZONE?">CTRLZONE</button><button data-q="What is Payapang Isip?">Payapang Isip</button><button data-q="How do I register?">Register</button></div>'+
    '<form class="tubal-bot-form"><input id="tubalBotInput" autocomplete="off" placeholder="Ask TUBAL HUB AI..."><button aria-label="Send">➤</button></form>';
  const launch=document.createElement('button');launch.className='tubal-bot-launch';launch.id='tubalBotLaunch';launch.setAttribute('aria-label','Open TUBAL HUB AI');launch.textContent='🤖';
  document.body.append(panel,launch);
  const messages=panel.querySelector('#tubalBotMessages'),input=panel.querySelector('#tubalBotInput');
  const AI_API_URL=window.TUBAL_AI_API_URL||'/api/chat';
  /* ADMIN MODERATION ACCESS — visible only to the configured admin account. */
  const ADMIN_EMAIL='tubalrr@gmail.com';
  let adminAuth=null,adminDb=null,adminUser=null;
  async function initAdminModeration(){
    if(location.pathname.indexOf('/admin/')===-1)return;
    try{
      const authMod=await import('/tubalhub/assets/js/firebase-config.js');
      const authApi=await import('https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js');
      const fs=await import('https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js');
      adminAuth=authMod.auth;adminDb=fs.getFirestore(authMod.app);
      authApi.onAuthStateChanged(adminAuth,u=>{
        adminUser=u&&u.email===ADMIN_EMAIL?u:null;
        if(adminUser) showAdminModeration(fs); else removeAdminModeration();
      });
    }catch(e){console.warn('[TUBAL HUB AI] admin moderation unavailable',e)}
  }
  function removeAdminModeration(){document.getElementById('tubalAdminModeration')?.remove()}
  function showAdminModeration(fs){
    if(document.getElementById('tubalAdminModeration'))return;
    const box=document.createElement('div');box.id='tubalAdminModeration';box.className='tubal-admin-mod';
    box.innerHTML='<div class="tubal-admin-title">🛡 Admin Moderation</div><select id="tubalBanMember"><option value="">Select member...</option></select><div class="tubal-admin-row"><select id="tubalBanDuration"><option value="1h">1 Hour</option><option value="6h">6 Hours</option><option value="12h">12 Hours</option><option value="1d">1 Day</option><option value="3d">3 Days</option><option value="7d">7 Days</option><option value="30d">30 Days</option><option value="permanent">Permanent</option></select><input id="tubalBanReason" placeholder="Reason (optional)"></div><button type="button" id="tubalBanBtn">🚫 Ban Member</button><button type="button" id="tubalUnbanBtn">♻️ Unban Selected</button><div id="tubalBanStatus" class="tubal-admin-status"></div>';
    panel.querySelector('.tubal-bot-quick').after(box);
    const select=box.querySelector('#tubalBanMember');
    fs.getDocs(fs.query(fs.collection(adminDb,'users'),fs.limit(200))).then(snap=>{
      snap.forEach(d=>{const x=d.data();if(d.id===adminUser.uid)return;const o=document.createElement('option');o.value=d.id;o.textContent=(x.displayName||x.email||'Member')+' — '+(x.chatStatus==='banned'?'BANNED':'ACTIVE');select.appendChild(o)});
    }).catch(e=>box.querySelector('#tubalBanStatus').textContent='Could not load members.');
    const status=box.querySelector('#tubalBanStatus');
    async function moderate(action){
      const uid=select.value;if(!uid){status.textContent='Select a member first.';return}
      const ref=fs.doc(adminDb,'users',uid);
      if(action==='unban'){
        await fs.updateDoc(ref,{chatStatus:'active',banned:false,banReason:null,bannedAt:null,bannedBy:null,banUntil:null});
        status.textContent='Member unbanned.';
        return;
      }
      const duration=box.querySelector('#tubalBanDuration').value,reason=box.querySelector('#tubalBanReason').value.trim()||'Global Chat rules violation';
      let banUntil=null;
      if(duration!=='permanent'){const hours={'1h':1,'6h':6,'12h':12,'1d':24,'3d':72,'7d':168,'30d':720};banUntil=fs.Timestamp.fromDate(new Date(Date.now()+hours[duration]*3600000));}
      await fs.updateDoc(ref,{chatStatus:'banned',banned:true,banReason:reason,bannedAt:fs.serverTimestamp(),bannedBy:adminUser.uid,banUntil});
      status.textContent=duration==='permanent'?'Member permanently banned.':'Member banned until '+banUntil.toDate().toLocaleString()+'.';
    }
    box.querySelector('#tubalBanBtn').onclick=async()=>{try{await moderate('ban')}catch(e){status.textContent='Ban failed: '+(e.code||e.message)}};
    box.querySelector('#tubalUnbanBtn').onclick=async()=>{try{await moderate('unban')}catch(e){status.textContent='Unban failed: '+(e.code||e.message)}};
  }

  const add=(text,type='bot')=>{const d=document.createElement('div');d.className='tubal-bot-msg '+type;d.textContent=text;messages.appendChild(d);messages.scrollTop=messages.scrollHeight;return d};
  add('👋 Welcome to TUBAL HUB! I’m your TUBAL HUB AI assistant. Welcome to the Hub — a place for content, community, creativity, gaming, stories, and more. How can I help you today?');
  const fallback=q=>{
    const s=q.toLowerCase();
    if(s.includes('tubal hub'))return 'TUBAL HUB is the central hub for content, community, creativity, gaming, stories, and creator projects.';
    if(s.includes('ctrlzone'))return 'CTRLZONE is the gaming-focused platform inside TUBAL HUB.';
    if(s.includes('payapang'))return 'Payapang Isip is the nature and peaceful-mind themed platform of TUBAL HUB.';
    if(s.includes('register')||s.includes('sign up'))return 'You can register through the Sign Up page in the website menu.';
    return 'I can answer website questions, but the secure AI backend is not connected yet. Your API key should stay on a server, not inside the website.';
  };
  async function ask(q){
    q=q.trim();if(!q)return;
    add(q,'user');input.value='';
    const thinking=add('Thinking…');
    try{
      const r=await fetch(AI_API_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:q,page:location.pathname})});
      if(!r.ok)throw new Error('backend');
      const data=await r.json();thinking.remove();add(String(data.reply||data.message||fallback(q)));
    }catch(e){thinking.remove();add(fallback(q));}
  }
  /* Draggable AI companion — move the launcher anywhere and remember its position. */
  let dragStart=null, moved=false;
  const savedPos=(()=>{try{return JSON.parse(localStorage.getItem('tubalAiBotPos')||'null')}catch{return null}})();
  function clampPos(x,y){
    const pad=8, w=launch.offsetWidth||58, h=launch.offsetHeight||58;
    return {x:Math.max(pad,Math.min(x,window.innerWidth-w-pad)),y:Math.max(pad,Math.min(y,window.innerHeight-h-pad))};
  }
  function setLauncherPos(x,y,save=true){
    const p=clampPos(x,y);
    launch.style.left=p.x+'px';launch.style.top=p.y+'px';
    launch.style.right='auto';launch.style.bottom='auto';
    if(save)try{localStorage.setItem('tubalAiBotPos',JSON.stringify(p))}catch{}
  }
  if(savedPos&&Number.isFinite(savedPos.x)&&Number.isFinite(savedPos.y)) setLauncherPos(savedPos.x,savedPos.y,false);

  launch.addEventListener('pointerdown',e=>{
    if(e.button!==undefined&&e.button!==0)return;
    moved=false;
    const r=launch.getBoundingClientRect();
    dragStart={x:e.clientX,y:e.clientY,left:r.left,top:r.top};
    launch.setPointerCapture?.(e.pointerId);
    launch.classList.add('dragging');
    e.preventDefault();
  });
  launch.addEventListener('pointermove',e=>{
    if(!dragStart)return;
    const dx=e.clientX-dragStart.x,dy=e.clientY-dragStart.y;
    if(Math.abs(dx)>5||Math.abs(dy)>5)moved=true;
    if(moved)setLauncherPos(dragStart.left+dx,dragStart.top+dy,false);
  });
  const endDrag=e=>{
    if(!dragStart)return;
    if(moved){
      const r=launch.getBoundingClientRect();
      setLauncherPos(r.left,r.top,true);
    }
    launch.releasePointerCapture?.(e.pointerId);
    launch.classList.remove('dragging');
    dragStart=null;
  };
  launch.addEventListener('pointerup',endDrag);
  launch.addEventListener('pointercancel',endDrag);
  launch.onclick=()=>{
    if(moved)return;
    panel.classList.toggle('open');
    if(panel.classList.contains('open'))input.focus();
  };
  window.addEventListener('resize',()=>{
    const r=launch.getBoundingClientRect();
    if(r.width)setLauncherPos(r.left,r.top,false);
  });
  panel.querySelector('.tubal-bot-close').onclick=()=>panel.classList.remove('open');
  panel.querySelector('.tubal-bot-close').onclick=()=>panel.classList.remove('open');
  panel.querySelector('form').onsubmit=e=>{e.preventDefault();ask(input.value)};
  panel.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>ask(b.dataset.q));
  initAdminModeration();
})();
