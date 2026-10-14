// Ambient life: themed critters per act. Cosmetic only: Math.random, never the seeded rng(); not saved; nothing here touches gameplay state.
import { G } from '../world/state.ts';
import { actOf, kindOf } from '../data/run.ts';
import { on, emit } from '../core/events.ts';
import { REDUCED } from '../render/anim.js';
import { burst } from './fx.js';

export const MAX_AMBIENT = 24;
const rnd = (a, b) => a + Math.random() * (b - a);
const SPEED = REDUCED ? 0.5 : 1;

// kinds per place: [kind, count]; boss floors get only the first (light) entry
/** @type {[string, number][]} */
const TOWN = [['butterfly', 3], ['smoke', 4]];
/** @type {[string, number][][]} */
const ACT = [
  [['butterfly', 5], ['pollen', 5]],
  [['leaf', 5], ['grasshopper', 4]],
  [['firefly', 8], ['leaf', 3]],
  [['bubble', 5], ['spray', 4], ['gull', 1]],
];

const doorRects = () => [...G.doors, ...(G.L.door ? [G.L.door] : [])];
const free = (x, y) => !G.trees.some(t => Math.hypot(x - t[0], y - t[1]) < 100) && !(G.L.kind === 'room' && x > G.L.w - 130) && !G.WALLS.some(w => x > w.x - 8 && x < w.x + w.w + 8 && y > w.y - 8 && y < w.y + w.h + 8)
  && !doorRects().some(d => x > d.x - 60 && x < d.x + d.w + 60 && y > d.y - 60 && y < d.y + d.h + 60);
function spot() {
  const w = Math.min(G.L.w, G.L.roomX), h = G.L.h;
  for (let i = 0; i < 30; i++) { const x = rnd(40, w - 40), y = rnd(40, h - 40); if (free(x, y)) return { x, y }; }
  return { x: G.L.start.x, y: G.L.start.y };
}
const pondSpot = () => {
  if (!G.ponds.length) return spot();
  const p = G.ponds[Math.floor(Math.random() * G.ponds.length)];
  return { x: p.x + rnd(6, p.w - 6), y: p.y + rnd(6, p.h - 6) };
};

function make(kind, anchor) {
  const a = anchor ?? (kind === 'bubble' || kind === 'spray' ? pondSpot() : spot());
  return { kind, x: a.x, y: a.y, vx: 0, vy: 0, t: 0, phase: rnd(0, 6.28), air: ['butterfly', 'leaf', 'firefly', 'gull', 'smoke'].includes(kind),
    ax: a.x, ay: a.y, z: 0, col: Math.floor(Math.random() * 3), life: rnd(1, 2), per: rnd(2, 3) };
}

const inPond = (x, y) => G.ponds.some(p => x > p.x - 8 && x < p.x + p.w + 8 && y > p.y - 8 && y < p.y + p.h + 8);
const perchOk = (x, y) => free(x, y) && !inPond(x, y) &&
   Math.hypot(x - G.L.start.x, y - G.L.start.y) > 160;
// one or two flocks of 3-4 perched birds: pick an anchor, spiral outward for spots; a flock that can't reach 3 is dropped and another anchor tried
function flocks() {
  const birds = [], w = Math.min(G.L.w, G.L.roomX);
  for (let f = 0, tries = 0; f < (REDUCED ? 1 : 2) && tries < 80; tries++) {
    const cx = rnd(80, w - 80), cy = rnd(80, G.L.h - 80), want = 3 + (Math.random() < 0.5 ? 1 : 0), got = [];
    for (let i = 0; i < 40 && got.length < want; i++) {
      const r = i * 2.5, a = i * 2.4, x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.7;
      if (perchOk(x, y) && got.every(g => Math.hypot(g.x - x, g.y - y) > 9)) got.push({ x, y });
    }
    if (got.length < 3) continue;
    for (const { x, y } of got) birds.push({ x, y, hx: x, hy: y, vx: 0, vy: 0, z: 0, flying: false, peck: rnd(0, 3), flock: f });
    f++;
  }
  return birds;
}

