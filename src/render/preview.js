// Looping 1.6 s vignettes for the pick cards: a small swordsman, a training dummy, and the Art doing its thing.
// previewFor is pure (tested); the DOM and the one shared rAF loop only exist between startPreviews and stopPreviews.
import { G } from '../world/state.ts';
import { ELEMENTS } from '../data/elements.ts';

const LOOP = 1600, W = 160, H = 90, GROUND = 70, GOLD = '#ffe9a8';

/** What a card's canvas shows. null = no preview. element cards have art null (a pulsing gem); stat cards add `stat`. */
export function previewFor(c) {
  // a mod card evolves its Art when it would be the second mod (see cardHtml)
  const evolved = a => !!G.P && (G.P.evolved.includes(a) || (c.kind === 'mod' && (G.P.mods[a] ?? []).length >= 1));
  if (c.kind === 'mod') return { art: c.art, evolved: evolved(c.art), el: c.el };
  if (c.kind === 'art') return { art: c.id, evolved: false, el: null };
  if (c.kind === 'evolve') return { art: c.art, evolved: true, el: null };
  if (c.kind === 'element') return { art: null, evolved: false, el: c.el };
  if (c.kind === 'stat') return { art: null, evolved: false, el: null, stat: c.id };
  return null;
}

const ph = (t, a, b) => Math.max(0, Math.min(1, (t - a) / (b - a)));
const lerp = (a, b, k) => a + (b - a) * k;

function char(g, x, lean = 0, alpha = 1) {
  g.save(); g.globalAlpha = alpha; g.translate(x, GROUND); g.rotate(lean);
  g.fillStyle = '#d8dce8'; g.fillRect(-4, -22, 8, 14);          // body
  g.fillStyle = '#f2d2b0'; g.fillRect(-3, -30, 6, 7);           // head
  g.fillStyle = '#4a5068'; g.fillRect(-4, -8, 3, 8); g.fillRect(1, -8, 3, 8); // legs
  g.fillStyle = '#c8d4ff'; g.fillRect(4, -20, 12, 2);           // sword
  g.restore();
}
function dummy(g, x, hit = 0) {
  g.save(); g.translate(x + Math.sin(hit * 30) * 3 * hit, GROUND);
  g.fillStyle = '#6b5640'; g.fillRect(-2, -26, 4, 26); g.fillRect(-10, -22, 20, 4);
  g.fillStyle = hit > 0 ? '#fff' : '#9a7a52'; g.fillRect(-5, -34, 10, 9);
  g.restore();
}
function ring(g, x, y, r, col, a = 1) { g.save(); g.globalAlpha = a; g.strokeStyle = col; g.lineWidth = 3; g.beginPath(); g.arc(x, y, Math.max(1, r), 0, 7); g.stroke(); g.restore(); }
function bar(g, x0, x1, y, col, th = 4, a = 1) { g.save(); g.globalAlpha = a; g.fillStyle = col; g.fillRect(x0, y - th / 2, x1 - x0, th); g.restore(); }
function arc(g, x, y, r, a0, a1, col, a = 1) { g.save(); g.globalAlpha = a; g.strokeStyle = col; g.lineWidth = 4; g.beginPath(); g.arc(x, y, r, a0, a1); g.stroke(); g.restore(); }
function sparks(g, x, y, k, col) { // k 0..1 since the hit
  if (k <= 0 || k >= 1) return;
  g.save(); g.globalAlpha = 1 - k; g.fillStyle = col;
  for (let i = 0; i < 6; i++) { const an = i * 1.05 + 0.4; g.fillRect(x + Math.cos(an) * k * 18, y + Math.sin(an) * k * 18, 3, 3); }
  g.restore();
}
const hitK = (t, at) => ph(t, at, at + 0.15);          // spark progress for a hit landing at `at`
const flash = (t, at) => (t > at && t < at + 0.15 ? 1 - hitK(t, at) : 0);

