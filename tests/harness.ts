// Headless game driver for tests: the real systems + fixed-step clock, no DOM, canvas or audio.
// It mirrors the play scene (gameplay until the run ends, effects always) so hit-stop, i-frames and timings
// behave exactly as in the browser. Level-up picks are taken instantly: the first card of each offer.
import { G } from '../src/world/state.ts';
import { newRun, loadFloor } from '../src/world/floor.ts';
import { hitWall } from '../src/world/physics.ts';
import { W, H } from '../src/world/constants.ts';
import { scenes, clock } from '../src/core/app.ts';
import { STEP } from '../src/core/loop.ts';
import { seedRng } from '../src/core/rng.ts';
import { settings } from '../src/core/save.ts';
import { keys, mouse, releaseAll } from '../src/core/input.ts';
import { dist, clamp, type Point } from '../src/core/math.ts';
import { updateGame, updateFx, attack, skill, roll } from '../src/systems/index.js';
import { nextPick, cardsFor, applyCard } from '../src/systems/build.js';
import { buy, drinkPotion } from '../src/systems/shop.js';

export { G, STEP };

const playScene = { name: 'play', update(dt: number) {
  if (!G.run!.over) updateGame(dt);
  updateFx(dt);
  for (let kind = nextPick(); !G.run!.over && kind; kind = nextPick()) { // take the first card, like the bots in e2e
    let cards = cardsFor(kind), follow;
    while ((follow = applyCard(cards[0], kind))) cards = follow;
    clock.hitStop = 0; // an evolution's flash freezes real play, but the instant pick has no screen to wait behind
  }
} };

export function startRun(seed = 1) {
  settings.aim = 'mouse'; // the bot aims with the (virtual) mouse
  seedRng(seed); releaseAll(); clock.acc = 0; clock.hitStop = 0; clock.scale = 1;
  newRun(); scenes.replace(playScene);
}
// Jump straight to a floor: a quiet battle room (waves stopped, no doors) or a boss floor with the player in the antechamber
export function enterRoom(i = 1) {
  loadFloor(i, { type: 'battle', reward: 'gold' });
  G.room!.cleared = true; G.doors = []; G.mobs = [];
  G.P!.x = 600; G.P!.y = 400; // CENTER_ZONE: every preset keeps it clear
}
export function enterBoss(i = 4) { loadFloor(i); G.mobs = []; }

// One rendered frame of `frameDt` real seconds (the clock runs as many fixed steps as that allows)
export const frame = (frameDt = STEP) => clock.advance(frameDt);

// Things that must never happen, checked after every frame
export function violations() {
  const out: string[] = [];
  for (const e of [G.P!, ...(G.boss!.hp > 0 ? [G.boss!] : []), ...G.mobs.filter(m => m.hp > 0)]) {
    if (![e.x, e.y].every(Number.isFinite)) out.push('non-finite position');
    if (e !== G.boss && hitWall(e)) out.push('entity inside a wall');
  }
  if (!(G.P!.hp <= G.P!.maxHp)) out.push('player hp above max');
  if (G.P!.x < 0 || G.P!.x > G.L!.w || G.P!.y < 0 || G.P!.y > G.L!.h) out.push('player outside the floor');
  return out;
}

// Snapshot used to compare two runs for determinism
export const snapshot = () => JSON.stringify({
  P: [G.P!.x, G.P!.y, G.P!.hp, G.P!.lv, G.P!.xp, G.P!.up], floor: G.floorIdx, over: G.run!.over ?? null,
  mobs: G.mobs.map(m => [m.x, m.y, m.hp]), boss: [G.boss!.x, G.boss!.y, G.boss!.hp, G.boss!.act],
});

