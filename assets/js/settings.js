document.addEventListener('DOMContentLoaded',()=>{
  const page=document.body;
  if(!page.classList.contains('settings-page')) return;
  const key='tubalhub-settings-theme';
  const themes=['midnight','forest','galaxy'];
  const cards=[...document.querySelectorAll('[data-settings-theme]')];
  const tabs=[...document.querySelectorAll('[data-settings-tab]')];
  const sections=[...document.querySelectorAll('[data-settings-section]')];
  const toast=document.getElementById('toast');
  const auto=document.getElementById('autoTheme');
  let selected=localStorage.getItem(key);
  if(!themes.includes(selected)) selected='midnight';
  const flash=(msg)=>{
    if(!toast)return;
    toast.textContent=msg;toast.classList.add('show');
    clearTimeout(window.__settingsToast);
    window.__settingsToast=setTimeout(()=>toast.classList.remove('show'),1400);
  };
  const applyTheme=(theme,persist=true)=>{
    if(!themes.includes(theme)) theme='midnight';
    selected=theme;
    page.setAttribute('data-settings-theme',theme);
    cards.forEach(card=>{
      const active=card.dataset.settingsTheme===theme;
      card.classList.toggle('selected',active);
      card.setAttribute('aria-pressed',String(active));
    });
    if(persist)localStorage.setItem(key,theme);
  };
  const openTab=(name)=>{
    tabs.forEach(tab=>{
      const active=tab.dataset.settingsTab===name;
      tab.classList.toggle('active',active);
      tab.setAttribute('aria-current',active?'page':'false');
    });
    sections.forEach(section=>section.classList.toggle('active',section.dataset.settingsSection===name));
  };
  cards.forEach(card=>{
    card.addEventListener('click',()=>{applyTheme(card.dataset.settingsTheme);flash(card.dataset.settingsTheme==='midnight'?'NEON MIDNIGHT applied':card.dataset.settingsTheme==='forest'?'FOREST applied':'GALAXY applied');});
    card.addEventListener('pointermove',e=>{
      const r=card.getBoundingClientRect();
      card.style.setProperty('--mx',((e.clientX-r.left)/r.width*100)+'%');
      card.style.setProperty('--my',((e.clientY-r.top)/r.height*100)+'%');
    },{passive:true});
  });
  document.querySelectorAll('.settings-panel').forEach(panel=>panel.addEventListener('pointermove',e=>{
    const r=panel.getBoundingClientRect();
    panel.style.setProperty('--mx',((e.clientX-r.left)/r.width*100)+'%');
    panel.style.setProperty('--my',((e.clientY-r.top)/r.height*100)+'%');
  },{passive:true}));
  tabs.forEach(tab=>tab.addEventListener('click',()=>openTab(tab.dataset.settingsTab)));
  auto?.addEventListener('change',e=>{localStorage.setItem('tubalhub-settings-auto',e.target.checked?'1':'0');flash('Auto theme preference updated.');});
  if(auto)auto.checked=localStorage.getItem('tubalhub-settings-auto')==='1';
  document.querySelectorAll('[data-settings-save]').forEach(btn=>btn.addEventListener('click',()=>{localStorage.setItem(key,selected);flash('Settings saved.');}));
  document.getElementById('resetTheme')?.addEventListener('click',()=>{applyTheme('midnight');if(auto){auto.checked=false;localStorage.setItem('tubalhub-settings-auto','0');}flash('Appearance reset.');});
  applyTheme(selected,false);
  openTab('appearance');
});