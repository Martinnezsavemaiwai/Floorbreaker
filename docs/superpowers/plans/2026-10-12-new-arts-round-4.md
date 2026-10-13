# New Arts and Evolved Forms, Round 4 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three new Blade Arts: Crescent Wave, Riposte and Shade Step. Give all 7 moddable Arts a hand-made evolved form, replacing the round-2 placeholder (`EVOLVED_DMG`, ×1.3).

**Architecture:**
- Art data stays in `src/data/skills.ts`. Each Art gets an `evo` block with its evolved name, description and numbers. The sword gets its own `BLADE_EVO`.
- Art behaviour stays in `src/systems/player.js`, branching on `P.evolved.includes(id)`.
- Player projectiles (Crescent Wave, the evolved sword finisher) are a new `G.waves` list. `src/systems/player.js` updates it and `src/render/world.js` draws it.
- Riposte hooks into `hurtPlayer` in combat.js.
- The evolved Riposte's slow motion drives the existing `clock.scale` (times the assist speed).
- Every Art hit still goes through `hurtEnemy(e, d, big, crit, art)`, so element mods keep working on the new Arts and on evolved forms.

**Tech Stack:** Vanilla JS + TypeScript (checked JS), Vite, Zod, Vitest, Playwright (local Chrome).

**Spec:** `docs/superpowers/specs/2026-10-09-in-run-progression-design.md`, section "ท่า (Blade Arts)" (the table is binding) and the meta pool lines. Round 4 of the order in `docs/superpowers/specs/2026-10-09-twenty-floor-run-design.md`.

## Global Constraints

- Art table (binding numbers):
  - `blade`, always owned. Normal: unchanged 3-hit combo. Evolved: the combo finisher also launches a sword wave, range 260, damage 0.8× the finisher's damage.
  - `sonicLeap` Gale Rush, slot 1. Normal: unchanged. Evolved: 2 charges (two dashes back to back).
  - `horizontal` Cyclone Edge, start pool. Normal: unchanged. Evolved: spins 2 turns, hitting on each, and pulls enemies 60 px toward the player.
  - `vorpal` Piercing Fang, start pool. Normal: unchanged. Evolved: the stab is followed by an explosion along a line, 1.0× damage along its whole length.
  - `crescent` Crescent Wave, start pool (new). Normal: a piercing sword wave, speed 520, range 360, 1.6× damage, cooldown 4 s. Evolved: 3 waves in a fan at ±18°.
  - `riposte` Riposte, unlock 30 Shards (new). Normal: a 0.6 s stance. If hit during it: no damage, and a counter of 3.0× in radius 80. If not hit: stuck for 0.3 s. Cooldown 5 s. Evolved: after a counter, the game slows to 40% for 1.2 s (multiplied with the assist speed).
  - `shade` Shade Step, unlock 60 Shards (new). Normal: teleport behind the nearest enemy in the aim direction within 220, then stab 2.2×. With no target: a short 120 px dash. Cooldown 5 s. Evolved: chains to 1 more target within 220.
- Shade Step must never end inside a wall, or inside the boss room while the boss sleeps (the same rule as `dashMove`).
- The meta pool starts with Cyclone Edge, Piercing Fang and Crescent Wave. Riposte (30 Shards) and Shade Step (60 Shards) can be unlocked.
- Evolved names are English proper nouns. All other new player-facing text is a TH/EN pair, in plain voice, with no " · " joining sentences and no em dashes. Game nouns stay English.
- All gameplay randomness uses the seeded `rng()`. New behaviour must not draw rng except where an existing hit path already does (crit rolls).
- Bosses are not pulled by Cyclone (they keep `knockback` 0 rules). Shade Step may target the boss. Riposte counters any `hurtPlayer` source, including boss moves and shots.
- **Commits:** the user commits (global CLAUDE.md). "Propose commit" means run `git status` and `git diff --stat`, then report the message. Never run `git commit`.
- `npm run check` must pass at the end of every task.

## File Structure

| File | Responsibility |
|---|---|
| `src/data/skills.ts` | 3 new Arts, `evo` blocks (name, desc, numbers) on all Arts, `BLADE_EVO`, `evoName()`; remove `EVOLVED_DMG` (Task 4) |
| `src/systems/player.js` | Crescent Wave, sword waves (`G.waves`), Riposte stance, Shade Step, evolved forms |
| `src/systems/combat.js` | Riposte intercept in `hurtPlayer` |
| `src/world/state.ts`, `src/world/floor.ts` | new Player fields, `G.waves`, reset on floor load |
| `src/render/world.js` | waves, Riposte stance, Shade Step trail, evolved Cyclone/Fang visuals |
| `src/ui/screens.js` | evolve card text from `evo.desc`, evolved name in the toast |
| `src/main.js` | dev hook `waves` getter; clock scale restore |
| `tests/arts.test.ts` (create) | new Arts and evolved forms |
| `tests/harness.ts`, `e2e/*` | Task 5 |

