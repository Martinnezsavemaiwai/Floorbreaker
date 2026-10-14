// Town and shop-room scenery drawn with canvas primitives in the act's glass colour (the title-screen lancet tokens).
// Low props are baked into the floor background (bakeLow); tall ones are pre-rendered once per floor to a small
// canvas and y-sorted with the actors (drawTall), with the lantern and lamp flames drawn live on top.
import { G } from '../world/state.ts';
import { actOf } from '../data/run.ts';
import { on } from '../core/events.ts';
import { ctx, FT } from './canvas.js';
import { drawText } from './pixel.js';
import { IMG } from '../core/assets.ts';
import { REDUCED } from './anim.js';

const GLASS = ['#ff963c', '#a688ff', '#78ff96', '#5ac8ff']; // --firstlight --hornfield --mistwell --canalis
const INK = '#1a1420', WOOD = '#8a5a34', WOOD_D = '#5e3b20', CREAM = '#e8dcc0';
const mix = (hex, to, k) => { // hex colour moved k of the way toward a grey level `to` (0..255)
  const n = parseInt(hex.slice(1), 16);
  return '#' + [n >> 16, (n >> 8) & 255, n & 255].map(c => Math.round(c + (to - c) * k).toString(16).padStart(2, '0')).join('');
};
const pal = act => { const g = GLASS[act] ?? GLASS[0]; return { g, d: mix(g, 0, 0.5), dd: mix(g, 0, 0.72), l: mix(g, 255, 0.45) }; };

const box = (g, x, y, w, h, fill, line = INK) => { g.fillStyle = fill; g.fillRect(x, y, w, h); g.strokeStyle = line; g.lineWidth = 2; g.strokeRect(x + 1, y + 1, w - 2, h - 2); };
const shade = (g, p, grow = 4) => { g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(p.x + p.w / 2, p.y + p.h - 2, p.w / 2 + grow, Math.min(12, p.h / 3 + 3), 0, 0, 7); g.fill(); };
const wheel = (g, x, y, r) => {
  g.fillStyle = WOOD_D; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.strokeStyle = INK; g.lineWidth = 2; g.stroke();
  g.fillStyle = WOOD; g.beginPath(); g.arc(x, y, r * 0.35, 0, 7); g.fill();
};
function awning(g, x, y, w, h, A) { // striped cloth with a scalloped lower edge
  const n = Math.round(w / 15), sw = w / n;
  for (let i = 0; i < n; i++) {
    g.fillStyle = i % 2 ? CREAM : A.g; g.fillRect(x + i * sw, y, sw, h);
    g.beginPath(); g.arc(x + i * sw + sw / 2, y + h, sw / 2, 0, Math.PI); g.fill();
  }
  g.strokeStyle = INK; g.lineWidth = 2; g.strokeRect(x, y, w, h);
  g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x + 1, y + h - 5, w - 2, 4);
}

