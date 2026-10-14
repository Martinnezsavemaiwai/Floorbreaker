// Whole-game simulations: a scripted bot plays real runs headlessly.
import { describe, it, expect } from 'vitest';
import { G, STEP, startRun, enterRoom, frame, snapshot, createBot, playRun } from './harness.ts';
import { MOBS } from '../src/data/mobs.ts';
import { makeMob, scaled } from '../src/world/floor.ts';
import { keys, mouse } from '../src/core/input.ts';
import { skill } from '../src/systems/index.js';

describe('bot playthroughs', () => {
  const runs = [100, 101, 102, 103, 104, 105, 106, 107].map(seed => ({ seed, ...playRun(seed) }));

  it('never breaks invariants (no NaN positions, nobody inside walls, hp <= max)', () => {
    for (const r of runs) expect(r.violations, `seed ${r.seed}`).toEqual([]);
  });

  it('every run ends (death or clear) instead of getting stuck', () => {
    for (const r of runs) expect(r.over, `seed ${r.seed}: ${JSON.stringify(r)}`).not.toBe('timeout');
  });

  it('the game is beatable in some seeds and most runs reach floor 5', () => {
    // Balance guard (tuned: seeds 100-139 win ~65%, all reach floor 5): if a change makes this fail, the game got much harder or a floor transition broke
    expect(runs.some(r => r.over === 'win'), JSON.stringify(runs)).toBe(true);
    expect(runs.filter(r => r.floor >= 5).length, JSON.stringify(runs)).toBeGreaterThan(runs.length / 2);
  });
});

describe('bot pathing', () => {
  it('walks around a rock to a ranged mob that stands in range behind it (seed 109 stalled here)', () => {
    startRun(109); enterRoom(7); G.WALLS = [{ x: 284, y: 572, w: 80, h: 60 }]; // one rock between the player and the mob
    G.P!.x = 276.3; G.P!.y = 560.1; // the stall: on the rock's corner, 184 px from the mob: past its keep, inside its range, so it never moves
    const m = makeMob(325.4, 737.5, false, scaled(MOBS.taurusJavelineer)); m.aggro = true; G.mobs = [m];
    const think = createBot();
    for (let i = 0; i < 60 * 60 && m.hp > 0; i++) { think(); frame(); }
    expect(m.hp).toBeLessThanOrEqual(0);
  });
});

describe('determinism', () => {
  const playFor = (seed: number, seconds: number) => {
    startRun(seed);
    const think = createBot();
    for (let i = 0; i < seconds * 60 && !G.run!.over; i++) { think(); frame(); }
    return snapshot();
  };

  it('same seed + same inputs = identical game state (replays are possible)', () => {
    expect(playFor(7, 90)).toBe(playFor(7, 90));
  });

  it('a different seed plays out differently', () => {
    expect(playFor(7, 90)).not.toBe(playFor(8, 90));
  });
});

describe('fixed timestep', () => {
  // Hold right and fire the Blade Art at sim step 30; compare after exactly 120 sim steps
  const runAt = (frameDt: () => number) => {
    startRun(1);
    const P = G.P!; P.x = 900; P.y = 600;
    for (const m of G.mobs) { m.hp = 0; m.dead = 1e9; }
    mouse.x = 2000; mouse.y = 320; keys.KeyD = true;
    const steps = () => Math.round(G.run!.time / STEP);
    while (steps() < 120) { if (steps() === 30 && P.skillCd[0] <= 0) skill(); frame(frameDt()); }
    keys.KeyD = false;
    return { x: P.x.toFixed(3), skillCd: P.skillCd[0].toFixed(3), dash: P.dash.toFixed(3) };
  };

  it('gameplay is identical at 60, 144 and 30 Hz and with uneven frame times', () => {
    let k = 0;
    const at60 = runAt(() => 1 / 60);
    expect(runAt(() => 1 / 144)).toEqual(at60);
    expect(runAt(() => 1 / 30)).toEqual(at60);
    expect(runAt(() => (k++ % 3 === 0 ? 0.025 : 0.0125))).toEqual(at60);
  });
});
