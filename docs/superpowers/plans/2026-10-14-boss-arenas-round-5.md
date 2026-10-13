# Boss Arenas, Round 5 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give each of the 4 boss rooms one mechanic of its own (rockfall, pillars, fog, flood), a boss intro card when the boss wakes, and a short defeat scene.

**Architecture:**
- Each boss gets an `arena` id plus its arena numbers in `src/data/bosses.ts`.
- Arena state lives in `G.arena`. It is reset by `loadFloor` and built for boss floors only.
- A new `src/systems/arena.js` holds `buildArena()` (called by `loadFloor`), `updateArena(dt)` (called by `updateGame` after `updateBoss`) and the hooks the boss AI calls (`onSlam`, `onDashBlocked`, the fog sprout logic).
- `src/render/world.js` draws arena layers: floor warnings, pillars, platforms, water and the fog mask.
- The intro card and the defeat card are one DOM element, `#boss-card`, driven by the existing `bossWake` / `bossDeath` events.
- Every warning emits an `arenaWarn` event, and `src/audio/audio.js` gives it an existing SFX.

**Tech Stack:** Vanilla JS + TypeScript (checked JS), Vite, Zod, Vitest, Playwright (local Chrome).

**Spec:** `docs/superpowers/specs/2026-10-09-twenty-floor-run-design.md`, section "บอส" (the arena table is binding) and the tests list ("กลไกห้องบอสทั้ง 4 แบบ"). This is round 5 of its order.

## Global Constraints

- Arena table (binding):
  - Floor 5, Grask, `rockfall`: every slam drops 3 rocks from the ceiling, each with a 0.8 s shadow warning before it lands.
  - Floor 10, Bullgard, `pillars`: 4 stone pillars. When the boss charges into a pillar it is stunned for 2 s and takes ×1.5 damage. A pillar breaks after 2 hits.
  - Floor 15, Elderroot, `fog`: the circle of vision slowly shrinks. Hitting a root that sprouts makes it grow back.
  - Floor 20, Marisca, `flood`: the floor floods every 12 s for 4 s. Standing on one of 3 stone platforms avoids the damage. Below 25% HP she enters phase 3 and floods come more often.
- Numbers the spec leaves open (this plan sets them; balance is round 6):
  - **Rockfall:** rock radius 50. One rock targets the player's position at slam time and 2 land at seeded random spots in the boss room. Each rock deals 0.6× the boss's slam damage.
  - **Pillars:** placed at (640,240), (640,660), (1160,240), (1160,660), 56×56 each.
  - **Fog:** vision radius starts at 520 and shrinks 14 px/s down to a floor of 150. A root sprout grows at each spot of the boss's `roots` move (spots 2+, not the one under the player), lives 6 s and has 30 HP. Killing one restores 140 px of radius, capped at 520. Sprouts give no XP or Gold and don't count as kills.
  - **Flood:** platforms are circles of radius 64 at (640,220), (640,680), (1180,450). There is a 1.5 s warning (rising water tint) before each flood. While flooded, standing off every platform deals 8% of max HP every 0.5 s. The cycle is 12 s, and 7 s in phase 3 (boss HP < 25%). The boss isn't affected.
- Every mechanic shows a visual warning before it hurts, and `arenaWarn` plays a sound.
- The intro card shows the boss name, a TH/EN epithet and a one-line TH/EN hint about the arena. It does not pause the game and fades after about 3 s. The defeat scene is a short freeze (`kick` hitstop 0.6 s, raised from the current 0.35), the card showing the boss name struck through, then the portal or ending as now.
- All gameplay randomness uses the seeded `rng()` (`rand`/`pick` from `core/math.ts`). Cosmetic particles may keep `Math.random`.
- Text: TH/EN pairs, plain voice, no " · " joining sentences, no em dashes. Boss names stay English.
- Arena state is never saved: suspend restarts the floor (`G.entry`), and `loadFloor` rebuilds it.
- **Commits:** the user commits (global CLAUDE.md). "Propose commit" means run `git status` and `git diff --stat`, then report the message. Never run `git commit`.
- `npm run check` must pass at the end of every task.

## File Structure

