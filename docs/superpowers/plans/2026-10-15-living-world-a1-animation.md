# Living World A1: Character Animation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the player, mobs and bosses feel alive with code-driven animation on the existing sprites: breathing, walk bounce, lean, attack stretch, hit recoil, wind-up squash, and a short death fall. Gameplay stays exactly the same.

**Architecture:**
- A pure function `pose(e, kind, t, opts)` in a new `src/render/anim.js` turns state the entities already have into draw transforms: `{ sx, sy, rot, ox, oy, alpha }`.
- `drawPlayer` / `drawMob` / `drawBoss` in `src/render/world.js` apply those transforms around the existing sprite draws.
- Draw-only bookkeeping (death start time, step counter for dust) lives in a render-side field `e.anim` that no game system reads.
- Dust puffs reuse `burst()` and are spawned from render code (cosmetic `Math.random`, never `rng()`).

**Tech Stack:** Vanilla JS + TypeScript (checked JS), Vite, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-15-living-world-design.md`, sections "หลักร่วมของทั้ง 3 รอบ" and "A1: ตัวละครมีชีวิต" (binding).

## Global Constraints

- **No gameplay change.**
  - Never change an entity's `x`/`y`/`r`, hitboxes, damage or timings.
  - `pose()` only affects drawing.
  - `tests/sim.test.ts` (including determinism and the balance guard) must pass unchanged.
- **No `rng()` anywhere in this round.** Cosmetic randomness uses `Math.random` in render code only.
- **Pose table (binding numbers):**
  - **Idle:** vertical breathe, ±2.5% (`sy` = 1 ± 0.025, `sx` = 1 ∓ 0.0125), period 1.6 s, phase per entity from `e.sx ?? 0`. Bosses get the same but slower (period 2.4 s), and 1.5× faster while raging.
  - **Walk:**
    - bounce `oy` = −|sin(step)| · 3 px, stretch while airborne (`sy` up to 1.05), squash at contact (`sy` down to 0.94)
    - step frequency matches the existing walk frame rate: player 10/s → step = t · 10 · π
    - a dust puff every 2 steps: earth colour, or water spray on Canalis (act 3) floors
  - **Lean:** toward the movement direction, max 6° (`rot` = ±0.105 rad), from horizontal velocity.
  - **Attack (player swing):**
    - 0.06 s squash (`sx` 1.08, `sy` 0.92) at swing start, then a stretch toward the blade (`sx` 0.94, `sy` 1.06)
    - the combo finisher stretches 1.5× as much
  - **Hit:**
    - recoil `ox`/`oy` up to 4 px along the knockback direction (`kx`,`ky` normalised), during `hurt`
    - flatten (`sx` 1.12, `sy` 0.88) for the first 0.08 s, then spring back
    - with `settings.flash` off this pose is the hit feedback (the white frame is already skipped then)
  - **Mob wind-up:** squash that deepens over `wind` (to `sx` 1.1, `sy` 0.9). On `lunge`, a stretch along the facing (`sy` 1.08). The existing jitter stays.
  - **Mob death:**
    - tip over to 70° (`rot` ±1.22 rad, away from the killing hit) while fading `alpha` 1 → 0 over 0.4 s
    - then the mob stops being drawn
    - death particles stay as they are
  - **Boss:** the same poses, slower and heavier: walk bounce 2 px, hit recoil 2 px. A stunned boss (`stun` > 0) sways `rot` = sin(t · 3) · 0.08.
  - **Player roll / Gale Rush / Shade dash:** stretch along the movement (`sx` 1.12, `sy` 0.9), then keep the existing roll look.
- **Reduced motion** (`prefers-reduced-motion: reduce`): every deviation from neutral is halved, and there are no dust puffs.
- **Unchanged visuals:**
  - Elderroot's sprouts (`m.sprout`) keep their own drawing.
  - The treant boss keeps its existing sway/swell; add only hit recoil and stun sway.
  - Beasts (2-frame side view) get the same poses.
- **Per-frame cost:** no canvases or gradients created per frame; `pose()` allocates at most one small object per entity per frame.
- **Commits:** the user commits (global CLAUDE.md). "Propose commit" = run `git status` and `git diff --stat` and report the message. Never run `git commit`.
- `npm run check` must pass at the end of every task.

## File Structure

| File | Responsibility |
|---|---|
| `src/render/anim.js` (create) | `pose()`, `REDUCED`, `applyPose(ctx, x, y, p)` helper |
| `src/render/world.js` | apply poses in `drawPlayer`, `drawMob`, `drawBoss`; keep dying mobs in the actor list for 0.4 s; dust |
| `tests/anim.test.ts` (create) | pose rules |

---

### Task 1: `pose()` and its tests

**Files:**
- Create: `src/render/anim.js`, `tests/anim.test.ts`

**Interfaces:**
- Produces:
  - `pose(e, kind, t, opts = {})` where `kind` is `'player' | 'mob' | 'boss'`, `t` is `G.time`, and `opts = { reduced?: boolean, flash?: boolean, dyingFor?: number, vx?: number }`. It returns `{ sx, sy, rot, ox, oy, alpha }`, with neutral = `{ sx: 1, sy: 1, rot: 0, ox: 0, oy: 0, alpha: 1 }`.
  - `REDUCED` (boolean from `matchMedia`, false in Node).
  - `applyPose(ctx, x, y, p)`:
    - translates to the entity's foot point `(x + p.ox, y + p.oy)`
    - rotates by `p.rot`, scales by `(p.sx, p.sy)`, translates back
    - multiplies `ctx.globalAlpha` by `p.alpha`
    - the caller wraps it in `ctx.save()` / `ctx.restore()`

- [ ] **Step 1: Write the failing tests**

Create `tests/anim.test.ts`:

```ts
// Character animation poses (spec "A1"): pure draw transforms from state the game already has.
import { describe, it, expect } from 'vitest';
import { pose } from '../src/render/anim.js';

