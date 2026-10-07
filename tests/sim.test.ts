// Whole-game simulations: a scripted bot plays real runs headlessly.
import { describe, it, expect } from 'vitest';
import { G, STEP, startRun, frame, snapshot, createBot, playRun } from './harness.ts';
import { keys, mouse } from '../src/core/input.ts';
import { skill } from '../src/systems/index.js';

describe('bot playthroughs', () => {
  const runs = [1, 2, 3, 4, 5].map(seed => ({ seed, ...playRun(seed) }));

  it('never breaks invariants (no NaN positions, nobody inside walls, hp <= max)', () => {
    for (const r of runs) expect(r.violations, `seed ${r.seed}`).toEqual([]);
  });

  it('every run ends (death or clear) instead of getting stuck', () => {
    for (const r of runs) expect(r.over, `seed ${r.seed}: ${JSON.stringify(r)}`).not.toBe('timeout');
  });

  it('the game is beatable and most runs get past floor 1', () => {
    // Balance guard: if a change makes this fail, the game got much harder (or broke a floor transition)
    expect(runs.some(r => r.over === 'win'), JSON.stringify(runs)).toBe(true);
    expect(runs.filter(r => r.floor >= 2).length, JSON.stringify(runs)).toBeGreaterThanOrEqual(3);
  });
});

describe('determinism', () => {
  const playFor = (seed: number, seconds: number) => {
    startRun(seed);
    const think = createBot([5, 10, 15]);
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
  // Hold right and fire the Sword Skill at sim step 30; compare after exactly 120 sim steps
  const runAt = (frameDt: () => number) => {
    startRun(1);
    const P = G.P!; P.x = 900; P.y = 600;
    for (const m of G.mobs) { m.hp = 0; m.dead = 1e9; }
    mouse.x = 2000; mouse.y = 320; keys.KeyD = true;
    const steps = () => Math.round(G.run!.time / STEP);
    while (steps() < 120) { if (steps() === 30 && P.skillCd <= 0) skill(); frame(frameDt()); }
    keys.KeyD = false;
    return { x: P.x.toFixed(3), skillCd: P.skillCd.toFixed(3), dash: P.dash.toFixed(3) };
  };

  it('gameplay is identical at 60, 144 and 30 Hz and with uneven frame times', () => {
    let k = 0;
    const at60 = runAt(() => 1 / 60);
    expect(runAt(() => 1 / 144)).toEqual(at60);
    expect(runAt(() => 1 / 30)).toEqual(at60);
    expect(runAt(() => (k++ % 3 === 0 ? 0.025 : 0.0125))).toEqual(at60);
  });
});
