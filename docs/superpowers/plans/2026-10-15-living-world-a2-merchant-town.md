# Living World A2: Merchant and Town Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the Merchant a market stall, a cart in the wandering shop, and a voice: they face you, wave, and speak lines that fit the moment. Dress the town so it doesn't look empty: houses, benches, barrels, lamps, a notice board, with props that differ per act. Add two townsfolk per town who wander and speak.

**Architecture:**
- **Dialogue:** pure data and a pure picker `pickLine(who, ctx)` in a new `src/data/dialogue.ts`.
- **Props:** town props are data in `layoutFor('town')`, plus an act variant set.
  - `loadFloor` adds the solid ones to `G.WALLS`.
  - `src/render/props.js` draws them. Low or flat props are baked into the floor background in `paintFloor`. Tall props (stall, cart, lamp posts, notice board) are pre-rendered once per floor to small offscreen canvases and drawn in the y-sorted actor list.
- **Merchant behaviour:** in a new `src/systems/merchant.js`, updated from `updateGame` so it pauses with the game.
- **Townsfolk:** in a new `src/systems/townsfolk.js`.
- **Animation:** both use `pose()` from A1.
- **Randomness:** all cosmetic, via `Math.random`, never `rng()`.

**Tech Stack:** Vanilla JS + TypeScript (checked JS), Vite, Zod, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-15-living-world-design.md`, sections "หลักร่วมของทั้ง 3 รอบ" and "A2: Merchant และเมือง" (binding).

## Global Constraints

- **No gameplay change**, except the new solid props, which must never block the walk from the start `(150, 400)` to the town door(s) or the merchant's front.
  - `tests/sim.test.ts`, including determinism and the balance guard, must pass unchanged.
  - Bots must still buy from the merchant in town and in the wandering shop.
- **Merchant placement (ruling, see ledger):**
  - The Merchant stands in FRONT of the stall or cart: the solid stall is behind (north of) them.
  - `L.merchant` stays the Merchant's feet, and you talk to them from the south.
  - So `nearMerchant()` (`MERCHANT_REACH` from `L.merchant`), the bots (`walkTo(L.merchant.x, L.merchant.y + 30)`) and the e2e shop test keep working unchanged.
- **Town (1200×800):**
  - Fountain stays at `(600, 300)`.
  - Merchant at `(860, 340)`, with the stall's solid rect behind them at `{ x: 800, y: 250, w: 120, h: 56 }`. It is drawn as an awning stall about 120 px wide in the act's glass colour (title-screen lancet colours from DESIGN.md / the `--glass` act tokens).
  - Houses: 4 house fronts along the top edge, solid, at `y` 0..150. Leave the area within 80 px of any door rect free.
  - Props (positions are a starting point; adjust to avoid overlaps, but keep the rules):

    | Prop | Solid | Position |
    |---|---|---|
    | benches | yes, ~60×18 | (420, 500), (760, 500) |
    | barrels | yes, ~26×26 | 2 beside the stall |
    | lamp posts | yes, 12×12 base, ~70 px tall | (330, 310), (880, 560) |
    | planters | no, walk-behind | 3-4 around the plaza |
    | notice board | yes, ~50×14 base | (250, 210) |

  - Per-act extras:
    - Firstlight: more flower planters
    - Hornfield: 2 hay bales (solid)
    - Mistwell: hanging lanterns and moss patches
    - Canalis: crates and 2 mooring posts (solid)
  - The town name moves off the bare floor (the old text at y=80 would sit under the houses) onto a banner over the middle house.
- **Wandering shop room:** a cart (stall on wheels, crates and sacks around) whose solid rect sits behind the Merchant at `ROOM_POINT` `(600, 400)`: `{ x: 545, y: 322, w: 110, h: 50 }`. This stays inside `CENTER_ZONE`, so room presets keep it clear.
- **Merchant behaviour:**
  - faces the player (sheet column via `dirCol`) when within 220 px
  - waves once per town visit on the first approach within 160 px: a 0.6 s hop and tilt added on top of the pose
  - **speech bubble:**
    - one at a time, 3 s on screen, 6 s quiet before the next
    - drawn on the canvas above the head, clamped on screen
    - hidden while any screen (shop, pause, pick) is open
  - **line choice by priority:**
    1. first town visit of the run
    2. HP below 40%
    3. back after a boss (towns of acts 2-4, first approach)
    4. can't afford any item
    5. Potions full
    6. a generic line for the act
  - **shop window:** a Merchant line under the window title (`#shop-line`) that changes on open, on a successful buy, on "not enough Gold", and on buying an element mod (wandering shop). Closing the shop shows a farewell bubble.
  - The wandering Merchant uses their own line set.
