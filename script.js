/* ============================================================
   SANTIAGO ABELLA — Portfolio JS
   Sistema de parallax + elementos flotantes + scroll cinema
   ============================================================ */

history.scrollRestoration = 'manual';
window.scrollTo(0, 0);

// ─── INTRO TRANSITION ────────────────────────────────────────
(function initIntro() {
  const overlay = document.getElementById('intro-overlay');
  const linesEl = document.getElementById('intro-lines');
  const nameEl  = document.getElementById('intro-name');
  if (!overlay) return;

  // Bloquear scroll mientras el intro corre
  document.body.style.overflow = 'hidden';

  const lines = [
    { text: '> init portfolio.js',            cls: 'accent', delay: 0 },
    { text: '// loading modules...',           cls: 'dim',    delay: 220 },
    { text: '> import { skills } from "./src"',cls: '',       delay: 420 },
    { text: '✓ C# · Python · .NET · SQL',     cls: 'dim',    delay: 680 },
    { text: '> render( &lt;Portfolio /&gt; )', cls: 'accent', delay: 940 },
    { text: '// ready.',                       cls: 'dim',    delay: 1180 },
  ];

  lines.forEach(({ text, cls, delay }) => {
    const s = document.createElement('span');
    if (cls) s.classList.add(cls);
    s.innerHTML = text;
    linesEl.appendChild(s);
    setTimeout(() => s.classList.add('show'), delay + 100);
  });

  // Mostrar nombre grande
  setTimeout(() => nameEl.classList.add('show'), 700);

  // Wipe out: clip-path desde abajo hacia arriba
  setTimeout(() => {
    overlay.classList.add('wipe-out');
    overlay.addEventListener('transitionend', () => {
      overlay.classList.add('done');
      document.body.style.overflow = '';
    }, { once: true });
  }, 1800);
})();

// ─── UTILS ───────────────────────────────────────────────────
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
const map = (v, inMin, inMax, outMin, outMax) =>
  ((v - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin;

// ─── STATE ───────────────────────────────────────────────────
let scrollY = 0;
let targetScrollY = 0;
let raf;
const isMobile = window.innerWidth < 700;

// ─── LENIS SMOOTH SCROLL ──────────────────────────────────────
const lenis = new Lenis({
  duration:   1.4,
  easing:     t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true,
  touchMultiplier: 1.5,
});

// Lenis alimenta scrollY para que parallax y progress funcionen en sync
lenis.on('scroll', ({ scroll }) => {
  scrollY = scroll;
  document.getElementById('navbar').classList.toggle('scrolled', scroll > 50);
});

// Conectar Lenis al RAF principal (se llama desde loop())
function lenisRaf(time) { lenis.raf(time); }

// ─── NAVBAR SCROLL ────────────────────────────────────────────
// (manejado por Lenis arriba)

// ─── SMOOTH SCROLL CON LENIS ──────────────────────────────────
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', e => {
    const id = link.getAttribute('href').slice(1);
    e.preventDefault();
    if (!id) {
      lenis.scrollTo(0, { duration: 1.2 });
      return;
    }
    const target = document.getElementById(id);
    if (!target) return;
    const navH = document.getElementById('navbar')?.offsetHeight || 0;
    lenis.scrollTo(target, { offset: -navH, duration: 1.6 });
  });
});

// ─── THEME TOGGLE ─────────────────────────────────────────────
const btn = document.getElementById('btn-tema');
btn.addEventListener('click', () => {
  document.body.classList.toggle('claro');
  btn.textContent = document.body.classList.contains('claro') ? '●' : '◐';
  rebuildFloaters(); // rebuild with correct colors
});

// ─── SCROLL REVEAL (Intersection Observer) ────────────────────
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) e.target.classList.add('visible');
  });
}, { threshold: 0.08 });

document.querySelectorAll('.oculto').forEach(el => revealObserver.observe(el));

// ─── STAGGER ITEMS INSIDE SECTIONS ───────────────────────────
document.querySelectorAll('.item, .skill-item, .contact-item, .project-card').forEach((el, i) => {
  el.style.transitionDelay = `${(i % 6) * 0.07}s`;
});

// ─── SOBRE MÍ — REVEAL DESDE ABAJO ──────────────────────────
(function () {
  const section = document.getElementById('sobre-mi');
  if (!section) return;

  const targets = [
    { el: section.querySelector('.sm-num'),           delay: 0 },
    { el: section.querySelector('.sm-title-wrap h2'), delay: 80 },
    { el: section.querySelectorAll('.sm-p')[0],       delay: 200 },
    { el: section.querySelectorAll('.sm-p')[1],       delay: 360 },
  ].filter(t => t.el);

  // Estado inicial: escondido abajo
  targets.forEach(({ el }) => {
    el.style.opacity   = '0';
    el.style.transform = 'translateY(60px)';
    el.style.transition = 'opacity 0.85s cubic-bezier(0.16,1,0.3,1), transform 0.85s cubic-bezier(0.16,1,0.3,1)';
  });

  const obs = new IntersectionObserver(entries => {
    if (!entries[0].isIntersecting) return;
    obs.disconnect();

    targets.forEach(({ el, delay }) => {
      setTimeout(() => {
        el.style.opacity   = '1';
        el.style.transform = 'translateY(0)';
      }, delay);
    });

    // Línea decorativa
    setTimeout(() => section.classList.add('sm-visible'), 250);
  }, { threshold: 0.15 });

  obs.observe(section);
})();

