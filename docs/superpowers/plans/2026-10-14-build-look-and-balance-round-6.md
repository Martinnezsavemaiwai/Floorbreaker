# Build Look and Balance, Round 6 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the build visible:
- the blade colour, element aura and evolved glow on the player
- the evolve and set-bonus moments
- HUD skill slots with element borders and mod pips, plus element gems under the HP bar
- a Build panel in the pause menu
- animated previews on pick cards
- doors drawn as arches with a floating reward icon

Then tune balance with the bots.

This is the last round of the 20-floor plan.

**Architecture:**
- **Pure helpers in `src/systems/build.js`:** `dominantElement()`, `artElements(art)`, `setProgress()`. Rendering and UI read them and never re-derive build state.
- **Events:** `setBonus` (an element just reached 3 mods) next to the existing `artEvolved`. Both drive the "moments" in `render/` and `ui/`, which honour the `shake` and `flash` settings.
- **Card previews:** a new `src/render/preview.js` draws hand-written loops on small per-card canvases. It doesn't use the combat systems or `G`.
- **Balance:** only numbers in `src/data/*`, guided by a seeded bot soak, with the sim guard in `tests/sim.test.ts` updated to the spec's wording.

**Tech Stack:** Vanilla JS + TypeScript (checked JS), Vite, Zod, Vitest, Playwright (local Chrome).

**Specs:**
- `docs/superpowers/specs/2026-10-09-in-run-progression-design.md`: "สิ่งที่ผู้เล่นเห็น" (cards, previews, the character in game, key moments, HUD, pause screen), "Meta" (already done in round 2), and "การเทสต์ / Sim".
- `docs/superpowers/specs/2026-10-09-twenty-floor-run-design.md`: "HUD และ UI" (door arches) and "เทสต์ / Sim" (the balance wording).

Both are binding. Round 6 of the order.

## Global Constraints

- **In-game look:**
  - The blade is the colour of the element with the most mods. On a tie, the element gained first wins.
  - An active element set bonus gives an aura of that colour around the player.
  - An evolved Art leaves a lingering glow when used.
