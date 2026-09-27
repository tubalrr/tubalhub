// TUBAL HUB — Hamburger navigation drawer + Calendar feature
(function(){
  const root = document.querySelector('.hub-home');
  const sidebar = document.getElementById('tubalSidebar');
  const trigger = document.getElementById('sidebarMenuTrigger');
  const backdrop = document.getElementById('sidebarBackdrop');
  const closeBtn = document.getElementById('sidebarClose');

  if(!root || !sidebar || !trigger) return;

  // Add LifeHub Calendar as a real TUBAL HUB navigation feature.
  const nav = sidebar.querySelector('.side-nav');
  const systemGroup = nav?.querySelector('.side-group:last-child');
  if(systemGroup && !systemGroup.querySelector('[data-label="Calendar"]')){
    const link = document.createElement('a');
    link.href = 'pages/calendar.html';
    link.dataset.label = 'Calendar';
    link.title = 'LifeHub Calendar';
    link.setAttribute('aria-label','LifeHub Calendar');
    link.innerHTML = '<b class="side-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="16" rx="2"/><path d="M8 3v4M16 3v4M4 10h16M8 14h2M13 14h3M8 17h2M13 17h3"/></svg></b><span>Calendar</span>';
    systemGroup.insertBefore(link, systemGroup.firstElementChild);
  }

  const setOpen = (open)=>{
    root.classList.toggle('sidebar-is-open', open);
    trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
    trigger.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    trigger.setAttribute('title', open ? 'Close navigation' : 'Open navigation');
    sidebar.setAttribute('aria-hidden', open ? 'false' : 'true');
    if(open){
      document.documentElement.classList.add('tubal-sidebar-open');
      closeBtn?.focus({preventScroll:true});
    }else{
      document.documentElement.classList.remove('tubal-sidebar-open');
    }
  };

  trigger.addEventListener('click', (e)=>{
    e.preventDefault();
    e.stopPropagation();
    setOpen(!root.classList.contains('sidebar-is-open'));
  });

  closeBtn?.addEventListener('click', ()=>{
    setOpen(false);
    trigger.focus({preventScroll:true});
  });

  backdrop?.addEventListener('click', ()=>setOpen(false));

  sidebar.querySelectorAll('.side-nav a, .side-brand, .fan-btn, .social-mini a, .sidebar-user').forEach(link=>{
    link.addEventListener('click', ()=>setOpen(false));
  });

  document.addEventListener('keydown', (e)=>{
    if(e.key === 'Escape' && root.classList.contains('sidebar-is-open')){
      setOpen(false);
      trigger.focus({preventScroll:true});
    }
  });

  setOpen(false);
})();