---

### Task 1: Sword waves, Crescent Wave and the evolved sword

**Files:**
- Modify: `src/data/skills.ts`, `src/systems/player.js`, `src/world/state.ts`, `src/world/floor.ts`, `src/render/world.js`, `src/main.js`
- Create: `tests/arts.test.ts`

**Interfaces:**
- Produces:
  - `SKILLS.crescent`
  - `BLADE_EVO = { range: 260, mult: 0.8 }`
  - `Wave = { x, y, vx, vy, left: number /* px of travel left */, dmg: number, art: string, hit: Set<object>, r: number }`
  - `G.waves: Wave[]`
  - player.js `launchWave(x, y, ang, range, dmg, art)` (module-internal; exported only for tests if needed) and `updateWaves(dt)`, called from `updatePlayer`

- [ ] **Step 1: Write the failing tests**

Create `tests/arts.test.ts`:

```ts
// New Blade Arts and evolved forms: what each one does in the real systems (headless harness).
import { describe, it, expect, beforeEach } from 'vitest';
import { G, startRun, enterRoom, frame } from './harness.ts';
import { makeMob } from '../src/world/floor.ts';
import { skill, attack } from '../src/systems/player.js';
import { SKILLS } from '../src/data/skills.ts';

const frames = (n: number) => { for (let i = 0; i < n; i++) frame(); };
// A still dummy with plenty of HP at (x, y)
function dummy(x: number, y: number, hp = 9999) {
  const m = makeMob(x, y, false, { ...G.F!.mob, hp, speed: 0, wanderSpeed: 0, knockback: { light: 0, heavy: 0 } });
  G.mobs.push(m); return m;
}
const give = (id: string, evolved = false) => { G.P!.skills[1] = id; G.P!.skillCd[1] = 0; if (evolved) G.P!.evolved.push(id); };

describe('Crescent Wave', () => {
  beforeEach(() => { startRun(1); enterRoom(1); G.P!.x = 300; G.P!.y = 400; G.P!.ang = 0; });

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

  it('a wave stops at a wall', () => {
    give('crescent');
    G.WALLS.push({ x: 360, y: 300, w: 20, h: 200 });
    const behind = dummy(450, 400);
    skill(1); frames(60);
    expect(behind.hp).toBe(behind.maxHp);
  });
});

describe('the evolved sword', () => {
  beforeEach(() => { startRun(1); enterRoom(1); G.P!.x = 300; G.P!.y = 400; G.P!.ang = 0; });

  it('the combo finisher launches a 260 px wave; plain swings do not', () => {
    G.P!.evolved.push('blade');
    attack(); frames(30); attack(); frames(30);
    expect(G.waves).toHaveLength(0);
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
```

Adjust the combo timing in the sword tests if `frames(30)` falls outside the combo window (`PLAYER.combo.window`). Read `src/data/player.ts` and use a frame count that keeps the chain going. Keep the assertions.

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run tests/arts.test.ts`
Expected: FAIL (`crescent` and `G.waves` don't exist).

- [ ] **Step 3: Data (`src/data/skills.ts`)**

Add to `SKILLS`:

```ts
  crescent: { name: 'Crescent Wave', short: 'Crescent', desc: { th: 'ปล่อยคลื่นดาบพุ่งไปข้างหน้า ทะลุศัตรูทุกตัวที่ขวาง', en: 'Send a sword wave forward. It cuts through everything in its path.' }, cost: 0, pool: 'start',
    cd: 4, dmgMult: 1.6, delay: 0.25, speed: 520, range: 360, waveR: 22, fan: 18 },
