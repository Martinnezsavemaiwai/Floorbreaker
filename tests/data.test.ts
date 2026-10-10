// Content sanity: every act's data resolves, story beats exist, each floor kind lays out playably.
import { describe, it, expect, beforeAll } from 'vitest';
import { G, startRun } from './harness.ts';
import { loadFloor } from '../src/world/floor.ts';
import { hitWall } from '../src/world/physics.ts';
import { FLOORS } from '../src/data/floors.ts';
import { MOVES } from '../src/data/bosses.ts';
import { STORY } from '../src/data/story.ts';
import { ACT_LEN } from '../src/data/run.ts';

describe.each(FLOORS.map((f, a) => [f.town, a] as const))('act %s', (_town, a) => {
  beforeAll(() => startRun(1));

  it('mob and boss ids resolve to stats, with a ranged mob in the ranged slot', () => {
    loadFloor(a * ACT_LEN);
    expect(G.F!.mob.hp).toBeGreaterThan(0);
    expect(G.F!.ranged.ranged).toBeDefined();
    expect(G.F!.boss.hp).toBeGreaterThan(0);
    for (const mv of [...G.F!.boss.moves, ...G.F!.boss.rageMoves]) expect(MOVES[mv], mv).toBeDefined();
  });

  it('has a story beat with non-empty lines', () => {
    expect(STORY['floor' + a]?.length).toBeGreaterThan(0);
    for (const l of STORY['floor' + a]) expect(l.who && l.text).toBeTruthy();
  });

  it('town: start, merchant and exit door are reachable (not in walls)', () => {
    loadFloor(a * ACT_LEN);
    expect(hitWall({ ...G.L.start, r: 14 })).toBe(false);
    expect(hitWall({ ...G.L.merchant!, r: 14 })).toBe(false);
    expect(G.doors).toHaveLength(1);
  });

  it('boss floor: the boss stands in its room behind a gate with an open gap', () => {
    loadFloor(a * ACT_LEN + 4);
    expect(G.boss!.hp).toBeGreaterThan(0);
    expect(G.boss!.x).toBeGreaterThan(G.L.roomX);
    expect(hitWall({ x: G.L.roomX + 20, y: G.L.h / 2, r: 14 })).toBe(false); // the doorway
    expect(hitWall({ x: G.L.roomX + 20, y: 40, r: 14 })).toBe(true);         // the wall
  });
});