// Each vignette gets (g, t 0..1, evolved, colour) and draws the Art; drawPreview paints the backdrop first.
const SCENES = {
  blade(g, t, evo, c) {
    const dx = 124; let h = 0;
    char(g, 36);
    [0.1, 0.37, 0.64].forEach((at, i) => {
      const k = ph(t, at, at + 0.2);
      if (k > 0 && k < 1) arc(g, 52, GROUND - 22, 22, i % 2 ? 0.9 : -1.9, i % 2 ? -0.9 + 1.2 + k : 0.9 * k, c, 1 - k);
      if (i < 2 || !evo) { h = Math.max(h, flash(t, at + 0.1)); sparks(g, dx - 8, GROUND - 24, hitK(t, at + 0.1), c); }
    });
    if (evo && t > 0.7) { const k = ph(t, 0.7, 0.95); arc(g, lerp(60, dx, k), GROUND - 22, 14, -1.2, 1.2, c, 1 - k * 0.5); h = Math.max(h, flash(t, 0.95)); sparks(g, dx - 8, GROUND - 24, hitK(t, 0.95), c); }
    dummy(g, dx, h);
  },
  sonicLeap(g, t, evo, c) {
    const dashes = evo ? [[0.1, 0.35, 30, 140], [0.5, 0.75, 140, 30]] : [[0.1, 0.55, 30, 140]];
    let x = dashes[0][2], h = 0;
    for (const [a, b, x0, x1] of dashes) {
      const k = ph(t, a, b); if (t < a) continue;
      x = lerp(x0, x1, k);
      if (k > 0 && k < 1) bar(g, Math.min(x0, x), Math.max(x0, x), GROUND - 14, c, 6, 0.5);
      if (Math.abs(x - 112) < 14 && k > 0 && k < 1) { h = 1; sparks(g, 112, GROUND - 24, 0.2, c); }
    }
    dummy(g, 112, h); char(g, x, 0.25);
  },
  horizontal(g, t, evo, c) {
    const rings = evo ? [0.1, 0.5] : [0.2], dx = evo ? lerp(136, 118, ph(t, 0.05, 0.4)) : 128; let h = 0;
    for (const at of rings) { const k = ph(t, at, at + 0.35); if (k > 0 && k < 1) { ring(g, 90, GROUND - 16, k * 52, c, 1 - k * 0.6); if (k > 0.55) h = 1; } }
    if (h) sparks(g, dx - 6, GROUND - 24, 0.3, c);
    char(g, 90); dummy(g, dx, h);
  },
  vorpal(g, t, evo, c) {
    const wind = ph(t, 0, 0.3), k = ph(t, 0.3, 0.45);
    char(g, 36, -0.25 * wind + (t > 0.3 ? 0.35 : 0));
    if (k > 0 && t < 0.62) bar(g, 44, lerp(44, 150, k), GROUND - 20, c, 5, 1 - ph(t, 0.45, 0.62));
    if (evo && t > 0.6) { const q = ph(t, 0.6, 0.85); bar(g, 0, W, GROUND - 22, c, 12 * (1 - q) + 2, 1 - q); bar(g, 0, W, GROUND - 22, '#fff', 3, 1 - q); }
    const h = Math.max(flash(t, 0.42), evo ? flash(t, 0.66) : 0);
    sparks(g, 118, GROUND - 24, hitK(t, 0.42), c); dummy(g, 124, h);
  },
  crescent(g, t, evo, c) {
    char(g, 36);
    const waves = evo ? [[-14, 0.2], [0, 0.25], [14, 0.3]] : [[0, 0.25]]; let h = 0;
    for (const [dy, at] of waves) {
      const k = ph(t, at, at + 0.45); if (k <= 0 || k >= 1) continue;
      arc(g, lerp(52, 150, k), GROUND - 22 + dy * k, 14, -1.1, 1.1, c);
      if (k > 0.7 && k < 0.85) h = 1;
    }
    sparks(g, 116, GROUND - 24, hitK(t, 0.55), c); dummy(g, 124, h);
  },
  riposte(g, t, evo, c) {
    const dx = lerp(124, 62, Math.sin(ph(t, 0.05, 0.3) * Math.PI / 2)) + lerp(0, 62, ph(t, 0.5, 0.7));
    char(g, 36, -0.1);
    if (t > 0.3 && t < 0.5) arc(g, 46, GROUND - 20, 18, -1.4, 1.4, '#fff', 1 - ph(t, 0.3, 0.5));   // guard flash
    const k = ph(t, 0.42, 0.75); if (k > 0 && k < 1) ring(g, 46, GROUND - 20, k * 60, c, 1 - k);
    dummy(g, dx, flash(t, 0.5)); sparks(g, dx, GROUND - 24, hitK(t, 0.5), c);
    if (evo && t > 0.3 && t < 0.8) { g.save(); g.globalAlpha = 0.18; g.fillStyle = '#6aa8ff'; g.fillRect(0, 0, W, H); g.restore(); }
  },
  shade(g, t, evo, c) {
    const second = evo && t > 0.6;
    dummy(g, 110, flash(t, 0.4)); if (evo) dummy(g, 150, flash(t, 0.8));
    if (t < 0.15) char(g, 36); else if (t < 0.3) char(g, 36, 0, 1 - ph(t, 0.15, 0.3));
    else if (second) char(g, 162, 0, ph(t, 0.6, 0.68));
    else char(g, 126, 0, ph(t, 0.3, 0.38));
    if (evo && t >= 0.3 && t < 0.6) char(g, 126);
    bar(g, 36, 126, GROUND - 14, c, 2, t > 0.15 && t < 0.3 ? 0.4 : 0);
    sparks(g, 118, GROUND - 24, hitK(t, 0.4), c); if (evo) sparks(g, 142, GROUND - 24, hitK(t, 0.8), c);
  },
  element(g, t, evo, c) {   // no Art yet: a gem in the element's colour
    const s = 1 + 0.18 * Math.sin(t * 12.56); g.save(); g.translate(W / 2, 42); g.rotate(Math.PI / 4); g.scale(s, s);
    g.fillStyle = c; g.shadowColor = c; g.shadowBlur = 16; g.fillRect(-14, -14, 28, 28); g.restore();
  },
  stat(g, t, evo, c) {      // generic for every stat: arrows rising and fading
    for (let i = 0; i < 3; i++) {
      const k = (t + i / 3) % 1, y = 74 - k * 56; g.save(); g.globalAlpha = Math.sin(k * Math.PI); g.fillStyle = c;
      g.beginPath(); g.moveTo(W / 2, y - 12); g.lineTo(W / 2 + 12, y + 4); g.lineTo(W / 2 - 12, y + 4); g.fill(); g.restore();
    }
  },
};