```

and below `artName`:

```ts
// The evolved sword: the combo finisher also throws a wave (damage relative to the finisher hit)
export const BLADE_EVO = { range: 260, mult: 0.8 };
```

- [ ] **Step 4: State**

- `src/world/state.ts`: add `export interface Wave extends Point { vx: number; vy: number; left: number; dmg: number; art: string; hit: Set<object>; r: number }`, and add `waves: [] as Wave[]` to `G`.
- `src/world/floor.ts` `loadFloor`: add `G.waves = [];` next to `G.shots = [];`.
- `src/main.js` dev hook: add a `waves: () => G.waves` getter next to `shots`.

- [ ] **Step 5: Behaviour (`src/systems/player.js`)**

```js
// Sword waves (Crescent Wave, the evolved finisher): fly straight, hit each enemy once, die on walls or at the end of their range
function launchWave(x, y, ang, range, dmg, art) {
  const Cw = SKILLS.crescent;
  G.waves.push({ x, y, vx: Math.cos(ang) * Cw.speed, vy: Math.sin(ang) * Cw.speed, left: range, dmg, art, hit: new Set(), r: Cw.waveR });
}
function updateWaves(dt) {
  const m = mods();
  G.waves = G.waves.filter(w => {
    const step = Math.hypot(w.vx, w.vy) * dt;
    w.x += w.vx * dt; w.y += w.vy * dt; w.left -= step;
    if (w.left <= 0 || hitWall(w)) return false;
    for (const e of targets()) if (!w.hit.has(e) && dist(w, e) < w.r + e.r) { w.hit.add(e); hit(e, w.dmg, true, m, w.art); }
    return true;
  });
}
```

- In `skill()`, add the `crescent` branch:

```js
  else if (id === 'crescent') {
    const Cw = SKILLS.crescent, dmg = skillDmg(Cw, m, 'crescent');
    const angs = P.evolved.includes('crescent') ? [-Cw.fan, 0, Cw.fan].map(d => P.ang + d * Math.PI / 180) : [P.ang];
    for (const a of angs) launchWave(P.x, P.y, a, Cw.range, dmg, 'crescent');
    P.delay = Cw.delay; kick(0.03, 4);
  }
```

  Make the old final `else` (vorpal) an explicit `else if (id === 'vorpal')`.
- In `attack()`, after the hit loop, when `fin && P.evolved.includes('blade')`: `launchWave(P.x, P.y, P.ang, BLADE_EVO.range, Math.round((P.atk + m.atkBonus) * C.mult * BLADE_EVO.mult), 'blade');`. Keep `evo('blade')` on the swing damage as it is for now; Task 4 removes `EVOLVED_DMG` everywhere.
- In `updatePlayer`, call `updateWaves(dt)` once per step (top level, before the portal check).
- Import `hitWall` from `../world/physics.ts` and `BLADE_EVO` from the data file.

- [ ] **Step 6: Render (`src/render/world.js`)**

Draw each wave as a glowing crescent arc facing its direction, in the same additive style as `drawSkillFx`:

```js
function drawWaves() {
  if (!G.waves.length) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.shadowColor = '#9fe8ff'; ctx.shadowBlur = 18;
  for (const w of G.waves) {
    const a = Math.atan2(w.vy, w.vx);
    ctx.strokeStyle = `rgba(190,240,255,${Math.min(1, w.left / 120)})`; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(w.x - Math.cos(a) * w.r, w.y - Math.sin(a) * w.r, w.r * 1.4, a - 1.1, a + 1.1); ctx.stroke();
  }
  ctx.restore();
}
```

Call it after the actors are drawn, where enemy shots are drawn.

- [ ] **Step 7: Run the tests**

Run: `npx tsc -p . && npx vitest run && npx playwright test e2e/smoke.spec.ts`
Expected: PASS. Crescent is now in the start pool, so bots may pick it from elite rooms. Report any `tests/sim.test.ts` per-seed changes; don't tune.

- [ ] **Step 8: Propose commit**

`feat: add Crescent Wave and the evolved sword wave`

---

### Task 2: Riposte

**Files:**
- Modify: `src/data/skills.ts`, `src/systems/player.js`, `src/systems/combat.js`, `src/world/state.ts`, `src/world/floor.ts`, `src/render/world.js`, `src/main.js` (clock scale)
- Test: `tests/arts.test.ts`

**Interfaces:**
- Produces:
  - `SKILLS.riposte`
  - `P.parry: number` (stance time left)
  - `P.slowmo: number` (real seconds of slow motion left)
  - player.js `counter()`, called by combat.js
  - `RIPOSTE_SLOW = 0.4` (in the riposte `evo` numbers: `slow: 0.4, slowTime: 1.2`)

- [ ] **Step 1: Write the failing tests** (append to `tests/arts.test.ts`)

```ts
import { hurtPlayer } from '../src/systems/combat.js';
import { clock } from '../src/core/app.ts';
import { settings } from '../src/core/save.ts';

