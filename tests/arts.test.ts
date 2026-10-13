// New Blade Arts and evolved forms: what each one does in the real systems (headless harness).
import { describe, it, expect, beforeEach } from 'vitest';
import { G, startRun, enterRoom, frame } from './harness.ts';
import { skill, attack } from '../src/systems/player.js';
import { SKILLS } from '../src/data/skills.ts';
import { ICON } from '../src/data/skillIcons.ts';
import { hurtPlayer } from '../src/systems/combat.js';
import { clock } from '../src/core/app.ts';
import { settings } from '../src/core/save.ts';
import { hitWall } from '../src/world/physics.ts';
import { makeMob, loadFloor } from '../src/world/floor.ts';

const frames = (n: number) => { for (let i = 0; i < n; i++) frame(); };
// A still dummy with plenty of HP at (x, y)
function dummy(x: number, y: number, hp = 9999) {
  const m = makeMob(x, y, false, { ...G.F!.mob, hp, speed: 0, wanderSpeed: 0, knockback: { light: 0, heavy: 0 } });
  G.mobs.push(m); return m;
}
const give = (id: string, evolved = false) => { G.P!.skills[1] = id; G.P!.skillCd[1] = 0; if (evolved) G.P!.evolved.push(id); };
const setup = () => { startRun(1); enterRoom(1); G.WALLS = []; G.P!.x = 300; G.P!.y = 400; G.P!.ang = 0; };

describe('Crescent Wave', () => {
  beforeEach(setup);

  it('a piercing wave: hits every enemy on its 360 px path once, for 1.6x', () => {
    give('crescent');
    const a = dummy(450, 400), b = dummy(600, 400), far = dummy(720, 400);
    skill(1); frames(60);
    const dmg = Math.round(G.P!.atk * SKILLS.crescent.dmgMult);
    expect(a.maxHp - a.hp).toBe(dmg);
    expect(b.maxHp - b.hp).toBe(dmg);
    expect(far.hp).toBe(far.maxHp);        // beyond 360 px
    expect(G.waves).toHaveLength(0);       // spent
    expect(G.P!.skillCd[1]).toBeGreaterThan(SKILLS.crescent.cd - 1.1);
  });

  it('evolved: three waves in a fan at +/-18 degrees', () => {
    give('crescent', true);
    skill(1);
    expect(G.waves).toHaveLength(3);
    const angs = G.waves.map(w => Math.round(Math.atan2(w.vy, w.vx) * 180 / Math.PI)).sort((x, y) => x - y);
    expect(angs).toEqual([-18, 0, 18]);
  });

  it('evolved: one target in reach of the fan is hit once', () => {
    give('crescent', true);
    const a = dummy(400, 400);
    skill(1); frames(60);
    expect(a.maxHp - a.hp).toBe(Math.round(G.P!.atk * SKILLS.crescent.dmgMult));
  });

  it('a wave stops at a wall', () => {
    give('crescent');
    G.WALLS.push({ x: 360, y: 300, w: 20, h: 200 });
    const behind = dummy(450, 400);
    skill(1); frames(60);
    expect(behind.hp).toBe(behind.maxHp);
  });
});

describe('the evolved sword', () => {
  beforeEach(setup);

  it('the combo finisher launches a 260 px wave; plain swings do not', () => {
    G.P!.evolved.push('blade');
    attack(); frames(30); attack(); frames(30);
    expect(G.waves).toHaveLength(0);
    G.P!.ang = 0; // frames re-aim at the mouse
    attack(); // finisher
    expect(G.waves).toHaveLength(1);
    const target = dummy(500, 400); // out of sword reach, inside 260
    frames(60);
    expect(target.hp).toBeLessThan(target.maxHp);
  });

  it('without the evolution the finisher launches nothing', () => {
    attack(); frames(30); attack(); frames(30); attack();
    expect(G.waves).toHaveLength(0);
  });
});

describe('Art icons', () => {
  it('every Art has a HUD icon (a missing one throws every frame)', () => {
    for (const id of Object.keys(SKILLS)) expect(ICON[id], id).toBeDefined();
  });
});

