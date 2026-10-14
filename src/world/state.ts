// The live game state, shared by systems, rendering and UI. One plain object instead of module-level `let`s,
// because ES module bindings can't be reassigned from other files.
import { BOSS_RULES, type ArenaId, type MoveName, type ResolvedBoss } from '../data/bosses.ts';
import type { MobStats } from '../data/mobs.ts';
import type { FloorDef, TreeType } from '../data/floors.ts';
import type { Point, Rect } from '../core/math.ts';
import type { Layout } from './layout.ts';
import type { Room, WaveMob, EliteMod, ShrineId } from '../data/run.ts';
import type { Suspend } from '../core/save.ts';
import type { Text } from '../core/i18n.ts';
import type { ElementId } from '../data/elements.ts';

export interface Player extends Point {
  r: number; hp: number; maxHp: number; lag: number; atk: number; lv: number; xp: number;
  ang: number; atkCd: number; hurt: number; inv: number;
  skills: [string, string | null, string | null]; skillCd: [number, number, number]; // slot 1 = Gale Rush, slots 2-3 from elite rooms
  parry: number; slowmo: number; spin: number; thrust: number; thrustAng: number; beam: number; // Riposte stance / evolved slow-mo, Cyclone Edge spin / Piercing Fang wind-up and beam timers
  spin2: number; fangLine: number; fangBeam: number; fangX: number; fangY: number; galeCharges: number; galeT: number; // Maelstrom second turn, Rending Fang blast, Twin Gale charges
  swing: number; swingDir: number; dash: number; delay: number; moving?: boolean;
  kx: number; ky: number; hitSet: Set<Mob | Boss> | null; trail: (Point & { t: number; col?: string })[];
  shadeChain: number; shadeLast: Mob | Boss | null; dashArt: string | null;
  buf: { kind: 'attack' | 'skill'; slot?: number; t: number } | null;
  up: Record<string, number>; pendingUpgrades: number; // upgrade counts by id; picks waiting to be chosen
  combo: number; comboT: number; finisher: boolean; roll: number; rollCd: number; rollAng: number; // sword chain step, dodge roll
  mods: Record<string, ElementId[]>; evolved: string[]; // element mods per Art id ('blade' = the sword) and evolved Art ids
  stormHits: number; // Art hits counted for the Storm set bonus
  modOrder: ElementId[]; glow: number; // elements in the order first gained (breaks dominant-element ties); evolved-Art afterglow timer
  col: number; potions: number; scrolls: number;       // money, potions carried, Skill Scrolls bought (sets their price)
  modBuys: number; // element mods bought this run (sets their price)
}
export interface Mob extends Point {
  sx: number; sy: number; wx: number; wy: number; r: number; hp: number; maxHp: number;
  cd: number; dead: number; hurt: number; face: number; side: number; sideDir: number;
  wind: number; lunge: number; kx: number; ky: number; summoned: boolean; def: MobStats; anim?: any; // anim: render-side scratch (render/anim)
  armorT: number; // > 0 while an armored mob's guard is broken
  burn?: { dps: number; t: number; stacks: number }; poison?: { dps: number; t: number }; slowT?: number; slowK?: number;
  frozen?: number; tide?: { n: number; t: number }; dotAcc?: number; dotTick?: number; elite?: boolean; mod?: EliteMod; sinceHit?: number;
  aggro?: boolean; // room mobs chase from anywhere
  sprout?: boolean; life?: number; // Elderroot's root sprouts: no AI, no rewards, wither after `life` s
}
export interface Shot extends Point { vx: number; vy: number; r: number; dmg: number; col: string; life: number }
export interface Wave extends Point { vx: number; vy: number; left: number; dmg: number; art: string; hit: Set<object>; r: number }
export interface Boss extends Point {
  z: number; r: number; hp: number; maxHp: number; lag: number; awake: boolean; cd: number;
  act: MoveName | 'dash' | 'wave' | null; t: number; tMax: number; ang: number; hurt: number;
  hitP: boolean; summoned: boolean; stun?: number; // stun: seconds left after charging into a pillar
  from?: Point; to?: Point; spots?: Point[]; waveR?: number; angs?: number[];
  burn?: { dps: number; t: number; stacks: number }; poison?: { dps: number; t: number }; slowT?: number; slowK?: number;
  frozen?: number; tide?: { n: number; t: number }; dotAcc?: number; dotTick?: number;
}
export type Floor = Omit<FloorDef, 'mob' | 'boss' | 'ranged'> & { mob: MobStats; ranged: MobStats; boss: ResolvedBoss };
export interface Run { curse?: number; floor: number; kills: number; time: number; seed: number; bosses: number; assisted?: boolean; over?: 'dead' | 'win' }
export interface RoomState extends Room { waves: WaveMob[][]; wave: number; next: number; cleared: boolean; healed?: boolean; shrineUsed?: boolean; offers?: ShrineId[]; challenge?: { left: number; hits: number; spawnT: number; failed?: boolean } }
export interface FolkState { x: number; y: number; r: number; sheet: string; face: number; target: Point | null; wait: number; moving: boolean; said: boolean; bubble: MerchantState['bubble']; still: number }
export interface MerchantState { face: number; waved: boolean; wave: number; bubble: { text: Text; t: number; wrap?: { key: string; lines: string[]; w: number } } | null; quiet: number; greeted: boolean; age: number }
export interface Critter { kind: string; x: number; y: number; vx: number; vy: number; t: number; phase: number; air: boolean; ax?: number; ay?: number; z?: number; col?: number; life?: number; per?: number; wait?: number }
export interface Bird { x: number; y: number; hx: number; hy: number; vx: number; vy: number; z: number; flying: boolean; peck: number; flock: number }
export interface Tuft { x: number; y: number; blades: number; lean: number; vel: number; awake: boolean }
export interface Door extends Rect { to: Room | null; armed: boolean } // to = null: the fixed exit (first room, boss, next town)

