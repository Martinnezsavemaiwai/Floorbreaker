// The live game state, shared by systems, rendering and UI. One plain object instead of module-level `let`s,
// because ES module bindings can't be reassigned from other files.
import { BOSS_RULES, type MoveName, type ResolvedBoss } from '../data/bosses.ts';
import type { MobStats } from '../data/mobs.ts';
import type { FloorDef, TreeType } from '../data/floors.ts';
import type { Point, Rect } from '../core/math.ts';
import type { Layout } from './layout.ts';
import type { Room, WaveMob, EliteMod, ShrineId } from '../data/run.ts';
import type { Suspend } from '../core/save.ts';
import type { ElementId } from '../data/elements.ts';

export interface Player extends Point {
  r: number; hp: number; maxHp: number; lag: number; atk: number; lv: number; xp: number;
  ang: number; atkCd: number; hurt: number; inv: number;
  skills: [string, string | null, string | null]; skillCd: [number, number, number]; // slot 1 = Gale Rush, slots 2-3 from elite rooms
  spin: number; thrust: number; thrustAng: number; beam: number;     // Cyclone Edge / Piercing Fang animation timers
  swing: number; swingDir: number; dash: number; delay: number; moving?: boolean;
  kx: number; ky: number; hitSet: Set<Mob | Boss> | null; trail: (Point & { t: number })[];
  buf: { kind: 'attack' | 'skill'; slot?: number; t: number } | null;
  up: Record<string, number>; pendingUpgrades: number; // upgrade counts by id; picks waiting to be chosen
  combo: number; comboT: number; finisher: boolean; roll: number; rollCd: number; rollAng: number; // sword chain step, dodge roll
  mods: Record<string, ElementId[]>; evolved: string[]; // element mods per Art id ('blade' = the sword) and evolved Art ids
  stormHits: number; // Art hits counted for the Storm set bonus
  col: number; potions: number; scrolls: number;       // money, potions carried, Skill Scrolls bought (sets their price)
  modBuys: number; // element mods bought this run (sets their price)
}
export interface Mob extends Point {
  sx: number; sy: number; wx: number; wy: number; r: number; hp: number; maxHp: number;
  cd: number; dead: number; hurt: number; face: number; side: number; sideDir: number;
  wind: number; lunge: number; kx: number; ky: number; summoned: boolean; def: MobStats;
  armorT: number; // > 0 while an armored mob's guard is broken
  burn?: { dps: number; t: number; stacks: number }; poison?: { dps: number; t: number }; slowT?: number; slowK?: number;
  frozen?: number; tide?: { n: number; t: number }; dotAcc?: number; dotTick?: number; elite?: boolean; mod?: EliteMod; sinceHit?: number;
  aggro?: boolean; // room mobs chase from anywhere
}
export interface Shot extends Point { vx: number; vy: number; r: number; dmg: number; col: string; life: number }
export interface Boss extends Point {
  z: number; r: number; hp: number; maxHp: number; lag: number; awake: boolean; cd: number;
  act: MoveName | 'dash' | 'wave' | null; t: number; tMax: number; ang: number; hurt: number;
  hitP: boolean; summoned: boolean;
  from?: Point; to?: Point; spots?: Point[]; waveR?: number; angs?: number[];
  burn?: { dps: number; t: number; stacks: number }; poison?: { dps: number; t: number }; slowT?: number; slowK?: number;
  frozen?: number; tide?: { n: number; t: number }; dotAcc?: number; dotTick?: number;
}
export type Floor = Omit<FloorDef, 'mob' | 'boss' | 'ranged'> & { mob: MobStats; ranged: MobStats; boss: ResolvedBoss };
export interface Run { curse?: number; floor: number; kills: number; time: number; seed: number; bosses: number; assisted?: boolean; over?: 'dead' | 'win' }
export interface RoomState extends Room { waves: WaveMob[][]; wave: number; next: number; cleared: boolean; healed?: boolean; shrineUsed?: boolean; offers?: ShrineId[]; challenge?: { left: number; hits: number; spawnT: number; failed?: boolean } }
export interface Door extends Rect { to: Room | null; armed: boolean } // to = null: the fixed exit (first room, boss, next town)

export interface FloatText extends Point { s: string; col: string; big?: boolean; t: number }
export interface Particle extends Point { vx: number; vy: number; life: number; t: number; col: string; size: number; rot: number; vr: number; shard?: boolean }
export interface Ring extends Point { r0: number; r1: number; life: number; t: number; col: string }

// wait: seconds until it opens; armed: the player has stood outside it since it appeared (no instant pull-through)
export interface Portal extends Point { wait: number; armed: boolean }

export const G = {
  P: null as Player | null,   // null on the title screen
  mobs: [] as Mob[], boss: null as Boss | null, shots: [] as Shot[],
  texts: [] as FloatText[], parts: [] as Particle[], rings: [] as Ring[], bolts: [] as { x1: number; y1: number; x2: number; y2: number; t: number }[],
  doorClosed: false, portal: null as Portal | null,
  floorIdx: 0, F: null as Floor | null, WALLS: [] as Rect[],
  L: null as Layout | null, room: null as RoomState | null, doors: [] as Door[], trees: [] as [number, number, TreeType][], ponds: [] as Rect[],
  run: null as Run | null, cursed: false, // cursed: enemies on this floor are stronger (laid by a shrine)
  rewards: [] as ('art' | 'evolve' | 'mod')[], // non-level picks waiting for the player (elite Art, boss shard, bought mod)
  entry: null as Suspend | null, // snapshot taken as the current floor loaded: what a suspend writes (Continue restarts the floor)
  cam: { x: 0, y: 0 },
  shake: 0, time: 0, introT: 0,
};

export const rage = () => G.boss.hp < G.boss.maxHp * BOSS_RULES.rageAt;
