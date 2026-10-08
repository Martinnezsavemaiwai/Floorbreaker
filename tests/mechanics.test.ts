// Focused checks of individual mechanics, each in a quiet arena (mobs removed) on a fresh seeded run.
import { describe, it, expect, beforeEach } from 'vitest';
import { G, STEP, startRun, frame } from './harness.ts';
import { attack, skill, roll, hurtPlayer, startBossMove } from '../src/systems/index.js';
import { keys, mouse } from '../src/core/input.ts';
import { gainXp } from '../src/systems/combat.js';
import { loadFloor } from '../src/world/floor.ts';
import { ROOM_X } from '../src/world/constants.ts';
import { clock } from '../src/core/app.ts';
import { PLAYER } from '../src/data/player.ts';
import { MOVES, BOSS_RULES } from '../src/data/bosses.ts';

const frames = (n: number) => { for (let i = 0; i < n; i++) frame(); };
function quietField() {
  startRun(1);
  G.P!.x = 900; G.P!.y = 600; // open field, away from town regen and trees
  for (const m of G.mobs) { m.hp = 0; m.dead = 1e9; }
}

describe('player', () => {
  beforeEach(quietField);

  it('i-frames block a second hit, then wear off', () => {
    hurtPlayer(10); const hp = G.P!.hp;
    frames(Math.floor(PLAYER.invTime * 60) - 2); hurtPlayer(10);
    expect(G.P!.hp).toBe(hp);
    frames(10); hurtPlayer(10);
    expect(G.P!.hp).toBe(hp - 10);
  });

  it('the Blade Art dash dodges damage', () => {
    skill(); hurtPlayer(50);
    expect(G.P!.hp).toBe(G.P!.maxHp);
  });

  it('an attack pressed just before the cooldown ends is buffered and fires', () => {
    attack(); const cd = G.P!.atkCd;
    frames(Math.ceil((PLAYER.attack.cd - PLAYER.inputBuffer / 2) * 60)); // press inside the buffer window
    attack();
    expect(G.P!.buf?.kind).toBe('attack');
    frames(12);
    expect(G.P!.buf).toBeNull();
    expect(G.P!.atkCd).toBeGreaterThan(0); // the buffered swing went off and restarted the cooldown
    expect(cd).toBe(PLAYER.attack.cd);
  });

  it('a press far too early is dropped instead of firing later', () => {
    attack(); frames(1); attack();
    frames(Math.ceil(PLAYER.inputBuffer * 60) + 1);
    expect(G.P!.buf).toBeNull();
    frames(30);
    expect(G.P!.atkCd).toBeLessThan(0); // no surprise swing happened
  });

  it('a dash or roll at the doorway never carries you into the boss room (you have to walk in)', () => {
    // floors 1 and 3 have a ranged mob standing right in front of the door: dashing at it used to lock you in with the boss
    G.cam.x = 0; G.cam.y = 0;
    for (const move of [() => skill(), () => { keys.KeyD = true; roll(); keys.KeyD = false; }]) {
      quietField(); G.P!.x = ROOM_X - 70; G.P!.y = 600; mouse.x = ROOM_X + 400; mouse.y = 600;
      move(); frames(40);
      expect(G.boss!.awake).toBe(false);
      expect(G.P!.x).toBeLessThanOrEqual(ROOM_X);
    }
    // walking in still wakes the boss and locks the door, as before
    quietField(); G.P!.x = ROOM_X - 20; G.P!.y = 600; keys.KeyD = true; frames(60); keys.KeyD = false;
    expect(G.boss!.awake).toBe(true);
  });

  it('levels up at xpToNext and gains the per-level stats', () => {
    gainXp(PLAYER.xpToNext(1));
    expect(G.P!.lv).toBe(2);
    expect(G.P!.maxHp).toBe(PLAYER.hp + PLAYER.perLevel.hp);
    expect(G.P!.atk).toBe(PLAYER.atk + PLAYER.perLevel.atk);
  });
});