const idle = (o: object = {}) => ({ x: 0, y: 0, sx: 0, moving: false, hurt: 0, swing: 0, kx: 0, ky: 0, ...o });
const NEUTRAL = { sx: 1, sy: 1, rot: 0, ox: 0, oy: 0, alpha: 1 };

describe('pose()', () => {
  it('idle breathes: sy moves with time, within 2.5%', () => {
    const a = pose(idle(), 'mob', 0), b = pose(idle(), 'mob', 0.4);
    expect(a.sy).not.toBeCloseTo(b.sy, 4);
    for (let t = 0; t < 2; t += 0.05) { const p = pose(idle(), 'mob', t); expect(Math.abs(p.sy - 1)).toBeLessThanOrEqual(0.0251); }
  });

  it('two mobs breathe out of phase', () => {
    expect(pose(idle({ sx: 0 }), 'mob', 1).sy).not.toBeCloseTo(pose(idle({ sx: 3 }), 'mob', 1).sy, 3);
  });

  it('a hit recoils along the knockback and flattens first', () => {
    const p = pose(idle({ hurt: 0.1, kx: 300, ky: 0 }), 'mob', 0);
    expect(p.ox).toBeGreaterThan(0); expect(Math.abs(p.oy)).toBeLessThan(0.01);
    expect(p.ox).toBeLessThanOrEqual(4); expect(p.sx).toBeGreaterThan(1); expect(p.sy).toBeLessThan(1);
  });

  it('walking bounces up and leans toward the movement, max 6 degrees', () => {
    let up = 0, maxRot = 0;
    for (let t = 0; t < 1; t += 0.01) { const p = pose(idle({ moving: true }), 'player', t, { vx: 200 }); up = Math.min(up, p.oy); maxRot = Math.max(maxRot, p.rot); }
    expect(up).toBeLessThan(-1); expect(up).toBeGreaterThanOrEqual(-3.01);
    expect(maxRot).toBeGreaterThan(0); expect(maxRot).toBeLessThanOrEqual(0.106);
  });

  it('a dying mob tips over and fades out over 0.4 s', () => {
    const half = pose(idle({ hp: 0 }), 'mob', 0, { dyingFor: 0.2 }), done = pose(idle({ hp: 0 }), 'mob', 0, { dyingFor: 0.4 });
    expect(half.alpha).toBeGreaterThan(0); expect(half.alpha).toBeLessThan(1);
    expect(Math.abs(half.rot)).toBeGreaterThan(0.3);
    expect(done.alpha).toBe(0);
  });

  it('mob wind-up squashes; boss stun sways', () => {
    expect(pose(idle({ wind: 0.2, def: { wind: 0.4 } }), 'mob', 0).sx).toBeGreaterThan(1);
    const s = [0.1, 0.6].map(t => pose(idle({ stun: 1 }), 'boss', t).rot);
    expect(s[0]).not.toBeCloseTo(s[1], 3);
  });

  it('reduced motion halves every deviation', () => {
    const full = pose(idle({ hurt: 0.1, kx: 300, ky: 0 }), 'mob', 0), half = pose(idle({ hurt: 0.1, kx: 300, ky: 0 }), 'mob', 0, { reduced: true });
    expect(half.ox).toBeCloseTo(full.ox / 2, 5);
    expect(half.sx - 1).toBeCloseTo((full.sx - 1) / 2, 5);
  });

  it('neutral when nothing is happening and breathing sits at its zero crossing', () => {
    const p = pose(idle(), 'mob', 0);
    expect({ ...p, sy: 1, sx: 1 }).toEqual(NEUTRAL);
  });
});
```

If an entity field name differs from these fixtures (e.g. the mob's wind-up length lives in `def.wind`), keep the claims and adapt the fixture to the real field names. Read `src/world/state.ts` and `src/data/mobs.ts`.

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run tests/anim.test.ts` → FAIL (module missing).