| File | Responsibility |
|---|---|
| `src/data/bosses.ts` | `arena` id + `ARENA` numbers per type; `epithet: Text`, `hint: Text` per boss |
| `src/systems/arena.js` (create) | build/update for each arena; hooks the boss AI calls |
| `src/systems/boss.js` | call `onSlam`, detect a charge blocked by a pillar, skip AI while stunned, sprout spawning on roots |
| `src/systems/combat.js` | ×1.5 damage to a stunned boss; sprout kills; defeat freeze |
| `src/systems/mobs.js` | sprouts don't act |
| `src/systems/index.js` | `updateArena(dt)` |
| `src/world/state.ts`, `src/world/floor.ts` | `G.arena`, `Boss.stun`, `Mob.sprout`, build/reset on load |
| `src/render/world.js` | arena drawing |
| `index.html`, `src/style.css`, `src/ui/screens.js` | `#boss-card` |
| `src/audio/audio.js`, `src/core/events.ts` | `arenaWarn` |
| `tests/arena.test.ts` (create), `tests/harness.ts`, `e2e/*` | tests and bots |

---

### Task 1: Arena framework and rockfall

**Files:**
- Create: `src/systems/arena.js`, `tests/arena.test.ts`
- Modify: `src/data/bosses.ts`, `src/systems/boss.js`, `src/systems/index.js`, `src/world/state.ts`, `src/world/floor.ts`, `src/render/world.js`, `src/core/events.ts`, `src/audio/audio.js`, `src/main.js` (dev hook `arena` getter)

**Interfaces:**
- Produces:
  - `type ArenaId = 'rockfall' | 'pillars' | 'fog' | 'flood'`
  - `BossStats.arena: ArenaId`
  - `ARENA = { rockfall: { rocks: 3, warn: 0.8, radius: 50, dmgMult: 0.6 }, pillars: {...}, fog: {...}, flood: {...} }`, with the numbers from Global Constraints, filled in per task
  - `G.arena: { id: ArenaId; rocks: { x, y, t }[]; …per-type state } | null`
  - arena.js exports `buildArena(id)`, `updateArena(dt)`, `onSlam(boss)`
  - event `arenaWarn: ArenaId`

- [ ] **Step 1: Write the failing tests**

Create `tests/arena.test.ts`:

```ts
// Boss arena mechanics (spec "บอส"): each boss room has one mechanic, always warned before it hurts.
import { describe, it, expect, beforeEach } from 'vitest';
import { G, startRun, enterBoss, frame } from './harness.ts';
import { startBossMove } from '../src/systems/boss.js';
import { ARENA, BOSSES } from '../src/data/bosses.ts';

const frames = (n: number) => { for (let i = 0; i < n; i++) frame(); };
// Wake the boss with the player in the room, then keep the player safe from the boss itself
function awake(i: number) {
  startRun(1); enterBoss(i);
  G.P!.x = G.L!.roomX + 120; G.P!.y = G.L!.h / 2; frame();
  expect(G.boss!.awake).toBe(true);
}

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
    const hp = G.P!.hp; G.P!.y -= 120; G.P!.inv = 0;
    frames(60);
    expect(G.P!.hp).toBe(hp);
  });

  it('a floor without an arena has none', () => {
    startRun(1); expect(G.arena).toBeNull();
  });
});
```

