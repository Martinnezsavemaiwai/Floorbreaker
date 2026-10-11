// The build: level-up cards (mods + stats), new-Art picks with slot replacement, evolution at 2 mods and from a boss.
import { describe, it, expect, beforeEach } from 'vitest';
import { G, startRun, enterRoom, enterBoss } from './harness.ts';
import { UPGRADES } from '../src/data/upgrades.ts';
import { rollLevelCards, cardsFor, rollArtCards, evolveCards, applyCard, hasLevelPick, modCards, nextPick, bossReward } from '../src/systems/build.js';
import { hurtEnemy } from '../src/systems/combat.js';
import { SHOP } from '../src/data/shop.ts';
import { rng } from '../src/core/rng.ts';

describe('level-up cards', () => {
  beforeEach(() => { startRun(1); enterRoom(1); });

  it('3 different cards, mods only for owned Arts (the sword and Gale Rush at the start)', () => {
    for (let i = 0; i < 30; i++) {
      const cards = rollLevelCards();
      expect(cards).toHaveLength(3);
      expect(new Set(cards.map(c => JSON.stringify(c))).size).toBe(3);
      for (const c of cards) if (c.kind === 'mod') expect(['blade', 'sonicLeap']).toContain(c.art);
    }
  });

  it('never offers a third mod for an Art; 2 mods evolve it', () => {
    G.P!.pendingUpgrades = 2;
    applyCard({ kind: 'mod', art: 'blade', el: 'ember' }, 'level');
    applyCard({ kind: 'mod', art: 'blade', el: 'storm' }, 'level');
    expect(G.P!.mods.blade).toEqual(['ember', 'storm']);
    expect(G.P!.evolved).toContain('blade');
    expect(G.P!.pendingUpgrades).toBe(0);
    expect(modCards().some(c => c.art === 'blade')).toBe(false);
  });

  it('an Art evolved by the shard (0 mods) still takes mods; a 2-mod Art does not', () => {
    G.P!.evolved = ['blade'];
    expect(modCards().some(c => c.art === 'blade')).toBe(true);
    G.P!.mods = { blade: ['ember', 'storm'] };
    expect(modCards().some(c => c.art === 'blade')).toBe(false);
  });

  it('checking for a pick never draws from the gameplay rng', () => {
    startRun(1); enterRoom(1); G.P!.pendingUpgrades = 1; const a = rng();
    startRun(1); enterRoom(1); G.P!.pendingUpgrades = 1; hasLevelPick(); nextPick(); const b = rng();
    expect(b).toBe(a);
  });
});

describe('new Art picks (elite reward)', () => {
  beforeEach(() => { startRun(1); enterRoom(1); });

  it('offers unowned Arts from the pool; picking fills the first empty slot', () => {
    const cards = rollArtCards();
    expect(cards.map(c => c.kind === 'art' && c.id).sort()).toEqual(['horizontal', 'vorpal']);
    applyCard({ kind: 'art', id: 'vorpal' }, 'art');
    expect(G.P!.skills).toEqual(['sonicLeap', 'vorpal', null]);
    expect(rollArtCards().map(c => c.kind === 'art' && c.id)).toEqual(['horizontal']);
  });

  it('with both slots full and nothing new in the pool, the pick shows stat cards instead', () => {
    G.P!.skills = ['sonicLeap', 'vorpal', 'horizontal'];
    expect(rollArtCards().every(c => c.kind === 'stat')).toBe(true);
  });

  it('a stat card taken as a reward never adds or spends a level pick', () => {
    G.P!.pendingUpgrades = 0; G.rewards = ['art'];
    applyCard({ kind: 'stat', id: 'swift' }, 'art');
    expect(G.P!.up.swift).toBe(1); expect(G.P!.pendingUpgrades).toBe(0); expect(G.rewards).toEqual([]);
  });

  it('a new Art with both slots full asks which slot to replace; replace drops the old mods; skip keeps everything', () => {
    // two copies of Fang only so this test has a full bar with the Arts round 2 has
    G.P!.skills = ['sonicLeap', 'vorpal', 'vorpal']; G.P!.mods = { vorpal: ['tide'] }; G.rewards = ['art'];
    const follow = applyCard({ kind: 'art', id: 'horizontal' }, 'art');
    expect(follow!.map(c => c.kind)).toEqual(['replace', 'replace', 'skip']);
    expect(G.rewards).toEqual(['art']); // still pending until the second choice
    applyCard(follow![0], 'art');
    expect(G.P!.skills[1]).toBe('horizontal'); expect(G.P!.mods.vorpal).toBeUndefined(); expect(G.rewards).toEqual([]);
    G.P!.skills = ['sonicLeap', 'vorpal', 'horizontal']; G.rewards = ['art'];
    applyCard({ kind: 'skip' }, 'art');
    expect(G.P!.skills).toEqual(['sonicLeap', 'vorpal', 'horizontal']); expect(G.rewards).toEqual([]);
  });
});

