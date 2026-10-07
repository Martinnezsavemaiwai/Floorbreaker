// The live game state, shared by systems, rendering and UI. One plain object instead of module-level `let`s,
// because ES module bindings can't be reassigned from other files.
import { BOSS_RULES, type MoveName, type ResolvedBoss } from '../data/bosses.ts';
import type { MobStats } from '../data/mobs.ts';
import type { FloorDef } from '../data/floors.ts';
import type { Point, Rect } from '../core/math.ts';

export interface Player extends Point {
  r: number; hp: number; maxHp: number; lag: number; atk: number; lv: number; xp: number;
  ang: number; atkCd: number; hurt: number; inv: number;
  skills: [string, string | null]; skillCd: [number, number]; // equipped Sword Skill ids (slot 1 = Sonic Leap) and their cooldowns
  spin: number; thrust: number; thrustAng: number; beam: number;     // Horizontal Square / Vorpal Strike animation timers
  swing: number; swingDir: number; dash: number; delay: number; moving?: boolean;
  kx: number; ky: number; hitSet: Set<Mob | Boss> | null; trail: (Point & { t: number })[];
  buf: { kind: 'attack' | 'skill'; slot?: number; t: number } | null;
  up: Record<string, number>; pendingUpgrades: number; // upgrade counts by id; picks waiting to be chosen
  combo: number; comboT: number; finisher: boolean; roll: number; rollCd: number; rollAng: number; // sword chain step, dodge roll
  col: number; potions: number; scrolls: number;       // money, potions carried, Skill Scrolls bought (sets their price)
}
export interface Mob extends Point {
  sx: number; sy: number; wx: number; wy: number; r: number; hp: number; maxHp: number;
  cd: number; dead: number; hurt: number; face: number; side: number; sideDir: number;
  wind: number; lunge: number; kx: number; ky: number; summoned: boolean; def: MobStats;
}
export interface Shot extends Point { vx: number; vy: number; r: number; dmg: number; col: string; life: number }
export interface Boss extends Point {
  z: number; r: number; hp: number; maxHp: number; lag: number; awake: boolean; cd: number;
  act: MoveName | 'dash' | 'wave' | null; t: number; tMax: number; ang: number; hurt: number;
  hitP: boolean; summoned: boolean;
  from?: Point; to?: Point; spots?: Point[]; waveR?: number; angs?: number[];
}
export type Floor = Omit<FloorDef, 'mob' | 'boss' | 'ranged'> & { mob: MobStats; ranged: MobStats; boss: ResolvedBoss };
export interface Run { floor: number; kills: number; time: number; assisted?: boolean; over?: 'dead' | 'win' }
export interface FloatText extends Point { s: string; col: string; big?: boolean; t: number }
export interface Particle extends Point { vx: number; vy: number; life: number; t: number; col: string; size: number; rot: number; vr: number; shard?: boolean }
export interface Ring extends Point { r0: number; r1: number; life: number; t: number; col: string }

export const G = {
  P: null as Player | null,   // null on the title screen
  mobs: [] as Mob[], boss: null as Boss | null, shots: [] as Shot[],
  texts: [] as FloatText[], parts: [] as Particle[], rings: [] as Ring[],
  doorClosed: false, portal: null as Point | null,
  floorIdx: 0, F: null as Floor | null, WALLS: [] as Rect[],
  run: null as Run | null,
  cam: { x: 0, y: 0 },
  shake: 0, time: 0, introT: 0,
};

export const rage = () => G.boss.hp < G.boss.maxHp * BOSS_RULES.rageAt;
