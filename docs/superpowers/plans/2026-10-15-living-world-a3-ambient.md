# Living World A3: Ambient Life Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make each floor feel inhabited:
- small creatures that fit each act (butterflies, pollen, leaves, grasshoppers, fireflies, bubbles, gulls, chimney smoke)
- birds that peck the ground and scatter when you come near or a fight breaks out close by
- grass tufts that lean away from whoever walks through them and flick when a sword swings past

**Architecture:**
- A new `src/systems/ambient.js` owns `G.ambient = { critters, birds, tufts }`.
  - Built on `floorLoaded`.
  - Updated from `updateGame`, so it pauses with the game.
  - Purely cosmetic: it never touches gameplay state and never calls `rng()`; it uses `Math.random`.
- `src/render/world.js` draws:
  - ground-level ambient (tufts, perched birds, ground critters) after the floor and before the y-sorted actors
  - airborne ambient (flying birds, gulls, fireflies, smoke) after the actors and before the fog
- Bird scatter listens to existing events. `mobDeath` gains an `{ x, y }` payload, and `bossImpact` uses the boss position.

**Tech Stack:** Vanilla JS + TypeScript (checked JS), Vite, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-15-living-world-design.md`, sections "หลักร่วมของทั้ง 3 รอบ" and "A3: ฉากมีชีวิต" (binding).

## Global Constraints

- **No gameplay change, no `rng()`.**
  - `tests/sim.test.ts`, including determinism, must pass unchanged.
  - The controller will compare a same-seed soak before and after.
- **Critters by place (binding):**
  - town: butterflies near the flower planters, faint chimney smoke from the houses
  - Firstlight (act 0): 4-6 butterflies, drifting pollen
  - Hornfield (act 1): wind-blown leaves, grasshoppers that hop away when the player is within 70 px
  - Mistwell (act 2): slow-blinking fireflies, falling leaves
  - Canalis (act 3): bubbles rising from ponds, water spray specks, a gull crossing the sky now and then (every 12-20 s)
  - boss floors: only light themed critters, no birds. Elderroot's room has fireflies, which the fog mask hides as it does everything else.
- **Counts:** about 6-12 critters per floor, never more than 24 ambient entities in total (critters + birds). Nothing is drawn off screen.
- **Birds:**
  - 1-2 flocks of 3-5 per floor in towns, battle/elite/challenge rooms and special rooms; none on boss floors
  - perch on open ground (not in walls, ponds or near doors) and peck now and then (a 0.15 s head bob)
  - take flight when the player comes within 110 px, or when a `mobDeath` or `bossImpact` happens within 200 px
  - fly up and away diagonally off screen, then are removed; they don't return that floor
  - a soft wing-flap sound (new `SFX.flap`, synthesised like the others) plays once per flock take-off
- **Grass tufts:**
  - 10-20 live tufts per room floor (not towns, which are cobbled, and not boss rooms), placed on free ground away from walls, ponds and doors
  - drawn with canvas strokes in the act's grass colour
  - each tuft leans away from any character (player or mob) within 28 px, then springs back (damped spring)
  - a sword swing or Blade Art from the player flicks tufts within 80 px harder, with a tiny leaf burst
  - tufts with no character near and at rest are not simulated
- **Reduced motion** (`REDUCED` from `src/render/anim.js`): critters move at half speed and are halved in number; tuft lean is halved; birds still fly away.
- **Per-frame cost:** no canvas or gradient creation per frame; cull off-screen; update only active tufts.
- **Commits:** the user commits (global CLAUDE.md). "Propose commit" = run `git status` and `git diff --stat` and report the message. Never run `git commit`.
- `npm run check` must pass at the end of every task.

## File Structure

| File | Responsibility |
|---|---|
| `src/systems/ambient.js` (create) | build/update critters, birds, tufts; event listeners |
| `src/render/world.js` | `drawAmbientGround()`, `drawAmbientAir()` |
| `src/systems/index.js` | `updateAmbient(dt)` in `updateGame` |
| `src/world/state.ts` | `G.ambient` type |
| `src/core/events.ts`, `src/systems/combat.js` | `mobDeath` payload `{ x, y }` |
| `src/audio/audio.js` | `SFX.flap`, `on('birdsFlee', SFX.flap)` |
| `tests/ambient.test.ts` (create) | rules |

---

### Task 1: The ambient system and themed critters

**Files:**
- Create: `src/systems/ambient.js`, `tests/ambient.test.ts`
- Modify: `src/systems/index.js`, `src/world/state.ts`, `src/render/world.js`

**Interfaces:**
- Produces:
  - `G.ambient: { critters: Critter[]; birds: Bird[]; tufts: Tuft[] }`, where `Critter = { kind: string; x; y; vx; vy; t; phase; air: boolean }`
  - `buildAmbient()`: on `floorLoaded`, uses `G.L.kind`, `actOf(G.floorIdx)`, `G.room?.type`, `G.L.props`, `G.ponds`
  - `updateAmbient(dt)`
  - `MAX_AMBIENT = 24`

- [ ] **Step 1: Write the failing tests**

Create `tests/ambient.test.ts`:

```ts
// Ambient life (spec "A3"): creatures per act, birds that scatter, grass that leans. Cosmetic only.
import { describe, it, expect } from 'vitest';
import { G, startRun } from './harness.ts';
import { loadFloor } from '../src/world/floor.ts';
import { updateAmbient, MAX_AMBIENT } from '../src/systems/ambient.js';

