(() => {
  const root = document.getElementById('thHeroBotExperience');
  if (!root) return;

  const items = [
    {title:'Payapang Isip', kicker:'WELLNESS · COMMUNITY', icon:'🌿', text:'Calm digital space for journals, wellness tools, AI music, and peaceful everyday experiences.', mode:'wellness'},
    {title:'TUBAL HUB Shop', kicker:'E-COMMERCE · DIGITAL', icon:'🛒', text:'Connected shop for products, digital offerings, and Kapeng Barako.', mode:'shop'},
    {title:'Gaming Zone', kicker:'GAMING · ENTERTAINMENT', icon:'🎮', text:'Gaming catalog, featured sessions, and the latest gaming experiences.', mode:'gaming'},
    {title:'Feeds & Community', kicker:'SOCIAL · COMMUNITY', icon:'💬', text:'Community feeds, global chat, updates, and shared conversations.', mode:'feeds'},
    {title:'AI Music', kicker:'CREATIVE · AUDIO', icon:'♫', text:'Create, save, and explore the AI Music experience inside TUBAL HUB.', mode:'music'},
    {title:'LifeHub & Personal OS', kicker:'PRODUCTIVITY · TOOLS', icon:'▣', text:'Personal organization tools for tasks, goals, habits, notes, and more.', mode:'life'},
    {title:'TUBAL HUB Core', kicker:'ONE DIGITAL ECOSYSTEM', icon:'✦', text:'One connected home that brings every TUBAL HUB experience together.', mode:'core'}
  ];

  const title = root.querySelector('[data-bot-title]');
  const kicker = root.querySelector('[data-bot-kicker]');
  const bodyText = root.querySelector('[data-bot-text]');
  const count = root.querySelector('[data-bot-count]');
  const bar = root.querySelector('[data-bot-progress]');
  const screen = root.querySelector('[data-bot-screen]');
  const dotWrap = root.querySelector('[data-bot-dots]');
  if (!title || !kicker || !bodyText || !count || !bar || !screen || !dotWrap) return;

  const CYCLE = 12000;
  let index = 0;
  let timer = null;
  let screenTimer = null;

  const screenDesigns = {
    wellness: () => `
      <div class="th-ui-top"><span class="th-ui-brand">PAYAPANG ISIP</span><span class="th-ui-live">● CALM</span></div>
      <div class="th-ui-wellness">
        <div class="th-ui-breathe"><i></i><b>INHALE</b><small>4s</small></div>
        <div class="th-ui-stack"><span>Journal</span><span>Breathing</span><span>AI Music</span></div>
      </div>
    `,
    shop: () => `
      <div class="th-ui-top"><span class="th-ui-brand">TUBAL HUB SHOP</span><span class="th-ui-bag">3 ITEMS</span></div>
      <div class="th-ui-shop">
        <div class="th-ui-product"><b>☕</b><span>Kapeng Barako</span><strong>₱350</strong></div>
        <div class="th-ui-product"><b>◈</b><span>Digital Pack</span><strong>₱199</strong></div>
        <div class="th-ui-product is-featured"><b>✦</b><span>Starter Bundle</span><strong>VIEW</strong></div>
      </div>
    `,
    gaming: () => `
      <div class="th-ui-top"><span class="th-ui-brand">GAMING ZONE</span><span class="th-ui-hud">LIVE CATALOG</span></div>
      <div class="th-ui-gaming">
        <div class="th-ui-game-hero"><b>VALORANT</b><small>FEATURED SESSION</small><i></i></div>
        <div class="th-ui-score"><span>02</span><em>VS</em><span>01</span></div>
        <div class="th-ui-bars"><i></i><i></i><i></i><i></i></div>
      </div>
    `,
    feeds: () => `
      <div class="th-ui-top"><span class="th-ui-brand">TUBAL HUB FEEDS</span><span class="th-ui-live">● LIVE</span></div>
      <div class="th-ui-feed">
        <div class="th-ui-avatar">TH</div>
        <div class="th-ui-post"><strong>Community Update</strong><span>New activity across the Hub</span><i></i><i></i></div>
        <div class="th-ui-reactions"><b>♥ 24</b><b>↗ 8</b><b>💬 12</b></div>
      </div>
    `,
    music: () => `
      <div class="th-ui-top"><span class="th-ui-brand">AI MUSIC STUDIO</span><span class="th-ui-wave">♫ GENERATING</span></div>
      <div class="th-ui-music">
        <div class="th-ui-album">♫</div>
        <div class="th-ui-waveform">${Array.from({length:18},(_,i)=>`<i style="--h:${12 + ((i*17)%38)}px"></i>`).join('')}</div>
        <div class="th-ui-track"><strong>Peaceful Signal</strong><small>00:42 / 03:18</small></div>
      </div>
    `,
    life: () => `
      <div class="th-ui-top"><span class="th-ui-brand">LIFEHUB</span><span class="th-ui-day">TODAY</span></div>
      <div class="th-ui-life">
        <div class="th-ui-kpi"><strong>06</strong><small>TASKS</small></div>
        <div class="th-ui-kpi"><strong>03</strong><small>HABITS</small></div>
        <div class="th-ui-kpi"><strong>82%</strong><small>FOCUS</small></div>
        <div class="th-ui-task"><i></i><span>Finish weekly plan</span><b>✓</b></div>
      </div>
    `,
    core: () => `
      <div class="th-ui-top"><span class="th-ui-brand">TUBAL HUB CORE</span><span class="th-ui-live">● CONNECTED</span></div>
      <div class="th-ui-core">
        <div class="th-ui-core-orbit"><b>TH</b><i></i><i></i><i></i><i></i></div>
        <div class="th-ui-core-labels"><span>WELLNESS</span><span>SHOP</span><span>GAMING</span><span>COMMUNITY</span></div>
      </div>
    `
  };

  root.classList.add('bot-cinematic');

  dotWrap.innerHTML = items.map((_, i) => '<span class="' + (i === 0 ? 'is-active' : '') + '"></span>').join('');
  const dots = [...dotWrap.children];

  function paint(item, direction='forward') {
    kicker.textContent = item.kicker;
    title.textContent = item.title;
    bodyText.textContent = item.text;
    count.textContent = String(index + 1).padStart(2, '0') + ' / ' + String(items.length).padStart(2, '0');
    bar.style.setProperty('--bot-progress', ((index + 1) / items.length * 100) + '%');
    dots.forEach((d, i) => d.classList.toggle('is-active', i === index));

    screen.dataset.mode = item.mode;
    screen.dataset.direction = direction;
    screen.classList.remove('bot-screen-morph');
    void screen.offsetWidth;
    screen.innerHTML =
      '<div class="th-bot-screen-top"><span class="th-bot-screen-dot"></span><span>TUBAL HUB LIVE PREVIEW</span></div>' +
      '<div class="th-ui-canvas">' + (screenDesigns[item.mode] ? screenDesigns[item.mode]() : '') + '</div>';
    screen.classList.add('bot-screen-morph');
  }

  function nextSection() {
    index = (index + 1) % items.length;
    paint(items[index], 'forward');
  }

  function schedule() {
    window.clearTimeout(timer);
    window.clearTimeout(screenTimer);
    // The bot walks in while the current interface is alive, then the interface
    // morphs to the next branch just after the bot reaches the showcase.
    screenTimer = window.setTimeout(nextSection, CYCLE * 0.62);
    timer = window.setTimeout(schedule, CYCLE);
  }

  paint(items[0], 'forward');
  schedule();

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      window.clearTimeout(timer);
      window.clearTimeout(screenTimer);
    } else {
      schedule();
    }
  });
})();
