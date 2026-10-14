// Geometry of the three floor kinds. The town and rooms are one open space; the boss floor is an antechamber,
// a gate with a doorway (shut while the boss is awake) and the boss room behind it.
import type { Point, Rect } from '../core/math.ts';
import type { FloorKind } from '../data/run.ts';

export interface Layout {
  kind: FloorKind; w: number; h: number;
  townX: number;   // x < townX is the safe zone (HP regen, mobs stay out): the whole town, nowhere else
  roomX: number;   // x > roomX is the boss room (the boss wakes past roomX + 60); = w on floors without one
  gate: Rect[]; door: Rect | null; fountain: Point | null; merchant: Point | null; shrine?: Point;
  torches: [number, number][]; start: Point; bossAt: Point | null;
  props?: Prop[];       // scenery; every solid one is also pushed into G.WALLS by loadFloor
  folkPoints?: Point[]; // plaza spots clear of props where townsfolk wander
}
// rect = the solid base / footprint; tall props are pre-rendered and y-sorted with the actors, the rest are baked into the floor
export interface Prop { kind: string; x: number; y: number; w: number; h: number; solid: boolean; tall?: boolean }
const prop = (kind: string, x: number, y: number, w: number, h: number, solid = true, tall = false): Prop => ({ kind, x, y, w, h, solid, tall });

// The town's dressing; the Merchant stands at (860, 340) in front of the stall, so nothing sits south of it
const TOWN_PROPS: Prop[] = [
  prop('house', 40, 0, 220, 150), prop('house', 330, 0, 220, 150), prop('house', 650, 0, 220, 150), prop('house', 940, 0, 220, 150),
  prop('stall', 800, 250, 120, 56, true, true),
  prop('barrel', 768, 264, 26, 26), prop('barrel', 926, 264, 26, 26),
  prop('bench', 420, 500, 60, 18), prop('bench', 760, 500, 60, 18),
  prop('lamp', 330, 310, 12, 12, true, true), prop('lamp', 880, 560, 12, 12, true, true),
  prop('board', 250, 210, 50, 14, true, true),
  prop('planter', 360, 380, 30, 20, false), prop('planter', 500, 220, 30, 20, false), prop('planter', 700, 640, 30, 20, false), prop('planter', 1000, 250, 30, 20, false),
];
const ACT_PROPS: Prop[][] = [
  [prop('planter', 180, 520, 30, 20, false), prop('planter', 560, 520, 30, 20, false), prop('planter', 960, 400, 30, 20, false)],
  [prop('hay', 1000, 520, 44, 30), prop('hay', 250, 600, 44, 30)],
  [prop('lanterns', 40, 150, 220, 20, false), prop('lanterns', 650, 150, 220, 20, false), prop('moss', 150, 560, 70, 40, false), prop('moss', 900, 620, 80, 44, false), prop('moss', 520, 440, 60, 36, false)],
  [prop('crate', 1000, 200, 30, 30), prop('crate', 1032, 200, 30, 30), prop('mooring', 150, 620, 14, 14), prop('mooring', 1050, 680, 14, 14)],
];
export const townPropsFor = (act: number): Prop[] => [...TOWN_PROPS, ...(ACT_PROPS[act] ?? [])].map(p => ({ ...p }));
// The wandering shop's cart sits behind the Merchant at ROOM_POINT (600, 400); crates and sacks flank it
export const cartProps = (): Prop[] => [prop('cart', 545, 322, 110, 50, true, true), prop('crate', 506, 336, 28, 28), prop('sacks', 664, 344, 30, 22)];
const FOLK_POINTS: Point[] = [{ x: 200, y: 300 }, { x: 400, y: 410 }, { x: 520, y: 580 }, { x: 700, y: 430 }, { x: 1000, y: 320 }, { x: 1000, y: 620 }, { x: 300, y: 660 }, { x: 700, y: 700 }];

// The fountain sprite's solid basin, relative to the sprite centre (the jet above it is walk-behind)
export const fountainHit = (p: Point): Rect => ({ x: p.x - 56, y: p.y - 38, w: 116, h: 80 });

export function layoutFor(kind: FloorKind): Layout {
  if (kind === 'town') return { kind, w: 1200, h: 800, townX: 1200, roomX: 1200, gate: [], door: null,
    fountain: { x: 600, y: 300 }, merchant: { x: 860, y: 340 }, torches: [], start: { x: 150, y: 400 }, bossAt: null, folkPoints: FOLK_POINTS };
  if (kind === 'room') return { kind, w: 1200, h: 800, townX: 0, roomX: 1200, gate: [], door: null,
    fountain: null, merchant: null, torches: [], start: { x: 150, y: 400 }, bossAt: null };
  const w = 1400, h = 900, roomX = 400, gap = 60;
  return { kind, w, h, townX: 0, roomX,
    gate: [{ x: roomX, y: 0, w: 40, h: h / 2 - gap }, { x: roomX, y: h / 2 + gap, w: 40, h: h / 2 - gap }],
    door: { x: roomX, y: h / 2 - gap, w: 40, h: gap * 2 },
    fountain: null, merchant: null,
    torches: [[roomX + 70, 80], [roomX + 70, h - 80], [w - 40, 80], [w - 40, h - 80], [roomX + 70, h / 2 - 130], [roomX + 70, h / 2 + 130]],
    start: { x: 150, y: h / 2 }, bossAt: { x: roomX + 520, y: h / 2 } };
}
