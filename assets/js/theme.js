/* TUBAL HUB — FAST GLOBAL THEME */
(function(){
  const KEY='tubalHubTheme', AUTO='tubalHubAutoTheme';
  const themes={
    galaxy:['#03020b','#0b0720','#38285f','#f4f0ff','#a78bff','#63dfff'],
    forest:['#06110a','#0c1c11','#2a5132','#f1faef','#a9f27a','#5dff9a'],
    neon:['#020604','#07140d','#214a32','#f5fff6','#a8ff57','#1dff91'],
    aurora:['#050711','#10152a','#33466a','#f4fbff','#6fffe0','#9b7cff']
  };
  const system=()=>matchMedia('(prefers-color-scheme:light)').matches?'forest':'galaxy';
  const current=()=>localStorage.getItem(AUTO)==='1'?system():(themes[localStorage.getItem(KEY)]?localStorage.getItem(KEY):'galaxy');
  function apply(){
    const n=current(),t=themes[n],r=document.documentElement,b=document.body;
    r.dataset.tubalTheme=n;
    r.style.setProperty('--theme-bg',t[0]);
    r.style.setProperty('--theme-panel',t[1]);
    r.style.setProperty('--theme-line',t[2]);
    r.style.setProperty('--theme-text',t[3]);
    r.style.setProperty('--theme-accent',t[4]);
    r.style.setProperty('--theme-accent2',t[5]);
    if(b){b.classList.remove('theme-galaxy','theme-forest','theme-neon','theme-aurora');b.classList.add('theme-'+n);}
  }
  function settings(){
    if(!document.body?.classList.contains('settings-page'))return;
    const cards=document.querySelectorAll('.theme-option'),auto=document.getElementById('autoTheme');
    let selected=current();
    const toast=m=>{const x=document.getElementById('toast');if(!x)return;x.textContent=m;x.classList.add('show');clearTimeout(window.__th);window.__th=setTimeout(()=>x.classList.remove('show'),1400)};
    const mark=()=>cards.forEach(c=>c.classList.toggle('selected',c.dataset.theme===selected));
    cards.forEach(c=>c.onclick=()=>{selected=c.dataset.theme;auto.checked=false;localStorage.setItem(KEY,selected);localStorage.setItem(AUTO,'0');apply();mark();toast('Theme changed.');});
    auto.checked=localStorage.getItem(AUTO)==='1';
    auto.onchange=()=>{localStorage.setItem(AUTO,auto.checked?'1':'0');apply();toast('Theme updated.');};
    document.getElementById('saveBtn')?.addEventListener('click',()=>{localStorage.setItem(KEY,selected);localStorage.setItem(AUTO,auto.checked?'1':'0');apply();toast('Theme saved.');});
    document.getElementById('resetBtn')?.addEventListener('click',()=>{selected='galaxy';auto.checked=false;localStorage.setItem(KEY,'galaxy');localStorage.setItem(AUTO,'0');apply();mark();toast('Theme reset.');});
    document.getElementById('previewBtn')?.addEventListener('click',()=>{apply();toast('Preview applied.');});
    mark();
  }
  function boot(){apply();settings();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  addEventListener('storage',e=>{if(e.key===KEY||e.key===AUTO)apply();});
  matchMedia('(prefers-color-scheme:light)').addEventListener?.('change',()=>{if(localStorage.getItem(AUTO)==='1')apply();});
})();