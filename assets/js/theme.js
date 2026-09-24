// TUBAL HUB - Theme System - FINAL
(function(){
  const THEMES = ['midnight','forest','light'];
  const STORAGE_KEY = 'tubalhub-theme';

  const getSaved = ()=> {
    const saved = localStorage.getItem(STORAGE_KEY);
    return THEMES.includes(saved) ? saved : 'midnight';
  };

  const apply = (theme)=>{
    if(!THEMES.includes(theme)) theme = 'midnight';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);

    document.querySelectorAll('[data-theme-btn]').forEach(b=>{
      b.classList.toggle('active', b.dataset.themeBtn === theme);
    });
  };

  window.setTubalTheme = apply;

  const init = ()=>apply(getSaved());
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init, {once:true});
  }else{
    init();
  }

  document.addEventListener('click', (e)=>{
    const btn = e.target.closest('[data-theme-btn]');
    if(btn) apply(btn.dataset.themeBtn);
  });
})();
