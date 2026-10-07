// Building a floor's live state from data. Rendering, HUD, toast and music react to the 'floorLoaded' event.
import { G, type Mob, type Floor } from './state.ts';
import { GATE } from './constants.ts';
import { MOBS } from '../data/mobs.ts';
import { BOSSES, BOSS_DEFAULTS, BOSS_RULES } from '../data/bosses.ts';
import { FLOORS, TREE_TYPES } from '../data/floors.ts';
import { PLAYER } from '../data/player.ts';
import { clock } from '../core/app.ts';
import { emit } from '../core/events.ts';
import { settings, type Suspend } from '../core/save.ts';

// A floor with its mob/boss ids swapped for the actual stat objects (fails loudly on a typo'd id)
function floorData(i: number): Floor {
  const f = FLOORS[i], mob = MOBS[f.mob], ranged = MOBS[f.ranged], boss = BOSSES[f.boss];
  if (!mob || !ranged || !boss) throw new Error(`${f.name}: unknown mob "${f.mob}"/"${f.ranged}" or boss "${f.boss}"`);
  return { ...f, mob, ranged, boss: { ...BOSS_DEFAULTS, ...boss } };
}
export const isLastFloor = () => G.floorIdx >= FLOORS.length - 1;

export function makeMob(x: number, y: number, summoned = false, M = G.F!.mob): Mob {
  return { x, y, sx: x, sy: y, wx: x, wy: y, r: M.radius, hp: M.hp, maxHp: M.hp, cd: 0, dead: 0, hurt: 0, face: 0,
           side: 0, sideDir: 1, wind: 0, lunge: 0, kx: 0, ky: 0, summoned, def: M };
}

export function loadFloor(i: number) {
  G.floorIdx = i; const F = G.F = floorData(i);
  G.WALLS = [...GATE, ...F.trees.map(([x, y, k]) => { const h = TREE_TYPES[k].hit; return { x: x + h[0], y: y + h[1], w: h[2], h: h[3] }; })];
  G.mobs = [...F.spawns.map(([x, y]) => makeMob(x, y)), ...F.rangedSpawns.map(([x, y]) => makeMob(x, y, false, F.ranged))];
  G.boss = { x: 1760, y: 600, z: 0, r: F.boss.r, hp: F.boss.hp, lag: F.boss.hp, maxHp: F.boss.hp, awake: false, cd: BOSS_RULES.firstMoveDelay,
             act: null, t: 0, tMax: 1, ang: 0, hurt: 0, hitP: false, summoned: false };
  Object.assign(G.P, { x: 200, y: 600, hp: G.P.maxHp, lag: G.P.maxHp, dash: 0, delay: 0, trail: [], kx: 0, ky: 0, inv: 0, buf: null });
  G.texts = []; G.parts = []; G.shots = []; G.rings = []; G.doorClosed = false; G.portal = null; clock.hitStop = 0; G.shake = 0;
  if (G.run) G.run.floor = Math.max(G.run.floor, i + 1);
  emit('floorLoaded', i);
}

function newPlayer() {
  // position/HP/transient fields are (re)set by loadFloor
  G.P = { r: PLAYER.radius, maxHp: PLAYER.hp, hp: PLAYER.hp, lag: PLAYER.hp, atk: PLAYER.atk, lv: 1, xp: 0, ang: 0, atkCd: 0, skillCd: 0,
          hurt: 0, swing: 0, swingDir: 1, hitSet: null, x: 0, y: 0, dash: 0, delay: 0, trail: [], kx: 0, ky: 0, inv: 0, buf: null,
          up: {}, pendingUpgrades: 0 };
}
export const assistOn = () => settings.assistDamage < 1 || settings.assistSpeed < 1;

export function newRun() {
  newPlayer();
  G.run = { floor: 1, kills: 0, time: 0, assisted: assistOn() };
  loadFloor(0);
}

// Suspend save: the character and run progress. Resuming starts the saved floor from town (full HP),
// since mid-fight state (mob positions, boss phase) isn't stored.
export function snapshotRun(): Suspend {
  const { P, run } = G;
  return { floorIdx: G.floorIdx, player: { lv: P!.lv, xp: P!.xp, maxHp: P!.maxHp, atk: P!.atk, up: { ...P!.up }, pendingUpgrades: P!.pendingUpgrades },
           run: { floor: run!.floor, kills: run!.kills, time: run!.time, assisted: !!run!.assisted } };
}
export function resumeRun(s: Suspend) {
  newPlayer(); Object.assign(G.P!, s.player, { up: { ...s.player.up } });
  G.run = { ...s.run };
  loadFloor(s.floorIdx);
}
