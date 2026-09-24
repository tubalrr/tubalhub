// TUBAL HUB — Sidebar V3: hover-only rail + mouse spotlight
(function(){
  const sidebar = document.querySelector('.hub-sidebar');
  if(!sidebar) return;

  // Remove the old pinned state so an older session/script can never
  // leave the rail permanently expanded.
  sidebar.classList.remove('is-pinned');
  sidebar.removeAttribute('data-expanded');

  const setSpot = (e)=>{
    const rect = sidebar.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
    sidebar.style.setProperty('--sb-x', x + 'px');
    sidebar.style.setProperty('--sb-y', y + 'px');
  };

  sidebar.addEventListener('pointermove', setSpot, {passive:true});

  sidebar.addEventListener('pointerleave', ()=>{
    sidebar.style.setProperty('--sb-x', '36px');
    sidebar.style.setProperty('--sb-y', '120px');
  }, {passive:true});

  // Safety: never keep the rail expanded after the pointer leaves.
  sidebar.addEventListener('mouseleave', ()=>{
    sidebar.classList.remove('is-pinned');
    sidebar.removeAttribute('data-expanded');
  }, {passive:true});

  // Prevent the legacy expand button from reintroducing the sticky state.
  const toggle = sidebar.querySelector('.side-expand-toggle');
  toggle?.addEventListener('click', (e)=>{
    e.preventDefault();
    sidebar.classList.remove('is-pinned');
    sidebar.removeAttribute('data-expanded');
  });

  if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){
    sidebar.style.setProperty('--sb-speed', '0s');
  }
})();
