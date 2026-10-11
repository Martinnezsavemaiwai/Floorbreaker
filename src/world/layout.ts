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
}

// The fountain sprite's solid basin, relative to the sprite centre (the jet above it is walk-behind)
export const fountainHit = (p: Point): Rect => ({ x: p.x - 56, y: p.y - 38, w: 116, h: 80 });

export function layoutFor(kind: FloorKind): Layout {
  if (kind === 'town') return { kind, w: 1200, h: 800, townX: 1200, roomX: 1200, gate: [], door: null,
    fountain: { x: 600, y: 300 }, merchant: { x: 660, y: 470 }, torches: [], start: { x: 150, y: 400 }, bossAt: null };
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
