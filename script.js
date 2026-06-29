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
const smoothstep = (a, b, x) => { x = clamp((x - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };

// ─── STATE ───────────────────────────────────────────────────
let scrollY = 0;
let targetScrollY = 0;
let raf;
const isMobile = window.innerWidth < 700;
const reduceMotionMotor = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ─── SCROLL VELOCITY — MOTOR GLOBAL ───────────────────────────
// Lenis expone la velocidad en cada evento de scroll. La suavizamos y
// normalizamos a una señal compartida que alimenta varios sistemas:
// inercia del campo neural, lean de secciones y aberración cromática.
// El sitio entero "siente" el ritmo del recorrido, no solo el cursor.
// Decae a 0 al frenar → todos los efectos vuelven a reposo, scrubbed.
const scrollMotor = { raw: 0, norm: 0, signed: 0 };
window._scrollMotor = scrollMotor;
const VEL_REF = 55;            // px/frame que cuenta como "scroll rápido" (→ ~1.0)

function updateScrollMotor() {
  if (reduceMotionMotor) return;               // respeta prefers-reduced-motion
  scrollMotor.raw *= 0.86;                      // decae si no llegan eventos (al frenar)
  if (Math.abs(scrollMotor.raw) < 0.02) scrollMotor.raw = 0;
  const n = clamp(Math.abs(scrollMotor.raw) / VEL_REF, 0, 1);
  const s = clamp(scrollMotor.raw / VEL_REF, -1, 1);
  // Attack/release distintos: engancha rápido, suelta suave
  scrollMotor.norm   += (n - scrollMotor.norm)   * (n > scrollMotor.norm ? 0.25 : 0.08);
  scrollMotor.signed += (s - scrollMotor.signed) * (Math.abs(s) > Math.abs(scrollMotor.signed) ? 0.25 : 0.08);
}

// ─── LENIS SMOOTH SCROLL ──────────────────────────────────────
const lenis = new Lenis({
  duration:   1.4,
  easing:     t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true,
  touchMultiplier: 1.5,
});
window.lenis = lenis;

// Lenis alimenta scrollY para que parallax y progress funcionen en sync
lenis.on('scroll', ({ scroll, velocity }) => {
  scrollY = scroll;
  scrollMotor.raw = velocity;
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
  const delay = `${(i % 6) * 0.07}s`;
  el.style.transitionDelay = delay;
  el.style.setProperty('--stagger-delay', delay);
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

  document.querySelectorAll('.skills-grid').forEach(g => prepareGrid(g, getComputedCols(g)));
  const contactGrid = document.querySelector('.contact-grid');
  const projectGrid = document.querySelector('.project-grid');
  if (contactGrid) prepareGrid(contactGrid, getComputedCols(contactGrid));
  if (projectGrid) prepareGrid(projectGrid, getComputedCols(projectGrid));
}

function updateGridCells() {
  const wh = window.innerHeight;
  // Read accent color for ghost border
  const accentRgb = getComputedStyle(document.body)
    .getPropertyValue('--accent-rgb').trim() || '200,241,53';

  document.querySelectorAll('.skills-grid, .contact-grid, .project-grid').forEach(grid => {
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

  // Nombre se aleja: sube despacio y la "cámara" lo cruza (escala leve)
  const h1 = hero.querySelector('h1');
  if (h1) {
    h1.style.transform = `translateY(${sy * 0.24}px) scale(${(1 + progress * 0.06).toFixed(3)})`;
    h1.style.opacity = 1 - progress * 1.6;
  }

  // Subtítulo: capa más cercana → se mueve más rápido
  const sub = hero.querySelector('.hero-sub');
  if (sub) {
    sub.style.transform = `translateY(${sy * 0.42}px)`;
    sub.style.opacity = 1 - progress * 2;
  }

  // Foto: capa de fondo → sube lenta
  const foto = hero.querySelector('.foto-perfil');
  if (foto) {
    foto.style.transform = `translateY(${sy * 0.05}px)`;
  }

  // Tag
  const tag = hero.querySelector('.hero-tag');
  if (tag) {
    tag.style.transform = `translateY(${sy * 0.34}px)`;
    tag.style.opacity = 1 - progress * 2.2;
  }

  // CTA: capa más cercana → desaparece rápido al cruzarla
  const cta = hero.querySelector('.hero-cta');
  if (cta) {
    cta.style.transform = `translateY(${sy * 0.52}px)`;
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
      // Capa interna: el título se separa del número (parallax dentro del header)
      h2.style.transform = `translateY(${centerOffset * depth * 0.6}px)`;
    }
  });
}

// ─── SCROLL-INERTIA LEAN + ABERRACIÓN CROMÁTICA ──────────────
// La velocidad de scroll inclina sutilmente los bloques de cada sección
// (skewY — cizalla vertical, segura para el kerning: no toca el avance
// horizontal de los glifos) y dispara un RGB-split en los headings.
// Ambos son función pura de la velocidad y decaen a 0 al frenar.
// Nunca tocan el h1 del hero ni el transform de reveal del <section>.
const MAX_SKEW = 0.85;   // grados a velocidad máxima
const MAX_CA   = 2.6;    // px de separación RGB a velocidad máxima

const leanEls = [];
const caEls   = [];
if (!isMobile && !reduceMotionMotor) {
  // Lean: header de cada sección + bloques de texto sin acople de medición
  // (los grids quedan libres: su propia animación de ensamblado los maneja).
  document.querySelectorAll('section:not(#hero)').forEach(sec => {
    const head = sec.querySelector('.section-header');
    if (head) { head._pdepth = 0.09; leanEls.push(head); }   // capa de fondo: parallax marcado
  });
  document.querySelectorAll('#sobre-mi .sm-body, #experiencia .item, #educacion .item')
    .forEach(el => { el._pdepth = 0.04; leanEls.push(el); }); // capa de contenido: parallax sutil
  leanEls.forEach(el => { el.style.willChange = 'transform, filter'; });

  // Aberración: headings (texto con masa suficiente para que el split se lea)
  document.querySelectorAll('section:not(#hero) h2, .item h3, .project-card:not(.project-card--placeholder) .project-title')
    .forEach(el => caEls.push(el));
}

let leanActive = false, caActive = false;

function applyScrollLean() {
  if (!leanEls.length) return;
  const sk = -scrollMotor.signed * MAX_SKEW;      // el bloque "queda atrás" en la dirección del recorrido
  if (Math.abs(sk) < 0.012) {
    if (leanActive) { leanActive = false; for (const el of leanEls) el.style.setProperty('--lean', '0deg'); }
    return;
  }
  leanActive = true;
  const v = `${sk.toFixed(3)}deg`;
  // Escribe SU variable; el transform compuesto vive en CSS (así no pisa el --fs del focus).
  for (const el of leanEls) el.style.setProperty('--lean', v);
}

// ─── FOCUS RACK + CÁMARA DE SCROLL ───────────────────────────
// Convierte el scroll en un travelling de cámara. Cada bloque, según su
// posición/velocidad, recibe tres cosas que componen vía CSS vars:
//   1) DOF: se desenfoca (--fb) y achica (--fs) cuanto más lejos del centro
//      del viewport está → el foco "viaja" con vos. Centro nítido (FOCUS_DEAD)
//      para no tocar la lectura de lo que estás mirando.
//   2) Parallax por capa (--py): cada bloque tiene profundidad propia
//      (head._pdepth fondo, contenido sutil) → al scrollear se separan en Z.
//   3) Motion-blur global por velocidad: toda la página vuela borrosa en
//      scroll rápido y ENFOCA de golpe al frenar (rack focus).
// Función pura de posición + scrollMotor; decae a reposo. Off en mobile/RM.
const FOCUS_DEAD = 0.30;   // fracción de media pantalla que queda nítida
const MAX_FB     = 2.0;    // px de blur por posición (DOF en los bordes)
const MAX_FSC    = 0.06;   // achicado máximo por posición (dolly, 6%)
const MAX_VBLUR  = 1.3;    // px de motion-blur a velocidad máxima (enfoca al parar)
const PY_MAX     = 72;     // tope del parallax por capa (px)
function updateFocus() {
  if (isMobile || reduceMotionMotor || !leanEls.length) return;
  const vh     = window.innerHeight;
  const halfH  = vh / 2;
  const vBlur  = scrollMotor.norm * MAX_VBLUR;     // toda la página vuela borrosa; enfoca al frenar
  const velAmp = 1 + scrollMotor.norm * 1.0;       // scroll rápido → capas más separadas (más profundidad)
  for (const el of leanEls) {
    const r = el.getBoundingClientRect();
    if (r.bottom < -220 || r.top > vh + 220) {
      if (el._fb !== 0 || el._py !== 0) {
        el.style.setProperty('--fb', '0px');
        el.style.setProperty('--fs', '1');
        el.style.setProperty('--py', '0px');
        el._fb = 0; el._fs = 1; el._py = 0;
      }
      continue;
    }
    const center = (r.top + r.height / 2) - halfH;          // <0 arriba del centro, >0 abajo
    const dist = clamp(Math.abs(center) / halfH, 0, 1);
    const f  = smoothstep(FOCUS_DEAD, 1, dist);
    const fb = Math.round((f * MAX_FB + vBlur) * 10) / 10;   // DOF por posición + motion-blur por velocidad
    const fs = +(1 - f * MAX_FSC).toFixed(3);                // dolly: achica lo lejano
    const py = Math.round(clamp(center * (el._pdepth || 0) * velAmp, -PY_MAX, PY_MAX) * 2) / 2;
    if (fb !== el._fb) { el.style.setProperty('--fb', fb + 'px'); el._fb = fb; }
    if (fs !== el._fs) { el.style.setProperty('--fs', fs); el._fs = fs; }
    if (py !== el._py) { el.style.setProperty('--py', py + 'px'); el._py = py; }
  }
}

function applyChromaticAberration() {
  if (!caEls.length) return;
  const amt = scrollMotor.norm;
  if (amt < 0.025) {
    if (caActive) { caActive = false; for (const el of caEls) el.style.textShadow = ''; }
    return;
  }
  caActive = true;
  const dx = amt * MAX_CA;
  const a  = clamp(amt * 0.95, 0, 0.8);
  const sh = `${dx.toFixed(2)}px 0 rgba(255,59,59,${a.toFixed(3)}), ${(-dx).toFixed(2)}px 0 rgba(0,229,255,${a.toFixed(3)})`;
  for (const el of caEls) el.style.textShadow = sh;
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

    update(mx, my, field) {
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

      // Campo del icosaedro: atracción + componente tangencial → las
      // partículas orbitan el sólido (se siente un campo de fuerza).
      if (field && field.strength > 0.01) {
        const fdx = field.cx - this.x, fdy = field.cy - this.y;
        const fdist = Math.hypot(fdx, fdy);
        const reach = field.r * 1.7;
        if (fdist < reach && fdist > 1) {
          const k  = (1 - fdist / reach) * field.strength * 0.05;
          const ix = fdx / fdist, iy = fdy / fdist;
          // Tangencial dominante (orbitan) + radial débil (cohesión sin colapso)
          this.vx += ix * k * 0.3 - iy * k;
          this.vy += iy * k * 0.3 + ix * k;
        }
      }

      // Inercia de scroll: momentum vertical en la dirección del recorrido.
      // En scroll rápido las partículas fluyen como una corriente; el
      // damping las reasienta al frenar (señal compartida → siente todo).
      if (scrollMotor.norm > 0.001) this.vy += scrollMotor.signed * 0.32;

      // Vida propia — deriva sinusoidal única por partícula
      this.vx += Math.sin(this.phase * 0.6 + this.y * 0.004) * 0.003;
      this.vy += Math.cos(this.phase * 0.4 + this.x * 0.004) * 0.003;

      // Dampen + clamp
      this.vx *= 0.97;
      this.vy *= 0.97;
      const spd = Math.hypot(this.vx, this.vy);
      // En scroll rápido subimos el techo de velocidad para que la
      // corriente se note; vuelve al base al frenar.
      const maxSpd = CFG.speed * 5 * (1 + scrollMotor.norm * 3.2);
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

    draw(rgb, boost, field, streakLen = 0) {
      // Si la partícula cae detrás del icosaedro: se atenúa y se refracta
      // (desplazamiento radial oscilante) → se nota que está "adentro/atrás".
      let x = this.x, y = this.y, occ = 0;
      if (field && field.strength > 0.01) {
        const ddx = this.x - field.cx, ddy = this.y - field.cy;
        const dd = Math.hypot(ddx, ddy);
        if (dd < field.r) {
          occ = (1 - dd / field.r) * field.strength;
          const inv = dd > 0.001 ? 1 / dd : 0;
          const wob = Math.sin(this.phase * 3 + dd * 0.05) * occ * 6;
          x += ddx * inv * wob;
          y += ddy * inv * wob;
        }
      }

      const pulse = 0.75 + 0.25 * Math.sin(this.phase);
      const energyBoost = 1 + this.energy * 2.5;
      let alpha = Math.min(this.baseAlpha * pulse * boost * energyBoost, 0.95);
      let radius = this.r * pulse * (1 + this.energy * 0.8);
      // Oclusión: el volumen translúcido del sólido atenúa lo que tiene detrás
      alpha  *= (1 - occ * 0.78);
      radius *= (1 - occ * 0.22);

      // Halo brillante cuando tiene energía
      if (this.energy > 0.15) {
        const haloAlpha = this.energy * 0.18 * boost * (1 - occ * 0.7);
        const grad = ctx.createRadialGradient(x, y, 0, x, y, radius * 5);
        grad.addColorStop(0, `rgba(${rgb},${haloAlpha})`);
        grad.addColorStop(1, `rgba(${rgb},0)`);
        ctx.beginPath();
        ctx.arc(x, y, radius * 5, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }

      // Smear vertical en scroll rápido: el nodo se estira en la
      // dirección del recorrido (motion blur) y vuelve a punto al frenar.
      if (streakLen > 1.2) {
        ctx.strokeStyle = `rgba(${rgb},${alpha})`;
        ctx.lineWidth = radius * 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x, y - streakLen);
        ctx.lineTo(x, y + streakLen);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb},${alpha})`;
        ctx.fill();
      }
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
    // Campo del icosaedro (centro/radio en px de pantalla + intensidad).
    // Lo exporta el hero 3D; null si está dormido o fuera del hero.
    const field   = window._icoField;

    // Inercia de scroll: estira la malla y los nodos en la dirección del
    // recorrido e intensifica las conexiones. Todo decae a 0 al frenar.
    const vNorm        = scrollMotor.norm;
    const streakL      = vNorm * 18;                 // px de smear vertical por nodo
    const maxDist      = CFG.maxDist * (1 + vNorm * 0.22);
    const velLineBoost = 1 + vNorm * 1.4;

    ctx.clearRect(0, 0, W, H);

    // Update partículas
    particles.forEach(p => p.update(nmx, nmy, field));

    // Dibujar conexiones con grosor variable por distancia
    for (let i = 0; i < particles.length; i++) {
      const a = particles[i];
      for (let j = i + 1; j < particles.length; j++) {
        const b = particles[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const dist = Math.hypot(dx, dy);
        if (dist > maxDist) continue;

        const t = 1 - dist / maxDist;
        let alpha = t * t * CFG.lineMaxAlpha * lBoost;

        // Boost por energía de los nodos + inercia de scroll (la malla se
        // intensifica y estira en scroll rápido)
        const energyMult = 1 + (a.energy + b.energy) * 1.8;
        alpha *= energyMult * velLineBoost;

        // Boost cerca del mouse
        const midX = (a.x + b.x) / 2, midY = (a.y + b.y) / 2;
        const mdist = Math.hypot(midX - nmx, midY - nmy);
        if (mdist < CFG.mouseRadius) {
          alpha = Math.min(alpha + (1 - mdist / CFG.mouseRadius) * CFG.mouseLineAlpha * lBoost,
                          CFG.mouseLineAlpha * lBoost * 1.5);
        }

        // Oclusión: las conexiones detrás del sólido se atenúan
        if (field && field.strength > 0.01) {
          const omd = Math.hypot(midX - field.cx, midY - field.cy);
          if (omd < field.r) alpha *= (1 - (1 - omd / field.r) * field.strength * 0.82);
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

    // Dibujar nodos encima (con smear vertical si hay inercia de scroll)
    particles.forEach(p => p.draw(rgb, boost, field, streakL));

    // Dot en el mouse — único cursor
    if (nmx > 0) {
      const isHover = document.body.classList.contains('cursor-hover') ||
                      document.body.classList.contains('cursor-card');
      const isClick = document.body.classList.contains('cursor-click');

      let dotA   = isLight ? 0.95 : 0.88;
      let coreR  = isClick ? 2 : isHover ? 4 : 3;
      let haloR  = isClick ? 10 : isHover ? 22 : 14;
      let haloA  = isClick ? 0.35 : 0.22;

      // Si el cursor entra en el icosaedro: se atenúa y refracta (queda detrás).
      let cx = nmx, cy = nmy;
      if (field && field.strength > 0.01) {
        const ddx = nmx - field.cx, ddy = nmy - field.cy;
        const dd = Math.hypot(ddx, ddy);
        if (dd < field.r) {
          const cOcc = (1 - dd / field.r) * field.strength;
          const inv  = dd > 0.001 ? 1 / dd : 0;
          const wob  = Math.sin(performance.now() * 0.005 + dd * 0.05) * cOcc * 5;
          cx += ddx * inv * wob; cy += ddy * inv * wob;
          dotA  *= (1 - cOcc * 0.6);
          haloA *= (1 - cOcc * 0.5);
          coreR *= (1 - cOcc * 0.25);
        }
      }

      // Halo difuso
      const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, haloR);
      halo.addColorStop(0,   `rgba(${rgb},${haloA})`);
      halo.addColorStop(1,   `rgba(${rgb},0)`);
      ctx.beginPath(); ctx.arc(cx, cy, haloR, 0, Math.PI * 2);
      ctx.fillStyle = halo; ctx.fill();

      // Núcleo
      ctx.beginPath(); ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
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

// ─── MODAL DE ARQUITECTURA ────────────────────────────────────
// Lightbox que muestra el diagrama de clases del proyecto al
// interactuar con la card. Cierra con Escape, click en el backdrop
// o el botón ✕; pausa Lenis y devuelve el foco al abridor.
(function initArchModal() {
  const modal = document.getElementById('arch-modal');
  if (!modal) return;
  const openers = document.querySelectorAll('[data-arch-open]');
  if (!openers.length) return;
  let lastFocused = null;

  function open() {
    lastFocused = document.activeElement;
    modal.hidden = false;
    requestAnimationFrame(() => modal.classList.add('open'));
    document.body.style.overflow = 'hidden';
    // El cursor custom se dibuja en el canvas (z detrás del modal): sin esto
    // queda invisible sobre el modal. 'cursor-hidden' reactiva el cursor nativo.
    document.body.classList.add('cursor-hidden');
    if (window.lenis) window.lenis.stop();
    const closeBtn = modal.querySelector('.arch-modal-close');
    if (closeBtn) closeBtn.focus();
  }
  function close() {
    if (modal.hidden) return;
    modal.classList.remove('open');
    document.body.style.overflow = '';
    document.body.classList.remove('cursor-hidden');
    if (window.lenis) window.lenis.start();
    setTimeout(() => { modal.hidden = true; }, 280);
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }

  openers.forEach(b => b.addEventListener('click', open));
  modal.querySelectorAll('[data-arch-close]').forEach(b => b.addEventListener('click', close));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') close();
  });
})();

// ─── HERO 3D — ICOSAEDRO DECONSTRUIBLE (Three.js) ─────────────
// El blob del hero es un icosaedro facetado (180 caras) que late
// suavemente. Al scrollear fuera del hero se DECONSTRUYE: una onda
// recorre el sólido, cada cara se desprende con un flash, vuela
// rotando sobre su propio eje, se encoge y se disuelve en
// partículas que derivan hacia arriba — eco del SA point cloud de
// más abajo. Todo es función pura del progress de scroll:
// scrubbed y 100% reversible.
function initHero3D() {
  if (isMobile) return;

  const canvas = document.getElementById('hero-3d');
  if (!canvas || typeof THREE === 'undefined') return;

  const reduceMotion3d = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const heroEl = document.getElementById('hero');

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.set(0, 0, 5);

  // Grupo raíz — su escala/posición replican el layout original
  // (blob de ~480px anclado a la derecha) sobre el canvas fullscreen.
  const group = new THREE.Group();
  scene.add(group);

  function getAccentHex() {
    return document.body.classList.contains('claro') ? 0x5b4cff : 0xc8f135;
  }

  const sstep = (a, b, x) => { x = clamp((x - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };
  const bell  = (x, c, w) => { const d = Math.abs(x - c) / w; return d >= 1 ? 0 : (1 - d * d) * (1 - d * d); };
  const rnd3  = s => { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453123; return x - Math.floor(x); };

  // ── Mouse (relativo al hero, igual que siempre) ──────────────
  let mx3 = 0, my3 = 0;
  heroEl.addEventListener('mousemove', e => {
    const r = heroEl.getBoundingClientRect();
    mx3 = ((e.clientX - r.left) / r.width  - 0.5) * 2;
    my3 = ((e.clientY - r.top)  / r.height - 0.5) * 2;
  });
  heroEl.addEventListener('mouseleave', () => { mx3 = 0; my3 = 0; });

  // ── Geometría: icosaedro facetado, cada cara independiente ───
  const RADIUS = 1.3;
  let srcGeo = new THREE.IcosahedronGeometry(RADIUS, 2);
  if (srcGeo.index) srcGeo = srcGeo.toNonIndexed();
  const basePos = srcGeo.attributes.position.array.slice();
  srcGeo.dispose();
  const FACES = basePos.length / 9;
  const VERTS = FACES * 3;

  // Datos de deconstrucción por cara: la onda de pelado entra por
  // arriba-adelante; cada cara recibe dirección de vuelo (afuera +
  // sesgo hacia arriba), eje y velocidad de giro propios.
  const sweep = new THREE.Vector3(0.32, 0.9, 0.34).normalize();
  const faceData = [];
  {
    const _c = new THREE.Vector3();
    for (let f = 0; f < FACES; f++) {
      const o = f * 9;
      _c.set(
        (basePos[o]     + basePos[o + 3] + basePos[o + 6]) / 3,
        (basePos[o + 1] + basePos[o + 4] + basePos[o + 7]) / 3,
        (basePos[o + 2] + basePos[o + 5] + basePos[o + 8]) / 3
      );
      const along = (_c.clone().normalize().dot(sweep) + 1) / 2; // 1 = parte primero
      const fly = _c.clone().normalize()
        .add(new THREE.Vector3(rnd3(f * 7 + 2) - 0.5, rnd3(f * 7 + 3) - 0.5, rnd3(f * 7 + 4) - 0.5).multiplyScalar(0.9))
        .add(new THREE.Vector3(0, 0.8, 0.25))
        .normalize();
      const axis = new THREE.Vector3(rnd3(f * 5 + 5) - 0.5, rnd3(f * 5 + 6) - 0.5, rnd3(f * 5 + 7) - 0.5).normalize();
      faceData.push({
        stagger: clamp(0.62 * (1 - along) + 0.38 * rnd3(f * 3 + 1), 0, 1),
        fx: fly.x, fy: fly.y, fz: fly.z,
        ax: axis.x, ay: axis.y, az: axis.z,
        dist: 2.3 + rnd3(f * 3 + 8) * 3.1,
        spin: (rnd3(f * 3 + 9) - 0.5) * 9,
        cs0: 0.038 + rnd3(f * 11 + 1) * 0.026,
        cs1: 0.038 + rnd3(f * 11 + 2) * 0.026,
        cs2: 0.038 + rnd3(f * 11 + 3) * 0.026,
      });
    }
  }

  // Partículas de disolución: 4 por cara, en coords baricéntricas,
  // con trayectoria libre propia al soltarse de la cara.
  const INNER = 4;
  const P_COUNT = FACES * (3 + INNER);
  const innerData = [];
  for (let f = 0; f < FACES; f++) {
    for (let k = 0; k < INNER; k++) {
      const s = f * 31 + k * 7;
      const su = Math.sqrt(rnd3(s + 1));
      const dir = new THREE.Vector3(rnd3(s + 3) - 0.5, rnd3(s + 4) - 0.5 + 0.55, rnd3(s + 5) - 0.5).normalize();
      innerData.push({
        b0: 1 - su, b1: su * (1 - rnd3(s + 2)), b2: su * rnd3(s + 2),
        dx: dir.x, dy: dir.y, dz: dir.z,
        dist: 1.3 + rnd3(s + 6) * 2.4,
        phase: rnd3(s + 8) * Math.PI * 2,
        size: 0.02 + rnd3(s + 9) * 0.03,
      });
    }
  }

  // ── Buffers dinámicos + shaders con alpha por vértice ─────────
  const morphPos = new Float32Array(VERTS * 3);
  const fillPos  = new Float32Array(VERTS * 3);
  const fillAArr = new Float32Array(VERTS);
  const linePos  = new Float32Array(FACES * 18);
  const lineAArr = new Float32Array(FACES * 6);
  const lineFArr = new Float32Array(FACES * 6);
  const ptsPos   = new Float32Array(P_COUNT * 3);
  const ptsAArr  = new Float32Array(P_COUNT);
  const ptsSArr  = new Float32Array(P_COUNT);
  const ptsFArr  = new Float32Array(P_COUNT);
  const _tv      = new Float32Array(9);

  function dynAttr(arr, size) {
    const a = new THREE.BufferAttribute(arr, size);
    a.setUsage(THREE.DynamicDrawUsage);
    return a;
  }

  const uColor = { value: new THREE.Color(getAccentHex()) };
  const uFlash = { value: new THREE.Color(0xffffff) };
  const uScale = { value: 1 };
  const uGroup = { value: 1 };
  // Profundidad (front/back) + reactividad al cursor. Compartidos por los
  // materiales del sólido; tick3d los actualiza cada frame.
  const uNear     = { value: 4 };
  const uFar      = { value: 6 };
  const uCursor   = { value: new THREE.Vector2(-2, -2) }; // NDC del cursor (offscreen por defecto)
  const uAspect   = { value: 1 };
  const uReactR   = { value: 0.62 };  // radio de reacción (NDC corregido por aspect)
  const uReactStr = { value: 1 };     // intensidad de la reacción (0 al deconstruir)

  // VS compartido: además de proyectar, expone la profundidad en view-space
  // (vDepth) y la cercanía al cursor en pantalla (vProx).
  const VS_HEAD = `
    uniform vec2 uCursor; uniform float uAspect; uniform float uReactR;
    varying float vDepth; varying float vProx;
    varying vec3 vViewPos;
    void setupDepthProx(vec4 mv, vec4 cl) {
      vDepth = -mv.z;
      vViewPos = mv.xyz;                              // view-space, para Fresnel via derivadas
      vec2 ndc = cl.xy / cl.w;
      vec2 d = (ndc - uCursor) * vec2(uAspect, 1.0);
      vProx = clamp(1.0 - length(d) / uReactR, 0.0, 1.0);
    }`;
  // FS compartido: factor de profundidad f (0 frente → 1 fondo).
  const FS_HEAD = `
    uniform float uNear; uniform float uFar; uniform float uReactStr;
    varying float vDepth; varying float vProx;
    float depthF() { return clamp((vDepth - uNear) / (uFar - uNear), 0.0, 1.0); }`;

  const VSH_FLAT = `
    attribute float aA;
    varying float vA;
    ${VS_HEAD}
    void main() {
      vA = aA;
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vec4 cl = projectionMatrix * mv;
      setupDepthProx(mv, cl);
      gl_Position = cl;
    }`;
  const FSH_FLAT = `
    uniform vec3 uColor;
    uniform vec3 uFlash;
    uniform float uOp;
    uniform float uFresPow;
    uniform float uFres;
    varying float vA;
    varying vec3 vViewPos;
    ${FS_HEAD}
    void main() {
      float f = depthF();
      float depthA = mix(1.15, 0.32, f);             // frente opaco, fondo retrocede
      vec3 col = uColor * mix(1.0, 0.45, f);

      // ── Fresnel rim ──────────────────────────────────────────
      // Normal plana de la cara reconstruida con derivadas del
      // view-pos (flat shading). En ángulos rasantes — la silueta
      // del blob — el término se enciende: un halo de energía lima
      // que crece con la curvatura. Cada shard que vuela conserva
      // su propio rim al tumbar.
      vec3 N  = normalize(cross(dFdx(vViewPos), dFdy(vViewPos)));
      vec3 Vd = normalize(-vViewPos);
      float fres = pow(1.0 - abs(dot(N, Vd)), uFresPow) * uFres * mix(1.0, 0.5, f);
      col = mix(col, uColor * 1.9, clamp(fres, 0.0, 1.0));   // borde → lima brillante
      col += uColor * fres * 0.3;                            // bloom aditivo sutil

      float react = vProx * vProx * uReactStr * mix(1.0, 0.45, f);
      col = mix(col, uFlash, react * 0.5);
      gl_FragColor = vec4(col, vA * uOp * depthA + react * 0.08 + fres * 0.42 * uOp);
    }`;
  const VSH_LINE = `
    attribute float aA;
    attribute float aF;
    varying float vA;
    varying float vF;
    ${VS_HEAD}
    void main() {
      vA = aA; vF = aF;
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vec4 cl = projectionMatrix * mv;
      setupDepthProx(mv, cl);
      gl_Position = cl;
    }`;
  const FSH_LINE = `
    uniform vec3 uColor;
    uniform vec3 uFlash;
    uniform float uOp;
    varying float vA;
    varying float vF;
    ${FS_HEAD}
    void main() {
      float f = depthF();
      float depthA = mix(1.2, 0.26, f);              // aristas del fondo casi desaparecen
      vec3 col = uColor * mix(1.0, 0.4, f);
      col = mix(col, uFlash, vF);                    // flash de deconstrucción
      float react = vProx * vProx * uReactStr * mix(1.0, 0.4, f);
      col = mix(col, uFlash, react * 0.7);           // se encienden bajo el cursor
      gl_FragColor = vec4(col, vA * uOp * depthA + react * 0.16);
    }`;
  const VSH_PTS = `
    attribute float aA;
    attribute float aS;
    attribute float aF;
    varying float vA;
    varying float vF;
    varying float vDepth;
    uniform float uScale;
    uniform float uGroup;
    void main() {
      vA = aA; vF = aF;
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vDepth = -mv.z;
      gl_PointSize = aS * uGroup * uScale / -mv.z;
      gl_Position = projectionMatrix * mv;
    }`;
  const FSH_PTS = `
    uniform vec3 uColor;
    uniform vec3 uFlash;
    uniform float uOp;
    uniform float uNear;
    uniform float uFar;
    varying float vA;
    varying float vF;
    varying float vDepth;
    void main() {
      float d = length(gl_PointCoord - 0.5);
      float m = smoothstep(0.5, 0.16, d);
      float f = clamp((vDepth - uNear) / (uFar - uNear), 0.0, 1.0);
      gl_FragColor = vec4(mix(uColor, uFlash, vF), vA * m * uOp * mix(1.1, 0.4, f));
    }`;

  const fillMat = new THREE.ShaderMaterial({
    vertexShader: VSH_FLAT, fragmentShader: FSH_FLAT,
    uniforms: { uColor, uFlash, uOp: { value: 1 }, uNear, uFar, uReactStr, uCursor, uAspect, uReactR,
                uFresPow: { value: 2.6 }, uFres: { value: 1 } },
    transparent: true, depthWrite: false, depthTest: false, side: THREE.DoubleSide,
  });
  fillMat.extensions.derivatives = true; // GL_OES_standard_derivatives (dFdx/dFdy) — r128/WebGL1
  const lineMat = new THREE.ShaderMaterial({
    vertexShader: VSH_LINE, fragmentShader: FSH_LINE,
    uniforms: { uColor, uFlash, uOp: { value: 1 }, uNear, uFar, uReactStr, uCursor, uAspect, uReactR },
    transparent: true, depthWrite: false, depthTest: false,
  });
  const ptsMat = new THREE.ShaderMaterial({
    vertexShader: VSH_PTS, fragmentShader: FSH_PTS,
    uniforms: { uColor, uFlash, uScale, uGroup, uOp: { value: 1 }, uNear, uFar },
    transparent: true, depthWrite: false, depthTest: false,
  });

  const fillGeo = new THREE.BufferGeometry();
  fillGeo.setAttribute('position', dynAttr(fillPos, 3));
  fillGeo.setAttribute('aA', dynAttr(fillAArr, 1));
  const fillMesh = new THREE.Mesh(fillGeo, fillMat);
  fillMesh.frustumCulled = false;
  fillMesh.renderOrder = 1;
  group.add(fillMesh);

  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', dynAttr(linePos, 3));
  lineGeo.setAttribute('aA', dynAttr(lineAArr, 1));
  lineGeo.setAttribute('aF', dynAttr(lineFArr, 1));
  const lineSeg = new THREE.LineSegments(lineGeo, lineMat);
  lineSeg.frustumCulled = false;
  lineSeg.renderOrder = 2;
  group.add(lineSeg);

  const ptsGeo = new THREE.BufferGeometry();
  ptsGeo.setAttribute('position', dynAttr(ptsPos, 3));
  ptsGeo.setAttribute('aA', dynAttr(ptsAArr, 1));
  ptsGeo.setAttribute('aS', dynAttr(ptsSArr, 1));
  ptsGeo.setAttribute('aF', dynAttr(ptsFArr, 1));
  const pts = new THREE.Points(ptsGeo, ptsMat);
  pts.frustumCulled = false;
  pts.renderOrder = 3;
  group.add(pts);

  // ── Núcleo de energía: flash central mientras se desarma ─────
  function makeHaloTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0,    'rgba(255,255,255,1)');
    grad.addColorStop(0.25, 'rgba(255,255,255,0.55)');
    grad.addColorStop(0.6,  'rgba(255,255,255,0.16)');
    grad.addColorStop(1,    'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }
  const haloMat = new THREE.SpriteMaterial({
    map: makeHaloTexture(), color: getAccentHex(),
    transparent: true, opacity: 0, depthWrite: false, depthTest: false,
    blending: THREE.AdditiveBlending,
  });
  const halo = new THREE.Sprite(haloMat);
  halo.renderOrder = 4;
  group.add(halo);

  // ── Keyword Sprites (orbitan el blob, hijos del grupo) ────────
  function makeKeywordTexture(text) {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 64;
    const ctx2 = c.getContext('2d');
    ctx2.font = '400 15px "DM Mono", monospace';
    ctx2.fillStyle = '#ffffff';
    ctx2.textAlign = 'center';
    ctx2.textBaseline = 'middle';
    ctx2.fillText(text, 128, 32);
    return new THREE.CanvasTexture(c);
  }

  const kwLabels = ['C#', 'Python', '.NET', 'Git', 'SQL', 'HTML/CSS'];
  const kwSprites = kwLabels.map((label, i) => {
    const mat = new THREE.SpriteMaterial({
      map: makeKeywordTexture(label),
      color: getAccentHex(), transparent: true, opacity: 0.7,
      depthWrite: false, depthTest: false,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(1.1, 0.28, 1);
    sprite.renderOrder = 0;
    group.add(sprite);
    return {
      sprite,
      baseAngle: (i / kwLabels.length) * Math.PI * 2,
      radius: 2.15,
      yi: (i % 3 - 1) * 0.72
    };
  });

  // ── Resize: canvas fullscreen, blob anclado donde siempre ────
  const BLOB_PX = 480, RIGHT_PX = 30;
  let groupBaseX = 0, groupBaseScale = 1;
  function resize3d() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const halfH = Math.tan((camera.fov * Math.PI) / 360) * camera.position.z;
    const halfW = halfH * camera.aspect;
    const cxPx  = w - (RIGHT_PX + BLOB_PX / 2);
    groupBaseX     = ((cxPx / w) * 2 - 1) * halfW;
    groupBaseScale = BLOB_PX / h;
    uScale.value   = (h * renderer.getPixelRatio()) / 2;
    uAspect.value  = w / h;
  }
  window.addEventListener('resize', () => setTimeout(resize3d, 100));
  resize3d();

  // ── Progress de deconstrucción: scrubbed por el scroll ────────
  // 0 en reposo → 1 cuando el hero terminó de salir (~90% de su alto).
  function deconProgress() {
    const heroH = heroEl.offsetHeight || window.innerHeight;
    return clamp((scrollY - heroH * 0.05) / (heroH * 0.85), 0, 1);
  }

  let t3d = 0, rotX = 0, rotY = 0, pSmooth = 0, sleeping = false;
  const _projV = new THREE.Vector3(), _projE = new THREE.Vector3();

  function tick3d() {
    requestAnimationFrame(tick3d);

    const pT = deconProgress();
    pSmooth += (pT - pSmooth) * 0.1;
    if (Math.abs(pT - pSmooth) < 0.001) pSmooth = pT;
    // Reduced motion: sin vuelo de piezas, solo un fade del blob
    const p = reduceMotion3d ? 0 : pSmooth;
    const globalFade = reduceMotion3d ? 1 - sstep(0.05, 0.5, pT) : 1;

    // Dormir el canvas cuando la deconstrucción terminó (ahorra GPU)
    const asleep = reduceMotion3d ? pT >= 0.55 : (pT >= 1 && pSmooth > 0.995);
    if (asleep !== sleeping) {
      sleeping = asleep;
      canvas.style.visibility = asleep ? 'hidden' : '';
    }
    if (asleep) { window._icoField = null; return; }

    t3d += 0.012;

    const accentHex = getAccentHex();
    const isLight   = document.body.classList.contains('claro');
    uColor.value.setHex(accentHex);
    uFlash.value.setHex(isLight ? 0x1d1480 : 0xffffff);
    fillMat.uniforms.uOp.value = (isLight ? 1.6  : 1) * globalFade;
    lineMat.uniforms.uOp.value = (isLight ? 1.25 : 1) * globalFade;
    ptsMat.uniforms.uOp.value  = (isLight ? 1.2  : 1) * globalFade;

    // Fresnel: pulso lento (energía que respira) + se atenúa al desarmarse,
    // dejando solo un eco de rim en cada shard. En claro va más suave.
    const fresPulse = 0.8 + 0.2 * Math.sin(t3d * 1.7);
    fillMat.uniforms.uFres.value = (isLight ? 0.6 : 1.0) * fresPulse * globalFade * (1 - p * 0.4);

    // Rotación integrada — se calma conforme el sólido se desarma,
    // así las piezas vuelan estables (y sigue siendo reversible)
    const calm = 1 - p * 0.92;
    rotY += 0.00144 * calm;
    rotX += 0.00096 * calm;
    group.rotation.set(rotX + my3 * 0.4 * calm, rotY + mx3 * 0.4 * calm, 0);

    // Drift del enjambre: sube, se corre hacia el centro y se acerca
    group.position.set(groupBaseX - p * 0.55, Math.pow(p, 1.25) * 1.05, p * 0.6);
    const gs = groupBaseScale * (1 + p * 0.4);
    group.scale.setScalar(gs);
    uGroup.value = gs;

    // ── Profundidad: rango near/far alrededor del centro del sólido ──
    const cdist = camera.position.z - group.position.z;
    const wRad  = RADIUS * gs;
    uNear.value = cdist - wRad * 1.08;
    uFar.value  = cdist + wRad * 1.08;

    // ── Cursor en NDC (canvas fullscreen) + reactividad (se apaga al desarmar)
    uCursor.value.set(
      (mouseX / window.innerWidth)  * 2 - 1,
      -((mouseY / window.innerHeight) * 2 - 1)
    );
    uReactStr.value = (1 - sstep(0, 0.4, p)) * globalFade;

    // ── Campo de oclusión: centro y radio del sólido en px de pantalla, para
    //    que el canvas neural sepa qué partículas/cursor quedan detrás. ──
    _projV.copy(group.position).project(camera);
    _projE.set(group.position.x + wRad, group.position.y, group.position.z).project(camera);
    const W2 = window.innerWidth, H2 = window.innerHeight;
    const scx = (_projV.x * 0.5 + 0.5) * W2, scy = (-_projV.y * 0.5 + 0.5) * H2;
    const ecx = (_projE.x * 0.5 + 0.5) * W2, ecy = (-_projE.y * 0.5 + 0.5) * H2;
    window._icoField = {
      cx: scx, cy: scy,
      r: Math.hypot(ecx - scx, ecy - scy) * 1.12,
      strength: (1 - sstep(0, 0.5, p)) * globalFade,
    };

    // ── Breathing: morph senoidal de siempre, atenuado al desarmar ──
    const amp = 0.17 * (1 - p * 0.55);
    for (let i = 0; i < VERTS * 3; i += 3) {
      const ox = basePos[i], oy = basePos[i + 1], oz = basePos[i + 2];
      const n  = Math.sin(ox * 2.5 + t3d * 0.9) * Math.cos(oy * 2 + t3d * 0.7) * Math.sin(oz * 2.5 + t3d * 0.5);
      const mi = 1 + (mx3 * 0.07 * (ox / RADIUS) + my3 * 0.05 * (oy / RADIUS)) * calm;
      const s  = (1 + n * amp) * mi;
      morphPos[i] = ox * s; morphPos[i + 1] = oy * s; morphPos[i + 2] = oz * s;
    }

    // ── Deconstrucción por cara ──
    const ST = 0.55; // ventana de stagger: la onda tarda esto en recorrer el sólido
    let pi = 0;
    for (let f = 0; f < FACES; f++) {
      const fd = faceData[f];
      const o  = f * 9;
      const lt = clamp(p * (1 + ST) - fd.stagger * ST, 0, 1);

      const cX = (morphPos[o]     + morphPos[o + 3] + morphPos[o + 6]) / 3;
      const cY = (morphPos[o + 1] + morphPos[o + 4] + morphPos[o + 7]) / 3;
      const cZ = (morphPos[o + 2] + morphPos[o + 5] + morphPos[o + 8]) / 3;

      const flyAmt = Math.pow(lt, 1.7) * fd.dist;
      const fx = fd.fx * flyAmt, fy = fd.fy * flyAmt, fz = fd.fz * flyAmt;

      // Rotación de la cara alrededor de su centroide (Rodrigues)
      const ang = lt * fd.spin;
      const ca = Math.cos(ang), sa = Math.sin(ang), ti = 1 - ca;
      const ax = fd.ax, ay = fd.ay, az = fd.az;
      const r00 = ca + ax * ax * ti,      r01 = ax * ay * ti - az * sa, r02 = ax * az * ti + ay * sa;
      const r10 = ay * ax * ti + az * sa, r11 = ca + ay * ay * ti,      r12 = ay * az * ti - ax * sa;
      const r20 = az * ax * ti - ay * sa, r21 = az * ay * ti + ax * sa, r22 = ca + az * az * ti;

      const shrink = 1 - sstep(0.5, 0.93, lt);
      const flash  = bell(lt, 0.2, 0.18); // destello al desprenderse
      const aLine  = (0.3   + flash * 0.85) * (1 - sstep(0.5,  0.88, lt));
      const aFill  = (0.075 + flash * 0.12) * (1 - sstep(0.42, 0.8,  lt));
      const aDot   = (0.5   + flash * 0.6 ) * (1 - sstep(0.55, 0.9,  lt));

      for (let k = 0; k < 3; k++) {
        const vx = morphPos[o + k * 3]     - cX;
        const vy = morphPos[o + k * 3 + 1] - cY;
        const vz = morphPos[o + k * 3 + 2] - cZ;
        const sx = vx * shrink, sy = vy * shrink, sz = vz * shrink;
        _tv[k * 3]     = cX + fx + r00 * sx + r01 * sy + r02 * sz;
        _tv[k * 3 + 1] = cY + fy + r10 * sx + r11 * sy + r12 * sz;
        _tv[k * 3 + 2] = cZ + fz + r20 * sx + r21 * sy + r22 * sz;
      }

      fillPos.set(_tv, o);
      fillAArr[f * 3] = fillAArr[f * 3 + 1] = fillAArr[f * 3 + 2] = aFill;

      const lo = f * 18;
      linePos[lo]      = _tv[0]; linePos[lo + 1]  = _tv[1]; linePos[lo + 2]  = _tv[2];
      linePos[lo + 3]  = _tv[3]; linePos[lo + 4]  = _tv[4]; linePos[lo + 5]  = _tv[5];
      linePos[lo + 6]  = _tv[3]; linePos[lo + 7]  = _tv[4]; linePos[lo + 8]  = _tv[5];
      linePos[lo + 9]  = _tv[6]; linePos[lo + 10] = _tv[7]; linePos[lo + 11] = _tv[8];
      linePos[lo + 12] = _tv[6]; linePos[lo + 13] = _tv[7]; linePos[lo + 14] = _tv[8];
      linePos[lo + 15] = _tv[0]; linePos[lo + 16] = _tv[1]; linePos[lo + 17] = _tv[2];
      for (let k = 0; k < 6; k++) {
        lineAArr[f * 6 + k] = aLine;
        lineFArr[f * 6 + k] = flash * 0.6;
      }

      // Sparkles de vértices: vuelan pegados a la cara
      const cflash = flash * 0.5;
      for (let k = 0; k < 3; k++) {
        ptsPos[pi * 3]     = _tv[k * 3];
        ptsPos[pi * 3 + 1] = _tv[k * 3 + 1];
        ptsPos[pi * 3 + 2] = _tv[k * 3 + 2];
        ptsAArr[pi] = aDot;
        ptsSArr[pi] = k === 0 ? fd.cs0 : (k === 1 ? fd.cs1 : fd.cs2);
        ptsFArr[pi] = cflash;
        pi++;
      }

      // Partículas de disolución: nacen cuando la cara se encoge,
      // se sueltan con turbulencia y uplift, y mueren al final
      const rel = sstep(0.45, 0.82, lt);
      const fr  = sstep(0.45, 1, lt);
      for (let k = 0; k < INNER; k++) {
        const pd = innerData[f * INNER + k];
        let bx = pd.b0 * _tv[0] + pd.b1 * _tv[3] + pd.b2 * _tv[6];
        let by = pd.b0 * _tv[1] + pd.b1 * _tv[4] + pd.b2 * _tv[7];
        let bz = pd.b0 * _tv[2] + pd.b1 * _tv[5] + pd.b2 * _tv[8];
        if (rel > 0) {
          const wob = 0.13 * fr;
          const tx = cX + fx + pd.dx * fr * pd.dist + Math.sin(t3d * 1.4 + pd.phase) * wob;
          const ty = cY + fy + pd.dy * fr * pd.dist + Math.cos(t3d * 1.1 + pd.phase * 1.7) * wob + fr * fr * 1.1;
          const tz = cZ + fz + pd.dz * fr * pd.dist + Math.sin(t3d * 0.9 + pd.phase * 2.3) * wob;
          bx += (tx - bx) * rel;
          by += (ty - by) * rel;
          bz += (tz - bz) * rel;
        }
        ptsPos[pi * 3] = bx; ptsPos[pi * 3 + 1] = by; ptsPos[pi * 3 + 2] = bz;
        ptsAArr[pi] = bell(lt, 0.66, 0.34) * 0.85;
        ptsSArr[pi] = pd.size * (1 + rel * 0.7 * (1 - fr));
        ptsFArr[pi] = bell(lt, 0.55, 0.18) * 0.7;
        pi++;
      }
    }

    fillGeo.attributes.position.needsUpdate = true;
    fillGeo.attributes.aA.needsUpdate = true;
    lineGeo.attributes.position.needsUpdate = true;
    lineGeo.attributes.aA.needsUpdate = true;
    lineGeo.attributes.aF.needsUpdate = true;
    ptsGeo.attributes.position.needsUpdate = true;
    ptsGeo.attributes.aA.needsUpdate = true;
    ptsGeo.attributes.aS.needsUpdate = true;
    ptsGeo.attributes.aF.needsUpdate = true;

    // Núcleo de energía: se enciende a mitad del desarme y se apaga
    haloMat.opacity = bell(p, 0.35, 0.33) * 0.5 * globalFade;
    haloMat.color.setHex(accentHex);
    haloMat.blending = isLight ? THREE.NormalBlending : THREE.AdditiveBlending;
    const hScale = 2.2 + p * 3.4;
    halo.scale.set(hScale, hScale, 1);

    // Keywords: orbitan, y al primer gesto de scroll se alejan y apagan
    const kwFade = 1 - sstep(0.03, 0.3, p);
    kwSprites.forEach(({ sprite, baseAngle, radius, yi }) => {
      const angle = baseAngle + t3d * 0.22;
      const kr = radius * (1 + p * 1.6);
      const sx = Math.cos(angle) * kr;
      const sz = Math.sin(angle) * kr;
      sprite.position.set(sx, yi + Math.sin(t3d * 0.4 + baseAngle) * 0.2, sz);

      // Depth fade: los sprites detrás del blob se ven más tenues
      const depthOpacity = 0.04 + 0.32 * (0.5 + 0.5 * (sz / kr));
      sprite.material.opacity = depthOpacity * kwFade * globalFade;
      sprite.material.color.setHex(accentHex);
    });

    renderer.render(scene, camera);
  }
  tick3d();
}

// Three.js (~150KB gzip) solo se usa en desktop: en mobile el icosaedro
// está apagado. Lo cargamos de forma diferida para no descargarlo en
// mobile; initHero3D arranca recién en el onload de la librería.
if (!isMobile) {
  const _three = document.createElement('script');
  _three.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
  _three.onload = initHero3D;
  document.head.appendChild(_three);
}


// ─── SA POINT CLOUD — logo de partículas ─────────────────────
// Cientos de partículas muestreadas del texto "SA" (misma fuente
// que el nav-logo). Flotan dispersas como starfield, convergen en
// espiral al entrar en viewport y se repelen del cursor.
// S = color de texto, A = acento (igual que el logo del navbar).
(function initSACloud() {
  const canvas = document.getElementById('sa-cloud-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const CFG = {
    densityArea:  460,   // px² por partícula (subido con el canvas → misma densidad del logo)
    minCount:     280,
    maxCount:     950,
    springK:      0.032, // resorte hacia el target
    damping:      0.86,
    repelRadius:  110,
    repelForce:   5.0,
    swirl:        3.2,   // impulso tangencial al converger (espiral)
    dotMin:       0.9,
    dotMax:       2.2,
    linkDist:     17,    // distancia máx entre targets para enlazar
    linkBreak:    46,    // distancia actual a la que el enlace se corta
    linkAlpha:    0.10,
    maxLinks:     900,
  };

  let W = 0, H = 0;
  let particles = [];
  let links = [];
  let saBBox = null;       // bounding box de los targets — zona "letras" (fade de bordes)
  let triggered = false;
  let triggerAt = 0;

  // Pointer propio (mouse + touch) en coords de viewport
  let px = -9999, py = -9999;
  document.addEventListener('mousemove', e => { px = e.clientX; py = e.clientY; });
  document.addEventListener('touchmove', e => {
    if (e.touches.length) { px = e.touches[0].clientX; py = e.touches[0].clientY; }
  }, { passive: true });
  document.addEventListener('touchend', () => { px = -9999; py = -9999; });

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 10) return false;
    W = Math.round(rect.width);
    H = Math.round(rect.height);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width  = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return true;
  }

  // Dibuja "SA" offscreen y devuelve puntos {x, y, letter}.
  // Truco: S en rojo y A en verde — el canal RGB dice a qué letra
  // pertenece cada punto muestreado.
  function sampleLogo() {
    const off = document.createElement('canvas');
    off.width = W; off.height = H;
    const o = off.getContext('2d', { willReadFrequently: true });

    // El logo se muestrea al 0.78 del canvas (no al 0.94): el canvas es más
    // grande que el logo a propósito, dejando ~20% de margen alrededor para que
    // los puntos repelidos/derivados nunca se escapen de la capa.
    let size = H * 0.78;
    const setFont = s => { o.font = `800 ${s}px 'Syne', sans-serif`; };
    setFont(size);
    let tracking = size * 0.02;
    let m = o.measureText('SA');
    const maxW = W * 0.78;
    if (m.width + tracking > maxW) {
      size *= maxW / (m.width + tracking);
      tracking = size * 0.02;
      setFont(size);
      m = o.measureText('SA');
    }

    const asc   = m.actualBoundingBoxAscent  || size * 0.72;
    const desc  = m.actualBoundingBoxDescent || 0;
    const baseY = H / 2 + (asc - desc) / 2;
    const x0    = (W - (m.width + tracking)) / 2;

    o.fillStyle = '#f00';
    o.fillText('S', x0, baseY);
    o.fillStyle = '#0f0';
    o.fillText('A', x0 + o.measureText('S').width + tracking, baseY);

    const img = o.getImageData(0, 0, W, H).data;

    // Cobertura aproximada del glifo para elegir el paso de muestreo
    let coverage = 0;
    for (let i = 3; i < img.length; i += 16) if (img[i] > 110) coverage++;
    coverage *= 4;
    const desired = clamp(Math.round((W * H) / CFG.densityArea), CFG.minCount, CFG.maxCount);
    const step = Math.max(2, Math.round(Math.sqrt(coverage / desired)));

    const pts = [];
    const jit = step * 0.22;
    for (let y = 0; y < H; y += step) {
      for (let x = 0; x < W; x += step) {
        const i = (y * W + x) * 4;
        if (img[i + 3] < 110) continue;
        pts.push({
          x: x + (Math.random() - 0.5) * jit,
          y: y + (Math.random() - 0.5) * jit,
          letter: img[i] > img[i + 1] ? 0 : 1,
        });
      }
    }
    return pts;
  }

  function buildParticles() {
    const pts = sampleLogo();
    if (!pts.length) return;
    const old = particles;
    particles = pts.map((pt, i) => {
      const p = old[i] || {
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        kicked: false,
        energy: 0,
      };
      p.tx = pt.x;
      p.ty = pt.y;
      p.letter = pt.letter;
      p.r = CFG.dotMin + Math.random() * (CFG.dotMax - CFG.dotMin);
      p.phase = Math.random() * Math.PI * 2;
      p.baseA = 0.5 + Math.random() * 0.5;
      // Barrido S → A con dispersión: el logo se enciende de izq. a der.
      p.delay = (pt.x / W) * 650 + Math.random() * 480;
      return p;
    });

    // Bounding box de los targets: define la zona "letras". Las partículas que
    // escapan de aquí hacia el borde del canvas se desvanecen (ver _ef en draw),
    // así el límite de la capa no se ve nunca y las letras quedan intactas.
    let bxMin = Infinity, bxMax = -Infinity, byMin = Infinity, byMax = -Infinity;
    for (const p of particles) {
      if (p.tx < bxMin) bxMin = p.tx;
      if (p.tx > bxMax) bxMax = p.tx;
      if (p.ty < byMin) byMin = p.ty;
      if (p.ty > byMax) byMax = p.ty;
    }
    saBBox = { minX: bxMin, maxX: bxMax, minY: byMin, maxY: byMax };

    buildLinks();
  }

  // Malla: pares de partículas cuyos targets son vecinos
  function buildLinks() {
    const all = [];
    const d2max = CFG.linkDist * CFG.linkDist;
    for (let i = 0; i < particles.length; i++) {
      const a = particles[i];
      for (let j = i + 1; j < particles.length; j++) {
        const b = particles[j];
        const dx = a.tx - b.tx, dy = a.ty - b.ty;
        if (dx * dx + dy * dy < d2max) {
          all.push([i, j, (a.letter === 0 && b.letter === 0) ? 0 : 1]);
        }
      }
    }
    // Barajar y recortar: malla parcial tipo constelación + 60fps a salvo
    for (let i = all.length - 1; i > 0; i--) {
      const k = Math.floor(Math.random() * (i + 1));
      [all[i], all[k]] = [all[k], all[i]];
    }
    links = all.slice(0, CFG.maxLinks);
  }

  function getColors() {
    const cs = getComputedStyle(document.body);
    const accent = cs.getPropertyValue('--accent-rgb').trim() || '200,241,53';
    const tm = (cs.color || '').match(/\d+/g);
    const text = tm ? tm.slice(0, 3).join(',') : '232,232,232';
    return { accent, text };
  }

  function drawSACloud() {
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 10 || !particles.length) return;
    // Fuera de viewport: no gastar frames
    if (rect.bottom < -100 || rect.top > window.innerHeight + 100) return;

    const now = performance.now();

    // Disparar convergencia cuando el canvas entra de verdad en viewport
    if (!triggered && rect.top < window.innerHeight * 0.78 && rect.bottom > window.innerHeight * 0.1) {
      triggered = true;
      triggerAt = now;
    }
    const t = now / 1000;
    const { accent, text } = getColors();
    const isLight   = document.body.classList.contains('claro');
    const dotBoost  = isLight ? 1.2 : 1;
    const linkBoost = isLight ? 2.4 : 1;

    ctx.clearRect(0, 0, W, H);

    const mx = px - rect.left;
    const my = py - rect.top;

    // ── Física ──
    for (const p of particles) {
      const active = triggered && (now - triggerAt) >= p.delay;

      if (active) {
        if (!p.kicked) {
          // Impulso tangencial único: entran en espiral, no en línea recta
          p.kicked = true;
          const ddx = p.tx - p.x, ddy = p.ty - p.y;
          const dd = Math.hypot(ddx, ddy) || 1;
          const s = (p.phase > Math.PI ? 1 : -1) * Math.min(dd * 0.02, 1) * CFG.swirl;
          p.vx += (-ddy / dd) * s;
          p.vy += ( ddx / dd) * s;
        }
        p.vx += (p.tx - p.x) * CFG.springK;
        p.vy += (p.ty - p.y) * CFG.springK;
        // Respiración sutil en reposo
        p.vx += Math.sin(t * 0.9 + p.phase) * 0.012;
        p.vy += Math.cos(t * 0.7 + p.phase * 1.7) * 0.012;
      } else {
        // Deriva libre pre-convergencia (starfield)
        p.vx += Math.sin(t * 0.5 + p.phase) * 0.006;
        p.vy += Math.cos(t * 0.4 + p.phase * 1.3) * 0.006;
        if ((p.x < 0 && p.vx < 0) || (p.x > W && p.vx > 0)) p.vx *= -1;
        if ((p.y < 0 && p.vy < 0) || (p.y > H && p.vy > 0)) p.vy *= -1;
      }

      // Repulsión del cursor
      const dx = p.x - mx, dy = p.y - my;
      const d2 = dx * dx + dy * dy;
      if (d2 < CFG.repelRadius * CFG.repelRadius && d2 > 0.01) {
        const d = Math.sqrt(d2);
        const f = 1 - d / CFG.repelRadius;
        p.vx += (dx / d) * f * f * CFG.repelForce;
        p.vy += (dy / d) * f * f * CFG.repelForce;
        p.energy = Math.min(1, p.energy + f * 0.35);
      }
      p.energy *= 0.94;

      p.vx *= CFG.damping;
      p.vy *= CFG.damping;
      p.x += p.vx;
      p.y += p.vy;

      // Fade de bordes: 1 dentro del bbox del logo, → 0 al acercarse al borde
      // del canvas. Suaviza el corte de las partículas que se escapan de la capa
      // (deriva / repulsión del cursor) sin tocar nunca las letras (bbox interior).
      p._ef = saBBox
        ? smoothstep(0, Math.max(saBBox.minX, 1), p.x) *
          smoothstep(W, Math.min(saBBox.maxX, W - 1), p.x) *
          smoothstep(0, Math.max(saBBox.minY, 1), p.y) *
          smoothstep(H, Math.min(saBBox.maxY, H - 1), p.y)
        : 1;
    }

    // ── Malla (se enciende al terminar de converger) ──
    const assembleT = triggered ? clamp((now - triggerAt - 500) / 1400, 0, 1) : 0;
    if (assembleT > 0.02) {
      ctx.lineWidth = 0.6;
      for (let k = 0; k < links.length; k++) {
        const L = links[k];
        const a = particles[L[0]], b = particles[L[1]];
        if (!a || !b) continue;
        const dx = a.x - b.x, dy = a.y - b.y;
        const d = Math.hypot(dx, dy);
        if (d > CFG.linkBreak) continue;
        let alpha = (1 - d / CFG.linkBreak) * CFG.linkAlpha * linkBoost * assembleT;
        alpha *= 1 + (a.energy + b.energy) * 2.4;
        alpha *= Math.min(a._ef, b._ef);   // se desvanece con sus nodos en el borde
        if (alpha < 0.015) continue;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = `rgba(${L[2] === 0 ? text : accent},${Math.min(alpha, 0.5).toFixed(3)})`;
        ctx.stroke();
      }
    }

    // ── Puntos ──
    for (const p of particles) {
      if (p._ef <= 0.001) continue;     // totalmente desvanecida en el borde
      const tw = 0.78 + 0.22 * Math.sin(t * 1.7 + p.phase);
      // Onda de brillo que recorre el logo de izq. a der.
      const wRaw = Math.sin(p.tx * 0.018 - t * 1.5);
      const wave = wRaw > 0 ? wRaw * wRaw * wRaw * 0.5 * assembleT : 0;
      const lit  = triggered && (now - triggerAt) >= p.delay ? 1 : 0.4;
      const alpha = Math.min(p.baseA * tw * dotBoost * lit + wave + p.energy * 0.4, 0.95) * p._ef;
      const r = p.r * (1 + p.energy * 0.9) + wave;
      const rgb = p.letter === 0 ? text : accent;

      // Halo en partículas energizadas por el cursor
      if (p.energy > 0.2) {
        const hr = r * 5;
        const halo = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, hr);
        halo.addColorStop(0, `rgba(${accent},${(p.energy * 0.22 * p._ef).toFixed(3)})`);
        halo.addColorStop(1, `rgba(${accent},0)`);
        ctx.beginPath();
        ctx.arc(p.x, p.y, hr, 0, Math.PI * 2);
        ctx.fillStyle = halo;
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${rgb},${alpha.toFixed(3)})`;
      ctx.fill();
    }
  }

  let saResizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(saResizeTimer);
    saResizeTimer = setTimeout(() => { if (resizeCanvas()) buildParticles(); }, 150);
  });

  function setup() {
    if (!resizeCanvas()) { setTimeout(setup, 150); return; }
    buildParticles();
    if (reduceMotion) {
      // Sin animación de entrada: el logo aparece ya formado
      triggered = true;
      triggerAt = performance.now() - 99999;
      particles.forEach(p => { p.x = p.tx; p.y = p.ty; p.kicked = true; });
    }
    window._drawSACloud = drawSACloud;
  }

  // Esperar la fuente Syne 800 antes de muestrear el logo
  if (document.fonts && document.fonts.ready) {
    Promise.all([
      document.fonts.load("800 100px 'Syne'"),
      document.fonts.ready,
    ]).then(setup, setup);
  } else {
    setup();
  }
})();

// ─── MAIN LOOP ────────────────────────────────────────────────
function loop(time) {
  lenisRaf(time);
  updateScrollMotor();
  parallaxHero();
  parallaxSections();
  applyScrollLean();
  updateFocus();
  applyChromaticAberration();
  animateFloaters();
  animateTicker();
  updateProgress();
  updateGridCells();
  if (window._drawNeural) window._drawNeural();
  if (window._drawSACloud) window._drawSACloud();
  requestAnimationFrame(loop);
}
loop();