Check `enterBoss` in `tests/harness.ts`. If the boss's own movement or moves interfere, freeze it in the test with `G.boss!.cd = 999` and keep it far away. Keep the assertions. The rock aimed at the player might share its spot with a random rock; the `some(...)` check tolerates that. The 2 random rocks must not land within 60 px of the player rock, so retry the draw with `rand` (at most 10 tries) and keep the test deterministic.

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run tests/arena.test.ts` → FAIL.

- [ ] **Step 3: Data (`src/data/bosses.ts`)**

- `export type ArenaId = 'rockfall' | 'pillars' | 'fog' | 'flood';`
- `BossStats` gains `arena: ArenaId`.
- Set `arena` on the 4 bosses per the table.
- Add `export const ARENA = { rockfall: { rocks: 3, warn: 0.8, radius: 50, dmgMult: 0.6, spread: 60 } };`. Later tasks add their own keys.

- [ ] **Step 4: State and wiring**

- `state.ts`: `G.arena: null as Arena | null`, where `Arena = { id: ArenaId; rocks: { x: number; y: number; t: number }[] } & Record<string, unknown>`. Tighten the type per task as fields are added.
- `floor.ts` `loadFloor`: `G.arena = kind === 'boss' ? buildArena(G.F.boss.arena) : null;`, after the boss is placed. Import from arena.js. If that creates a floor.ts → systems import cycle, check how floor.ts already imports systems (it imports rooms.js), and follow the same pattern.
- `index.js` `updateGame`: `updateArena(dt)` after `updateBoss(dt)`.
- `boss.js` `RESOLVE.slam`: call `onSlam(b)` after the impact.
- `events.ts`: `arenaWarn: string;`. In `audio.js`, `on('arenaWarn', …)` plays an existing short warning-like SFX; read audio.js and pick the closest, e.g. the one used for `bossWind`.
- `main.js` dev hook: an `arena: () => G.arena` getter.

- [ ] **Step 5: arena.js**

```js
// Boss arena mechanics: one per boss room (data in bosses.ts ARENA). Every hazard is warned before it hurts.
import { G } from '../world/state.ts';
import { ARENA } from '../data/bosses.ts';
import { rand, dist } from '../core/math.ts';
import { emit } from '../core/events.ts';
import { hurtPlayer } from './combat.js';
import { burst, ring, kick } from './fx.js';

export function buildArena(id) {
  return { id, rocks: [] };
}
// A random spot inside the boss room, away from `avoid` (spread px)
function roomSpot(avoid, spread) {
  const L = G.L;
  for (let k = 0; ; k++) {
    const p = { x: rand(L.roomX + 80, L.w - 60), y: rand(60, L.h - 60) };
    if (k >= 10 || avoid.every(a => dist(a, p) >= spread)) return p;
  }
}
export function onSlam() {
  const A = G.arena; if (A?.id !== 'rockfall') return;
  const R = ARENA.rockfall, P = G.P, first = { x: P.x, y: P.y }, spots = [first];
  while (spots.length < R.rocks) spots.push(roomSpot(spots, R.spread));
  for (const s of spots) A.rocks.push({ ...s, t: R.warn });
  emit('arenaWarn', 'rockfall');
}
export function updateArena(dt) {
  const A = G.arena; if (!A || !G.boss.awake || G.boss.hp <= 0) return;
  if (A.id === 'rockfall') {
    const R = ARENA.rockfall;
    A.rocks = A.rocks.filter(r => {
      if ((r.t -= dt) > 0) return true;
      burst(r.x, r.y, 18, '#8a7a6a', 280, 0.5, 7, false); ring(r.x, r.y, 10, R.radius, 0.3, '200,180,150'); kick(0.03, 8);
      if (dist(r, G.P) < R.radius + G.P.r) hurtPlayer(Math.round(G.F.boss.dmg.slam * R.dmgMult), r);
      return false;
    });
  }
}
```

Damage passes through `hurtPlayer`, so dodges, Riposte and assist all apply. In the second test the rocks stop doing anything once the boss dies, which is fine. If `G.F.boss.dmg.slam` is cursed/raged elsewhere, use the same formula `boss.js` uses (`bossDmg`). Export a `bossDmg` from boss.js, or compute it locally with `rage()` and `BOSS_RULES.rageDmgMult`, and adjust the test's expected value to match.

- [ ] **Step 6: Render**

In `world.js`, draw rock shadows on the floor layer before the actors. Each shadow is a dark ellipse whose radius grows from 0.4R to R as `t` runs down, with a red rim in the last 0.25 s. Add a short falling rock sprite (a grey circle dropping from above) in the last 0.2 s. Write this as `drawArena()`; each later task adds its own branch.

- [ ] **Step 7: Run the tests**

Run: `npx tsc -p . && npx vitest run && npx playwright test e2e/smoke.spec.ts` → PASS. Report `tests/sim.test.ts` per-seed changes; don't tune.

- [ ] **Step 8: Propose commit**

`feat: add boss arenas and Grask's rockfall`

---

