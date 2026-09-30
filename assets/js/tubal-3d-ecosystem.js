/* TUBAL HUB — Cinematic 3D Digital Ecosystem
 * Scroll + pointer driven, lightweight CSS 3D. No external runtime.
 */
(() => {
  const hero = document.getElementById('bentoHero');
  const visual = hero?.querySelector('.th-corp-hero-visual');
  if (!hero || !visual) return;

  hero.classList.add('th-cinematic-hero');
  visual.classList.add('th-cinematic-stage');

  const core = visual.querySelector('.th-hub-core');
  const orb = visual.querySelector('.th-3d-orb');
  const logo = visual.querySelector('.th-3d-logo-depth');
  const nodes = [...visual.querySelectorAll('.th-node')];
  const orbits = [...visual.querySelectorAll('.th-hub-orbit')];
  const rings = [...visual.querySelectorAll('.th-3d-ring')];

  // Scroll is the primary director of the cinematic scene; pause the
  // old free-running transforms so the camera has deterministic control.
  [orb, ...rings, ...orbits].filter(Boolean).forEach((el) => {
    el.style.animation = 'none';
  });

  let hud = visual.querySelector('.th-cinematic-hud');
  if (!hud) {
    hud = document.createElement('div');
    hud.className = 'th-cinematic-hud';
    hud.innerHTML = [
      '<div><span class="th-hud-dot"></span><b>LIVE SYSTEM</b></div>',
      '<span class="th-hud-divider"></span>',
      '<span class="th-hud-progress">00%</span>',
      '<span class="th-hud-label">SCROLL CONTROL</span>'
    ].join('');
    visual.appendChild(hud);
  }

  let cue = hero.querySelector('.th-scroll-cue');
  if (!cue) {
    cue = document.createElement('div');
    cue.className = 'th-scroll-cue';
    cue.innerHTML = '<span>SCROLL TO EXPLORE</span><i></i>';
    hero.appendChild(cue);
  }

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    hero.dataset.th3dReady = 'true';
    return;
  }

  const state = { scroll: 0, pointerX: 0, pointerY: 0, tx: 0, ty: 0 };
  let raf = 0;

  function clamp(v, min, max) {
    return Math.min(max, Math.max(min, v));
  }

  function schedule() {
    if (!raf) raf = requestAnimationFrame(render);
  }

  function render() {
    raf = 0;

    const rect = hero.getBoundingClientRect();
    const viewport = Math.max(window.innerHeight, 1);
    const travel = Math.max(rect.height - viewport * 0.34, viewport * 0.66);
    const raw = (viewport * 0.18 - rect.top) / travel;
    const progress = clamp(raw, 0, 1);

    state.scroll += (progress - state.scroll) * 0.12;
    state.tx += (state.pointerX - state.tx) * 0.08;
    state.ty += (state.pointerY - state.ty) * 0.08;

    const s = state.scroll;
    const px = state.tx;
    const py = state.ty;

    hero.style.setProperty('--th-scroll', s.toFixed(4));
    hero.style.setProperty('--th-pointer-x', px.toFixed(4));
    hero.style.setProperty('--th-pointer-y', py.toFixed(4));

    const cameraX = (-py * 7 + s * 5).toFixed(2);
    const cameraY = (px * 9 + s * 18).toFixed(2);
    const cameraZ = (s * 38).toFixed(2);
    const visualScale = (0.94 + s * 0.10).toFixed(3);

    visual.style.transform =
      `translateY(-50%) translate3d(${(px * 10).toFixed(1)}px,${(py * -7).toFixed(1)}px,${cameraZ}px) rotateX(${cameraX}deg) rotateY(${cameraY}deg) scale(${visualScale})`;

    if (core) {
      core.style.transform =
        `translate(-50%,-50%) translateZ(${(s * 28).toFixed(1)}px) rotateX(${(px * -8 + s * 12).toFixed(2)}deg) rotateY(${(py * 10 - s * 18).toFixed(2)}deg) scale(${(0.98 + s * 0.08).toFixed(3)})`;
    }

    if (orb) {
      orb.style.transform =
        `translateZ(${(s * 18).toFixed(1)}px) rotateX(${(s * 10 + py * -5).toFixed(2)}deg) rotateY(${(s * 22 + px * 10).toFixed(2)}deg)`;
    }

    if (logo) {
      logo.style.transform =
        `translateZ(${(44 + s * 26).toFixed(1)}px) translateY(${(-s * 8 + py * -2).toFixed(1)}px) rotateY(${(px * 7 + s * 8).toFixed(2)}deg)`;
    }

    orbits.forEach((orbit, index) => {
      const z = 18 + s * (index === 0 ? 22 : 34);
      const spin = s * (index === 0 ? 22 : -30) + (index * 8);
      orbit.style.transform = `translateZ(${z.toFixed(1)}px) rotateZ(${spin.toFixed(1)}deg)`;
    });

    rings.forEach((ring, index) => {
      const depth = s * (18 + index * 9);
      const tilt = (index === 1 ? -6 : 5) * s;
      ring.style.transform =
        `${index === 0 ? 'rotateX(67deg)' : index === 1 ? 'rotateY(67deg)' : 'rotateX(20deg) rotateY(52deg')} translateZ(${depth.toFixed(1)}px) rotateZ(${(s * (index === 1 ? -32 : 38) + tilt).toFixed(2)}deg)`;
    });

    nodes.forEach((node, index) => {
      const baseZ = [42, 70, 54][index] || 50;
      const depth = baseZ + s * (24 + index * 10);
      const x = (px * (index === 1 ? 8 : -6)).toFixed(1);
      const y = (py * (index === 2 ? 7 : -5)).toFixed(1);
      const scale = 1 + s * 0.03;
      node.style.transform = `translate3d(${x}px,${y}px,${depth.toFixed(1)}px) scale(${scale.toFixed(3)})`;
    });

    if (hud) {
      const pct = Math.round(s * 100).toString().padStart(2, '0');
      const progress = hud.querySelector('.th-hud-progress');
      if (progress) progress.textContent = `${pct}%`;
    }

    hero.style.setProperty('--th-cue-opacity', (1 - s * 3).toFixed(3));
  }

  function onPointerMove(event) {
    const rect = visual.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1;
    const y = ((event.clientY - rect.top) / Math.max(rect.height, 1)) * 2 - 1;
    state.pointerX = clamp(x, -1, 1);
    state.pointerY = clamp(y, -1, 1);
    schedule();
  }

  function onPointerLeave() {
    state.pointerX = 0;
    state.pointerY = 0;
    schedule();
  }

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  visual.addEventListener('pointermove', onPointerMove, { passive: true });
  visual.addEventListener('pointerleave', onPointerLeave, { passive: true });

  hero.dataset.th3dReady = 'true';
  schedule();
})();