// A scripted player for the 20-floor run: buys Potions in town, clears rooms (stepping out of telegraphs),
// takes the first door, and fights bosses the way the old bot did.
export function createBot() {
  let last = { x: 0, y: 0 }, stuck = 0, detour = 0, side = 1, dx = 0, dy = 0, tries = 0, free = 0; // walking straight into a tree: sidestep for a bit
  const walkTo = (tx: number, ty: number) => {
    const P = G.P!;
    // A straight sidestep, fixed at the start (re-aiming it every frame circles a near target and never clears the tree),
    // alternating sides and growing each try so any obstacle with one open side gets cleared; 5 s of free walking resets it
    if (detour > 0) { detour--; [tx, ty] = [P.x + dx, P.y + dy]; }
    else if (Math.hypot(P.x - last.x, P.y - last.y) < 0.5 && Math.hypot(tx - P.x, ty - P.y) > 30) {
      free = 0;
      if (++stuck > 60) { stuck = 0; detour = 40 * ++tries; side = -side; [dx, dy] = [-(ty - P.y) * side, (tx - P.x) * side]; }
    } else { stuck = 0; if (++free > 300) tries = 0; }
    last = { x: P.x, y: P.y };
    keys.KeyD = tx > P.x + 5; keys.KeyA = tx < P.x - 5; keys.KeyS = ty > P.y + 5; keys.KeyW = ty < P.y - 5;
  };
  const away = (from: Point, k = 5) => walkTo(G.P!.x + (G.P!.x - from.x) * k + 1, G.P!.y + (G.P!.y - from.y) * k + 1);
  const aim = (e: Point) => {
    const P = G.P!, L = G.L!;
    G.cam.x = clamp(P.x - W / 2, 0, L.w - W); G.cam.y = clamp(P.y - H / 2, 0, L.h - H);
    mouse.x = e.x - G.cam.x; mouse.y = e.y - G.cam.y;
  };
  const fight = (tg: Point & { wind?: number; r: number }) => {
    const P = G.P!; aim(tg);
    if (tg.wind && tg.wind > 0 && tg.wind < 0.2) { away(tg, 3); if (dist(P, tg) < 80) roll(); return; }
    walkTo(tg.x, tg.y);
    if (dist(P, tg) < tg.r + 50) { attack(); if (P.skillCd[0] <= 0) skill(); if (P.skills[1] && P.skillCd[1] <= 0) skill(1); if (P.skills[2] && P.skillCd[2] <= 0) skill(2); }
  };
  return function think() {
    const { P, boss, mobs, L } = G as Required<typeof G>;
    if (P.hp < P.maxHp * 0.35 && P.potions > 0) drinkPotion();
    if (G.portal) return G.portal.armed ? walkTo(G.portal.x, G.portal.y) : away(G.portal); // step out first, then in
    if (L.kind === 'town' && L.merchant && P.col >= 40 && P.potions < 3) {
      if (dist(P, L.merchant) > 40) return walkTo(L.merchant.x, L.merchant.y + 30);
      buy('potion'); return;
    }
    if (G.doors.length) { const d = G.doors[0]; return walkTo(d.x + d.w / 2, d.y + d.h / 2); }
    if (L.kind === 'room') {
      const tg = mobs.filter(m => m.hp > 0).sort((a, b) => dist(P, a) - dist(P, b))[0];
      return tg ? fight(tg) : walkTo(L.w / 2, L.h / 2);
    }
    if (L.kind !== 'boss') return;
    if (P.x < L.roomX + 80) return walkTo(L.roomX + 100, L.h / 2);
    const adds = mobs.filter(m => m.hp > 0 && m.summoned).sort((a, b) => dist(P, a) - dist(P, b))[0];
    const act = boss.act; aim(boss);
    const spot = act === 'roots' && boss.spots!.find(s => dist(s, P) < 100);
    if (spot) { away(spot); if (boss.t < 0.3) roll(); }
    else if (act === 'slam' && dist(P, boss) < 170) { away(boss); if (boss.t < 0.3) roll(); }
    else if (act === 'leap' && dist(P, boss.to!) < 140) away(boss.to!);
    else if (act === 'volley' && dist(P, boss) < 260) away(boss);
    else if (act === 'charge') walkTo(P.x, P.y + (Math.sin(boss.ang) > 0 ? -200 : 200));
    else if (act === 'wave' && Math.abs(dist(boss, P) - boss.waveR!) < 70 && dist(boss, P) > boss.waveR! && P.skillCd[0] <= 0) skill();
    else if (adds && dist(P, adds) < 120) fight(adds);
    else { walkTo(boss.x, boss.y); if (dist(P, boss) < boss.r + 50) { attack(); if (P.skillCd[0] <= 0) skill(); if (P.skills[1] && P.skillCd[1] <= 0) skill(1); if (P.skills[2] && P.skillCd[2] <= 0) skill(2); } }
  };
}

// Play a whole run with the bot. Returns the outcome plus any invariant violations seen along the way.
export function playRun(seed: number, maxSeconds = 3600) {
  startRun(seed);
  const think = createBot(), seen = new Set<string>();
  let frames = 0;
  for (; frames < maxSeconds * 60 && !G.run!.over; frames++) {
    think(); frame();
    for (const v of violations()) seen.add(v);
  }
  releaseAll();
  return { over: G.run!.over ?? 'timeout', floor: G.floorIdx + 1, lv: G.P!.lv, seconds: Math.round(frames / 60), violations: [...seen] };
}
