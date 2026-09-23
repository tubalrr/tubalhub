document.addEventListener('DOMContentLoaded',()=>{const box=document.querySelector('#cookieBox'),accept=document.querySelector('#acceptCookie');if(localStorage.getItem('tubalCookie')==='accepted')box?.classList.add('hidden');accept?.addEventListener('click',()=>{box?.classList.add('hidden');try{localStorage.setItem('tubalCookie','accepted')}catch(_){}},{passive:true});const menu=document.querySelector('.menu-btn'),nav=document.querySelector('.nav');menu?.addEventListener('click',()=>{nav?.classList.toggle('open');if(nav?.classList.contains('open')){nav.style.display='flex';nav.style.flexDirection='column';nav.style.position='absolute';nav.style.top='78px';nav.style.left='0';nav.style.right='0';nav.style.padding='12px';nav.style.background='rgba(3,5,4,.97)';nav.style.borderBottom='1px solid #183b29'}else{nav.style.display=''}});});
document.querySelectorAll('header nav a').forEach(a=>{if(a.href===location.href)a.classList.add('active')});

/* TUBAL HUB — GLOBAL THEME SWITCHER */
(function(){
  const KEY='tubalHubTheme';
  const AUTO='tubalHubAutoTheme';
  const root=document.documentElement;
  const body=document.body;
  const systemTheme=()=>window.matchMedia('(prefers-color-scheme: light)').matches?'forest':'galaxy';
  function applyTheme(theme){
    const chosen=theme==='auto'?systemTheme():(theme||'galaxy');
    body.classList.remove('theme-forest','theme-galaxy','theme-neon','theme-aurora','theme-nebula','theme-nexus');
    body.classList.add('theme-'+chosen);
    root.dataset.tubalTheme=chosen;
    window.dispatchEvent(new CustomEvent('tubalhubthemechange',{detail:{theme:chosen}}));
  }
  function getSaved(){return localStorage.getItem(KEY)||'galaxy'}
  function applySaved(){applyTheme(localStorage.getItem(AUTO)==='1'?'auto':getSaved())}
  applySaved();
  const media=window.matchMedia('(prefers-color-scheme: light)');
  media.addEventListener?.('change',()=>{if(localStorage.getItem(AUTO)==='1')applyTheme('auto')});

  const settings=document.querySelector('.settings-page');
  if(!settings)return;
  const cards=[...document.querySelectorAll('.theme-option')];
  const auto=document.getElementById('autoTheme');
  const toast=document.getElementById('toast');
  let selected=localStorage.getItem(KEY)||'galaxy';
  if(localStorage.getItem(AUTO)==='1')auto.checked=true;
  function select(theme){selected=theme;cards.forEach(card=>card.classList.toggle('selected',card.dataset.theme===theme));applyTheme(theme)}
  select(selected);
  auto?.addEventListener('change',()=>{localStorage.setItem(AUTO,auto.checked?'1':'0');applyTheme(auto.checked?'auto':selected);showToast(auto.checked?'Auto Theme enabled.':'Auto Theme disabled.')});
  cards.forEach(card=>card.addEventListener('click',()=>{auto.checked=false;localStorage.setItem(AUTO,'0');select(card.dataset.theme)}));
  document.getElementById('previewBtn')?.addEventListener('click',()=>showToast('Preview applied instantly.'));
  document.getElementById('saveBtn')?.addEventListener('click',()=>{localStorage.setItem(KEY,selected);localStorage.setItem(AUTO,auto.checked?'1':'0');applyTheme(auto.checked?'auto':selected);showToast('Theme saved successfully.')} );
  document.getElementById('resetBtn')?.addEventListener('click',()=>{selected='galaxy';auto.checked=false;localStorage.setItem(KEY,'galaxy');localStorage.setItem(AUTO,'0');select('galaxy');showToast('Theme reset to Galaxy default.')} );
  function showToast(message){if(!toast)return;toast.textContent=message;toast.classList.add('show');clearTimeout(window.__tubalThemeToast);window.__tubalThemeToast=setTimeout(()=>toast.classList.remove('show'),1800)}
})();