### Task 2: Pillars (Bullgard)

**Files:**
- Modify: `src/data/bosses.ts`, `src/systems/arena.js`, `src/systems/boss.js`, `src/systems/combat.js`, `src/world/state.ts`, `src/render/world.js`
- Test: `tests/arena.test.ts`

**Interfaces:**
- Produces:
  - `ARENA.pillars = { at: [[640,240],[640,660],[1160,240],[1160,660]], size: 56, hits: 2, stun: 2, stunDmg: 1.5 }`
  - `G.arena.pillars: { x, y, w, h, hits: number }[]`. Their rects are also pushed into `G.WALLS` while standing.
  - `Boss.stun: number`
  - arena.js `onDashBlocked(boss): boolean`

- [ ] **Step 1: Write the failing tests** (append)

```ts
describe('pillars (Bullgard, floor 10)', () => {
  beforeEach(() => awake(9));

  it('4 pillars stand as walls', () => {
    expect(G.arena!.pillars).toHaveLength(4);
    const p = G.arena!.pillars[0];
    expect(G.WALLS).toContainEqual({ x: p.x, y: p.y, w: p.w, h: p.h });
  });

  it('charging into a pillar stuns the boss for 2 s; it takes x1.5 damage meanwhile; 2 hits break the pillar', async () => {
    const { hurtEnemy } = await import('../src/systems/combat.js');
    const p = G.arena!.pillars[0], b = G.boss!;
    b.x = p.x + p.w / 2 + 160; b.y = p.y + p.h / 2; b.cd = 999;
    G.P!.x = p.x - 80; G.P!.y = b.y;                    // the pillar sits between them
    startBossMove('charge'); frames(90);
    expect(b.stun).toBeGreaterThan(0);
    expect(p.hits).toBe(1);
    const hp = b.hp; hurtEnemy(b, 100, false); expect(hp - b.hp).toBe(150);
    frames(130); expect(b.stun).toBeLessThanOrEqual(0);
    b.x = p.x + p.w / 2 + 160; b.y = p.y + p.h / 2; startBossMove('charge'); frames(90);
    expect(G.arena!.pillars).toHaveLength(3);
    expect(G.WALLS).not.toContainEqual({ x: p.x, y: p.y, w: p.w, h: p.h });
  });

  it('a stunned boss does nothing', () => {
    const b = G.boss!; b.stun = 2; b.cd = 0; const x = b.x;
    frames(30);
    expect(b.act).toBeNull(); expect(b.x).toBe(x);
  });
});
```

Charging aims at the player at wind start, so check how `startBossMove('charge')` sets `b.ang`. Read boss.js; it may set the angle in `RESOLVE.charge` or during the walk. Make the setup put the pillar on the line. Keep the claims.

- [ ] **Step 2: Run to verify they fail** → FAIL.

- [ ] **Step 3: Implement**

- `buildArena('pillars')`: build the pillar rects from `ARENA.pillars.at`, centred on each point, `hits: 0`. Push copies into `G.WALLS`, keeping the same object for equality, or remove them by matching x/y.
- `boss.js` `ACTIVE.dash`: when the dash stops because the boss didn't move (the existing `b.x === ox && b.y === oy` branch), call `onDashBlocked(b)` before `endAct()`.
- `onDashBlocked`:
  - Find the pillar whose rect, grown by `b.r + 6`, contains the boss centre.
  - If found: `p.hits++`, `b.stun = ARENA.pillars.stun`, a burst of stone and a ring, `kick(0.08, 14)`, and `emit('arenaWarn', 'pillars')`.
  - If `p.hits >= ARENA.pillars.hits`, remove the pillar from `G.arena.pillars` and `G.WALLS`, with a bigger burst.
  - Return whether a pillar was hit.
- `updateBoss`: after the wake check, add `if (b.stun > 0) { b.stun -= dt; return; }`, placed so that status ticking (`tickStatus`) still runs.
- `combat.js` `hurtEnemy`: on the boss, `if (e === G.boss && e.stun > 0) d = Math.round(d * ARENA.pillars.stunDmg);` before applying the damage. It must apply to every damage source that goes through `hurtEnemy`, but not to DoT (`dot()`).
- `state.ts` Boss: `stun?: number`. `floor.ts` resets it with the boss.