const DRAW = {
  house(g, p, A) {
    const { x, y, w, h } = p;
    box(g, x, y, w, h, '#9a8a76');
    for (let r = 60; r < h; r += 18) { g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(x + 2, y + r, w - 4, 2); }
    for (let r = 0; r < 44; r += 11) for (let c = (r / 11) % 2 ? 0 : 9; c < w; c += 18) { g.fillStyle = r % 22 ? A.dd : A.d; g.fillRect(x + c, y + r, 17, 10); } // eave: shingle rows
    g.fillStyle = INK; g.fillRect(x, y + 42, w, 4);
    g.fillStyle = A.g; g.fillRect(x, y + 46, w, 3);
    const cx = x + Math.round(w * 0.78) - 7; // chimney stack on the roof: brick courses, dark cap
    box(g, cx, y + 14, 14, 28, '#8a5a4a'); for (let r = 20; r < 40; r += 6) { g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(cx + 1, y + r, 12, 1); }
    g.fillStyle = INK; g.fillRect(cx - 2, y + 11, 18, 4);
    for (const wx of [x + 30, x + w - 66]) { // lit panes with a lead cross
      box(g, wx, y + 70, 36, 44, A.g); g.fillStyle = 'rgba(255,255,255,.28)'; g.fillRect(wx + 3, y + 73, 14, 18);
      g.fillStyle = INK; g.fillRect(wx + 17, y + 70, 3, 44); g.fillRect(wx, y + 90, 36, 3);
    }
    box(g, x + w / 2 - 17, y + h - 56, 34, 56, WOOD_D); g.fillStyle = '#d6b25a'; g.fillRect(x + w / 2 + 8, y + h - 30, 4, 4);
    g.fillStyle = '#5b5560'; g.fillRect(x + w / 2 - 24, y + h - 6, 48, 6);
  },
  stall(g, p, A) {
    const { x, y, w, h } = p;
    shade(g, p, 10);
    box(g, x, y + 10, w, h - 10, WOOD); g.fillStyle = WOOD_D; g.fillRect(x + 3, y + 28, w - 6, 3); g.fillRect(x + 3, y + 42, w - 6, 3);
    box(g, x - 4, y + 4, w + 8, 10, mix(WOOD, 255, 0.2)); // counter top
    [A.g, '#c0392b', '#e8c040', A.l, '#c0392b'].forEach((c, i) => { g.fillStyle = c; g.fillRect(x + 10 + i * 22, y - 4, 10, 8); g.fillStyle = INK; g.fillRect(x + 10 + i * 22, y + 3, 10, 1); });
    for (const px of [x - 2, x + w - 4]) box(g, px, y - 62, 6, h + 10, WOOD_D);
    awning(g, x - 10, y - 70, w + 20, 34, A);
    g.fillStyle = A.d; g.fillRect(x - 10, y - 36, w + 20, 3);
  },
  cart(g, p, A) {
    const { x, y, w, h } = p;
    shade(g, p, 8);
    box(g, x + 4, y + 16, w - 8, h - 16, WOOD); g.fillStyle = WOOD_D; for (let i = 1; i < 4; i++) g.fillRect(x + 4, y + 16 + i * 8, w - 8, 2);
    box(g, x, y + 10, w, 8, mix(WOOD, 255, 0.2));
    for (const [c, ox] of [[A.g, 14], ['#c0392b', 38], ['#e8c040', 62], [A.l, 84]]) { g.fillStyle = c; g.fillRect(x + ox, y + 2, 10, 10); g.fillStyle = INK; g.fillRect(x + ox, y + 11, 10, 1); }
    wheel(g, x + 22, y + h, 13); wheel(g, x + w - 22, y + h, 13);
    g.fillStyle = WOOD_D; g.fillRect(x - 26, y + h - 12, 28, 4); g.fillRect(x + w - 2, y + h - 12, 28, 4); // shafts
    for (const px of [x + 6, x + w - 10]) box(g, px, y - 40, 4, 56, WOOD_D);
    awning(g, x - 4, y - 46, w + 8, 26, A);
  },
  lamp(g, p, A) {
    const { x, y } = p, cx = x + 6;
    g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(cx, y + 11, 12, 5, 0, 0, 7); g.fill();
    box(g, x - 1, y + 2, 14, 10, '#5b5560'); box(g, cx - 3, y - 62, 6, 66, '#3a3340');
    box(g, cx - 9, y - 80, 18, 20, A.d); g.fillStyle = A.g; g.fillRect(cx - 6, y - 77, 12, 14);
    g.fillStyle = INK; g.fillRect(cx - 12, y - 84, 24, 5); g.fillRect(cx - 2, y - 88, 4, 5);
  },
  board(g, p, A) {
    const { x, y, w, h } = p;
    shade(g, p, 4);
    for (const px of [x + 4, x + w - 10]) box(g, px, y - 40, 6, h + 40, WOOD_D);
    box(g, x - 4, y - 46, w + 8, 34, WOOD);
    g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(x, y - 42, w, 26);
    ['#f1e6c8', A.l, '#f1e6c8'].forEach((c, i) => { const px = x + 3 + i * 15; g.fillStyle = c; g.fillRect(px, y - 40 + i % 2 * 4, 11, 16); g.fillStyle = INK; g.fillRect(px + 4, y - 38 + i % 2 * 4, 3, 3); });
  },
  barrel(g, p, A) {
    const { x, y, w, h } = p; shade(g, p, 2);
    g.fillStyle = WOOD; g.beginPath(); g.roundRect(x, y - 4, w, h + 4, 7); g.fill(); g.strokeStyle = INK; g.lineWidth = 2; g.stroke();
    g.fillStyle = A.d; g.fillRect(x + 1, y + 4, w - 2, 3); g.fillRect(x + 1, y + h - 8, w - 2, 3);
    g.fillStyle = mix(WOOD, 255, 0.25); g.beginPath(); g.ellipse(x + w / 2, y - 3, w / 2 - 2, 5, 0, 0, 7); g.fill(); g.stroke();
  },
  bench(g, p, A) {
    const { x, y, w, h } = p; shade(g, p, 2);
    for (const px of [x + 4, x + w - 10]) box(g, px, y + 6, 6, h + 6, WOOD_D);
    box(g, x, y, w, 10, WOOD); g.fillStyle = A.d; g.fillRect(x + 2, y + 2, w - 4, 2); box(g, x + 2, y - 8, w - 4, 8, WOOD_D);
  },
  planter(g, p, A) {
    const { x, y, w, h } = p; shade(g, p, 0);
    box(g, x, y + 6, w, h - 6, '#7a4a2c');
    for (let i = 0; i < 4; i++) { g.fillStyle = '#3f8a3c'; g.fillRect(x + 3 + i * 7, y, 5, 8); g.fillStyle = i % 2 ? A.l : A.g; g.beginPath(); g.arc(x + 5 + i * 7, y - 1, 4, 0, 7); g.fill(); g.strokeStyle = INK; g.lineWidth = 1; g.stroke(); }
  },
  hay(g, p) {
    const { x, y, w, h } = p; shade(g, p, 3);
    g.fillStyle = '#d6b24a'; g.beginPath(); g.roundRect(x, y - 6, w, h + 6, 8); g.fill(); g.strokeStyle = INK; g.lineWidth = 2; g.stroke();
    g.strokeStyle = '#a8842c'; for (let i = 6; i < w; i += 8) { g.beginPath(); g.moveTo(x + i, y - 2); g.lineTo(x + i - 3, y + h - 3); g.stroke(); }
    g.fillStyle = '#7a5a2a'; g.fillRect(x + 4, y + h / 2 - 2, w - 8, 3);
  },
  crate(g, p, A) {
    const { x, y, w, h } = p; shade(g, p, 2);
    box(g, x, y, w, h, WOOD); g.strokeStyle = WOOD_D; g.lineWidth = 3; g.strokeRect(x + 4, y + 4, w - 8, h - 8);
    g.beginPath(); g.moveTo(x + 4, y + 4); g.lineTo(x + w - 4, y + h - 4); g.stroke();
    g.fillStyle = A.g; g.fillRect(x + w - 9, y + 2, 5, 5);
  },
  sacks(g, p) {
    const { x, y, h } = p; shade(g, p, 2);
    for (const [ox, oy, c] of /** @type {[number, number, string][]} */ ([[0, 6, '#c8b88a'], [14, 2, '#b8a878']])) {
      g.fillStyle = c; g.beginPath(); g.roundRect(x + ox, y + oy, 16, h - oy, 6); g.fill(); g.strokeStyle = INK; g.lineWidth = 2; g.stroke();
      g.fillStyle = WOOD_D; g.fillRect(x + ox + 5, y + oy, 6, 3);
    }
  },
  mooring(g, p, A) {
    const { x, y, w, h } = p; shade(g, p, 2);
    box(g, x, y - 12, w, h + 12, '#4a4038'); g.fillStyle = A.d; g.fillRect(x, y - 12, w, 4);
    g.strokeStyle = '#d8c8a0'; g.lineWidth = 3; g.beginPath(); g.arc(x + w / 2, y - 2, 8, 0.4, 5.9); g.stroke();
  },
  moss(g, p) {
    g.fillStyle = 'rgba(40,110,60,.45)';
    for (const [fx, fy, r] of [[0.3, 0.5, 0.32], [0.6, 0.4, 0.28], [0.5, 0.7, 0.26], [0.8, 0.65, 0.2]]) { g.beginPath(); g.ellipse(p.x + p.w * fx, p.y + p.h * fy, p.w * r, p.h * r + 4, 0, 0, 7); g.fill(); }
  },
  lanterns(g, p, A) { // a string of lanterns hung under the eave
    const { x, y, w } = p, n = 4;
    g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.moveTo(x + 4, y - 6); g.quadraticCurveTo(x + w / 2, y + 12, x + w - 4, y - 6); g.stroke();
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n, lx = x + 4 + (w - 8) * t, ly = y - 6 + 8.8 * t * (1 - t) * 4 * 0.5;
      g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.arc(lx, ly + 7, 9, 0, 7); g.fill();
      box(g, lx - 4, ly + 2, 8, 11, A.g);
    }
  },
};