const kinds = () => new Set(G.ambient!.critters.map(c => c.kind));

describe('themed critters', () => {
  it('each act gets its own creatures', () => {
    startRun(1);
    loadFloor(1, { type: 'battle', reward: 'gold' }); expect(kinds().has('butterfly')).toBe(true);
    loadFloor(6, { type: 'battle', reward: 'gold' }); expect(kinds().has('leaf') || kinds().has('grasshopper')).toBe(true);
    loadFloor(11, { type: 'battle', reward: 'gold' }); expect(kinds().has('firefly')).toBe(true);
    loadFloor(16, { type: 'battle', reward: 'gold' }); expect(kinds().has('bubble') || kinds().has('spray')).toBe(true);
    loadFloor(0); expect(kinds().has('butterfly') || kinds().has('smoke')).toBe(true);
  });
  it('never more than 24 ambient things, and boss floors have no birds', () => {
    startRun(1);
    for (const i of [0, 1, 4, 6, 9, 11, 14, 16, 19]) {
      loadFloor(i, i % 5 === 0 || i % 5 === 4 ? undefined : { type: 'battle', reward: 'gold' });
      expect(G.ambient!.critters.length + G.ambient!.birds.length).toBeLessThanOrEqual(MAX_AMBIENT);
      if (i % 5 === 4) expect(G.ambient!.birds).toHaveLength(0);
    }
  });
  it('critters move over time and stay inside the floor', () => {
    startRun(1); loadFloor(1, { type: 'battle', reward: 'gold' });
    const before = G.ambient!.critters.map(c => [c.x, c.y]);
    for (let i = 0; i < 120; i++) updateAmbient(1 / 60);
    expect(G.ambient!.critters.some((c, k) => c.x !== before[k][0] || c.y !== before[k][1])).toBe(true);
    for (const c of G.ambient!.critters) { expect(c.x).toBeGreaterThanOrEqual(-40); expect(c.x).toBeLessThanOrEqual(G.L!.w + 40); }
  });
});
```

Gulls fly across and may leave the floor bounds briefly; exclude `kind === 'gull'` from the bounds check if needed.

- [ ] **Step 2: Run to verify they fail** → FAIL.

- [ ] **Step 3: Implement**

- **`ambient.js`:**
  - `buildAmbient()` picks kinds and counts per the Global Constraints table. Place them at random free spots: not in `G.WALLS` and not within 60 px of a door. Town butterflies hover near planter props, and town smoke rises from the house chimneys (house props).
  - Halve counts when `REDUCED`.
  - Register `on('floorLoaded', buildAmbient)`, or call it from `loadFloor` after props and walls exist, whichever keeps the order right (walls must exist first).
  - `updateAmbient(dt)` moves each critter by its own small behaviour:
    - butterfly: a wobbly path that stays near its anchor
    - pollen: drifts slowly
    - leaf: slides diagonally with wind, wraps around the screen edges
    - grasshopper: a short arc hop away from the player within 70 px
    - firefly: drifts slowly; its alpha blinks over a 2-3 s period
    - bubble: rises from a pond edge, pops after 1-2 s, respawns
    - spray: brief specks near ponds
    - gull: crosses the whole floor every 12-20 s
    - smoke: rises, widens and fades from a chimney point, then loops
- **`index.js`:** call `updateAmbient(dt)` at the end of `updateGame`.
- **`state.ts`:** type `G.ambient`.
- **`world.js`:**
  - `drawAmbientGround()` runs after the arena layer and before the actor sort. It draws ground critters (grasshoppers, pollen low, bubbles at pond edges).
  - `drawAmbientAir()` runs after `drawFx()` and before `drawFog()`. It draws butterflies, leaves, fireflies (additive glow), gulls and smoke.
  - Each kind is a few canvas primitives in fitting colours, sized for the pixel art (butterflies about 6 px wings flapping, fireflies a 2 px core with a soft 8 px glow).
  - Cull anything off screen using the camera.

- [ ] **Step 4: Run** `npx tsc -p . && npx vitest run && npx playwright test e2e/smoke.spec.ts` → PASS (sim unchanged).

- [ ] **Step 5: Propose commit** `feat: add themed ambient creatures to every floor`

---

### Task 2: Birds that scatter

**Files:**
- Modify: `src/systems/ambient.js`, `src/core/events.ts`, `src/systems/combat.js`, `src/audio/audio.js`, `src/render/world.js`
- Test: `tests/ambient.test.ts`

**Interfaces:**
- Produces:
  - `Bird = { x; y; vx; vy; flying: boolean; peck: number; flock: number }`
  - event `mobDeath: { x: number; y: number }` (was `void`; existing listeners ignore the payload)
  - event `birdsFlee: void`
  - `SFX.flap`

- [ ] **Step 1: Write the failing tests** (append)

```ts
import { emit } from '../src/core/events.ts';
describe('birds', () => {
  it('perch on open ground, then fly off when the player comes within 110 px', () => {
    startRun(1); loadFloor(1, { type: 'battle', reward: 'gold' });
    const B = G.ambient!.birds; expect(B.length).toBeGreaterThanOrEqual(3);
    const b = B[0]; G.P!.x = b.x + 300; G.P!.y = b.y;
    for (let i = 0; i < 30; i++) updateAmbient(1 / 60);
    expect(b.flying).toBe(false);
    G.P!.x = b.x + 90; updateAmbient(1 / 60);
    expect(b.flying).toBe(true);
    for (let i = 0; i < 60 * 6; i++) updateAmbient(1 / 60);
    expect(G.ambient!.birds.includes(b)).toBe(false); // gone off screen, removed
  });
  it('a mob dying nearby scatters the flock', () => {
    startRun(1); loadFloor(1, { type: 'battle', reward: 'gold' });
    const b = G.ambient!.birds[0]; G.P!.x = b.x + 600; G.P!.y = b.y;
    emit('mobDeath', { x: b.x + 150, y: b.y });
    updateAmbient(1 / 60);
    expect(b.flying).toBe(true);
  });
  it('no birds on boss floors', () => {
    startRun(1); loadFloor(4); expect(G.ambient!.birds).toHaveLength(0);
  });
});
```

If the player's start lands within 110 px of a perched flock, the first test's setup must move the player away first, as written. Make sure birds are never placed within 160 px of `G.L.start`, so they don't scatter the instant a floor loads.

- [ ] **Step 2: Run to verify they fail** → FAIL.

- [ ] **Step 3: Implement**
  - `buildAmbient()`: flocks on open ground per the Global Constraints, at least 160 px from the start point and 60 px from doors.
  - `updateAmbient`:
    - perched birds peck (a head bob timer) and shuffle a little
    - if the player is within 110 px, the whole flock takes off: `flying = true`, velocity away from the player and upward (negative y), speed about 260 px/s with a little random spread
    - flying birds climb (draw with a growing "height" offset so they rise on screen) and are removed once off screen
  - Listeners:
    - `on('mobDeath', p => scatterNear(p, 200))`
    - `on('bossImpact', () => G.boss && scatterNear(G.boss, 200))`
    - a flock taking off emits `birdsFlee` once
  - `combat.js` mob death: `emit('mobDeath', { x: e.x, y: e.y })`. Type the payload in `events.ts`.
  - `audio.js`: `flap: () => noise(0.18, 0.12, 900, 1.5, 1600)` (or similar soft noise), plus `on('birdsFlee', SFX.flap)`.
  - `world.js`:
    - perched birds go in the ground layer: a small body with a head and a peck bob
    - flying birds go in the air layer with flapping wings (a two-frame V shape) and a shadow on the ground that fades as they climb

- [ ] **Step 4: Run** `npx tsc -p . && npx vitest run && npx playwright test e2e/smoke.spec.ts` → PASS (sim unchanged).

- [ ] **Step 5: Propose commit** `feat: add birds that scatter when you come close`

---

### Task 3: Grass that leans

**Files:**
- Modify: `src/systems/ambient.js`, `src/render/world.js`
- Test: `tests/ambient.test.ts`

**Interfaces:**
- Produces: `Tuft = { x; y; blades: number; lean: number; vel: number; awake: boolean }`

- [ ] **Step 1: Write the failing tests** (append)

```ts
describe('grass tufts', () => {
  it('room floors have 10-20 tufts; towns and boss rooms have none', () => {
    startRun(1);
    loadFloor(1, { type: 'battle', reward: 'gold' }); expect(G.ambient!.tufts.length).toBeGreaterThanOrEqual(10); expect(G.ambient!.tufts.length).toBeLessThanOrEqual(20);
    loadFloor(0); expect(G.ambient!.tufts).toHaveLength(0);
    loadFloor(4); expect(G.ambient!.tufts).toHaveLength(0);
  });
  it('a tuft leans away from the player walking through it, then springs back to rest', () => {
    startRun(1); loadFloor(1, { type: 'battle', reward: 'gold' });
    const t = G.ambient!.tufts[0];
    G.P!.x = t.x - 10; G.P!.y = t.y; updateAmbient(1 / 60); updateAmbient(1 / 60);
    expect(t.lean).toBeGreaterThan(0);               // pushed away (to +x)
    G.P!.x = t.x - 400; for (let i = 0; i < 60 * 3; i++) updateAmbient(1 / 60);
    expect(Math.abs(t.lean)).toBeLessThan(0.02); expect(t.awake).toBe(false);
  });
  it('a sword swing nearby flicks tufts', () => {
    startRun(1); loadFloor(1, { type: 'battle', reward: 'gold' });
    const t = G.ambient!.tufts[0]; G.P!.x = t.x - 60; G.P!.y = t.y; G.P!.ang = 0;
    emit('swing'); updateAmbient(1 / 60);
    expect(Math.abs(t.vel) + Math.abs(t.lean)).toBeGreaterThan(0.05);
  });
});
```

- [ ] **Step 2: Run to verify they fail** → FAIL.

- [ ] **Step 3: Implement**
  - `buildAmbient()`: on `L.kind === 'room'` only, 10-20 tufts (5-10 under `REDUCED`) at free ground spots, not in walls or ponds and not within 60 px of doors. `blades` is 3-5.
  - `updateAmbient`, for each tuft:
    - wake it if any character (the player, or a live mob) is within 28 px; push `lean` toward ±max 0.6 rad away from that character's x (scaled by closeness)
    - spring back with `vel += (-k·lean − c·vel)·dt`
    - sleep when |lean| and |vel| are both below 0.01 and nothing is near
  - On `swing` / `skill` events: tufts within 80 px of the player get `vel += ±1.6` away from the player, plus a tiny `burst` of 2 leaf specks in the act grass colour.
  - `world.js`: draw tufts in the ground layer as `blades` quadratic strokes from the base, each bent by `lean` (plus a gentle idle sway of ±0.03 from `G.time`). Use the act grass colours: a darker stroke with a lighter tip. Cull off screen.

- [ ] **Step 4: Run** `npx tsc -p . && npx vitest run && npx playwright test e2e/smoke.spec.ts e2e/loop.spec.ts` → PASS (sim unchanged).

- [ ] **Step 5: Propose commit** `feat: let grass lean and flick as you pass`

---

### Task 4: Screenshots and checks

- [ ] **Step 1: Screenshots** into the SDD workspace `shots/`, using a temporary spec. Close the story popup and wait for toasts to clear first.
  - one room per act showing its critters
  - a flock perched and then mid-flight
  - grass leaning around the player
  - the town with smoke and butterflies

- [ ] **Step 2: Bots** `npx playwright test --config e2e/capture.config.ts e2e/playthrough.bot.ts`: both runs end with `errors: []`.

- [ ] **Step 3:** `npm run check` → PASS.

- [ ] **Step 4: Propose commit** (none unless tracked files changed)

---

## Self-review notes

- Spec coverage (A3):
  - themed critters per place (Task 1)
  - birds with proximity and fight triggers plus the flap sound (Task 2)
  - grass lean and swing flick (Task 3)
  - reduced motion, caps and culling (all tasks)
  - tests and visuals (Tasks 1-4)
- Watch out for:
  - The `mobDeath` payload change must not break the audio listener; it ignores arguments.
  - Birds must never spawn near the start.
  - Ambient updates and draws must never touch gameplay or `rng()`.
  - The controller verifies with a same-seed soak.
- Names:
  - `G.ambient`, `MAX_AMBIENT`
  - `buildAmbient`, `updateAmbient`, `scatterNear`
  - `drawAmbientGround`, `drawAmbientAir`
  - `SFX.flap`, `birdsFlee`