describe('boss', () => {
  beforeEach(() => {
    quietField(); loadFloor(2);
    for (const m of G.mobs) { m.hp = 0; m.dead = 1e9; }
    G.P!.x = ROOM_X + 100; G.P!.y = 600; frame(); // walk in: the boss wakes and the door locks
  });

  it('wakes and locks the door when the player enters the room', () => {
    expect(G.boss!.awake).toBe(true);
    expect(G.doorClosed).toBe(true);
  });

  it('telegraph times come from data, shorter in rage', () => {
    for (const mv of ['slam', 'leap', 'roots', 'quake'] as const) {
      G.boss!.act = null; startBossMove(mv);
      expect(G.boss!.t, mv).toBe(MOVES[mv].wind[0]);
      G.boss!.hp = G.boss!.maxHp * (BOSS_RULES.rageAt - 0.1); G.boss!.act = null; startBossMove(mv);
      expect(G.boss!.t, `${mv} rage`).toBe(MOVES[mv].wind[1]);
      G.boss!.hp = G.boss!.maxHp;
    }
  });

  it('a slam hits a player standing inside it for the data damage', () => {
    G.boss!.act = null; G.P!.inv = 0; G.P!.x = G.boss!.x + 50; G.P!.y = G.boss!.y;
    const hp = G.P!.hp;
    startBossMove('slam'); frames(Math.ceil(MOVES.slam.wind[0] * 60) + 2);
    expect(hp - G.P!.hp).toBe(G.F!.boss.dmg.slam);
  });

  it('a slam misses a player outside its radius', () => {
    G.boss!.act = null; G.P!.x = G.boss!.x - MOVES.slam.radius - 40; G.P!.y = G.boss!.y;
    const hp = G.P!.hp;
    startBossMove('slam'); frames(Math.ceil(MOVES.slam.wind[0] * 60) + 2);
    expect(G.P!.hp).toBe(hp);
  });
});

describe('clock', () => {
  it('hit-stop freezes the simulation for its duration in real time, then resumes', () => {
    quietField(); attack();
    clock.hitStop = 0.1; // 6 frames at 60 Hz
    const frozen = G.P!.atkCd;
    frames(5);
    expect(G.P!.atkCd).toBe(frozen);
    frames(3);
    expect(G.P!.atkCd).toBeLessThan(frozen);
  });

  it('a long hitch is capped instead of fast-forwarding the game', () => {
    quietField();
    const t = G.run!.time;
    frame(5); // a 5 s frame (tab was frozen) — at most maxSteps (8) steps run
    expect(Math.round((G.run!.time - t) / STEP)).toBeLessThanOrEqual(8);
  });
});

describe('assist mode and suspend', () => {
  it('assist damage scales hits taken and marks the run as assisted', async () => {
    const { settings } = await import('../src/core/save.ts');
    quietField();
    settings.assistDamage = 0.5;
    try {
      hurtPlayer(40);
      expect(G.P!.maxHp - G.P!.hp).toBe(20);
      frames(10); // the hit's hit-stop eats the first few frames
      expect(G.run!.assisted).toBe(true);
    } finally { settings.assistDamage = 1; }
  });

  it('a suspended run resumes on the same floor with the same character', async () => {
    const { snapshotRun, resumeRun } = await import('../src/world/floor.ts');
    quietField(); gainXp(PLAYER.xpToNext(1) + PLAYER.xpToNext(2)); loadFloor(1); G.run!.kills = 12;
    const snap = snapshotRun();
    startRun(2); // a different session
    resumeRun(snap);
    expect(G.floorIdx).toBe(1);
    expect(G.P!.lv).toBe(3);
    expect(G.P!.hp).toBe(G.P!.maxHp);
    expect(G.run!.kills).toBe(12);
  });
});