// ─── GRID BUILD / UNBUILD ON SCROLL ──────────────────────────
// Each cell flies in from OUTSIDE the viewport — chaotically

// Seeded pseudo-random so values stay stable across frames
function seededRand(seed) {
  const x = Math.sin(seed + 1) * 43758.5453123;
  return x - Math.floor(x);
}

function getComputedCols(grid) {
  const tpl = getComputedStyle(grid).gridTemplateColumns;
  if (tpl && tpl !== 'none') return tpl.trim().split(/\s+/).length;
  return 2;
}

function initGridCells() {
  const W = window.innerWidth;
  const H = window.innerHeight;

  function prepareGrid(grid, cols) {
    if (!grid) return;
    const cells = Array.from(grid.children);
    const rows  = Math.ceil(cells.length / cols);

    cells.forEach((cell, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const nx  = cols > 1 ? col / (cols - 1) : 0.5;
      const ny  = rows > 1 ? row / (rows - 1) : 0.5;

      // --- Base direction: nearest edge ---
      const dLeft = nx, dRight = 1 - nx, dTop = ny, dBottom = 1 - ny;
      const minD  = Math.min(dLeft, dRight, dTop, dBottom);

      let ox, oy;
      if      (minD === dLeft)   { ox = -(W * 0.55 + col * 55);          oy = (ny - 0.5) * H * 0.3; }
      else if (minD === dRight)  { ox =  W * 0.55 + (cols-1-col) * 55;  oy = (ny - 0.5) * H * 0.3; }
      else if (minD === dTop)    { ox = (nx - 0.5) * W * 0.3;           oy = -(H * 0.5 + row * 45); }
      else                       { ox = (nx - 0.5) * W * 0.3;           oy =  H * 0.5 + (rows-1-row) * 45; }

      // --- Chaos: random extra offset per cell (seeded so it's stable) ---
      const r1 = seededRand(i * 3 + 7)  * 2 - 1;  // -1 → 1
      const r2 = seededRand(i * 3 + 13) * 2 - 1;
      const r3 = seededRand(i * 3 + 19) * 2 - 1;

      ox += r1 * W * 0.22;   // scatter horizontally
      oy += r2 * H * 0.18;   // scatter vertically

      // Random rotation during flight: -25 to +25 deg
      const rot = r3 * 25;

      // Slightly randomised stagger so they don't all move together
      const baseDist  = Math.abs(nx - 0.5) + Math.abs(ny - 0.5);
      const stagger   = (1 - baseDist) * 0.6 + seededRand(i * 5 + 3) * 0.4;

      cell.dataset.ox      = ox.toFixed(1);
      cell.dataset.oy      = oy.toFixed(1);
      cell.dataset.rot     = rot.toFixed(2);
      cell.dataset.stagger = stagger.toFixed(3);

      cell.style.willChange = 'transform, opacity, box-shadow';
      cell.style.transition = 'none';
      cell.style.opacity    = '0';
      cell.style.transform  = `translate(${ox.toFixed(1)}px, ${oy.toFixed(1)}px) rotate(${rot.toFixed(2)}deg)`;
    });
  }

  const skillGrid   = document.querySelector('.skills-grid');
  const contactGrid = document.querySelector('.contact-grid');
  const projectGrid = document.querySelector('.project-grid');
  if (skillGrid)   prepareGrid(skillGrid,   getComputedCols(skillGrid));
  if (contactGrid) prepareGrid(contactGrid, getComputedCols(contactGrid));
  if (projectGrid) prepareGrid(projectGrid, getComputedCols(projectGrid));
}

function updateGridCells() {
  const wh = window.innerHeight;
  // Read accent color for ghost border
  const accentRgb = getComputedStyle(document.body)
    .getPropertyValue('--accent-rgb').trim() || '200,241,53';

  ['.skills-grid', '.contact-grid', '.project-grid'].forEach(selector => {
    const grid = document.querySelector(selector);
    if (!grid) return;

    const rect       = grid.getBoundingClientRect();
    const enterAt    = wh + 100;
    const completeAt = wh * 0.15;
    const progress   = clamp((enterAt - rect.top) / (enterAt - completeAt), 0, 1);

    Array.from(grid.children).forEach(cell => {
      if (cell._hovered) return;

      const stagger   = parseFloat(cell.dataset.stagger) || 0;
      const cellRaw   = clamp((progress - stagger * 0.30) / 0.70, 0, 1);
      // Ease out quart: snappy landing
      const eased     = 1 - Math.pow(1 - cellRaw, 4);

      const ox  = parseFloat(cell.dataset.ox)  || 0;
      const oy  = parseFloat(cell.dataset.oy)  || 0;
      const rot = parseFloat(cell.dataset.rot) || 0;

      const tx      = ox  * (1 - eased);
      const ty      = oy  * (1 - eased);
      const angle   = rot * (1 - eased);          // rotates to 0 on arrival
      const opacity = Math.min(eased * 1.8, 1);   // fades in quicker than it moves

      // Ghost border: visible while flying, fades out as cell lands
      // In light mode keep a base opacity so cells don't disappear into the bg
      const isLight     = document.body.classList.contains('claro');
      const inFlight    = Math.sin(eased * Math.PI);  // bell curve 0→1→0
      // Dark: subtle ghost border only during flight
      // Light: strong border while moving, stays faintly visible when settled
      const baseBorder  = isLight ? 0.18 : 0;
      const flightPeak  = isLight ? 0.72 : 0.55;
      const settled     = isLight ? 0.18 * (1 - eased * eased) : 0;
      const borderAlpha = settled + inFlight * flightPeak + baseBorder * (1 - eased);

      cell.style.transition  = 'none';
      cell.style.opacity     = opacity;
      cell.style.transform   = `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) rotate(${angle.toFixed(2)}deg)`;
      cell.style.outline     = `1px solid rgba(${accentRgb}, ${borderAlpha.toFixed(3)})`;
      cell.style.outlineOffset = '0px';
    });
  });
}

