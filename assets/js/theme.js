/* TUBAL HUB — FAST GLOBAL THEME */
(function(){
  const KEY='tubalHubTheme', AUTO='tubalHubAutoTheme';
  const themes={
    galaxy:['#03020b','#0b0720','#38285f','#f4f0ff','#a78bff','#63dfff'],
    forest:['#06110a','#0c1c11','#2a5132','#f1faef','#a9f27a','#5dff9a'],
    neon:['#020604','#07140d','#214a32','#f5fff6','#a8ff57','#1dff91'],
    aurora:['#050711','#10152a','#33466a','#f4fbff','#6fffe0','#9b7cff'],
    nebula:['#010207','#080b18','#252c4a','#f5f3ff','#9d7cff','#58a6ff'],
    nexus:['#070812','#111426','#394263','#f7f9ff','#8b7cff','#55f4e8']
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
    if(b){b.classList.remove('theme-galaxy','theme-forest','theme-neon','theme-aurora','theme-nebula','theme-nexus');b.classList.add('theme-'+n);}
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
/* NEXUS AURORA PRO — particle constellation + magnetic 3D tilt */
(function(){
  let canvas,ctx,points=[],raf=0,tiltBound=false;
  function nexusParticles(){
    if(!document.body) return;
    if(!canvas){
      canvas=document.createElement('canvas');
      canvas.className='nexus-particles';
      canvas.setAttribute('aria-hidden','true');
      document.body.prepend(canvas);
      ctx=canvas.getContext('2d');
      addEventListener('resize',resize,{passive:true});
    }
    resize();
    if(!raf) draw();
  }
  function resize(){
    if(!canvas||!ctx)return;
    const d=Math.min(devicePixelRatio||1,2),w=innerWidth,h=innerHeight;
    canvas.width=w*d;canvas.height=h*d;canvas.style.width=w+'px';canvas.style.height=h+'px';ctx.setTransform(d,0,0,d,0,0);
    const count=Math.min(105,Math.max(55,Math.floor((w*h)/14000)));
    points=Array.from({length:count},()=>({x:Math.random()*w,y:Math.random()*h,vx:(Math.random()-.5)*.22,vy:(Math.random()-.5)*.22,r:.7+Math.random()*1.5}));
  }
  function draw(){
    if(!ctx){raf=0;return}
    const w=innerWidth,h=innerHeight;ctx.clearRect(0,0,w,h);
    if(document.body.classList.contains('theme-nexus')){
      for(const p of points){p.x+=p.vx;p.y+=p.vy;if(p.x<0||p.x>w)p.vx*=-1;if(p.y<0||p.y>h)p.vy*=-1}
      for(let i=0;i<points.length;i++){
        const a=points[i];
        ctx.beginPath();ctx.arc(a.x,a.y,a.r,0,Math.PI*2);ctx.fillStyle='rgba(190,245,255,.62)';ctx.fill();
        for(let j=i+1;j<points.length;j++){
          const b=points[j],dx=a.x-b.x,dy=a.y-b.y,d=Math.hypot(dx,dy);
          if(d<105){ctx.strokeStyle='rgba(139,124,255,'+(0.16*(1-d/105))+')';ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke()}
        }
      }
    }
    raf=requestAnimationFrame(draw);
  }
  function magnetic(){
    if(tiltBound)return;tiltBound=true;
    const selector='body.theme-nexus .brand-card,body.theme-nexus .live-card,body.theme-nexus .social-card,body.theme-nexus .shop-preview-card';
    document.addEventListener('pointermove',e=>{
      const el=e.target.closest?.(selector);if(!el)return;
      const r=el.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;
      el.style.transform='perspective(900px) rotateX('+(-y*7)+'deg) rotateY('+(x*9)+'deg) translate3d('+(x*5)+'px,'+(y*5)+'px,0) scale(1.012)';
    },{passive:true});
    document.addEventListener('pointerout',e=>{
      const el=e.target.closest?.(selector);if(!el||el.contains(e.relatedTarget))return;
      if(!el.matches('.brand-card:nth-child(2),.brand-card:nth-child(3)'))el.style.transform='';
    },{passive:true});
  }
  function nexusSync(){
    if(document.body.classList.contains('theme-nexus')){nexusParticles();magnetic();}
  }
  addEventListener('tubalhubthemechange',nexusSync);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',nexusSync,{once:true});else nexusSync();
})();
