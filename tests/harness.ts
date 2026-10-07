// Headless game driver for tests: the real systems + fixed-step clock, no DOM, canvas or audio.
// It mirrors the play scene (gameplay until the run ends, effects always) so hit-stop, i-frames and timings
// behave exactly as in the browser. Level-up picks are taken instantly: the first card of each offer.
import { G } from '../src/world/state.ts';
import { newRun } from '../src/world/floor.ts';
import { hitWall } from '../src/world/physics.ts';
import { W, H, WORLD, TOWN_X, ROOM_X } from '../src/world/constants.ts';
import { scenes, clock } from '../src/core/app.ts';
import { STEP } from '../src/core/loop.ts';
import { seedRng } from '../src/core/rng.ts';
import { keys, mouse, releaseAll } from '../src/core/input.ts';
import { dist, clamp, type Point } from '../src/core/math.ts';
import { updateGame, updateFx, attack, skill, roll } from '../src/systems/index.js';
import { rollOffer, applyUpgrade, hasPendingUpgrade } from '../src/systems/upgrades.js';

export { G, STEP };

const playScene = { name: 'play', update(dt: number) {
  if (!G.run!.over) updateGame(dt);
  updateFx(dt);
  while (!G.run!.over && hasPendingUpgrade()) applyUpgrade(rollOffer()[0]);
} };

export function startRun(seed = 1) {
  seedRng(seed); releaseAll(); clock.acc = 0; clock.hitStop = 0; clock.scale = 1;
  newRun(); scenes.replace(playScene);
}
// One rendered frame of `frameDt` real seconds (the clock runs as many fixed steps as that allows)
export const frame = (frameDt = STEP) => clock.advance(frameDt);

// Things that must never happen, checked after every frame
export function violations() {
  const out: string[] = [];
  for (const e of [G.P!, G.boss!, ...G.mobs.filter(m => m.hp > 0)]) {
    if (![e.x, e.y].every(Number.isFinite)) out.push('non-finite position');
    if (e !== G.boss && hitWall(e)) out.push('entity inside a wall');
  }
  if (!(G.P!.hp <= G.P!.maxHp)) out.push('player hp above max');
  return out;
}

// Snapshot used to compare two runs for determinism
export const snapshot = () => JSON.stringify({
  P: [G.P!.x, G.P!.y, G.P!.hp, G.P!.lv, G.P!.xp, G.P!.up], floor: G.floorIdx, over: G.run!.over ?? null,
  mobs: G.mobs.map(m => [m.x, m.y, m.hp]), boss: [G.boss!.x, G.boss!.y, G.boss!.hp, G.boss!.act],
});

// A scripted player: grinds mobs to a target level per floor, heals in town, then fights the boss while
// stepping out of telegraphs. Same logic as the console bot used during development.
export function createBot(levelGoals: number[]) {
  let phase: 'grind' | 'heal' | 'boss' = 'grind', floor = 0;
  const walkTo = (tx: number, ty: number) => {
    const P = G.P!;
    keys.KeyD = tx > P.x + 5; keys.KeyA = tx < P.x - 5; keys.KeyS = ty > P.y + 5; keys.KeyW = ty < P.y - 5;
  };
  const away = (from: Point, k = 5) => walkTo(G.P!.x + (G.P!.x - from.x) * k + 1, G.P!.y + (G.P!.y - from.y) * k + 1);
  const aim = (e: Point) => {
    const P = G.P!;
    G.cam.x = clamp(P.x - W / 2, 0, WORLD.w - W); G.cam.y = clamp(P.y - H / 2, 0, WORLD.h - H);
    mouse.x = e.x - G.cam.x; mouse.y = e.y - G.cam.y;
  };
  return function think() {
    const { P, boss, mobs } = G as Required<typeof G>;
    if (G.floorIdx !== floor) { floor = G.floorIdx; phase = 'grind'; }
    const goal = levelGoals[G.floorIdx];
    if (G.portal) return walkTo(G.portal.x, G.portal.y);
    if (phase === 'heal') { walkTo(150, 600); if (P.hp >= P.maxHp) phase = P.lv >= goal ? 'boss' : 'grind'; return; }
    if (phase === 'grind') {
      if (P.hp < P.maxHp * 0.4) { phase = 'heal'; return; }
      if (P.lv >= goal) { phase = 'boss'; return; }
      const tg = mobs.filter(m => m.hp > 0 && m.x > TOWN_X).sort((a, b) => dist(P, a) - dist(P, b))[0];
      if (!tg) return;
      aim(tg);
      if (tg.wind > 0 && tg.wind < 0.2) { away(tg, 3); if (dist(P, tg) < 80) roll(); return; }
      walkTo(tg.x, tg.y);
      if (dist(P, tg) < 60) { attack(); if (P.skillCd <= 0) skill(); }
      return;
    }
    if (P.x < ROOM_X + 80) return walkTo(ROOM_X + 100, 600);
    const adds = mobs.filter(m => m.hp > 0 && m.summoned).sort((a, b) => dist(P, a) - dist(P, b))[0];
    const act = boss.act; aim(boss);
    const spot = act === 'roots' && boss.spots!.find(s => dist(s, P) < 100);
    if (spot) { away(spot); if (boss.t < 0.3) roll(); }
    else if (act === 'slam' && dist(P, boss) < 170) { away(boss); if (boss.t < 0.3) roll(); }
    else if (act === 'leap' && dist(P, boss.to!) < 140) away(boss.to!);
    else if (act === 'volley' && dist(P, boss) < 260) away(boss);
    else if (act === 'charge') walkTo(P.x, P.y + (Math.sin(boss.ang) > 0 ? -200 : 200));
    else if (act === 'wave' && Math.abs(dist(boss, P) - boss.waveR!) < 70 && dist(boss, P) > boss.waveR! && P.skillCd <= 0) skill();
    else if (adds && dist(P, adds) < 120) { aim(adds); walkTo(adds.x, adds.y); attack(); }
    else { walkTo(boss.x, boss.y); if (dist(P, boss) < boss.r + 50) { attack(); if (P.skillCd <= 0) skill(); } }
  };
}

// Play a whole run with the bot. Returns the outcome plus any invariant violations seen along the way.
export function playRun(seed: number, levelGoals = [5, 10, 15, 20], maxSeconds = 2400) {
  startRun(seed);
  const think = createBot(levelGoals), seen = new Set<string>();
  let frames = 0;
  for (; frames < maxSeconds * 60 && !G.run!.over; frames++) {
    think(); frame();
    for (const v of violations()) seen.add(v);
  }
  releaseAll();
  return { over: G.run!.over ?? 'timeout', floor: G.floorIdx + 1, lv: G.P!.lv, seconds: Math.round(frames / 60), violations: [...seen] };
}