// Re-init on resize
window.addEventListener('resize', () => setTimeout(initGridCells, 100));

// Initialize after DOM is ready
setTimeout(initGridCells, 60);

// ─── PARALLAX HERO ───────────────────────────────────────────
function parallaxHero() {
  if (isMobile) return;
  const sy = scrollY;
  const hero = document.getElementById('hero');
  const heroH = hero.offsetHeight;
  const progress = clamp(sy / heroH, 0, 1);

  // Nombre se aleja despacio
  const h1 = hero.querySelector('h1');
  if (h1) {
    h1.style.transform = `translateY(${sy * 0.18}px)`;
    h1.style.opacity = 1 - progress * 1.6;
  }

  // Subtítulo se mueve un poco más rápido
  const sub = hero.querySelector('.hero-sub');
  if (sub) {
    sub.style.transform = `translateY(${sy * 0.28}px)`;
    sub.style.opacity = 1 - progress * 2;
  }

  // Foto sube más lenta
  const foto = hero.querySelector('.foto-perfil');
  if (foto) {
    foto.style.transform = `translateY(${sy * 0.1}px)`;
  }

  // Tag se mueve suave
  const tag = hero.querySelector('.hero-tag');
  if (tag) {
    tag.style.transform = `translateY(${sy * 0.22}px)`;
    tag.style.opacity = 1 - progress * 2.2;
  }

  // CTA desaparece rápido
  const cta = hero.querySelector('.hero-cta');
  if (cta) {
    cta.style.transform = `translateY(${sy * 0.35}px)`;
    cta.style.opacity = 1 - progress * 2.5;
  }

}

// ─── PARALLAX SECTIONS ────────────────────────────────────────
function parallaxSections() {
  if (isMobile) return;
  const sy = scrollY;
  const wh = window.innerHeight;

  document.querySelectorAll('section:not(#hero)').forEach(sec => {
    const rect = sec.getBoundingClientRect();
    const centerOffset = rect.top + rect.height / 2 - wh / 2;
    const depth = parseFloat(sec.dataset.depth || '0.05');

    const h2 = sec.querySelector('h2');
    if (h2) {
      h2.style.transform = `translateY(${centerOffset * depth * 0.4}px)`;
    }
  });
}

// ─── CURSOR GLOW — variables (el aura difusa, usada también por el cursor custom) ─
const glow = document.createElement('div');
glow.id = 'cursor-glow';
document.body.appendChild(glow);

// ── Cursor overlay — visible sobre navbar y cards en modo claro ──
const cursorOverlay = document.createElement('div');
cursorOverlay.id = 'cursor-overlay';
document.body.appendChild(cursorOverlay);

let mouseX = -200, mouseY = -200;
let glowX  = -200, glowY  = -200;

const navbar = document.getElementById('navbar');
document.addEventListener('mousemove', e => {
  mouseX = e.clientX;
  mouseY = e.clientY;
  cursorOverlay.style.left = e.clientX + 'px';
  cursorOverlay.style.top  = e.clientY + 'px';
  const overNav = navbar && e.clientY <= navbar.offsetHeight;
  document.body.classList.toggle('cursor-over-nav', overNav);
});

function animateCursor() {}   // stub — el tick del cursor custom maneja el glow

// ─── CURSOR PERSONALIZADO ─────────────────────────────────────
// El cursor visual lo dibuja el canvas neural (un único punto de verdad).
// Aquí solo manejamos: glow DOM y estados de body.
(function initCustomCursor() {
  if (isMobile) return;

  // Glow DOM — en modo oscuro suave, en modo claro rápido (actúa como cursor)
  function tickGlow() {
    const speed = document.body.classList.contains('claro') ? 0.22 : 0.055;
    glowX = lerp(glowX, mouseX, speed);
    glowY = lerp(glowY, mouseY, speed);
    // El offset de -30px centra el glow (60px / 2) sobre el cursor
    glow.style.transform = `translate(${glowX}px, ${glowY}px)`;
    requestAnimationFrame(tickGlow);
  }
  tickGlow();

  // ── Gestión de estados ────────────────────────────────────────
  const STATES = ['cursor-hover', 'cursor-card', 'cursor-click', 'cursor-text'];
  function setState(state) {
    STATES.forEach(s => document.body.classList.remove(s));
    if (state) document.body.classList.add(state);
  }

  document.addEventListener('mousedown', () => document.body.classList.add('cursor-click'));
  document.addEventListener('mouseup',   () => document.body.classList.remove('cursor-click'));

  function onEnter(e) {
    const t = e.currentTarget;
    if      (t.matches('.project-card:not(.project-card--placeholder)')) setState('cursor-card');
    else if (t.matches('input, textarea'))                                setState('cursor-text');
    else                                                                  setState('cursor-hover');
  }
  function onLeave() { setState(null); }

  const hoverTargets = 'a, button, .btn-primary, .btn-ghost, .btn-cv, .skill-item, .contact-item, .nav-logo';
  document.querySelectorAll(`${hoverTargets}, .project-card:not(.project-card--placeholder), input, textarea`).forEach(el => {
    el.addEventListener('mouseenter', onEnter);
    el.addEventListener('mouseleave', onLeave);
  });
})();

