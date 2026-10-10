// Run rules: floor kinds, door rolls, wave plans, presets and the shards formula. Pure data, no DOM.
import { describe, it, expect } from 'vitest';
import { FLOOR_COUNT, actOf, stepOf, kindOf, isFinalFloor, mobScale, rollDoors, planWaves, ROOM_PRESETS, pickPreset,
         START_ZONE, DOOR_ZONE, CENTER_ZONE, shardsFor, rewardValue } from '../src/data/run.ts';
import { TREE_TYPES } from '../src/data/floors.ts';
import { MOBS } from '../src/data/mobs.ts';
import { overlaps } from '../src/core/math.ts';

describe('floor kinds', () => {
  it('20 floors: town, 3 rooms, boss per act', () => {
    expect(FLOOR_COUNT).toBe(20);
    const kinds = Array.from({ length: FLOOR_COUNT }, (_, i) => kindOf(i)).join(',');
    expect(kinds).toBe(Array(4).fill('town,room,room,room,boss').join(','));
    expect([4, 9, 14, 19].map(kindOf)).toEqual(['boss', 'boss', 'boss', 'boss']);
    expect(actOf(0)).toBe(0); expect(actOf(9)).toBe(1); expect(actOf(19)).toBe(3);
    expect(stepOf(12)).toBe(2);
    expect(isFinalFloor(19)).toBe(true); expect(isFinalFloor(14)).toBe(false);
  });

  it('mobs get 8% stronger per floor inside an act', () => {
    expect(mobScale(0)).toBe(1); expect(mobScale(3)).toBeCloseTo(1.24); expect(mobScale(5)).toBe(1);
  });
});

describe('doors', () => {
  it('after a room at step 1 or 2 there are 3 doors with no duplicate (type, reward)', () => {
    for (let seed = 1; seed < 40; seed++) for (const from of [1, 2, 6, 7, 11, 12, 16, 17]) {
      const doors = rollDoors(seed, from);
      expect(doors).toHaveLength(3);
      expect(new Set(doors.map(d => d.type + ':' + d.reward)).size).toBe(3);
    }
  });

  it('same seed and floor give the same doors; another seed differs somewhere', () => {
    expect(rollDoors(7, 2)).toEqual(rollDoors(7, 2));
    const all = (s: number) => JSON.stringify([1, 2, 6, 7].map(f => rollDoors(s, f)));
    expect(all(7)).not.toBe(all(8));
  });

  it('pre-boss doors include spring or shop, and elite if none was offered earlier in the act (when available)', () => {
    const avail = ['battle', 'elite', 'spring', 'shop', 'shrine', 'challenge'] as const;
    for (let seed = 1; seed < 60; seed++) for (const from of [2, 7, 12, 17]) {
      const doors = rollDoors(seed, from, [...avail]);
      expect(doors.some(d => d.type === 'spring' || d.type === 'shop')).toBe(true);
      const earlier = rollDoors(seed, from - 1, [...avail]);
      if (!earlier.some(d => d.type === 'elite')) expect(doors.some(d => d.type === 'elite')).toBe(true);
    }
  });

  it('only battle rooms exist in round 1, told apart by their reward', () => {
    expect(rollDoors(3, 1).every(d => d.type === 'battle' && d.reward !== null)).toBe(true);
  });

  it('rewards grow with the act', () => {
    expect(rewardValue('gold', 3)).toBeGreaterThan(rewardValue('gold', 0));
    expect(rewardValue('potion', 2)).toBe(1);
  });
});

describe('waves', () => {
  it('2 waves on the first room of an act, 3 later; every id is a real mob', () => {
    expect(planWaves(1, 1)).toHaveLength(2);
    expect(planWaves(1, 3)).toHaveLength(3);
    for (const i of [1, 2, 3, 6, 12, 18]) for (const w of planWaves(5, i)) for (const { id, n } of w) {
      expect(MOBS[id], id).toBeDefined(); expect(n).toBeGreaterThan(0);
    }
  });
});

describe('room presets', () => {
  const rects = (p: (typeof ROOM_PRESETS)[number]) => [
    ...p.trees.map(([x, y, k]) => { const h = TREE_TYPES[k].hit; return { x: x + h[0], y: y + h[1], w: h[2], h: h[3] }; }),
    ...(p.ponds ?? []),
  ];
  it('keep the start, centre and door zones clear and stay inside the room', () => {
    ROOM_PRESETS.forEach((p, n) => {
      for (const r of rects(p)) {
        for (const [zone, z] of [['start', START_ZONE], ['door', DOOR_ZONE], ['center', CENTER_ZONE]] as const)
          expect(overlaps(r, z), `preset ${n} blocks the ${zone} zone`).toBe(false);
        expect(r.x >= 0 && r.y >= 0 && r.x + r.w <= 1200 && r.y + r.h <= 800, `preset ${n} out of bounds`).toBe(true);
      }
    });
  });
  it('the preset is picked from the seed', () => {
    expect(pickPreset(4, 2)).toBe(pickPreset(4, 2));
    expect(pickPreset(4, 2)).toBeLessThan(ROOM_PRESETS.length);
  });
});

it('shards: kills/4 + 3 per floor passed + 10 per boss + 20 for a clear', () => {
  expect(shardsFor(40, 2, 0, false)).toBe(16);
  expect(shardsFor(80, 20, 4, true)).toBe(20 + 60 + 40 + 20);
});
