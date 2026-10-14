// Ambient life (spec "A3"): creatures per act, birds that scatter, grass that leans. Cosmetic only.
import { describe, it, expect } from 'vitest';
import { G, startRun } from './harness.ts';
import { loadFloor } from '../src/world/floor.ts';
import { emit, on } from '../src/core/events.ts';
import { updateAmbient, MAX_AMBIENT } from '../src/systems/ambient.js';

const kinds = () => new Set(G.ambient!.critters.map(c => c.kind));

describe('themed critters', () => {
  it('each act gets its own creatures', () => {
    startRun(1);
    loadFloor(1, { type: 'battle', reward: 'gold' }); expect(kinds().has('butterfly')).toBe(true);
    loadFloor(6, { type: 'battle', reward: 'gold' }); expect(kinds().has('leaf') || kinds().has('grasshopper')).toBe(true);
    loadFloor(11, { type: 'battle', reward: 'gold' }); expect(kinds().has('firefly')).toBe(true);
    for (const i of [16, 17, 18]) { // bubbles and spray only where there is water; Canalis always keeps its gull
      loadFloor(i, { type: 'battle', reward: 'gold' });
      expect(kinds().has('bubble')).toBe(G.ponds.length > 0); expect(kinds().has('spray')).toBe(G.ponds.length > 0); expect(kinds().has('gull')).toBe(true);
    }
    loadFloor(0); expect(kinds().has('butterfly') || kinds().has('smoke')).toBe(true);
  });
  it('never more than 24 ambient things, and boss floors have no birds', () => {
    startRun(1);
    for (const i of [0, 1, 4, 6, 9, 11, 14, 16, 19]) {
      loadFloor(i, i % 5 === 0 || i % 5 === 4 ? undefined : { type: 'battle', reward: 'gold' });
      expect(G.ambient!.critters.length + G.ambient!.birds.length).toBeLessThanOrEqual(MAX_AMBIENT);
      if (i % 5 === 4) { expect(G.ambient!.birds).toHaveLength(0); expect(kinds().has('gull')).toBe(false); }
    }
  });
  it('critters move over time and stay inside the floor', () => {
    startRun(1); loadFloor(1, { type: 'battle', reward: 'gold' });
    const before = G.ambient!.critters.map(c => [c.x, c.y]);
    for (let i = 0; i < 120; i++) updateAmbient(1 / 60);
    expect(G.ambient!.critters.some((c, k) => c.x !== before[k][0] || c.y !== before[k][1])).toBe(true);
    for (const c of G.ambient!.critters) { expect(c.x).toBeGreaterThanOrEqual(-40); expect(c.x).toBeLessThanOrEqual(G.L!.w + 40); }
  });
});

describe('birds', () => {
  it('perch on open ground, then fly off when the player comes within 110 px', () => {
    startRun(1); loadFloor(1, { type: 'battle', reward: 'gold' });
    const B = G.ambient!.birds; expect(B.length).toBeGreaterThanOrEqual(3);
    const b = B[0]; G.P!.x = b.x + 300; G.P!.y = b.y;
    for (let i = 0; i < 30; i++) updateAmbient(1 / 60);
    expect(b.flying).toBe(false);
    G.P!.x = b.x + 90; updateAmbient(1 / 60);
    expect(b.flying).toBe(true);
    for (let i = 0; i < 60 * 6; i++) updateAmbient(1 / 60);
    expect(G.ambient!.birds.includes(b)).toBe(false);
  });
  it('a mob dying nearby scatters the flock', () => {
    startRun(1); loadFloor(1, { type: 'battle', reward: 'gold' });
    const b = G.ambient!.birds[0]; G.P!.x = b.x + 600; G.P!.y = b.y;
    emit('mobDeath', { x: b.x + 150, y: b.y });
    updateAmbient(1 / 60);
    expect(b.flying).toBe(true);
  });
  it('a townsperson walking up to a perched flock sends it off', () => {
    startRun(1); loadFloor(0);
    const b = G.ambient!.birds[0]; G.P!.x = b.x + 600; G.P!.y = b.y;
    G.npc.folk = [{ x: b.x + 250, y: b.y } as any]; updateAmbient(1 / 60); expect(b.flying).toBe(false);
    G.npc.folk[0].x = b.x + 20; updateAmbient(1 / 60); expect(b.flying).toBe(true);
  });
  it('no birds on boss floors', () => {
    startRun(1); loadFloor(4); expect(G.ambient!.birds).toHaveLength(0);
  });
  it('every flock has 3-5 birds across many loads', () => {
    startRun(1);
    for (let n = 0; n < 30; n++) {
      loadFloor(1 + (n % 3), { type: 'battle', reward: 'gold' });
      const by = new Map<number, number>(); for (const b of G.ambient!.birds) by.set(b.flock, (by.get(b.flock) ?? 0) + 1);
      expect(by.size).toBeGreaterThan(0);
      for (const c of by.values()) { expect(c).toBeGreaterThanOrEqual(3); expect(c).toBeLessThanOrEqual(5); }
    }
  });
  it('the whole flock takes off together, with one birdsFlee, on a diagonal', () => {
    startRun(1); loadFloor(1, { type: 'battle', reward: 'gold' });
    let fled = 0; on('birdsFlee', () => fled++);
    const f0 = G.ambient!.birds[0].flock, mates = G.ambient!.birds.filter(b => b.flock === f0);
    G.P!.x = mates[0].x + 600; G.P!.y = mates[0].y;
    emit('mobDeath', { x: mates[0].x, y: mates[0].y }); updateAmbient(1 / 60);
    expect(mates.every(b => b.flying)).toBe(true);
    const flocksUp = new Set(G.ambient!.birds.filter(b => b.flying).map(b => b.flock)).size; expect(fled).toBe(flocksUp); // the player may happen to be near the other flock too
    for (const b of mates) { expect(Math.abs(b.vx)).toBeGreaterThanOrEqual(90); expect(b.vy).toBeLessThan(0); }
    emit('mobDeath', { x: mates[0].x, y: mates[0].y }); expect(fled).toBe(flocksUp);
  });
});

