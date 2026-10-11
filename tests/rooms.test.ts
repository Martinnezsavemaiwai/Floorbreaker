// Room flow: waves spawn one after another, a cleared room pays its reward and shows doors, doors move you up a floor.
import { describe, it, expect, beforeEach } from 'vitest';
import { G, startRun, frame } from './harness.ts';
import { loadFloor } from '../src/world/floor.ts';
import { hitWall } from '../src/world/physics.ts';
import { hurtEnemy, hurtPlayer } from '../src/systems/combat.js';
import { MOBS } from '../src/data/mobs.ts';
import { rewardValue, mobScale } from '../src/data/run.ts';

const frames = (n: number) => { for (let i = 0; i < n; i++) frame(); };
const killAll = () => { for (const m of G.mobs) { m.hp = 0; m.dead = Infinity; } };
const clearRoom = () => { for (let n = 0; n < 20 && !G.room!.cleared; n++) { killAll(); frames(60); } expect(G.room!.cleared).toBe(true); };

describe('a battle room', () => {
  beforeEach(() => { startRun(1); loadFloor(1, { type: 'battle', reward: 'gold' }); });

  it('spawns its first wave shortly after you arrive, away from you and outside walls', () => {
    expect(G.mobs).toHaveLength(0);
    frames(60);
    expect(G.mobs.length).toBeGreaterThan(0);
    for (const m of G.mobs) {
      expect(Math.hypot(m.x - G.P!.x, m.y - G.P!.y)).toBeGreaterThanOrEqual(250);
      expect(hitWall(m)).toBe(false);
      expect(m.aggro).toBe(true);
    }
  });

  it('every wave, then the reward and 3 doors; no doors while mobs live', () => {
    frames(60);
    const waves = G.room!.waves.length;
    for (let w = 0; w < waves; w++) {
      expect(G.doors).toHaveLength(0);
      killAll(); frames(60);
    }
    expect(G.room!.cleared).toBe(true);
    expect(G.P!.col).toBe(rewardValue('gold', 0));
    expect(G.doors).toHaveLength(3);
  });

  it('walking into a door loads the next floor as the room it named', () => {
    frames(60); clearRoom();
    frame(); const d = G.doors[1]; // a frame outside arms the doors
    G.P!.x = d.x + d.w / 2; G.P!.y = d.y + d.h / 2; frame();
    expect(G.floorIdx).toBe(2);
    expect(G.room).toMatchObject({ type: d.to!.type, reward: d.to!.reward });
  });
});

describe('door arming', () => {
  it('a door that appears under the player does not take them until they step out and back in', () => {
    startRun(1); loadFloor(1, { type: 'battle', reward: 'xp' }); frames(60);
    G.P!.x = G.L!.w - 40; G.P!.y = 400; // where the doors will appear
    clearRoom();
    expect(G.doors.length).toBeGreaterThan(0); expect(G.floorIdx).toBe(1);
    const d = G.doors.find(d => G.P!.y > d.y && G.P!.y < d.y + d.h)!; expect(d).toBeTruthy();
    frames(5); expect(G.floorIdx).toBe(1);
    G.P!.x = 300; frame(); G.P!.x = d.x + d.w / 2; G.P!.y = d.y + d.h / 2; frame();
    expect(G.floorIdx).toBe(2);
  });
});

describe('fixed exits', () => {
  beforeEach(() => startRun(1));

  it('the town has one door, to a battle room; you arrive at full HP', () => {
    expect(G.L!.kind).toBe('town');
    G.P!.hp = 5; loadFloor(0);
    expect(G.P!.hp).toBe(G.P!.maxHp);
    frame(); const d = G.doors[0]; G.P!.x = d.x + 30; G.P!.y = d.y + 55; frame();
    expect(G.floorIdx).toBe(1); expect(G.room!.type).toBe('battle');
  });

  it('rooms do not heal you on arrival', () => {
    G.P!.hp = 5; loadFloor(1, { type: 'battle', reward: 'xp' });
    expect(G.P!.hp).toBe(5);
  });

  it('the last room before the boss has a single door to the boss floor', () => {
    loadFloor(3, { type: 'battle', reward: 'xp' }); frames(60); clearRoom();
    expect(G.doors).toHaveLength(1); expect(G.doors[0].to).toBeNull();
    frame(); const d = G.doors[0]; G.P!.x = d.x + 30; G.P!.y = d.y + 55; frame();
    expect(G.floorIdx).toBe(4); expect(G.L!.kind).toBe('boss');
  });

  it('a potion reward with full pockets pays Gold instead', () => {
    G.P!.potions = 3; loadFloor(1, { type: 'battle', reward: 'potion' }); frames(60); clearRoom();
    expect(G.P!.potions).toBe(3); expect(G.P!.col).toBeGreaterThan(0);
  });

  it('later rooms scale their mobs (+8% HP per floor into the act)', () => {
    loadFloor(3, { type: 'battle', reward: 'xp' }); frames(60);
    const base = G.F!.mob, melee = G.mobs.filter(m => m.def.name === base.name);
    expect(melee.length).toBeGreaterThan(0);
    for (const m of melee) expect(m.maxHp).toBe(Math.round(base.hp * mobScale(3)));
  });
});

