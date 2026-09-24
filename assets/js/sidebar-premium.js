// TUBAL HUB — Premium Sidebar V2 interactions
(function(){
  const sidebar = document.querySelector('.hub-sidebar');
  if(!sidebar) return;

  const toggle = sidebar.querySelector('.side-expand-toggle');

  const sync = ()=>{
    const pinned = sidebar.classList.contains('is-pinned');
    toggle?.setAttribute('aria-pressed', pinned ? 'true' : 'false');
    toggle?.setAttribute('aria-label', pinned ? 'Collapse sidebar' : 'Expand sidebar');
    toggle?.setAttribute('title', pinned ? 'Collapse sidebar' : 'Expand sidebar');
    sidebar.style.setProperty('--side-spot-x', '50%');
    sidebar.style.setProperty('--side-spot-y', '50%');
  };

  toggle?.addEventListener('click', function(e){
    e.preventDefault();
    e.stopPropagation();
    sidebar.classList.toggle('is-pinned');
    sync();
  });

  sidebar.addEventListener('pointermove', function(e){
    const rect = sidebar.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
    sidebar.style.setProperty('--side-spot-x', x + 'px');
    sidebar.style.setProperty('--side-spot-y', y + 'px');
  }, {passive:true});

  sidebar.addEventListener('pointerleave', function(){
    sidebar.style.setProperty('--side-spot-x', '50%');
    sidebar.style.setProperty('--side-spot-y', '50%');
  });

  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape' && sidebar.classList.contains('is-pinned')){
      sidebar.classList.remove('is-pinned');
      sync();
    }
  });

  document.addEventListener('pointerdown', function(e){
    if(!sidebar.classList.contains('is-pinned')) return;
    if(sidebar.contains(e.target)) return;
    sidebar.classList.remove('is-pinned');
    sync();
  }, {passive:true});

  sync();
})();