/* TUBAL HUB — load chatbot globally */
(function(){const load=()=>{if(document.querySelector('script[data-tubal-chatbot]'))return;const s=document.createElement('script');s.src='/tubalhub/assets/js/chatbot.js?v=20260923';s.defer=true;s.dataset.tubalChatbot='1';document.head.appendChild(s)};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(load,150),{once:true});else setTimeout(load,150)})();

/* TUBAL HUB — site-wide video calling */
(function(){
  const load=()=>{
    if(!document.querySelector('link[data-tubal-video-call-css]')){
      const css=document.createElement('link');
      css.rel='stylesheet';
      css.href='/tubalhub/assets/css/video-call.css?v=20260923-callfix2';
      css.dataset.tubalVideoCallCss='1';
      document.head.appendChild(css);
    }
    if(document.querySelector('script[data-tubal-video-call]'))return;
    const s=document.createElement('script');
    s.type='module';
    s.src='/tubalhub/assets/js/video-call.js?v=20260923-callfix2';
    s.dataset.tubalVideoCall='1';
    document.head.appendChild(s);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});
  else load();
})();

/* TUBAL HUB — site-wide online presence */
(function(){
  const load=()=>{
    if(document.querySelector('script[data-tubal-presence]'))return;
    const s=document.createElement('script');
    s.type='module';
    s.src='/tubalhub/assets/js/presence.js?v=20260923';
    s.dataset.tubalPresence='1';
    document.head.appendChild(s);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});
  else load();
})();

/* TUBAL HUB — COPYRIGHT / COPY PROTECTION NOTICE
   Deterrence only: public HTML/CSS/JS can still be inspected or copied.
*/
(function(){
  const BRAND='TUBAL HUB', LICENSE_URL='/tubalhub/pages/license.html';
  try{console.warn('%c'+BRAND+' — Protected Website%c\\nUnauthorized copying, redistribution, resale, or substantially similar public use may violate the TUBAL HUB License.\\nLicense: '+location.origin+LICENSE_URL,'font-weight:900;color:#8b7cff','color:inherit')}catch(_){}
  document.addEventListener('contextmenu',e=>{if(!e.target.closest('input,textarea,[contenteditable="true"]'))e.preventDefault()});
  document.addEventListener('dragstart',e=>{if(e.target.closest('img'))e.preventDefault()});
  document.addEventListener('copy',e=>{
    const sel=window.getSelection?.(); if(!sel||!String(sel).trim())return;
    try{e.clipboardData.setData('text/plain',String(sel)+'\\n\\n© 2026 TUBAL HUB — All rights reserved.\\n'+location.origin+LICENSE_URL);e.preventDefault()}catch(_){}
  });
  window.addEventListener('keydown',e=>{
    const k=String(e.key||'').toLowerCase();
    if((e.ctrlKey||e.metaKey)&&['u','s'].includes(k)){e.preventDefault();return}
    if(e.ctrlKey&&e.shiftKey&&['i','j','c'].includes(k))e.preventDefault();
  });
  window.TUBAL_HUB_LICENSE={name:BRAND,copyright:'© 2026 TUBAL HUB',license:LICENSE_URL};
})();

/* TUBAL HUB — site-wide Messenger floating chat */
(function(){
  const load=()=>{
    if(!document.querySelector('link[data-tubal-floating-msg-css]')){
      const css=document.createElement('link');
      css.rel='stylesheet';
      css.href='/tubalhub/assets/css/floating-messenger.css?v=20260923-msg2';
      css.dataset.tubalFloatingMsgCss='1';
      document.head.appendChild(css);
    }
    if(document.querySelector('script[data-tubal-floating-msg]')) return;
    const s=document.createElement('script');
    s.type='module';
    s.src='/tubalhub/assets/js/floating-messenger.js?v=20260923-msg2';
    s.dataset.tubalFloatingMsg='1';
    document.head.appendChild(s);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});
  else load();
})();