- [ ] **Step 4: Render**

- Pillars are stone blocks with a cracked look after one hit; draw them with the actors, sorted by y.
- A stunned boss gets circling stars above its head while `stun > 0`.

- [ ] **Step 5: Run the tests**

Run: `npx tsc -p . && npx vitest run && npx playwright test e2e/smoke.spec.ts` → PASS.

- [ ] **Step 6: Propose commit**

`feat: add Bullgard's breakable pillars`

---

### Task 3: Fog and root sprouts (Elderroot)

**Files:**
- Modify: `src/data/bosses.ts`, `src/data/mobs.ts` (sprout stats), `src/systems/arena.js`, `src/systems/boss.js`, `src/systems/combat.js`, `src/systems/mobs.js`, `src/world/state.ts`, `src/render/world.js`
- Test: `tests/arena.test.ts`

**Interfaces:**
- Produces:
  - `ARENA.fog = { start: 520, min: 150, shrink: 14, restore: 140, sproutLife: 6 }`
  - `MOBS.rootSprout` (hp 30, speed 0, dmg 0, radius 18, xp 0, col 0)
  - `Mob.sprout?: boolean`, `Mob.life?: number`
  - `G.arena.vision: number`

- [ ] **Step 1: Write the failing tests** (append)

```ts
describe('fog (Elderroot, floor 15)', () => {
  beforeEach(() => awake(14));

  it('vision starts at 520 and shrinks 14 px/s to a floor of 150', () => {
    G.boss!.cd = 999;
    expect(G.arena!.vision).toBe(ARENA.fog.start);
    frames(60); expect(G.arena!.vision).toBeCloseTo(ARENA.fog.start - ARENA.fog.shrink, 0);
    frames(60 * 40); expect(G.arena!.vision).toBe(ARENA.fog.min);
  });

  it('roots leave sprouts at their extra spots; killing one restores vision, pays nothing, and they wither after 6 s', async () => {
    const { hurtEnemy } = await import('../src/systems/combat.js');
    G.boss!.cd = 999; G.arena!.vision = 200;
    startBossMove('roots'); frames(Math.ceil(0.95 * 60) + 2);
    const sprouts = G.mobs.filter(m => m.sprout && m.hp > 0);
    expect(sprouts.length).toBe(G.boss!.spots!.length - 1);
    const col = G.P!.col, kills = G.run!.kills;
    hurtEnemy(sprouts[0], 999, true);
    expect(G.arena!.vision).toBeCloseTo(200 + ARENA.fog.restore - ARENA.fog.shrink * 0, -1);
    expect(G.P!.col).toBe(col); expect(G.run!.kills).toBe(kills);
    frames(60 * 6 + 5);
    expect(G.mobs.filter(m => m.sprout && m.hp > 0)).toHaveLength(0);
  });

  it('sprouts never attack or move', () => {
    G.boss!.cd = 999; startBossMove('roots'); frames(70);
    const s = G.mobs.find(m => m.sprout)!; const x = s.x;
    G.P!.x = s.x + 20; G.P!.y = s.y; const hp = G.P!.hp;
    frames(120); expect(s.x).toBe(x); expect(G.P!.hp).toBe(hp);
  });
});
```

The restore assertion tolerates the few frames of shrink between kill and check; adjust its precision if needed. The vision is capped at `start`.

- [ ] **Step 2: Run to verify they fail** → FAIL.

- [ ] **Step 3: Implement**

- `buildArena('fog')` → `{ id, rocks: [], vision: ARENA.fog.start }`. `updateArena`: `vision = Math.max(min, vision - shrink * dt)`.
- `boss.js` `RESOLVE.roots`: when the arena is `fog`, spawn a sprout at every spot except the first (`makeMob(s.x, s.y, false, MOBS.rootSprout)`, then `m.sprout = true; m.life = ARENA.fog.sproutLife; m.aggro = false`). Do this through an arena.js helper `onRoots(b)`.
- `mobs.js`: a sprout skips all AI, movement and attacks. It only ticks status and `life`; at `life <= 0` it withers: `hp = 0; dead = Infinity`, no reward, small fx.
- `combat.js` `kill(e)`: if `e.sprout`, call arena.js `onSproutKilled()` (vision += restore, capped at start), add fx, and return before the XP/Gold/kills lines.
- Room clear and boss checks must ignore sprouts. Check `rooms.js` / `boss.js`: on a boss floor there are no room waves, and summons only check `summoned`.
- `MOBS.rootSprout`: copy the shape of an existing mob def with harmless values. Give it an image the mob renderer already has, or draw it in `drawMob` as a special case (a small green root shape) when `m.sprout`.