describe('Riposte', () => {
  beforeEach(() => { startRun(1); enterRoom(1); G.P!.x = 300; G.P!.y = 400; G.P!.inv = 0; });

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
    skill(1); frames(37); // 0.6 s stance over
    expect(G.P!.parry).toBeLessThanOrEqual(0);
    expect(G.P!.delay).toBeGreaterThan(0.2);
    hurtPlayer(10); expect(G.P!.hp).toBeLessThan(hp);
  });

  it('evolved: a counter slows the game to 40% (times assist speed) for 1.2 s of real time', () => {
    give('riposte', true); settings.assistSpeed = 0.8;
    skill(1); frames(5); hurtPlayer(10, dummy(340, 400));
    frames(1);
    expect(clock.scale).toBeCloseTo(0.4 * 0.8);
    frames(Math.ceil(1.3 * 60 * 0.4 * 0.8) + 2); // sim frames covering 1.3 s of real time at that scale
    expect(clock.scale).toBeCloseTo(0.8);
    settings.assistSpeed = 1;
  });
});
```

The harness `frame()` advances one STEP of real time through `clock.advance`. With `clock.scale` below 1, one call may run zero sim steps. Write the last test against how `frame()` actually behaves (read `tests/harness.ts`). If `frame()` advances real time, count real frames: about 1.3 × 60 calls. Keep the claims: 40% × assist while active, back to the assist speed after 1.2 s of real time.

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run tests/arts.test.ts` → FAIL.

- [ ] **Step 3: Data**

```ts
  riposte: { name: 'Riposte', short: 'Riposte', desc: { th: 'ตั้งท่ารับ ถ้าโดนตีระหว่างนั้นจะไม่เสียเลือดและสวนกลับแรงมาก ถ้าไม่โดนตีจะเสียจังหวะครู่หนึ่ง', en: "Take a guard stance. Get hit during it and you take no damage and strike back hard. If nothing hits you, you're left open for a moment." }, cost: 30, pool: 'unlock',
    cd: 5, dmgMult: 3.0, delay: 0.3, stance: 0.6, radius: 80 },
```

