// TUBAL HUB - Theme System - FINAL
(function(){
  const THEMES = ['midnight','forest','light'];
  const STORAGE_KEY = 'tubalhub-theme';
  // Storage can be blocked by browser privacy settings; theme loading must never break the page.
  const safeGet = key => { try { return window.localStorage.getItem(key); } catch (_) { return null; } };
  const safeSet = (key, value) => { try { window.localStorage.setItem(key, value); } catch (_) { /* use this session's in-memory theme */ } };

  const getSaved = ()=>{
    const saved = safeGet(STORAGE_KEY);
    return THEMES.includes(saved) ? saved : 'midnight';
  };

  const apply = (theme)=>{
    const isHomepage = document.body?.classList.contains('hub-home');
    // Keep the redesigned homepage on its fixed obsidian/crimson brand theme.
    // Preserve a saved preference for other pages that still provide a theme selector.
    if(isHomepage || !THEMES.includes(theme)) theme = 'midnight';
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    document.body?.classList.remove('theme-midnight','theme-forest','theme-light');
    document.body?.classList.add('theme-' + theme);
    if(!isHomepage) safeSet(STORAGE_KEY, theme);
    document.querySelectorAll('[data-theme-btn]').forEach(btn=>{
      btn.classList.toggle('active', btn.dataset.themeBtn === theme);
      btn.setAttribute('aria-pressed', btn.dataset.themeBtn === theme ? 'true' : 'false');
    });
    window.dispatchEvent(new CustomEvent('tubalhubthemechange', {detail:{theme}}));
  };

  function loadUpdateNotifier(){
    if(window.__tubalHubUpdateNotifierLoaded || document.querySelector('script[data-tubal-update-notifier]')) return;
    const themeScript=[...document.scripts].find(s=>/assets\/js\/theme\.js(?:\\?|$)/.test(s.src));
    if(!themeScript) return;
    const script=document.createElement("script");
    script.src=new URL("./update-notifier.js",themeScript.src).href;
    script.defer=true;
    script.dataset.tubalUpdateNotifier="1";
    document.head.appendChild(script);
  }

  window.setTubalTheme = apply;

  const init = ()=>{apply(getSaved());loadUpdateNotifier();};
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
