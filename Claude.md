# Claude.md — Santiago Abella Portfolio

Guía de contexto para Claude. Leer antes de tocar cualquier archivo del proyecto.

---

## Proyecto

Portfolio personal de Santiago Abella, desplegado en `abellasantiago.github.io`.  
Stack: **HTML + CSS + JS vanilla**, sin frameworks ni build tools. Elección deliberada para entender qué pasa por debajo antes de usar abstracciones.

Librerías externas:
- **Lenis** `1.1.14` — smooth scroll (CDN)
- **Three.js** `r128` — icosaedro 3D del hero (CDN)
- **Google Fonts** — Syne 400/500/600/700/800 + DM Mono 300/400 italic

---

## Estructura de archivos

```
portfolio/
├── index.html
├── style.css
├── script.js
├── Claude.md              ← este archivo
├── Foto_perfil.jpg
├── CV_Santiago_Abella.pdf
├── favicon.svg
├── favicon-32.png
├── favicon.ico
└── favicon-192.png
```

---

## Secciones del sitio

| # | ID | Descripción |
|---|-----|-------------|
| — | `#hero` | Hero con h1, foto, tag, subtítulo y CTAs |
| — | `.ticker` | Ticker horizontal animado |
| 01 | `#sobre-mi` | Bio en prosa |
| — | `#sa-cloud` | Logo SA de partículas (divisor) |
| 02 | `#experiencia` | Timeline de experiencia laboral |
| 03 | `#educacion` | Timeline educativo |
| 04 | `#proyectos` | Cards de proyectos |
| 05 | `#habilidades` | Grid de skills |
| 06 | `#contacto` | Grid de links de contacto |
| — | `footer` | Copyright + ubicación |

---

## Stack visual y efectos

### Capa z-index (de fondo a frente)

```
neural-canvas (z:0) → floaters (z:0) → page content (z:2+)
→ cursor-overlay (z:9999) → progress-line (z:9999) → intro-overlay (z:99999)
```

### Efectos implementados

- **Intro terminal** — animación de líneas estilo consola al cargar, con wipe-out clip-path
- **Neural canvas** — red de partículas interactiva; atracción/repulsión con el cursor, estados de energía por nodo
- **Custom cursor** — dot dibujado en el canvas neural (no DOM); halo difuso vía `#cursor-overlay`
- **Icosaedro 3D** (Three.js) — sólido facetado que late en el hero y se deconstruye al scrollear; scrubbed y 100% reversible
- **SA Point Cloud** — logo "SA" formado por partículas que convergen en espiral al entrar en viewport; repulsión de cursor; malla tipo constelación
- **Floaters** — círculos y cruces decorativos con parallax suave
- **Parallax hero** — h1, subtítulo, foto y CTA tienen velocidades distintas
- **Parallax secciones** — h2 de cada sección se mueve suavemente al scrollear
- **Scroll reveal** — secciones con clase `.oculto` entran con `IntersectionObserver`
- **Grid assembly** — cells de skills/contacto/proyectos vuelan desde fuera del viewport con offsets caóticos (seeded random)
- **Letter fly-in** — letras del h1 entran desde posiciones aleatorias al cargar
- **Scramble hover h1** — caracteres se mezclan al hover usando `::before` + `data-sc` (sin layout shift)
- **Glitch logo SA** — navbar logo hace glitch RGB periódico
- **Stat counters** — números en project cards se animan al entrar en viewport
- **Tilt 3D cards** — project cards con perspectiva y shine radial al mover el mouse
- **Magnetic buttons** — `.btn-primary` y `.btn-ghost` siguen el cursor
- **Ticker** — scroll horizontal infinito, duración dinámica según ancho
- **Progress line** — barra de progreso de scroll en el top
- **Dark/light toggle** — cambia variables CSS; en modo claro el cursor canvas pierde visibilidad y el `#cursor-overlay` lo suple
- **Mobile hamburger** — menú desplegable con Lenis pause/resume
- **Smooth scroll** — Lenis alimenta `scrollY` para que parallax y progress estén en sync

### Guards mobile

Todo lo que requiere precisión de puntero o performance GPU está desactivado en mobile (`isMobile = window.innerWidth < 700`):

```
neural canvas · floaters parallax · custom cursor · parallax hero/secciones
icosaedro 3D · tilt 3D cards
```

En mobile las grid animations usan CSS keyframes alternativos.

---

## Variables CSS

