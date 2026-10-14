// Two townspeople who wander between plaza points and say one line when you come close.
// Cosmetic only: Math.random, never the seeded rng(); not saved; the player walks through them, mobs ignore them.
import { G } from '../world/state.ts';
import { actOf } from '../data/run.ts';
import { pickLine } from '../data/dialogue.ts';
import { move } from '../world/physics.ts';
import { toastHeld, bubbleUp } from './merchant.js';

const SPEED = 55, TALK = 120, SHOWN = 3, STUCK = 1;
const rnd = (a, b) => a + Math.random() * (b - a);

export function buildFolk() {
  const pts = [...G.L.folkPoints].sort(() => Math.random() - 0.5);
  return ['folkA', 'folkB'].map((sheet, i) => ({ x: pts[i].x, y: pts[i].y, r: 10, sheet, face: 0, target: null, wait: rnd(0, 2), moving: false,
    said: false, bubble: null, still: 0 }));
}
function pickTarget(f) {
  const pts = G.L.folkPoints.filter(p => p !== f.target && !G.npc.folk.some(o => o !== f && o.target === p));
  f.target = pts[Math.floor(Math.random() * pts.length)]; f.still = 0;
}

export function updateFolk(dt) {
  const P = G.P;
  for (const f of G.npc?.folk ?? []) {
    if (f.bubble && (f.bubble.t -= dt) <= 0) f.bubble = null;
    const dx = P.x - f.x, dy = P.y - f.y, d = Math.hypot(dx, dy);
    f.moving = false;
    if (d < TALK) { // stop, face the player, one line per town visit (not under a toast or another bubble)
      f.face = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 3 : 2) : (dy > 0 ? 0 : 1);
      if (!f.said && !toastHeld() && !bubbleUp()) { f.said = true; f.bubble = { text: pickLine('folk', { act: actOf(G.floorIdx) }), t: SHOWN }; }
      continue;
    }
    if ((f.wait -= dt) > 0) continue;
    if (!f.target) pickTarget(f);
    const tx = f.target.x - f.x, ty = f.target.y - f.y, td = Math.hypot(tx, ty);
    if (td < 8) { f.target = null; f.wait = rnd(2, 5); continue; }
    const px = f.x, py = f.y, s = Math.min(SPEED * dt, td);
    move(f, tx / td * s, ty / td * s);
    f.face = Math.abs(tx) > Math.abs(ty) ? (tx > 0 ? 3 : 2) : (ty > 0 ? 0 : 1);
    f.moving = true;
    f.still = Math.hypot(f.x - px, f.y - py) < s * 0.25 ? f.still + dt : 0;
    if (f.still > STUCK) pickTarget(f);
  }
}
