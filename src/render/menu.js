// Title background ("the Spire's glass") and the Dive In intro.
// Four leaded lancet windows, one per floor, glazed in that floor's torch color. A boss only appears in its window
// once it has been beaten (a trophy, never a spoiler); a reached floor shows a lead sword instead, and floors the
// player has never reached stay dark, unglazed lead. The glass is drawn once into a half-resolution
// buffer and scaled up with smoothing off, so every lead line is a hard 2 px pixel line like the game's sprites.
import { G } from '../world/state.ts';
import { W, H } from '../world/constants.ts';
import { settings, meta, loadSuspend } from '../core/save.ts';
import { clamp } from '../core/math.ts';
import { IMG, ready } from '../core/assets.ts';
import { FLOORS } from '../data/floors.ts';
import { actOf } from '../data/run.ts';
import { BOSSES } from '../data/bosses.ts';
import { ctx, FN } from './canvas.js';
import { drawText } from './pixel.js';

export const INTRO_TIME = 1.9;

const S = 2, BW = W / S, BH = H / S;           // buffer scale and size: 1 buffer pixel = 2 screen pixels
const LEAD = '#0c0d12';
const LANCET = { w: 84, gap: 22, apex: 76, spring: 118, foot: 226 }; // buffer px
const lancetX = i => Math.round((BW - (4 * LANCET.w + 3 * LANCET.gap)) / 2 + i * (LANCET.w + LANCET.gap));
/** @type {(i: number) => [number, number, number]} */
const torch = i => /** @type {any} */ (FLOORS[i].torch.split(',').map(Number)); // "255,150,60" -> [r, g, b]

// Reached = the best record's floor, a suspended run's floor, and always floor 1; beaten = every act before the furthest one
let reached = 1, beaten = 0, buf = null, logo = null;
export function refreshMenuBg() {
  const s = loadSuspend(), b = meta.best;
  reached = Math.max(1, b ? (b.cleared ? FLOORS.length : actOf(b.floor - 1) + 1) : 1, s ? actOf(s.floorIdx) + 1 : 1); // best.floor / floorIdx are run floors; the menu shows acts
  beaten = b?.cleared ? FLOORS.length : reached - 1;
  buf = null;
}
ready.then(() => { buf = null; });
document.fonts?.ready.then(() => { logo = null; });

// Seeded so the glass breaks the same way every time
const rand = seed => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

// The lancet outline: a pointed (equilateral) arch on a straight body
function lancetPath(g, x, w) {
  const { apex, spring, foot } = LANCET;
  g.beginPath();
  g.moveTo(x, foot); g.lineTo(x, spring);
  g.quadraticCurveTo(x, apex + (spring - apex) * 0.35, x + w / 2, apex);
  g.quadraticCurveTo(x + w, apex + (spring - apex) * 0.35, x + w, spring);
  g.lineTo(x + w, foot); g.closePath();
}