// ─── FLOATING ELEMENTS ────────────────────────────────────────
const floaterData = [
  // [x%, y%, size, speed, opacity, shape]
  [8,  12, 120, 0.04, 0.10, 'circle'],
  [85, 18, 60,  0.07, 0.13, 'circle'],
  [92, 45, 200, 0.03, 0.07, 'circle'],
  [5,  60, 80,  0.05, 0.11, 'circle'],
  [75, 72, 140, 0.04, 0.09, 'circle'],
  [20, 85, 50,  0.08, 0.14, 'circle'],
  [45, 55, 90,  0.05, 0.08, 'circle'],
  [68, 30, 70,  0.06, 0.10, 'circle'],
  [30, 20, 45,  0.09, 0.12, 'circle'],
  [88, 80, 110, 0.03, 0.07, 'circle'],
  [12, 75, 55,  0.07, 0.09, 'circle'],
  [55, 90, 80,  0.04, 0.08, 'circle'],
  [50, 30, 1,   0,    0.22, 'cross'],
  [15, 50, 1,   0,    0.18, 'cross'],
  [80, 65, 1,   0,    0.16, 'cross'],
  [40, 80, 1,   0,    0.20, 'cross'],
  [60, 15, 1,   0,    0.17, 'cross'],
  [25, 40, 1,   0,    0.15, 'cross'],
  [70, 50, 1,   0,    0.19, 'cross'],
  [90, 25, 1,   0,    0.14, 'cross'],
  [35, 65, 1,   0,    0.16, 'cross'],
];

let floaterEls = [];

function buildFloaters() {
  const container = document.getElementById('floaters');
  container.innerHTML = '';
  floaterEls = [];

  floaterData.forEach(([x, y, size, speed, opacity, shape]) => {
    const el = document.createElement('div');
    if (shape === 'circle') {
      el.className = 'floater-circle';
      el.style.cssText = `
        left: ${x}%; top: ${y}%;
        width: ${size}px; height: ${size}px;
        opacity: ${opacity};
      `;
    } else {
      el.className = 'floater-cross';
      el.style.cssText = `left: ${x}%; top: ${y}%; opacity: ${opacity};`;
    }
    container.appendChild(el);
    floaterEls.push({ el, baseY: y, speed, shape, size });
  });
}

function rebuildFloaters() {
  buildFloaters();
}

buildFloaters();

// ─── SCROLL-DRIVEN FLOATER PARALLAX ───────────────────────────
function animateFloaters() {
  const sy = scrollY;

  floaterEls.forEach(({ el, baseY, speed, shape }) => {
    if (speed === 0) return;
    const offset = sy * speed;
    el.style.transform = `translateY(${offset}px)`;
  });
}

// ─── HORIZONTAL SCROLL TICKER ─────────────────────────────────
function animateTicker() {}

function setupTicker() {
  const inner = document.querySelector('.ticker-inner');
  if (!inner) return;
  const template = inner.querySelector('span');
  if (!template) return;

  // Medir ancho de una copia
  const spanW = template.getBoundingClientRect().width;
  if (spanW === 0) return;

  // Clonar hasta llenar más del ancho de pantalla (set A)
  const copiesNeeded = Math.ceil(window.innerWidth / spanW) + 2;
  for (let i = 1; i < copiesNeeded; i++) {
    inner.appendChild(template.cloneNode(true));
  }

  // Duplicar todo el set para tener set A + set B (loop perfecto)
  const setA = Array.from(inner.children);
  setA.forEach(el => inner.appendChild(el.cloneNode(true)));

  // La animación CSS mueve -50% (= ancho de set A), loop infinito sin salto
  const duration = (spanW * copiesNeeded) / 130; // ~130px/s
  inner.style.animationDuration = `${duration}s`;
}

setupTicker();

// ─── SECTION PROGRESS LINE ────────────────────────────────────
function updateProgress() {
  const docH = document.documentElement.scrollHeight - window.innerHeight;
  const progress = clamp(scrollY / docH, 0, 1);
  const line = document.getElementById('progress-line');
  if (line) line.style.transform = `scaleX(${progress})`;
}

// ─── MAGNETIC BUTTONS ─────────────────────────────────────────
document.querySelectorAll('.btn-primary, .btn-ghost').forEach(btn => {
  btn.addEventListener('mousemove', function(e) {
    const rect = this.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) * 0.25;
    const dy = (e.clientY - cy) * 0.25;
    this.style.transform = `translate(${dx}px, ${dy}px)`;
  });
  btn.addEventListener('mouseleave', function() {
    this.style.transform = '';
  });
});

// ─── HERO H1: LETTER FLY-IN + PSEUDO-SCRAMBLE ────────────────
// Trick: each letter span keeps its real character (holds natural
// width/kerning). During scramble, the real char becomes transparent
// and a CSS attr(data-sc) on ::before shows the random char —
// so layout is NEVER affected.