describe('upgrades', () => {
  beforeEach(quietField);

  it('each level-up earns one pick, offered as 3 different non-maxed upgrades', async () => {
    const { rollOffer, hasPendingUpgrade } = await import('../src/systems/upgrades.js');
    gainXp(PLAYER.xpToNext(1));
    expect(G.P!.pendingUpgrades).toBe(1);
    expect(hasPendingUpgrade()).toBe(true);
    G.P!.up = { keenEdge: 5, vitality: 5 }; // maxed: never offered
    for (let i = 0; i < 20; i++) {
      const offer = rollOffer();
      expect(new Set(offer).size).toBe(3);
      expect(offer).not.toContain('keenEdge');
      expect(offer).not.toContain('vitality');
    }
  });

  it('a pick applies its effect and spends the pending level', async () => {
    const { applyUpgrade, mods } = await import('../src/systems/upgrades.js');
    gainXp(PLAYER.xpToNext(1));
    const hp = G.P!.maxHp;
    applyUpgrade('vitality');
    expect(G.P!.maxHp).toBe(hp + 15);
    expect(G.P!.hp).toBe(G.P!.maxHp);
    expect(G.P!.pendingUpgrades).toBe(0);
    applyUpgrade('quickSlash');
    attack();
    expect(G.P!.atkCd).toBeCloseTo(PLAYER.attack.cd * 0.9);
    expect(mods().attackCd).toBeCloseTo(0.9);
  });

  it('upgrades and an unspent pick survive suspend and resume', async () => {
    const { snapshotRun, resumeRun } = await import('../src/world/floor.ts');
    G.P!.up = { swift: 2 }; G.P!.pendingUpgrades = 1; // quit with the picker open
    const snap = snapshotRun();
    startRun(2);
    resumeRun(snap);
    expect(G.P!.up).toEqual({ swift: 2 });
    expect(G.P!.pendingUpgrades).toBe(1);
  });
});

describe('ranged mobs', () => {
  beforeEach(quietField);
  const slinger = async () => {
    const { makeMob } = await import('../src/world/floor.ts');
    const m = makeMob(G.P!.x + 250, G.P!.y, false, G.F!.ranged); G.mobs.push(m); return m;
  };

  it('winds up at range, then fires a shot that hits a player who stands still', async () => {
    const m = await slinger();
    frame();
    expect(m.wind).toBeGreaterThan(0);         // in range: no walking in to melee
    frames(Math.ceil(m.def.wind * 60) + 2);
    expect(G.shots).toHaveLength(1);
    frames(60);
    expect(G.P!.hp).toBe(G.P!.maxHp - m.def.dmg);
    expect(G.shots).toHaveLength(0);
  });

  it('the shot can be sidestepped', async () => {
    const m = await slinger();
    frames(Math.ceil(m.def.wind * 60) + 3);
    G.P!.y += 80; // step out of the line after it fired
    frames(60);
    expect(G.P!.hp).toBe(G.P!.maxHp);
  });

  it('backs away when the player gets close', async () => {
    const m = await slinger(); m.x = G.P!.x + 60; m.cd = 99;
    frames(30);
    expect(m.x).toBeGreaterThan(G.P!.x + 60);
  });
});