- [ ] **Step 4: Render (fog mask)**

After the world and before the HUD, when `G.arena?.id === 'fog'`, draw a full-screen darkness with a soft circular hole of radius `vision` centred on the player:
- Fill the screen with `rgba(4,8,6,.94)` on an offscreen canvas.
- Cut the hole with `destination-out` and a radial gradient.
- Draw the result.

Sprouts inside the darkness should still show a faint glow so the player can find them: draw them again after the mask at low alpha. When vision drops below 220, emit `arenaWarn` once per drop below that line.

- [ ] **Step 5: Run the tests**

Run: `npx tsc -p . && npx vitest run && npx playwright test e2e/smoke.spec.ts` → PASS.

- [ ] **Step 6: Propose commit**

`feat: add Elderroot's fog and root sprouts`

---

### Task 4: Flood and platforms (Marisca)

**Files:**
- Modify: `src/data/bosses.ts`, `src/systems/arena.js`, `src/render/world.js`
- Test: `tests/arena.test.ts`

**Interfaces:**
- Produces:
  - `ARENA.flood = { every: 12, everyLate: 7, lateAt: 0.25, warn: 1.5, last: 4, tick: 0.5, dmg: 0.08, platforms: [[640,220],[640,680],[1180,450]], platR: 64 }`
  - `G.arena.flood: { t: number /* time to next warning */; warn: number; on: number; tick: number }`
  - arena.js `onPlatform(p): boolean`

- [ ] **Step 1: Write the failing tests** (append)

```ts
describe('flood (Marisca, floor 20)', () => {
  beforeEach(() => { awake(19); G.boss!.cd = 999; G.boss!.x = G.L!.w - 80; });

  it('every 12 s: a 1.5 s warning, then 4 s of water that hurts off the platforms (8% max HP each 0.5 s)', () => {
    const F = ARENA.flood, P = G.P!;
    frames(Math.round((F.every - F.warn) * 60) + 5);
    expect(G.arena!.flood.warn).toBeGreaterThan(0);                // warning first, no damage
    const hp = P.hp; frames(Math.round(F.warn * 60) + 2);
    expect(G.arena!.flood.on).toBeGreaterThan(0);
    P.inv = 0; frames(Math.round(F.tick * 60) + 2);
    expect(P.hp).toBe(hp - Math.round(P.maxHp * F.dmg));
  });

  it('standing on a platform is safe', () => {
    const F = ARENA.flood, P = G.P!;
    [P.x, P.y] = F.platforms[0];
    const hp = P.hp; frames(Math.round((F.every + F.last) * 60) + 10);
    expect(P.hp).toBe(hp);
  });

  it('phase 3: below 25% HP the floods come every 7 s', () => {
    const F = ARENA.flood, b = G.boss!; b.hp = Math.floor(b.maxHp * 0.2);
    G.arena!.flood.t = 0.01; frames(Math.round((F.warn + F.last) * 60) + 5);  // one full flood
    const gap = G.arena!.flood.t;
    expect(gap).toBeLessThanOrEqual(F.everyLate - F.warn + 0.1);
  });
});
```

Adapt the field semantics to the implementation, but keep the claims: warning before damage, 8% per 0.5 s off the platforms, safe on them, the faster cycle below 25%. The player in the first test stands at `roomX + 120`, which is off every platform; check that.

- [ ] **Step 2: Run to verify they fail** → FAIL.

- [ ] **Step 3: Implement**

