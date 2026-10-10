// Building a floor's live state from data. Rendering, HUD, toast and music react to the 'floorLoaded' event.
import { G, type Mob, type Floor } from './state.ts';
import { layoutFor, fountainHit } from './layout.ts';
import { MOBS, type MobStats } from '../data/mobs.ts';
import { BOSSES, BOSS_DEFAULTS, BOSS_RULES } from '../data/bosses.ts';
import { FLOORS, TREE_TYPES } from '../data/floors.ts';
import { PLAYER } from '../data/player.ts';
import { SKILLS } from '../data/skills.ts';
import { FLOOR_COUNT, actOf, kindOf, mobScale, pickPreset, ROOM_PRESETS, type Room } from '../data/run.ts';
import { clock } from '../core/app.ts';
import { emit } from '../core/events.ts';
import { rng } from '../core/rng.ts';
import { tr } from '../core/i18n.ts';
import { settings, meta, type Suspend } from '../core/save.ts';
import { startRoom, makeDoors } from '../systems/rooms.js';

// An act's data with its mob/boss ids swapped for the actual stat objects (fails loudly on a typo'd id)
function actData(a: number): Floor {
  const f = FLOORS[a], mob = MOBS[f.mob], ranged = MOBS[f.ranged], boss = BOSSES[f.boss];
  if (!mob || !ranged || !boss) throw new Error(`${f.town}: unknown mob "${f.mob}"/"${f.ranged}" or boss "${f.boss}"`);
  return { ...f, mob, ranged, boss: { ...BOSS_DEFAULTS, ...boss } };
}
export const floorLabel = (i: number) => tr(`ชั้น ${i + 1}/${FLOOR_COUNT}`, `Floor ${i + 1}/${FLOOR_COUNT}`);

// Mob stats scaled for the floor (+8% HP and damage per floor inside an act)
export const scaled = (M: MobStats, i = G.floorIdx): MobStats => {
  const k = mobScale(i);
  return k === 1 ? M : { ...M, hp: Math.round(M.hp * k), dmg: Math.round(M.dmg * k) };
};
export function makeMob(x: number, y: number, summoned = false, M = G.F!.mob): Mob {
  return { x, y, sx: x, sy: y, wx: x, wy: y, r: M.radius, armorT: 0, hp: M.hp, maxHp: M.hp, cd: 0, dead: 0, hurt: 0, face: 0,
           side: 0, sideDir: 1, wind: 0, lunge: 0, kx: 0, ky: 0, summoned, def: M };
}

// Build floor i. `room` is the door the player chose (room floors only); null falls back to a battle room.
export function loadFloor(i: number, room: Room | null = null) {
  G.floorIdx = i; const act = actOf(i), kind = kindOf(i), F = G.F = actData(act), L = G.L = layoutFor(kind);
  const preset = kind === 'room' ? ROOM_PRESETS[pickPreset(G.run?.seed ?? 0, i)] : null;
  G.trees = (preset?.trees ?? []).map(([x, y, k]) => [x, y, act === 2 && k === 'big' ? 'dark' : k]);
  G.ponds = preset?.ponds ?? [];
  G.WALLS = [...L.gate, ...(L.fountain ? [fountainHit(L.fountain)] : []),
    ...G.trees.map(([x, y, k]) => { const h = TREE_TYPES[k].hit; return { x: x + h[0], y: y + h[1], w: h[2], h: h[3] }; }), ...G.ponds];
  G.mobs = []; G.doors = [];
  G.room = kind === 'room' ? startRoom(i, room ?? { type: 'battle', reward: 'xp' }) : null;
  if (kind === 'town') G.doors = makeDoors([{ type: 'battle', reward: 'xp' }]);
  // every floor has a boss object (systems read it); off boss floors it is a sleeping 0-HP placeholder
  const at = L.bossAt ?? { x: -999, y: -999 }, bhp = kind === 'boss' ? F.boss.hp : 0;
  G.boss = { x: at.x, y: at.y, z: 0, r: F.boss.r, hp: bhp, lag: bhp, maxHp: F.boss.hp, awake: false, cd: BOSS_RULES.firstMoveDelay,
             act: null, t: 0, tMax: 1, ang: 0, hurt: 0, hitP: false, summoned: false };
  const hp = kind === 'town' ? G.P!.maxHp : G.P!.hp; // only towns heal you fully
  Object.assign(G.P, { x: L.start.x, y: L.start.y, hp, lag: hp, dash: 0, delay: 0, trail: [], kx: 0, ky: 0, inv: 0, buf: null });
  G.texts = []; G.parts = []; G.shots = []; G.rings = []; G.doorClosed = false; G.portal = null; clock.hitStop = 0; G.shake = 0;
  if (G.run) G.run.floor = Math.max(G.run.floor, i + 1);
  G.entry = snapshotRun();
  emit('floorLoaded', i);
}

