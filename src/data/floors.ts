// One entry per act: its look, mobs and boss (room layouts live in run.ts). `mob` / `boss` are ids into mobs.ts / bosses.ts — a typo is a compile error.
import type { MobId } from './mobs.ts';
import type { BossId } from './bosses.ts';

// Tree sprites (drawn 1:1) and their solid box [x, y, w, h] relative to the sprite's top-left: the trunk and
// the lower canopy, so you can walk "behind" the top of a tree
export const TREE_TYPES = {
  big: { img: 'tree-big', hit: [24, 52, 80, 60] },     // 128x123
  dark: { img: 'tree-dark', hit: [24, 48, 80, 56] },   // 128x115, Mistwell's (act 3) rooms
  small: { img: 'tree-small', hit: [14, 26, 50, 46] }, // 77x80
} satisfies Record<string, { img: string; hit: [number, number, number, number] }>;
export type TreeType = keyof typeof TREE_TYPES;

export interface FloorDef {
  town: string;
  ground: 1 | 2 | 3 | 4;         // field texture: ground-<n>.png
  roomTint: string | null; fog?: boolean; torch: string;
  mob: MobId; boss: BossId; ranged: MobId;
  extras: { mob: MobId; group?: number }[]; // the act's swarm/armored mob for a room's last wave; `group` spawns that many
}

export const FLOORS: FloorDef[] = [
  {
    town: 'Firstlight', ground: 1, roomTint: null, torch: '255,150,60',
    mob: 'frenzyBoar', boss: 'houndfangLord', ranged: 'houndfangSlinger',
    extras: [{ mob: 'piglet', group: 4 }],
  },
  {
    town: 'Hornfield', ground: 2, roomTint: 'rgba(70,0,110,.3)', torch: '150,110,255',
    mob: 'taurusSoldier', boss: 'asterius', ranged: 'taurusJavelineer',
    extras: [{ mob: 'taurusGuardian' }],
  },
  {
    town: 'Mistwell', ground: 3, roomTint: 'rgba(0,60,30,.3)', fog: true, torch: '120,255,150',
    mob: 'darkElf', boss: 'nerius', ranged: 'darkElfMage',
    extras: [{ mob: 'elfKnight' }, { mob: 'shadowPiglet', group: 4 }],
  },
  {
    town: 'Canalis', ground: 4, roomTint: 'rgba(0,60,120,.3)', torch: '90,200,255',
    mob: 'tidalBoar', boss: 'wythege', ranged: 'waterWraith',
    extras: [{ mob: 'tideGuardian' }, { mob: 'crabling', group: 4 }],
  },
];
