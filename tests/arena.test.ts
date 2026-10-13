// Boss arena mechanics (spec "boss"): each boss room has one mechanic, always warned before it hurts.
import { describe, it, expect, beforeEach } from 'vitest';
import { G, startRun, enterBoss, frame } from './harness.ts';
import { hurtPlayer } from '../src/systems/combat.js';
import { startBossMove } from '../src/systems/boss.js';
import { ARENA, BOSSES } from '../src/data/bosses.ts';

const frames = (n: number) => { for (let i = 0; i < n; i++) frame(); };
// Wake the boss with the player in the room, then keep the player safe from the boss itself
function awake(i: number) {
  startRun(1); enterBoss(i);
  G.P!.x = G.L!.roomX + 120; G.P!.y = G.L!.h / 2; frame();
  expect(G.boss!.awake).toBe(true);
}

it('every boss has a TH/EN epithet and arena hint', () => {
  for (const b of Object.values(BOSSES)) {
    expect(b.epithet.th && b.epithet.en).toBeTruthy(); expect(b.hint.th && b.hint.en).toBeTruthy();
  }
});

describe('rockfall (Grask, floor 5)', () => {
  beforeEach(() => awake(4));

  it('each boss knows its arena', () => {
    expect(BOSSES.houndfangLord.arena).toBe('rockfall'); expect(BOSSES.asterius.arena).toBe('pillars');
    expect(BOSSES.nerius.arena).toBe('fog'); expect(BOSSES.wythege.arena).toBe('flood');
    expect(G.arena!.id).toBe('rockfall');
  });

  it('a slam drops 3 rocks, one aimed at the player, each warned 0.8 s before it lands', () => {
    G.boss!.x = G.P!.x + 400; // the slam itself can't reach the player
    startBossMove('slam'); frames(Math.ceil(0.9 * 60) + 2);
    const rocks = G.arena!.rocks;
    expect(rocks).toHaveLength(3);
    expect(rocks.some(r => Math.hypot(r.x - G.P!.x, r.y - G.P!.y) < 5)).toBe(true);
    const hp = G.P!.hp;
    frames(Math.floor(0.8 * 60) - 3); expect(G.P!.hp).toBe(hp);   // still a shadow
    G.P!.inv = 0; frames(6);
    expect(G.P!.hp).toBe(hp - Math.round(BOSSES.houndfangLord.dmg.slam * ARENA.rockfall.dmgMult));
    expect(G.arena!.rocks).toHaveLength(0);
  });

  it('stepping out of the shadow avoids the rock', () => {
    G.boss!.x = G.P!.x + 400;
    startBossMove('slam'); frames(Math.ceil(0.9 * 60) + 2);
    const L = G.L!, need = ARENA.rockfall.radius + G.P!.r + 10, rocks = G.arena!.rocks;
    let spot: { x: number; y: number } | null = null;
    for (let x = L.roomX + 80; x < L.w - 60 && !spot; x += 40) for (let y = 80; y < L.h - 60 && !spot; y += 40)
      if (rocks.every(r => Math.hypot(r.x - x, r.y - y) >= need) && Math.hypot(G.boss!.x - x, G.boss!.y - y) > 200) spot = { x, y };
    const hp = G.P!.hp; G.P!.x = spot!.x; G.P!.y = spot!.y; G.P!.inv = 0;
    frames(60);
    expect(G.P!.hp).toBe(hp);
  });

  it('a floor without an arena has none', () => {
    startRun(1); expect(G.arena).toBeNull();
  });
});