// Imported prop art (art-src/house.png, stall.png, town-props.png): [image, scale]. The sprite stands bottom-centre on
// the prop's footprint; props without art keep their drawn version.
const PROP_ART = { house: ['house', 1], stall: ['stall', 1], barrel: ['town-props-1', 1], crate: ['town-props-2', 1], sacks: ['town-props-3', 1],
  bench: ['town-props-4', 1], lamp: ['town-props-5', 1], board: ['town-props-6', 1], planter: ['town-props-7', 1], hay: ['town-props-8', 1],
  mooring: ['town-props-9', 1], cart: ['town-props-10', 2], lanterns: ['lanterns', 1], moss: ['moss', 1] }; // the cart is the one big piece of a small-scale sheet
const propArt = p => { const [n, k] = PROP_ART[p.kind] ?? []; return IMG[n] ? { img: IMG[n], k } : null; };
function drawProp(g, p, A) {
  const art = propArt(p);
  if (!art) return DRAW[p.kind]?.(g, p, A);
  const w = art.img.width * art.k, h = art.img.height * art.k;
  if (p.kind !== 'house' && p.kind !== 'lanterns' && p.kind !== 'moss') shade(g, p); // moss lies flat: no shadow
  g.imageSmoothingEnabled = false;
  // lanterns hang from the eave line, moss is centred on its patch; everything else stands on the ground
  const top = p.kind === 'lanterns' ? p.y - 6 : p.kind === 'moss' ? p.y + p.h / 2 - h / 2 : p.y + p.h - h;
  g.drawImage(art.img, Math.round(p.x + p.w / 2 - w / 2), Math.round(top), w, h);
}