```css
--bg            #030303      /* fondo principal */
--bg2           #080808
--surface       #111111
--border        #1a1a1a
--text          #e8e8e8
--text-muted    #8a8a8a
--text-dim      #2a2a2a
--bg-rgb        3, 3, 3      /* para rgba() dinámico */
--accent        #c8f135      /* lima — color de acento */
--accent-rgb    200, 241, 53
--accent-dim    rgba(200,241,53,0.07)
--font-display  'Syne', sans-serif
--font-mono     'DM Mono', monospace
--nav-h         64px
--max-w         760px
--ease          cubic-bezier(0.16, 1, 0.3, 1)
--ease-back     cubic-bezier(0.34, 1.56, 0.64, 1)
```

**Modo claro** (`body.claro`):
```css
--accent        #5b4cff      /* violeta */
--accent-rgb    91, 76, 255
--bg            #f5f4f0
--bg-rgb        245, 244, 240
```

Usar siempre las variables, nunca hardcodear colores.

---

## Patrones de código importantes

### Seeded random
El sitio usa `seededRand(seed)` para que posiciones y rotaciones sean estables entre renders:
```js
function seededRand(seed) {
  const x = Math.sin(seed + 1) * 43758.5453123;
  return x - Math.floor(x);
}
```

### Scramble h1 sin layout shift
El truco: el `textContent` real del span conserva el carácter original (mantiene kerning). El carácter scrambleado se muestra en `::before` via `attr(data-sc)`, con el texto real invisible (`color: transparent`). No tocar este mecanismo.

### Grid assembly animation
Los cells calculan su offset de vuelo en `initGridCells()` y la posición se interpola en `updateGridCells()` dentro del main loop. No usar CSS transitions en estas propiedades — el JS las maneja directamente.

### Loop principal
Lenis RAF + todas las funciones de animación corren en un único `requestAnimationFrame` loop:
```js
function loop(time) {
  lenisRaf(time);
  parallaxHero();
  parallaxSections();
  animateFloaters();
  animateTicker();
  updateProgress();
  updateGridCells();
  if (window._drawNeural) window._drawNeural();
  if (window._drawSACloud) window._drawSACloud();
  requestAnimationFrame(loop);
}
```

### Three.js — versión r128
**No usar**: `THREE.OrbitControls`, `THREE.CapsuleGeometry` (son r142+).  
Usar en su lugar: `CylinderGeometry`, `SphereGeometry`, geometrías custom.

### Campo de oclusión neural ↔ icosaedro
`window._icoField` es el canal de comunicación entre el hero 3D y el canvas neural:
```js
window._icoField = { cx, cy, r, strength }
```
El canvas neural lo lee para atenuar partículas y cursor que quedan "detrás" del sólido.

---

## Principios de diseño

1. **Fidelidad tipográfica sobre efectos**: nada que cause layout shift o distorsione el kerning. Si un efecto requiere repensar el DOM para ser correcto, hacerlo.

2. **Sutileza como constraint**: los efectos deben leerse como profundidad ambiental, no como elementos de primer plano. *"Que no sean invasivas."*

3. **Revert-first**: ante la duda, volver al último estado conocido bueno. Los archivos del proyecto son la fuente de verdad.

4. **Mobile/desktop isolation**: cambios en mobile no deben tocar la experiencia desktop, y viceversa.

5. **Variables CSS siempre**: usar `--accent-rgb`, `--bg-rgb`, etc. para mantener coherencia con el sistema de theming.

---

## Workflow con Claude

- Santiago sube los archivos al proyecto; Claude los lee desde `/mnt/project/`
- Claude entrega archivos modificados para que Santiago los integre manualmente
- Comunicación en **español**, concisa y directa
- Explicaciones breves de qué cambió y por qué — sin relleno

---

## Proyectos actuales

### Middle Earth Encounters
- **Repo**: `github.com/abellasantiago/PII_RoleplayGame`
- **Tech**: C# · .NET · OOP · SOLID · NUnit · GitHub Actions CI/CD
- **Descripción**: Simulador de combate RPG por turnos. 6 clases héroe, 4 tipos de enemigo, 40+ tests.
- **Estado**: Activo — card completa en el portfolio

### Recommendation Chatbot
- **Estado**: En desarrollo, placeholder en el portfolio
- **Tech**: por definir

---

## Referentes visuales

Bruno Simon · Lusion · Aristide Benoist · Active Theory · Codrops · GSAP Showcase · Awwwards

---

## Pendientes / on the horizon

- Expandir sección Proyectos con cards adicionales para resolver el desbalance visual
- Posible: transición de entrada con clip-path al cargar la página
- Posible: scroll-triggered text scramble en headings de sección
- Posible: extender comportamiento magnético a los links del navbar
- Completar o refinar el texto decorativo "SA" grande en el hero background