- [ ] **Step 3: Implement `src/render/anim.js`**

```js
// Code-driven character animation: pure draw transforms (squash/stretch, lean, recoil, fall) computed from
// state the entities already carry. Drawing only: nothing here changes positions, hitboxes or timings.
export const REDUCED = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
const A = {
  breathe: 0.025, period: { player: 1.6, mob: 1.6, boss: 2.4 }, rageBreath: 1.5,
  walk: { bounce: { player: 3, mob: 3, boss: 2 }, stretch: 0.05, squash: 0.06, rate: { player: 10, mob: 8, boss: 5 } },
  lean: 0.105, leanSpeed: 200, // full lean at this horizontal speed (px/s)
  hit: { recoil: { player: 4, mob: 4, boss: 2 }, flat: 0.12, flatTime: 0.08 },
  wind: 0.1, lunge: 0.08, die: { time: 0.4, tilt: 1.22 }, stun: 0.08, dash: { sx: 1.12, sy: 0.9 },
  swing: { squash: 0.08, stretch: 0.06, squashTime: 0.06, finisher: 1.5 },
};
export function pose(e, kind, t, o = {}) {
  let sx = 1, sy = 1, rot = 0, ox = 0, oy = 0, alpha = 1;
  if (o.dyingFor !== undefined) { // tip over away from the killing hit, fading
    const k = Math.min(1, o.dyingFor / A.die.time), side = (e.kx ?? 0) >= 0 ? 1 : -1;
    return damp({ sx, sy, rot: side * A.die.tilt * k, ox, oy, alpha: 1 - k }, o.reduced, true);
  }
  // breathe (idle) — phase per entity so a crowd doesn't move in lockstep
  const per = A.period[kind] / (kind === 'boss' && o.rage ? A.rageBreath : 1), b = Math.sin((t / per) * Math.PI * 2 + (e.sx ?? 0));
  sy += b * A.breathe; sx -= b * A.breathe / 2;
  if (e.moving) { // walk: bounce + stretch in the air, squash on contact
    const ph = Math.abs(Math.sin(t * A.walk.rate[kind] * Math.PI));
    oy -= ph * A.walk.bounce[kind]; sy += (ph - 0.5) * 2 * (ph > 0.5 ? A.walk.stretch : A.walk.squash);
  }
  if (o.vx) rot += Math.max(-1, Math.min(1, o.vx / A.leanSpeed)) * A.lean;
  // … wind-up / lunge / swing / dash / hit / stun branches per the Global Constraints table …
  return damp({ sx, sy, rot, ox, oy, alpha }, o.reduced);
}
function damp(p, reduced, keepAlpha = false) {
  if (!reduced) return p;
  return { sx: 1 + (p.sx - 1) / 2, sy: 1 + (p.sy - 1) / 2, rot: p.rot / 2, ox: p.ox / 2, oy: p.oy / 2, alpha: keepAlpha ? p.alpha : p.alpha };
}
export function applyPose(ctx, x, y, p) {
  ctx.translate(x + p.ox, y + p.oy); ctx.rotate(p.rot); ctx.scale(p.sx, p.sy); ctx.translate(-x, -y);
  ctx.globalAlpha *= p.alpha;
}
```

- Fill in the remaining branches from the table:
  - **mob wind-up:** `k = 1 - e.wind / windLen` → `sx += A.wind * k`, `sy -= A.wind * k`
  - **lunge:** `sy += A.lunge`
  - **player swing:** in the first `squashTime` of the swing (`e.swing` counts down from the swing length) squash, else stretch; ×1.5 when `e.finisher`
  - **dash/roll:** when `e.dash > 0 || e.roll > 0`, use `A.dash`
  - **hit:** while `e.hurt > 0`, recoil along the normalised `(kx, ky)` scaled by `A.hit.recoil[kind]` × (`hurt` / its max). Flatten during the first `flatTime` of the hurt window; take the hurt window length from the data (player 0.25, mob 0.1).
  - **boss stun:** `rot += Math.sin(t * 3) * A.stun`