// grass tufts: lean away from anyone close, spring back, sleep once still
export const GRASS = [['#2f7a1e', '#d4f06a'], ['#7a7a2a', '#e8d870'], ['#2f7a55', '#b0f0c8'], ['#2f7a7a', '#b0f0f0']]; // [stroke, tip] per act
const REACH = 28, MAX_LEAN = REDUCED ? 0.3 : 0.6, KICK = REDUCED ? 0.8 : 1.6;
function tufts() {
  if (G.L.kind !== 'room') return [];
  const out = [], n = REDUCED ? 5 + Math.floor(Math.random() * 6) : 10 + Math.floor(Math.random() * 11), st = G.L.start;
  for (let i = 0; i < 200 && out.length < n; i++) {
    const { x, y } = spot();
    if (!(x === st.x && y === st.y) && !inPond(x, y)) out.push({ x, y, blades: 5 + Math.floor(Math.random() * 3), lean: 0, vel: 0, awake: false });
  }
  return out;
}

export function buildAmbient() {
  const act = actOf(G.floorIdx), kind = kindOf(G.floorIdx), critters = [];
  const plan = kind === 'town' ? TOWN : kind === 'boss' ? ACT[act].slice(0, 1) : ACT[act];
  for (let [k, n0] of plan) {
    if ((k === 'bubble' || k === 'spray') && !G.ponds.length) k = 'pollen'; // no water here: drifting specks instead
    const n = Math.max(1, Math.round(n0 * (REDUCED ? 0.5 : 1) * (kind === 'boss' ? 0.6 : 1)));
    const planters = (G.L.props ?? []).filter(p => p.kind === 'planter'), houses = (G.L.props ?? []).filter(p => p.kind === 'house');
    for (let i = 0; i < n; i++) {
      let anchor;
      if (kind === 'town' && k === 'butterfly' && planters.length) { const p = planters[i % planters.length]; anchor = { x: p.x + p.w / 2, y: p.y - 10 }; }
      if (kind === 'town' && k === 'smoke' && houses.length) { const h = houses[i % houses.length]; anchor = { x: h.x + Math.round(h.w * 0.78), y: h.y + 12 }; }
      const c = make(k, anchor);
      if (k === 'smoke') c.t = rnd(0, 3);
      if (k === 'gull') { c.wait = rnd(3, 8); c.x = -9999; }
      if (k === 'grasshopper') c.life = 0;
      critters.push(c);
    }
  }
  const birds = kind === 'boss' ? [] : flocks();
  G.ambient = { critters: critters.slice(0, MAX_AMBIENT - birds.length), birds, tufts: tufts() };
}
on('floorLoaded', buildAmbient);

function flick() {
  const { P } = G, T = G.ambient?.tufts;
  if (!P || !T?.length) return;
  for (const t of T) {
    const dx = t.x - P.x, d = Math.hypot(dx, t.y - P.y);
    if (d > 80 || (d > 8 && Math.cos(Math.atan2(t.y - P.y, dx) - P.ang) < -0.2)) continue;
    t.vel += (dx >= 0 ? KICK : -KICK); t.awake = true;
    if (!REDUCED && Math.random() < 0.3) burst(t.x, t.y - 4, 2, GRASS[actOf(G.floorIdx)][1], 40, 0.5, 2);
  }
}
on('swing', flick); on('skill', flick);

function takeOff(flock, from) {
  const B = G.ambient?.birds.filter(b => b.flock === flock && !b.flying);
  if (!B?.length) return;
  for (const b of B) {
    const dx = b.x - from.x, d = Math.hypot(dx, b.y - from.y) || 1;
    b.flying = true; const sg = dx > 0 ? 1 : dx < 0 ? -1 : Math.random() < 0.5 ? 1 : -1; b.vx = sg * Math.max(90, Math.abs(dx / d * 200 + rnd(-40, 40))); b.vy = -170 - rnd(0, 50);
  }
  emit('birdsFlee');
}
function scatterNear(p, r) {
  const hit = new Set(G.ambient?.birds.filter(b => !b.flying && Math.hypot(b.x - p.x, b.y - p.y) < r).map(b => b.flock));
  for (const f of hit) takeOff(f, p);
}
on('mobDeath', p => scatterNear(p, 200));
on('bossImpact', () => G.boss && scatterNear(G.boss, 200));

function respawn(c) { Object.assign(c, make(c.kind), { phase: c.phase }); }