- **Moments:**
  - **Evolve:** the game pauses 0.5 s, glass shatters in the element colour (the Art's dominant mod element, or a neutral glass colour if it has no mods), and the evolved name appears in the middle of the screen.
  - **Set bonus:** the aura comes up with its own sound.
  - Both honour the `flash` and `shake` settings. With `flash` off, no white or strobe flashes; use a steady glow. With `shake` off, no screen shake.
- **HUD:**
  - Each skill slot has a border in its element colour (dominant mod element of that Art), 2 mod pips, and an evolved mark.
  - Under the HP bar sit 4 element gems with a count (e.g. 2/3). A gem lights up once its set bonus is active.
- **Pause screen:** a Build section summarising the 3 Art slots and their mods, set-bonus progress for every element, and the stat upgrades.
- **Cards:**
  - Card glass is the element colour (already done).
  - A looping preview on a small canvas: the character using the Art on a training dummy, tinted by element. An evolving card shows the evolved form.
  - Stat cards get a short preview too.
  - Each card still says its effect in one sentence and keeps its 2 mod pips (already done).
- **Previews:** written separately in `src/render/preview.js` as hand-made animations per Art: 7 Arts, normal and evolved, tinted by element. They must not run the real combat systems.
- **Doors:** drawn on the canvas as an arch with the reward icon floating in it, and a name label when you walk near.
- **Balance (spec, binding wording):** "beatable in some seeds" and "most runs reach floor 5". This plan turns that into numbers for the bot soak on seeds 100-139:
  - win rate 20-70%
  - at least 70% of runs reach floor 5 (index 4, the first boss floor)
  - no timeouts and no invariant violations
- All new text is TH/EN pairs, plain voice, with no " · " joining sentences and no em dashes. Art, element and evolved names stay English.
- No gameplay randomness in rendering. Cosmetic `Math.random` is fine in render code only.
- Per-frame render work must not allocate canvases or re-create gradients needlessly. Cache per colour where practical.
- **Commits:** the user commits (global CLAUDE.md). "Propose commit" means run `git status` and `git diff --stat`, then report the message. Never run `git commit`.
- `npm run check` must pass at the end of every task.

## File Structure

| File | Responsibility |
|---|---|
| `src/systems/build.js` | `dominantElement()`, `artElements(art)`, `setProgress()`; emits `setBonus` |
| `src/core/events.ts` | `setBonus: ElementId` |
| `src/render/world.js` | blade tint, aura, evolved glow, evolve shatter fx, door arches |
| `src/render/hud.js` | slot borders/pips/evolved mark, element gems |
| `src/render/preview.js` (create) | card preview loops |
| `src/ui/screens.js`, `index.html`, `src/style.css` | evolve moment banner, pause Build panel, preview canvases in cards |
| `src/audio/audio.js` | set-bonus sound, evolve sound |
| `src/data/*.ts` | balance numbers (Task 6) |
| `tests/build.test.ts`, `tests/look.test.ts` (create), `tests/sim.test.ts`, `e2e/*` | tests |

---

### Task 1: Build helpers, the player's look and the two moments

**Files:**
- Modify: `src/systems/build.js`, `src/core/events.ts`, `src/render/world.js`, `src/ui/screens.js`, `index.html`, `src/style.css`, `src/audio/audio.js`, `src/world/state.ts` (if the player needs a glow timer)
- Create: `tests/look.test.ts`

**Interfaces:**
- Produces:
  - `dominantElement(): ElementId | null` — the most mods across all Arts; on a tie, the earliest gained.
  - `artElements(art): ElementId[]`
  - `artColor(art): string | null`
  - `setProgress(): { el: ElementId; n: number; need: number; active: boolean }[]`, in `ELEMENT_IDS` order
  - event `setBonus: ElementId`, emitted once, the moment a count reaches `EL.set.need`
  - `Player.glow: number` (lingering evolved-Art glow timer)
  - `Player.modOrder: ElementId[]` (the order elements were first gained, for ties; derived from the mods if missing)

- [ ] **Step 1: Write the failing tests**

Create `tests/look.test.ts`:

```ts
// What the build looks like: helper values the renderer and HUD read, and the moments' events.
import { describe, it, expect, beforeEach } from 'vitest';
import { G, startRun, enterRoom } from './harness.ts';
import { dominantElement, artElements, setProgress, applyCard } from '../src/systems/build.js';
import { on } from '../src/core/events.ts';

describe('build look helpers', () => {
  beforeEach(() => { startRun(1); enterRoom(1); });

  it('no mods: no dominant element; gems all 0/3', () => {
    expect(dominantElement()).toBeNull();
    expect(setProgress().map(s => s.n)).toEqual([0, 0, 0, 0]);
  });

  it('dominant element = most mods; a tie goes to the element gained first', () => {
    applyCard({ kind: 'mod', art: 'blade', el: 'storm' }, 'level');
    applyCard({ kind: 'mod', art: 'sonicLeap', el: 'ember' }, 'level');
    expect(dominantElement()).toBe('storm');
    applyCard({ kind: 'mod', art: 'sonicLeap', el: 'ember' }, 'level');
    expect(dominantElement()).toBe('ember');
    expect(artElements('sonicLeap')).toEqual(['ember', 'ember']);
  });

  it('setBonus fires once when an element reaches 3 mods', () => {
    const got: string[] = []; const off = on('setBonus', el => got.push(el));
    G.P!.skills[1] = 'horizontal';
    for (const art of ['blade', 'sonicLeap', 'horizontal']) applyCard({ kind: 'mod', art, el: 'thorn' }, 'level');
    applyCard({ kind: 'mod', art: 'horizontal', el: 'thorn' }, 'level');
    expect(got).toEqual(['thorn']);
    expect(setProgress().find(s => s.el === 'thorn')).toMatchObject({ n: 4, need: 3, active: true });
    off?.();
  });
});
```

Check how `applyCard` handles a `'level'` pick (it decrements `pendingUpgrades`). Give the player pending picks in the test setup if needed. Check whether `on()` returns an unsubscribe; if not, drop `off`. A 2-mod Art evolves automatically: that's expected and fine here.

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run tests/look.test.ts` → FAIL.

- [ ] **Step 3: Helpers and the event (`src/systems/build.js`)**

- `artElements(art) = [...(G.P.mods[art] ?? [])]`.
- `dominantElement()`:
  - Count every mod across arts and take the max.
  - On a tie, take the first element in `P.modOrder`, which records first-gain order. Push an element into `P.modOrder` the first time a mod of it is applied.
  - Return null when there are no mods.
- `artColor(art)`: the dominant element within that Art's own mods (tie → first in `modOrder`) mapped to `ELEMENTS[el].color`, or null.
- `setProgress()` uses `elementCount` / `setActive` from elements.js.
- In the mod-applying path, record each element's count before the mod. After applying, if it just reached `EL.set.need`, emit `setBonus`.
- `modOrder`: add it to `Player` (state.ts), `newPlayer`, and `cleanBuild`/resume. On resume it is derived from the restored mods in the order they appear, so the save schema is unchanged.

- [ ] **Step 4: The player's look (`src/render/world.js`)**

- **Blade tint:** when drawing the sword, if `dominantElement()` is set, tint the blade toward that colour. Use a coloured `shadowColor` glow plus a thin coloured stroke along the blade, or a cached tinted copy of the sword sprite per colour. Don't re-tint every frame.
- **Aura:** for each active set bonus, draw a soft ring or glow at the player's feet in that colour. Stack up to 4 thin rings. With `flash` off the aura is steady; with it on, a gentle pulse.
- **Evolved glow:** when a skill of an evolved Art fires, or the evolved sword finisher, set `P.glow = 0.6`. While `P.glow > 0`, draw a coloured afterglow around the player and blade, using `artColor` or a neutral pale gold. Tick `P.glow` down in `updatePlayer`.

- [ ] **Step 5: The moments**

- **Evolve** (`artEvolved`):
  - `clock.hitStop = Math.max(clock.hitStop, 0.5)`, via the existing `kick()` with shake only if `settings.shake`.
  - Glass shards in the Art's colour (`burst(..., shard=true)` around the player).
  - A centre-screen banner with the evolved name: a DOM element `#moment` modelled on `#boss-card` but centred vertically, about 2 s, showing the evolved name in large type and "Art evolved" under it.
  - This replaces the current evolve toast in `screens.js`, so the event isn't announced twice.
  - With `flash` off, no white flash; the banner still shows.
- **Set bonus** (`setBonus`): the aura appears (Step 4 handles the drawing), a dedicated sound plays in audio.js (pick an existing synth voice with a distinct pitch, or add a small new SFX in the same style as the others), and a short toast names the bonus: `ELEMENTS[el].name` and `t(ELEMENTS[el].set)`.
- **Evolve picks:** both moments happen during play. For an evolution coming from a pick, the pick scene is closing; make sure the freeze and banner still show after the picker closes rather than being hidden behind it. The `#boss-card` rule pattern pauses its animation under an open screen; reuse it.

- [ ] **Step 6: Run the tests**

Run: `npx tsc -p . && npx vitest run && npx playwright test e2e/smoke.spec.ts` → PASS.

- [ ] **Step 7: Propose commit**

`feat: show the build on the player with evolve and set-bonus moments`

---

### Task 2: HUD build: slot borders, mod pips, evolved mark, element gems

**Files:**
- Modify: `src/render/hud.js`
- Test: `tests/look.test.ts` (data the HUD reads)

- [ ] **Step 1: Implement**

- Skill slots in `drawSkillSlots`:
  - For the attack slot (Art `blade`) and every slotted Art, draw the slot border in `artColor(art)` when it has mods. Keep the existing orange ready-glow as an outer glow, or merge it with the element border so the two stay readable.
  - Draw 2 small pips along the slot's bottom edge, filled for each mod, in that mod's element colour.
  - For an evolved Art, draw a small star or diamond mark in the top-right corner.
  - Twin Gale: when `sonicLeap` is evolved, show its charges as "×2"/"×1" in the slot corner.
- Element gems under the HP bar in `drawPlayerPanel`:
  - 4 small gems in `ELEMENT_IDS` order, each with `n/3`.
  - Dim when inactive, lit with a glow when active.
  - Fit them inside or just under the panel without overlapping the floor label and Gold lines; adjust those lines' y if needed.
- Read everything from `setProgress()`, `artElements()`, `artColor()` and `P.evolved`.

- [ ] **Step 2: Test**

Add a test that `setProgress()` returns 4 entries with `need` = `EL.set.need`, and that `artElements` follows mods added to a slotted Art. The HUD itself is visual. The smoke e2e must stay error-free, so check the console in the smoke run.

- [ ] **Step 3: Run the tests**

Run: `npx tsc -p . && npx vitest run && npx playwright test e2e/smoke.spec.ts` → PASS.

- [ ] **Step 4: Propose commit**

`feat: show mods, evolutions and element sets on the HUD`

---

### Task 3: Pause menu Build panel

**Files:**
- Modify: `index.html`, `src/style.css`, `src/ui/screens.js`
- Test: `e2e/loop.spec.ts`

- [ ] **Step 1: Write the failing test** (append to `e2e/loop.spec.ts`)

```ts
test('the pause menu shows the build: Arts with mods, element sets and upgrades', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  await diveIn(page);
  await hook(page, "(s.P.skills[1] = 'horizontal', s.P.mods = { blade: ['storm'], horizontal: ['storm', 'ember'] }, s.P.evolved = ['horizontal'])");
  await page.keyboard.press('Escape');
  await expect(page.locator('#pause-build')).toBeVisible();
  await expect(page.locator('#pause-build')).toContainText('Cyclone Edge');
  await expect(page.locator('#pause-build')).toContainText('Maelstrom Edge');   // evolved name shown
  await expect(page.locator('#pause-build')).toContainText('2/3');               // Storm count
  expect(errors).toEqual([]);
});
```

- [ ] **Step 2: Run to verify it fails** → FAIL.

- [ ] **Step 3: Implement**

- `index.html`: add `<div id="pause-build" class="build"></div>` in the pause window above `#pause-stats`, with a heading `data-en="Build"`/`บิลด์`.
- `screens.js` `showPauseStats()` also renders `renderBuild()`:
  - **Arts:** a row per owned Art: the sword (Slash), Gale Rush, slot 2 and slot 3. Each row shows the Art name (the evolved name with a mark if evolved) and its mod chips (element name in its colour), or "ไม่มี mod" / "No mods".
  - **Element sets:** 4 chips with `n/3`, lit when active, and the set effect `t(ELEMENTS[el].set)` as the chip's `title` and `aria-label`.
  - **Upgrades:** move the existing upgrade list (`#pause-upgrades`) into this panel, or keep it under the panel; no duplicate.
- `style.css`: compact chips in the leaded-glass style. Element colours come from a `--glass`/`--el` custom property per chip. The panel must fit the pause window at 375 px wide without horizontal scroll.
- The panel re-renders when the language changes, as `showPauseStats` does now.

- [ ] **Step 4: Run the tests**

Run: `npx tsc -p . && npx vitest run && npx playwright test e2e/smoke.spec.ts e2e/loop.spec.ts` → PASS.

- [ ] **Step 5: Propose commit**

`feat: add a Build panel to the pause menu`

---

### Task 4: Card previews

**Files:**
- Create: `src/render/preview.js`
- Modify: `src/ui/screens.js` (`cardHtml`/`showPicker`), `src/style.css`, `src/scenes/index.js` (start/stop the preview loop with the pick scene)
- Test: `tests/look.test.ts` (pure parts), `e2e/loop.spec.ts`

**Interfaces:**
- Produces: preview.js exports `previewFor(card): { art: string; evolved: boolean; el: ElementId | null; stat?: string }`, a pure mapping that is tested, and `startPreviews(container)` / `stopPreviews()`. Those find `canvas[data-preview]` in the cards and animate them with one shared `requestAnimationFrame` loop.

- [ ] **Step 1: Write the failing tests**

`tests/look.test.ts`:

```ts
import { previewFor } from '../src/render/preview.js';
describe('card previews', () => {
  beforeEach(() => { startRun(1); enterRoom(1); });
  it('a mod card previews its Art in the element colour; the evolving one shows the evolved form', () => {
    expect(previewFor({ kind: 'mod', art: 'vorpal', el: 'storm' })).toMatchObject({ art: 'vorpal', evolved: false, el: 'storm' });
    G.P!.mods = { vorpal: ['ember'] }; G.P!.skills[1] = 'vorpal';
    expect(previewFor({ kind: 'mod', art: 'vorpal', el: 'storm' })).toMatchObject({ evolved: true });
    expect(previewFor({ kind: 'art', id: 'crescent' })).toMatchObject({ art: 'crescent', evolved: false, el: null });
    expect(previewFor({ kind: 'evolve', art: 'riposte' })).toMatchObject({ art: 'riposte', evolved: true });
    expect(previewFor({ kind: 'stat', id: Object.keys((globalThis as any).__UPGRADES ?? {})[0] ?? 'x' })).toHaveProperty('stat');
  });
});
```

Replace the stat line with a real upgrade id imported from `src/data/upgrades.ts` (or wherever `UPGRADES` lives). If importing `preview.js` in vitest pulls in canvas code, keep `previewFor` in a module with no DOM side effects at import time; preview.js must only touch the DOM inside `startPreviews`.

`e2e/loop.spec.ts`:

```ts
test('pick cards carry an animated preview', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  await diveIn(page);
  await hook(page, "(s.P.pendingUpgrades = 1, s.P.xp = 0)");
  await expect(page.locator('#upgrade')).toBeVisible({ timeout: 5_000 });
  await expect(page.locator('#upgrade-cards canvas[data-preview]').first()).toBeVisible();
  expect(errors).toEqual([]);
});
```

If setting `pendingUpgrades` doesn't open the picker on its own, use whatever the play scene checks (`hasLevelPick` / `nextPick`); read `scenes/index.js`.

- [ ] **Step 2: Run to verify they fail** → FAIL.

- [ ] **Step 3: Implement**

- `cardHtml`: add `<canvas data-preview='${JSON.stringify(previewFor(c))}' width="160" height="90" aria-hidden="true"></canvas>` at the top of each card except `skip`/`replace`, which may get a static icon or nothing.
- `preview.js` draws a looping vignette of about 1.6 s, on a dark backdrop, with a small pixel-ish character on the left and a training dummy on the right:
  - **blade:** a 3-swing combo; evolved also throws a wave on the third swing.
  - **sonicLeap:** a dash through the dummy with a trail; evolved does two dashes.
  - **horizontal:** a spin ring; evolved does two rings and the dummy is pulled in.
  - **vorpal:** a thrust beam; evolved adds a long line blast after.
  - **crescent:** a crescent wave flying through the dummy; evolved fans three.
  - **riposte:** the dummy strikes, a guard flash and a counter ring; evolved shows a brief slow-motion tint.
  - **shade:** a blink behind the dummy and a stab; evolved blinks on to a second dummy.
  - **stat:** a simple icon animation (a pulsing gem or arrow) per stat; the same generic one for all is acceptable.
- Element tint: the hit sparks and trail use `ELEMENTS[el].color`, or a neutral pale gold with no element.
- One shared rAF loop runs only while the picker is open. Start it in the pick scene's `enter`/render and stop it in `exit`.
- Respect `prefers-reduced-motion`: draw a single still frame, the key moment, instead of looping.
- `style.css`: the canvas sits at the top of the card, full card width, `image-rendering: pixelated`, with a thin lead border in the card's `--glass` colour.

- [ ] **Step 4: Run the tests**

Run: `npx tsc -p . && npx vitest run && npx playwright test e2e/smoke.spec.ts e2e/loop.spec.ts` → PASS.

- [ ] **Step 5: Propose commit**

`feat: animate a preview on every pick card`

---

### Task 5: Door arches

**Files:**
- Modify: `src/render/world.js` (`drawDoors`, `doorLook`)

- [ ] **Step 1: Implement**

- Replace the rectangle doors with a stone arch over each door rect on the right wall. The arch has a dark opening and an inner glow in the door's colour (`doorLook` colour).
- The reward icon floats in the opening and bobs. Draw it on the canvas:
  - gold: a coin
  - xp: a star
  - potion: a flask
  - elite: a horned mask
  - spring: a droplet
  - shop: a coin bag
  - shrine: a crystal
  - challenge: crossed swords
  - boss/onward: a skull or arrow
- The name label (the existing `doorLook` text) shows only when the player is within 220 px of that door, fading in. Unarmed doors draw dimmer.
- Keep the signs clamped on screen as they are now.

- [ ] **Step 2: Run the tests**

Run: `npx tsc -p . && npx vitest run && npx playwright test e2e/smoke.spec.ts e2e/loop.spec.ts` → PASS. The full loop walks through many doors.

- [ ] **Step 3: Propose commit**

`feat: draw doors as arches with a floating reward icon`

---

### Task 6: Balance pass, sim guard, screenshots

**Files:**
- Modify: `src/data/*.ts` (numbers only), `tests/sim.test.ts`, `e2e/capture.config.ts` / a temporary capture spec

- [ ] **Step 1: Measure**

Run a temporary soak on seeds 100-139 with `playRun` and record:
- win rate
- deaths by floor
- the share reaching floor 5 (index 4)
- timeouts
- per-boss fight time
- the level and HP on reaching each boss

Write the results to the SDD workspace.

- [ ] **Step 2: Tune toward the targets**

Targets: win rate 20-70%, at least 70% reach floor 5, 0 timeouts, 0 violations.

- Change only numbers in data files: mob/boss HP and damage, `mobScale`, rock damage, room rewards, XP curve.
- Prefer a few broad levers over many tweaks.
- The known shape is that the first boss (Grask, rockfall) is a wall at Lv4 while later acts are easy. Flatten that curve by softening act 1's boss slightly and raising scaling in acts 2-4.
- Re-measure after each change, keep a table of change → result, and stop as soon as all targets are met.
- Don't edit bots to change the result.
- Record the final numbers and their rationale in the report.

- [ ] **Step 3: Sim guard (`tests/sim.test.ts`)**

Rewrite `'the game is beatable and most runs reach the first boss'` to the spec's wording, on the seeds it uses. Keep the test fast, about 5-8 seeds. Pick seeds whose outcomes match the tuned game:
- at least one run wins
- most runs reach floor 5 (index ≥ 4)

Keep the invariant and no-timeout tests.

- [ ] **Step 4: Screenshots for the controller's visual check**

With a temporary Playwright spec under `e2e/capture.config.ts`, capture PNGs into the SDD workspace (not the repo):
1. a level-up picker with mod cards (previews visible)
2. the HUD with an evolved Art, 2 mods and an active set bonus (aura visible)
3. the pause Build panel
4. a room with 3 door arches
5. each boss arena during its mechanic (rock shadows, a stunned boss at a pillar, fog with a sprout, a flood with platforms)
6. the boss intro card

Delete the temporary spec afterwards.

- [ ] **Step 5: Run everything**

- `npm run check` → PASS.
- `npx playwright test --config e2e/capture.config.ts e2e/playthrough.bot.ts`: both runs end with `errors: []`.

- [ ] **Step 6: Propose commit**

`chore: tune balance toward the 20-floor targets`

---

## Self-review notes

- Spec coverage (round 6):
  - The player's look and both moments (Task 1).
  - The HUD build (Task 2).
  - The pause Build panel (Task 3).
  - Card previews (Task 4).
  - Door arches from the 20-floor spec UI section (Task 5).
  - The balance test wording and tuning (Task 6).
  - The meta page and Shard refund already shipped in round 2. `meta.loadout` stays in the save unread, per spec.
- Out of scope: sub-project A (character animation and life, an interactive merchant).
- Watch out for:
  - The evolve banner must not be hidden by the pick scene that triggered it.
  - The preview rAF loop must stop when the picker closes.
  - Tinting must be cached.
  - Balance changes are data-only.
- Names used across tasks:
  - build.js: `dominantElement`, `artElements`, `artColor`, `setProgress`.
  - Event: `setBonus`.
  - Player fields: `glow`, `modOrder`.
  - preview.js: `previewFor`, `startPreviews`, `stopPreviews`.
  - DOM: `#moment`, `#pause-build`.