- `buildArena('flood')` → `{ id, rocks: [], flood: { t: F.every - F.warn, warn: 0, on: 0, tick: 0 } }`.
- `updateArena` flood branch, a state machine:
  - `t` counts down to the warning. When it runs out: `warn = F.warn`, `emit('arenaWarn', 'flood')`.
  - When `warn` runs out: `on = F.last`, `tick = F.tick`.
  - While `on > 0`: `tick -= dt`. At each 0 crossing, if `!onPlatform(G.P)`, call `hurtPlayer(Math.round(G.P.maxHp * F.dmg))` with no knock source, then reset `tick`.
  - When `on` ends: `t = (boss.hp < boss.maxHp * F.lateAt ? F.everyLate : F.every) - F.warn`.
- `onPlatform(p)`: true if within `platR` of any platform centre.
- Platforms are walkable floor, not walls.

- [ ] **Step 4: Render**

- Platforms: round stone discs drawn on the floor layer.
- Warning: a blue tint creeping in from the room edges, alpha rising over `warn`.
- Flood: a translucent water layer over the floor (not over the platforms) with a gentle wave pattern. Draw it before the actors so they stand in it.

- [ ] **Step 5: Run the tests**

Run: `npx tsc -p . && npx vitest run && npx playwright test e2e/smoke.spec.ts` → PASS.

- [ ] **Step 6: Propose commit**

`feat: add Marisca's flood and platforms`

---

### Task 5: Boss intro card and defeat scene

**Files:**
- Modify: `src/data/bosses.ts`, `index.html`, `src/style.css`, `src/ui/screens.js`, `src/systems/boss.js`, `src/systems/combat.js`
- Test: `tests/arena.test.ts` (data), `e2e/loop.spec.ts`

**Interfaces:**
- Produces: `BossStats.epithet: Text`, `BossStats.hint: Text`; `#boss-card` with `#boss-card-name`, `#boss-card-sub`, `#boss-card-hint`, and the classes `on` and `down`.

Epithets and hints (TH/EN, plain):
- Grask: epithet 'ผู้คุมหุบเขาหินถล่ม' / 'Keeper of the Falling Stone'; hint 'ดูเงาบนพื้น หินจะตกตรงนั้น' / 'Watch the shadows on the floor. Rocks land there.'
- Bullgard: 'ราชาเขาโค ผู้พังเสา' / 'Breaker of Pillars'; 'ล่อให้มันพุ่งชนเสา แล้วมันจะมึน' / 'Bait its charge into a pillar to stun it.'
- Elderroot: 'ต้นไม้เน่าที่กลืนแสง' / 'The Rot That Eats the Light'; 'ตีรากที่งอกขึ้นมาเพื่อให้มองเห็นกว้างขึ้น' / 'Cut the sprouting roots to push the dark back.'
- Marisca: 'นางม้าแห่งกระแสน้ำ' / 'Mare of the Rising Tide'; 'น้ำจะท่วม ขึ้นไปยืนบนแท่นหิน' / 'When the water rises, stand on a stone platform.'

- [ ] **Step 1: Write the failing tests**

`tests/arena.test.ts`:

```ts
it('every boss has a TH/EN epithet and arena hint', () => {
  for (const b of Object.values(BOSSES)) {
    expect(b.epithet.th && b.epithet.en).toBeTruthy(); expect(b.hint.th && b.hint.en).toBeTruthy();
  }
});
```

`e2e/loop.spec.ts`:

```ts
test('a boss wakes with an intro card and falls with a defeat card', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  await diveIn(page);
  await hook(page, 's.loadFloor(4)');
  await settle(page);
  await hook(page, 's.P.x = s.L.roomX + 120, s.P.y = s.L.h / 2');
  await expect(page.locator('#boss-card')).toHaveClass(/on/, { timeout: 3_000 });
  await expect(page.locator('#boss-card-name')).toContainText('Grask');
  await hook(page, 's.hurtEnemy(s.boss, s.boss.hp + 1, true)');
  await expect(page.locator('#boss-card')).toHaveClass(/down/, { timeout: 3_000 });
  expect(errors).toEqual([]);
});
```

- [ ] **Step 2: Run to verify they fail** → FAIL.

- [ ] **Step 3: Implement**

