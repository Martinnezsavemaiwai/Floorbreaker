// Floor bosses and their attack moves. Floors reference bosses by id (see floors.ts).
import type { Text } from '../core/i18n.ts';
export type MoveName = 'slam' | 'charge' | 'leap' | 'roots' | 'quake' | 'volley';
type Pair = [normal: number, rage: number];

export const BOSS_RULES = {
  rageAt: 0.5,       // rage phase below this fraction of max HP
  rageDmgMult: 1.25,
  xpMult: 6,         // boss XP (and Gold) = floor mob XP (Gold) * xpMult
  firstMoveDelay: 2,
  portalDelay: 1.2,  // seconds before the portal a boss leaves behind can be entered
};

// Defaults every boss gets unless it overrides them. speed/cd are [normal, rage].
export const BOSS_DEFAULTS = { r: 40, bars: 4, speed: [65, 95] as Pair };

// Move timings: wind = telegraph seconds [normal, rage]; sizes in world px.
export const MOVES = {
  slam: { wind: [0.9, 0.6], radius: 130 },
  charge: { wind: [0.9, 0.6], length: 340, dashTime: 0.45, speed: 760 },
  leap: { wind: [1, 0.8], radius: 110, height: 160 },
  roots: { wind: [0.95, 0.75], radius: 60, extraSpots: [4, 8] }, // one spike under the player + extra random ones
  quake: { wind: [0.9, 0.9], startR: 40, speed: 380, maxR: 520, width: 22 },
  volley: { wind: [0.8, 0.6], count: [12, 16], speed: 260, shotR: 10, range: 650 }, // a ring of shots with gaps to slip through
} satisfies Record<MoveName, { wind: Pair; [k: string]: unknown }>;

export type ArenaId = 'rockfall' | 'pillars' | 'fog' | 'flood';

export interface BossStats {
  name: string; epithet: Text; hint: Text; img: string; rageImg: string; hp: number; cd: Pair;
  scale?: number; tree?: boolean; summon?: number;
  r?: number; bars?: number; speed?: Pair;           // override BOSS_DEFAULTS
  moves: MoveName[]; rageMoves: MoveName[]; arena: ArenaId; // arena: the room's own hazard (see systems/arena.js)
  dmg: Partial<Record<MoveName, number>>;
}

export const BOSSES = {
  houndfangLord: {
    name: 'Grask the Houndfang Warlord', epithet: { th: 'ผู้คุมหุบเขาหินถล่ม', en: 'Keeper of the Falling Stone' }, hint: { th: 'ดูเงาบนพื้น หินจะตกตรงนั้น', en: 'Watch the shadows on the floor. Rocks land there.' }, img: 'boss1', rageImg: 'boss1Rage', hp: 750, scale: 9, cd: [1.8, 1.1], arena: 'rockfall',
    moves: ['slam', 'charge'], rageMoves: ['slam', 'charge', 'leap'], dmg: { slam: 30, charge: 24, leap: 34, quake: 0 },
  },
  asterius: {
    name: 'Bullgard the Horned King', epithet: { th: 'ราชาเขาโค ผู้พังเสา', en: 'Breaker of Pillars' }, hint: { th: 'ล่อให้มันพุ่งชนเสา แล้วมันจะมึน', en: 'Bait its charge into a pillar to stun it.' }, img: 'boss2', rageImg: 'boss2Rage', hp: 1800, scale: 10, cd: [1.6, 1.0], summon: 2, arena: 'pillars',
    moves: ['slam', 'charge', 'quake'], rageMoves: ['slam', 'charge', 'leap', 'quake'], dmg: { slam: 40, charge: 34, leap: 40, quake: 30 },
  },
  // The treant is a big tree sprite instead of a character sheet: slow, no charge/leap, roots erupt under you
  nerius: {
    name: 'Elderroot the Blighted', epithet: { th: 'ต้นไม้เน่าที่กลืนแสง', en: 'The Rot That Eats the Light' }, hint: { th: 'ตีรากที่งอกขึ้นมาเพื่อให้มองเห็นกว้างขึ้น', en: 'Cut the sprouting roots to push the dark back.' }, tree: true, img: 'treant', rageImg: 'treantRage', hp: 3200, bars: 5, r: 70, speed: [35, 50], cd: [1.5, 0.9], summon: 3, arena: 'fog',
    moves: ['slam', 'roots', 'quake'], rageMoves: ['roots', 'roots', 'quake', 'slam'], dmg: { slam: 55, roots: 45, quake: 40 },
  },
  // Floor 4: a water beast that fills the room with rings of water shots
  wythege: {
    name: 'Marisca the Tide Mare', epithet: { th: 'นางม้าแห่งกระแสน้ำ', en: 'Mare of the Rising Tide' }, hint: { th: 'น้ำจะท่วม ขึ้นไปยืนบนแท่นหิน', en: 'When the water rises, stand on a stone platform.' }, img: 'boss4', rageImg: 'boss4Rage', hp: 5600, bars: 5, scale: 11, cd: [1.5, 0.9], summon: 2, arena: 'flood',
    moves: ['charge', 'volley', 'slam'], rageMoves: ['volley', 'charge', 'leap', 'quake', 'volley'],
    dmg: { slam: 66, charge: 56, leap: 66, quake: 50, volley: 40 },
  },
} satisfies Record<string, BossStats>;

// Boss arena hazards: warn = seconds of shadow before it hurts; radius/spread in world px; dmgMult scales the boss's slam damage
// pillars: size = square side, hits = charges that break one, stun = seconds the boss is dazed, stunDmg = damage multiplier while dazed
export const ARENA = {
  rockfall: { rocks: 3, warn: 0.8, radius: 50, dmgMult: 0.6, spread: 60 },
  fog: { start: 520, min: 150, shrink: 14, restore: 140, sproutLife: 6 },
  flood: { every: 12, everyLate: 7, lateAt: 0.25, warn: 1.5, last: 4, tick: 0.5, dmg: 0.08, platforms: [[640, 220], [640, 680], [1180, 450]] as [number, number][], platR: 64 },
  pillars: { at: [[640, 240], [640, 660], [1160, 240], [1160, 660]] as [number, number][], size: 56, hits: 2, stun: 2, stunDmg: 1.5 },
};

export type BossId = keyof typeof BOSSES;
// What a floor actually gets: boss stats with the defaults filled in
export type ResolvedBoss = BossStats & typeof BOSS_DEFAULTS;
