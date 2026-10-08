// Floor bosses and their attack moves. Floors reference bosses by id (see floors.ts).
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

export interface BossStats {
  name: string; img: string; rageImg: string; hp: number; cd: Pair;
  scale?: number; tree?: boolean; summon?: number;
  r?: number; bars?: number; speed?: Pair;           // override BOSS_DEFAULTS
  moves: MoveName[]; rageMoves: MoveName[];
  dmg: Partial<Record<MoveName, number>>;
}

export const BOSSES = {
  houndfangLord: {
    name: 'Grask the Houndfang Warlord', img: 'boss1', rageImg: 'boss1Rage', hp: 900, scale: 9, cd: [1.8, 1.1],
    moves: ['slam', 'charge'], rageMoves: ['slam', 'charge', 'leap'], dmg: { slam: 30, charge: 24, leap: 34, quake: 0 },
  },
  asterius: {
    name: 'Bullgard the Horned King', img: 'boss2', rageImg: 'boss2Rage', hp: 1800, scale: 10, cd: [1.6, 1.0], summon: 2,
    moves: ['slam', 'charge', 'quake'], rageMoves: ['slam', 'charge', 'leap', 'quake'], dmg: { slam: 40, charge: 34, leap: 40, quake: 30 },
  },
  // The treant is a big tree sprite instead of a character sheet: slow, no charge/leap, roots erupt under you
  nerius: {
    name: 'Elderroot the Blighted', tree: true, img: 'treant', rageImg: 'treantRage', hp: 3200, bars: 5, r: 70, speed: [35, 50], cd: [1.5, 0.9], summon: 3,
    moves: ['slam', 'roots', 'quake'], rageMoves: ['roots', 'roots', 'quake', 'slam'], dmg: { slam: 55, roots: 45, quake: 40 },
  },
  // Floor 4: a water beast that fills the room with rings of water shots
  wythege: {
    name: 'Marisca the Tide Mare', img: 'boss4', rageImg: 'boss4Rage', hp: 5600, bars: 5, scale: 11, cd: [1.5, 0.9], summon: 2,
    moves: ['charge', 'volley', 'slam'], rageMoves: ['volley', 'charge', 'leap', 'quake', 'volley'],
    dmg: { slam: 66, charge: 56, leap: 66, quake: 50, volley: 40 },
  },
} satisfies Record<string, BossStats>;

export type BossId = keyof typeof BOSSES;
// What a floor actually gets: boss stats with the defaults filled in
export type ResolvedBoss = BossStats & typeof BOSS_DEFAULTS;