describe('pillars (Bullgard, floor 10)', () => {
  beforeEach(() => awake(9));
  const charge = (p: { x: number; y: number; w: number; h: number }) => { // boss east of the pillar, charging west into it
    const b = G.boss!; b.x = p.x + p.w / 2 + 160; b.y = p.y + p.h / 2; b.cd = 999; b.ang = Math.PI;
    G.P!.x = p.x - 80; G.P!.y = b.y; G.P!.inv = 99;
    startBossMove('charge'); frames(90);
  };

  it('4 pillars stand as walls, clear of the boss spawn and the door', () => {
    expect(G.arena!.pillars).toHaveLength(4);
    const p = G.arena!.pillars[0];
    expect(G.WALLS).toContainEqual({ x: p.x, y: p.y, w: p.w, h: p.h });
    for (const q of G.arena!.pillars) {
      expect(Math.hypot(q.x + q.w / 2 - G.L!.bossAt!.x, q.y + q.h / 2 - G.L!.bossAt!.y)).toBeGreaterThan(G.boss!.r + 150);
      expect(q.x).toBeGreaterThan(G.L!.roomX + 100);
    }
  });

  it('charging into a pillar stuns the boss for 2 s; it takes x1.5 damage meanwhile; 2 hits break the pillar', async () => {
    const { hurtEnemy } = await import('../src/systems/combat.js');
    const p = G.arena!.pillars[0], b = G.boss!, rect = { x: p.x, y: p.y, w: p.w, h: p.h };
    charge(p);
    expect(b.stun).toBeGreaterThan(0);
    expect(p.hits).toBe(1);
    const hp = b.hp; hurtEnemy(b, 100, false); expect(hp - b.hp).toBe(150);
    frames(130); expect(b.stun).toBeLessThanOrEqual(0);
    charge(p);
    expect(G.arena!.pillars).toHaveLength(3);
    expect(G.WALLS).not.toContainEqual(rect);
  });

  it('a rage leap beside a pillar lands clear of it', async () => {
    const { hitWall } = await import('../src/world/physics.ts');
    const p = G.arena!.pillars[0], b = G.boss!;
    b.hp = Math.floor(b.maxHp * 0.3); b.cd = 999;
    G.P!.x = p.x + p.w / 2 + 5; G.P!.y = p.y + p.h / 2; G.P!.inv = 99;
    startBossMove('leap'); frames(120);
    expect(hitWall(b)).toBe(false);
  });

  it('a stunned boss does nothing', () => {
    const b = G.boss!; b.stun = 2; b.cd = 0; const x = b.x;
    frames(30);
    expect(b.act).toBeNull(); expect(b.x).toBe(x);
  });
});

describe('fog (Elderroot, floor 15)', () => {
  beforeEach(() => awake(14));

  it('vision starts at 520 and shrinks 14 px/s to a floor of 150', () => {
    G.boss!.cd = 999;
    expect(G.arena!.vision).toBeCloseTo(ARENA.fog.start, 0);
    frames(60); expect(G.arena!.vision).toBeCloseTo(ARENA.fog.start - ARENA.fog.shrink, 0);
    frames(60 * 40); expect(G.arena!.vision).toBe(ARENA.fog.min);
  });

  it('roots leave sprouts at their extra spots; killing one restores vision, pays nothing, and they wither after 6 s', async () => {
    const { hurtEnemy } = await import('../src/systems/combat.js');
    G.boss!.cd = 999;
    startBossMove('roots'); frames(Math.ceil(0.95 * 60) + 2);
    const sprouts = G.mobs.filter(m => m.sprout && m.hp > 0);
    expect(sprouts.length).toBe(G.boss!.spots!.length - 1);
    const col = G.P!.col, kills = G.run!.kills;
    G.arena!.vision = 200;
    hurtEnemy(sprouts[0], 999, true);
    expect(G.arena!.vision).toBeCloseTo(200 + ARENA.fog.restore, -1);
    expect(G.P!.col).toBe(col); expect(G.run!.kills).toBe(kills);
    for (let i = 0; i < 60 * 6 + 30; i++) { G.boss!.cd = 999; frame(); } // keep the boss quiet; slack for hit-stop
    expect(G.mobs.filter(m => m.sprout && m.hp > 0)).toHaveLength(0);
  });

  it('sprouts never attack or move', () => {
    G.boss!.cd = 999; startBossMove('roots'); frames(70);
    const s = G.mobs.find(m => m.sprout)!; const x = s.x;
    G.P!.x = s.x + 20; G.P!.y = s.y; const hp = G.P!.hp;
    frames(120); expect(s.x).toBe(x); expect(G.P!.hp).toBe(hp);
  });
});

describe('sprouts are props', () => {
  beforeEach(() => awake(14));
  const grow = () => { G.boss!.cd = 999; startBossMove('roots'); frames(Math.ceil(0.95 * 60) + 2); return G.mobs.filter(m => m.sprout && m.hp > 0); };

  it('killing a Thorn-poisoned sprout heals nothing', async () => {
    const { hurtEnemy } = await import('../src/systems/combat.js');
    const s = grow()[0]; G.P!.mods = { blade: ['thorn', 'thorn'], sonicLeap: ['thorn'] }; G.P!.hp = 50;
    hurtEnemy(s, 5, false, false, 'blade'); const hp = G.P!.hp;
    hurtEnemy(s, 999, false, false, 'blade');
    expect(G.P!.hp).toBe(hp);
  });

  it('killing the boss withers every live sprout', async () => {
    const { hurtEnemy } = await import('../src/systems/combat.js');
    expect(grow().length).toBeGreaterThan(0);
    hurtEnemy(G.boss!, 1e9, true);
    expect(G.mobs.filter(m => m.sprout && m.hp > 0)).toHaveLength(0);
  });
});