// ---- the floor background: low props, sorted by y so lower ones overlap higher ones ----
export function bakeLow(g, props, act) {
  const A = pal(act);
  for (const p of props.filter(q => !q.tall).sort((a, b) => a.y + a.h - (b.y + b.h))) drawProp(g, p, A);
  const hs = props.filter(q => q.kind === 'house');
  if (hs.length === 4) banner(g, (hs[1].x + hs[1].w + hs[2].x) / 2, A);
}
// The town name, as a banner hung between the two middle houses
function banner(g, cx, A) {
  g.font = `bold 18px ${FT}`; g.textAlign = 'center';
  const w = Math.max(100, Math.ceil(g.measureText(G.F.town).width) + 28), y = 108, x = cx - w / 2;
  g.strokeStyle = INK; g.lineWidth = 3; g.beginPath(); g.moveTo(x, y - 4); g.lineTo(x + w, y - 4); g.stroke();
  g.fillStyle = A.dd; g.beginPath(); g.moveTo(x + 4, y - 2); g.lineTo(x + w - 4, y - 2); g.lineTo(x + w - 4, y + 28); g.lineTo(cx, y + 36); g.lineTo(x + 4, y + 28); g.fill();
  g.strokeStyle = A.g; g.lineWidth = 2; g.strokeRect(x + 6, y, w - 12, 26);
  drawText(g, G.F.town, cx, y + 20, { size: 18, weight: 700, font: FT, color: A.l, align: 'center', outline: null });
}