// slot 2 only takes a real, non-Sonic-Leap skill id (a hand-edited save can't crash the run)
const slot2 = (id: string | null | undefined) => (id && id in SKILLS && id !== 'sonicLeap' ? id : null);
function newPlayer() {
  // position/HP/transient fields are (re)set by loadFloor
  G.P = { r: PLAYER.radius, maxHp: PLAYER.hp, hp: PLAYER.hp, lag: PLAYER.hp, atk: PLAYER.atk, lv: 1, xp: 0, ang: 0, atkCd: 0,
          skills: ['sonicLeap', slot2(meta.loadout)], skillCd: [0, 0], spin: 0, thrust: 0, thrustAng: 0, beam: 0,
          hurt: 0, swing: 0, swingDir: 1, hitSet: null, x: 0, y: 0, dash: 0, delay: 0, trail: [], kx: 0, ky: 0, inv: 0, buf: null,
          up: {}, pendingUpgrades: 0, col: 0, potions: 0, scrolls: 0,
          combo: 0, comboT: 0, finisher: false, roll: 0, rollCd: 0, rollAng: 0 };
}
export const assistOn = () => settings.assistDamage < 1 || settings.assistSpeed < 1;

export function newRun() {
  newPlayer();
  G.run = { floor: 1, kills: 0, time: 0, seed: Math.floor(rng() * 2 ** 31), bosses: 0, assisted: assistOn() };
  loadFloor(0);
}

// Floor-entry snapshot (G.entry): the character, run progress and the room you were in. Resuming restarts that floor
// from its start (waves and doors re-roll identically from the run seed), so nothing earned on it is stored.
export function snapshotRun(): Suspend {
  const { P, run } = G;
  return { floorIdx: G.floorIdx, room: G.room ? { type: G.room.type, reward: G.room.reward } : null,
    player: { lv: P!.lv, xp: P!.xp, hp: P!.hp, maxHp: P!.maxHp, atk: P!.atk, up: { ...P!.up }, pendingUpgrades: P!.pendingUpgrades,
      skill2: P!.skills[1], col: P!.col, potions: P!.potions, scrolls: P!.scrolls },
    run: { floor: run!.floor, kills: run!.kills, time: run!.time, assisted: !!run!.assisted, seed: run!.seed, bosses: run!.bosses } };
}
export function resumeRun(s: Suspend) {
  newPlayer(); const { skill2, hp, ...player } = s.player;
  Object.assign(G.P!, player, { up: { ...s.player.up }, skills: ['sonicLeap', slot2(skill2)] });
  if (hp !== undefined) G.P!.hp = Math.min(hp, G.P!.maxHp); // the HP saved at floor entry (a town heals to full in loadFloor)
  G.run = { ...s.run };
  loadFloor(s.floorIdx, s.room as Room | null); // cast: tsconfig isn't strict, so zod drops null from the inferred type
}