describe('flood (Marisca, floor 20)', () => {
  beforeEach(() => { awake(19); G.boss!.cd = 999; G.boss!.x = G.L!.w - 80; });

  it('every 12 s: a 1.5 s warning, then 4 s of water that hurts off the platforms (8% max HP each 0.5 s)', () => {
    const F = ARENA.flood, P = G.P!;
    frames(Math.round((F.every - F.warn) * 60) + 5);
    expect(G.arena!.flood!.warn).toBeGreaterThan(0);                // warning first, no damage
    const hp = P.hp; frames(Math.round(F.warn * 60) + 2);
    expect(P.hp).toBe(hp);
    expect(G.arena!.flood!.on).toBeGreaterThan(0);
    P.inv = 0; frames(Math.round(F.tick * 60) + 2);
    expect(P.hp).toBe(hp - Math.round(P.maxHp * F.dmg));
  });

  it('standing on a platform is safe', () => {
    const F = ARENA.flood, P = G.P!;
    [P.x, P.y] = F.platforms[0];
    const hp = P.hp; frames(Math.round((F.every + F.last) * 60) + 10);
    expect(P.hp).toBe(hp);
  });

  // frames between the starts of two consecutive warnings
  const period = () => {
    const f = G.arena!.flood!, starts: number[] = []; let prev = 0;
    for (let n = 0; starts.length < 2 && n < 3000; n++) { frame(); if (f.warn > prev) starts.push(n); prev = f.warn; }
    return (starts[1] - starts[0]) / 60;
  };

  it('floods start 12 s apart', () => {
    G.P!.inv = 99; G.arena!.flood!.t = 0.01;
    expect(Math.abs(period() - ARENA.flood.every)).toBeLessThan(0.1);
  });

  it('phase 3: below 25% HP the floods start 7 s apart', () => {
    const b = G.boss!; b.hp = Math.floor(b.maxHp * 0.2);
    G.P!.inv = 99; G.arena!.flood!.t = 0.01;
    expect(Math.abs(period() - ARENA.flood.everyLate)).toBeLessThan(0.1);
  });

  it('dropping below 25% HP mid-countdown speeds up the next flood', () => {
    const F = ARENA.flood;
    G.arena!.flood!.t = 10; G.boss!.hp = Math.floor(G.boss!.maxHp * 0.2); frame();
    expect(G.arena!.flood!.t).toBeLessThanOrEqual(F.everyLate - F.warn - F.last);
  });

  function midFlood() {
    const F = ARENA.flood; G.arena!.flood!.t = 0.01;
    frames(Math.round((F.warn + 0.5) * 60)); expect(G.arena!.flood!.on).toBeGreaterThan(0);
    G.P!.inv = 0;
  }

  it('Riposte does not parry a flood tick', () => {
    midFlood(); const P = G.P!, hp = P.hp; P.parry = 99;
    frames(Math.round(ARENA.flood.tick * 60) + 2);
    expect(P.hp).toBeLessThan(hp);
  });

  it('flood ticks neither respect nor grant i-frames', () => {
    midFlood(); const P = G.P!, dmg = Math.round(P.maxHp * ARENA.flood.dmg); P.inv = 99;
    const hp = P.hp; frames(Math.round(ARENA.flood.tick * 60) + 2);
    expect(P.hp).toBe(hp - dmg);                                     // landed despite inv
    frames(Math.round(ARENA.flood.tick * 60));
    expect(P.hp).toBe(hp - 2 * dmg);                                 // and again 0.5 s later
    P.inv = 0; hurtPlayer(1, null, true); expect(P.inv).toBe(0);     // tick grants none
    const h2 = P.hp; hurtPlayer(5); expect(P.hp).toBe(h2 - 5);       // a boss hit still lands
  });

  it('no flood damage once the boss is dead', () => {
    midFlood(); const P = G.P!, hp = P.hp; G.boss!.hp = 0;
    frames(Math.round(ARENA.flood.last * 60)); expect(P.hp).toBe(hp);
  });
});