(`delay` is the 0.3 s you're stuck when nothing hits.) Add `slow: 0.4, slowTime: 1.2` to the riposte entry now, and move them into its `evo` block in Task 4.

- [ ] **Step 4: Behaviour**

- `state.ts` Player: `parry: number; slowmo: number;`. `floor.ts` `newPlayer`: `parry: 0, slowmo: 0`. In `loadFloor`, reset `G.P.parry = 0; G.P.slowmo = 0;` if the player exists. `free()` in player.js must also require `P.parry <= 0`.
- player.js:
  - The `skill()` branch: `else if (id === 'riposte') { P.parry = SKILLS.riposte.stance; P.moving = false; ring(P.x, P.y, 10, 40, 0.3, '255,240,200'); }`.
  - In `updatePlayer`, a new state before the roll branch: `else if (P.parry > 0) { P.parry -= dt; P.moving = false; if (P.parry <= 0) P.delay = SKILLS.riposte.delay; }`. Movement stays rooted during the stance.
  - The export:

```js
// Riposte: a hit during the stance becomes a counter around the player (the hit itself is cancelled by combat.js)
export function counter() {
  const P = G.P, R = SKILLS.riposte, m = mods();
  P.parry = 0; P.inv = 0.4;
  for (const e of targets()) if (dist(P, e) < R.radius + e.r) hit(e, skillDmg(R, m, 'riposte'), true, m, 'riposte');
  ring(P.x, P.y, 20, R.radius, 0.35, '255,240,200'); text(P.x, P.y - 30, 'RIPOSTE!', '#fff1c4', true); kick(0.12, 10);
  if (P.evolved.includes('riposte')) P.slowmo = R.slowTime;
}
```

  - Slow motion: in `updatePlayer`, while `P.slowmo > 0`, run `P.slowmo -= dt / (clock.scale || 1)` (sim dt divided by scale gives real time), and set `clock.scale = settings.assistSpeed * (P.slowmo > 0 ? R.slow : 1)`. Only write `clock.scale` while slow motion is active and on the frame it ends, so the assist setting stays the source of truth otherwise. Import `clock` from `../core/app.ts`. If that creates an import cycle, report it and pass a setter instead.
  - On `loadFloor`, death or run over, restore the scale: in `loadFloor`, after resetting `slowmo`, set `clock.scale = settings.assistSpeed`. floor.ts already imports `clock`; check.
- combat.js `hurtPlayer`: right after the dodge check and before the `P.inv` check, add `if (P.parry > 0) { counter(); return; }`. Import `counter` from `./player.js`. player.js already imports combat.js, so check whether the cycle breaks at module init. Both are function-level uses, so it should be fine; if it isn't, move `counter` into combat.js.

- [ ] **Step 5: Render**

While `P.parry > 0`, draw a pale gold shield arc in front of the player: an arc of radius 30 facing `P.ang`, alpha pulsing. During slow motion, draw a faint full-screen vignette tint, rgba(255,240,200,0.08).

- [ ] **Step 6: Run the tests**

Run: `npx tsc -p . && npx vitest run && npx playwright test e2e/smoke.spec.ts` → PASS.

- [ ] **Step 7: Propose commit**

`feat: add Riposte`

---

### Task 3: Shade Step

**Files:**
- Modify: `src/data/skills.ts`, `src/systems/player.js`, `src/world/state.ts`, `src/world/floor.ts`, `src/render/world.js`
- Test: `tests/arts.test.ts`

**Interfaces:**
- Produces:
  - `SKILLS.shade = { cd: 5, dmgMult: 2.2, delay: 0.2, reach: 220, cone: 50 /* degrees, half-angle */, dash: 120, chainGap: 0.15 }`
  - `P.shadeChain: number` (time until the evolved second step; 0 = none)
  - player.js `shadeStep(first)`

- [ ] **Step 1: Write the failing tests** (append)

```ts
describe('Shade Step', () => {
  beforeEach(() => { startRun(1); enterRoom(1); G.P!.x = 300; G.P!.y = 400; G.P!.ang = 0; });

  it('teleports behind the nearest enemy in the aim direction within 220 and stabs it for 2.2x', () => {
    give('shade');
    const t = dummy(460, 400), off = dummy(300, 560); // off: 160 away but 90 degrees off the aim
    skill(1); frames(2);
    expect(G.P!.x).toBeGreaterThan(t.x);              // landed on the far side
    expect(t.maxHp - t.hp).toBe(Math.round(G.P!.atk * SKILLS.shade.dmgMult));
    expect(off.hp).toBe(off.maxHp);
  });

  it('no target in reach: a short 120 px dash along the aim', () => {
    give('shade');
    dummy(800, 400); // too far
    skill(1); frames(20);
    expect(G.P!.x).toBeGreaterThan(400); expect(G.P!.x).toBeLessThan(440);
  });

  it('never lands inside a wall: the far side is blocked, so it lands on the near side', () => {
    give('shade');
    const t = dummy(460, 400);
    G.WALLS.push({ x: 470, y: 340, w: 60, h: 120 }); // right behind the target
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

describe('Shade Step at a sleeping boss', () => {
  it('never carries the player into the boss room while the boss sleeps', async () => {
    const { enterBoss } = await import('./harness.ts');
    startRun(1); enterBoss(4); give('shade');
    G.P!.x = G.L!.roomX - 60; G.P!.y = G.L!.h / 2; G.P!.ang = 0; G.boss!.awake = false;
    skill(1); frames(20);
    expect(G.P!.x).toBeLessThanOrEqual(G.L!.roomX);
  });
});
```

Import `hitWall` from `../src/world/physics.ts`. Check the `enterBoss` signature in the harness; it may already put the player in the antechamber. Adapt only the setup.

- [ ] **Step 2: Run to verify they fail** → FAIL.

- [ ] **Step 3: Data**

```ts
  shade: { name: 'Shade Step', short: 'Shade', desc: { th: 'วาร์ปไปข้างหลังศัตรูที่ใกล้ที่สุดตรงหน้าแล้วแทง ถ้าไม่มีเป้าหมายจะพุ่งไปข้างหน้าสั้นๆ', en: "Step behind the nearest enemy in front of you and stab. With no one in reach, it's a short dash." }, cost: 60, pool: 'unlock',
    cd: 5, dmgMult: 2.2, delay: 0.2, reach: 220, cone: 50, dash: 120, chainGap: 0.15 },
```

- [ ] **Step 4: Behaviour (`src/systems/player.js`)**

```js
// Shade Step: blink behind a target (or to its near side if the far side is blocked) and stab; no target = a short dash.
// A landing spot is valid when it's not in a wall and doesn't cross into the boss room while the boss sleeps.
function landOk(x, y) {
  const P = G.P;
  if (hitWall({ x, y, r: P.r })) return false;
  return G.boss.awake || !(x > G.L.roomX && P.x <= G.L.roomX);
}
function shadeTarget(from, cone) {
  let best = null, bd = Infinity;
  for (const e of targets()) {
    const d = dist(from, e); if (d > SKILLS.shade.reach + e.r || d >= bd) continue;
    if (cone) { let a = Math.atan2(e.y - from.y, e.x - from.x) - from.ang; a = Math.atan2(Math.sin(a), Math.cos(a)); if (Math.abs(a) > cone) continue; }
    best = e; bd = d;
  }
  return best;
}
function shadeStep(first) {
  const P = G.P, S = SKILLS.shade, m = mods();
  const e = shadeTarget(P, first ? S.cone * Math.PI / 180 : 0);
  if (!e) { if (first) { P.dash = S.dash / SK.dashSpeed; P.hitSet = new Set(); } return; } // reuses the dash state: no damage on a no-target dash, see below
  const a = Math.atan2(e.y - P.y, e.x - P.x), gap = e.r + P.r + 8;
  const spots = [[e.x + Math.cos(a) * gap, e.y + Math.sin(a) * gap], [e.x - Math.cos(a) * gap, e.y - Math.sin(a) * gap]];
  const spot = spots.find(([x, y]) => landOk(x, y));
  P.trail.push({ x: P.x, y: P.y, t: 0.25 });
  if (spot) { [P.x, P.y] = spot; P.ang = Math.atan2(e.y - P.y, e.x - P.x); }
  P.trail.push({ x: P.x, y: P.y, t: 0.25 });
  hit(e, skillDmg(S, m, 'shade'), true, m, 'shade'); burst(e.x, e.y, 12, '#b9a3ff', 240, 0.35, 4, false); kick(0.06, 6);
  P.delay = S.delay;
  if (first && P.evolved.includes('shade')) P.shadeChain = S.chainGap;
}
```

- The no-target dash reuses the Gale Rush dash state, which deals Gale Rush damage on contact. That's wrong for Shade Step. Add a `P.dashArt` field: Gale Rush sets `'sonicLeap'` and the Shade dash sets `null`. The dash-contact damage in `updatePlayer` only runs when `P.dashArt === 'sonicLeap'`. The dash length must be exactly `S.dash` px: `P.dash = S.dash / SK.dashSpeed`. The dash also goes through `dashMove`, so the boss-door rule holds. While it is the Shade dash, don't call `frostRing` (that's Gale Rush's).
- `skill()` branch: `else if (id === 'shade') shadeStep(true);`.
- In `updatePlayer`, before the state branches: `if (P.shadeChain > 0 && (P.shadeChain -= dt) <= 0) shadeStep(false);`. The chained step picks the nearest enemy within 220 in any direction, excluding the first target. Keep the first target in a `P.shadeLast` reference and skip it in `shadeTarget`.
- `state.ts`: `shadeChain: number; shadeLast: object | null; dashArt: string | null;`. `newPlayer`: `shadeChain: 0, shadeLast: null, dashArt: null`.

- [ ] **Step 5: Render**

The player trail (`P.trail`) already draws; give Shade Step a violet trail. Store a colour on trail points (`P.trail.push({ x, y, t, col })`), and have the trail draw use `b.col ?? '127,212,255'`. Keep the existing trail colour for Gale Rush.

- [ ] **Step 6: Run the tests**

Run: `npx tsc -p . && npx vitest run && npx playwright test e2e/smoke.spec.ts` → PASS.

- [ ] **Step 7: Propose commit**

`feat: add Shade Step`

---

### Task 4: Evolved Gale Rush, Cyclone Edge and Piercing Fang; names; drop the ×1.3

**Files:**
- Modify: `src/data/skills.ts`, `src/systems/player.js`, `src/world/state.ts`, `src/world/floor.ts`, `src/render/world.js`, `src/ui/screens.js`
- Test: `tests/arts.test.ts`, `tests/build.test.ts` (any assertion on ×1.3)

**Interfaces:**
- Produces: on every SKILLS entry, an `evo: { name: string; desc: Text; …numbers }`; `BLADE_EVO` gains `name`/`desc`; `evoName(id)`; `EVOLVED_DMG` and `evo()` are removed.

| Art | Evolved name | evo numbers |
|---|---|---|
| blade | Moonrend | range 260, mult 0.8 (BLADE_EVO) |
| sonicLeap | Twin Gale | charges 2, gap 0.3 |
| horizontal | Maelstrom Edge | turns 2, turnGap 0.25, pull 60 |
| vorpal | Rending Fang | lineLen 360, lineWidth 70, lineMult 1.0, lineDelay 0.2 |
| crescent | Triple Crescent | fan 18 (move it from the base entry into `evo`) |
| riposte | Still Moment | slow 0.4, slowTime 1.2 (move them into `evo`) |
| shade | Shadow Chain | chainGap 0.15 (move it into `evo`) |

Evolved descriptions (TH/EN, plain):
- Moonrend: 'ท่าปิดคอมโบปล่อยคลื่นดาบออกไปด้วย' / 'Your combo finisher also throws a sword wave.'
- Twin Gale: 'พุ่งได้ 2 ครั้งติดกันก่อนต้องรอคูลดาวน์' / 'Dash twice in a row before the cooldown.'
- Maelstrom Edge: 'หมุน 2 รอบ และดูดศัตรูเข้าหาตัว' / 'Spin twice and pull enemies in.'
- Rending Fang: 'แทงแล้วตามด้วยระเบิดเป็นแนวยาว' / 'The stab is followed by a long blast down the line.'
- Triple Crescent: 'ปล่อยคลื่นดาบ 3 ลูกเป็นรูปพัด' / 'Throw three waves in a fan.'
- Still Moment: 'สวนกลับแล้วเวลารอบตัวช้าลงครู่หนึ่ง' / 'A counter slows time for a moment.'
- Shadow Chain: 'วาร์ปต่อไปหาศัตรูอีกตัว' / 'Step on to one more enemy.'

- [ ] **Step 1: Write the failing tests** (append)

```ts
describe('evolved forms', () => {
  beforeEach(() => { startRun(1); enterRoom(1); G.P!.x = 300; G.P!.y = 400; G.P!.ang = 0; });

  it('no Art hits harder just for being evolved (the x1.3 is gone)', async () => {
    const S = await import('../src/data/skills.ts');
    expect('EVOLVED_DMG' in S).toBe(false);
    G.P!.evolved.push('blade');
    const t = dummy(330, 400); attack(); frames(1);
    expect(t.maxHp - t.hp).toBeLessThanOrEqual(G.P!.atk + 3); // plain swing range: atk + rand(0, dmgRand)
  });

  it('Twin Gale: two dashes back to back, then the full cooldown', () => {
    G.P!.evolved.push('sonicLeap');
    skill(0); frames(60 * 0.6);           // the first dash plus its follow-through
    expect(G.P!.skillCd[0]).toBeLessThanOrEqual(0);
    skill(0); expect(G.P!.dash).toBeGreaterThan(0);
    frames(60 * 0.6);
    expect(G.P!.skillCd[0]).toBeGreaterThan(1.5);
  });

  it('Maelstrom Edge: hits on two turns and pulls enemies 60 px closer', () => {
    give('horizontal', true);
    const e = dummy(370, 400);
    skill(1); frames(1);
    const once = e.maxHp - e.hp;
    frames(30);
    expect(e.maxHp - e.hp).toBe(once * 2);
    expect(e.x).toBeLessThan(370 - 50);
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
```

Also update `tests/build.test.ts` and any other test that asserted the ×1.3.

- [ ] **Step 2: Run to verify they fail** → FAIL.

- [ ] **Step 3: Data**

- Add the `evo` blocks above to each SKILLS entry, and `name`/`desc` to `BLADE_EVO`.
- Extend `SkillDef` with `evo: { name: string; desc: Text } & Record<string, unknown>`.
- Remove `EVOLVED_DMG` and its comment.
- Add `export const evoName = (id: string) => (id === 'blade' ? BLADE_EVO.name : SKILLS[id as SkillId]?.evo.name ?? id);`.
- Update every reader of the moved numbers (`crescent.fan`, `riposte.slow/slowTime`, `shade.chainGap`) to read them from `evo`.

- [ ] **Step 4: Behaviour (`src/systems/player.js`)**

- Remove `evo()` and every `* evo(...)`.
- **Twin Gale:**
  - Add `P.galeCharges` (0-2) and `P.galeT` (recharge timer). `newPlayer`: `galeCharges: 2, galeT: 0`.
  - When `sonicLeap` is used while evolved, spend one charge. If a charge is left, `P.skillCd[0] = SK.dashTime + SK.delay + SK.evo.gap`. If none is left, `P.skillCd[0] = Math.max(P.galeT, …)`.
  - The first use starts `P.galeT = S.cd * m.skillCd`.
  - In `updatePlayer`, `P.galeT -= dt`. When it runs out, refill to 2 charges and clear `skillCd[0]`.
  - Unevolved, nothing changes.
  - HUD: if hud.js draws the slot-1 cooldown from `skillCd[0]`, leave it. Optionally show a small "×2" when 2 charges are ready; skip it if it isn't trivial.
- **Maelstrom Edge:** the first hit happens as now. If evolved, set `P.spin2 = H.evo.turnGap` and `P.spin = 0.5`. When `P.spin2` runs out, hit again with the same rule. Pull non-boss targets toward the player by `H.evo.pull` px on each hit: move along the vector, through `move()`, so walls hold. The render code uses `P.spin / 0.25`, so make the spin draw handle 0.5 by drawing two turns (use `(P.spin % 0.25)`).
- **Rending Fang:** after `stab()`, if evolved, set `P.fangLine = V.evo.lineDelay` (keep `P.thrustAng`). When it runs out, hit every target inside a box of length `lineLen` and width `lineWidth` along `thrustAng` from the stab origin, for `Math.round((P.atk + m.atkBonus) * V.evo.lineMult * m.skillDmg)`, with art `'vorpal'`. Fx: a burst row along the line and `kick(0.05, 8)`. Store the stab origin in `P.fangX/P.fangY` when stabbing.
- Add the new timer fields (`spin2`, `fangLine`, `fangX`, `fangY`) to `Player` and `newPlayer`, and tick them in `updatePlayer`.

- [ ] **Step 5: UI (`src/ui/screens.js`)**

- Evolve card: `title = `${name(c.art)} → ${evoName(c.art)}``, `body = t(evoOf(c.art).desc)`. Write `evoOf` as a small local helper returning `BLADE_EVO` or `SKILLS[a].evo`.
- Mod card that evolves: append the evolved name to the "Evolves!" label: `tr('วิวัฒน์!', 'Evolves!') + ' ' + evoName(c.art)`.
- On `artEvolved`, show a toast: `toast(evoName(art), tr('ท่าวิวัฒน์แล้ว', 'Art evolved'))`. Check for an existing `artEvolved` listener first and extend it instead of adding a second toast.

- [ ] **Step 6: Render**

- Maelstrom: two turns (above).
- Rending Fang: while `P.fangLine > 0`, a dashed warning line along the full `lineLen`. When it fires, a wide bright beam for 0.18 s; reuse the `P.beam` style with the longer length. Track it with `P.fangBeam`.

- [ ] **Step 7: Run the tests**

Run: `npx tsc -p . && npx vitest run && npx playwright test e2e/smoke.spec.ts` → PASS.

- [ ] **Step 8: Propose commit**

`feat: give every Art its own evolved form`

---

### Task 5: Bots, full-loop tests and soak for the new Arts

**Files:**
- Modify: `tests/harness.ts`, `e2e/playthrough.bot.ts`, `e2e/loop.spec.ts`

- [ ] **Step 1: Bots**

- Headless bot (`tests/harness.ts`) and in-page bot (`e2e/playthrough.bot.ts`): fire skills by Art, not blindly by slot.
  - Riposte only when an enemy is winding up within 120 (`m.wind > 0`), or the boss's act is `slam`, `charge` or `leap` and it's close.
  - Crescent Wave when any enemy is within 360 in front (aim at it).
  - Shade Step when an enemy is within 220.
  - The other Arts keep the current rule: in melee reach.
- Write the rule once per bot as a small `useArts(target)` helper, used in the room and boss branches.

- [ ] **Step 2: Full loop**

Add to `e2e/loop.spec.ts`:

```ts
test('the new Arts fire in the real page: Crescent Wave, Riposte and Shade Step', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  await diveIn(page);
  await hook(page, "s.loadFloor(2, { type: 'battle', reward: 'gold' })");
  await settle(page);
  for (const id of ['crescent', 'riposte', 'shade']) {
    await hook(page, `(s.P.skills[1] = '${id}', s.P.skillCd[1] = 0)`);
    await page.keyboard.press('KeyL');
    await expect.poll(() => hook(page, 's.P.skillCd[1]')).toBeGreaterThan(0);
  }
  expect(errors).toEqual([]);
});
```

- [ ] **Step 3: Run everything and a soak**

- `npm run check` must PASS.
- `npx playwright test --config e2e/capture.config.ts e2e/playthrough.bot.ts`: both runs end with `errors: []`.
- Soak: a temporary test plays seeds 100-119 with `playRun`. Force each run's elite Art picks to cycle through the 5 slottable Arts by unlocking riposte and shade in the meta for the soak, so every new Art is exercised. Record wins, deaths by floor, timeouts, and which Arts and evolutions each run had. Write the results to the SDD workspace, then delete the temp test.
- Investigate any timeout to its root cause (game or bot?). Fix bots only when the problem is bot-only. A game bug gets reported precisely.

- [ ] **Step 4: Propose commit**

`test: cover the new Arts in bots and full-loop tests`

---

## Self-review notes

- Spec coverage (round 4): the three new Arts, with their table numbers (Tasks 1-3). The 7 evolved forms: sword and Crescent in Task 1, Riposte in Task 2, Shade in Task 3, Gale/Cyclone/Fang in Task 4. The meta pool (crescent `start`, riposte 30 / shade 60 `unlock`) comes from the data entries. Shade's wall and boss-door rule is in Task 3. The ×1.3 is removed in Task 4. Bots and tests are Task 5.
- Out of scope (round 6): card preview animations, the evolve freeze with glass shatter, a lingering glow on evolved Arts, the HUD build gems, and balance tuning.
- Watch out for:
  - The combat.js ↔ player.js cycle for `counter()`.
  - The clock scale must be restored on floor load and death.
  - The Shade no-target dash must not deal Gale Rush damage (`P.dashArt`).
  - Riposte cancels hits from every `hurtPlayer` source, including enemy shots.
- Names used across tasks:
  - Data: `SKILLS.crescent/riposte/shade`, `BLADE_EVO`, `evoName`, `evo` blocks.
  - State: `G.waves`, `Wave`.
  - player.js: `launchWave`, `updateWaves`, `counter`, `shadeStep`, `shadeTarget`, `landOk`.
  - Player fields: `parry`, `slowmo`, `shadeChain`, `shadeLast`, `dashArt`, `galeCharges`, `galeT`, `spin2`, `fangLine`, `fangX/Y`, `fangBeam`.
