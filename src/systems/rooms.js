// Rooms: waves, clearing, rewards and the doors to the next floor (round 1: battle rooms).
// A room spawns its waves one by one; when the last one dies it pays the reward its door promised and opens
// the doors for the next floor (see data/run.ts for the door table).
import { G } from '../world/state.ts';
import { planWaves, rollDoors, rewardValue, kindOf, stepOf, actOf, ACT_LEN } from '../data/run.ts';
import { MOBS } from '../data/mobs.ts';
import { SHOP } from '../data/shop.ts';
import { makeMob, scaled, loadFloor } from '../world/floor.ts';
import { hitWall } from '../world/physics.ts';
import { rng } from '../core/rng.ts';
import { emit } from '../core/events.ts';
import { ring } from './fx.js';
import { gainXp, gainCol } from './combat.js';

const WAVE_GAP = 0.8; // seconds between a wave dying and the next one appearing

export function startRoom(i, room) {
  return { ...room, waves: planWaves(G.run?.seed ?? 0, i), wave: -1, next: WAVE_GAP, cleared: false };
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
  for (const { id, n } of wave) {
    const M = scaled(MOBS[id]);
    for (let k = 0; k < n; k++) {
      const p = spawnPoint(M.radius), m = makeMob(p.x, p.y, false, M);
      m.aggro = true; G.mobs.push(m); ring(p.x, p.y, 5, 50, 0.4, '255,120,120');
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
  if (!R || R.cleared || G.mobs.some(m => m.hp > 0)) return;
  if ((R.next -= dt) > 0) return;
  if (R.wave + 1 < R.waves.length) { R.wave++; spawnWave(R.waves[R.wave]); R.next = WAVE_GAP; return; }
  R.cleared = true;
  payReward(R.reward);
  const i = G.floorIdx, last = stepOf(i) === ACT_LEN - 2; // the room right before the boss
  G.doors = makeDoors(last ? [null] : rollDoors(G.run.seed, i));
  emit('roomCleared');
}

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