function glazeLancet(g, i) {
  const x = lancetX(i), { w } = LANCET, lit = i < reached, [r, gr, b] = torch(i), rnd = rand(97 + i * 31);
  g.save(); lancetPath(g, x, w); g.clip();
  // irregular panes: a jittered grid, each pane a slightly different shade of the floor's glass
  const cols = 4, rows = 9, cw = w / cols, rh = (LANCET.foot - LANCET.apex) / rows;
  const pt = [];
  for (let yy = 0; yy <= rows; yy++) for (let xx = 0; xx <= cols; xx++) {
    const edge = xx === 0 || xx === cols || yy === 0 || yy === rows;
    pt.push([x + xx * cw + (edge ? 0 : (rnd() - 0.5) * cw * 0.6), LANCET.apex + yy * rh + (edge ? 0 : (rnd() - 0.5) * rh * 0.6)]);
  }
  const P = (xx, yy) => pt[yy * (cols + 1) + xx];
  for (let yy = 0; yy < rows; yy++) for (let xx = 0; xx < cols; xx++) {
    const k = 0.55 + rnd() * 0.45, depth = 1 - (yy / rows) * 0.35; // lighter toward the top, where the light comes in
    g.fillStyle = lit ? `rgb(${r * k * depth | 0},${gr * k * depth | 0},${b * k * depth | 0})` : `rgb(${22 + rnd() * 10 | 0},${24 + rnd() * 10 | 0},${32 + rnd() * 12 | 0})`;
    g.beginPath(); g.moveTo(...P(xx, yy)); g.lineTo(...P(xx + 1, yy)); g.lineTo(...P(xx + 1, yy + 1)); g.lineTo(...P(xx, yy + 1)); g.closePath();
    g.fill(); g.strokeStyle = LEAD; g.lineWidth = 1; g.stroke();
  }
  // a beaten boss is the window's figure, outlined in lead; a reached floor gets a lead sword, an unreached one nothing
  const boss = BOSSES[FLOORS[i].boss], img = IMG[boss.img];
  if (lit && i >= beaten) leadSword(g, x + w / 2, rgbK(torch(i), 1.25));
  else if (lit && img) {
    const sheet = !('tree' in boss), sw = sheet ? img.width / 4 : img.width, sh = sheet ? img.width / 4 : img.height;
    const scale = Math.min((w - 10) / sw, 120 / sh), dw = sw * scale, dh = sh * scale;
    const dx = Math.round(x + (w - dw) / 2), dy = Math.round(LANCET.foot - 26 - dh);
    const sil = IMG[boss.img + 'White'];
    g.globalAlpha = 1; g.filter = 'brightness(0)';
    for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) g.drawImage(sil, 0, 0, sw, sh, dx + ox, dy + oy, dw, dh);
    g.filter = 'none';
    g.drawImage(img, 0, 0, sw, sh, dx, dy, dw, dh);
  }
  // the inscription band at the foot of the window
  g.fillStyle = lit ? `rgb(${r * 0.25 | 0},${gr * 0.25 | 0},${b * 0.25 | 0})` : '#14161d';
  g.fillRect(x, LANCET.foot - 18, w, 18);
  g.restore();
  // cusps: two small lead lobes hanging inside the arch head
  g.strokeStyle = LEAD; g.lineWidth = 2;
  for (const side of [-1, 1]) { g.beginPath(); g.arc(x + w / 2 + side * w * 0.17, LANCET.apex + 26, w * 0.17, Math.PI * 1.05, Math.PI * 1.95); g.stroke(); }
  g.lineWidth = 3; lancetPath(g, x, w); g.stroke();
  g.fillStyle = LEAD; g.fillRect(x, LANCET.foot - 19, w, 2);
}

const rgbK = ([r, g, b], k) => `rgb(${Math.min(255, r * k) | 0},${Math.min(255, g * k) | 0},${Math.min(255, b * k) | 0})`;
// A sword pointing down, glazed paler than the window and leaded around: the floor waits to be fought
function leadSword(g, cx, fill) {
  const top = 124, parts = [[cx - 3, top, 6, 10], [cx - 13, top + 10, 26, 5], [cx - 4, top + 15, 8, 54]]; // grip, guard, blade
  g.fillStyle = LEAD; for (const [x, y, w, h] of parts) g.fillRect(x - 2, y - 2, w + 4, h + 4);
  g.beginPath(); g.moveTo(cx - 6, top + 69); g.lineTo(cx, top + 84); g.lineTo(cx + 6, top + 69); g.fill(); // point, leaded
  g.fillStyle = fill; for (const [x, y, w, h] of parts) g.fillRect(x, y, w, h);
  g.beginPath(); g.moveTo(cx - 4, top + 69); g.lineTo(cx, top + 79); g.lineTo(cx + 4, top + 69); g.fill();
  g.fillStyle = LEAD; g.fillRect(cx - 1, top + 17, 2, 58); // the fuller, a lead line down the blade
  g.beginPath(); g.arc(cx, top - 3, 4, 0, 7); g.fill(); g.fillStyle = fill; g.beginPath(); g.arc(cx, top - 3, 2, 0, 7); g.fill(); // pommel
}