export function drawPreview(g, p, t) {
  const c = p.el ? ELEMENTS[p.el].color : GOLD;
  g.clearRect(0, 0, W, H); g.fillStyle = '#12141c'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#242838'; g.fillRect(0, GROUND, W, H - GROUND);
  (SCENES[p.art ?? (p.stat ? 'stat' : 'element')] ?? SCENES.element)(g, t, p.evolved, c);
}

let raf = 0, items = [], t0 = 0;
const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
function frame(now) {
  const t = ((now - t0) % LOOP) / LOOP;
  for (const it of items) if (it.cv.isConnected) drawPreview(it.g, it.p, t);
  raf = requestAnimationFrame(frame);
}
/** Find every canvas[data-preview] under `container` (call again after the cards re-render) and animate them. */
export function startPreviews(container) {
  items = [...container.querySelectorAll('canvas[data-preview]')].map(cv => ({ cv, g: cv.getContext('2d'), p: JSON.parse(cv.dataset.preview) }));
  if (still()) { cancelAnimationFrame(raf); raf = 0; items.forEach(it => drawPreview(it.g, it.p, 0.5)); return; }
  if (!raf) { t0 = performance.now(); raf = requestAnimationFrame(frame); }
}
export function stopPreviews() { cancelAnimationFrame(raf); raf = 0; items = []; }