- **Townsfolk:**
  - 2 per town, using the `merchant` sheet recoloured with `tinted(img, 'multiply', col)` (two colours, built once at asset load)
  - wander between `L.folkPoints`, pause 2-5 s, use `move()` so they collide with walls
  - the player passes through them, and mobs ignore them
  - within 120 px they stop, face the player and say 1 line per town visit; no window
  - not saved; rebuilt on `loadFloor` of a town
- **Text:** all lines are the exact TH/EN pairs in Task 1, plain voice, no " · " joining sentences, no em dashes, game nouns in English.
- **Per-frame cost:** tall props pre-rendered once per floor; no canvas or gradient creation per frame.
- **Reduced motion:** the wave hop and the lantern sway are halved, and the townsfolk walk at the same speed (walking isn't decorative motion).
- **Commits:** the user commits (global CLAUDE.md). "Propose commit" = run `git status` and `git diff --stat` and report the message. Never run `git commit`.
- `npm run check` must pass at the end of every task.

## File Structure

| File | Responsibility |
|---|---|
| `src/data/dialogue.ts` (create) | all lines (TH/EN) + `pickLine(who, ctx)` |
| `src/world/layout.ts` | town `props`, act extras, `folkPoints`, merchant/stall positions |
| `src/world/floor.ts` | solid props → `G.WALLS`; cart in shop rooms; build merchant + townsfolk state |
| `src/render/props.js` (create) | draw stall, cart, houses, benches, barrels, lamps, board, planters, act extras; pre-render tall props |
| `src/render/terrain.js` | bake low props; town name banner |
| `src/render/world.js` | tall props + townsfolk in the actor list; merchant pose/facing/wave; speech bubbles |
| `src/systems/merchant.js` (create) | merchant facing, wave, bubble timing, line choice context |
| `src/systems/townsfolk.js` (create) | townsfolk wander + speak |
| `src/systems/index.js` | call `updateMerchant(dt)` / `updateFolk(dt)` |
| `src/core/assets.ts` | two tinted townsfolk sheets |
| `index.html`, `src/style.css`, `src/ui/screens.js`, `src/scenes/index.js` | `#shop-line`; farewell on close; town toast/hint text ("at the market stall") |
| `tests/town.test.ts` (create), `e2e/loop.spec.ts` | tests |

---

### Task 1: Dialogue data and `pickLine`

**Files:**
- Create: `src/data/dialogue.ts`, `tests/town.test.ts`

**Interfaces:**
- Produces:
  - `type Who = 'merchant' | 'wanderer' | 'folk'`
  - `type LineCtx = { act: number; firstVisit?: boolean; lowHp?: boolean; afterBoss?: boolean; broke?: boolean; potionsFull?: boolean; event?: 'open' | 'bought' | 'cantAfford' | 'boughtMod' | 'farewell' | 'greet' }`
  - `pickLine(who, ctx, r = Math.random): Text`
    - with `event`: returns that event's line, picking among variants with `r`
    - otherwise: the first matching situation by priority (firstVisit, lowHp, afterBoss, broke, potionsFull), then a generic line for `ctx.act`
    - `folk` always returns one of that act's folk lines
  - `LINES` (the table)

- [ ] **Step 1: Write the lines (`src/data/dialogue.ts`), exactly these pairs**

```ts
// What NPCs say. Plain voice, no speeches. pickLine chooses by situation (merchant) or by act (townsfolk).
import type { Text } from '../core/i18n.ts';
type Pool = Text[];
export const LINES = {
  merchant: {
    firstVisit: [{ th: 'มาใหม่สินะ ซื้อ Potion ติดตัวไว้สักขวดก่อนออกไป', en: 'New here? Take a Potion with you before you head out.' }],
    lowHp: [{ th: 'เลือดออกขนาดนั้นยังจะเดินต่ออีกเหรอ ดื่ม Potion ก่อนเถอะ', en: "You're bleeding. Drink something before you go on." }],
    afterBoss: [{ th: 'ได้ยินว่าตัวข้างบนล้มแล้ว ใช่ฝีมือคุณรึเปล่า', en: 'Heard the thing upstairs went down. That was you?' }],
    broke: [{ th: 'ไม่มีเงินก็ยืนดูได้ ไม่คิดค่าดู', en: 'No coin? Looking is free.' }],
    potionsFull: [{ th: 'กระเป๋าเต็มแล้ว ใส่ Potion เพิ่มไม่ได้หรอก', en: "Your bag's full. No room for another Potion." }],
    generic: [ // one pool per act
      [{ th: 'ชั้นแรกๆ ยังพอไหว ชั้นถัดไปไม่แน่', en: "The first floors are kind. The rest aren't." }],
      [{ th: 'พวกมีเขาข้างนอกชอบพุ่งชน อย่ายืนเป็นเส้นตรงกับมัน', en: "The horned ones charge. Don't stand in a straight line with them." }],
      [{ th: 'หมอกหนาขึ้นทุกวัน ฉันแทบมองไม่เห็นป้ายร้านตัวเอง', en: 'The mist gets thicker every day. I can barely see my own sign.' }],
      [{ th: 'น้ำขึ้นถึงขั้นบันไดแล้ว ถ้าได้ยินเสียงน้ำ ให้หาที่สูงไว้', en: "The water's up to the steps. If you hear it rising, find high ground." }],
    ],
    open: [{ th: 'ดูตามสบาย', en: 'Take your time.' }],
    bought: [{ th: 'ขอบใจ ใช้ให้คุ้มล่ะ', en: 'Thanks. Make it count.' }],
    cantAfford: [{ th: 'เงินยังไม่พอ', en: 'Not enough Gold for that.' }],
    farewell: [{ th: 'ระวังตัวด้วย', en: 'Watch yourself out there.' }, { th: 'กลับมาอีกนะ ถ้ายังไหว', en: 'Come back. If you can.' }],
  },
  wanderer: {
    greet: [{ th: 'ไม่คิดว่าจะเจอคนในนี้', en: "Didn't expect company down here." }],
    generic: [{ th: 'ของแพงกว่าในเมือง ก็แบกลงมาเองนี่นา', en: 'Pricier than town. I carried all of it here myself.' },
              { th: 'ฉันขายของไปทั่วหอคอย ไม่ค่อยอยู่ที่ไหนนาน', en: "I sell all over the tower. I don't stay anywhere long." }],
    open: [{ th: 'ของมีจำกัด เลือกดีๆ', en: 'Stock is short. Choose well.' }],
    bought: [{ th: 'ขอบใจ ใช้ให้คุ้มล่ะ', en: 'Thanks. Make it count.' }],
    boughtMod: [{ th: 'ธาตุนี้เข้ากับดาบคุณดี', en: 'That one suits your blade.' }],
    cantAfford: [{ th: 'เงินยังไม่พอ', en: 'Not enough Gold for that.' }],
    farewell: [{ th: 'ถ้าโชคดี เจอกันอีกไม่กี่ชั้นข้างบน', en: 'With luck, see you a few floors up.' }],
  },
  folk: [ // one pool per act
    [{ th: 'เห็นประตูทางขวานั่นไหม ทุกคนที่เข้าไปบอกว่าจะกลับมา', en: "See that door on the right? Everyone who went in said they'd be back." },
     { th: 'ตอนเด็กๆ ฉันนึกว่าหอนี้ไม่มีชั้นบนสุด', en: 'When I was a kid I thought this tower had no top.' }],
    [{ th: 'ราชาเขาโคอยู่ชั้นสิบ เสาในห้องนั้นแตกง่ายกว่าที่เห็น', en: 'The Horned King waits on floor ten. The pillars in there break easier than they look.' },
     { th: 'ฟางกองนั้นเก็บไว้ให้วัว ไม่ใช่ให้นั่ง', en: "That hay's for the cattle, not for sitting." }],
    [{ th: 'ในหมอกมีรากงอกขึ้นมา ตัดมันทิ้งแล้วจะมองเห็นทาง', en: "Roots grow in the mist. Cut them and you'll see the way." },
     { th: 'โคมพวกนี้จุดไว้ทั้งวัน ไม่งั้นคนหลงทาง', en: 'We keep these lamps lit all day or people get lost.' }],
    [{ th: 'นางม้าชั้นยี่สิบทำน้ำท่วมห้อง ขึ้นไปยืนบนหินไว้', en: 'The Tide Mare floods her hall. Get up on the stones.' },
     { th: 'เรือลำสุดท้ายออกไปเมื่อเดือนก่อน ไม่มีใครกลับมา', en: 'The last boat left a month ago. Nobody came back.' }],
  ] as Pool[],
};
```

Add `pickLine` below, following the interface. Keep the table's shape, and tighten the types with `satisfies` if useful.

- [ ] **Step 2: Write the failing tests (`tests/town.test.ts`)**

```ts
// NPC dialogue: which line a situation picks, and that every line exists in both languages.
import { describe, it, expect } from 'vitest';
import { pickLine, LINES } from '../src/data/dialogue.ts';

const all = (x: unknown): { th: string; en: string }[] => Array.isArray(x) ? x.flatMap(all) : (x && typeof x === 'object' && 'th' in (x as object)) ? [x as any] : Object.values(x as object).flatMap(all);

describe('dialogue', () => {
  it('every line has Thai and English, no em dashes, no " · " joins', () => {
    for (const l of all(LINES)) {
      expect(l.th.length && l.en.length).toBeTruthy();
      expect(l.th + l.en).not.toMatch(/—| · /);
    }
  });
  it('merchant situations follow the priority order', () => {
    const m = (c: object) => pickLine('merchant', { act: 1, ...c }, () => 0).en;
    expect(m({ firstVisit: true, lowHp: true })).toBe(LINES.merchant.firstVisit[0].en);
    expect(m({ lowHp: true, broke: true })).toBe(LINES.merchant.lowHp[0].en);
    expect(m({ afterBoss: true, potionsFull: true })).toBe(LINES.merchant.afterBoss[0].en);
    expect(m({ broke: true, potionsFull: true })).toBe(LINES.merchant.broke[0].en);
    expect(m({ potionsFull: true })).toBe(LINES.merchant.potionsFull[0].en);
    expect(m({})).toBe(LINES.merchant.generic[1][0].en);
  });
  it('events win over situations; the wanderer and townsfolk use their own pools', () => {
    expect(pickLine('merchant', { act: 0, lowHp: true, event: 'bought' }, () => 0).en).toBe(LINES.merchant.bought[0].en);
    expect(pickLine('wanderer', { act: 2, event: 'boughtMod' }, () => 0).en).toBe(LINES.wanderer.boughtMod[0].en);
    expect(LINES.folk[3].map(l => l.en)).toContain(pickLine('folk', { act: 3 }, () => 0.99).en);
  });
});
```

- [ ] **Step 3: Run** `npx tsc -p . && npx vitest run tests/town.test.ts` → PASS after implementing. `npx vitest run` → PASS.

- [ ] **Step 4: Propose commit** `feat: add NPC dialogue lines and a situation picker`

---

### Task 2: The stall, the cart and the town props

**Files:**
- Create: `src/render/props.js`
- Modify: `src/world/layout.ts`, `src/world/floor.ts`, `src/render/terrain.js`, `src/render/world.js`, `src/ui/screens.js`, `src/systems/hints.js`
- Test: `tests/town.test.ts`

- [ ] **Step 1: Write the failing tests** (append)

```ts
import { G, startRun, frame } from './harness.ts';
import { loadFloor } from '../src/world/floor.ts';
import { hitWall } from '../src/world/physics.ts';

// Grid walk (20 px cells, player radius) from a to b avoiding walls: true if reachable
function reachable(a: { x: number; y: number }, b: { x: number; y: number }) {
  const S = 20, W = Math.ceil(G.L!.w / S), H = Math.ceil(G.L!.h / S), seen = new Set<number>(), q = [[Math.round(a.x / S), Math.round(a.y / S)]];
  const free = (cx: number, cy: number) => cx >= 0 && cy >= 0 && cx < W && cy < H && !hitWall({ x: cx * S, y: cy * S, r: 14 });
  while (q.length) {
    const [cx, cy] = q.shift()!; const k = cy * W + cx;
    if (seen.has(k) || !free(cx, cy)) continue; seen.add(k);
    if (Math.hypot(cx * S - b.x, cy * S - b.y) < S * 1.5) return true;
    q.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
  }
  return false;
}

describe('town layout', () => {
  for (const i of [0, 5, 10, 15]) it(`floor ${i + 1}: props are solid, the merchant and every door are reachable from the start`, () => {
    startRun(1); loadFloor(i);
    expect(G.L!.props!.length).toBeGreaterThan(6);
    const stall = G.L!.props!.find(p => p.kind === 'stall')!;
    expect(hitWall({ x: stall.x + stall.w / 2, y: stall.y + stall.h / 2, r: 4 })).toBe(true);
    const start = G.L!.start, m = G.L!.merchant!;
    expect(reachable(start, { x: m.x, y: m.y + 30 })).toBe(true);
    for (const d of G.doors) expect(reachable(start, { x: d.x + d.w / 2 - 30, y: d.y + d.h / 2 })).toBe(true);
    expect(hitWall({ x: start.x, y: start.y, r: 14 })).toBe(false);
  });
  it('the wandering shop has a cart behind the merchant', () => {
    startRun(1); loadFloor(2, { type: 'shop', reward: null });
    const m = G.L!.merchant!;
    expect(hitWall({ x: m.x, y: m.y - 50, r: 4 })).toBe(true);    // the cart
    expect(hitWall({ x: m.x, y: m.y + 30, r: 14 })).toBe(false);  // the player's spot in front
  });
});
```

Adapt the door target point to where the door's walkable side really is: doors sit on the right wall, so aim a little left of the rect. Keep the claims.

- [ ] **Step 2: Run to verify they fail** → FAIL.

- [ ] **Step 3: Implement**

- **`layout.ts`:**
  - Add `props?: Prop[]` with `Prop = { kind: string; x: number; y: number; w: number; h: number; solid: boolean; tall?: boolean }` (rect = solid base / footprint), and `folkPoints?: Point[]` (6-8 plaza points that are clear of props).
  - Town: `merchant: { x: 860, y: 340 }`, plus the props from the Global Constraints. Expose an act-extras helper so `loadFloor` can add the act's extras (`layoutFor(kind)` doesn't know the act; pass the act in, or add the extras in `loadFloor`, whichever fits better).
