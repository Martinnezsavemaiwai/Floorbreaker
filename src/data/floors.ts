// Floor layouts and looks. `mob` / `boss` are ids into mobs.ts / bosses.ts — a typo is a compile error.
// trees: [x, y, type] top-left of the drawn sprite; spawns: [x, y] mob spawn points.
import type { MobId } from './mobs.ts';
import type { BossId } from './bosses.ts';

// Trees from village.png: sprite source rect, draw scale, and the solid box (relative to the drawn sprite)
export const TREE_TYPES = {
  big: { src: [0, 96, 64, 48], s: 2, hit: [20, 30, 88, 56] },
  small: { src: [64, 96, 32, 32], s: 2.5, hit: [14, 22, 52, 50] },
} satisfies Record<string, { src: [number, number, number, number]; s: number; hit: [number, number, number, number] }>;
export type TreeType = keyof typeof TREE_TYPES;

export interface FloorDef {
  name: string; town: string;
  grass: 0 | 11;                 // column offset of the palette in floor.png
  roomTint: string | null; fieldTint?: string; fog?: boolean; torch: string;
  mob: MobId; boss: BossId;
  trees: [number, number, TreeType][];
  spawns: [number, number][];
}

export const FLOORS: FloorDef[] = [
  {
    name: 'Floor 1', town: 'Town of Beginnings', grass: 0, roomTint: null, torch: '255,150,60',
    mob: 'frenzyBoar', boss: 'koboldLord',
    trees: [[660, 220, 'big'], [930, 780, 'big'], [1200, 380, 'small'], [800, 420, 'small'], [560, 860, 'small'], [1320, 720, 'small'], [1100, 1020, 'big']],
    spawns: [[600, 200], [650, 900], [900, 450], [1050, 250], [1100, 700], [1300, 950], [1350, 200], [800, 1050]],
  },
  {
    name: 'Floor 2', town: 'Urbus', grass: 11, roomTint: 'rgba(70,0,110,.3)', torch: '150,110,255',
    mob: 'taurusSoldier', boss: 'asterius',
    trees: [[520, 120, 'big'], [760, 300, 'small'], [980, 140, 'big'], [1250, 260, 'small'], [640, 760, 'big'], [880, 920, 'small'],
            [1150, 800, 'big'], [1340, 1000, 'small'], [480, 1000, 'small'], [1080, 420, 'small']],
    spawns: [[650, 250], [900, 300], [1150, 200], [700, 450], [1300, 450], [600, 880], [1000, 720], [1250, 700], [1000, 1050]],
  },
  {
    name: 'Floor 3', town: 'Zumfut', grass: 0, roomTint: 'rgba(0,60,30,.3)', fieldTint: 'rgba(10,20,45,.35)', fog: true, torch: '120,255,150',
    mob: 'darkElf', boss: 'nerius',
    trees: [[460, 60, 'big'], [700, 180, 'small'], [880, 60, 'big'], [1120, 200, 'small'], [1300, 80, 'small'], [520, 330, 'small'],
            [980, 360, 'big'], [1260, 380, 'small'], [460, 700, 'big'], [720, 800, 'small'], [900, 700, 'small'], [1100, 760, 'big'],
            [1340, 820, 'small'], [560, 980, 'small'], [820, 1020, 'big'], [1240, 1040, 'small']],
    spawns: [[640, 120], [1020, 120], [800, 300], [1180, 320], [650, 470], [1150, 480], [620, 880], [1000, 900], [1300, 700], [1000, 1100]],
  },
];
