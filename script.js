/* ============================================================
   SANTIAGO ABELLA — Portfolio JS
   Sistema de parallax + elementos flotantes + scroll cinema
   ============================================================ */

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

// ─── NAVBAR SCROLL ────────────────────────────────────────────
window.addEventListener('scroll', () => {
  scrollY = window.scrollY;
  document.getElementById('navbar').classList.toggle('scrolled', scrollY > 50);
});

// ─── SMOOTH SCROLL CON EASING ─────────────────────────────────
function easeOutQuart(t) {
  return 1 - Math.pow(1 - t, 4);
}

function smoothScrollTo(target, duration = 1300) {
  const start = window.scrollY;
  const distance = target - start;
  const startTime = performance.now();

  function step(now) {
    const elapsed = now - startTime;
    const progress = clamp(elapsed / duration, 0, 1);
    window.scrollTo(0, start + distance * easeOutQuart(progress));
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', e => {
    const id = link.getAttribute('href').slice(1);
    if (!id) return;
    const target = document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    const navH = document.getElementById('navbar')?.offsetHeight || 0;
    smoothScrollTo(target.getBoundingClientRect().top + window.scrollY - navH);
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
document.querySelectorAll('.item, .skill-item, .contact-item').forEach((el, i) => {
  el.style.transitionDelay = `${(i % 6) * 0.07}s`;
});

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
  if (skillGrid)   prepareGrid(skillGrid,   getComputedCols(skillGrid));
  if (contactGrid) prepareGrid(contactGrid, getComputedCols(contactGrid));
}

function updateGridCells() {
  const wh = window.innerHeight;
  // Read accent color for ghost border
  const accentRgb = getComputedStyle(document.documentElement)
    .getPropertyValue('--accent-rgb').trim() || '200,241,53';

  ['.skills-grid', '.contact-grid'].forEach(selector => {
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
      // inFlight goes 0→1→0: peaks mid-flight, gone when settled
      const inFlight    = Math.sin(eased * Math.PI);  // bell curve 0→1→0
      const borderAlpha = inFlight * 0.30;             // max 0.30 opacity — tenuo

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
  const sy = window.scrollY;
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

  // Fondo "SA" se mueve en dirección opuesta (zoom out effect)
  hero.style.setProperty('--bg-text-y', `${-sy * 0.06}px`);
}

// ─── PARALLAX SECTIONS ────────────────────────────────────────
function parallaxSections() {
  if (isMobile) return;
  const sy = window.scrollY;
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

// ─── CURSOR GLOW ──────────────────────────────────────────────
const glow = document.createElement('div');
glow.id = 'cursor-glow';
document.body.appendChild(glow);

let mouseX = -200, mouseY = -200;
let glowX = -200, glowY = -200;

document.addEventListener('mousemove', e => {
  mouseX = e.clientX;
  mouseY = e.clientY;
});

function animateCursor() {
  glowX = lerp(glowX, mouseX, 0.08);
  glowY = lerp(glowY, mouseY, 0.08);
  glow.style.transform = `translate(${glowX}px, ${glowY}px)`;
  requestAnimationFrame(animateCursor);
}
if (!isMobile) animateCursor();

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
  const sy = window.scrollY;
  const docH = document.body.offsetHeight;

  floaterEls.forEach(({ el, baseY, speed, shape }) => {
    if (speed === 0) return;
    const offset = sy * speed;
    el.style.transform = `translateY(${offset}px)`;
  });
}

// ─── HORIZONTAL SCROLL TICKER ─────────────────────────────────
let tickerX = 0;
function animateTicker() {
  const ticker = document.querySelector('.ticker-inner');
  if (!ticker) return;
  tickerX -= 0.5;
  const totalW = ticker.scrollWidth / 2;
  if (Math.abs(tickerX) >= totalW) tickerX = 0;
  ticker.style.transform = `translateX(${tickerX}px)`;
}

// ─── SECTION PROGRESS LINE ────────────────────────────────────
function updateProgress() {
  const docH = document.documentElement.scrollHeight - window.innerHeight;
  const progress = clamp(window.scrollY / docH, 0, 1);
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

  // Canvas setup — sits behind everything, fixed to viewport
  const canvas = document.createElement('canvas');
  canvas.id = 'neural-canvas';
  canvas.style.cssText = `
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 0;
    opacity: 1;
  `;
  document.body.insertBefore(canvas, document.body.firstChild);

  const ctx = canvas.getContext('2d');

  // Config
  const CFG = {
    count:         42,       // number of particles
    maxDist:       150,      // connection draw distance (px)
    mouseRadius:   200,      // mouse attraction radius
    mouseForce:    0.012,    // how strongly mouse pulls particles
    speed:         0.18,     // base drift speed
    nodeSizeMin:   0.9,
    nodeSizeMax:   2.0,
    lineMaxAlpha:  0.10,     // max opacity of connecting lines
    mouseLineAlpha:0.26,     // line opacity when near mouse
    pulseSpeed:    0.014,
  };

  let W = window.innerWidth;
  let H = window.innerHeight;
  canvas.width  = W;
  canvas.height = H;

  window.addEventListener('resize', () => {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width  = W;
    canvas.height = H;
  });

  // Read accent color from CSS variable
  function getAccentRGB() {
    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue('--accent-rgb').trim();
    if (raw) {
      const parts = raw.split(',').map(s => parseInt(s.trim(), 10));
      if (parts.length === 3) return parts;
    }
    return [200, 241, 53]; // fallback lime
  }

  // Particle class
  class Particle {
    constructor() { this.reset(true); }

    reset(randomY = false) {
      this.x  = Math.random() * W;
      this.y  = randomY ? Math.random() * H : (Math.random() > 0.5 ? -10 : H + 10);
      this.vx = (Math.random() - 0.5) * CFG.speed;
      this.vy = (Math.random() - 0.5) * CFG.speed;
      this.r  = CFG.nodeSizeMin + Math.random() * (CFG.nodeSizeMax - CFG.nodeSizeMin);
      this.phase = Math.random() * Math.PI * 2;  // for pulse
      this.baseAlpha = 0.12 + Math.random() * 0.24;
    }

    update(mx, my) {
      // Mouse attraction
      const dx = mx - this.x;
      const dy = my - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < CFG.mouseRadius && dist > 1) {
        const force = (CFG.mouseRadius - dist) / CFG.mouseRadius * CFG.mouseForce;
        this.vx += (dx / dist) * force;
        this.vy += (dy / dist) * force;
      }

      // Dampen velocity so they don't fly away
      this.vx *= 0.985;
      this.vy *= 0.985;

      // Clamp speed
      const spd = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
      if (spd > CFG.speed * 3) {
        this.vx = (this.vx / spd) * CFG.speed * 3;
        this.vy = (this.vy / spd) * CFG.speed * 3;
      }

      this.x += this.vx;
      this.y += this.vy;
      this.phase += CFG.pulseSpeed;

      // Wrap around edges
      if (this.x < -20) this.x = W + 20;
      if (this.x > W + 20) this.x = -20;
      if (this.y < -20) this.y = H + 20;
      if (this.y > H + 20) this.y = -20;
    }

    draw(rgb) {
      const pulse = 0.7 + 0.3 * Math.sin(this.phase);
      const alpha = this.baseAlpha * pulse;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r * pulse, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
      ctx.fill();
    }
  }

  // Init particles
  const particles = Array.from({ length: CFG.count }, () => new Particle());

  // Mouse position (screen coords, same as canvas which is fixed)
  let nmx = -999, nmy = -999;
  document.addEventListener('mousemove', e => { nmx = e.clientX; nmy = e.clientY; });

  function drawNeural() {
    const rgb = getAccentRGB();
    ctx.clearRect(0, 0, W, H);

    // Update + collect positions
    particles.forEach(p => p.update(nmx, nmy));

    // Draw connections
    for (let i = 0; i < particles.length; i++) {
      const a = particles[i];
      for (let j = i + 1; j < particles.length; j++) {
        const b = particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > CFG.maxDist) continue;

        // Fade line by distance
        let alpha = (1 - dist / CFG.maxDist) * CFG.lineMaxAlpha;

        // Boost lines near mouse
        const midX = (a.x + b.x) / 2;
        const midY = (a.y + b.y) / 2;
        const mdx = midX - nmx, mdy = midY - nmy;
        const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
        if (mdist < CFG.mouseRadius) {
          const boost = (1 - mdist / CFG.mouseRadius);
          alpha = Math.min(alpha + boost * CFG.mouseLineAlpha, CFG.mouseLineAlpha);
        }

        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
        ctx.lineWidth = 0.7;
        ctx.stroke();
      }

      // Draw lines from mouse to nearby particles
      const mdx = a.x - nmx, mdy = a.y - nmy;
      const mouseDist = Math.sqrt(mdx * mdx + mdy * mdy);
      if (mouseDist < CFG.mouseRadius * 0.7) {
        const alpha = (1 - mouseDist / (CFG.mouseRadius * 0.7)) * CFG.mouseLineAlpha * 1.2;
        ctx.beginPath();
        ctx.moveTo(nmx, nmy);
        ctx.lineTo(a.x, a.y);
        ctx.strokeStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
        ctx.lineWidth = 0.9;
        ctx.stroke();
      }
    }

    // Draw particles on top
    particles.forEach(p => p.draw(rgb));

    // Draw a small glowing dot at mouse position (only when in window)
    if (nmx > 0) {
      const grad = ctx.createRadialGradient(nmx, nmy, 0, nmx, nmy, 8);
      grad.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.6)`);
      grad.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
      ctx.beginPath();
      ctx.arc(nmx, nmy, 8, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    }
  }

  // Expose so the main loop can call it
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
function loop() {
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