- **`floor.ts` `loadFloor`:**
  - push every `solid` prop rect into `G.WALLS`
  - in shop rooms, add the cart prop behind the Merchant
  - move the "merchant is by the fountain" town toast and hint text to "at the market stall": TH 'พ่อค้าอยู่ที่แผงร้าน' / EN 'The merchant is at the market stall.' (update `screens.js` floorLoaded toast and `hints.js`, keeping their sentence shape)
- **`props.js`:**
  - one draw function per kind, using canvas primitives only, in the act colours
  - `prerenderTall(props)` builds one small offscreen canvas per tall prop, once per floor on `floorLoaded`
  - `drawTall(p)` blits it; the lantern on the stall and the lamp flames are drawn live on top with a gentle sway
- **`terrain.js` `paintFloor`:**
  - bake non-tall props (houses, benches, barrels, planters, hay, crates, moss) after the ground and before the fountain/trees, sorted by y
  - replace the town name text with a banner over the middle house
- **`world.js`:**
  - add tall props to the y-sorted actor list (sort key: the prop's base `y + h`)
  - draw the Merchant (town and shop room) using `pose(..., 'npc', ...)`, which falls back to player tables; facing and wave come in Task 3

- [ ] **Step 4: Run** `npx tsc -p . && npx vitest run && npx playwright test e2e/smoke.spec.ts e2e/loop.spec.ts` → PASS. `tests/sim.test.ts` must pass unchanged (bots shop at the stall). If a bot now gets stuck in town, the layout is wrong: fix the layout, not the bot.

- [ ] **Step 5: Propose commit** `feat: build a market stall, a merchant cart and a dressed town`

---

### Task 3: The Merchant comes alive

**Files:**
- Create: `src/systems/merchant.js`
- Modify: `src/systems/index.js`, `src/render/world.js`, `src/world/state.ts`, `src/world/floor.ts`, `index.html`, `src/style.css`, `src/ui/screens.js`, `src/scenes/index.js`
- Test: `tests/town.test.ts`, `e2e/loop.spec.ts`

**Interfaces:**
- Produces:
  - `G.npc: { merchant?: { face: number; waved: boolean; wave: number; bubble: { text: Text; t: number } | null; quiet: number; greeted: boolean } }`, rebuilt on `loadFloor` for towns and shop rooms
  - `merchantCtx(): LineCtx`, which builds the situation from `G` (first town visit = floor 0 and not yet greeted; `lowHp` = hp < 40%; `afterBoss` = town of act ≥ 1 on first approach; `broke` = can't afford any shop item; `potionsFull`)
  - `say(text)`

- [ ] **Step 1: Write the failing tests** (append to `tests/town.test.ts`)

```ts
import { updateMerchant } from '../src/systems/merchant.js';
describe('merchant behaviour', () => {
  it('faces the player within 220 px, waves once, and greets with the first-visit line', () => {
    startRun(1); loadFloor(0);
    const m = G.L!.merchant!; G.P!.x = m.x - 150; G.P!.y = m.y + 40;
    updateMerchant(0.1);
    const M = G.npc!.merchant!;
    expect(M.waved).toBe(true); expect(M.bubble?.text.en).toBe(LINES.merchant.firstVisit[0].en);
    G.P!.x = m.x - 400; for (let i = 0; i < 100; i++) updateMerchant(0.1); G.P!.x = m.x - 150; updateMerchant(0.1);
    expect(M.waved).toBe(true); // still the same visit: no second wave
  });
  it('low HP outranks the generic line once the quiet time has passed', () => {
    startRun(1); loadFloor(5); G.npc!.merchant!.greeted = true; G.P!.hp = 5;
    const m = G.L!.merchant!; G.P!.x = m.x; G.P!.y = m.y + 60;
    for (let i = 0; i < 100; i++) updateMerchant(0.1);
    expect(G.npc!.merchant!.bubble?.text.en ?? '').not.toBe('');
  });
});
```

Read the `LINES` import already at the top of the file. Make the second test meaningful: after the first bubble expires and the quiet time passes, the next bubble with HP 5 must be the `lowHp` line. Assert exactly that, adjusting loop counts to the 3 s + 6 s timing.

`e2e/loop.spec.ts`, inside the existing clear-loop shop step or as a new test:

```ts
test('the merchant talks in the shop window and changes the line after a purchase', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  await diveIn(page);
  await hook(page, 's.P.col = 999, s.P.x = s.L.merchant.x, s.P.y = s.L.merchant.y + 30');
  await page.keyboard.press('KeyE');
  await expect(page.locator('#shop-line')).not.toBeEmpty();
  const before = await page.locator('#shop-line').textContent();
  await page.keyboard.press('Digit1');
  await expect(page.locator('#shop-line')).not.toHaveText(before!);
  expect(errors).toEqual([]);
});
```

- [ ] **Step 2: Run to verify they fail** → FAIL.

- [ ] **Step 3: Implement**

- `merchant.js` `updateMerchant(dt)`, called from `updateGame` after the room update:
  - face toward the player when within 220 px
  - on the first approach within 160 px of this visit, set `waved` and `wave = 0.6`, then say the context line
  - tick `bubble.t` and `quiet`; when `quiet <= 0` and the player is within 220, say `pickLine(who, merchantCtx())` and set `quiet = 9` (3 s shown + 6 s quiet)
  - `who` = `'wanderer'` in shop rooms, `'merchant'` in towns
  - the wanderer's first line is `greet`
- **Render:**
  - in `world.js`, draw the Merchant with `pose()` and the facing column; the wave adds a hop (`oy` −6·sin) and a tilt (±0.12 rad) over 0.6 s, halved under reduced motion
  - draw the speech bubble: a rounded dark-glass box with a tail, text in the UI font, max width 240 px with wrapping, clamped on screen; hidden while any screen is open (`body:has(.screen.on)` doesn't apply to canvas, so check the scene stack in render)
- **Shop window:**
  - `index.html`: add `<p class="shop-line" id="shop-line" aria-live="polite"></p>` under the shop header
  - `screens.js` `renderShop(status, line)` shows the line
  - `scenes/index.js`: the shop scene's `enter` sets the `open` line; `buyItem` sets `bought` / `cantAfford` / `boughtMod` (mod purchase); `closeShop` triggers a `farewell` bubble via `say()`
  - `style.css`: italic, `--ink-2`, small; fits at 375 px

- [ ] **Step 4: Run** `npx tsc -p . && npx vitest run && npx playwright test e2e/smoke.spec.ts e2e/loop.spec.ts` → PASS (sim unchanged).

- [ ] **Step 5: Propose commit** `feat: let the merchant face you, wave and talk`

---

### Task 4: Townsfolk

**Files:**
- Create: `src/systems/townsfolk.js`
- Modify: `src/core/assets.ts`, `src/systems/index.js`, `src/world/floor.ts`, `src/render/world.js`, `src/world/state.ts`
- Test: `tests/town.test.ts`

- [ ] **Step 1: Write the failing tests** (append)

```ts
import { updateFolk } from '../src/systems/townsfolk.js';
describe('townsfolk', () => {
  it('two per town, they wander for a minute without ending up inside a wall or out of bounds', () => {
    startRun(1); loadFloor(0);
    expect(G.npc!.folk!).toHaveLength(2);
    G.P!.x = 100; G.P!.y = 700; // far away
    for (let i = 0; i < 60 * 60; i++) updateFolk(1 / 60);
    for (const f of G.npc!.folk!) {
      expect(hitWall({ x: f.x, y: f.y, r: 10 })).toBe(false);
      expect(f.x).toBeGreaterThan(0); expect(f.x).toBeLessThan(G.L!.w); expect(f.y).toBeGreaterThan(0); expect(f.y).toBeLessThan(G.L!.h);
    }
  });
  it('one walks up to the player: it stops, faces them and says one line per visit', () => {
    startRun(1); loadFloor(10);
    const f = G.npc!.folk![0]; G.P!.x = f.x + 60; G.P!.y = f.y;
    updateFolk(0.1);
    expect(f.bubble?.text).toBeTruthy(); expect(LINES.folk[2].map(l => l.en)).toContain(f.bubble!.text.en);
    const said = f.bubble!.text; f.bubble = null; for (let i = 0; i < 50; i++) updateFolk(0.1);
    expect(f.bubble).toBeNull(); expect(said).toBeTruthy();
  });
  it('rooms and boss floors have no townsfolk', () => {
    startRun(1); loadFloor(2, { type: 'battle', reward: 'gold' }); expect(G.npc?.folk ?? []).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run to verify they fail** → FAIL.

- [ ] **Step 3: Implement**

- `assets.ts`: after `merchant` loads, build `IMG.folkA` / `IMG.folkB` with `tinted(img, 'multiply', '#7fa8d8')` / `'#b98c6a'`, once.
- `townsfolk.js`:
  - `buildFolk()` (on town `loadFloor`): 2 folk at random distinct `folkPoints`, each `{ x, y, r: 10, sheet, face, target, wait, said: false, bubble: null }`
  - `updateFolk(dt)`, from `updateGame`:
    - pick a new random `folkPoint` when idle (`Math.random`); walk toward it at 55 px/s with `move()` so walls hold; wait 2-5 s on arrival
    - if stuck (no progress for 1 s), pick another point
    - within 120 px of the player: stop and face them; if not `said`, say one line `pickLine('folk', { act })` for 3 s and set `said = true`
- `world.js`: add folk to the y-sorted actors, drawn with `frame()` on their sheet, the walk row when moving, `pose(f, 'npc', …)` and a facing column. Draw their bubbles with the same bubble drawer as the Merchant.
- `state.ts`: `G.npc` typed.

- [ ] **Step 4: Run** `npx tsc -p . && npx vitest run && npx playwright test e2e/smoke.spec.ts e2e/loop.spec.ts` → PASS (sim unchanged).

- [ ] **Step 5: Propose commit** `feat: add townsfolk who wander and talk`

---

### Task 5: Screenshots, the in-page bot, and a soak check

**Files:**
- Temporary only (capture spec, soak test), deleted afterwards

- [ ] **Step 1: Screenshots**

Save PNGs into the SDD workspace `shots/`:
1. town of each act (4 shots), with the player near the stall, the Merchant's bubble visible, and a townsperson visible
2. the shop window with `#shop-line`
3. the wandering shop room with the cart
4. a townsperson speaking

- [ ] **Step 2: Bots**

- `npx playwright test --config e2e/capture.config.ts e2e/playthrough.bot.ts`: both runs end with `errors: []`.
- Soak seeds 100-119 with `playRun`: no timeouts, no violations. The win rate should stay in line with round 6 (around 65%), since there is no gameplay change. Report any shift.

- [ ] **Step 3: Run** `npm run check` → PASS.

- [ ] **Step 4: Propose commit** (none if no tracked files changed)

---

## Self-review notes

- **Spec coverage (A2):**
  - stall and cart (Task 2)
  - the dressed town with per-act variety and the town-name banner (Task 2)
  - the Merchant's facing, wave, situational bubbles, shop-window line and farewell, plus the wanderer set (Tasks 1, 3)
  - townsfolk (Task 4)
  - tests, bots and visuals (Tasks 2-5)
- **Deviation from the spec, ruled in the ledger:** the Merchant stands in front of the stall, not behind a counter. This keeps `nearMerchant`, the bots and the e2e unchanged.
- **Watch out for:**
  - Props must never block the start → door path (grid test).
  - `pose(…, 'npc')` relies on A1's unknown-kind fallback.
  - Bubbles are hidden under screens.
  - No `rng()`.
- **Names:**
  - `LINES`, `pickLine`, `Who`, `LineCtx`
  - `Prop`, `L.props`, `L.folkPoints`
  - `G.npc.merchant` / `G.npc.folk`
  - `updateMerchant`, `merchantCtx`, `say`, `updateFolk`, `buildFolk`
  - `IMG.folkA`, `IMG.folkB`
  - `#shop-line`
