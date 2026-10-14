// Pixel UI kit for the canvas HUD. Shapes are drawn into a half-resolution buffer (1 HUD px = 2 screen px) and
// scaled up with smoothing off, so every edge lands on the same pixel grid as the sprites. Text is set at screen
// resolution with a solid outline and whole-pixel placement. The font keeps its own edge smoothing: a hard
// threshold looked more pixel-like but broke Thai vowel and tone marks into fragments.
// The look is the title's "Spire glass" in pixels: lead outline, dark glass, one bevel row, a lit accent.
import { W, H } from '../world/constants.ts';
import { ctx, FN } from './canvas.js';
import { IMG } from '../core/assets.ts';

export const PX = 2;
const buf = document.createElement('canvas'); buf.width = W / PX; buf.height = H / PX;
export const hc = buf.getContext('2d');
export const LEAD = '#0c0d12', GLASS = '#171822', BEVEL = '#2c2e3c', SHADE = '#0f1017', INK = '#efe8d6', INK2 = '#b9b2a2';

const after = []; // screen-resolution draws (text, sprites) that go over the scaled-up buffer
export function beginPixels() { hc.clearRect(0, 0, buf.width, buf.height); hc.imageSmoothingEnabled = false; hc.globalAlpha = 1; after.length = 0; }
export function endPixels() {
  ctx.save(); ctx.imageSmoothingEnabled = false; ctx.drawImage(buf, 0, 0, W, H);
  for (const f of after) f();
  ctx.restore();
}
/** Queue a draw on the main canvas in screen px, at the buffer's current alpha. */
export function overlay(fn) { const a = hc.globalAlpha; after.push(() => { ctx.globalAlpha = a; fn(); ctx.globalAlpha = 1; }); }

// A pane: lead outline with cut corners, dark glass, a light bevel row on top/left and a shade row bottom/right.
// accent = a lit top edge in a floor or element colour.
export function pane(x, y, w, h, accent, fill = GLASS) {
  hc.fillStyle = LEAD; hc.fillRect(x + 1, y, w - 2, h); hc.fillRect(x, y + 1, w, h - 2);
  hc.fillStyle = fill; hc.fillRect(x + 1, y + 1, w - 2, h - 2);
  hc.fillStyle = BEVEL; hc.fillRect(x + 1, y + 1, w - 2, 1); hc.fillRect(x + 1, y + 1, 1, h - 2);
  hc.fillStyle = SHADE; hc.fillRect(x + 1, y + h - 2, w - 2, 1); hc.fillRect(x + w - 2, y + 1, 1, h - 2);
  if (accent) { hc.fillStyle = accent; hc.fillRect(x + 2, y + 1, w - 4, 1); }
}
// A ring of `col` one pixel outside a pane (ready skill, active state)
export function ring(x, y, w, h, col) {
  hc.fillStyle = col;
  hc.fillRect(x, y - 1, w, 1); hc.fillRect(x, y + h, w, 1); hc.fillRect(x - 1, y, 1, h); hc.fillRect(x + w, y, 1, h);
}