export function updateAmbient(dt) {
  if (!G.ambient || !G.L || !G.P) return;
  const { P, L } = G, s = SPEED * dt, B = G.ambient.birds;
  for (const t of G.ambient.tufts) {
    let near = false;
    for (let k = -1; k < G.mobs.length; k++) {
      const c = k < 0 ? P : G.mobs[k]; if (c.hp <= 0) continue;
      const dx = t.x - c.x, d = Math.hypot(dx, t.y - c.y);
      if (d < REACH) { near = true; t.lean = Math.max(-MAX_LEAN, Math.min(MAX_LEAN, t.lean + (dx >= 0 ? 1 : -1) * (1 - d / REACH) * MAX_LEAN * 0.5)); }
    }
    if (near) t.awake = true;
    if (!t.awake) continue;
    t.vel += (-60 * t.lean - 6 * t.vel) * dt; t.lean += t.vel * dt;
    if (!near && Math.abs(t.lean) < 0.01 && Math.abs(t.vel) < 0.01) { t.lean = t.vel = 0; t.awake = false; }
  }
  scatterNear(P, 110);
  for (const f of G.npc?.folk ?? []) scatterNear(f, 40);
  for (let i = B.length - 1; i >= 0; i--) {
    const b = B[i];
    if (!b.flying) { b.peck += dt; if (Math.sin(b.peck * 5) > 0.97) b.x = Math.min(Math.max(b.x + rnd(-1, 1) * 0.6, b.hx - 8), b.hx + 8); continue; }
    b.x += b.vx * dt; b.y += b.vy * dt; b.z += 70 * dt;
    if (b.z > 220 || b.y < -60 || b.x < -60 || b.x > L.w + 60) B.splice(i, 1); // ponytail: z>220 counts as off screen
  }
  for (const c of G.ambient.critters) {
    c.t += dt; c.phase += dt * 2 * SPEED;
    switch (c.kind) {
      case 'butterfly':
        c.x = c.ax + Math.sin(c.phase * 0.7) * 50 + Math.sin(c.phase * 1.9) * 12; c.y = c.ay + Math.cos(c.phase * 0.5) * 30 + Math.sin(c.phase * 2.3) * 6; break;
      case 'pollen':
        c.x += (8 + Math.sin(c.phase) * 6) * s; c.y += Math.cos(c.phase * 0.7) * 5 * s;
        if (c.x > L.w) c.x = 0; if (c.y < 0 || c.y > L.h) c.y = rnd(40, L.h - 40); break;
      case 'leaf':
        c.x += (34 + Math.sin(c.phase) * 10) * s; c.y += (20 + Math.cos(c.phase * 0.8) * 8) * s;
        if (c.x > L.w + 10) c.x = -10; if (c.y > L.h + 10) c.y = -10; break;
      case 'firefly':
        c.x += Math.cos(c.phase * 0.4) * 9 * s; c.y += Math.sin(c.phase * 0.6) * 7 * s;
        c.x = Math.min(Math.max(c.x, 0), L.w); c.y = Math.min(Math.max(c.y, 0), L.h); break;
      case 'grasshopper': {
        const dx = c.x - P.x, dy = c.y - P.y, d = Math.hypot(dx, dy) || 1;
        if (c.life > 0) { // mid-hop: arc over 0.35 s
          c.life -= dt; c.x += c.vx * s; c.y += c.vy * s; c.z = Math.sin(Math.max(0, c.life) / 0.35 * Math.PI) * 10;
          if (c.life <= 0) c.z = 0;
        } else if (d < 70) {
          c.life = 0.35; c.vx = dx / d * 130; c.vy = dy / d * 130;
          if (!free(c.x + c.vx * 0.35, c.y + c.vy * 0.35)) { c.vx = -c.vy; c.vy = dx / d * 130; }
        } else c.life = Math.min(0, c.life);
        c.x = Math.min(Math.max(c.x, 20), L.w - 20); c.y = Math.min(Math.max(c.y, 20), L.h - 20); break;
      }
      case 'bubble': c.y -= 14 * s; c.life -= dt; if (c.life <= 0) respawn(c); break;
      case 'spray': c.life -= dt * 2; c.y -= 18 * s * Math.max(0, c.life - 0.5); c.x += Math.sin(c.phase) * 6 * s; if (c.life <= 0) respawn(c); break;
      case 'gull': // parked off screen while `wait` counts down, then crosses the floor
        if (c.x === -9999) { if ((c.wait -= dt) <= 0) { c.x = -40; c.y = rnd(80, L.h - 200); } }
        else { c.x += 150 * s; c.y += Math.sin(c.phase * 0.8) * 6 * s; if (c.x > L.w + 40) { c.x = -9999; c.wait = rnd(12, 20); } }
        break;
      case 'smoke': if (c.t > 3) c.t = 0; break;
    }
  }
}