describe('empty art reward', () => {
  it('with nothing to offer, shows a lone skip that drains the reward', () => {
    startRun(1); enterRoom(1);
    G.P!.skills = ['sonicLeap', 'vorpal', 'horizontal'];
    G.P!.up = Object.fromEntries(Object.entries(UPGRADES).map(([id, u]) => [id, u.max]));
    G.rewards = ['art'];
    expect(cardsFor('art')).toEqual([{ kind: 'skip' }]);
    applyCard({ kind: 'skip' }, 'art');
    expect(G.rewards).toEqual([]);
  });
});

describe('evolution shard (boss reward)', () => {
  beforeEach(() => { startRun(1); enterBoss(4); });

  it('killing a non-final boss heals fully and queues an evolution pick', () => {
    G.P!.hp = 10; G.boss!.awake = true;
    hurtEnemy(G.boss!, 99999, false);
    expect(G.P!.hp).toBe(G.P!.maxHp);
    expect(G.rewards).toEqual(['evolve']);
    expect(evolveCards().map(c => c.kind === 'evolve' && c.art).sort()).toEqual(['blade', 'sonicLeap']);
    applyCard({ kind: 'evolve', art: 'sonicLeap' }, 'evolve');
    expect(G.P!.evolved).toEqual(['sonicLeap']);
  });

  it('the final-floor boss gives no reward', () => {
    startRun(1); enterBoss(19);
    G.boss!.awake = true;
    hurtEnemy(G.boss!, 99999, false);
    expect(G.rewards).toEqual([]);
  });

  it('with nothing left to evolve, the shard pays +1 Potion and 100 Gold instead', () => {
    G.P!.evolved = ['blade', 'sonicLeap']; G.P!.potions = 0; G.P!.col = 0;
    bossReward();
    expect(G.rewards).toEqual([]); expect(G.P!.potions).toBe(1); expect(G.P!.col).toBe(100);
  });

  it('at the Potion cap the shard pays the Potion price in Gold on top', () => {
    G.P!.evolved = ['blade', 'sonicLeap']; G.P!.potions = SHOP.potion.max; G.P!.col = 0;
    bossReward();
    expect(G.P!.potions).toBe(SHOP.potion.max); expect(G.P!.col).toBe(100 + SHOP.potion.price());
  });
});

describe('a chosen element mod (shop / shrine)', () => {
  beforeEach(() => { startRun(1); enterRoom(1); });

  it('first the element, then the Art; only Arts with room for a mod', () => {
    G.P!.mods = { blade: ['ember', 'storm'] }; G.rewards = ['mod'];
    const els = cardsFor('mod');
    expect(els.map(c => c.kind === 'element' && c.el)).toEqual(['ember', 'storm', 'thorn', 'tide']);
    const arts = applyCard({ kind: 'element', el: 'tide' }, 'mod')!;
    expect(arts.map(c => c.kind === 'mod' && c.art)).toEqual(['sonicLeap']); // the sword is full
    expect(G.rewards).toEqual(['mod']);
    applyCard(arts[0], 'mod');
    expect(G.P!.mods.sonicLeap).toEqual(['tide']); expect(G.rewards).toEqual([]);
  });

  it('with no Art able to take a mod, the pick is a lone skip', () => {
    G.P!.mods = { blade: ['ember', 'ember'], sonicLeap: ['tide', 'tide'] }; G.rewards = ['mod'];
    expect(cardsFor('mod')).toEqual([{ kind: 'skip' }]);
  });
});
