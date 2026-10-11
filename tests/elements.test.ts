// Elements: what each mod does on hit, the statuses it leaves, and the 3-mod set bonuses.
import { describe, it, expect, beforeEach } from 'vitest';
import { G, startRun, frame, enterRoom, enterBoss } from './harness.ts';
import { makeMob } from '../src/world/floor.ts';
import { MOBS } from '../src/data/mobs.ts';
import { EL } from '../src/data/elements.ts';
import { hurtEnemy } from '../src/systems/combat.js';
import { setActive, speedFactor } from '../src/systems/elements.js';
import { roll } from '../src/systems/index.js';
import { keys } from '../src/core/input.ts';

const frames = (n: number) => { for (let i = 0; i < n; i++) frame(); };
const dummy = (dx = 60, dy = 0, hp = 9999) => {
  const m = makeMob(G.P!.x + dx, G.P!.y + dy, false, { ...MOBS.frenzyBoar, hp, speed: 0, wanderSpeed: 0 }); G.mobs.push(m); return m;
};

describe('element hits', () => {
  beforeEach(() => { startRun(1); enterRoom(1); });

  it('no mods: an Art hit leaves no status', () => {
    const m = dummy(); hurtEnemy(m, 20, false, false, 'blade');
    expect(m.burn).toBeUndefined(); expect(m.poison).toBeUndefined();
  });

  it('Ember burns for 20%/s of the hit over 3 s and stacks to 3', () => {
    G.P!.mods = { blade: ['ember'] };
    const m = dummy();
    for (let i = 0; i < 5; i++) hurtEnemy(m, 50, false, false, 'blade');
    expect(m.burn!.stacks).toBe(EL.ember.stacks);
    const hp = m.hp; frames(60);
    expect(hp - m.hp).toBeGreaterThan(0);
    frames(4 * 60);
    expect(m.burn!.t).toBeLessThanOrEqual(0);
  });

  it('the same element twice on one Art is 1.5x stronger', () => {
    G.P!.mods = { blade: ['ember'] }; const a = dummy(); hurtEnemy(a, 100, false, false, 'blade');
    G.P!.mods = { blade: ['ember', 'ember'] }; const b = dummy(0, 80); hurtEnemy(b, 100, false, false, 'blade');
    expect(b.burn!.dps).toBeCloseTo(a.burn!.dps * EL.double);
  });

  it('Storm chains to 2 other enemies in range for 40%, not to one out of range', () => {
    G.P!.mods = { horizontal: ['storm'] };
    const m = dummy(60, 0), n1 = dummy(120, 0), n2 = dummy(60, 80), far = dummy(60, 400);
    hurtEnemy(m, 100, false, false, 'horizontal');
    expect(9999 - n1.hp).toBe(40); expect(9999 - n2.hp).toBe(40); expect(far.hp).toBe(9999);
  });

  it('Thorn poisons and slows by 30%', () => {
    G.P!.mods = { blade: ['thorn'] };
    const m = dummy(); hurtEnemy(m, 40, false, false, 'blade');
    expect(m.poison!.t).toBe(EL.thorn.time);
    expect(speedFactor(m)).toBeCloseTo(1 - EL.thorn.slow);
  });

  it('Tide: 3 hits in 2 s freeze a mob; a boss gets slowed instead of frozen', () => {
    G.P!.mods = { blade: ['tide'] };
    const m = dummy();
    for (let i = 0; i < 3; i++) hurtEnemy(m, 5, false, false, 'blade');
    expect(m.frozen).toBeGreaterThan(0); expect(speedFactor(m)).toBe(0);
    enterBoss(4); G.boss!.awake = true;
    for (let i = 0; i < 3; i++) hurtEnemy(G.boss!, 5, false, false, 'blade');
    expect(G.boss!.frozen ?? 0).toBe(0);
    expect(speedFactor(G.boss!)).toBeCloseTo(1 - EL.tide.bossSlow);
  });

  it('a non-Art hit carries no elements', () => {
    G.P!.mods = { blade: ['storm'] };
    const a = dummy(60, 0), b = dummy(100, 0);
    hurtEnemy(a, 100, false, false, null as any);
    expect(b.hp).toBe(9999);
  });

  it('a burn tick never chains, even with Storm modded', () => {
    G.P!.mods = { blade: ['storm', 'storm'], sonicLeap: ['storm'] };
    const a = dummy(60, 0), b = dummy(100, 0);
    a.burn = { dps: 100, t: 3, stacks: 1 };
    frames(60);
    expect(a.hp).toBeLessThan(9999); expect(b.hp).toBe(9999);
  });

  it('a fresh burn ticks on schedule after an idle gap', () => {
    const a = dummy(60, 0);
    a.dotTick = 0.5; frames(10); // nothing burning: the stale countdown resets
    a.burn = { dps: 100, t: 3, stacks: 1 };
    frames(1);
    expect(a.hp).toBeLessThan(9999);
  });
});

describe('set bonuses (3 mods of one element)', () => {
  beforeEach(() => { startRun(1); enterRoom(1); });

  it('is active at 3 mods across Arts, not at 2', () => {
    G.P!.mods = { blade: ['ember', 'ember'] }; expect(setActive('ember')).toBe(false);
    G.P!.mods = { blade: ['ember', 'ember'], sonicLeap: ['ember'] }; expect(setActive('ember')).toBe(true);
  });

  it('Ember: a burning enemy that dies explodes and hurts its neighbour', () => {
    G.P!.mods = { blade: ['ember', 'ember'], sonicLeap: ['ember'] };
    const m = dummy(60, 0, 30), next = dummy(100, 0);
    hurtEnemy(m, 10, false, false, 'blade');  // burning now
    hurtEnemy(m, 999, false, false, 'blade'); // dies while burning
    expect(next.hp).toBeLessThan(9999);
  });

  it('Ember: a killing blow does not set the burn that would blast', () => {
    G.P!.mods = { blade: ['ember', 'ember'], sonicLeap: ['ember'] };
    const m = dummy(60, 0, 30), next = dummy(100, 0);
    hurtEnemy(m, 999, false, false, 'blade'); // one-hit kill, wasn't burning
    expect(m.burn).toBeUndefined(); expect(next.hp).toBe(9999);
  });

  it('Storm: every 6th Art hit calls a bolt for 2x attack', () => {
    G.P!.mods = { blade: ['storm', 'storm'], sonicLeap: ['storm'] };
    const m = dummy(60, 0);
    for (let i = 0; i < 5; i++) hurtEnemy(m, 1, false, false, 'blade');
    const before = m.hp; hurtEnemy(m, 1, false, false, 'blade');
    expect(before - m.hp).toBeGreaterThanOrEqual(1 + G.P!.atk * EL.set.stormBolt);
  });

  it('Thorn: killing a poisoned enemy heals 2 HP', () => {
    G.P!.mods = { blade: ['thorn', 'thorn'], sonicLeap: ['thorn'] };
    G.P!.hp = 50;
    const m = dummy(60, 0, 20);
    hurtEnemy(m, 5, false, false, 'blade'); const hp = G.P!.hp;
    hurtEnemy(m, 999, false, false, 'blade');
    expect(G.P!.hp).toBe(hp + EL.set.thornHeal);
  });

  it('Tide: a roll leaves a frost ring that slows enemies inside it', () => {
    G.P!.mods = { blade: ['tide', 'tide'], sonicLeap: ['tide'] };
    const m = dummy(40, 0);
    keys.KeyD = true; roll(); keys.KeyD = false;
    expect(speedFactor(m)).toBeCloseTo(1 - EL.set.tideRing.slow);
  });
});
