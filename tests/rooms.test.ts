// Room flow: waves spawn one after another, a cleared room pays its reward and shows doors, doors move you up a floor.
import { describe, it, expect, beforeEach } from 'vitest';
import { G, startRun, frame } from './harness.ts';
import { loadFloor } from '../src/world/floor.ts';
import { hitWall } from '../src/world/physics.ts';
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