describe('Riposte', () => {
  beforeEach(() => { setup(); G.P!.inv = 0; });

  it('a hit during the 0.6 s stance does no damage and counters for 3.0x within 80', () => {
    give('riposte');
    const near = dummy(360, 400), far = dummy(420, 400), hp = G.P!.hp;
    skill(1); frames(10);
    hurtPlayer(30, near);
    expect(G.P!.hp).toBe(hp);
    expect(near.maxHp - near.hp).toBe(Math.round(G.P!.atk * SKILLS.riposte.dmgMult));
    expect(far.hp).toBe(far.maxHp);
    expect(G.P!.parry).toBeLessThanOrEqual(0);
  });

  it('no hit: the stance ends and leaves the player stuck for 0.3 s; a hit after it lands normally', () => {
    give('riposte');
    const hp = G.P!.hp;
    skill(1); frames(37);
    expect(G.P!.parry).toBeLessThanOrEqual(0);
    expect(G.P!.delay).toBeGreaterThan(0.2);
    G.P!.inv = 0; hurtPlayer(10); expect(G.P!.hp).toBeLessThan(hp);
  });

  it('evolved: a counter slows the game to 40% (times assist speed) for 1.2 s of real time', () => {
    give('riposte', true); settings.assistSpeed = 0.8; clock.scale = 0.8;
    skill(1); frames(8); hurtPlayer(10, dummy(340, 400));
    frames(10);
    expect(clock.scale).toBeCloseTo(0.4 * 0.8);
    frames(Math.ceil(1.3 * 60)); // real frames: 1.2 s of real time is spent
    expect(clock.scale).toBeCloseTo(0.8);
    settings.assistSpeed = 1; clock.scale = 1;
  });

  it('loading a floor mid-slowmo restores the assist speed', () => {
    give('riposte', true); skill(1); frames(2); hurtPlayer(10);
    frames(10); expect(clock.scale).toBeLessThan(1);
    loadFloor(2);
    expect(clock.scale).toBe(settings.assistSpeed); expect(G.P!.slowmo).toBe(0);
  });
});

describe('Shade Step', () => {
  beforeEach(setup);

  it('teleports behind the nearest enemy in the aim direction within 220 and stabs it for 2.2x', () => {
    give('shade');
    const t = dummy(460, 400), off = dummy(300, 560); // off: 160 away but 90 degrees off the aim
    skill(1); frames(2);
    expect(G.P!.x).toBeGreaterThan(t.x);
    expect(t.maxHp - t.hp).toBe(Math.round(G.P!.atk * SKILLS.shade.dmgMult));
    expect(off.hp).toBe(off.maxHp);
  });

  it('no target in reach: a short 120 px dash along the aim, no contact damage', () => {
    give('shade');
    const far = dummy(800, 400);
    skill(1); frames(20);
    expect(G.P!.x).toBeGreaterThan(400); expect(G.P!.x).toBeLessThan(440);
    expect(far.hp).toBe(far.maxHp);
  });

  it('never lands inside a wall: the far side is blocked, so it lands on the near side', () => {
    give('shade');
    const t = dummy(460, 400);
    G.WALLS.push({ x: 470, y: 340, w: 60, h: 120 });
    skill(1); frames(2);
    expect(hitWall(G.P!)).toBe(false);
    expect(t.hp).toBeLessThan(t.maxHp);
  });

  it('evolved: chains to one more enemy within 220', () => {
    give('shade', true);
    const a = dummy(460, 400), b = dummy(560, 520);
    skill(1); frames(20);
    expect(a.hp).toBeLessThan(a.maxHp); expect(b.hp).toBeLessThan(b.maxHp);
  });
});

