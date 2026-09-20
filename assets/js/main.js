document.addEventListener('DOMContentLoaded', () => {
  const current = new URL(window.location.href);
  document.querySelectorAll('header nav a').forEach(link => {
    try {
      const target = new URL(link.href, current.href);
      if (target.pathname.replace(/\\/+$/, '') === current.pathname.replace(/\\/+$/, '')) link.classList.add('active');
    } catch (_) {}
  });

  const header = document.querySelector('header');
  const nav = header?.querySelector('nav');
  if (header && nav && !header.querySelector('.mobile-menu')) {
    const btn = document.createElement('button');
    btn.className = 'mobile-menu';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Open menu');
    btn.textContent = '☰';
    btn.addEventListener('click', () => nav.classList.toggle('mobile-open'));
    header.appendChild(btn);
  }

  const form = document.querySelector('.chat-form');
  const input = form?.querySelector('input');
  const messages = document.querySelector('.messages');
  form?.addEventListener('submit', e => {
    e.preventDefault();
    const text = input?.value.trim();
    if (!text || !messages) return;
    const item = document.createElement('div');
    item.className = 'message me';
    const b = document.createElement('b'); b.textContent = 'You';
    const p = document.createElement('p'); p.textContent = text;
    item.append(b, p); messages.appendChild(item);
    input.value = '';
    messages.scrollTop = messages.scrollHeight;
  });

  if (window.TubalHub) {
    const newsGrid = document.querySelector('[data-news-list]');
    if (newsGrid) {
      const items = TubalHub.get('news');
      if (items.length) newsGrid.innerHTML = items.map(x => `
        <article class="card"><div class="art">▣</div><div class="card-body">
          <small>${escapeHtml(x.date || 'LATEST')}</small><h3>${escapeHtml(x.title)}</h3>
          <p>${escapeHtml(x.text)}</p><a href="#">Read Article →</a>
        </div></article>`).join('');
    }
    const annGrid = document.querySelector('[data-announcements-list]');
    if (annGrid) {
      const items = TubalHub.get('announcements');
      if (items.length) annGrid.innerHTML = items.map(x => `
        <a class="community-card" href="#"><b>◈</b><h3>${escapeHtml(x.title)}</h3><p>${escapeHtml(x.text)}</p></a>`).join('');
    }
  }

  applyTubalTheme();
});

function applyTubalTheme(){
  const KEY='tubalHubTheme', AUTO='tubalHubAutoTheme';
  const media=window.matchMedia('(prefers-color-scheme: light)');
  const saved=localStorage.getItem(KEY)||'galaxy';
  const chosen=localStorage.getItem(AUTO)==='1' ? (media.matches?'forest':'galaxy') : saved;
  document.body.classList.remove('theme-forest','theme-galaxy','theme-neon');
  document.body.classList.add('theme-'+chosen);
  document.documentElement.dataset.tubalTheme=chosen;
}

window.addEventListener('storage', e => {
  if (e.key==='tubalHubTheme' || e.key==='tubalHubAutoTheme') applyTubalTheme();
});

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}
