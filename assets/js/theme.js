/* TUBAL HUB — GLOBAL THEME BOOT */
(function(){
  const KEY='tubalHubTheme', AUTO='tubalHubAutoTheme';
  const media=window.matchMedia('(prefers-color-scheme: light)');
  function apply(){
    const saved=localStorage.getItem(KEY)||'galaxy';
    const chosen=localStorage.getItem(AUTO)==='1'?(media.matches?'forest':'galaxy'):saved;
    const body=document.body;
    if(!body)return;
    body.classList.remove('theme-forest','theme-galaxy','theme-neon');
    body.classList.add('theme-'+chosen);
    document.documentElement.dataset.tubalTheme=chosen;
  }
  function ready(){apply();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
  media.addEventListener?.('change',()=>{if(localStorage.getItem(AUTO)==='1')apply()});
  window.addEventListener('storage',e=>{if(e.key===KEY||e.key===AUTO)apply()});
})();
