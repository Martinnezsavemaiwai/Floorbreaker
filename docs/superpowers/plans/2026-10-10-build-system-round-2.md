# Build System, Round 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the 20-floor run an in-run build: 4 elements, element mods on Blade Arts, level-up cards that mix mods with stat upgrades, elite rooms that award a new Blade Art, and bosses that award an evolution shard.

**Architecture:** Element data lives in `src/data/elements.ts`. Status effects and set bonuses live in `src/systems/elements.js`, applied from one place (`hurtEnemy`). The build state (`P.skills` with 3 slots, `P.mods`, `P.evolved`) and every card roll and apply live in `src/systems/build.js`. One generic pick scene shows level-up, new-Art and evolution cards. Save version 3 stores the build and refunds Shards for Arts that became free.

**Tech Stack:** Vanilla JS + TypeScript (checked JS), Vite, Zod, Vitest, Playwright (local Chrome).

**Spec:** `docs/superpowers/specs/2026-10-09-in-run-progression-design.md` (sections: reward beats, Arts, elements, mods and evolution, meta, save, edge cases), sequenced by `docs/superpowers/specs/2026-10-09-twenty-floor-run-design.md` round 2 ("ระบบ build หลัก: ธาตุ, mod, การ์ดเลเวลอัป, ห้อง elite ให้ท่าใหม่, บอสให้เศษกระจก").

## Global Constraints

