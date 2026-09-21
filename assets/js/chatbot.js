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
      const r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:q,page:location.pathname})});
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
})();