describe('grass tufts', () => {
  it('room floors have 10-20 tufts; towns and boss rooms have none', () => {
    startRun(1);
    loadFloor(1, { type: 'battle', reward: 'gold' }); expect(G.ambient!.tufts.length).toBeGreaterThanOrEqual(10); expect(G.ambient!.tufts.length).toBeLessThanOrEqual(20);
    loadFloor(0); expect(G.ambient!.tufts).toHaveLength(0);
    loadFloor(4); expect(G.ambient!.tufts).toHaveLength(0);
  });
  it('a tuft leans away from the player walking through it, then springs back to rest', () => {
    startRun(1); loadFloor(1, { type: 'battle', reward: 'gold' });
    const t = G.ambient!.tufts[0];
    G.P!.x = t.x - 10; G.P!.y = t.y; updateAmbient(1 / 60); updateAmbient(1 / 60);
    expect(t.lean).toBeGreaterThan(0);
    G.P!.x = t.x - 400; for (let i = 0; i < 60 * 3; i++) updateAmbient(1 / 60);
    expect(Math.abs(t.lean)).toBeLessThan(0.02); expect(t.awake).toBe(false);
  });
  it('a sword swing nearby flicks tufts', () => {
    startRun(1); loadFloor(1, { type: 'battle', reward: 'gold' });
    const t = G.ambient!.tufts[0]; G.P!.x = t.x - 60; G.P!.y = t.y; G.P!.ang = 0;
    emit('swing'); updateAmbient(1 / 60);
    expect(Math.abs(t.vel) + Math.abs(t.lean)).toBeGreaterThan(0.05);
  });
  it('always 10-20 tufts, none in ponds', () => {
    startRun(1);
    for (let i = 0; i < 30; i++) {
      loadFloor(1 + (i % 3), { type: 'battle', reward: 'gold' }); const n = G.ambient!.tufts.length;
      expect(n).toBeGreaterThanOrEqual(10); expect(n).toBeLessThanOrEqual(20);
      for (const t of G.ambient!.tufts) expect(G.ponds.some(p => t.x > p.x && t.x < p.x + p.w && t.y > p.y && t.y < p.y + p.h)).toBe(false);
    }
  });
  it('no tuft sits under a tree canopy', () => {
    startRun(1);
    for (let i = 0; i < 12; i++) {
      loadFloor(1 + (i % 3), { type: 'battle', reward: 'gold' });
      for (const t of G.ambient!.tufts) for (const tr of G.trees) expect(Math.hypot(t.x - tr[0], t.y - tr[1])).toBeGreaterThanOrEqual(100);
    }
  });
  it('a tuft 200 px away is not flicked', () => {
    startRun(1); loadFloor(1, { type: 'battle', reward: 'gold' });
    const t = G.ambient!.tufts[0]; G.P!.x = t.x - 200; G.P!.y = t.y; G.P!.ang = 0;
    emit('swing'); updateAmbient(1 / 60);
    expect(t.vel).toBe(0); expect(t.awake).toBe(false);
  });
});
