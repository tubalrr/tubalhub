document.addEventListener('DOMContentLoaded',()=>{const box=document.querySelector('#cookieBox'),accept=document.querySelector('#acceptCookie');if(localStorage.getItem('tubalCookie')==='accepted')box?.classList.add('hidden');accept?.addEventListener('click',()=>{localStorage.setItem('tubalCookie','accepted');box?.classList.add('hidden')});const menu=document.querySelector('.menu-btn'),nav=document.querySelector('.nav');menu?.addEventListener('click',()=>{nav?.classList.toggle('open');if(nav?.classList.contains('open')){nav.style.display='flex';nav.style.flexDirection='column';nav.style.position='absolute';nav.style.top='78px';nav.style.left='0';nav.style.right='0';nav.style.padding='12px';nav.style.background='rgba(3,5,4,.97)';nav.style.borderBottom='1px solid #183b29'}else{nav.style.display=''}});});
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
    body.classList.remove('theme-forest','theme-galaxy','theme-neon');
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
  auto?.addEventListener('change',()=>{
    localStorage.setItem(AUTO,auto.checked?'1':'0');
    applyTheme(auto.checked?'auto':selected);
    showToast(auto.checked?'Auto Theme enabled.':'Auto Theme disabled.');
  });
  cards.forEach(card=>card.addEventListener('click',()=>{auto.checked=false;localStorage.setItem(AUTO,'0');select(card.dataset.theme)}));
  document.getElementById('previewBtn')?.addEventListener('click',()=>showToast('Preview applied instantly.'));
  document.getElementById('saveBtn')?.addEventListener('click',()=>{localStorage.setItem(KEY,selected);localStorage.setItem(AUTO,auto.checked?'1':'0');applyTheme(auto.checked?'auto':selected);showToast('Theme saved successfully.')} );
  document.getElementById('resetBtn')?.addEventListener('click',()=>{selected='galaxy';auto.checked=false;localStorage.setItem(KEY,'galaxy');localStorage.setItem(AUTO,'0');select('galaxy');showToast('Theme reset to Galaxy default.')} );
  function showToast(message){if(!toast)return;toast.textContent=message;toast.classList.add('show');clearTimeout(window.__tubalThemeToast);window.__tubalThemeToast=setTimeout(()=>toast.classList.remove('show'),1800)}
})();


/* TUBAL HUB — load chatbot globally */
(function(){const s=document.createElement('script');s.src='/tubalhub/assets/js/chatbot.js?v=20260921';s.defer=true;document.head.appendChild(s)})();