export interface FloatText extends Point { s: string; col: string; big?: boolean; t: number }
export interface Particle extends Point { vx: number; vy: number; life: number; t: number; col: string; size: number; rot: number; vr: number; shard?: boolean }
export interface Ring extends Point { r0: number; r1: number; life: number; t: number; col: string }

// wait: seconds until it opens; armed: the player has stood outside it since it appeared (no instant pull-through)
export interface Portal extends Point { wait: number; armed: boolean }

export type Pillar = Rect & { hits: number };
export type Arena = { id: ArenaId; rocks: { x: number; y: number; t: number }[]; pillars: Pillar[]; vision: number; flood?: { t: number; warn: number; on: number; tick: number } } & Record<string, unknown>;

export const G = {
  P: null as Player | null,   // null on the title screen
  mobs: [] as Mob[], boss: null as Boss | null, shots: [] as Shot[], waves: [] as Wave[],
  texts: [] as FloatText[], parts: [] as Particle[], rings: [] as Ring[], bolts: [] as { x1: number; y1: number; x2: number; y2: number; t: number }[],
  arena: null as Arena | null, doorClosed: false, portal: null as Portal | null,
  floorIdx: 0, F: null as Floor | null, WALLS: [] as Rect[],
  L: null as Layout | null, room: null as RoomState | null, doors: [] as Door[], trees: [] as [number, number, TreeType][], ponds: [] as Rect[],
  npc: {} as { merchant?: MerchantState; folk?: FolkState[] }, // render/cosmetic talk state, rebuilt per floor, never saved
  ambient: { critters: [], birds: [], tufts: [] } as { critters: Critter[]; birds: Bird[]; tufts: Tuft[] }, // cosmetic life, rebuilt per floor, never saved
  run: null as Run | null, cursed: false, // cursed: enemies on this floor are stronger (laid by a shrine)
  rewards: [] as ('art' | 'evolve' | 'mod')[], // non-level picks waiting for the player (elite Art, boss shard, bought mod)
  entry: null as Suspend | null, // snapshot taken as the current floor loaded: what a suspend writes (Continue restarts the floor)
  cam: { x: 0, y: 0 },
  shake: 0, time: 0, introT: 0,
};

export const rage = () => G.boss.hp < G.boss.maxHp * BOSS_RULES.rageAt;
export const bossDmg = (k: MoveName) => Math.round(G.F.boss.dmg[k] * (rage() ? BOSS_RULES.rageDmgMult : 1));