function buildGlass() {
  const c = document.createElement('canvas'); c.width = BW; c.height = BH;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  // the Spire's inner wall: the game's own wall tile, sunk into shadow
  g.fillStyle = '#07080b'; g.fillRect(0, 0, BW, BH);
  if (IMG.wall) { g.globalAlpha = 0.22; g.fillStyle = g.createPattern(IMG.wall, 'repeat'); g.fillRect(0, 0, BW, BH); g.globalAlpha = 1; }
  // light from each glazed window pools on the floor below it
  for (let i = 0; i < 4; i++) {
    if (i >= reached) continue;
    const [r, gr, b] = torch(i), cx = lancetX(i) + LANCET.w / 2;
    const pool = g.createRadialGradient(cx, LANCET.foot + 20, 4, cx, LANCET.foot + 20, 90);
    pool.addColorStop(0, `rgba(${r},${gr},${b},.28)`); pool.addColorStop(1, `rgba(${r},${gr},${b},0)`);
    g.fillStyle = pool; g.fillRect(0, LANCET.foot - 40, BW, BH);
  }
  for (let i = 0; i < 4; i++) glazeLancet(g, i);
  // quatrefoils in the spandrels between the arch heads, glazed in the colors of the two floors they join
  for (let i = 0; i < 3; i++) {
    const cx = lancetX(i) + LANCET.w + LANCET.gap / 2, cy = LANCET.apex + 18, r = 5.5, lit = i + 1 < reached;
    g.fillStyle = '#34363f'; g.beginPath(); g.arc(cx, cy, r * 2.35, 0, 7); g.fill(); // cut stone the foil is pierced through
    for (const [ox, oy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      const [cr, cg, cb] = torch(ox + oy > 0 ? i + 1 : i);
      g.fillStyle = lit || (i < reached && ox + oy <= 0) ? `rgb(${cr * 0.8 | 0},${cg * 0.8 | 0},${cb * 0.8 | 0})` : '#1c1e27';
      g.beginPath(); g.arc(cx + ox * r, cy + oy * r, r, 0, 7); g.fill(); g.strokeStyle = LEAD; g.lineWidth = 2; g.stroke();
    }
    g.fillStyle = LEAD; g.fillRect(cx - 2, cy - 2, 4, 4);
  }
  // the sill the menu stands on, and the tracery band the name is set in
  g.fillStyle = LEAD; g.fillRect(14, LANCET.foot + 4, BW - 28, 3);
  // the tracery band the name is glazed into: a lead frame with small trefoil stops at both ends
  g.fillRect(14, 22, BW - 28, 2); g.fillRect(14, 64, BW - 28, 2);
  for (const ex of [26, BW - 26]) {
    g.fillStyle = '#34363f'; g.beginPath(); g.arc(ex, 43, 12.5, 0, 7); g.fill();
    for (const [ox, oy] of [[0, -5], [-5, 3], [5, 3]]) { g.fillStyle = '#b8642a'; g.beginPath(); g.arc(ex + ox, 43 + oy, 5, 0, 7); g.fill(); g.strokeStyle = LEAD; g.lineWidth = 2; g.stroke(); }
  }
  return c;
}

// Text set small in Exo 2 with a hard alpha threshold, so scaling it up with smoothing off gives real pixel
// letterforms from the game's own face
function pixelText(text, size, fill) {
  // outline thickness grows with the size, plus a solid drop shadow, so the name holds up over busy key art
  const o = Math.max(1, Math.round(size / 16)), pad = o * 2 + 3, c = document.createElement('canvas'), g = c.getContext('2d', { willReadFrequently: true });
  g.font = `800 ${size}px ${FN}`;
  c.width = Math.ceil(g.measureText(text).width + pad * 2); c.height = size + pad * 2 + 2;
  g.font = `800 ${size}px ${FN}`; g.textBaseline = 'top'; g.textAlign = 'left';
  g.fillStyle = 'rgba(7,8,11,.9)'; g.fillText(text, pad + o + 1, pad + o + 2); // drop shadow
  g.fillStyle = LEAD;
  for (let ox = -o; ox <= o; ox++) for (let oy = -o; oy <= o; oy++) if (Math.abs(ox) + Math.abs(oy) <= o + 1) g.fillText(text, pad + ox, pad + oy);
  const bands = g.createLinearGradient(0, pad, 0, pad + size);
  fill.forEach((col, k) => { bands.addColorStop(k / fill.length, col); bands.addColorStop((k + 1) / fill.length - 0.001, col); });
  g.fillStyle = bands; g.fillText(text, pad, pad);
  const d = g.getImageData(0, 0, c.width, c.height), px = d.data;
  for (let i = 3; i < px.length; i += 4) px[i] = px[i] > 110 ? 255 : 0;
  g.putImageData(d, 0, 0);
  return c;
}
const buildLogo = () => pixelText('FLOORBREAKER', 40, ['#fff8e8', '#f4ecd8', '#ffd9a0', '#ffb062', '#ff963c']);

// With key art (art-src/title-art.png) the painting fills the screen. Its tower already climbs through the four
// floor colours, so the progress windows are left out (the best-record line under the menu still says how far you got).
// The picture is lifted by ART_LIFT of its height: the hero stands above the menu panes instead of behind them.
const ART_LIFT = 0.1;
function drawArtBg(art) {
  logo ??= buildLogo();
  ctx.save(); ctx.imageSmoothingEnabled = false;
  const lift = Math.round(art.height * ART_LIFT);
  ctx.drawImage(art, 0, lift, art.width, art.height - lift, 0, 0, W, H - lift * S);
  ctx.drawImage(art, 0, art.height - 1, art.width, 1, 0, H - lift * S, W, lift * S); // the plaza's last row fills the gap
  [[0, 0.3], [0.17, 0.18], [0.24, 0.08]].forEach(([y, a], k, l) => { ctx.fillStyle = `rgba(7,8,11,${a})`; ctx.fillRect(0, H * y, W, H * ((l[k + 1]?.[0] ?? 0.28) - y)); }); // shade the sky under the name
  // the menu stands on the lower band: darken it in three steps so the panes read on any painting
  [[0.62, 0.18], [0.7, 0.32], [0.82, 0.5]].forEach(([y, a]) => { ctx.fillStyle = `rgba(7,8,11,${a})`; ctx.fillRect(0, H * y, W, H * (1 - y)); });
  const lw = logo.width * 2, lh = logo.height * 2;
  ctx.drawImage(logo, Math.round((W - lw) / 2), 22 * S + Math.round((42 * S - lh) / 2), lw, lh);
  ctx.restore();
}

export function drawMenuBg() {
  if (IMG['title-art']) return drawArtBg(IMG['title-art']);
  buf ??= buildGlass();
  logo ??= buildLogo();
  ctx.save(); ctx.imageSmoothingEnabled = false;
  ctx.drawImage(buf, 0, 0, W, H);
  // light breathing through the glass (still when reduced motion / flashing is off)
  const t = G.time, live = settings.flash;
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < reached && i < 4; i++) {
    const [r, gr, b] = torch(i), k = live ? 0.06 + 0.04 * Math.sin(t * 0.8 + i * 1.7) : 0.06;
    const shaft = ctx.createLinearGradient(0, LANCET.apex, 0, LANCET.foot);
    shaft.addColorStop(0, `rgba(${r},${gr},${b},${k * 2})`); shaft.addColorStop(1, `rgba(${r},${gr},${b},0)`);
    ctx.save(); ctx.scale(S, S); lancetPath(ctx, lancetX(i), LANCET.w); ctx.fillStyle = shaft; ctx.fill(); ctx.restore();
  }
  ctx.globalCompositeOperation = 'source-over';
  // town names in the inscription bands, set at screen resolution so they stay readable
  for (let i = 0; i < 4; i++) {
    const [r, gr, b] = torch(i);
    drawText(ctx, i < reached ? FLOORS[i].town.toUpperCase().split('').join(' ') : '? ? ?', (lancetX(i) + LANCET.w / 2) * S, (LANCET.foot - 9) * S + 5,
      { size: 15, weight: 800, color: i < reached ? `rgb(${r},${gr},${b})` : '#4a4d5c', align: 'center', outline: null });
  }
  const lw = logo.width * 2, lh = logo.height * 2;
  ctx.drawImage(logo, Math.round((W - lw) / 2), 22 * S + Math.round((42 * S - lh) / 2), lw, lh);
  ctx.restore();
}