const shade = (hex, k) => {
  const n = parseInt(hex.slice(1), 16), c = v => Math.max(0, Math.min(255, Math.round(v * k)));
  return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`;
};
// A chunky bar: lead case, a white "damage lag" run, the fill with a light top row and a dark bottom row,
// and a notch every `notch` px so it reads as segments
export function bar(x, y, w, h, frac, lag, col, notch = 0) {
  hc.fillStyle = LEAD; hc.fillRect(x, y, w, h);
  const iw = w - 2, ih = h - 2, f = Math.round(iw * Math.max(0, Math.min(1, frac))), l = Math.round(iw * Math.max(0, Math.min(1, lag)));
  hc.fillStyle = '#26202a'; hc.fillRect(x + 1, y + 1, iw, ih);
  if (l > f) { hc.fillStyle = '#f4ecd8'; hc.fillRect(x + 1 + f, y + 1, l - f, ih); }
  if (f > 0) {
    hc.fillStyle = col; hc.fillRect(x + 1, y + 1, f, ih);
    if (ih > 2) { hc.fillStyle = shade(col, 1.35); hc.fillRect(x + 1, y + 1, f, 1); hc.fillStyle = shade(col, 0.6); hc.fillRect(x + 1, y + ih, f, 1); }
  }
  if (notch) { hc.fillStyle = 'rgba(12,13,18,.55)'; for (let nx = x + 1 + notch; nx < x + w - 1; nx += notch) hc.fillRect(nx, y + 1, 1, ih); }
}
// A small 4-point gem (element sets)
export function gem(x, y, col, lit) {
  hc.fillStyle = LEAD; hc.fillRect(x + 2, y, 3, 7); hc.fillRect(x, y + 2, 7, 3); hc.fillRect(x + 1, y + 1, 5, 5);
  hc.fillStyle = lit ? col : shade(col, 0.45); hc.fillRect(x + 3, y + 1, 1, 5); hc.fillRect(x + 1, y + 3, 5, 1); hc.fillRect(x + 2, y + 2, 3, 3);
  if (lit) { hc.fillStyle = '#fff'; hc.fillRect(x + 2, y + 2, 1, 1); }
}
// The Gold coin: the coin-1 sprite at screen resolution (1:1, like the coins dropped in the world), else a drawn one
export function coin(x, y) {
  const img = IMG['coin-1'];
  if (img) return overlay(() => ctx.drawImage(img, x * PX, y * PX));
  hc.fillStyle = LEAD; hc.fillRect(x + 1, y, 4, 6); hc.fillRect(x, y + 1, 6, 4);
  hc.fillStyle = '#ffd35a'; hc.fillRect(x + 1, y + 1, 4, 4); hc.fillStyle = '#b8862a'; hc.fillRect(x + 2, y + 2, 2, 2); hc.fillStyle = '#fff6c8'; hc.fillRect(x + 1, y + 1, 1, 1);
}

// ---------- text ----------
const cache = new Map();
// Text drawn while a webfont (or one of its subsets, like Thai) is still loading comes out partly invisible;
// rebuild every glyph once a font arrives, or those broken glyphs stay cached for the whole session
document.fonts?.addEventListener('loadingdone', () => cache.clear());
function glyphs(text, font, color, outline) {
  const key = `${font}|${color}|${outline}|${text}`;
  let c = cache.get(key);
  if (c) return c;
  if (cache.size > 400) cache.clear(); // HP numbers and timers churn; a full flush is cheap
  c = document.createElement('canvas');
  // CPU-backed: hundreds of cached GPU canvases get evicted by Chrome and come back with glyphs missing
  const g = c.getContext('2d', { willReadFrequently: true }); g.font = font;
  const m = g.measureText(text), size = parseInt(font.match(/(\d+)px/)[1], 10);
  c.width = Math.ceil(m.width) + 6; c.height = Math.ceil(size * 1.6) + 6;
  g.font = font; g.textBaseline = 'alphabetic';
  const bx = 3, by = Math.ceil(size * 1.15) + 3;
  if (outline) { g.fillStyle = outline; for (let ox = -2; ox <= 2; ox++) for (let oy = -2; oy <= 2; oy++) if (Math.abs(ox) + Math.abs(oy) <= 3) g.fillText(text, bx + ox, by + oy); }
  g.fillStyle = color; g.fillText(text, bx, by);
  c.base = by; cache.set(key, c);
  return c;
}
/** Crisp text on any context (world, screen or a baked canvas); x, y = anchor and baseline. `scale` blows the
 *  glyphs up in whole pixels (damage numbers popping). Returns the width drawn. */
const glyphFor = (str, { size = 13, weight = 700, color = INK, font = FN, outline = LEAD } = {}) => glyphs(String(str), `${weight} ${size}px ${font}`, color, outline);
export function drawText(g, str, x, y, opts = {}) {
  const { align = 'left', scale = 1 } = opts, c = glyphFor(str, opts), w = (c.width - 6) * scale;
  const sx = Math.round(x - (align === 'center' ? w / 2 : align === 'right' ? w : 0) - 3 * scale), sy = Math.round(y - c.base * scale);
  if (scale === 1) g.drawImage(c, sx, sy);
  else { const sm = g.imageSmoothingEnabled; g.imageSmoothingEnabled = false; g.drawImage(c, sx, sy, c.width * scale, c.height * scale); g.imageSmoothingEnabled = sm; }
  return w;
}
/** Text at HUD px (x, y = baseline), drawn crisp at screen resolution over the buffer. Returns its width in HUD px. */
export function text(str, x, y, opts = {}) {
  overlay(() => drawText(ctx, str, x * PX, y * PX, opts));
  return (glyphFor(str, opts).width - 6) / PX;
}
// A pane drawn straight onto a world-space context in 2 px units (speech bubbles, door signs)
export function worldPane(g, x, y, w, h, fill = 'rgba(16,17,24,.94)', accent = null) {
  x = Math.round(x / 2) * 2; y = Math.round(y / 2) * 2; w = Math.round(w / 2) * 2; h = Math.round(h / 2) * 2;
  g.fillStyle = LEAD; g.fillRect(x + 2, y, w - 4, h); g.fillRect(x, y + 2, w, h - 4);
  g.fillStyle = fill; g.fillRect(x + 2, y + 2, w - 4, h - 4);
  g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(x + 2, y + 2, w - 4, 2); g.fillRect(x + 2, y + 2, 2, h - 4);
  g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x + 2, y + h - 4, w - 4, 2); g.fillRect(x + w - 4, y + 2, 2, h - 4);
  if (accent) { g.fillStyle = accent; g.fillRect(x + 4, y + 2, w - 8, 2); }
  return { x, y, w, h };
}
