// Shrine: two seeded offers, each with a price; one per shrine. Plus the curse it can lay on the next floors.
import { describe, it, expect, beforeEach } from 'vitest';
import { G, startRun, frame } from './harness.ts';
import { loadFloor, resumeRun } from '../src/world/floor.ts';
import { rollShrine, SHRINE_RULES, mobScale, SHRINE_IDS } from '../src/data/run.ts';
import { canTake, take } from '../src/systems/shrine.js';

describe('shrine offers', () => {
  // the seeded offers are only 2 of 4, so tests that take a specific one offer all four
  const offerAll = () => { G.room!.offers = [...SHRINE_IDS]; };
  beforeEach(() => { startRun(1); loadFloor(2, { type: 'shrine', reward: null }); });

  it('2 different offers, the same for the same seed and floor', () => {
    const o = rollShrine(5, 2);
    expect(o).toHaveLength(2); expect(new Set(o).size).toBe(2); expect(rollShrine(5, 2)).toEqual(o);
    expect(G.room!.offers).toEqual(rollShrine(G.run!.seed, 2));
  });

  it('blood: 15% max HP for a chosen mod', () => {
    offerAll();
    const max = G.P!.maxHp;
    expect(take('blood')).toBe(true);
    expect(G.P!.maxHp).toBe(Math.round(max * (1 - SHRINE_RULES.bloodHp)));
    expect(G.rewards).toEqual(['mod']);
  });

  it('gold: needs 120 Gold, then queues an evolution pick', () => {
    offerAll(); G.P!.skills[1] = 'vorpal';
    G.P!.col = 100; expect(canTake('gold')).toBe(false);
    G.P!.col = 200; expect(take('gold')).toBe(true);
    expect(G.P!.col).toBe(80); expect(G.rewards).toEqual(['evolve']);
  });

  it('potion: needs a Potion, gives a full heal and +10 max HP', () => {
    offerAll();
    G.P!.potions = 0; expect(canTake('potion')).toBe(false);
    G.P!.potions = 1; G.P!.hp = 5; const max = G.P!.maxHp;
    take('potion');
    expect(G.P!.potions).toBe(0); expect(G.P!.maxHp).toBe(max + 10); expect(G.P!.hp).toBe(G.P!.maxHp);
  });

  it('one offer per shrine', () => {
    offerAll(); G.P!.col = 999; G.P!.skills[1] = 'vorpal';
    expect(take('gold')).toBe(true);
    expect(canTake('curse')).toBe(false);
  });

  it('curse: 150 Gold + 1 Potion now, enemies +25% on the next 2 floors that have enemies (towns skipped)', () => {
    offerAll(); G.P!.col = 0; G.P!.potions = 0;
    take('curse');
    expect(G.P!.col).toBe(150); expect(G.P!.potions).toBe(1);
    loadFloor(3, { type: 'battle', reward: 'gold' }); expect(G.cursed).toBe(true);
    for (let i = 0; i < 60; i++) frame();
    const m = G.mobs.find(x => x.def.name === G.F!.mob.name)!;
    expect(m.maxHp).toBe(Math.round(G.F!.mob.hp * mobScale(3) * SHRINE_RULES.curseMult));
    loadFloor(4); expect(G.cursed).toBe(true);   // boss floor counts
    loadFloor(5); expect(G.cursed).toBe(false);  // town: no enemies, not counted
    loadFloor(6, { type: 'battle', reward: 'gold' }); expect(G.cursed).toBe(false); // 2 floors used up
  });

  it('resuming a cursed floor keeps it cursed and does not use up an extra floor', () => {
    offerAll(); take('curse');
    loadFloor(3, { type: 'battle', reward: 'gold' });
    const entry = G.entry!;
    startRun(2); resumeRun(entry);
    expect(G.cursed).toBe(true); expect(G.run!.curse).toBe(1);
  });

  it('rooms with no enemies keep the curse; the next fight room uses it', () => {
    offerAll(); take('curse');
    loadFloor(3, { type: 'spring', reward: null }); expect(G.cursed).toBe(false); expect(G.run!.curse).toBe(2);
    loadFloor(4, { type: 'battle', reward: 'gold' }); expect(G.cursed).toBe(true); expect(G.run!.curse).toBe(1);
  });

  it('a cursed boss floor: boss HP and damage x1.25', () => {
    offerAll(); take('curse');
    loadFloor(4); const f = G.F!;
    expect(G.cursed).toBe(true);
    expect(G.boss!.maxHp).toBe(f.boss.hp);
    G.run!.curse = 0; loadFloor(4); // uncursed copy to compare with
    expect(f.boss.hp).toBe(Math.round(G.F!.boss.hp * SHRINE_RULES.curseMult));
  });
});