(function initHeroH1() {
  const heroH1 = document.querySelector('#hero h1');
  if (!heroH1) return;

  const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%';

  const linesData = [
    { text: 'Santiago', accent: false },
    { text: 'Abella',   accent: true  },
  ];

  // Build two block line-wrappers
  heroH1.innerHTML = '';
  const lineEls = linesData.map(() => {
    const s = document.createElement('span');
    s.style.cssText = 'display:block; white-space:nowrap;';
    heroH1.appendChild(s);
    return s;
  });

  const allLetters = [];

  function seededR(seed) {
    const x = Math.sin(seed * 9301 + 49297) * 233280;
    return x - Math.floor(x);
  }

  linesData.forEach((lineData, li) => {
    const lineEl = lineEls[li];
    [...lineData.text].forEach((ch, ci) => {
      const span = document.createElement('span');
      span.style.cssText = [
        'display:inline-block',
        'position:relative',
        'will-change:transform, opacity',
        lineData.accent ? 'color:var(--accent)' : '',
      ].filter(Boolean).join(';');
      span.dataset.accent = lineData.accent ? '1' : '0';
      span.dataset.orig   = ch;
      span.dataset.sc     = ch;
      span.textContent    = ch;

      const seed  = li * 100 + ci;
      const angle = seededR(seed) * 360;
      const dist  = 380 + seededR(seed + 7) * 650;
      const ox    = Math.cos(angle * Math.PI / 180) * dist;
      const oy    = Math.sin(angle * Math.PI / 180) * dist;
      const rot   = (seededR(seed + 13) - 0.5) * 75;
      const delay = (li * 10 + ci) * 40 + seededR(seed + 3) * 50;

      span.style.opacity   = '0';
      span.style.transform = `translate(${ox.toFixed(1)}px,${oy.toFixed(1)}px) rotate(${rot.toFixed(1)}deg)`;

      lineEl.appendChild(span);
      allLetters.push({ el: span, delay });
    });
  });

  // Fly-in
  setTimeout(() => {
    allLetters.forEach(({ el, delay }) => {
      setTimeout(() => {
        el.style.transition = 'transform 0.78s cubic-bezier(0.16,1,0.3,1), opacity 0.42s ease';
        el.style.transform  = 'translate(0px,0px) rotate(0deg)';
        el.style.opacity    = '1';
      }, delay);
    });
  }, 260);

  // CSS: real char transparent, ::before shows data-sc value
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    #hero h1 span.scrambling { color: transparent !important; }
    #hero h1 span.scrambling::before {
      content: attr(data-sc);
      position: absolute;
      left: 0; top: 0;
      color: var(--text);
      pointer-events: none;
    }
    #hero h1 span.scrambling[data-accent="1"]::before { color: var(--accent); }
  `;
  document.head.appendChild(styleEl);

  // Scramble on hover
  let scrambling  = false;
  let scrambleIvs = [];

  heroH1.addEventListener('mouseenter', () => {
    if (scrambling) return;
    scrambling = true;
    scrambleIvs.forEach(clearInterval);
    scrambleIvs = [];

    allLetters.forEach(({ el }) => el.classList.add('scrambling'));

    linesData.forEach((lineData, li) => {
      const spans    = Array.from(lineEls[li].querySelectorAll('span'));
      const original = lineData.text;
      let iter       = 0;
      const maxIter  = original.length * 4;

      const iv = setInterval(() => {
        spans.forEach((sp, i) => {
          if (i < iter / 4) {
            sp.dataset.sc = original[i];
            sp.classList.remove('scrambling');
          } else {
            sp.dataset.sc = CHARS[Math.floor(Math.random() * CHARS.length)];
          }
        });
        iter++;
        if (iter > maxIter) {
          clearInterval(iv);
          spans.forEach((sp, i) => {
            sp.dataset.sc = original[i];
            sp.classList.remove('scrambling');
          });
        }
      }, 28);

      scrambleIvs.push(iv);
    });

    const totalMs = linesData.reduce((a, l) => a + l.text.length, 0) * 4 * 28 + 300;
    setTimeout(() => { scrambling = false; }, totalMs);
  });
})();

// ─── NEURAL NETWORK PARTICLES ─────────────────────────────────
(function initNeuralNet() {
  if (isMobile) return;

  const canvas = document.createElement('canvas');
  canvas.id = 'neural-canvas';
  canvas.style.cssText = `
    position: fixed; inset: 0;
    width: 100%; height: 100%;
    pointer-events: none; z-index: 0; opacity: 1;
  `;
  document.body.insertBefore(canvas, document.body.firstChild);
  const ctx = canvas.getContext('2d');

  const CFG = {
    count:          68,
    maxDist:        160,
    mouseRadius:    220,
    mouseForce:     0.038,
    repelForce:     0.055,
    repelRadius:    55,
    speed:          0.22,
    nodeSizeMin:    0.7,
    nodeSizeMax:    2.2,
    lineMaxAlpha:   0.12,
    mouseLineAlpha: 0.32,
    pulseSpeed:     0.012,
  };

  let W = window.innerWidth, H = window.innerHeight;
  canvas.width = W; canvas.height = H;
  window.addEventListener('resize', () => {
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W; canvas.height = H;
  });

  function getAccentRGB() {
    const raw = getComputedStyle(document.body).getPropertyValue('--accent-rgb').trim();
    if (raw) {
      const parts = raw.split(',').map(s => parseInt(s.trim(), 10));
      if (parts.length === 3) return parts;
    }
    return [200, 241, 53];
  }

  // ── Partícula ──────────────────────────────────────────────────
  class Particle {
    constructor(randomPos = false) {
      this.x  = Math.random() * W;
      this.y  = randomPos ? Math.random() * H : (Math.random() > 0.5 ? -10 : H + 10);
      this.vx = (Math.random() - 0.5) * CFG.speed;
      this.vy = (Math.random() - 0.5) * CFG.speed;
      this.r  = CFG.nodeSizeMin + Math.random() * (CFG.nodeSizeMax - CFG.nodeSizeMin);
      this.phase    = Math.random() * Math.PI * 2;
      this.baseAlpha = 0.15 + Math.random() * 0.3;
      // Cada partícula tiene una "energía" que sube cerca del mouse
      this.energy = 0;
    }

    update(mx, my) {
      const dx   = mx - this.x;
      const dy   = my - this.y;
      const dist = Math.hypot(dx, dy);

      // Atracción suave desde lejos
      if (dist < CFG.mouseRadius && dist > CFG.repelRadius) {
        const force = ((CFG.mouseRadius - dist) / CFG.mouseRadius) * CFG.mouseForce;
        this.vx += (dx / dist) * force;
        this.vy += (dy / dist) * force;
        this.energy = lerp(this.energy, (1 - dist / CFG.mouseRadius), 0.08);
      }
      // Repulsión cuando está muy cerca — efecto campo de fuerza
      else if (dist < CFG.repelRadius && dist > 1) {
        const force = ((CFG.repelRadius - dist) / CFG.repelRadius) * CFG.repelForce;
        this.vx -= (dx / dist) * force;
        this.vy -= (dy / dist) * force;
        this.energy = lerp(this.energy, 0.8, 0.12);
      } else {
        this.energy = lerp(this.energy, 0, 0.04);
      }

      // Dampen + clamp
      this.vx *= 0.97;
      this.vy *= 0.97;
      const spd = Math.hypot(this.vx, this.vy);
      const maxSpd = CFG.speed * 5;
      if (spd > maxSpd) { this.vx = (this.vx / spd) * maxSpd; this.vy = (this.vy / spd) * maxSpd; }

      this.x += this.vx;
      this.y += this.vy;
      this.phase += CFG.pulseSpeed;

      // Wrap
      if (this.x < -20) this.x = W + 20;
      if (this.x > W+20) this.x = -20;
      if (this.y < -20) this.y = H + 20;
      if (this.y > H+20) this.y = -20;
    }

    draw(rgb, boost) {
      const pulse = 0.75 + 0.25 * Math.sin(this.phase);
      const energyBoost = 1 + this.energy * 2.5;
      const alpha = Math.min(this.baseAlpha * pulse * boost * energyBoost, 0.95);
      const radius = this.r * pulse * (1 + this.energy * 0.8);

      // Halo brillante cuando tiene energía
      if (this.energy > 0.15) {
        const haloAlpha = this.energy * 0.18 * boost;
        const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, radius * 5);
        grad.addColorStop(0, `rgba(${rgb},${haloAlpha})`);
        grad.addColorStop(1, `rgba(${rgb},0)`);
        ctx.beginPath();
        ctx.arc(this.x, this.y, radius * 5, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${rgb},${alpha})`;
      ctx.fill();
    }
  }

  const particles = Array.from({ length: CFG.count }, () => new Particle(true));
  let nmx = -999, nmy = -999;

  document.addEventListener('mousemove', e => { nmx = e.clientX; nmy = e.clientY; });

  function drawNeural() {
    const rgb     = getAccentRGB().join(',');
    const isLight = document.body.classList.contains('claro');
    const boost   = isLight ? 5.0 : 1;
    const lBoost  = isLight ? 6.5 : 1;

    ctx.clearRect(0, 0, W, H);

    // Update partículas
    particles.forEach(p => p.update(nmx, nmy));

    // Dibujar conexiones con grosor variable por distancia
    for (let i = 0; i < particles.length; i++) {
      const a = particles[i];
      for (let j = i + 1; j < particles.length; j++) {
        const b = particles[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const dist = Math.hypot(dx, dy);
        if (dist > CFG.maxDist) continue;

        const t = 1 - dist / CFG.maxDist;
        let alpha = t * t * CFG.lineMaxAlpha * lBoost;

        // Boost por energía de los nodos
        const energyMult = 1 + (a.energy + b.energy) * 1.8;
        alpha *= energyMult;

        // Boost cerca del mouse
        const midX = (a.x + b.x) / 2, midY = (a.y + b.y) / 2;
        const mdist = Math.hypot(midX - nmx, midY - nmy);
        if (mdist < CFG.mouseRadius) {
          alpha = Math.min(alpha + (1 - mdist / CFG.mouseRadius) * CFG.mouseLineAlpha * lBoost,
                          CFG.mouseLineAlpha * lBoost * 1.5);
        }

        // Grosor variable: más grueso si hay energía o si está cerca del mouse
        const width = 0.5 + t * 0.7 * energyMult;

        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = `rgba(${rgb},${Math.min(alpha, 0.65)})`;
        ctx.lineWidth = width;
        ctx.stroke();
      }

      // Líneas desde mouse a partículas cercanas — más largas y definidas
      const mdx = a.x - nmx, mdy = a.y - nmy;
      const mouseDist = Math.hypot(mdx, mdy);
      if (mouseDist < CFG.mouseRadius * 0.85) {
        const t = 1 - mouseDist / (CFG.mouseRadius * 0.85);
        const alpha = t * CFG.mouseLineAlpha * 1.4 * lBoost;
        ctx.beginPath();
        ctx.moveTo(nmx, nmy);
        ctx.lineTo(a.x, a.y);
        ctx.strokeStyle = `rgba(${rgb},${alpha})`;
        ctx.lineWidth = 0.7 + t * 0.8;
        ctx.stroke();
      }
    }

    // Dibujar nodos encima
    particles.forEach(p => p.draw(rgb, boost));

    // Dot en el mouse — único cursor
    if (nmx > 0) {
      const isHover = document.body.classList.contains('cursor-hover') ||
                      document.body.classList.contains('cursor-card');
      const isClick = document.body.classList.contains('cursor-click');

      const dotA   = isLight ? 0.95 : 0.88;
      const coreR  = isClick ? 2 : isHover ? 4 : 3;
      const haloR  = isClick ? 10 : isHover ? 22 : 14;
      const haloA  = isClick ? 0.35 : 0.22;

      // Halo difuso
      const halo = ctx.createRadialGradient(nmx, nmy, 0, nmx, nmy, haloR);
      halo.addColorStop(0,   `rgba(${rgb},${haloA})`);
      halo.addColorStop(1,   `rgba(${rgb},0)`);
      ctx.beginPath(); ctx.arc(nmx, nmy, haloR, 0, Math.PI * 2);
      ctx.fillStyle = halo; ctx.fill();

      // Núcleo
      ctx.beginPath(); ctx.arc(nmx, nmy, coreR, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${rgb},${dotA})`;
      ctx.fill();
    }
  }

  window._drawNeural = drawNeural;
})();

// ─── HOVER MICRO-INTERACTIONS FOR GRID CELLS ─────────────────
// Done in JS to not conflict with scroll-driven transform
document.querySelectorAll('.skill-item').forEach(el => {
  el.addEventListener('mouseenter', function() {
    if (parseFloat(this.style.opacity) < 0.5) return;
    const cur = this.style.transform || '';
    const hasTranslate = cur.includes('translate');
    if (hasTranslate) {
      const match = cur.match(/translate\(([^)]+)\)/);
      if (match) {
        const parts = match[1].split(',');
        const tx = parseFloat(parts[0]);
        const ty = parseFloat(parts[1]);
        if (Math.abs(tx) < 2 && Math.abs(ty) < 2) {
          this._hovered = true;
          this.style.transition = 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1), background 0.2s, color 0.2s';
          this.style.transform = `translate(0px, -3px) scale(1)`;
        }
      }
    }
  });
  el.addEventListener('mouseleave', function() {
    if (!this._hovered) return;
    this._hovered = false;
    this.style.transition = 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1), background 0.2s, color 0.2s';
    this.style.transform = `translate(0px, 0px) scale(1)`;
  });
});

document.querySelectorAll('.contact-item').forEach(el => {
  el.addEventListener('mouseenter', function() {
    if (parseFloat(this.style.opacity) < 0.5) return;
    this._hovered = true;
    this.style.transition = 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)';
    this.style.transform = `translate(0px, -4px) scale(1)`;
  });
  el.addEventListener('mouseleave', function() {
    if (!this._hovered) return;
    this._hovered = false;
    this.style.transition = 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)';
    this.style.transform = `translate(0px, 0px) scale(1)`;
  });
});
// ─── TILT 3D EN PROJECT CARDS ────────────────────────────────
(function initTilt3D() {
  if (isMobile) return;

  const PERSPECTIVE = 600;
  const MAX_TILT    = 10;
  const LIFT        = 6;
  const SHINE_ALPHA = 0.07;

  document.querySelectorAll('.project-card:not(.project-card--placeholder):not(.no-shine)').forEach(card => {
    const shine = document.createElement('div');
    shine.style.cssText = `
      position:absolute; inset:0; border-radius:inherit;
      background:radial-gradient(circle at 50% 50%, rgba(255,255,255,${SHINE_ALPHA}), transparent 70%);
      pointer-events:none; opacity:0; transition:opacity 0.3s; z-index:3;
    `;
    card.appendChild(shine);
    card.style.transformStyle = 'preserve-3d';
    card.style.transition     = 'transform 0.15s ease, background 0.3s';

    card.addEventListener('mouseenter', function() {
      if (parseFloat(this.style.opacity) < 0.85) return;
      shine.style.opacity = '1';
    });
    card.addEventListener('mousemove', function(e) {
      if (parseFloat(this.style.opacity) < 0.85) return;
      const rect = this.getBoundingClientRect();
      const nx = (e.clientX - rect.left)  / rect.width  - 0.5;
      const ny = (e.clientY - rect.top)   / rect.height - 0.5;
      const ry =  nx * MAX_TILT * 2;
      const rx = -ny * MAX_TILT;
      this.style.transform  = `perspective(${PERSPECTIVE}px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(${LIFT}px)`;
      this.style.transition = 'transform 0.08s ease';
      const sx = (nx + 0.5) * 100;
      const sy = (ny + 0.5) * 100;
      shine.style.background = `radial-gradient(circle at ${sx}% ${sy}%, rgba(255,255,255,${SHINE_ALPHA * 2}), transparent 65%)`;
    });
    card.addEventListener('mouseleave', function() {
      this.style.transition = 'transform 0.45s cubic-bezier(0.34,1.56,0.64,1)';
      this.style.transform  = 'perspective(600px) rotateX(0deg) rotateY(0deg) translateZ(0px)';
      shine.style.opacity   = '0';
    });
  });
})();

// ─── CONTADORES ANIMADOS EN STAT-NUM ─────────────────────────
(function initCounters() {
  const statEls = document.querySelectorAll('.stat-num');
  if (!statEls.length) return;

  statEls.forEach(el => {
    const raw    = el.textContent.trim();
    const num    = parseInt(raw, 10);
    const suffix = raw.replace(String(num), '');
    el.dataset.target = num;
    el.dataset.suffix = suffix;
    el.dataset.done   = '0';
    el.textContent    = '0' + suffix;
  });

  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  function animateCounter(el) {
    if (el.dataset.done === '1') return;
    el.dataset.done = '1';
    const target   = parseInt(el.dataset.target, 10);
    const suffix   = el.dataset.suffix;
    const duration = 1000 + target * 8;
    const start    = performance.now();
    function step(now) {
      const progress = clamp((now - start) / duration, 0, 1);
      el.textContent = Math.round(easeOutCubic(progress) * target) + suffix;
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  const counterObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.querySelectorAll('.stat-num').forEach(animateCounter);
      counterObserver.unobserve(entry.target);
    });
  }, { threshold: 0.6 });

  document.querySelectorAll('.project-footer').forEach(f => counterObserver.observe(f));
})();

// ─── GLITCH OCASIONAL EN EL LOGO SA ──────────────────────────
(function initLogoGlitch() {
  const logo = document.querySelector('.nav-logo');
  if (!logo) return;

  const s = document.createElement('style');
  s.textContent = `
    .nav-logo { position: relative; }
    .nav-logo::before, .nav-logo::after {
      content: attr(data-text);
      position: absolute; inset: 0;
      pointer-events: none; opacity: 0;
      font-size: inherit; font-weight: inherit;
      letter-spacing: inherit; text-transform: inherit;
    }
    .nav-logo::before { color: #ff3b3b; mix-blend-mode: screen; clip-path: inset(0 0 50% 0); }
    .nav-logo::after  { color: #00e5ff; mix-blend-mode: screen; clip-path: inset(50% 0 0 0); }
    @keyframes glitch-r {
      0%  { transform:translate(0,0);    opacity:0; }
      10% { transform:translate(3px,0);  opacity:0.85; }
      20% { transform:translate(-2px,1px); opacity:0.7; }
      30% { transform:translate(0,0);    opacity:0; }
      100%{ opacity:0; }
    }
    @keyframes glitch-c {
      0%  { transform:translate(0,0);    opacity:0; }
      10% { transform:translate(-3px,0); opacity:0.8; }
      20% { transform:translate(2px,-1px); opacity:0.65; }
      30% { transform:translate(0,0);    opacity:0; }
      100%{ opacity:0; }
    }
    .nav-logo.glitching::before { animation: glitch-r 0.22s steps(1) forwards; }
    .nav-logo.glitching::after  { animation: glitch-c 0.22s steps(1) forwards; }
  `;
  document.head.appendChild(s);
  logo.setAttribute('data-text', logo.textContent);

  function fireGlitch() {
    let pulses = 0;
    const pulse = setInterval(() => {
      logo.classList.remove('glitching');
      void logo.offsetWidth;
      logo.classList.add('glitching');
      pulses++;
      if (pulses >= 3) {
        clearInterval(pulse);
        setTimeout(() => logo.classList.remove('glitching'), 250);
      }
    }, 120);
    setTimeout(fireGlitch, 4000 + Math.random() * 5000);
  }
  setTimeout(fireGlitch, 3000);
})();

// ─── HAMBURGER MENU (MOBILE) ─────────────────────────────────
(function initMobileNav() {
  const toggle  = document.getElementById('nav-toggle');
  const navbar  = document.getElementById('navbar');
  const navLinks = document.getElementById('nav-links');
  if (!toggle || !navbar) return;

  function closeMenu() {
    navbar.classList.remove('nav-open');
    toggle.setAttribute('aria-expanded', 'false');
    lenis.start();
  }

  toggle.addEventListener('click', () => {
    const isOpen = navbar.classList.toggle('nav-open');
    toggle.setAttribute('aria-expanded', String(isOpen));
    // Pausar scroll suave mientras el menú está abierto
    if (isOpen) lenis.stop(); else lenis.start();
  });

  // Cerrar al hacer click en un link
  if (navLinks) {
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', closeMenu);
    });
  }

  // Cerrar con Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeMenu();
  });
})();

// ─── MAIN LOOP ────────────────────────────────────────────────
function loop(time) {
  lenisRaf(time);
  parallaxHero();
  parallaxSections();
  animateFloaters();
  animateTicker();
  updateProgress();
  updateGridCells();
  if (window._drawNeural) window._drawNeural();
  requestAnimationFrame(loop);
}
loop();