// Dive In: the Spire's glass cracks out from the middle and falls away in shards, and the first floor's name is
// set behind it. Reduced motion skips the fall: the glass fades and the name comes up.
const reduced = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
let shards = null, snap = null, lastT = Infinity, title = null, titleAct = -1;
function breakGlass() {
  drawMenuBg();
  snap = document.createElement('canvas'); snap.width = W; snap.height = H; snap.getContext('2d').drawImage(ctx.canvas, 0, 0);
  // a jittered 10 x 7 grid, two triangles per cell; each shard flies away from the impact point and tumbles
  const cols = 10, rows = 7, rnd = rand(4242), pt = [];
  for (let y = 0; y <= rows; y++) for (let x = 0; x <= cols; x++) {
    const edge = x === 0 || x === cols || y === 0 || y === rows;
    pt.push([x * W / cols + (edge ? 0 : (rnd() - 0.5) * 50), y * H / rows + (edge ? 0 : (rnd() - 0.5) * 50)]);
  }
  const P = (x, y) => pt[y * (cols + 1) + x];
  shards = [];
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) for (const tri of [[P(x, y), P(x + 1, y), P(x + 1, y + 1)], [P(x, y), P(x + 1, y + 1), P(x, y + 1)]]) {
    const cx = (tri[0][0] + tri[1][0] + tri[2][0]) / 3, cy = (tri[0][1] + tri[1][1] + tri[2][1]) / 3;
    const dx = cx - W / 2, dy = cy - H * 0.45, d = Math.hypot(dx, dy) || 1, sp = 120 + rnd() * 160;
    shards.push({ tri, cx, cy, d, vx: dx / d * sp, vy: dy / d * sp - 120, spin: (rnd() - 0.5) * 5 });
  }
}
const CRACK = 0.5, FALL = 0.55;
export function drawIntro() {
  const t = G.introT, k = t / INTRO_TIME;
  if (t < lastT || !shards) breakGlass(); // a fresh Dive In
  lastT = t;
  ctx.fillStyle = '#07080b'; ctx.fillRect(0, 0, W, H);
  // the first floor's name, waiting behind the glass
  const act = actOf(G.introFloor), [r, gr, b] = torch(act);
  if (titleAct !== act) { title = pixelText(FLOORS[act].town.toUpperCase(), 40, ['#fff8e8', rgbK([r, gr, b], 1.3), `rgb(${r},${gr},${b})`]); titleAct = act; }
  const show = clamp((t - 0.7) * 2.5, 0, 1);
  ctx.save(); ctx.imageSmoothingEnabled = false; ctx.globalAlpha = show;
  const tw = title.width * 2, th = title.height * 2;
  ctx.drawImage(title, Math.round((W - tw) / 2), Math.round(H / 2 - th / 2 - 10), tw, th);
  drawText(ctx, `T H E   S P I R E   ·   ${G.introFloor + 1}`, W / 2, H / 2 + th / 2 + 18, { size: 16, weight: 800, color: '#b9b2a2', align: 'center', outline: null });
  ctx.restore();
  if (reduced) { ctx.globalAlpha = clamp(1 - t / 0.6, 0, 1); ctx.drawImage(snap, 0, 0); ctx.globalAlpha = 1; }
  else for (const sh of shards) {
    const ft = Math.max(0, t - FALL - sh.d / 1400); // shards near the impact go first
    if (ft > 1.2) continue;
    const [[ax, ay], [bx, by], [cx2, cy2]] = sh.tri;
    ctx.save();
    ctx.translate(sh.cx + sh.vx * ft, sh.cy + sh.vy * ft + 900 * ft * ft); ctx.rotate(sh.spin * ft); ctx.translate(-sh.cx, -sh.cy);
    ctx.globalAlpha = clamp(1 - ft * 1.1, 0, 1);
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.lineTo(cx2, cy2); ctx.closePath();
    ctx.save(); ctx.clip(); ctx.drawImage(snap, 0, 0); ctx.restore();
    // cracks run outward from the impact before anything falls
    const crack = clamp((t / CRACK) * 700 - sh.d, 0, 60) / 60;
    if (crack > 0) { ctx.strokeStyle = `rgba(255,248,230,${0.75 * crack})`; ctx.lineWidth = 1.5; ctx.stroke(); }
    ctx.restore();
  }
  if (k > 0.82) { ctx.fillStyle = `rgba(7,8,11,${(k - 0.82) / 0.18})`; ctx.fillRect(0, 0, W, H); }
}
