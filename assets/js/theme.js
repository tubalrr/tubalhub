// TUBAL HUB - Theme System - FINAL
(function(){
  const THEMES = ['midnight','forest','light'];
  const STORAGE_KEY = 'tubalhub-theme';

  const getSaved = ()=>{
    const saved = localStorage.getItem(STORAGE_KEY);
    return THEMES.includes(saved) ? saved : 'midnight';
  };

  const apply = (theme)=>{
    if(!THEMES.includes(theme)) theme = 'midnight';
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    document.body?.classList.remove('theme-midnight','theme-forest','theme-light');
    document.body?.classList.add('theme-' + theme);
    localStorage.setItem(STORAGE_KEY, theme);
    document.querySelectorAll('[data-theme-btn]').forEach(btn=>{
      btn.classList.toggle('active', btn.dataset.themeBtn === theme);
      btn.setAttribute('aria-pressed', btn.dataset.themeBtn === theme ? 'true' : 'false');
    });
    window.dispatchEvent(new CustomEvent('tubalhubthemechange', {detail:{theme}}));
  };

  window.setTubalTheme = apply;

  const init = ()=>apply(getSaved());
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init, {once:true});
  }else{
    init();
  }

  document.addEventListener('click', e=>{
    const btn = e.target.closest?.('[data-theme-btn]');
    if(btn) apply(btn.dataset.themeBtn);
  });
})();
