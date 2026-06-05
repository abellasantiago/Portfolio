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
  glow.style.transform = `translate(${glowX - 200}px, ${glowY - 200}px)`;
  requestAnimationFrame(animateCursor);
}
if (!isMobile) animateCursor();

// ─── FLOATING ELEMENTS ────────────────────────────────────────
const floaterData = [
  // [x%, y%, size, speed, opacity, shape]
  [8,  12, 120, 0.04, 0.06, 'circle'],
  [85, 18, 60,  0.07, 0.08, 'circle'],
  [92, 45, 200, 0.03, 0.04, 'circle'],
  [5,  60, 80,  0.05, 0.07, 'circle'],
  [75, 72, 140, 0.04, 0.05, 'circle'],
  [20, 85, 50,  0.08, 0.09, 'circle'],
  [50, 30, 1,   0,    0.15, 'cross'],
  [15, 50, 1,   0,    0.12, 'cross'],
  [80, 65, 1,   0,    0.10, 'cross'],
  [40, 80, 1,   0,    0.13, 'cross'],
  [60, 15, 1,   0,    0.11, 'cross'],
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

// ─── TEXT SCRAMBLE on hover (hero h1) ─────────────────────────
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%';
function scramble(el, original) {
  let iter = 0;
  const maxIter = original.length * 3;
  const interval = setInterval(() => {
    el.textContent = original
      .split('')
      .map((ch, i) => {
        if (ch === '\n' || ch === ' ') return ch;
        if (i < iter / 3) return ch;
        return CHARS[Math.floor(Math.random() * CHARS.length)];
      })
      .join('');
    iter++;
    if (iter > maxIter) {
      clearInterval(interval);
      el.textContent = original;
    }
  }, 30);
}

const heroH1 = document.querySelector('#hero h1');
if (heroH1) {
  const originalText = heroH1.textContent;
  heroH1.addEventListener('mouseenter', () => scramble(heroH1, originalText));
}

// ─── MAIN ANIMATION LOOP ──────────────────────────────────────
function loop() {
  parallaxHero();
  parallaxSections();
  animateFloaters();
  animateTicker();
  updateProgress();
  requestAnimationFrame(loop);
}
loop();

