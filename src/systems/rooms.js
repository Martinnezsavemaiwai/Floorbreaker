// Rooms: waves, clearing, rewards and the doors to the next floor (round 1: battle rooms).
// A room spawns its waves one by one; when the last one dies it pays the reward its door promised and opens
// the doors for the next floor (see data/run.ts for the door table).
import { G } from '../world/state.ts';
import { planWaves, planElite, rollShrine, ELITE, ROOM_RULES, ELITE_RULES, rollDoors, rewardValue, kindOf, stepOf, actOf, ACT_LEN } from '../data/run.ts';
import { MOBS } from '../data/mobs.ts';
import { SHOP } from '../data/shop.ts';
import { makeMob, scaled, loadFloor } from '../world/floor.ts';
import { hitWall } from '../world/physics.ts';
import { rng } from '../core/rng.ts';
import { emit, on } from '../core/events.ts';
import { dist } from '../core/math.ts';
import { ring, text, burst } from './fx.js';
import { gainXp, gainCol } from './combat.js';

const WAVE_GAP = 0.8; // seconds between a wave dying and the next one appearing

export function startRoom(i, room) {
  const seed = G.run?.seed ?? 0, base = { ...room, wave: -1, next: WAVE_GAP, cleared: false };
  if (room.type === 'elite') return { ...base, waves: planElite(seed, i) };
  if (room.type === 'challenge') return { ...base, waves: planWaves(seed, i), challenge: { left: ROOM_RULES.challengeTime, hits: 0, spawnT: 0 } };
  if (room.type === 'battle') return { ...base, waves: planWaves(seed, i) };
  if (room.type === 'shrine') return { ...base, waves: [], next: 0, offers: rollShrine(seed, i) };
  return { ...base, waves: [], next: 0 }; // spring, shop: no fight, the doors open right away
}

// Door rects on the right wall, top to bottom; `to` = what the next floor will be (null = the fixed exit)
export function makeDoors(rooms) {
  const ys = rooms.length === 1 ? [400] : rooms.length === 2 ? [260, 540] : [180, 400, 620];
  return rooms.map((to, k) => ({ x: G.L.w - 70, y: ys[k] - 55, w: 60, h: 110, to, armed: false })); // armed once the player has stood outside it (no pull-through on spawn)
}

function spawnPoint(r) {
  const { L, P } = G;
  for (let tries = 0; tries < 40; tries++) {
    const p = { x: 80 + rng() * (L.w - 240), y: 80 + rng() * (L.h - 160), r };
    if (Math.hypot(p.x - P.x, p.y - P.y) >= 260 && !hitWall(p)) return p;
  }
  return { x: L.w - 300, y: L.h / 2, r }; // open floor near the door wall, which every preset keeps clear
}

function spawnWave(wave) {
  for (const { id, n, elite, mod } of wave) {
    const base = scaled(MOBS[id]);
    let M = base;
    if (elite) {
      M = { ...base, hp: Math.round(base.hp * ELITE.hp), dmg: Math.round(base.dmg * ELITE.dmg),
        radius: Math.round(base.radius * ELITE.radius), scale: (base.scale ?? 1) * ELITE.scale };
      if (mod === 'fast') M = { ...M, speed: Math.round(M.speed * ELITE_RULES.fast), wanderSpeed: Math.round(M.wanderSpeed * ELITE_RULES.fast) };
      if (mod === 'shield') M = { ...M, armor: { regen: ELITE_RULES.shieldRegen }, knockback: { ...M.knockback, light: 0 } };
    }
    for (let k = 0; k < n; k++) {
      const p = spawnPoint(M.radius), m = makeMob(p.x, p.y, false, M);
      m.elite = !!elite; m.mod = elite ? mod : undefined; m.sinceHit = 0; m.aggro = true; G.mobs.push(m); ring(p.x, p.y, 5, 50, 0.4, '255,120,120');
    }
  }
}

function payReward(reward) {
  const { P } = G, act = actOf(G.floorIdx);
  if (reward === 'gold') gainCol(rewardValue('gold', act), P);
  else if (reward === 'xp') gainXp(rewardValue('xp', act));
  else if (reward === 'potion') { if (P.potions < SHOP.potion.max) P.potions++; else gainCol(SHOP.potion.price(), P); }
}

export function updateRoom(dt) {
  const R = G.room;
  if (!R) return;
  if (R.type === 'spring' && !R.healed && G.L.fountain && dist(G.P, G.L.fountain) < ROOM_RULES.springReach) {
    R.healed = true; const heal = Math.round(G.P.maxHp * ROOM_RULES.springHeal);
    G.P.hp = Math.min(G.P.maxHp, G.P.hp + heal); text(G.P.x, G.P.y - 30, '+' + heal, '#7dff8a', true); burst(G.P.x, G.P.y, 20, '#7dff8a', 180, 0.7, 4, false);
  }
  if (R.cleared) return;
  if (R.challenge) return updateChallenge(R, dt);
  if (G.mobs.some(m => m.hp > 0)) return;
  if ((R.next -= dt) > 0) return;
  if (R.wave + 1 < R.waves.length) { R.wave++; spawnWave(R.waves[R.wave]); R.next = WAVE_GAP; return; }
  finish(R, 1);
}

// Challenge: a wave every few seconds for 30 s; at the end the leftovers vanish and the reward pays x2 (or nothing past 3 hits)
function updateChallenge(R, dt) {
  const C = R.challenge;
  C.left -= dt; C.spawnT -= dt;
  if (C.left > 0) {
    if (C.spawnT <= 0) { spawnWave(R.waves[(++R.wave) % R.waves.length]); C.spawnT = ROOM_RULES.challengeEvery; }
    return;
  }
  for (const m of G.mobs) if (m.hp > 0) { m.hp = 0; m.dead = Infinity; burst(m.x, m.y, 12, '#8fe3ff', 200, 0.6, 6, true); }
  G.shots.length = 0; // no shot may land after the verdict
  C.failed = C.hits > ROOM_RULES.challengeHits;
  emit('challengeOver', !C.failed);
  finish(R, C.failed ? 0 : 2);
}

function finish(R, times) {
  R.cleared = true;
  for (let k = 0; k < times; k++) payReward(R.reward);
  if (R.type === 'elite') G.rewards.push('art');
  const i = G.floorIdx, last = stepOf(i) === ACT_LEN - 2; // the room right before the boss
  G.doors = makeDoors(last ? [null] : rollDoors(G.run.seed, i));
  emit('roomCleared');
}
on('playerHurt', () => { const C = G.room?.challenge; if (C && !G.room.cleared) C.hits++; });

// Walking into a door takes you to the next floor. Returns true when a new floor was loaded this step.
export function updateDoors() {
  const { P } = G;
  for (const d of G.doors) {
    const inside = P.x > d.x - P.r && P.x < d.x + d.w + P.r && P.y > d.y && P.y < d.y + d.h;
    if (!inside) d.armed = true;
    else if (d.armed) {
      const next = G.floorIdx + 1;
      loadFloor(next, kindOf(next) === 'room' ? d.to : null);
      return true;
    }
  }
  return false;
}