- Slots: 3. Slot 1 = Gale Rush (`sonicLeap`), fixed. Slots 2 and 3 start empty every run.
- Mod targets: `blade` (the basic sword), `sonicLeap`, and every Art in a slot. At most 2 mods per Art. The same element twice is allowed (effect ×1.5).
- Elements (exact values): Ember `#ff963c` burns for 20% of the hit's damage per second for 3 s, stacking to 3. Storm `#a688ff` chains to 2 more enemies within 140 px for 40% damage. Thorn `#78ff96` poisons for 15%/s for 4 s and slows 30% for 2 s. Tide `#5ac8ff` gives ×1.5 knockback; 3 Tide hits on one enemy within 2 s freeze it for 0.6 s, but bosses get a 40% slow for 0.6 s instead.
- Set bonuses at 3 mods of one element (counted across all Arts): Ember: an enemy dying while burning explodes for 2× attack in 70 px. Storm: every 6th Art hit calls a bolt for 2× attack. Thorn: killing a poisoned enemy heals 2 HP. Tide: rolling or dashing leaves a frost ring of 90 px that slows 40% for 1.5 s.
- Level-up card weights: mod 2 : stat 1 whenever a mod is available.
- 2 mods on one Art → it evolves at once. Round 2 gives an evolved Art an interim ×1.3 damage. Round 4 replaces this with the hand-made evolved forms.
- Elite room: 1 elite (the act's melee mob ×4 HP, ×1.5 damage) plus 3 of the act's melee mobs. Clearing it opens a pick of 1 of 3 new Arts from the unlocked pool. When both slots are full, the player picks which slot to replace or skips. When the pool has nothing new, show stat cards instead.
- Bosses on floors 5, 10, 15 (not 20) award an evolution shard (evolve any owned, not-yet-evolved Art) and heal fully. With nothing left to evolve: +1 Potion and 100 Gold instead.
- Art pool in round 2: Cyclone Edge and Piercing Fang are starting Arts (in the pool for free). Round 4 adds Crescent Wave (start), Riposte and Shade Step (unlockable).
- `SAVE_VERSION` = 3. v2 → v3: suspend `player.skill2` → `player.build.arts[0]`. Meta refunds 30 Shards if `horizontal` was unlocked and 60 if `vorpal` was, because both are free now.
- All randomness uses the seeded `rng()` from `src/core/rng.ts`. "Is a pick available?" checks never draw from rng (they run every step).
- Every player-facing string is a TH/EN pair (`tr` / `Text`), plain voice, no " · " joining sentences, no em dashes in sentences. Game nouns stay English (Blade Art, Art names, Ember/Storm/Thorn/Tide, Memory Shard, Gold, Potion, XP).
- **Commits:** the user commits (global CLAUDE.md). "Propose commit" = run `git status` and `git diff --stat`, and report the message. Never run `git commit`.
- `npm run check` must pass at the end of every task, except the suites a task explicitly names as red until a later task.

## File Structure

| File | Responsibility |
|---|---|
| `src/data/elements.ts` (create) | element ids, names, colors, card text, tuning numbers |
| `src/data/skills.ts` (modify) | `pool` per Art, `EVOLVED_DMG`, `artName()` incl. `blade` |
| `src/data/controls.ts` (modify) | `skill3` action: key `KeyI`, pad button 6 (LT) |
| `src/world/state.ts`, `src/world/floor.ts` (modify) | 3 slots, `P.mods`, `P.evolved`, status fields on mobs/boss, snapshot/resume v3 |
| `src/core/save.ts` (modify) | v3 schema + migration (suspend build, meta refund) |
| `src/systems/elements.js` (create) | `applyElements`, `tickStatus`, `speedFactor`, set bonuses, frost ring |
| `src/systems/combat.js` (modify) | `hurtEnemy(e, d, big, crit, art)`, shared `kill(e)`, `dot(e, n)`, boss reward |
| `src/systems/player.js` (modify) | art id on every hit, 3 cooldowns, evolved ×1.3, frost ring hook |
| `src/systems/build.js` (create) | owned Arts, mod/stat/art/evolve card rolls, `applyCard`, `hasLevelPick`, reward queue |
| `src/systems/rooms.js`, `src/data/run.ts` (modify) | elite room waves + Art reward, `AVAILABLE_ROOMS` adds `elite` |
| `src/scenes/index.js`, `src/ui/screens.js`, `index.html` (modify) | generic pick scene, card rendering, title Blade Arts page as a pool |
| `src/systems/meta.js` (modify) | `isUnlocked` by pool, `unlockSkill` without equipping, drop `equipSkill` |
| `src/render/world.js`, `src/render/hud.js`, `src/systems/fx.js` (modify) | elite glow, status tints, bolt lines, slot 3 |
| `tests/*`, `e2e/*` | see each task |

---

### Task 1: Element data, build state, 3 slots, save version 3

**Files:**
- Create: `src/data/elements.ts`
- Modify: `src/data/skills.ts`, `src/data/controls.ts`, `src/world/state.ts`, `src/world/floor.ts`, `src/core/save.ts`, `src/systems/player.js`, `src/main.js`, `src/render/hud.js`, `src/ui/settings.js`, `src/ui/screens.js`, `src/systems/hints.js`
- Test: `tests/save.test.ts`, `tests/mechanics.test.ts`

**Interfaces:**
- Produces:
  - `ELEMENTS`, `ELEMENT_IDS`, `type ElementId = 'ember'|'storm'|'thorn'|'tide'`, `EL` tuning object (elements.ts)
  - `SKILLS[id].pool: 'fixed'|'start'|'unlock'`, `EVOLVED_DMG = 1.3`, `artName(id: string): string` (skills.ts)
  - `Player.skills: [string, string | null, string | null]`, `Player.skillCd: [number, number, number]`, `Player.mods: Record<string, ElementId[]>`, `Player.evolved: string[]`
  - Suspend v3 `player.build: { arts: [string|null, string|null], mods: Record<string, ElementId[]>, evolved: string[] }` (replaces `skill2`)
  - `skill(2)` fires slot 3; action `skill3`

- [ ] **Step 1: Write the failing tests**

In `tests/save.test.ts`:
- Change the `suspend` fixture's player: remove `skill2: 'vorpal'` and add `build: { arts: ['vorpal', null], mods: { blade: ['ember'], vorpal: ['storm', 'storm'] }, evolved: ['vorpal'] }`. Change the envelope version used for this fixture in tests from `v: 2` to `v: 3`.
- Update `'starts from defaults with empty storage'` only if `meta` keys change (they don't in this task).
- Add:

```ts
describe('version 3', () => {
  it('moves a v2 suspend slot-2 Art into build.arts and starts with no mods', async () => {
    const v2 = { floorIdx: 6, room: { type: 'battle', reward: 'xp' },
      player: { lv: 5, xp: 10, hp: 90, maxHp: 160, atk: 20, up: {}, pendingUpgrades: 0, skill2: 'horizontal', col: 30, potions: 1, scrolls: 0 },
      run: { floor: 7, kills: 30, time: 200, assisted: false, seed: 99, bosses: 1 } };
    const s = await boot({ 'saoy.suspend': JSON.stringify({ v: 2, savedAt: '', data: v2 }) });
    expect(s.loadSuspend()!.player.build).toEqual({ arts: ['horizontal', null], mods: {}, evolved: [] });
  });

  it('refunds Shards for Arts that became free (Cyclone 30, Fang 60) and keeps the rest', async () => {
    const s = await boot({ 'saoy.meta': JSON.stringify({ v: 2, savedAt: '', data: { shards: 5, unlocked: ['sonicLeap', 'horizontal', 'vorpal'], hintsSeen: ['move'] } }) });
    expect(s.meta.shards).toBe(5 + 30 + 60);
    expect(s.meta.hintsSeen).toEqual(['move']);
  });

  it('a suspend with an unknown element or more than 2 mods on one Art fails validation instead of loading', async () => {
    const bad = { floorIdx: 1, room: null,
      player: { lv: 1, xp: 0, hp: 100, maxHp: 100, atk: 10, build: { arts: [null, null], mods: { blade: ['fire'] }, evolved: [] } },
      run: { floor: 2, kills: 0, time: 1, seed: 1 } };
    const s = await boot({ 'saoy.suspend': JSON.stringify({ v: 3, savedAt: '', data: bad }) });
    expect(s.loadSuspend()).toBeNull();
  });
});
```

In `tests/mechanics.test.ts` (inside `describe('sword skills and memory shards')`):
- Replace `'slot 2 is empty by default and does nothing'` with:

```ts
  it('slots 2 and 3 start empty and do nothing; slot 3 fires when filled', async () => {
    const { SKILLS } = await import('../src/data/skills.ts');
    expect(G.P!.skills).toEqual(['sonicLeap', null, null]);
    skill(1); skill(2);
    expect(G.P!.skillCd).toEqual([0, 0, 0]);
    G.P!.skills[2] = 'horizontal'; skill(2);
    expect(G.P!.skillCd[2]).toBeCloseTo(SKILLS.horizontal.cd);
  });
```

- In `'Cyclone Edge hits all around…'` nothing changes (it uses slot index 1).
- Add to `describe('assist mode and suspend')`:

```ts
  it('the build survives suspend and resume; unknown Art ids are dropped', async () => {
    const { snapshotRun, resumeRun } = await import('../src/world/floor.ts');
    quietField();
    G.P!.skills[1] = 'vorpal'; G.P!.mods = { blade: ['ember'], vorpal: ['tide'] }; G.P!.evolved = [];
    const snap = snapshotRun();
    startRun(2); resumeRun(snap);
    expect(G.P!.skills).toEqual(['sonicLeap', 'vorpal', null]);
    expect(G.P!.mods).toEqual({ blade: ['ember'], vorpal: ['tide'] });
    const odd = { ...snap, player: { ...snap.player, build: { arts: ['nope', 'sonicLeap'] as [string, string], mods: { nope: ['ember'] }, evolved: ['nope'] } } };
    startRun(3); resumeRun(odd as any);
    expect(G.P!.skills).toEqual(['sonicLeap', null, null]);
    expect(G.P!.mods).toEqual({}); expect(G.P!.evolved).toEqual([]);
  });
```

Note: `quietField()` snapshots at floor entry inside `loadFloor`, so call `snapshotRun()` directly as above (that is the function `G.entry` uses).

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run tests/save.test.ts tests/mechanics.test.ts`
Expected: FAIL (`build` unknown to the schema, `skills` has 2 entries, `P.mods` undefined).

- [ ] **Step 3: Create `src/data/elements.ts`**

```ts
// The four elements, one per act (the same colours as that act's stained glass on the title screen).
// A mod = one Art + one element: every hit of that Art applies the element. See systems/elements.js.
import type { Text } from '../core/i18n.ts';

export const ELEMENT_IDS = ['ember', 'storm', 'thorn', 'tide'] as const;
export type ElementId = (typeof ELEMENT_IDS)[number];

export const ELEMENTS: Record<ElementId, { name: string; color: string; hit: Text; set: Text }> = {
  ember: { name: 'Ember', color: '#ff963c',
    hit: { th: 'ศัตรูติดไฟ โดนดาเมจต่อเนื่อง 3 วินาที ซ้อนได้ 3 ชั้น', en: 'Sets enemies on fire for 3 s. Stacks 3 times.' },
    set: { th: 'ศัตรูที่ตายตอนติดไฟจะระเบิดใส่ตัวรอบๆ', en: 'Enemies that die while burning explode.' } },
  storm: { name: 'Storm', color: '#a688ff',
    hit: { th: 'สายฟ้ากระโดดไปโดนอีก 2 ตัวที่อยู่ใกล้', en: 'Lightning jumps to 2 nearby enemies.' },
    set: { th: 'ทุกการโจมตีโดนครั้งที่ 6 จะมีฟ้าผ่าลงมา', en: 'Every 6th hit calls down a bolt.' } },
  thorn: { name: 'Thorn', color: '#78ff96',
    hit: { th: 'ศัตรูติดพิษและเดินช้าลง', en: 'Poisons enemies and slows them down.' },
    set: { th: 'ฆ่าศัตรูที่ติดพิษแล้วได้ HP คืน 2', en: 'Killing a poisoned enemy heals 2 HP.' } },
  tide: { name: 'Tide', color: '#5ac8ff',
    hit: { th: 'ศัตรูกระเด็นไกลขึ้น โดนครบ 3 ครั้งจะแข็งไปครู่หนึ่ง', en: 'Knocks enemies further. 3 hits freeze them for a moment.' },
    set: { th: 'กลิ้งหรือพุ่งแล้วทิ้งวงน้ำแข็งที่ทำให้ศัตรูช้าลง', en: 'Rolling or dashing leaves a ring of frost that slows enemies.' } },
};

// Tuning (spec values). `double`: the same element twice on one Art.
export const EL = {
  double: 1.5,
  ember: { dps: 0.2, time: 3, stacks: 3 },
  storm: { chain: 2, range: 140, mult: 0.4 },
  thorn: { dps: 0.15, time: 4, slow: 0.3, slowTime: 2 },
  tide: { knock: 1.5, hits: 3, window: 2, freeze: 0.6, bossSlow: 0.4 },
  set: { need: 3, emberBlast: { mult: 2, radius: 70 }, stormEvery: 6, stormBolt: 2, thornHeal: 2, tideRing: { radius: 90, slow: 0.4, time: 1.5 } },
};
```

- [ ] **Step 4: Arts pool and names in `src/data/skills.ts`**

- Update the top comment to: `// Blade Arts. Slot 1 is always Gale Rush (it doubles as the dash dodge); slots 2-3 fill during a run from elite rooms. // `pool`: 'fixed' = always slot 1, 'start' = in the run's pool from the start, 'unlock' = needs Memory Shards.`
- Add `pool: 'fixed' | 'start' | 'unlock'` to `SkillDef`. Set `sonicLeap: pool: 'fixed'`, `horizontal: pool: 'start'`, `vorpal: pool: 'start'`. Keep `cost`.
- Add below `SkillId`:

```ts
// Round 2: an evolved Art hits 30% harder. Round 4 replaces this with each Art's own evolved form.
export const EVOLVED_DMG = 1.3;
// Mod targets include the basic sword ('blade'), which isn't a slotted Art
export const artName = (id: string) => (id === 'blade' ? 'Slash' : SKILLS[id as SkillId]?.name ?? id);
```

- [ ] **Step 5: Slot 3 action in `src/data/controls.ts`**

- Add `'skill3'` to `Action`.
- `BINDINGS`: add `skill3: ['KeyI'],` after `skill2`.
- `PAD_BUTTONS`: add `6: 'skill3',` (LT).

- [ ] **Step 6: State and floor (3 slots, mods, evolved)**

`src/world/state.ts`:
- `Player`: `skills: [string, string | null, string | null]; skillCd: [number, number, number]; // slot 1 = Gale Rush, slots 2-3 from elite rooms`, add `mods: Record<string, ElementId[]>; evolved: string[]; // element mods per Art id ('blade' = the sword) and evolved Art ids`, and `stormHits: number; // Art hits counted for the Storm set bonus`. Import `type { ElementId } from '../data/elements.ts'`.
- `Mob` and `Boss`: add optional status fields `burn?: { dps: number; t: number; stacks: number }; poison?: { dps: number; t: number }; slowT?: number; slowK?: number; frozen?: number; tide?: { n: number; t: number }; dotAcc?: number; elite?: boolean;`.

`src/world/floor.ts`:
- Delete `slot2` and `meta` from its uses here. Replace with:

```ts
// A slotted Art must be a real, non-fixed Art; mods/evolved only for Arts the player has (+ the sword and Gale Rush)
const slotArt = (id: string | null | undefined) => (id && id in SKILLS && SKILLS[id as keyof typeof SKILLS].pool !== 'fixed' ? id : null);
function cleanBuild(b: { arts: (string | null)[]; mods: Record<string, ElementId[]>; evolved: string[] }) {
  const arts = [slotArt(b.arts[0]), slotArt(b.arts[1])] as [string | null, string | null];
  const owned = new Set(['blade', 'sonicLeap', ...arts.filter(Boolean)]);
  const mods = Object.fromEntries(Object.entries(b.mods).filter(([id]) => owned.has(id)).map(([id, els]) => [id, els.slice(0, 2)]));
  return { arts, mods, evolved: b.evolved.filter(id => owned.has(id)) };
}
```

- `newPlayer`: `skills: ['sonicLeap', null, null], skillCd: [0, 0, 0],` and add `mods: {}, evolved: [], stormHits: 0,`.
- `snapshotRun` player: replace `skill2: P!.skills[1]` with `build: { arts: [P!.skills[1], P!.skills[2]], mods: structuredClone(P!.mods), evolved: [...P!.evolved] }`.
- `resumeRun`:

```ts
export function resumeRun(s: Suspend) {
  newPlayer(); const { build, hp, ...player } = s.player, b = cleanBuild(build);
  Object.assign(G.P!, player, { up: { ...s.player.up }, skills: ['sonicLeap', b.arts[0], b.arts[1]], mods: b.mods, evolved: b.evolved });
  if (hp !== undefined) G.P!.hp = Math.min(hp, G.P!.maxHp); // the HP saved at floor entry (a town heals to full in loadFloor)
  G.run = { ...s.run };
  loadFloor(s.floorIdx, s.room as Room | null); // cast: tsconfig isn't strict, so zod drops null from the inferred type
}
```

Import `type { ElementId } from '../data/elements.ts'`. Remove the now-unused `meta` import if nothing else uses it.

- [ ] **Step 7: Save version 3 (`src/core/save.ts`)**

- `export const SAVE_VERSION = 3;`
- Import `{ ELEMENT_IDS } from '../data/elements.ts'`.
- Add the migration (frozen values, never read from live data):

```ts
  2: (data, slot) => {
    // v2 -> v3: the build. A v2 slot-2 Art moves into build.arts; Cyclone Edge and Piercing Fang became free,
    // so Shards spent on them come back (30 / 60, the v2 prices).
    if (slot === 'suspend') { const { skill2 = null, ...p } = data.player ?? {}; return { ...data, player: { ...p, build: { arts: [skill2, null], mods: {}, evolved: [] } } }; }
    if (slot === 'meta') {
      const paid: Record<string, number> = { horizontal: 30, vorpal: 60 }, had: string[] = data.unlocked ?? [];
      return { ...data, shards: (data.shards ?? 0) + had.reduce((s, id) => s + (paid[id] ?? 0), 0) };
    }
    return data;
  },
```

- In `SuspendSchema.player`, replace `skill2: …` with:

```ts
    build: z.object({
      arts: z.tuple([z.string().nullable(), z.string().nullable()]),
      mods: z.record(z.string(), z.array(z.enum(ELEMENT_IDS)).max(2)),
      evolved: z.array(z.string()),
    }).default({ arts: [null, null], mods: {}, evolved: [] }),
```

- [ ] **Step 8: Slot 3 in play, HUD and text**

`src/systems/player.js`: in `updatePlayer`, change `P.skillCd[0] -= dt; P.skillCd[1] -= dt;` to `P.skillCd[0] -= dt; P.skillCd[1] -= dt; P.skillCd[2] -= dt;`.

`src/main.js`: `GAME_ACTIONS` add `skill3: () => skill(2),`.

`src/render/hud.js` `drawSkillSlots`: replace `skill(0, 'skill'), ...(P.skills[1] ? [skill(1, 'skill2')] : []),` with `skill(0, 'skill'), ...(P.skills[1] ? [skill(1, 'skill2')] : []), ...(P.skills[2] ? [skill(2, 'skill3')] : []),`. Make sure `ICON` (the icon table) has an entry for every Art id used in a slot (`horizontal`, `vorpal` already exist; keep as is).

`src/ui/settings.js`: `ACTION_TEXT` add `skill3: 'Blade Art 3',`; `GROUPS` combat list → `['attack', 'skill', 'skill2', 'skill3', 'dodge', 'potion', 'interact']`.

`src/ui/screens.js` `renderHowTo`: replace the skill2 row with two rows:

```js
    [`${k('skill2')} / ` + tr('ปุ่มกลางเมาส์', 'middle click'), tr('Blade Art ช่อง 2 (ได้จากห้อง Elite)', 'Blade Art 2 (from Elite rooms)')],
    [k('skill3'), tr('Blade Art ช่อง 3 (ได้จากห้อง Elite)', 'Blade Art 3 (from Elite rooms)')],
```

  and the gamepad line's `RB/RT Blade Art 1/2` → TH `RB/RT/LT Blade Art 1/2/3`, EN `RB/RT/LT use Blade Art 1/2/3`.

`src/systems/hints.js`: keep the `skill2` hint, and add after it:

```js
  { id: 'skill3', when: () => !!G.P.skills[2], title: () => SKILLS[G.P.skills[2]].name,
    sub: () => tr(`Blade Art ช่อง 3 กด ${k('skill3')}`, `Your slot 3 Blade Art. Press ${k('skill3')}.`) },
```

- [ ] **Step 9: Run the tests**

Run: `npx tsc -p . && npx vitest run`
Expected: PASS. The title Blade Arts page still reads `meta.loadout`; newPlayer ignores it now, and Task 4 rewrites the page. Note this in the report.

- [ ] **Step 10: Propose commit**

`feat: add elements data, three Art slots and save version 3`

---

### Task 2: Elements in combat (status effects, chain, set bonuses)

**Files:**
- Create: `src/systems/elements.js`
- Modify: `src/systems/combat.js`, `src/systems/player.js`, `src/systems/mobs.js`, `src/systems/boss.js`, `src/systems/fx.js`, `src/world/floor.ts` (clear `G.bolts`), `src/world/state.ts` (`G.bolts`), `src/render/world.js`
- Test: `tests/elements.test.ts` (create)

**Interfaces:**
- Consumes: `ELEMENTS`, `EL`, `ElementId` (Task 1), `P.mods`, `P.stormHits`, status fields on Mob/Boss.
- Produces:
  - `hurtEnemy(e, d, big, crit = false, art = null)`. When `art` is set, the hit came from that Art and applies its elements.
  - `dot(e, n)`: damage from statuses, with no knockback or hit-stop.
  - `kill(e)`: shared death handling, used by `hurtEnemy` and `dot`.
  - `applyElements(e, art, dmg)`, `tickStatus(e, dt)`, `speedFactor(e): number`, `elementCount(el): number`, `setActive(el): boolean`, `frostRing(x, y)` (elements.js)
  - `G.bolts: { x1, y1, x2, y2, t }[]`

- [ ] **Step 1: Write the failing tests**

Create `tests/elements.test.ts`:

```ts
// Elements: what each mod does on hit, the statuses it leaves, and the 3-mod set bonuses.
import { describe, it, expect, beforeEach } from 'vitest';
import { G, startRun, frame, enterRoom, enterBoss } from './harness.ts';
import { makeMob } from '../src/world/floor.ts';
import { MOBS } from '../src/data/mobs.ts';
import { EL } from '../src/data/elements.ts';
import { hurtEnemy } from '../src/systems/combat.js';
import { setActive, speedFactor } from '../src/systems/elements.js';
import { roll } from '../src/systems/index.js';
import { keys } from '../src/core/input.ts';

const frames = (n: number) => { for (let i = 0; i < n; i++) frame(); };
const dummy = (dx = 60, dy = 0, hp = 9999) => {
  const m = makeMob(G.P!.x + dx, G.P!.y + dy, false, { ...MOBS.frenzyBoar, hp, speed: 0, wanderSpeed: 0 }); G.mobs.push(m); return m;
};

describe('element hits', () => {
  beforeEach(() => { startRun(1); enterRoom(1); });

  it('no mods: an Art hit leaves no status', () => {
    const m = dummy(); hurtEnemy(m, 20, false, false, 'blade');
    expect(m.burn).toBeUndefined(); expect(m.poison).toBeUndefined();
  });

  it('Ember burns for 20%/s of the hit over 3 s and stacks to 3', () => {
    G.P!.mods = { blade: ['ember'] };
    const m = dummy();
    for (let i = 0; i < 5; i++) hurtEnemy(m, 50, false, false, 'blade');
    expect(m.burn!.stacks).toBe(EL.ember.stacks);
    const hp = m.hp; frames(60);
    expect(hp - m.hp).toBeGreaterThan(0);
    frames(4 * 60);
    expect(m.burn!.t).toBeLessThanOrEqual(0);
  });

  it('the same element twice on one Art is 1.5x stronger', () => {
    G.P!.mods = { blade: ['ember'] }; const a = dummy(); hurtEnemy(a, 100, false, false, 'blade');
    G.P!.mods = { blade: ['ember', 'ember'] }; const b = dummy(0, 80); hurtEnemy(b, 100, false, false, 'blade');
    expect(b.burn!.dps).toBeCloseTo(a.burn!.dps * EL.double);
  });

  it('Storm chains to 2 other enemies in range for 40%, not to one out of range', () => {
    G.P!.mods = { horizontal: ['storm'] };
    const m = dummy(60, 0), n1 = dummy(120, 0), n2 = dummy(60, 80), far = dummy(60, 400);
    hurtEnemy(m, 100, false, false, 'horizontal');
    expect(9999 - n1.hp).toBe(40); expect(9999 - n2.hp).toBe(40); expect(far.hp).toBe(9999);
  });

  it('Thorn poisons and slows by 30%', () => {
    G.P!.mods = { blade: ['thorn'] };
    const m = dummy(); hurtEnemy(m, 40, false, false, 'blade');
    expect(m.poison!.t).toBe(EL.thorn.time);
    expect(speedFactor(m)).toBeCloseTo(1 - EL.thorn.slow);
  });

  it('Tide: 3 hits in 2 s freeze a mob; a boss gets slowed instead of frozen', () => {
    G.P!.mods = { blade: ['tide'] };
    const m = dummy();
    for (let i = 0; i < 3; i++) hurtEnemy(m, 5, false, false, 'blade');
    expect(m.frozen).toBeGreaterThan(0); expect(speedFactor(m)).toBe(0);
    enterBoss(4); G.boss!.awake = true;
    for (let i = 0; i < 3; i++) hurtEnemy(G.boss!, 5, false, false, 'blade');
    expect(G.boss!.frozen ?? 0).toBe(0);
    expect(speedFactor(G.boss!)).toBeCloseTo(1 - EL.tide.bossSlow);
  });

  it('status damage never chains or re-applies elements (no runaway loops)', () => {
    G.P!.mods = { blade: ['storm'] };
    const a = dummy(60, 0), b = dummy(100, 0);
    hurtEnemy(a, 100, false, false, null as any); // not an Art hit
    expect(b.hp).toBe(9999);
  });
});

describe('set bonuses (3 mods of one element)', () => {
  beforeEach(() => { startRun(1); enterRoom(1); });

  it('is active at 3 mods across Arts, not at 2', () => {
    G.P!.mods = { blade: ['ember', 'ember'] }; expect(setActive('ember')).toBe(false);
    G.P!.mods = { blade: ['ember', 'ember'], sonicLeap: ['ember'] }; expect(setActive('ember')).toBe(true);
  });

  it('Ember: a burning enemy that dies explodes and hurts its neighbour', () => {
    G.P!.mods = { blade: ['ember', 'ember'], sonicLeap: ['ember'] };
    const m = dummy(60, 0, 30), next = dummy(100, 0);
    hurtEnemy(m, 10, false, false, 'blade');  // burning now
    hurtEnemy(m, 999, false, false, 'blade'); // dies while burning
    expect(next.hp).toBeLessThan(9999);
  });

  it('Storm: every 6th Art hit calls a bolt for 2x attack', () => {
    G.P!.mods = { blade: ['storm', 'storm'], sonicLeap: ['storm'] };
    const m = dummy(60, 0);
    for (let i = 0; i < 5; i++) hurtEnemy(m, 1, false, false, 'blade');
    const before = m.hp; hurtEnemy(m, 1, false, false, 'blade');
    expect(before - m.hp).toBeGreaterThanOrEqual(1 + G.P!.atk * EL.set.stormBolt);
  });

  it('Thorn: killing a poisoned enemy heals 2 HP', () => {
    G.P!.mods = { blade: ['thorn', 'thorn'], sonicLeap: ['thorn'] };
    G.P!.hp = 50;
    const m = dummy(60, 0, 20);
    hurtEnemy(m, 5, false, false, 'blade'); const hp = G.P!.hp;
    hurtEnemy(m, 999, false, false, 'blade');
    expect(G.P!.hp).toBe(hp + EL.set.thornHeal);
  });

  it('Tide: a roll leaves a frost ring that slows enemies inside it', () => {
    G.P!.mods = { blade: ['tide', 'tide'], sonicLeap: ['tide'] };
    const m = dummy(40, 0);
    keys.KeyD = true; roll(); keys.KeyD = false;
    expect(speedFactor(m)).toBeCloseTo(1 - EL.set.tideRing.slow);
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run tests/elements.test.ts`
Expected: FAIL (`src/systems/elements.js` missing).

- [ ] **Step 3: Create `src/systems/elements.js`**

```js
// Elements on hit: an Art hit applies each element modded onto that Art (systems/build.js owns the mods).
// Statuses tick on the game clock; damage-over-time goes through combat's dot(), which never re-applies
// elements, so chains and burns can't loop. Set bonuses switch on at 3 mods of one element across all Arts.
import { G } from '../world/state.ts';
import { EL, ELEMENTS } from '../data/elements.ts';
import { dist } from '../core/math.ts';
import { hurtEnemy, dot, targets } from './combat.js';
import { ring } from './fx.js';

const modsOf = art => G.P.mods[art] ?? [];
// One slow at a time: the stronger one wins while it lasts; an expired slow never leaks into a new one
const slow = (e, k, t) => { e.slowK = e.slowT > 0 ? Math.max(e.slowK ?? 0, k) : k; e.slowT = Math.max(e.slowT > 0 ? e.slowT : 0, t); };
export const elementCount = el => Object.values(G.P.mods).reduce((n, els) => n + els.filter(e => e === el).length, 0);
export const setActive = el => elementCount(el) >= EL.set.need;
const isBoss = e => e === G.boss;

export function applyElements(e, art, dmg) {
  const els = modsOf(art);
  for (const el of new Set(els)) {
    const k = els.filter(x => x === el).length === 2 ? EL.double : 1;
    if (el === 'ember') {
      const stacks = Math.min(EL.ember.stacks, (e.burn?.t > 0 ? e.burn.stacks : 0) + 1);
      e.burn = { dps: dmg * EL.ember.dps * k, t: EL.ember.time, stacks };
    } else if (el === 'storm') {
      const near = targets().filter(o => o !== e && dist(o, e) < EL.storm.range).sort((a, b) => dist(a, e) - dist(b, e)).slice(0, EL.storm.chain);
      for (const o of near) { G.bolts.push({ x1: e.x, y1: e.y, x2: o.x, y2: o.y, t: 0.15 }); hurtEnemy(o, Math.round(dmg * EL.storm.mult * k), false); }
    } else if (el === 'thorn') {
      e.poison = { dps: dmg * EL.thorn.dps * k, t: EL.thorn.time };
      slow(e, EL.thorn.slow, EL.thorn.slowTime);
    } else if (el === 'tide') {
      if (!isBoss(e)) { e.kx *= EL.tide.knock * k; e.ky *= EL.tide.knock * k; }
      const n = (e.tide?.t > 0 ? e.tide.n : 0) + 1;
      if (n >= EL.tide.hits) {
        e.tide = { n: 0, t: 0 };
        if (isBoss(e)) slow(e, EL.tide.bossSlow, EL.tide.freeze);
        else e.frozen = EL.tide.freeze * k;
        ring(e.x, e.y, 10, 40, 0.3, '90,200,255');
      } else e.tide = { n, t: EL.tide.window };
    }
  }
  if (setActive('storm') && ++G.P.stormHits % EL.set.stormEvery === 0) { // a bolt from above
    ring(e.x, e.y, 5, 50, 0.25, '166,136,255'); hurtEnemy(e, G.P.atk * EL.set.stormBolt, true);
  }
}

// Burn and poison deal their damage every 0.5 s; slow, freeze and Tide stacks wear off
export function tickStatus(e, dt) {
  for (const s of [e.burn, e.poison]) if (s) s.t -= dt;
  if (e.slowT > 0) e.slowT -= dt;
  if (e.frozen > 0) e.frozen -= dt;
  if (e.tide?.t > 0) e.tide.t -= dt;
  const rate = (e.burn?.t > 0 ? e.burn.dps * e.burn.stacks : 0) + (e.poison?.t > 0 ? e.poison.dps : 0);
  if (rate <= 0) { e.dotAcc = 0; return; }
  e.dotAcc = (e.dotAcc ?? 0) + rate * dt;
  if (e.dotAcc >= 1 && (e.dotTick = (e.dotTick ?? 0) - dt) <= 0) { const n = Math.floor(e.dotAcc); e.dotAcc -= n; e.dotTick = 0.5; dot(e, n); }
}

// 0 while frozen, slowed by the strongest active slow, else 1
export const speedFactor = e => (e.frozen > 0 ? 0 : e.slowT > 0 ? 1 - (e.slowK ?? 0) : 1);

// Tide set: rolling or dashing leaves a ring of frost that slows every enemy inside it
export function frostRing(x, y) {
  if (!setActive('tide')) return;
  const R = EL.set.tideRing;
  ring(x, y, 20, R.radius, 0.5, '90,200,255');
  for (const e of targets()) if (dist(e, { x, y }) < R.radius + e.r) slow(e, R.slow, R.time);
}

// on death: Ember set blast, Thorn set heal (called by combat's kill())
export function onElementKill(e) {
  if (setActive('ember') && e.burn?.t > 0) {
    const B = EL.set.emberBlast;
    ring(e.x, e.y, 10, B.radius, 0.35, '255,150,60');
    for (const o of targets()) if (o !== e && dist(o, e) < B.radius + o.r) hurtEnemy(o, G.P.atk * B.mult, true);
  }
  if (setActive('thorn') && e.poison?.t > 0) G.P.hp = Math.min(G.P.maxHp, G.P.hp + EL.set.thornHeal);
}
export const elementColor = el => ELEMENTS[el].color;
```

Note on `tickStatus`: the `dotTick` field is added to the Mob/Boss status types in state.ts (`dotTick?: number`).

- [ ] **Step 4: Refactor `src/systems/combat.js`**

- Imports: add `import { applyElements, onElementKill } from './elements.js';`.
- Change the signature to `export function hurtEnemy(e, d, big, crit = false, art = null) {`. After the knockback/stagger lines (after `if (e !== boss) { knock(…) … }` and the boss-summon branch), and before `if (e.hp > 0) return;`, add:

```js
  if (art) applyElements(e, art, d); // only Art hits carry elements (chains, bolts and blasts pass no art)
```

- Move everything from `if (e.hp > 0) return;` to the end of `hurtEnemy` into a new exported function, and end `hurtEnemy` with `if (e.hp <= 0) kill(e);`:

```js
// Death of a mob or the boss: shared by hits and damage-over-time
export function kill(e) {
  const { F, boss, run } = G;
  if (e.dead === Infinity) return;
  onElementKill(e);
  if (e === boss) {
    // (the existing boss-death body, unchanged)
  } else {
    // (the existing mob-death body, unchanged)
  }
}

// Damage from burn/poison: a number pops, no knockback, no hit-stop, no elements
export function dot(e, n) {
  if (e.hp <= 0) return;
  e.hp -= n; text(e.x + 10, e.y - e.r - 16, n, e.poison?.t > 0 ? '#78ff96' : '#ff963c');
  if (e.hp <= 0) kill(e);
}
```

  For the boss, `kill` must not run twice: the boss branch sets nothing for `dead`, so set `e.dead = Infinity;` at the start of the boss branch too.

- [ ] **Step 5: Art ids on player hits (`src/systems/player.js`)**

- `hit(e, dmg, big, m)` → `function hit(e, dmg, big, m, art)` and pass `art` through: `hurtEnemy(e, crit ? dmg * 2 : dmg, big, crit, art);`.
- Add `import { EVOLVED_DMG } from '../data/skills.ts';` (merge with the existing SKILLS import) and `const evo = art => (G.P.evolved.includes(art) ? EVOLVED_DMG : 1);`.
- In `attack()`: `const dmg = (P.atk + m.atkBonus + rand(0, A.dmgRand)) * evo('blade');` and `hit(e, fin ? Math.round(dmg * C.mult) : Math.round(dmg), fin, m, 'blade');`.
- `skillDmg`: `const skillDmg = (S, m, art) => Math.round((G.P.atk + m.atkBonus) * S.dmgMult * m.skillDmg * evo(art));`.
- Gale Rush dash loop: `P.hitSet.add(e); hit(e, skillDmg(SK, m, 'sonicLeap'), true, m, 'sonicLeap');`.
- Cyclone: `hit(e, skillDmg(H, m, 'horizontal'), true, m, 'horizontal');`.
- Fang `stab()`: `hit(e, skillDmg(V, m, 'vorpal'), true, m, 'vorpal');`.
- Frost ring: import `frostRing` from `./elements.js`. In `roll()` after `burst(…)`, call `frostRing(P.x, P.y);`. In `skill()` inside `if (id === 'sonicLeap') {…}`, call `frostRing(P.x, P.y);`.

- [ ] **Step 6: Statuses move and stop enemies (`mobs.js`, `boss.js`)**

`src/systems/mobs.js`: import `{ tickStatus, speedFactor }` from `./elements.js`. In the mob loop right after `if (m.hp <= 0) continue;`:

```js
    tickStatus(m, dt);
    if (m.hp <= 0) continue;              // a burn/poison tick can kill
    if (m.frozen > 0) { applyKnock(m, dt, L.townX, maxX); continue; } // frozen: no thinking, no attacking
```

  and scale movement speed: `const sp = (chase ? M.speed : M.wanderSpeed) * speedFactor(m), …`.

`src/systems/boss.js`: import the same. In `updateBoss` after `if (!b.awake || b.hp <= 0) return;` add `tickStatus(b, dt); if (b.hp <= 0) return;`. Multiply the chase speed: `sp = F.boss.speed[rage() ? 1 : 0] * speedFactor(b)`.

- [ ] **Step 7: Bolt lines and status tints**

`src/world/state.ts`: add `bolts: [] as { x1: number; y1: number; x2: number; y2: number; t: number }[],` to `G`.
`src/world/floor.ts` `loadFloor`: add `G.bolts = [];` next to `G.rings = [];`.
`src/systems/fx.js` `updateFx`: add `for (const b of G.bolts) b.t -= dt; G.bolts = G.bolts.filter(b => b.t > 0);`.
`src/render/world.js`:
- In `drawFx`, inside the `lighter` block after the rings loop:

```js
  for (const b of G.bolts) { // Storm chains: a jagged violet line
    ctx.globalAlpha = Math.min(1, b.t / 0.15); ctx.strokeStyle = '#c9b6ff'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(b.x1, b.y1);
    const mx = (b.x1 + b.x2) / 2 + (Math.random() - 0.5) * 24, my = (b.y1 + b.y2) / 2 + (Math.random() - 0.5) * 24;
    ctx.lineTo(mx, my); ctx.lineTo(b.x2, b.y2); ctx.stroke();
  }
```

- In the mob draw function, right after the existing `shadowColor` choice:

```js
  const tint = m.frozen > 0 ? '#5ac8ff' : m.burn?.t > 0 ? '#ff963c' : m.poison?.t > 0 ? '#78ff96' : null; // element status rim
  if (tint && !(m.wind > 0 && m.hurt <= 0)) { ctx.shadowColor = tint; ctx.shadowBlur = 12; }
```

- [ ] **Step 8: Run the tests**

Run: `npx tsc -p . && npx vitest run`
Expected: PASS (elements tests plus everything else; the bot doesn't use mods yet, so sims are unchanged).

- [ ] **Step 9: Propose commit**

`feat: apply element mods in combat with statuses and set bonuses`

---

### Task 3: Build cards and the pick scene (level-up, evolution shard)

**Files:**
- Create: `src/systems/build.js`
- Modify: `src/scenes/index.js`, `src/ui/screens.js`, `src/systems/combat.js` (boss reward), `src/systems/upgrades.js`, `src/core/events.ts`, `src/world/state.ts` (`G.rewards`), `src/world/floor.ts` (reset `G.rewards`), `tests/harness.ts`, `index.html`
- Test: `tests/build.test.ts` (create), `tests/mechanics.test.ts`

**Interfaces:**
- Consumes: `P.skills`, `P.mods`, `P.evolved`, `ELEMENTS`, `ELEMENT_IDS`, `SKILLS[id].pool`, `artName`, `isUnlocked` (meta.js; this task changes its rule to pool-based, see Step 3), `UPGRADES`, `applyUpgrade`.
- Produces:
  - `type Card = { kind: 'mod', art, el } | { kind: 'stat', id } | { kind: 'art', id } | { kind: 'replace', id, slot } | { kind: 'skip' } | { kind: 'evolve', art }`
  - `G.rewards: ('art' | 'evolve')[]`: the queue of non-level picks
  - build.js: `ownedArts()`, `modCards()`, `statCards()`, `rollLevelCards(): Card[]`, `rollArtCards(): Card[]`, `evolveCards(): Card[]`, `hasLevelPick(): boolean`, `nextPick(): 'art' | 'evolve' | 'level' | null`, `cardsFor(kind): Card[]`, `applyCard(card, kind): Card[] | null` (returns follow-up cards for the replace step, else null), `evolve(art)`, `bossReward()`
  - event `artEvolved: string`

- [ ] **Step 1: Write the failing tests**

Create `tests/build.test.ts`:

```ts
// The build: level-up cards (mods + stats), new-Art picks with slot replacement, evolution at 2 mods and from a boss.
import { describe, it, expect, beforeEach } from 'vitest';
import { G, startRun, enterRoom, enterBoss, frame } from './harness.ts';
import { rollLevelCards, rollArtCards, evolveCards, applyCard, hasLevelPick, modCards, nextPick, bossReward } from '../src/systems/build.js';
import { hurtEnemy } from '../src/systems/combat.js';
import { rng } from '../src/core/rng.ts';

describe('level-up cards', () => {
  beforeEach(() => { startRun(1); enterRoom(1); });

  it('3 different cards, mods only for owned Arts (the sword and Gale Rush at the start)', () => {
    for (let i = 0; i < 30; i++) {
      const cards = rollLevelCards();
      expect(cards).toHaveLength(3);
      expect(new Set(cards.map(c => JSON.stringify(c))).size).toBe(3);
      for (const c of cards) if (c.kind === 'mod') expect(['blade', 'sonicLeap']).toContain(c.art);
    }
  });

  it('never offers a third mod for an Art; 2 mods evolve it', () => {
    G.P!.pendingUpgrades = 2;
    applyCard({ kind: 'mod', art: 'blade', el: 'ember' }, 'level');
    applyCard({ kind: 'mod', art: 'blade', el: 'storm' }, 'level');
    expect(G.P!.mods.blade).toEqual(['ember', 'storm']);
    expect(G.P!.evolved).toContain('blade');
    expect(G.P!.pendingUpgrades).toBe(0);
    expect(modCards().some(c => c.art === 'blade')).toBe(false);
  });

  it('checking for a pick never draws from the gameplay rng', () => {
    startRun(1); enterRoom(1); G.P!.pendingUpgrades = 1; const a = rng();
    startRun(1); enterRoom(1); G.P!.pendingUpgrades = 1; hasLevelPick(); nextPick(); const b = rng();
    expect(b).toBe(a);
  });
});

describe('new Art picks (elite reward)', () => {
  beforeEach(() => { startRun(1); enterRoom(1); });

  it('offers unowned Arts from the pool; picking fills the first empty slot', () => {
    const cards = rollArtCards();
    expect(cards.map(c => c.kind === 'art' && c.id).sort()).toEqual(['horizontal', 'vorpal']);
    applyCard({ kind: 'art', id: 'vorpal' }, 'art');
    expect(G.P!.skills).toEqual(['sonicLeap', 'vorpal', null]);
    expect(rollArtCards().map(c => c.kind === 'art' && c.id)).toEqual(['horizontal']);
  });

  it('with both slots full and nothing new in the pool, the pick shows stat cards instead', () => {
    G.P!.skills = ['sonicLeap', 'vorpal', 'horizontal'];
    expect(rollArtCards().every(c => c.kind === 'stat')).toBe(true);
  });

  it('a stat card taken as a reward never adds or spends a level pick', () => {
    G.P!.pendingUpgrades = 0; G.rewards = ['art'];
    applyCard({ kind: 'stat', id: 'swift' }, 'art');
    expect(G.P!.up.swift).toBe(1); expect(G.P!.pendingUpgrades).toBe(0); expect(G.rewards).toEqual([]);
  });

  it('a new Art with both slots full asks which slot to replace; replace drops the old mods; skip keeps everything', () => {
    // two copies of Fang only so this test has a full bar with the Arts round 2 has
    G.P!.skills = ['sonicLeap', 'vorpal', 'vorpal']; G.P!.mods = { vorpal: ['tide'] }; G.rewards = ['art'];
    const follow = applyCard({ kind: 'art', id: 'horizontal' }, 'art');
    expect(follow!.map(c => c.kind)).toEqual(['replace', 'replace', 'skip']);
    expect(G.rewards).toEqual(['art']); // still pending until the second choice
    applyCard(follow![0], 'art');
    expect(G.P!.skills[1]).toBe('horizontal'); expect(G.P!.mods.vorpal).toBeUndefined(); expect(G.rewards).toEqual([]);
    G.P!.skills = ['sonicLeap', 'vorpal', 'horizontal']; G.rewards = ['art'];
    applyCard({ kind: 'skip' }, 'art');
    expect(G.P!.skills).toEqual(['sonicLeap', 'vorpal', 'horizontal']); expect(G.rewards).toEqual([]);
  });
});

describe('evolution shard (boss reward)', () => {
  beforeEach(() => { startRun(1); enterBoss(4); });

  it('killing a non-final boss heals fully and queues an evolution pick', () => {
    G.P!.hp = 10; G.boss!.awake = true;
    hurtEnemy(G.boss!, 99999, false);
    expect(G.P!.hp).toBe(G.P!.maxHp);
    expect(G.rewards).toEqual(['evolve']);
    expect(evolveCards().map(c => c.kind === 'evolve' && c.art).sort()).toEqual(['blade', 'sonicLeap']);
    applyCard({ kind: 'evolve', art: 'sonicLeap' }, 'evolve');
    expect(G.P!.evolved).toEqual(['sonicLeap']);
  });

  it('with nothing left to evolve, the shard pays +1 Potion and 100 Gold instead', () => {
    G.P!.evolved = ['blade', 'sonicLeap']; G.P!.potions = 0; G.P!.col = 0;
    bossReward();
    expect(G.rewards).toEqual([]); expect(G.P!.potions).toBe(1); expect(G.P!.col).toBe(100);
  });
});
```

In `tests/mechanics.test.ts` `describe('upgrades')`: replace `rollOffer`/`hasPendingUpgrade` usage in `'each level-up earns one pick…'` with build.js:

```ts
  it('each level-up earns one pick; stat cards never offer a maxed upgrade', async () => {
    const { statCards, hasLevelPick } = await import('../src/systems/build.js');
    gainXp(PLAYER.xpToNext(1));
    expect(G.P!.pendingUpgrades).toBe(1);
    expect(hasLevelPick()).toBe(true);
    G.P!.up = { keenEdge: 5, vitality: 5 };
    const ids = statCards().map(c => c.id);
    expect(ids).not.toContain('keenEdge'); expect(ids).not.toContain('vitality');
  });
```

Keep `'a pick applies its effect and spends the pending level'` as is (it uses `applyUpgrade`, which still decrements).

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run tests/build.test.ts tests/mechanics.test.ts`
Expected: FAIL (`src/systems/build.js` missing).

- [ ] **Step 3: Create `src/systems/build.js`**

```js
// The in-run build: which Arts sit in slots 2-3, the element mods on each Art, which Arts evolved, and the cards
// that change them. Three kinds of pick: a level-up (mods + stat upgrades), a new Art (elite rooms) and an
// evolution shard (bosses). Card rolls use the seeded rng; "is there a pick?" checks never touch it.
import { G } from '../world/state.ts';
import { ELEMENT_IDS } from '../data/elements.ts';
import { SKILLS } from '../data/skills.ts';
import { UPGRADES } from '../data/upgrades.ts';
import { SHOP } from '../data/shop.ts';
import { rng } from '../core/rng.ts';
import { emit } from '../core/events.ts';
import { isUnlocked } from './meta.js';
import { applyUpgrade } from './upgrades.js';
import { text, burst, kick } from './fx.js';
import { gainCol } from './combat.js';

const MAX_MODS = 2, OFFER = 3, MOD_WEIGHT = 2, STAT_WEIGHT = 1, SHARD_GOLD = 100;

export const ownedArts = () => ['blade', ...G.P.skills.filter(Boolean)];
const mods = art => G.P.mods[art] ?? [];
export const modCards = () => ownedArts().filter(a => !G.P.evolved.includes(a) && mods(a).length < MAX_MODS)
  .flatMap(art => ELEMENT_IDS.map(el => ({ kind: 'mod', art, el })));
export const statCards = () => Object.keys(UPGRADES).filter(id => (G.P.up[id] ?? 0) < UPGRADES[id].max).map(id => ({ kind: 'stat', id }));

// n distinct cards, weighted, drawn with the seeded rng
function draw(pool, n) {
  const out = [], left = [...pool];
  while (out.length < n && left.length) {
    let x = rng() * left.reduce((s, p) => s + p.w, 0), k = 0;
    while ((x -= left[k].w) > 0) k++;
    out.push(left.splice(k, 1)[0].card);
  }
  return out;
}
export const rollLevelCards = () => draw([...modCards().map(card => ({ card, w: MOD_WEIGHT })), ...statCards().map(card => ({ card, w: STAT_WEIGHT }))], OFFER);
export const rollArtCards = () => {
  const fresh = Object.keys(SKILLS).filter(id => SKILLS[id].pool !== 'fixed' && isUnlocked(id) && !G.P.skills.includes(id));
  return fresh.length ? draw(fresh.map(id => ({ card: { kind: 'art', id }, w: 1 })), OFFER) : draw(statCards().map(card => ({ card, w: 1 })), OFFER);
};
export const evolveCards = () => ownedArts().filter(a => !G.P.evolved.includes(a)).map(art => ({ kind: 'evolve', art }));

export const hasLevelPick = () => !!G.P && G.P.pendingUpgrades > 0 && (modCards().length + statCards().length) > 0;
export const nextPick = () => (G.rewards.length ? G.rewards[0] : hasLevelPick() ? 'level' : null);
export const cardsFor = kind => (kind === 'art' ? rollArtCards() : kind === 'evolve' ? evolveCards() : rollLevelCards());

export function evolve(art) {
  if (G.P.evolved.includes(art)) return;
  G.P.evolved.push(art); emit('artEvolved', art);
  const P = G.P; text(P.x, P.y - 60, 'EVOLVED!', '#ffe9a8', true); burst(P.x, P.y, 40, '#fff6e2', 260, 0.9, 6, true); kick(0.5, 8);
}

// Apply a picked card. Returns follow-up cards when the pick needs a second choice (which slot to replace), else null.
// A level pick spends one pending level; a reward pick removes its entry from G.rewards.
export function applyCard(card, kind) {
  const P = G.P;
  if (card.kind === 'art') {
    const free = P.skills.indexOf(null, 1);
    if (free < 0) return [1, 2].map(slot => ({ kind: 'replace', id: card.id, slot })).concat([{ kind: 'skip' }]);
    P.skills[free] = card.id;
  } else if (card.kind === 'replace') {
    delete P.mods[P.skills[card.slot]]; P.evolved = P.evolved.filter(a => a !== P.skills[card.slot]);
    P.skills[card.slot] = card.id; P.skillCd[card.slot] = 0;
  } else if (card.kind === 'mod') {
    P.mods[card.art] = [...mods(card.art), card.el];
    if (P.mods[card.art].length >= MAX_MODS) evolve(card.art);
  } else if (card.kind === 'evolve') evolve(card.art);
  else if (card.kind === 'stat') { const left = P.pendingUpgrades; applyUpgrade(card.id); P.pendingUpgrades = left; } // applyUpgrade spends a level itself; undone here, spent below for level picks only
  if (kind === 'level') P.pendingUpgrades = Math.max(0, P.pendingUpgrades - 1);
  else G.rewards.shift();
  return null;
}

// A non-final boss: full heal, then an evolution pick, or Potion + Gold when nothing is left to evolve
export function bossReward() {
  const P = G.P;
  P.hp = P.lag = P.maxHp;
  if (evolveCards().length) G.rewards.push('evolve');
  else { if (P.potions < SHOP.potion.max) P.potions++; gainCol(SHARD_GOLD, P); }
}
```

`src/systems/upgrades.js`: delete `rollOffer`, `hasPendingUpgrade`, `available` and the `OFFER_SIZE` import (build.js replaces them). Keep `mods()` and `applyUpgrade`.

`src/systems/meta.js`: starting Arts are in the pool for free (the Art-pick tests rely on it). Replace `isUnlocked`:

```js
// Starting Arts are always in the run's pool; 'unlock' Arts join it once bought with Memory Shards
export const isUnlocked = id => SKILLS[id]?.pool === 'start' || SKILLS[id]?.pool === 'fixed' || meta.unlocked.includes(id);
```

(Task 4 changes `unlockSkill` and the title page; leave them for now.)

`src/data/upgrades.ts`: delete `OFFER_SIZE` if nothing else uses it.

- [ ] **Step 4: Boss reward and the reward queue**

`src/world/state.ts`: add `rewards: [] as ('art' | 'evolve')[],` to `G`.
`src/world/floor.ts` `newRun`: set `G.rewards = [];` before `loadFloor(0)`. `resumeRun`: also `G.rewards = [];`.
`src/systems/combat.js` boss-death branch: right after `emit('bossDeath');`, add `if (!isFinalFloor(G.floorIdx)) bossReward();` and import `bossReward` from `./build.js`.
`src/core/events.ts`: add `artEvolved: string;`.

- [ ] **Step 5: One pick scene for all three kinds (`src/scenes/index.js`)**

Replace the upgrade scene block with:

```js
// Pick scene: freezes play like pause. Shows a level-up, a new-Art (elite) or an evolution (boss) pick;
// a new Art with both slots full asks which slot to replace in a second step.
let pickKind = null, cards = [];
const pickScene = {
  name: 'upgrade', blocksUpdate: true,
  enter() { releaseAll(); pickKind = nextPick(); cards = cardsFor(pickKind); showPicker(pickKind, cards); },
  exit() { screen(null); },
};
export const picking = () => scenes.top === pickScene;
export function pickUpgrade(i) {
  if (!picking() || !cards[i]) return;
  const follow = applyCard(cards[i], pickKind);
  if (follow) { cards = follow; showPicker('replace', cards); return; }
  scenes.pop(); // play re-pushes the scene next step while picks remain
}
```

- In `playScene.update`, replace `else if (hasPendingUpgrade()) scenes.push(upgradeScene);` with `else if (nextPick()) scenes.push(pickScene);`.
- `liveRun`: replace `upgradeScene` with `pickScene`.
- Imports: drop `rollOffer, applyUpgrade, hasPendingUpgrade` and `showUpgradePicker`; add `import { nextPick, cardsFor, applyCard } from '../systems/build.js';` and `showPicker` from `../ui/screens.js`.

- [ ] **Step 6: Card rendering (`src/ui/screens.js`, `index.html`)**

`index.html`: the upgrade window header: `<header id="upgrade-h" data-en="Level Up">เลเวลอัป</header>` stays. The header text is now set per pick kind from JS, so remove its `data-en` attribute (JS sets both languages).

`src/ui/screens.js`: replace `showUpgradePicker` with:

```js
// One picker for every pick: level-up (mods + stats), a new Art (elite), an evolution shard (boss), or which slot to replace
const PICK_TITLE = {
  level: { th: 'เลเวลอัป', en: 'Level Up' }, art: { th: 'ท่าใหม่', en: 'New Blade Art' },
  evolve: { th: 'เศษกระจกวิวัฒน์', en: 'Evolution Shard' }, replace: { th: 'ช่องเต็มแล้ว', en: 'Slots full' },
};
function cardHtml(c, i) {
  const P = G.P, key = `<kbd>${i + 1}</kbd>`;
  let glass = '', title = '', body = '', extra = '';
  if (c.kind === 'mod') {
    const E = ELEMENTS[c.el], had = P.mods[c.art] ?? [], evolves = had.length + 1 >= 2;
    glass = E.color; title = `${artName(c.art)} + ${E.name}`; body = t(E.hit);
    extra = `<span class="pips" aria-hidden="true">${[0, 1].map(k => `<i class="${k < had.length ? 'got' : k === had.length ? 'next' : ''}"></i>`).join('')}</span>`
      + (evolves ? `<span class="price">${tr('วิวัฒน์!', 'Evolves!')}</span>` : '');
  } else if (c.kind === 'stat') {
    const u = UPGRADES[c.id], have = P.up[c.id] ?? 0;
    title = t(u.name); body = t(u.desc);
    extra = `<span class="pips" aria-hidden="true">${Array.from({ length: u.max }, (_, k) => `<i class="${k < have ? 'got' : k === have ? 'next' : ''}"></i>`).join('')}</span>`;
  } else if (c.kind === 'art') { title = SKILLS[c.id].name; body = t(SKILLS[c.id].desc); }
  else if (c.kind === 'replace') { title = tr(`แทน ${SKILLS[P.skills[c.slot]].name}`, `Replace ${SKILLS[P.skills[c.slot]].name}`); body = tr(`ช่อง ${c.slot + 1} ได้ ${SKILLS[c.id].name} มอดของท่าเดิมจะหายไป`, `Slot ${c.slot + 1} gets ${SKILLS[c.id].name}. The old Art's mods are lost.`); }
  else if (c.kind === 'skip') { title = tr('ไม่เอาท่านี้', 'Keep my Arts'); body = tr('เก็บท่าที่มีอยู่ไว้ทั้งหมด', 'Keep everything as it is.'); }
  else if (c.kind === 'evolve') { title = artName(c.art); body = tr('วิวัฒน์ท่านี้ทันที ดาเมจท่านี้แรงขึ้น 30%', 'Evolve this Art now. It hits 30% harder.'); }
  return `<button class="card" data-pick="${i}" ${glass ? `style="--glass:${glass}"` : ''} aria-label="${i + 1}: ${title}. ${body}">${key}<b>${title}</b><span>${body}</span>${extra}</button>`;
}
export function showPicker(kind, cards) {
  $('upgrade-h').textContent = t(PICK_TITLE[kind]);
  $('upgrade-msg').textContent = kind === 'level'
    ? tr(`เลเวล ${G.P.lv}! เลือกอัปเกรด 1 อย่าง (กด 1 ถึง ${cards.length} หรือคลิก)`, `Level ${G.P.lv}! Choose an upgrade (press 1 to ${cards.length}, or click).`)
    : kind === 'art' ? tr('เลือกท่าใหม่ 1 ท่า', 'Choose a new Blade Art.')
    : kind === 'evolve' ? tr('เลือกท่าที่จะวิวัฒน์', 'Choose an Art to evolve.')
    : tr('ช่องท่าเต็มแล้ว จะแทนท่าไหน', 'Both slots are full. Which Art should it replace?');
  $('upgrade-cards').innerHTML = cards.map(cardHtml).join('');
  screen('upgrade');
  $('upgrade-cards').querySelector('.card')?.focus();
}
```

Imports to add in screens.js: `ELEMENTS` from `../data/elements.ts`, `artName` from `../data/skills.ts` (SKILLS is already imported).

`artName('blade')` returns `'Slash'`. In Thai the sword is called ฟัน in the HUD, so in `cardHtml` use `const name = a => (a === 'blade' ? tr('ฟันปกติ', 'Slash') : artName(a));` and use `name(...)` wherever `artName(...)` appears above.

- [ ] **Step 7: Harness auto-picks for headless bots (`tests/harness.ts`)**

Replace the playScene's `while (!G.run!.over && hasPendingUpgrade()) applyUpgrade(rollOffer()[0]);` with:

```ts
  for (let kind = nextPick(); !G.run!.over && kind; kind = nextPick()) { // take the first card, like the bots in e2e
    let cards = cardsFor(kind), follow;
    while ((follow = applyCard(cards[0], kind))) cards = follow;
  }
```

and swap the imports (`nextPick, cardsFor, applyCard` from `../src/systems/build.js`; drop `rollOffer, applyUpgrade, hasPendingUpgrade`). Note: with a replace step, `cards[0]` is a replace card, which ends the loop.

- [ ] **Step 8: Run the tests**

Run: `npx tsc -p . && npx vitest run && npx playwright test e2e/smoke.spec.ts`
Expected: PASS. If `tests/sim.test.ts`'s balance guard fails because bots got stronger or weaker, report the per-seed results. Do not tune numbers here (spec round 6).

- [ ] **Step 9: Propose commit**

`feat: add build cards, the pick scene and the boss evolution shard`

---

### Task 4: Elite rooms award a new Art; the Blade Arts page becomes the pool

**Files:**
- Modify: `src/data/run.ts`, `src/systems/rooms.js`, `src/world/floor.ts` (`scaled` for elites), `src/render/world.js` (elite glow, door label), `src/systems/meta.js`, `src/ui/screens.js` (`renderSkills`, title shard line), `index.html` (Blade Arts hint), `src/core/events.ts`
- Test: `tests/run.test.ts`, `tests/rooms.test.ts`, `tests/mechanics.test.ts`

**Interfaces:**
- Consumes: `G.rewards` (Task 3), `rollArtCards`, `planWaves`, `rollDoors`.
- Produces: `planElite(seed, i): WaveMob[][]`, `WaveMob.elite?: boolean`, `ELITE = { hp: 4, dmg: 1.5, radius: 1.3, scale: 1.4 }` (run.ts), `Mob.elite`, `isUnlocked(id)` by pool.

- [ ] **Step 1: Write the failing tests**

`tests/run.test.ts`:
- Replace `'only battle rooms exist in round 1, told apart by their reward'` with:

```ts
  it('round 2 rolls battle and elite rooms; battle doors name a reward, elite doors do not', () => {
    const all = Array.from({ length: 60 }, (_, s) => rollDoors(s + 1, 1)).flat();
    expect(all.some(d => d.type === 'elite')).toBe(true);
    for (const d of all) {
      expect(['battle', 'elite']).toContain(d.type);
      expect(d.type === 'battle' ? d.reward !== null : d.reward === null).toBe(true);
    }
  });

  it('an act always offers an elite before its boss when elites exist', () => {
    for (let seed = 1; seed < 60; seed++) for (const from of [2, 7, 12, 17])
      expect([...rollDoors(seed, from - 1), ...rollDoors(seed, from)].some(d => d.type === 'elite')).toBe(true);
  });

  it('an elite room is one wave: 1 elite plus 3 of the act mob', () => {
    const w = planElite(3, 2);
    expect(w).toHaveLength(1);
    expect(w[0].filter(m => m.elite)).toEqual([{ id: 'frenzyBoar', n: 1, elite: true }]);
    expect(w[0].find(m => !m.elite)).toEqual({ id: 'frenzyBoar', n: 3 });
  });
```

  (import `planElite`).

`tests/rooms.test.ts`, add:

```ts
describe('an elite room', () => {
  beforeEach(() => { startRun(1); loadFloor(2, { type: 'elite', reward: null }); });

  it('spawns one elite with 4x HP and 1.5x damage among 3 normal mobs', () => {
    frames(60);
    const elites = G.mobs.filter(m => m.elite), base = G.F!.mob;
    expect(elites).toHaveLength(1);
    expect(elites[0].maxHp).toBe(Math.round(Math.round(base.hp * mobScale(2)) * 4));
    expect(elites[0].def.dmg).toBe(Math.round(Math.round(base.dmg * mobScale(2)) * 1.5));
    expect(G.mobs.filter(m => !m.elite)).toHaveLength(3);
  });

  it('clearing it awards a new Art (the test harness takes the first card) and opens doors; it pays no Gold', () => {
    expect(G.P!.skills[1]).toBeNull();
    clearRoom();
    expect(G.P!.skills[1]).not.toBeNull(); // the harness resolves G.rewards right away, like the bots
    expect(G.rewards).toEqual([]);
    expect(G.P!.col).toBe(0);
    expect(G.doors.length).toBeGreaterThan(0);
  });
});
```

  (import `mobScale` from run.ts if not imported; `clearRoom` is the existing bounded helper in that file).

`tests/mechanics.test.ts`: replace `'shards are earned per run, unlock a skill once and equip it…'` with:

```ts
  it('starting Arts are in the pool for free; unlocking never equips; shards are earned per run', async () => {
    const { meta } = await import('../src/core/save.ts');
    const { awardShards, unlockSkill, isUnlocked } = await import('../src/systems/meta.js');
    meta.shards = 0; meta.unlocked = ['sonicLeap'];
    expect(isUnlocked('horizontal')).toBe(true); expect(isUnlocked('vorpal')).toBe(true);
    expect(unlockSkill('horizontal')).toBe(false); // already in the pool, nothing to buy
    G.run!.kills = 80; G.run!.floor = 6; G.run!.bosses = 1;
    expect(awardShards(false)).toBe(45);
    startRun(3);
    expect(G.P!.skills).toEqual(['sonicLeap', null, null]);
  });
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run tests/run.test.ts tests/rooms.test.ts tests/mechanics.test.ts`
Expected: FAIL (`planElite` missing, no elite doors, `isUnlocked('horizontal')` false).

- [ ] **Step 3: Elite rooms in `src/data/run.ts`**

- `export const AVAILABLE_ROOMS: RoomType[] = ['battle', 'elite'];`
- `export type WaveMob = { id: MobId; n: number; elite?: boolean };`
- Add:

```ts
// Elite room: the act's melee mob as an elite (x4 HP, x1.5 damage, bigger) with 3 of the same as escorts
export const ELITE = { hp: 4, dmg: 1.5, radius: 1.3, scale: 1.4 };
export const planElite = (_seed: number, i: number): WaveMob[][] => {
  const F = FLOORS[actOf(i)];
  return [[{ id: F.mob, n: 1, elite: true }, { id: F.mob, n: 3 }]];
};
```

- [ ] **Step 4: Rooms (`src/systems/rooms.js`)**

- Imports: add `planElite, ELITE` from run.ts.
- `startRoom`: `waves: (room.type === 'elite' ? planElite : planWaves)(G.run?.seed ?? 0, i),`.
- `spawnWave`: for `{ id, n, elite }`:

```js
    const base = scaled(MOBS[id]), M = elite ? { ...base, hp: Math.round(base.hp * ELITE.hp), dmg: Math.round(base.dmg * ELITE.dmg),
      radius: Math.round(base.radius * ELITE.radius), scale: (base.scale ?? 1) * ELITE.scale } : base;
    // …inside the loop, after creating m:
      m.elite = !!elite;
```

- `payReward`: no change (an elite room's reward is `null`).
- `updateRoom`, after `payReward(R.reward);`: `if (R.type === 'elite') G.rewards.push('art');`.

- [ ] **Step 5: Elite look and door sign (`src/render/world.js`)**

- Mob draw: before the status tint, `if (m.elite) { ctx.shadowColor = '#a688ff'; ctx.shadowBlur = 18; }` (status tint and wind-up glow still override it while active), and after drawing the HP bar, draw a small crown-less marker: `if (m.elite) { ctx.fillStyle = '#a688ff'; ctx.fillRect(m.x - 18, m.y - 50, 36, 3); }`.
- `doorLook(d)`: before the reward lookup add `if (d.to.type === 'elite') return ['#a688ff', { th: 'Elite: ท่าใหม่', en: 'Elite: new Art' }];`.

- [ ] **Step 6: Meta pool (`src/systems/meta.js`, title page)**

`src/systems/meta.js` (`isUnlocked` is already pool-based from Task 3):

```js
export function unlockSkill(id) {
  const S = SKILLS[id];
  if (!S || S.pool !== 'unlock' || isUnlocked(id) || meta.shards < S.cost) return false;
  meta.shards -= S.cost; meta.unlocked.push(id); saveMeta();
  return true;
}
```

Delete `equipSkill`.

`src/ui/screens.js` `renderSkills` and its click handler:

```js
function renderSkills(status = '') {
  $('shards-have').textContent = tr(`มี ${meta.shards} Memory Shard`, `${meta.shards} Memory Shards`);
  $('skill-cards').innerHTML = Object.entries(SKILLS).map(([id, S]) => {
    const own = isUnlocked(id);
    const state = S.pool === 'fixed' ? tr('ช่อง 1 ติดตัวเสมอ', 'Always in slot 1') : own ? tr('อยู่ในกองสุ่มแล้ว', 'In the pool') : tr(`ปลดล็อก ${S.cost} Shard`, `Unlock for ${S.cost} Shards`);
    const off = own || meta.shards < S.cost;
    return `<button class="card${own ? ' on' : ''}" data-skill="${id}" ${off ? 'aria-disabled="true"' : ''} aria-label="${S.name}, ${state}. ${t(S.desc)}">
      <b lang="en">${S.name}</b><span>${t(S.desc)}</span><span class="price">${state}</span></button>`;
  }).join('');
  $('skills-status').textContent = status;
}
$('skill-cards').addEventListener('click', e => {
  const id = /** @type {HTMLElement | null} */ (/** @type {Element} */ (e.target).closest('[data-skill]'))?.dataset.skill;
  if (!id || isUnlocked(id)) return;
  renderSkills(unlockSkill(id) ? tr(`ปลดล็อก ${SKILLS[id].name} แล้ว จะโผล่ให้เลือกหลังเคลียร์ห้อง Elite`, `${SKILLS[id].name} unlocked. It can now show up after Elite rooms.`)
    : tr('Shard ยังไม่พอ ได้เพิ่มทุกครั้งที่จบรอบ', 'Not enough Shards yet. You earn more at the end of every run.'));
  SFX.ui();
});
```

  Remove the `equipSkill` import. Title `#shards-info`: `` `${meta.shards} Shard` `` (TH and EN identical: `tr(`${meta.shards} Shard`, `${meta.shards} Shards`)`), with no slot-2 text.

`index.html`: the Blade Arts window hint becomes:

```html
    <p class="hint" data-en="Slot 1 is always Gale Rush. Slots 2 and 3 fill during a run: clear an Elite room to pick a new Art from the pool below. Memory Shards unlock more Arts for the pool.">ช่อง 1 เป็น Gale Rush เสมอ ส่วนช่อง 2 และ 3 ได้ระหว่างเล่น เคลียร์ห้อง Elite แล้วเลือกท่าใหม่จากกองด้านล่าง ใช้ Memory Shard ปลดล็อกท่าเพิ่มเข้ากองได้</p>
```

- [ ] **Step 7: Run the tests**

Run: `npx tsc -p . && npx vitest run && npx playwright test e2e/smoke.spec.ts`
Expected: PASS. `tests/sim.test.ts` may change outcomes (elite rooms now appear, bots pick Arts). If the balance guard fails, report the per-seed results. Do not tune.

- [ ] **Step 8: Propose commit**

`feat: add elite rooms that award a new Blade Art`

---

### Task 5: Bots, full-loop tests and verification for the build

**Files:**
- Modify: `e2e/loop.spec.ts`, `e2e/playthrough.bot.ts`, `tests/harness.ts` (bot uses slots 2-3)
- Test: the files above

**Interfaces:**
- Consumes: everything above. The in-page hook (`window.__saoy`) needs `rewards` and the pick state, so add getters `rewards: () => G.rewards` to `live` in `src/main.js`.

- [ ] **Step 1: Headless bot uses slots 2-3 (`tests/harness.ts`)**

In `createBot`'s `fight` and boss branch, after `if (P.skillCd[0] <= 0) skill();` add `if (P.skills[1] && P.skillCd[1] <= 0) skill(1); if (P.skills[2] && P.skillCd[2] <= 0) skill(2);`.

- [ ] **Step 2: Full-loop browser test covers the picks (`e2e/loop.spec.ts`)**

- `settle()` already presses `Digit1` while `#upgrade` is visible. Keep that; it now also resolves Art, replace and evolution picks.
- In the clear loop, after floor 4 (the first boss), assert the evolution pick happened: `expect(await hook(page, 's.P.evolved.length')).toBeGreaterThan(0);`.
- Add a test:

```ts
test('an elite room awards a new Blade Art through the picker', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  await diveIn(page);
  await hook(page, "s.loadFloor(2, { type: 'elite', reward: null })");
  await until(page, '(s.mobs.forEach(m => m.hp > 0 && s.hurtEnemy(m, m.hp + 1, true)), s.rewards.length > 0 || s.P.skills[1] !== null)', 30_000);
  await expect(page.locator('#upgrade')).toBeVisible({ timeout: 5_000 });
  await page.keyboard.press('Digit1');
  await expect.poll(() => hook(page, 's.P.skills[1]')).not.toBeNull();
  expect(errors).toEqual([]);
});
```

- [ ] **Step 3: In-page bot (`e2e/playthrough.bot.ts`)**

- `overlays()`: the `#upgrade` branch already taps a digit. Keep `'Digit' + (1 + (frames % 3))` for level picks, but when the header reads a replace pick it must still resolve. Tap `Digit1` when `document.getElementById('upgrade-cards').children.length < 3`.
- Fighting: after `tap('KeyK')` add `if (P.skills[1] && P.skillCd[1] <= 0) tap('KeyL'); if (P.skills[2] && P.skillCd[2] <= 0) tap('KeyI');` (in both the room and boss branches).
- Note at the end: `note('build: ' + JSON.stringify(s.P.skills) + ' mods ' + JSON.stringify(s.P.mods) + ' evolved ' + JSON.stringify(s.P.evolved))` when the run ends.

- [ ] **Step 4: Run everything and a soak**

Run: `npm run check`. Expected: PASS.
Run: `npx playwright test --config e2e/capture.config.ts e2e/playthrough.bot.ts`. Expected: both runs end (win or death on floor ≥ 5), `errors: []`, and a build line showing at least one slotted Art and one mod.
Soak: a temporary test file that plays seeds 100-119 with `playRun` and writes the results to a temp file. Report the win rate, deaths by floor, and how many runs had a slot-2 Art and an evolved Art. Then delete both files.

- [ ] **Step 5: Propose commit**

`test: cover elite rewards and builds in bots and full-loop tests`

---

## Self-review notes

- Spec coverage (round 2 scope): elements with exact values (Tasks 1-2), mods with max 2 and the ×1.5 double (Tasks 2-3), set bonuses (Task 2), level-up cards weighted 2:1 (Task 3), evolution at 2 mods and from the boss shard with the Potion/Gold fallback and full heal (Task 3), elite room plus the Art pick with replace/skip and the stat fallback (Tasks 3-4), 3 slots (Task 1), save v3 with the Shard refund (Task 1), the meta page as a pool (Task 4).
- Deferred by the spec to later rounds: Crescent Wave, Riposte and Shade Step plus the hand-made evolved forms (round 4; the interim ×1.3 is ruled here), card preview animations, the HUD build gems, blade colour and aura, the pause Build panel (round 6), elite modifiers (round 3), balance tuning (round 6).
- Deviation from spec, ruled: spec B's suspend `build` had a `catalyst` flag. An evolution pick is consumed on the spot and resume restarts the floor, so the flag is never needed (YAGNI).
- Names used across tasks: `P.skills` (3), `P.skillCd` (3), `P.mods`, `P.evolved`, `P.stormHits`, `G.rewards`, `G.bolts`, `applyElements`, `tickStatus`, `speedFactor`, `setActive`, `elementCount`, `frostRing`, `onElementKill`, `kill`, `dot`, `hurtEnemy(…, art)`, `rollLevelCards`, `rollArtCards`, `evolveCards`, `statCards`, `modCards`, `applyCard`, `hasLevelPick`, `nextPick`, `cardsFor`, `evolve`, `bossReward`, `showPicker`, `planElite`, `ELITE`, `isUnlocked`, `unlockSkill`.