// ---- tall props: one small canvas each, built when the floor loads ----
const PAD = { x: 36, up: 96, down: 36 };
const tall = new Map(); // prop -> canvas
let tallList = [], tallA = pal(0); // this floor's tall props and palette, cached for drawTall
function prerenderTall(props, act) {
  tall.clear(); const A = tallA = pal(act); tallList = props.filter(p => p.tall);
  for (const p of props) {
    if (!p.tall) continue;
    const c = document.createElement('canvas'); c.width = p.w + PAD.x * 2; c.height = PAD.up + p.h + PAD.down;
    const g = c.getContext('2d'); g.translate(PAD.x - p.x, PAD.up - p.y); g.imageSmoothingEnabled = false;
    drawProp(g, p, A); tall.set(p, c);
  }
}
on('floorLoaded', i => prerenderTall(G.L.props ?? [], actOf(i)));

export const tallProps = () => tallList;
export function drawTall(p) {
  const c = tall.get(p); if (!c) return;
  ctx.drawImage(c, p.x - PAD.x, p.y - PAD.up);
  const A = tallA, t = G.time, k = REDUCED ? 0.5 : 1, art = propArt(p);
  if (art) { // the art has its own lantern: just let it breathe light
    if (p.kind !== 'lamp' && p.kind !== 'stall') return;
    const lx = p.kind === 'lamp' ? p.x + p.w / 2 : p.x + p.w / 2 + art.img.width * 0.48, ly = p.kind === 'lamp' ? p.y + p.h - art.img.height + 10 : p.y + p.h - art.img.height * 0.55;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.14 + 0.04 * Math.sin(t * 9 + p.x) * k;
    ctx.fillStyle = '#ffb04a'; ctx.beginPath(); ctx.arc(lx, ly, 26, 0, 7); ctx.fill(); ctx.restore();
    return;
  }
  if (p.kind === 'lamp') { // flame flicker and a soft glow
    const fx = p.x + 6, fy = p.y - 70, f = 1 + Math.sin(t * 9 + p.x) * 0.15 * k;
    ctx.save(); ctx.globalAlpha = 0.16; ctx.fillStyle = A.g; ctx.beginPath(); ctx.arc(fx, fy, 30 * f, 0, 7); ctx.fill();
    ctx.globalAlpha = 1; ctx.fillStyle = A.l; ctx.beginPath(); ctx.ellipse(fx, fy, 3.5, 6 * f, 0, 0, 7); ctx.fill(); ctx.restore();
  } else if (p.kind === 'stall') { // a lantern swaying from the awning's right edge
    const sw = Math.sin(t * 2 + p.x) * 3 * k, lx = p.x + p.w + 4 + sw, ly = p.y - 22;
    ctx.save(); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.x + p.w + 4, p.y - 36); ctx.lineTo(lx, ly - 4); ctx.stroke();
    ctx.globalAlpha = 0.2; ctx.fillStyle = A.g; ctx.beginPath(); ctx.arc(lx, ly + 4, 16, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
    ctx.fillStyle = A.g; ctx.fillRect(lx - 4, ly - 2, 8, 12); ctx.strokeStyle = INK; ctx.strokeRect(lx - 4, ly - 2, 8, 12); ctx.restore();
  }
}