describe('Shade Step edge cases', () => {
  beforeEach(() => { setup(); G.P!.inv = 0; });

  it('a target at the map edge: the player stays inside the level', () => {
    give('shade');
    const L = G.L!, t = dummy(L.w - 20, 400); G.P!.x = L.w - 150;
    skill(1); frames(2);
    expect(G.P!.x).toBeLessThanOrEqual(L.w - G.P!.r);
    expect(t.hp).toBeLessThan(t.maxHp);
  });

  it('the no-target dash has no i-frames and recovers in 0.2 s', () => {
    give('shade'); const hp = G.P!.hp;
    skill(1); frames(2);
    expect(G.P!.dash).toBeGreaterThan(0);
    hurtPlayer(10); expect(G.P!.hp).toBeLessThan(hp);
    while (G.P!.dash > 0) frames(1);
    expect(G.P!.delay).toBeGreaterThan(0); expect(G.P!.delay).toBeLessThanOrEqual(SKILLS.shade.delay);
  });

  it('both landing spots blocked: a dash, and the target is not hit', () => {
    give('shade');
    const t = dummy(460, 400);
    G.WALLS.push({ x: 410, y: 300, w: 12, h: 200 }, { x: 500, y: 300, w: 12, h: 200 });
    G.P!.x = 300;
    skill(1); frames(20);
    expect(t.hp).toBe(t.maxHp);
    expect(G.P!.x).toBeGreaterThan(300);
  });
});

describe('Shade Step at a sleeping boss', () => {
  it('never carries the player into the boss room while the boss sleeps', async () => {
    const { enterBoss } = await import('./harness.ts');
    startRun(1); enterBoss(4); give('shade');
    G.P!.x = G.L!.roomX - 60; G.P!.y = G.L!.h / 2; G.P!.ang = 0; G.boss!.awake = false;
    skill(1); frames(20);
    expect(G.P!.x).toBeLessThanOrEqual(G.L!.roomX);
  });
});

describe('evolved forms', () => {
  beforeEach(setup);

  it('no Art hits harder just for being evolved (the x1.3 is gone)', async () => {
    const S = await import('../src/data/skills.ts');
    expect('EVOLVED_DMG' in S).toBe(false);
    G.P!.evolved.push('blade');
    const t = dummy(330, 400); attack(); frames(1);
    expect(t.maxHp - t.hp).toBeLessThanOrEqual(G.P!.atk + 3); // plain swing: atk + rand(0, dmgRand 3)
  });

  it('Twin Gale: two dashes back to back, then the full cooldown', () => {
    G.P!.evolved.push('sonicLeap');
    skill(0); frames(60);                 // the first cooldown is 0.18 + 0.5 + 0.3 = 0.98 s
    expect(G.P!.skillCd[0]).toBeLessThanOrEqual(0);
    skill(0); expect(G.P!.dash).toBeGreaterThan(0);
    frames(30);
    expect(G.P!.skillCd[0]).toBeGreaterThan(1.0);
  });

  it('Gale Rush unevolved keeps its plain cooldown', () => {
    skill(0); expect(G.P!.skillCd[0]).toBeCloseTo(SKILLS.sonicLeap.cd);
  });

  it('Maelstrom Edge: hits on two turns and pulls enemies in, stopping at contact', () => {
    give('horizontal', true);
    const e = dummy(400, 400);
    skill(1); frames(1);
    const once = e.maxHp - e.hp;
    expect(once).toBeGreaterThan(0);
    frames(30);
    expect(e.maxHp - e.hp).toBe(once * 2);
    expect(e.x).toBeLessThan(350);
    expect(e.x - G.P!.x).toBeGreaterThanOrEqual(G.P!.r + e.r - 1);
  });

  it('Maelstrom Edge: a mob with real knockback still ends up closer', () => {
    give('horizontal', true);
    const e = makeMob(400, 400, false, { ...G.F!.mob, hp: 9999, speed: 0, wanderSpeed: 0, knockback: { light: 0, heavy: 480 } });
    G.mobs.push(e);
    skill(1); frames(20);
    expect(e.x).toBeLessThan(400);
  });

  it('Rending Fang: a blast along a 360 px line after the stab', () => {
    give('vorpal', true);
    const far = dummy(600, 400); // beyond the 180 px stab, inside the 360 px line
    skill(1); frames(60);
    expect(far.hp).toBeLessThan(far.maxHp);
  });

  it('the evolution toast and the evolve card name the evolved form', async () => {
    const { evoName } = await import('../src/data/skills.ts');
    expect(evoName('crescent')).toBe('Triple Crescent'); expect(evoName('blade')).toBe('Moonrend');
  });
});
