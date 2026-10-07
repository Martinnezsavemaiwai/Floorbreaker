// Building a floor's live state from data. Rendering, HUD, toast and music react to the 'floorLoaded' event.
import { G } from './state.js';
import { GATE } from './constants.js';
import { MOBS } from '../data/mobs.js';
import { BOSSES, BOSS_DEFAULTS, BOSS_RULES } from '../data/bosses.js';
import { FLOORS, TREE_TYPES } from '../data/floors.js';
import { PLAYER } from '../data/player.js';
import { clock } from '../core/app.js';
import { emit } from '../core/events.js';

// A floor with its mob/boss ids swapped for the actual stat objects (fails loudly on a typo'd id)
function floorData(i) {
  const f = FLOORS[i], mob = MOBS[f.mob], boss = BOSSES[f.boss];
  if (!mob || !boss) throw new Error(`${f.name}: unknown mob "${f.mob}" or boss "${f.boss}"`);
  return { ...f, mob, boss: { ...BOSS_DEFAULTS, ...boss } };
}
export const isLastFloor = () => G.floorIdx >= FLOORS.length - 1;

export function makeMob(x, y, summoned = false) {
  const M = G.F.mob;
  return { x, y, sx: x, sy: y, wx: x, wy: y, r: M.radius, hp: M.hp, maxHp: M.hp, cd: 0, dead: 0, hurt: 0, face: 0,
           side: 0, sideDir: 1, wind: 0, lunge: 0, kx: 0, ky: 0, summoned };
}

export function loadFloor(i) {
  G.floorIdx = i; const F = G.F = floorData(i);
  G.WALLS = [...GATE, ...F.trees.map(([x, y, k]) => { const h = TREE_TYPES[k].hit; return { x: x + h[0], y: y + h[1], w: h[2], h: h[3] }; })];
  G.mobs = F.spawns.map(([x, y]) => makeMob(x, y));
  G.boss = { x: 1760, y: 600, z: 0, r: F.boss.r, hp: F.boss.hp, lag: F.boss.hp, maxHp: F.boss.hp, awake: false, cd: BOSS_RULES.firstMoveDelay,
             act: null, t: 0, tMax: 1, ang: 0, hurt: 0, hitP: false, summoned: false };
  Object.assign(G.P, { x: 200, y: 600, hp: G.P.maxHp, lag: G.P.maxHp, dash: 0, delay: 0, trail: [], kx: 0, ky: 0, inv: 0, buf: null });
  G.texts = []; G.parts = []; G.rings = []; G.doorClosed = false; G.portal = null; clock.hitStop = 0; G.shake = 0;
  if (G.run) G.run.floor = Math.max(G.run.floor, i + 1);
  emit('floorLoaded', i);
}

export function newRun() {
  G.P = { r: PLAYER.radius, maxHp: PLAYER.hp, atk: PLAYER.atk, lv: 1, xp: 0, ang: 0, atkCd: 0, skillCd: 0, hurt: 0, swing: 0, swingDir: 1, hitSet: null };
  G.run = { floor: 1, kills: 0, time: 0 };
  loadFloor(0);
}
