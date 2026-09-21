/* TUBAL HUB — GLOBAL THEME ENGINE v2 */
(function(){
  const KEY='tubalHubTheme', AUTO='tubalHubAutoTheme';
  const root=document.documentElement;
  const themes={
    galaxy:{bg:'#03020b',panel:'#0b0720',panel2:'#100a2c',line:'#38285f',text:'#f4f0ff',muted:'#aaa3bd',accent:'#a78bff',accent2:'#63dfff'},
    forest:{bg:'#06110a',panel:'#0c1c11',panel2:'#102719',line:'#2a5132',text:'#f1faef',muted:'#a8b9ac',accent:'#a9f27a',accent2:'#5dff9a'},
    neon:{bg:'#020604',panel:'#07140d',panel2:'#0b1b12',line:'#214a32',text:'#f5fff6',muted:'#a9b9af',accent:'#a8ff57',accent2:'#1dff91'}
  };
  function system(){return window.matchMedia('(prefers-color-scheme: light)').matches?'forest':'galaxy'}
  function chosen(){
    const saved=localStorage.getItem(KEY);
    return localStorage.getItem(AUTO)==='1' ? system() : (themes[saved]?saved:'galaxy');
  }
  function inject(){
    if(document.getElementById('tubal-global-theme-runtime'))return;
    const s=document.createElement('style');
    s.id='tubal-global-theme-runtime';
    s.textContent=`
      body.theme-galaxy,body.theme-forest,body.theme-neon{background:var(--th-bg)!important;color:var(--th-text)!important}
      body.theme-galaxy{--th-bg:#03020b;--th-panel:#0b0720;--th-panel2:#100a2c;--th-line:#38285f;--th-text:#f4f0ff;--th-muted:#aaa3bd;--th-accent:#a78bff;--th-accent2:#63dfff}
      body.theme-forest{--th-bg:#06110a;--th-panel:#0c1c11;--th-panel2:#102719;--th-line:#2a5132;--th-text:#f1faef;--th-muted:#a8b9ac;--th-accent:#a9f27a;--th-accent2:#5dff9a}
      body.theme-neon{--th-bg:#020604;--th-panel:#07140d;--th-panel2:#0b1b12;--th-line:#214a32;--th-text:#f5fff6;--th-muted:#a9b9af;--th-accent:#a8ff57;--th-accent2:#1dff91}
      body.theme-galaxy .hub-sidebar,body.theme-forest .hub-sidebar,body.theme-neon .hub-sidebar,
      body.theme-galaxy header,body.theme-forest header,body.theme-neon header,
      body.theme-galaxy .topbar,body.theme-forest .topbar,body.theme-neon .topbar,
      body.theme-galaxy .hub-topbar,body.theme-forest .hub-topbar,body.theme-neon .hub-topbar{
        background:linear-gradient(180deg,var(--th-panel),var(--th-bg))!important;border-color:var(--th-line)!important;color:var(--th-text)!important
      }
      body.theme-galaxy .card,body.theme-forest .card,body.theme-neon .card,
      body.theme-galaxy .panel,body.theme-forest .panel,body.theme-neon .panel,
      body.theme-galaxy .theme-panel,body.theme-forest .theme-panel,body.theme-neon .theme-panel,
      body.theme-galaxy .auth-card,body.theme-forest .auth-card,body.theme-neon .auth-card,
      body.theme-galaxy article,body.theme-forest article,body.theme-neon article{
        background:linear-gradient(145deg,var(--th-panel),var(--th-bg))!important;border-color:var(--th-line)!important;color:var(--th-text)!important
      }
      body.theme-galaxy h1,body.theme-galaxy h2,body.theme-galaxy h3,body.theme-galaxy h4,body.theme-galaxy p,
      body.theme-forest h1,body.theme-forest h2,body.theme-forest h3,body.theme-forest h4,body.theme-forest p,
      body.theme-neon h1,body.theme-neon h2,body.theme-neon h3,body.theme-neon h4,body.theme-neon p{color:var(--th-text)!important}
      body.theme-galaxy input,body.theme-galaxy textarea,body.theme-galaxy select,
      body.theme-forest input,body.theme-forest textarea,body.theme-forest select,
      body.theme-neon input,body.theme-neon textarea,body.theme-neon select{
        background:var(--th-panel)!important;color:var(--th-text)!important;border-color:var(--th-line)!important
      }
      body.theme-galaxy button.primary,body.theme-galaxy .btn,body.theme-galaxy .save,
      body.theme-forest button.primary,body.theme-forest .btn,body.theme-forest .save,
      body.theme-neon button.primary,body.theme-neon .btn,body.theme-neon .save{
        background:linear-gradient(135deg,var(--th-accent),var(--th-accent2))!important;color:#061006!important
      }
      body.theme-galaxy .sidebar a.active,body.theme-galaxy .sidebar a:hover,body.theme-galaxy .side-nav a.active,body.theme-galaxy .side-nav a:hover{background:#7b52ff33!important}
      body.theme-forest .sidebar a.active,body.theme-forest .sidebar a:hover,body.theme-forest .side-nav a.active,body.theme-forest .side-nav a:hover{background:#65c75a33!important}
      body.theme-neon .sidebar a.active,body.theme-neon .sidebar a:hover,body.theme-neon .side-nav a.active,body.theme-neon .side-nav a:hover{background:#36ff6d33!important}
    `;
    document.head.appendChild(s);
  }
  function apply(){
    const name=chosen(), t=themes[name];
    if(!t)return;
    root.dataset.tubalTheme=name;
    root.style.setProperty('--tubal-theme-bg',t.bg);
    root.style.setProperty('--tubal-theme-panel',t.panel);
    root.style.setProperty('--tubal-theme-accent',t.accent);
    const body=document.body;
    if(!body)return;
    inject();
    body.classList.remove('theme-forest','theme-galaxy','theme-neon');
    body.classList.add('theme-'+name);
  }
  function start(){
    apply();
    if(document.body.classList.contains('settings-page')){
      const cards=[...document.querySelectorAll('.theme-option')];
      const auto=document.getElementById('autoTheme');
      const save=document.getElementById('saveBtn');
      const reset=document.getElementById('resetBtn');
      const preview=document.getElementById('previewBtn');
      const toast=document.getElementById('toast');
      let selected=themes[localStorage.getItem(KEY)]?localStorage.getItem(KEY):'galaxy';
      if(localStorage.getItem(AUTO)==='1')auto.checked=true;
      function mark(){cards.forEach(c=>c.classList.toggle('selected',c.dataset.theme===selected))}
      function notify(m){if(!toast)return;toast.textContent=m;toast.classList.add('show');clearTimeout(window.__thToast);window.__thToast=setTimeout(()=>toast.classList.remove('show'),1800)}
      cards.forEach(c=>c.addEventListener('click',()=>{
        selected=c.dataset.theme;
        auto.checked=false;
        localStorage.setItem(AUTO,'0');
        localStorage.setItem(KEY,selected);
        apply();
        mark();
        notify('Theme changed: '+selected+'.');
      }));
      auto.addEventListener('change',()=>{
        localStorage.setItem(AUTO,auto.checked?'1':'0');
        apply(); notify(auto.checked?'Auto Theme enabled.':'Auto Theme disabled.');
      });
      save.addEventListener('click',()=>{localStorage.setItem(KEY,selected);localStorage.setItem(AUTO,auto.checked?'1':'0');apply();notify('Theme saved across TUBAL HUB.');});
      reset.addEventListener('click',()=>{selected='galaxy';auto.checked=false;localStorage.setItem(KEY,'galaxy');localStorage.setItem(AUTO,'0');apply();mark();notify('Galaxy theme restored.');});
      preview.addEventListener('click',()=>{apply();notify('Preview applied.');});
      mark();
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.addEventListener('storage',e=>{if(e.key===KEY||e.key===AUTO)apply()});
})();