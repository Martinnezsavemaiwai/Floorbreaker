// Content sanity: every floor loads, nothing spawns inside trees, the road and boss door stay open.
import { describe, it, expect, beforeAll } from 'vitest';
import { G, startRun } from './harness.ts';
import { loadFloor } from '../src/world/floor.ts';
import { hitWall } from '../src/world/physics.ts';
import { overlaps } from '../src/core/math.ts';
import { TOWN_X, ROOM_X, DOOR } from '../src/world/constants.ts';
import { FLOORS } from '../src/data/floors.ts';
import { MOVES } from '../src/data/bosses.ts';

describe.each(FLOORS.map((f, i) => [f.name, i] as const))('%s', (_name, i) => {
  beforeAll(() => { startRun(1); loadFloor(i); });

  it('mob and boss ids resolve to stats', () => {
    expect(G.F!.mob.hp).toBeGreaterThan(0);
    expect(G.F!.boss.hp).toBeGreaterThan(0);
  });

  it('every boss move has timing data', () => {
    for (const mv of [...G.F!.boss.moves, ...G.F!.boss.rageMoves]) expect(MOVES[mv], mv).toBeDefined();
  });

  it('no mob spawns inside a tree', () => {
    for (const m of G.mobs) expect(hitWall(m), `spawn ${m.x},${m.y}`).toBe(false);
  });

  it('the road from town to the boss door is clear of trees', () => {
    const road = { x: TOWN_X, y: 560, w: ROOM_X - TOWN_X, h: 80 };
    const trees = G.WALLS.filter(w => w.x < ROOM_X); // gate walls sit at ROOM_X
    for (const t of trees) expect(overlaps(t, road), JSON.stringify(t)).toBe(false);
  });

  it('the boss door gap lines up with the road', () => {
    expect(DOOR.y).toBeLessThanOrEqual(560);
    expect(DOOR.y + DOOR.h).toBeGreaterThanOrEqual(640);
  });
});
