// Boss arena mechanics: one per boss room (data in bosses.ts ARENA). Every hazard is warned before it hurts.
import { G, bossDmg } from '../world/state.ts';
import { ARENA } from '../data/bosses.ts';
import { rand, dist } from '../core/math.ts';
import { emit } from '../core/events.ts';
import { hurtPlayer } from './combat.js';
import { burst, ring, kick } from './fx.js';
import { makeMob } from '../world/floor.ts';
import { MOBS } from '../data/mobs.ts';

export function buildArena(id) {
  const A = { id, rocks: [], pillars: [], vision: ARENA.fog.start };
  if (id === 'pillars') {
    const P = ARENA.pillars, s = P.size;
    for (const [x, y] of P.at) { const p = { x: x - s / 2, y: y - s / 2, w: s, h: s, hits: 0 }; A.pillars.push(p); G.WALLS.push({ x: p.x, y: p.y, w: s, h: s }); }
  }
  if (id === 'flood') A.flood = { t: ARENA.flood.every - ARENA.flood.warn, warn: 0, on: 0, tick: 0 };
  return A;
}
export const onPlatform = p => ARENA.flood.platforms.some(([x, y]) => dist(p, { x, y }) < ARENA.flood.platR);
// The charge ran into something: if it was a pillar, crack it and daze the boss. Returns whether a pillar was hit.
export function onDashBlocked(b) {
  const A = G.arena, P = ARENA.pillars, g = b.r + 6;
  const p = A?.id === 'pillars' && A.pillars.find(p => b.x > p.x - g && b.x < p.x + p.w + g && b.y > p.y - g && b.y < p.y + p.h + g);
  if (!p) return false;
  const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
  p.hits++; b.stun = P.stun;
  burst(cx, cy, 14, '#9a8f84', 260, 0.5, 7, false); ring(cx, cy, 10, 90, 0.3, '200,190,170'); kick(0.08, 14); emit('arenaWarn', 'pillars');
  if (p.hits >= P.hits) {
    A.pillars.splice(A.pillars.indexOf(p), 1);
    const i = G.WALLS.findIndex(w => w.x === p.x && w.y === p.y); if (i >= 0) G.WALLS.splice(i, 1);
    burst(cx, cy, 30, '#8a7a6a', 340, 0.7, 8, false); kick(0.05, 10);
  }
  return true;
}
// A random spot inside the boss room, away from `avoid` (spread px); gives up after 10 tries
function roomSpot(avoid, spread) {
  const L = G.L;
  for (let k = 0; ; k++) {
    const p = { x: rand(L.roomX + 80, L.w - 60), y: rand(60, L.h - 60) };
    if (k >= 10 || avoid.every(a => dist(a, p) >= spread)) return p;
  }
}
export function onSlam() {
  const A = G.arena; if (A?.id !== 'rockfall') return;
  const R = ARENA.rockfall, P = G.P, spots = [{ x: P.x, y: P.y }];
  while (spots.length < R.rocks) spots.push(roomSpot(spots, R.spread));
  for (const s of spots) A.rocks.push({ ...s, t: R.warn });
  emit('arenaWarn', 'rockfall');
}
// Roots burst out of the ground: in the fog room every spot but the one under the player grows a sprout
export function onRoots(b) {
  if (G.arena?.id !== 'fog') return;
  for (const s of b.spots.slice(1)) {
    const m = makeMob(s.x, s.y, false, MOBS.rootSprout); m.sprout = true; m.life = ARENA.fog.sproutLife; m.aggro = false;
    G.mobs.push(m); ring(s.x, s.y, 5, 40, 0.3, '120,200,90');
  }
}
export function onSproutKilled() {
  const A = G.arena, F = ARENA.fog; if (A?.id !== 'fog') return;
  A.vision = Math.min(F.start, A.vision + F.restore);
}
function updateFlood(A, dt) {
  const F = ARENA.flood, f = A.flood, b = G.boss;
  if (f.on > 0) {
    f.on -= dt; f.tick -= dt;
    if (f.tick <= 0) { f.tick += F.tick; if (!onPlatform(G.P)) hurtPlayer(Math.round(G.P.maxHp * F.dmg), null, true); }
    if (f.on <= 0) { f.on = 0; f.t = (b.hp < b.maxHp * F.lateAt ? F.everyLate : F.every) - F.warn - F.last; } // period is start-to-start
  } else if (f.warn > 0) {
    if ((f.warn -= dt) <= 0) { f.warn = 0; f.on = F.last; f.tick = F.tick; }
  } else if ((f.t = Math.min(f.t, b.hp < b.maxHp * F.lateAt ? F.everyLate - F.warn - F.last : Infinity) - dt) <= 0) { f.warn = F.warn; emit('arenaWarn', 'flood'); }
}
export function updateArena(dt) {
  const A = G.arena; if (!A || !G.boss.awake || G.boss.hp <= 0) return;
  if (A.id === 'fog') A.vision = Math.max(ARENA.fog.min, A.vision - ARENA.fog.shrink * dt);
  if (A.id === 'flood') updateFlood(A, dt);
  if (A.id === 'rockfall') {
    const R = ARENA.rockfall, dmg = Math.round(bossDmg('slam') * R.dmgMult);
    A.rocks = A.rocks.filter(r => {
      if ((r.t -= dt) > 0) return true;
      burst(r.x, r.y, 18, '#8a7a6a', 280, 0.5, 7, false); ring(r.x, r.y, 10, R.radius, 0.3, '200,180,150'); kick(0.03, 8);
      if (dist(r, G.P) < R.radius + G.P.r) hurtPlayer(dmg, r);
      return false;
    });
  }
}