describe('col and shop', () => {
  beforeEach(quietField);

  it('a kill drops its Gold', async () => {
    const { hurtEnemy } = await import('../src/systems/combat.js');
    const m = G.mobs[0]; m.hp = 1;
    hurtEnemy(m, 5, false);
    expect(G.P!.col).toBe(m.def.col);
  });

  it('buys only with enough Gold, potions cap at 3, scrolls get pricier and add a pick', async () => {
    const { buy, price } = await import('../src/systems/shop.js');
    expect(buy('potion')).toBe(false);
    G.P!.col = 1000;
    for (let i = 0; i < 4; i++) buy('potion');
    expect(G.P!.potions).toBe(3);
    const p1 = price('pick');
    expect(buy('pick')).toBe(true);
    expect(G.P!.pendingUpgrades).toBe(1);
    expect(price('pick')).toBeGreaterThan(p1);
    expect(G.P!.col).toBe(1000 - 3 * 40 - p1);
  });

  it('a potion heals half of max HP and is used up', async () => {
    const { drinkPotion } = await import('../src/systems/shop.js');
    G.P!.potions = 1; G.P!.hp = 10;
    drinkPotion();
    expect(G.P!.hp).toBe(10 + Math.round(G.P!.maxHp * 0.5));
    expect(G.P!.potions).toBe(0);
    drinkPotion(); // none left: nothing happens
    expect(G.P!.potions).toBe(0);
  });

  it('the merchant stands in the safe zone and can be reached', async () => {
    const { MERCHANT } = await import('../src/data/shop.ts');
    const { TOWN_X } = await import('../src/world/constants.ts');
    expect(MERCHANT.x).toBeLessThan(TOWN_X);
    G.P!.x = MERCHANT.x; G.P!.y = MERCHANT.y + 30;
    const { nearMerchant } = await import('../src/systems/shop.js');
    expect(nearMerchant()).toBe(true);
  });
});

describe('floor 4 boss volley', () => {
  beforeEach(() => {
    quietField(); loadFloor(3);
    for (const m of G.mobs) { m.hp = 0; m.dead = 1e9; }
    G.P!.x = ROOM_X + 100; G.P!.y = 600; frame();
  });

  it('fires one shot per telegraphed spoke, more in rage', () => {
    G.boss!.cd = 99;
    startBossMove('volley');
    expect(G.boss!.angs).toHaveLength(MOVES.volley.count[0]);
    frames(Math.ceil(MOVES.volley.wind[0] * 60) + 2);
    expect(G.shots.length).toBe(MOVES.volley.count[0]);
    G.boss!.hp = G.boss!.maxHp * 0.4; startBossMove('volley');
    expect(G.boss!.angs).toHaveLength(MOVES.volley.count[1]);
  });

  it('ponds block movement like trees', async () => {
    const { hitWall } = await import('../src/world/physics.ts');
    const p = G.F!.ponds![0];
    expect(hitWall({ x: p.x + p.w / 2, y: p.y + p.h / 2, r: 14 })).toBe(true);
  });
});

describe('combo and roll', () => {
  beforeEach(quietField);

  it('every 3rd chained swing is a finisher with a longer recovery', () => {
    const chain = Math.ceil(PLAYER.attack.cd * 60) + 1; // press again right after the cooldown, inside the window
    attack(); expect(G.P!.combo).toBe(0); frames(chain);
    attack(); expect(G.P!.combo).toBe(1); frames(chain);
    attack();
    expect(G.P!.combo).toBe(2);
    expect(G.P!.finisher).toBe(true);
    expect(G.P!.atkCd).toBeCloseTo(PLAYER.attack.cd * PLAYER.combo.cdMult);
  });

  it('the chain resets after a pause longer than the window', () => {
    attack(); frames(Math.ceil((PLAYER.attack.cd + PLAYER.combo.window) * 60) + 5);
    attack();
    expect(G.P!.combo).toBe(0);
  });

  it('the finisher hits harder than a normal swing', async () => {
    const { MOBS } = await import('../src/data/mobs.ts');
    const { makeMob } = await import('../src/world/floor.ts');
    const m = makeMob(G.P!.x + 40, G.P!.y, false, { ...MOBS.frenzyBoar, hp: 9999 }); G.mobs.push(m);
    mouse.x = m.x - G.cam.x; mouse.y = m.y - G.cam.y; frame(); // aim at the mob
    const chain = Math.ceil(PLAYER.attack.cd * 60) + 10, hits: number[] = []; // + a few frames of hit-stop, still inside the window
    for (let i = 0; i < 3; i++) { const hp = m.hp; attack(); hits.push(hp - m.hp); m.x = G.P!.x + 40; m.y = G.P!.y; m.kx = m.ky = 0; frames(chain); }
    expect(hits[2]).toBeGreaterThan(Math.max(hits[0], hits[1]));
  });

  it('a roll moves the player and dodges damage for its duration, then cools down', () => {
    const x = G.P!.x;
    keys.KeyD = true; roll(); hurtPlayer(50);
    expect(G.P!.hp).toBe(G.P!.maxHp);
    frames(Math.ceil(PLAYER.roll.time * 60) + 1); keys.KeyD = false;
    expect(G.P!.x).toBeGreaterThan(x + 80);
    roll(); expect(G.P!.roll).toBeLessThanOrEqual(0); // still cooling down
  });
});