- The breathing `sx`/`sy` change must be exactly 0 at `t = 0` with phase 0, so the "neutral" test holds; `sin(0) = 0`.
- Keep the module free of DOM and imports so vitest can load it.

- [ ] **Step 4: Run the tests**

Run: `npx tsc -p . && npx vitest run tests/anim.test.ts` → PASS, then `npx vitest run` → PASS.

- [ ] **Step 5: Propose commit**

`feat: add a pose function for code-driven character animation`

---

### Task 2: Animate the player, mobs and bosses

**Files:**
- Modify: `src/render/world.js`

- [ ] **Step 1: Player (`drawPlayer`)**
  - Compute `p = pose(P, 'player', G.time, { reduced: REDUCED, vx: (P.x - prevX) / dt })`. Keep `prevX` in `P.anim` (render-side), and use the horizontal delta per frame rather than a velocity field the game doesn't have.
  - Wrap the body sprite draw in `ctx.save(); applyPose(ctx, P.x, P.y + footOffset, p); … ctx.restore();`. The foot point is where the shadow sits, so scaling and leaning pivot at the feet. Keep the existing bob only if it doesn't double the walk bounce; remove the old `bob` in favour of the pose bounce.
  - The sword stays attached to the hand: apply the same transform to the hand point (`hx`, `hy`), or draw the sword inside the same transformed block. Choose whichever keeps the blade in the hand; it must not drift during lean or recoil.
  - Dust: count steps in `P.anim.steps` from the walk phase. Every 2 steps, `burst(P.x, P.y + P.r, 3, act === 3 ? '#bfe6ff' : '#b49a76', 60, 0.35, 3, false)` (floor act from `actOf(G.floorIdx)`; town = earth). Skip when `REDUCED`.

- [ ] **Step 2: Mobs (`drawMob`)**
  - Apply `pose(m, 'mob', G.time, { reduced: REDUCED, vx })` around the sprite draw, for both beasts and sheet characters. Keep the existing wind-up jitter and lunge hop, which change only the draw position, and add the pose on top.
  - Death: the actor list at `world.js` ~528 currently keeps `m.hp > 0` only.
    - Also keep mobs that died less than 0.4 s ago. Record the death time render-side: when a mob is first seen with `hp <= 0` and no `m.anim?.deadAt`, set `m.anim = { ...m.anim, deadAt: G.time }`.
    - Draw it with `dyingFor = G.time - deadAt`.
    - Skip HP bars, guard pips, the "!" and aim lines for dying mobs.
    - Sprouts never get a death pose.
  - Elites and status tints keep their glow during the pose.

- [ ] **Step 3: Bosses (`drawBoss`)**
  - Character bosses: apply `pose(b, 'boss', G.time, { reduced: REDUCED, rage: rage() })` around the `frame()` draw, using the boss's foot point. The leap height `b.z` stays as it is.
  - Treant: keep its sway/swell. Add only the hit recoil and stun sway by applying a pose with `moving: false` and no breathing (the treant already sways): call `pose` and zero `sx`/`sy`/`rot` from breathing, or pass an option. Pick the smallest clear way and note it.

- [ ] **Step 4: Run the tests**
  - `npx tsc -p . && npx vitest run && npx playwright test e2e/smoke.spec.ts e2e/loop.spec.ts` → PASS.
  - `tests/sim.test.ts` must pass unchanged. Report if any test needed changes; none should.

- [ ] **Step 5: Screenshots for the controller's visual check**

With a temporary Playwright spec under `e2e/capture.config.ts`, save PNGs into the SDD workspace (not the repo):
1. the player mid-walk (a step pose)
2. the player mid-swing
3. a mob winding up
4. a mob mid-death (≈0.2 s after the kill)
5. a boss idle, and a boss stunned at a pillar

Use the dev hook to set up each moment. Delete the temp spec afterwards.

- [ ] **Step 6: Propose commit**

`feat: animate the player, mobs and bosses with poses and dust`

---

## Self-review notes

- **Spec coverage (A1):**
  - the pose function (Task 1)
  - every row of the pose table, including death fall and boss variants (Tasks 1-2)
  - reduced motion (both tasks)
  - unchanged gameplay (sim unchanged)
  - a visual check (Task 2 step 5)
- **Watch out for:**
  - The sword must stay in the hand under the transform.
  - Dying mobs must not be targetable. They are already excluded from `targets()` by `hp > 0`; only the draw list keeps them.
  - The old player `bob` must not stack with the new bounce.
- **Names:** `pose`, `applyPose`, `REDUCED`, `e.anim.deadAt`, `P.anim.prevX`, `P.anim.steps`.
