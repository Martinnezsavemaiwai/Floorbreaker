// Floor layouts and looks. `mob` / `boss` are ids into mobs.ts / bosses.ts — a typo is a compile error.
// trees: [x, y, type] top-left of the drawn sprite; ponds: water rects that block like trees; spawns: [x, y] mob spawn points; rangedSpawns: where the `ranged` mob stands.
import type { MobId } from './mobs.ts';
import type { BossId } from './bosses.ts';

// Tree sprites (drawn 1:1) and their solid box [x, y, w, h] relative to the sprite's top-left: the trunk and
// the lower canopy, so you can walk "behind" the top of a tree
export const TREE_TYPES = {
  big: { img: 'tree-big', hit: [24, 52, 80, 60] },     // 128x123
  dark: { img: 'tree-dark', hit: [24, 48, 80, 56] },   // 128x115, floor 3's forest
  small: { img: 'tree-small', hit: [14, 26, 50, 46] }, // 77x80
} satisfies Record<string, { img: string; hit: [number, number, number, number] }>;
export type TreeType = keyof typeof TREE_TYPES;

export interface FloorDef {
  name: string; town: string;
  ground: 1 | 2 | 3 | 4;         // field texture: ground-<n>.png
  roomTint: string | null; fog?: boolean; torch: string;
  mob: MobId; boss: BossId; ranged: MobId;
  trees: [number, number, TreeType][];
  ponds?: { x: number; y: number; w: number; h: number }[];
  spawns: [number, number][];
  rangedSpawns: [number, number][];
  extras?: { mob: MobId; at: [number, number][]; group?: number }[]; // more mob types; `group` spawns that many around each point
}

export const FLOORS: FloorDef[] = [
  {
    name: 'Floor 1', town: 'Firstlight', ground: 1, roomTint: null, torch: '255,150,60',
    mob: 'frenzyBoar', boss: 'houndfangLord', ranged: 'houndfangSlinger',
    trees: [[660, 220, 'big'], [930, 780, 'big'], [1200, 380, 'small'], [800, 420, 'small'], [560, 860, 'small'], [1320, 720, 'small'], [1100, 1020, 'big']],
    spawns: [[600, 200], [650, 900], [900, 450], [1050, 250], [1100, 700], [1300, 950], [1350, 200], [800, 1050]],
    rangedSpawns: [[1000, 560], [1400, 560], [700, 650]],
    extras: [{ mob: 'piglet', at: [[1000, 950], [1250, 250]], group: 4 }],
  },
  {
    name: 'Floor 2', town: 'Hornfield', ground: 2, roomTint: 'rgba(70,0,110,.3)', torch: '150,110,255',
    mob: 'taurusSoldier', boss: 'asterius', ranged: 'taurusJavelineer',
    trees: [[520, 120, 'big'], [760, 300, 'small'], [980, 140, 'big'], [1250, 260, 'small'], [640, 760, 'big'], [880, 920, 'small'],
            [1150, 800, 'big'], [1340, 1000, 'small'], [480, 1000, 'small'], [1080, 420, 'small']],
    spawns: [[650, 250], [900, 300], [1150, 200], [700, 450], [1300, 450], [600, 880], [1000, 720], [1250, 700], [1000, 1050]],
    rangedSpawns: [[850, 600], [1400, 300], [1400, 900]],
    extras: [{ mob: 'taurusGuardian', at: [[1150, 600], [800, 1000]] }],
  },
  {
    name: 'Floor 3', town: 'Mistwell', ground: 3, roomTint: 'rgba(0,60,30,.3)', fog: true, torch: '120,255,150',
    mob: 'darkElf', boss: 'nerius', ranged: 'darkElfMage',
    trees: [[460, 60, 'dark'], [700, 180, 'small'], [880, 60, 'dark'], [1120, 200, 'small'], [1300, 80, 'small'], [520, 330, 'small'],
            [980, 360, 'dark'], [1260, 380, 'small'], [460, 700, 'dark'], [720, 800, 'small'], [900, 700, 'small'], [1100, 760, 'dark'],
            [1340, 820, 'small'], [560, 980, 'small'], [820, 1020, 'dark'], [1240, 1040, 'small']],
    spawns: [[640, 120], [1020, 120], [800, 300], [1180, 320], [650, 470], [1150, 480], [620, 880], [1000, 900], [1300, 700], [1000, 1100]],
    rangedSpawns: [[820, 560], [1400, 560], [600, 1100], [1400, 1120]],
    extras: [{ mob: 'elfKnight', at: [[950, 600], [1300, 950]] }, { mob: 'shadowPiglet', at: [[750, 700]], group: 4 }],
  },
  {
    name: 'Floor 4', town: 'Canalis', ground: 4, roomTint: 'rgba(0,60,120,.3)', torch: '90,200,255',
    mob: 'tidalBoar', boss: 'wythege', ranged: 'waterWraith',
    trees: [[440, 380, 'small'], [880, 360, 'big'], [1300, 420, 'small'], [520, 760, 'small'], [1360, 980, 'small'], [960, 100, 'small']],
    ponds: [{ x: 560, y: 140, w: 220, h: 150 }, { x: 1040, y: 760, w: 260, h: 170 }, { x: 760, y: 880, w: 160, h: 130 }, { x: 1180, y: 180, w: 170, h: 140 }],
    spawns: [[650, 400], [1000, 300], [1250, 350], [700, 700], [950, 680], [1300, 700], [600, 1050], [1100, 1100], [1400, 800]],
    rangedSpawns: [[830, 600], [1200, 600], [480, 600], [1420, 300]],
    extras: [{ mob: 'tideGuardian', at: [[1100, 600], [650, 1000]] }, { mob: 'crabling', at: [[1450, 700], [450, 1100]], group: 4 }],
  },
];