describe('sword skills and memory shards', () => {
  beforeEach(quietField);
  const dummy = async (dx: number, dy: number) => {
    const { MOBS } = await import('../src/data/mobs.ts');
    const { makeMob } = await import('../src/world/floor.ts');
    const m = makeMob(G.P!.x + dx, G.P!.y + dy, false, { ...MOBS.frenzyBoar, hp: 9999, speed: 0, wanderSpeed: 0 }); G.mobs.push(m); return m; // a training dummy that stays put
  };
  const aim = (x: number, y: number) => { mouse.x = x - G.cam.x; mouse.y = y - G.cam.y; frame(); };

  it('slot 2 is empty by default and does nothing', () => {
    expect(G.P!.skills).toEqual(['sonicLeap', null]);
    skill(1);
    expect(G.P!.skillCd[1]).toBe(0);
  });

  it('Cyclone Edge hits all around, Piercing Fang hits far down the aim line only', async () => {
    const { SKILLS } = await import('../src/data/skills.ts');
    const front = await dummy(0, -70), back = await dummy(0, 70);
    G.P!.skills[1] = 'horizontal'; skill(1);
    expect(front.hp).toBeLessThan(9999); expect(back.hp).toBeLessThan(9999);
    expect(G.P!.skillCd[1]).toBeCloseTo(SKILLS.horizontal.cd);

    const far = await dummy(160, 0), side = await dummy(0, -70); // side is beside the stab line
    side.hp = 9999; aim(G.P!.x + 160, G.P!.y);
    G.P!.skills[1] = 'vorpal'; G.P!.skillCd[1] = 0; G.P!.delay = 0;
    skill(1); expect(far.hp).toBe(9999); // wind-up first
    frames(Math.ceil(SKILLS.vorpal.windup * 60) + 20); // + the hit-stop left over from the spin
    expect(far.hp).toBeLessThan(9999);
    expect(side.hp).toBe(9999);
  });

  it('shards are earned per run, unlock a skill once and equip it for the next character', async () => {
    const { meta } = await import('../src/core/save.ts');
    const { awardShards, unlockSkill, equipSkill } = await import('../src/systems/meta.js');
    const { SKILLS } = await import('../src/data/skills.ts');
    meta.shards = 0; meta.unlocked = ['sonicLeap']; meta.loadout = null;
    G.run!.kills = 40; G.run!.floor = 3;
    expect(awardShards(false)).toBe(10 + 2 * 10);
    expect(unlockSkill('vorpal')).toBe(false); // 30 < 60
    expect(unlockSkill('horizontal')).toBe(true);
    expect(meta.shards).toBe(30 - SKILLS.horizontal.cost);
    expect(unlockSkill('horizontal')).toBe(false); // already owned
    expect(meta.loadout).toBe('horizontal');
    startRun(3);
    expect(G.P!.skills).toEqual(['sonicLeap', 'horizontal']);
    equipSkill('horizontal'); expect(meta.loadout).toBeNull();
    meta.unlocked = ['sonicLeap']; meta.shards = 0;
  });
});

