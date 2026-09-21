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
  add('Hi! I’m TUBAL HUB AI. Ask me about the Hub, CTRLZONE, Payapang Isip, profiles, news, community, shop, or anything connected to the website.');
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
  launch.onclick=()=>{panel.classList.toggle('open');if(panel.classList.contains('open'))input.focus()};
  panel.querySelector('.tubal-bot-close').onclick=()=>panel.classList.remove('open');
  panel.querySelector('form').onsubmit=e=>{e.preventDefault();ask(input.value)};
  panel.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>ask(b.dataset.q));
})();
