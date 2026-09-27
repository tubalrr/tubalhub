// TUBAL HUB — Hamburger navigation drawer + LifeHub features
(function(){
  const root = document.querySelector('.hub-home');
  const sidebar = document.getElementById('tubalSidebar');
  const trigger = document.getElementById('sidebarMenuTrigger');
  const backdrop = document.getElementById('sidebarBackdrop');
  const closeBtn = document.getElementById('sidebarClose');

  if(!root || !sidebar || !trigger) return;

  const nav = sidebar.querySelector('.side-nav');
  const systemGroup = nav?.querySelector('.side-group:last-child');

  // LifeHub tools are real TUBAL HUB navigation features.
  const features = [
    {
      label:'Calendar',
      href:'pages/calendar.html',
      title:'LifeHub Calendar',
      icon:'<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M8 3v4M16 3v4M4 10h16M8 14h2M13 14h3M8 17h2M13 17h3"/>'
    },
    {
      label:'Knowledge Vault',
      href:'pages/notes.html',
      title:'LifeHub Notes / Knowledge Vault',
      icon:'<path d="M6 4h12v16H6z"/><path d="M9 8h6M9 12h6M9 16h4"/>'
    }
  ];

  if(systemGroup){
    features.slice().reverse().forEach(feature=>{
      if(systemGroup.querySelector('[data-label="'+feature.label+'"]')) return;
      const link=document.createElement('a');
      link.href=feature.href;
      link.dataset.label=feature.label;
      link.title=feature.title;
      link.setAttribute('aria-label',feature.title);
      link.innerHTML='<b class="side-icon"><svg viewBox="0 0 24 24" aria-hidden="true">'+feature.icon+'</svg></b><span>'+feature.label+'</span>';
      systemGroup.insertBefore(link, systemGroup.firstElementChild);
    });
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