// Focused checks of individual mechanics, each in a quiet arena (mobs removed) on a fresh seeded run.
import { describe, it, expect, beforeEach } from 'vitest';
import { G, STEP, startRun, frame } from './harness.ts';
import { attack, skill, hurtPlayer, startBossMove } from '../src/systems/index.js';
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

  it('the Sword Skill dash dodges damage', () => {
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

  it('a kill drops its Col', async () => {
    const { hurtEnemy } = await import('../src/systems/combat.js');
    const m = G.mobs[0]; m.hp = 1;
    hurtEnemy(m, 5, false);
    expect(G.P!.col).toBe(m.def.col);
  });

  it('buys only with enough Col, potions cap at 3, scrolls get pricier and add a pick', async () => {
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