describe('an elite room', () => {
  beforeEach(() => { startRun(1); loadFloor(2, { type: 'elite', reward: null }); });

  it('spawns one elite with 4x HP and 1.5x damage among 3 normal mobs', () => {
    frames(60);
    const elites = G.mobs.filter(m => m.elite), base = G.F!.mob;
    expect(elites).toHaveLength(1);
    expect(elites[0].maxHp).toBe(Math.round(Math.round(base.hp * mobScale(2)) * 4));
    expect(elites[0].def.dmg).toBe(Math.round(Math.round(base.dmg * mobScale(2)) * 1.5));
    expect(G.mobs.filter(m => !m.elite)).toHaveLength(3);
  });

  it('clearing it awards a new Art (the test harness takes the first card) and opens doors; it pays no Gold', () => {
    expect(G.P!.skills[1]).toBeNull();
    clearRoom();
    expect(G.P!.skills[1]).not.toBeNull(); // the harness resolves G.rewards right away, like the bots
    expect(G.rewards).toEqual([]);
    expect(G.P!.col).toBe(0);
    expect(G.doors.length).toBeGreaterThan(0);
  });
});

describe('elite modifiers', () => {
  const spawnElite = (mod: string) => {
    startRun(1); loadFloor(2, { type: 'elite', reward: null });
    G.room!.waves = [[{ id: 'frenzyBoar', n: 1, elite: true, mod } as any]];
    frames(60);
    return G.mobs.find(m => m.elite)!;
  };

  it('fast: 40% faster than the plain elite', () => {
    const e = spawnElite('fast');
    expect(e.def.speed).toBe(Math.round(MOBS.frenzyBoar.speed * 1.4)); // floor scaling leaves speed alone
  });

  it('shield: guard up, normal hits take a quarter until a heavy hit breaks it', () => {
    const e = spawnElite('shield'), hp = e.hp;
    hurtEnemy(e, 40, false); expect(hp - e.hp).toBe(10);
    expect(e.def.knockback.light).toBe(0);
    const hp2 = e.hp; hurtEnemy(e, 40, true); expect(hp2 - e.hp).toBe(40); // heavy breaks the guard: full damage
  });

  it('split: dies into 2 small copies with 30% of its max HP each, which must die too', () => {
    const e = spawnElite('split'), max = e.maxHp;
    hurtEnemy(e, e.hp + 1, true);
    const kids = G.mobs.filter(m => m.hp > 0);
    expect(kids).toHaveLength(2);
    for (const k of kids) { expect(k.maxHp).toBe(Math.round(max * 0.3)); expect(k.elite).toBe(false); }
    expect(G.room!.cleared).toBe(false);
  });

  it('split: copies of an elite killed against a wall are not inside it', () => {
    const e = spawnElite('split'), w = G.WALLS[0];
    e.x = w.x + w.w + e.r + 1; e.y = w.y + w.h / 2; // flush against the wall's right face, so the -30 copy would sit inside
    hurtEnemy(e, e.hp + 1, true);
    const kids = G.mobs.filter(m => m.hp > 0);
    expect(kids).toHaveLength(2);
    for (const k of kids) expect(hitWall(k)).toBe(false);
  });

  it('regen: heals 3%/s of max HP after 2 s without a hit', () => {
    const e = spawnElite('regen'); G.P!.x = 60; G.P!.y = 60; // keep away from it
    e.hp = Math.round(e.maxHp / 2); e.sinceHit = 0;
    const low = e.hp; frames(60); expect(e.hp).toBe(low);      // within 2 s: no regen
    frames(120); expect(e.hp).toBeGreaterThan(low);              // after: heals
  });
});

describe('a spring room', () => {
  beforeEach(() => { startRun(1); loadFloor(2, { type: 'spring', reward: null }); });

  it('has no enemies and open doors from the start', () => {
    frames(60);
    expect(G.mobs.filter(m => m.hp > 0)).toHaveLength(0);
    expect(G.doors.length).toBeGreaterThan(0);
  });

  it('walking to the fountain heals 50% of max HP once', () => {
    G.P!.hp = 10;
    G.P!.x = 600; G.P!.y = 480; frame();
    expect(G.P!.hp).toBe(10 + Math.round(G.P!.maxHp * 0.5));
    G.P!.hp = 10; frame();
    expect(G.P!.hp).toBe(10); // only once
  });

  it('the fountain is solid', () => {
    expect(hitWall({ x: 600, y: 400, r: 14 })).toBe(true);
  });
});

describe('a challenge room', () => {
  beforeEach(() => { startRun(1); loadFloor(2, { type: 'challenge', reward: 'gold' }); });

  it('keeps sending waves for 30 s, then clears the leftovers and pays the reward twice with <= 3 hits', () => {
    G.P!.inv = 999; // unhurt for the whole test
    frames(60 * 10);
    expect(G.mobs.some(m => m.hp > 0)).toBe(true);
    for (const m of G.mobs) { m.hp = 0; m.dead = Infinity; }
    frames(60 * 21);
    expect(G.room!.cleared).toBe(true);
    expect(G.mobs.filter(m => m.hp > 0)).toHaveLength(0);
    expect(G.P!.col).toBe(2 * rewardValue('gold', 0));
    expect(G.doors.length).toBeGreaterThan(0);
  });

  it('more than 3 hits: no reward, doors still open', () => {
    for (let i = 0; i < 4; i++) { G.P!.inv = 0; hurtPlayer(1); }
    expect(G.room!.challenge!.hits).toBe(4);
    G.P!.inv = 999; frames(60 * 31);
    expect(G.room!.cleared).toBe(true);
    expect(G.P!.col).toBe(0);
    expect(G.doors.length).toBeGreaterThan(0);
  });
});

describe('a wandering shop room', () => {
  beforeEach(() => { startRun(1); loadFloor(2, { type: 'shop', reward: null }); });
  it('has a merchant at the room centre, no enemies and open doors', () => {
    frames(30);
    expect(G.L!.merchant).toEqual({ x: 600, y: 400 });
    expect(G.mobs.filter(m => m.hp > 0)).toHaveLength(0);
    expect(G.doors.length).toBeGreaterThan(0);
  });
});