- Data: `epithet`/`hint` on each boss, plus `BossStats` fields. Import `Text` as a type.
- `index.html`, next to `#toast`: `<div id="boss-card" role="status" aria-live="polite"><div class="win"><div class="body"><b id="boss-card-name"></b><span id="boss-card-sub"></span><span id="boss-card-hint"></span></div></div></div>`.
- `style.css`: model it on `#toast` (fixed, centred, upper third). `.on` shows it with a 3 s fade animation. `.down` shows the name with `text-decoration: line-through` in a muted ink and hides the hint, also fading out. Respect `prefers-reduced-motion` like `#toast`.
- `screens.js`:
  - `on('bossWake', …)`: fill name/epithet/hint from `G.F.boss` with `t()`, then restart the `on` animation (remove the class, force reflow, add it back).
  - `on('bossDeath', …)`: set the `down` class with the name and sub `tr('ล้มแล้ว', 'Defeated')`.
  - Hide the card when a floor loads (`floorLoaded`).
- `boss.js` wake: remove the floating `text(... F.boss.name ...)` line; the card replaces it.
- `combat.js` boss kill: raise the death `kick` hitstop from 0.35 to 0.6 (the "short freeze").

- [ ] **Step 4: Run the tests**

Run: `npx tsc -p . && npx vitest run && npx playwright test e2e/smoke.spec.ts e2e/loop.spec.ts` → PASS.

- [ ] **Step 5: Propose commit**

`feat: add boss intro and defeat cards`

---

### Task 6: Bots, full loop and soak for the arenas

**Files:**
- Modify: `tests/harness.ts`, `e2e/playthrough.bot.ts`

- [ ] **Step 1: Bots**

In both bots' boss branch, before the existing move-dodging rules:
- **Rockfall:** if the player is inside any rock shadow (`dist < radius + P.r + 10`), step away from that rock.
- **Flood:** during a warning or a flood, walk to the nearest platform and stay there; you may still attack if the boss is in reach.
- **Fog:** if a live sprout is within 300, go hit it first.
- **Pillars:** nothing special. Fight as now, but if the boss is stunned, use all ready Arts on it.

Mirror the rules in both bots, as one small helper each.

- [ ] **Step 2: Run everything and a soak**

- `npm run check` must PASS.
- `npx playwright test --config e2e/capture.config.ts e2e/playthrough.bot.ts`: both runs end with `errors: []`.
- Soak: a temporary test plays seeds 100-119 with `playRun`. Record wins, deaths by floor, timeouts, and per boss floor the boss fight time and whether the arena fired (rocks dropped, pillar stuns, sprouts killed, floods). Write the results to the SDD workspace, then delete the temp test.
- Investigate any timeout to its root cause. Fix bots only when the problem is bot-only. A game bug gets reported precisely.

- [ ] **Step 3: Propose commit**

`test: cover the boss arenas in bots and full-loop tests`

---

## Self-review notes

- Spec coverage: the 4 arena mechanics with their table numbers (Tasks 1-4), the warning visuals and `arenaWarn` sound (each task), the intro card with name, epithet and hint, and the defeat scene (Task 5). Bots and tests (Task 6), including the spec test list: shadows warn before damage, the boss is stunned after a pillar, vision shrinks and grows back, and standing on a platform is safe.
- The boss reward (shard, heal, Shards) already exists from round 2; untouched.
- Out of scope: balance (round 6), new boss moves, and boss art.
- Watch out for:
  - The floor.ts → arena.js import cycle.
  - The ×1.5 stun damage must not apply to DoT.
  - Sprouts must not count as kills or block anything.
  - The fog mask must not hide the HUD.
  - Arena hazards stop once the boss dies.
- Names used across tasks:
  - Data: `ArenaId`, `ARENA`, `BossStats.arena/epithet/hint`, `MOBS.rootSprout`.
  - State: `G.arena` (`rocks`, `pillars`, `vision`, `flood`), `Boss.stun`, `Mob.sprout/life`.
  - arena.js: `buildArena`, `updateArena`, `onSlam`, `onDashBlocked`, `onRoots`, `onSproutKilled`, `onPlatform`.
  - Event: `arenaWarn`.
  - DOM: `#boss-card`.