describe('armored and swarm mobs', () => {
  beforeEach(quietField);

  it('armor takes a quarter from normal hits, a heavy hit breaks it for full damage until it regrows', async () => {
    const { hurtEnemy } = await import('../src/systems/combat.js');
    const { MOBS } = await import('../src/data/mobs.ts');
    const { makeMob } = await import('../src/world/floor.ts');
    const m = makeMob(G.P!.x + 60, G.P!.y, false, { ...MOBS.taurusGuardian, hp: 9999 }); G.mobs.push(m);
    hurtEnemy(m, 40, false); expect(m.hp).toBe(9999 - 10);
    hurtEnemy(m, 40, true);  expect(m.hp).toBe(9999 - 50); // the breaking hit itself lands in full
    expect(m.armorT).toBeGreaterThan(0);
    hurtEnemy(m, 40, false); expect(m.hp).toBe(9999 - 90);
    m.armorT = 0;
    hurtEnemy(m, 40, false); expect(m.hp).toBe(9999 - 100);
  });

  it('swarm points spawn their whole group', () => {
    const extras = G.F!.extras!.find(e => e.group)!;
    const n = G.mobs.filter(m => m.def.name === 'Boar Piglet').length;
    expect(n).toBe(extras.at.length * extras.group!);
  });
});

describe('facing where you walk', () => {
  beforeEach(async () => { quietField(); (await import('../src/core/save.ts')).settings.aim = 'move'; });

  it('turns toward the walking direction and keeps facing it after stopping', () => {
    keys.KeyW = true; frames(5); keys.KeyW = false; frames(5);
    expect(G.P!.ang).toBeCloseTo(-Math.PI / 2);
  });

  it('an attack snaps to a nearby enemy roughly in front, but not to one behind', async () => {
    const { MOBS } = await import('../src/data/mobs.ts');
    const { makeMob } = await import('../src/world/floor.ts');
    keys.KeyD = true; frame(); keys.KeyD = false; // face right
    const front = makeMob(G.P!.x + 50, G.P!.y + 40, false, { ...MOBS.frenzyBoar, hp: 9999, speed: 0, wanderSpeed: 0 }); G.mobs.push(front);
    attack();
    expect(G.P!.ang).toBeCloseTo(Math.atan2(40, 50));
    expect(front.hp).toBeLessThan(9999);

    G.P!.ang = 0; front.hp = 0; front.dead = 1e9;
    G.mobs.push(makeMob(G.P!.x - 60, G.P!.y, false, { ...MOBS.frenzyBoar, hp: 9999, speed: 0, wanderSpeed: 0 }));
    G.P!.atkCd = 0; attack();
    expect(G.P!.ang).toBe(0);
  });
});

describe('boss portal', () => {
  beforeEach(() => {
    quietField();
    for (const m of G.mobs) { m.hp = 0; m.dead = 1e9; }
    G.P!.x = ROOM_X + 100; G.P!.y = 600; frame(); // wake the floor 1 boss
  });

  it('standing on the boss when it dies does not pull you through; walking back in after it opens does', async () => {
    const { hurtEnemy } = await import('../src/systems/combat.js');
    G.P!.x = G.boss!.x; G.P!.y = G.boss!.y;
    hurtEnemy(G.boss!, 99999, false);
    expect(G.portal).not.toBeNull();
    frames(Math.ceil(BOSS_RULES.portalDelay * 60) + 30);
    expect(G.floorIdx).toBe(0);                         // still on floor 1: never left the portal
    G.P!.x += 80; frame();                              // step out...
    G.P!.x -= 80; frames(10);                           // ...and back in
    expect(G.floorIdx).toBe(1);
  });

  it('cannot be entered before it finishes opening', async () => {
    const { hurtEnemy } = await import('../src/systems/combat.js');
    G.P!.x = G.boss!.x + 100; G.P!.y = G.boss!.y;
    hurtEnemy(G.boss!, 99999, false);
    frames(30);                                         // the death hit-stop passes with the player outside; still opening
    expect(G.portal!.wait).toBeGreaterThan(0);
    G.P!.x = G.portal!.x; frame();
    expect(G.floorIdx).toBe(0);
    frames(Math.ceil(BOSS_RULES.portalDelay * 60));
    expect(G.floorIdx).toBe(1);
  });
});
