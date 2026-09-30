(() => {
  const root = document.getElementById('thHeroBotExperience');
  if (!root) return;

  const items = [
    {title:'Payapang Isip', kicker:'WELLNESS · COMMUNITY', icon:'🌿', text:'Calm digital space for journals, wellness tools, AI music, and peaceful everyday experiences.'},
    {title:'TUBAL HUB Shop', kicker:'E-COMMERCE · DIGITAL', icon:'🛒', text:'Connected shop for products, digital offerings, and Kapeng Barako.'},
    {title:'Gaming Zone', kicker:'GAMING · ENTERTAINMENT', icon:'🎮', text:'Gaming catalog, featured sessions, and the latest gaming experiences.'},
    {title:'Feeds & Community', kicker:'SOCIAL · COMMUNITY', icon:'💬', text:'Community feeds, global chat, updates, and shared conversations.'},
    {title:'AI Music', kicker:'CREATIVE · AUDIO', icon:'♫', text:'Create, save, and explore the AI Music experience inside TUBAL HUB.'},
    {title:'LifeHub & Personal OS', kicker:'PRODUCTIVITY · TOOLS', icon:'▣', text:'Personal organization tools for tasks, goals, habits, notes, and more.'},
    {title:'TUBAL HUB Core', kicker:'ONE DIGITAL ECOSYSTEM', icon:'✦', text:'One connected home that brings every TUBAL HUB experience together.'}
  ];

  const title = root.querySelector('[data-bot-title]');
  const kicker = root.querySelector('[data-bot-kicker]');
  const text = root.querySelector('[data-bot-text]');
  const icon = root.querySelector('[data-bot-icon]');
  const count = root.querySelector('[data-bot-count]');
  const bar = root.querySelector('[data-bot-progress]');
  const screen = root.querySelector('[data-bot-screen]');
  const dotWrap = root.querySelector('[data-bot-dots]');
  if (!title || !kicker || !text || !icon || !count || !bar || !screen) return;

  let index = 0;
  let timer = null;

  dotWrap.innerHTML = items.map((_, i) => '<span class="' + (i === 0 ? 'is-active' : '') + '"></span>').join('');
  const dots = [...dotWrap.children];

  function render(nextIndex, first = false) {
    index = (nextIndex + items.length) % items.length;
    const item = items[index];

    root.classList.remove('is-changing');
    if (!first) {
      void root.offsetWidth;
      root.classList.add('is-changing');
    }

    kicker.textContent = item.kicker;
    title.textContent = item.title;
    text.textContent = item.text;
    icon.textContent = item.icon;
    count.textContent = String(index + 1).padStart(2, '0') + ' / ' + String(items.length).padStart(2, '0');
    bar.style.setProperty('--bot-progress', ((index + 1) / items.length * 100) + '%');
    dots.forEach((d, i) => d.classList.toggle('is-active', i === index));

    screen.innerHTML =
      '<div class="th-bot-screen-top"><span class="th-bot-screen-dot"></span><span>TUBAL HUB LIVE PREVIEW</span></div>' +
      '<div class="th-bot-screen-title">' + item.title + '</div>' +
      '<div class="th-bot-screen-lines"><i></i><i></i><i></i></div>' +
      '<div class="th-bot-screen-card"><b>' + item.icon + '</b><span><strong>' + item.title + '</strong><small>' + item.kicker + '</small></span></div>';
  }

  function start() {
    window.clearInterval(timer);
    timer = window.setInterval(() => render(index + 1), 4200);
  }

  render(0, true);
  start();
})();
