# 20-Floor Run, Round 1 (skeleton) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the 4-floor game into a 20-floor run (4 acts × town, 3 rooms, boss) with door picking between rooms, using the existing combat unchanged.

**Architecture:** Floor rules and room data live in a new pure module `src/data/run.ts`. A per-floor layout object `G.L` (from `src/world/layout.ts`) replaces the fixed `WORLD`/`TOWN_X`/`ROOM_X`/`ROOM`/`GATE`/`DOOR`/`TORCHES`/`FOUNTAIN` constants everywhere. A new `src/systems/rooms.js` runs room waves, rewards and doors. Save version 2 stores the run seed, the current room and HP. Old 4-floor suspended runs are dropped, and their best record moves to `bestLegacy`.

**Tech Stack:** Vanilla JS + TypeScript (checked JS), Vite, Zod, Vitest, Playwright (local Chrome).

**Spec:** `docs/superpowers/specs/2026-10-09-twenty-floor-run-design.md` (round 1 = "โครง 20 ชั้น"). Companion: `docs/superpowers/specs/2026-10-09-in-run-progression-design.md`.

## Global Constraints

- 20 floors, bosses at floors 5, 10, 15, 20 (indices 4, 9, 14, 19). 1 floor = 1 room.
- Act order and themes: Firstlight, Hornfield, Mistwell, Canalis (existing `FLOORS` entries, now one per act).
- Town 1200×800, room 1200×800, boss floor 1400×900.
- Mobs inside an act: HP and damage +8% per floor (`stepOf(i) × 0.08`).
- Door weights: battle 35, elite 20, shop 15, shrine 12, challenge 10, spring 8. Round 1 only implements `battle`.
- Door table: town → 1 door (battle, reward XP); after the room at step 1 → 3 doors; after step 2 → 3 doors (must include spring/shop and elite when those types exist); after step 3 → 1 door (boss); boss → portal to the next act's town.
- Shards per run: `floor(kills / 4) + 3 × floorsPassed + 10 × bossesKilled + (cleared ? 20 : 0)`.
- `SAVE_VERSION` = 2. A v1 suspend is deleted and the title shows a notice once. v1 `meta.best` moves to `meta.bestLegacy`.
- Every player-facing string is a TH/EN pair (`tr` / `Text` from `src/core/i18n.ts`), written in the plain voice of the existing copy.
- **Commits:** the user commits (global CLAUDE.md). Every "Propose commit" step means: run `git status` and `git diff`, report, and give the message. Do **not** run `git commit`.
- `npm run check` (tsc + vitest + playwright) must pass at the end of every task.

## File Structure

| File | Responsibility |
|---|---|
| `src/core/rng.ts` (modify) | add `makeRng(seed)`, used by the global rng and by run rolls |
| `src/data/run.ts` (create) | floor indexing, room types, door rolls, wave plans, room presets, rewards, shards formula |
| `src/data/floors.ts` (modify) | act data only: drop old field geometry (`trees`, `ponds`, `spawns`, `rangedSpawns`, `extras.at`, `name`) |
| `src/world/layout.ts` (create) | `Layout` type + `layoutFor(kind)` geometry for town/room/boss |
| `src/world/constants.ts` (modify) | keep only `W`, `H` |
| `src/world/state.ts` (modify) | `G.L`, `G.room`, `G.doors`, `G.trees`, `G.ponds`; `Run.seed`, `Run.bosses` |
| `src/world/floor.ts` (modify) | `loadFloor(i, room)`, `floorLabel(i)`, snapshot/resume v2 |
| `src/systems/rooms.js` (create) | room waves, clear → reward → doors, entering doors |
| `src/systems/*.js` (modify) | read `G.L` instead of constants |
| `src/render/terrain.js`, `world.js`, `hud.js`, `menu.js` (modify) | per-layout painting, doors, floor counter, minimap |
| `src/core/save.ts` (modify) | v2 schemas, slot-aware migrations, import migration, `legacySuspendDropped` |
| `tests/run.test.ts` (create), others (modify) | see each task |

---

### Task 1: Run rules module (`run.ts`) and shared seeded RNG

**Files:**
- Modify: `src/core/rng.ts`
- Create: `src/data/run.ts`
- Test: `tests/run.test.ts`

**Interfaces:**
- Produces:
  - `makeRng(seed: number): () => number` (rng.ts)
  - `FLOOR_COUNT = 20`, `ACT_LEN = 5`
  - `actOf(i)`, `stepOf(i)` (0 town, 1-3 rooms, 4 boss), `kindOf(i): 'town'|'room'|'boss'`, `isFinalFloor(i)`, `mobScale(i)`
  - `type RoomType`, `ROOM_TYPES`, `type Reward = 'gold'|'xp'|'potion'`, `REWARDS`
  - `interface Room { type: RoomType; reward: Reward | null }`
  - `ROOM_WEIGHTS`, `AVAILABLE_ROOMS`
  - `rollDoors(seed, from, available?): Room[]`
  - `rewardValue(reward, act): number`
  - `type WaveMob = { id: MobId; n: number }`, `planWaves(seed, i): WaveMob[][]`
  - `ROOM_PRESETS`, `pickPreset(seed, i): number`
  - `START_ZONE`, `DOOR_ZONE`, `CENTER_ZONE`
  - `shardsFor(kills, floorsPassed, bosses, cleared)`

- [ ] **Step 1: Write the failing tests**

Create `tests/run.test.ts`:

```ts
// Run rules: floor kinds, door rolls, wave plans, presets and the shards formula. Pure data, no DOM.
import { describe, it, expect } from 'vitest';
import { FLOOR_COUNT, actOf, stepOf, kindOf, isFinalFloor, mobScale, rollDoors, planWaves, ROOM_PRESETS, pickPreset,
         START_ZONE, DOOR_ZONE, CENTER_ZONE, shardsFor, rewardValue } from '../src/data/run.ts';
import { TREE_TYPES } from '../src/data/floors.ts';
import { MOBS } from '../src/data/mobs.ts';
import { overlaps } from '../src/core/math.ts';

describe('floor kinds', () => {
  it('20 floors: town, 3 rooms, boss per act', () => {
    expect(FLOOR_COUNT).toBe(20);
    const kinds = Array.from({ length: FLOOR_COUNT }, (_, i) => kindOf(i)).join(',');
    expect(kinds).toBe(Array(4).fill('town,room,room,room,boss').join(','));
    expect([4, 9, 14, 19].map(kindOf)).toEqual(['boss', 'boss', 'boss', 'boss']);
    expect(actOf(0)).toBe(0); expect(actOf(9)).toBe(1); expect(actOf(19)).toBe(3);
    expect(stepOf(12)).toBe(2);
    expect(isFinalFloor(19)).toBe(true); expect(isFinalFloor(14)).toBe(false);
  });

  it('mobs get 8% stronger per floor inside an act', () => {
    expect(mobScale(0)).toBe(1); expect(mobScale(3)).toBeCloseTo(1.24); expect(mobScale(5)).toBe(1);
  });
});

describe('doors', () => {
  it('after a room at step 1 or 2 there are 3 doors with no duplicate (type, reward)', () => {
    for (let seed = 1; seed < 40; seed++) for (const from of [1, 2, 6, 7, 11, 12, 16, 17]) {
      const doors = rollDoors(seed, from);
      expect(doors).toHaveLength(3);
      expect(new Set(doors.map(d => d.type + ':' + d.reward)).size).toBe(3);
    }
  });

  it('same seed and floor give the same doors; another seed differs somewhere', () => {
    expect(rollDoors(7, 2)).toEqual(rollDoors(7, 2));
    const all = (s: number) => JSON.stringify([1, 2, 6, 7].map(f => rollDoors(s, f)));
    expect(all(7)).not.toBe(all(8));
  });

  it('pre-boss doors include spring or shop, and elite if none was offered earlier in the act (when available)', () => {
    const avail = ['battle', 'elite', 'spring', 'shop', 'shrine', 'challenge'] as const;
    for (let seed = 1; seed < 60; seed++) for (const from of [2, 7, 12, 17]) {
      const doors = rollDoors(seed, from, [...avail]);
      expect(doors.some(d => d.type === 'spring' || d.type === 'shop')).toBe(true);
      const earlier = rollDoors(seed, from - 1, [...avail]);
      if (!earlier.some(d => d.type === 'elite')) expect(doors.some(d => d.type === 'elite')).toBe(true);
    }
  });

  it('only battle rooms exist in round 1, told apart by their reward', () => {
    expect(rollDoors(3, 1).every(d => d.type === 'battle' && d.reward !== null)).toBe(true);
  });

  it('rewards grow with the act', () => {
    expect(rewardValue('gold', 3)).toBeGreaterThan(rewardValue('gold', 0));
    expect(rewardValue('potion', 2)).toBe(1);
  });
});

describe('waves', () => {
  it('2 waves on the first room of an act, 3 later; every id is a real mob', () => {
    expect(planWaves(1, 1)).toHaveLength(2);
    expect(planWaves(1, 3)).toHaveLength(3);
    for (const i of [1, 2, 3, 6, 12, 18]) for (const w of planWaves(5, i)) for (const { id, n } of w) {
      expect(MOBS[id], id).toBeDefined(); expect(n).toBeGreaterThan(0);
    }
  });
});

describe('room presets', () => {
  const rects = (p: (typeof ROOM_PRESETS)[number]) => [
    ...p.trees.map(([x, y, k]) => { const h = TREE_TYPES[k].hit; return { x: x + h[0], y: y + h[1], w: h[2], h: h[3] }; }),
    ...(p.ponds ?? []),
  ];
  it('keep the start, centre and door zones clear and stay inside the room', () => {
    ROOM_PRESETS.forEach((p, n) => {
      for (const r of rects(p)) {
        for (const [zone, z] of [['start', START_ZONE], ['door', DOOR_ZONE], ['center', CENTER_ZONE]] as const)
          expect(overlaps(r, z), `preset ${n} blocks the ${zone} zone`).toBe(false);
        expect(r.x >= 0 && r.y >= 0 && r.x + r.w <= 1200 && r.y + r.h <= 800, `preset ${n} out of bounds`).toBe(true);
      }
    });
  });
  it('the preset is picked from the seed', () => {
    expect(pickPreset(4, 2)).toBe(pickPreset(4, 2));
    expect(pickPreset(4, 2)).toBeLessThan(ROOM_PRESETS.length);
  });
});

it('shards: kills/4 + 3 per floor passed + 10 per boss + 20 for a clear', () => {
  expect(shardsFor(40, 2, 0, false)).toBe(16);
  expect(shardsFor(80, 20, 4, true)).toBe(20 + 60 + 40 + 20);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/run.test.ts`
Expected: FAIL. `src/data/run.ts` does not exist.

- [ ] **Step 3: Add `makeRng` to `src/core/rng.ts`**

Replace the body of `src/core/rng.ts` with:

```ts
// Seeded PRNG (mulberry32) for everything that affects gameplay — AI choices, wander targets, damage rolls —
// so a test or replay with the same seed + inputs plays out identically. Purely visual randomness
// (particles, torch flicker) keeps using Math.random.
// makeRng gives an independent stream (door rolls, wave plans) that never shifts the gameplay sequence.
export function makeRng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let stream = makeRng((Math.random() * 2 ** 32) >>> 0);
export function seedRng(seed: number) { stream = makeRng(seed); }
export const rng = () => stream();
```

- [ ] **Step 4: Create `src/data/run.ts`**

```ts
// The 20-floor run: 4 acts of town -> 3 rooms -> boss. Which floor is which, what the doors between rooms
// offer, what each room spawns, and the room layouts. Pure data and rules (no DOM, no G), so it's unit-testable.
// Doors and waves come from the run seed + floor number on their own rng stream: the same run rolls the same
// doors after a reload, and rolling them never shifts gameplay randomness.
import { makeRng } from '../core/rng.ts';
import { FLOORS, type TreeType } from './floors.ts';
import type { MobId } from './mobs.ts';
import type { Rect } from '../core/math.ts';

export const FLOOR_COUNT = 20, ACT_LEN = 5;
export type FloorKind = 'town' | 'room' | 'boss';
export const actOf = (i: number) => Math.floor(i / ACT_LEN);
export const stepOf = (i: number) => i % ACT_LEN; // 0 town, 1-3 rooms, 4 boss
export const kindOf = (i: number): FloorKind => (stepOf(i) === 0 ? 'town' : stepOf(i) === ACT_LEN - 1 ? 'boss' : 'room');
export const isFinalFloor = (i: number) => i === FLOOR_COUNT - 1;
export const mobScale = (i: number) => 1 + 0.08 * stepOf(i); // inside an act: +8% HP and damage per floor

export const ROOM_TYPES = ['battle', 'elite', 'spring', 'shop', 'shrine', 'challenge'] as const;
export type RoomType = (typeof ROOM_TYPES)[number];
export const REWARDS = ['gold', 'xp', 'potion'] as const;
export type Reward = (typeof REWARDS)[number];
export interface Room { type: RoomType; reward: Reward | null }

export const ROOM_WEIGHTS: Record<RoomType, number> = { battle: 35, elite: 20, shop: 15, shrine: 12, challenge: 10, spring: 8 };
// Room types this build can actually run; later rounds add to it
export const AVAILABLE_ROOMS: RoomType[] = ['battle'];
const HAS_REWARD: RoomType[] = ['battle', 'challenge']; // rooms whose door names a reward

export const rewardValue = (r: Reward, act: number) => (r === 'gold' ? 40 + 30 * act : r === 'xp' ? 120 + 80 * act : 1);

// Doors after clearing the room on floor `from` (a step 1 or 2 room); each door picks what floor from+1 will be.
// Fixed exits (town -> first room, last room -> boss, boss -> next town) are not rolled.
export function rollDoors(seed: number, from: number, available: readonly RoomType[] = AVAILABLE_ROOMS): Room[] {
  const r = makeRng(seed * 31 + from * 7919), out: Room[] = [], key = (d: Room) => `${d.type}:${d.reward}`;
  const make = (type: RoomType): Room => ({ type, reward: HAS_REWARD.includes(type) ? REWARDS[Math.floor(r() * REWARDS.length)] : null });
  const add = (d: Room) => { if (out.length < 3 && !out.some(o => key(o) === key(d))) out.push(d); };
  if (stepOf(from) === ACT_LEN - 3) { // the last pick before the boss
    const rest = available.filter(t => t === 'spring' || t === 'shop');
    if (rest.length) add(make(rest[Math.floor(r() * rest.length)]));
    if (available.includes('elite') && !rollDoors(seed, from - 1, available).some(d => d.type === 'elite')) add(make('elite'));
  }
  const total = available.reduce((s, t) => s + ROOM_WEIGHTS[t], 0);
  for (let tries = 0; out.length < 3 && tries < 60; tries++) {
    let x = r() * total, t = available[0];
    for (const a of available) { x -= ROOM_WEIGHTS[a]; if (x < 0) { t = a; break; } }
    add(make(t));
  }
  return out;
}

export type WaveMob = { id: MobId; n: number };
// What a room on floor i spawns, wave by wave: mostly the act's melee mob, its ranged mob, and one swarm/armored
// group from the act's extras in the last wave
export function planWaves(seed: number, i: number): WaveMob[][] {
  const r = makeRng(seed * 17 + i * 104729), F = FLOORS[actOf(i)], step = stepOf(i);
  const count = step === 1 ? 2 : 3, waves: WaveMob[][] = [];
  for (let w = 0; w < count; w++) {
    const size = 3 + step + w, ranged = w === count - 1 ? 2 : 1;
    const wave: WaveMob[] = [{ id: F.mob, n: size - ranged }, { id: F.ranged, n: ranged }];
    if (w === count - 1 && F.extras.length) { const e = F.extras[Math.floor(r() * F.extras.length)]; wave.push({ id: e.mob, n: e.group ?? 1 }); }
    waves.push(wave);
  }
  return waves;
}

// Room layouts (1200x800). Every preset keeps the player's start, the room centre and the door wall clear.
export const START_ZONE: Rect = { x: 60, y: 340, w: 160, h: 120 };
export const CENTER_ZONE: Rect = { x: 540, y: 340, w: 120, h: 120 };
export const DOOR_ZONE: Rect = { x: 1040, y: 0, w: 160, h: 800 };
export const ROOM_PRESETS: { trees: [number, number, TreeType][]; ponds?: Rect[] }[] = [
  { trees: [[300, 120, 'big'], [760, 520, 'big'], [380, 300, 'small']] },
  { trees: [[260, 520, 'big'], [820, 100, 'big'], [600, 600, 'small'], [420, 160, 'small']] },
  { trees: [[360, 220, 'big'], [300, 600, 'small'], [820, 560, 'small']], ponds: [{ x: 720, y: 180, w: 200, h: 140 }] },
  { trees: [[200, 140, 'small'], [880, 380, 'big'], [420, 560, 'big']], ponds: [{ x: 520, y: 120, w: 180, h: 130 }] },
];
export const pickPreset = (seed: number, i: number) => Math.floor(makeRng(seed * 13 + i * 7)() * ROOM_PRESETS.length);

export const shardsFor = (kills: number, floorsPassed: number, bosses: number, cleared: boolean) =>
  Math.floor(kills / 4) + 3 * floorsPassed + 10 * bosses + (cleared ? 20 : 0);
```

- [ ] **Step 5: Reshape `src/data/floors.ts` into act data**

In `FloorDef`, remove `name`, `trees`, `ponds`, `spawns`, `rangedSpawns` and change `extras` to:

```ts
  extras: { mob: MobId; group?: number }[]; // the act's swarm/armored mob for a room's last wave; `group` spawns that many
```

In each of the 4 `FLOORS` entries, delete `name`, `trees`, `ponds`, `spawns`, `rangedSpawns`, and drop `at` from `extras`:
- Firstlight: `extras: [{ mob: 'piglet', group: 4 }]`
- Hornfield: `extras: [{ mob: 'taurusGuardian' }]`
- Mistwell: `extras: [{ mob: 'elfKnight' }, { mob: 'shadowPiglet', group: 4 }]`
- Canalis: `extras: [{ mob: 'tideGuardian' }, { mob: 'crabling', group: 4 }]`

Update the file's top comment to say each entry is one act's look, mobs and boss. Keep `TREE_TYPES` and `TreeType`.

- [ ] **Step 6: Run the new tests**

Run: `npx vitest run tests/run.test.ts`
Expected: PASS. `tsc` will fail elsewhere until Task 2 (the old floor geometry is gone). That's expected; Tasks 1 and 2 get proposed for commit together.

---

### Task 2: Per-floor layout (`G.L`) replaces the fixed geometry; `loadFloor(i, room)`

**Files:**
- Create: `src/world/layout.ts`
- Modify: `src/world/constants.ts`, `src/world/state.ts`, `src/world/floor.ts`, `src/world/physics.ts`, `src/systems/mobs.js`, `src/systems/boss.js`, `src/systems/combat.js`, `src/systems/player.js`, `src/systems/shop.js`, `src/systems/meta.js`, `src/data/shop.ts`, `src/data/skills.ts`, `src/main.js`
- Test: `tests/harness.ts`, `tests/mechanics.test.ts`, `tests/data.test.ts`

**Interfaces:**
- Consumes: everything from Task 1.
- Produces:
  - `interface Layout { kind: FloorKind; w; h; townX; roomX; gate: Rect[]; door: Rect | null; fountain: Point | null; merchant: Point | null; torches: [number, number][]; start: Point; bossAt: Point | null }`
  - `layoutFor(kind: FloorKind): Layout`, `fountainHit(p: Point): Rect` (layout.ts)
  - `G.L: Layout`, `G.room: RoomState | null`, `G.doors: Door[]`, `G.trees: [number, number, TreeType][]`, `G.ponds: Rect[]`
  - `interface Door extends Rect { to: Room | null }` (`null` = fixed exit: next town/first room/boss)
  - `Run` gains `seed: number; bosses: number`
  - `loadFloor(i: number, room?: Room | null)`, `floorLabel(i: number): string` (floor.ts)
  - `MERCHANT_REACH` (data/shop.ts) replaces `MERCHANT`

- [ ] **Step 1: Write the failing tests**

In `tests/harness.ts`:
- Replace the constants import with `import { W, H } from '../src/world/constants.ts';` and `import { loadFloor } from '../src/world/floor.ts';`.
- Add these helpers below `startRun`:

```ts
// Jump straight to a floor: a quiet battle room (waves stopped, no doors) or a boss floor with the player in the antechamber
export function enterRoom(i = 1) {
  loadFloor(i, { type: 'battle', reward: 'gold' });
  G.room!.cleared = true; G.doors = []; G.mobs = [];
  G.P!.x = 600; G.P!.y = 400; // CENTER_ZONE: every preset keeps it clear
}
export function enterBoss(i = 4) { loadFloor(i); G.mobs = []; }
```

- In `snapshot`, keep as is.

In `tests/mechanics.test.ts`:
- Replace `import { ROOM_X } from '../src/world/constants.ts';` with nothing, and import `enterRoom, enterBoss` from `./harness.ts`.
- Replace `quietField` with:

```ts
function quietField() { startRun(1); enterRoom(1); }
```

- `'a dash or roll at the doorway…'`: use `enterBoss(4)` instead of `quietField()` inside the loop (keep `quietField()` first to reset the player). Replace `ROOM_X` with `G.L.roomX` and the y `600` with `G.L.h / 2`.
- `'the town fountain is solid…'`: start with `startRun(1)` (floor 0 is the town). Use `G.P!.x = 600; G.P!.y = 420;` walking up → expect `y > 330`. Use the dash start `G.P!.x = 460; G.P!.y = 300; mouse.x = 900; mouse.y = 300 - G.cam.y;` → expect `x < 550`.
- `describe('boss')` beforeEach: `quietField(); enterBoss(14); G.P!.x = G.L.roomX + 100; G.P!.y = G.L.h / 2; frame();`
- `describe('floor 4 boss volley')` beforeEach: `quietField(); enterBoss(19); G.P!.x = G.L.roomX + 100; G.P!.y = G.L.h / 2; frame();`. Delete the `'ponds block movement like trees'` test (presets are checked in `tests/data.test.ts`).
- `describe('boss portal')` beforeEach: `quietField(); enterBoss(4); G.P!.x = G.L.roomX + 100; G.P!.y = G.L.h / 2; frame();`. In both tests, expected floors change from `0` → `4` and `1` → `5`.
- `'a suspended run resumes on the same floor…'`: replace `loadFloor(1)` with `enterRoom(1)` (still expects floor 1).
- `'a kill drops its Gold'`: the room is empty now, so make the mob first:

```ts
  it('a kill drops its Gold', async () => {
    const { hurtEnemy } = await import('../src/systems/combat.js');
    const { makeMob } = await import('../src/world/floor.ts');
    const m = makeMob(G.P!.x + 60, G.P!.y); G.mobs.push(m); m.hp = 1;
    hurtEnemy(m, 5, false);
    expect(G.P!.col).toBe(m.def.col);
  });
```

- `'the merchant stands in the safe zone…'`:

```ts
  it('the town merchant stands in the safe zone and can be reached; rooms have none', async () => {
    const { nearMerchant } = await import('../src/systems/shop.js');
    startRun(1); // floor 0 = town
    const m = G.L.merchant!;
    expect(m.x).toBeLessThan(G.L.townX);
    G.P!.x = m.x; G.P!.y = m.y + 30;
    expect(nearMerchant()).toBe(true);
    enterRoom(1);
    expect(G.L.merchant).toBeNull(); expect(nearMerchant()).toBe(false);
  });
```

- `'swarm points spawn their whole group'`: delete it (wave plans are checked in `tests/run.test.ts`).
- `'shards are earned per run…'`: set `G.run!.kills = 80; G.run!.floor = 6; G.run!.bosses = 1;`, expect `awardShards(false)` to be `45`, then `unlockSkill('vorpal')` false, `unlockSkill('horizontal')` true, and `meta.shards` to be `45 - SKILLS.horizontal.cost`.

Replace `tests/data.test.ts` with:

```ts
// Content sanity: every act's data resolves, story beats exist, each floor kind lays out playably.
import { describe, it, expect, beforeAll } from 'vitest';
import { G, startRun } from './harness.ts';
import { loadFloor } from '../src/world/floor.ts';
import { hitWall } from '../src/world/physics.ts';
import { FLOORS } from '../src/data/floors.ts';
import { MOVES } from '../src/data/bosses.ts';
import { STORY } from '../src/data/story.ts';
import { ACT_LEN } from '../src/data/run.ts';

describe.each(FLOORS.map((f, a) => [f.town, a] as const))('act %s', (_town, a) => {
  beforeAll(() => startRun(1));

  it('mob and boss ids resolve to stats, with a ranged mob in the ranged slot', () => {
    loadFloor(a * ACT_LEN);
    expect(G.F!.mob.hp).toBeGreaterThan(0);
    expect(G.F!.ranged.ranged).toBeDefined();
    expect(G.F!.boss.hp).toBeGreaterThan(0);
    for (const mv of [...G.F!.boss.moves, ...G.F!.boss.rageMoves]) expect(MOVES[mv], mv).toBeDefined();
  });

  it('has a story beat with non-empty lines', () => {
    expect(STORY['floor' + a]?.length).toBeGreaterThan(0);
    for (const l of STORY['floor' + a]) expect(l.who && l.text).toBeTruthy();
  });

  it('town: start, merchant and exit door are reachable (not in walls)', () => {
    loadFloor(a * ACT_LEN);
    expect(hitWall({ ...G.L.start, r: 14 })).toBe(false);
    expect(hitWall({ ...G.L.merchant!, r: 14 })).toBe(false);
    expect(G.doors).toHaveLength(1);
  });

  it('boss floor: the boss stands in its room behind a gate with an open gap', () => {
    loadFloor(a * ACT_LEN + 4);
    expect(G.boss!.hp).toBeGreaterThan(0);
    expect(G.boss!.x).toBeGreaterThan(G.L.roomX);
    expect(hitWall({ x: G.L.roomX + 20, y: G.L.h / 2, r: 14 })).toBe(false); // the doorway
    expect(hitWall({ x: G.L.roomX + 20, y: 40, r: 14 })).toBe(true);         // the wall
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run`
Expected: FAIL (`enterRoom`, `G.L`, `loadFloor(i, room)` don't exist; tsc errors from Task 1).

- [ ] **Step 3: Create `src/world/layout.ts`**

```ts
// Geometry of the three floor kinds. The town and rooms are one open space; the boss floor is an antechamber,
// a gate with a doorway (shut while the boss is awake) and the boss room behind it.
import type { Point, Rect } from '../core/math.ts';
import type { FloorKind } from '../data/run.ts';

export interface Layout {
  kind: FloorKind; w: number; h: number;
  townX: number;   // x < townX is the safe zone (HP regen, mobs stay out): the whole town, nowhere else
  roomX: number;   // x > roomX is the boss room (the boss wakes past roomX + 60); = w on floors without one
  gate: Rect[]; door: Rect | null; fountain: Point | null; merchant: Point | null;
  torches: [number, number][]; start: Point; bossAt: Point | null;
}

// The fountain sprite's solid basin, relative to the sprite centre (the jet above it is walk-behind)
export const fountainHit = (p: Point): Rect => ({ x: p.x - 56, y: p.y - 38, w: 116, h: 80 });

export function layoutFor(kind: FloorKind): Layout {
  if (kind === 'town') return { kind, w: 1200, h: 800, townX: 1200, roomX: 1200, gate: [], door: null,
    fountain: { x: 600, y: 300 }, merchant: { x: 660, y: 470 }, torches: [], start: { x: 150, y: 400 }, bossAt: null };
  if (kind === 'room') return { kind, w: 1200, h: 800, townX: 0, roomX: 1200, gate: [], door: null,
    fountain: null, merchant: null, torches: [], start: { x: 150, y: 400 }, bossAt: null };
  const w = 1400, h = 900, roomX = 400, gap = 60;
  return { kind, w, h, townX: 0, roomX,
    gate: [{ x: roomX, y: 0, w: 40, h: h / 2 - gap }, { x: roomX, y: h / 2 + gap, w: 40, h: h / 2 - gap }],
    door: { x: roomX, y: h / 2 - gap, w: 40, h: gap * 2 },
    fountain: null, merchant: null,
    torches: [[roomX + 70, 80], [roomX + 70, h - 80], [w - 40, 80], [w - 40, h - 80], [roomX + 70, h / 2 - 130], [roomX + 70, h / 2 + 130]],
    start: { x: 150, y: h / 2 }, bossAt: { x: roomX + 520, y: h / 2 } };
}
```

- [ ] **Step 4: Trim `src/world/constants.ts` to the canvas size**

```ts
// Canvas size (must match <canvas width/height> in index.html). Floor geometry is per floor: see world/layout.ts.
export const W = 960, H = 640;
```

- [ ] **Step 5: Extend `src/world/state.ts`**

- Import `type { Layout } from './layout.ts'`, `type { Room, WaveMob } from '../data/run.ts'`, `type { TreeType } from '../data/floors.ts'`, `type { Rect } from '../core/math.ts'` (Rect is already imported).
- Add:

```ts
export interface RoomState extends Room { waves: WaveMob[][]; wave: number; next: number; cleared: boolean }
export interface Door extends Rect { to: Room | null } // to = null: the fixed exit (first room, boss, next town)
```

- Change `Run` to `{ floor: number; kills: number; time: number; seed: number; bosses: number; assisted?: boolean; over?: 'dead' | 'win' }`.
- Add `aggro?: boolean` to `Mob` (room mobs chase from anywhere).
- In `G`, add `L: null as Layout | null, room: null as RoomState | null, doors: [] as Door[], trees: [] as [number, number, TreeType][], ponds: [] as Rect[],`.

- [ ] **Step 6: Rewrite `loadFloor` in `src/world/floor.ts`**

Replace the imports and `floorData`/`isLastFloor`/`makeMob`/`loadFloor`/`newRun` with:

```ts
import { G, type Mob, type Floor } from './state.ts';
import { layoutFor, fountainHit } from './layout.ts';
import { MOBS, type MobStats } from '../data/mobs.ts';
import { BOSSES, BOSS_DEFAULTS, BOSS_RULES } from '../data/bosses.ts';
import { FLOORS, TREE_TYPES } from '../data/floors.ts';
import { PLAYER } from '../data/player.ts';
import { SKILLS } from '../data/skills.ts';
import { FLOOR_COUNT, actOf, kindOf, mobScale, pickPreset, ROOM_PRESETS, type Room } from '../data/run.ts';
import { clock } from '../core/app.ts';
import { emit } from '../core/events.ts';
import { rng } from '../core/rng.ts';
import { tr } from '../core/i18n.ts';
import { settings, meta, type Suspend } from '../core/save.ts';
import { startRoom, makeDoors } from '../systems/rooms.js';

// An act's data with its mob/boss ids swapped for the actual stat objects (fails loudly on a typo'd id)
function actData(a: number): Floor {
  const f = FLOORS[a], mob = MOBS[f.mob], ranged = MOBS[f.ranged], boss = BOSSES[f.boss];
  if (!mob || !ranged || !boss) throw new Error(`${f.town}: unknown mob "${f.mob}"/"${f.ranged}" or boss "${f.boss}"`);
  return { ...f, mob, ranged, boss: { ...BOSS_DEFAULTS, ...boss } };
}
export const floorLabel = (i: number) => tr(`ชั้น ${i + 1}/${FLOOR_COUNT}`, `Floor ${i + 1}/${FLOOR_COUNT}`);

// Mob stats scaled for the floor (+8% HP and damage per floor inside an act)
export const scaled = (M: MobStats, i = G.floorIdx): MobStats => {
  const k = mobScale(i);
  return k === 1 ? M : { ...M, hp: Math.round(M.hp * k), dmg: Math.round(M.dmg * k) };
};
export function makeMob(x: number, y: number, summoned = false, M = G.F!.mob): Mob {
  return { x, y, sx: x, sy: y, wx: x, wy: y, r: M.radius, armorT: 0, hp: M.hp, maxHp: M.hp, cd: 0, dead: 0, hurt: 0, face: 0,
           side: 0, sideDir: 1, wind: 0, lunge: 0, kx: 0, ky: 0, summoned, def: M };
}

// Build floor i. `room` is the door the player chose (room floors only); null falls back to a battle room.
export function loadFloor(i: number, room: Room | null = null) {
  G.floorIdx = i; const act = actOf(i), kind = kindOf(i), F = G.F = actData(act), L = G.L = layoutFor(kind);
  const preset = kind === 'room' ? ROOM_PRESETS[pickPreset(G.run?.seed ?? 0, i)] : null;
  G.trees = (preset?.trees ?? []).map(([x, y, k]) => [x, y, act === 2 && k === 'big' ? 'dark' : k]);
  G.ponds = preset?.ponds ?? [];
  G.WALLS = [...L.gate, ...(L.fountain ? [fountainHit(L.fountain)] : []),
    ...G.trees.map(([x, y, k]) => { const h = TREE_TYPES[k].hit; return { x: x + h[0], y: y + h[1], w: h[2], h: h[3] }; }), ...G.ponds];
  G.mobs = []; G.doors = [];
  G.room = kind === 'room' ? startRoom(i, room ?? { type: 'battle', reward: 'xp' }) : null;
  if (kind === 'town') G.doors = makeDoors([{ type: 'battle', reward: 'xp' }]);
  // every floor has a boss object (systems read it); off boss floors it is a sleeping 0-HP placeholder
  const at = L.bossAt ?? { x: -999, y: -999 }, bhp = kind === 'boss' ? F.boss.hp : 0;
  G.boss = { x: at.x, y: at.y, z: 0, r: F.boss.r, hp: bhp, lag: bhp, maxHp: F.boss.hp, awake: false, cd: BOSS_RULES.firstMoveDelay,
             act: null, t: 0, tMax: 1, ang: 0, hurt: 0, hitP: false, summoned: false };
  const hp = kind === 'town' ? G.P!.maxHp : G.P!.hp; // only towns heal you fully
  Object.assign(G.P, { x: L.start.x, y: L.start.y, hp, lag: hp, dash: 0, delay: 0, trail: [], kx: 0, ky: 0, inv: 0, buf: null });
  G.texts = []; G.parts = []; G.shots = []; G.rings = []; G.doorClosed = false; G.portal = null; clock.hitStop = 0; G.shake = 0;
  if (G.run) G.run.floor = Math.max(G.run.floor, i + 1);
  emit('floorLoaded', i);
}
```

Replace `newRun` with:

```ts
export function newRun() {
  newPlayer();
  G.run = { floor: 1, kills: 0, time: 0, seed: Math.floor(rng() * 2 ** 31), bosses: 0, assisted: assistOn() };
  loadFloor(0);
}
```

Leave `snapshotRun`/`resumeRun` for Task 4, but make them compile now: `resumeRun` must call `loadFloor(s.floorIdx)` (unchanged), and `newRun`'s `Run` fields must be complete. Delete `isLastFloor`; it is replaced by `isFinalFloor` from `run.ts`.

- [ ] **Step 7: Point every system at `G.L`**

`src/world/physics.ts`:

```ts
import { G } from './state.ts';
import { clamp, type Point } from '../core/math.ts';
// …
export function hitWall(e: Body) {
  const ws = G.doorClosed && G.L!.door ? [...G.WALLS, G.L!.door] : G.WALLS;
  // (body unchanged)
}
export function move(e: Body, dx: number, dy: number, minX = 0, maxX = G.L!.w) {
  e.x += dx; if (hitWall(e) || e.x < e.r + minX || e.x > maxX - e.r) e.x -= dx;
  e.y += dy; if (hitWall(e) || e.y < e.r || e.y > G.L!.h - e.r) e.y -= dy;
}
export function applyKnock(e: Pushable, dt: number, minX = 0, maxX = G.L!.w) { /* body unchanged */ }
```

`src/systems/mobs.js`:
- Remove the constants import.
- Line `const M = m.def, R = M.ranged, maxX = …` becomes `const L = G.L, M = m.def, R = M.ranged, maxX = m.summoned ? L.w : L.roomX; // field mobs stay out of the boss room`
- Replace the respawn line with `if (m.hp <= 0) continue; // the dead stay dead: rooms are cleared wave by wave`
- `applyKnock(m, dt, TOWN_X, maxX)` → `applyKnock(m, dt, L.townX, maxX)`; both `move(…, TOWN_X, maxX)` → `move(…, L.townX, maxX)`.
- `chase = d < M.chaseRange && P.x > TOWN_X` → `chase = (m.aggro || d < M.chaseRange) && P.x > L.townX`
- In `updateShots`: `s.x > TOWN_X` → `s.x > G.L.townX`.

`src/systems/boss.js`:
- Remove the constants import.
- `ROOM.x0` → `G.L.roomX + 40` (3 places); `WORLD.w` → `G.L.w`; `WORLD.h` → `G.L.h`.
- `if (!b.awake && P.x > ROOM_X + 60)` → `if (!b.awake && b.hp > 0 && P.x > G.L.roomX + 60)`.

`src/systems/combat.js`:
- Replace imports: drop `ROOM, WORLD` and `isLastFloor`; add `import { isFinalFloor } from '../data/run.ts';`.
- `m.x = clamp(m.x, ROOM.x0 + 20, WORLD.w - 20)` → `m.x = clamp(m.x, G.L.roomX + 60, G.L.w - 20)`.
- In the boss-death branch, add `run.bosses++;` after `run.kills++;` and replace `if (!isLastFloor())` with `if (!isFinalFloor(G.floorIdx))`.
- In the mob-death branch, replace `e.dead = e.summoned ? Infinity : e.def.respawn;` with `e.dead = Infinity;`.

`src/systems/player.js`:
- Remove the constants import.
- In `dashMove`: `if (!G.boss.awake && P.x > G.L.roomX && x0 <= G.L.roomX) P.x = G.L.roomX;`
- `if (P.x < TOWN_X) P.hp = …` → `if (P.x < G.L.townX) P.hp = …`.

`src/data/shop.ts`: replace the `MERCHANT` line with `export const MERCHANT_REACH = 70; // the merchant stands in each town (world/layout.ts)`.

`src/systems/shop.js`:

```js
import { SHOP, MERCHANT_REACH, POTION_HEAL } from '../data/shop.ts';
// …
export const nearMerchant = () => !!G.P && !!G.L?.merchant && dist(G.P, G.L.merchant) < MERCHANT_REACH;
```

`src/systems/meta.js`: replace the `FLOORS`/`shardsFor` imports with `import { shardsFor, FLOOR_COUNT } from '../data/run.ts';` and the formula line with:

```js
  const n = shardsFor(G.run.kills, cleared ? FLOOR_COUNT : G.run.floor - 1, G.run.bosses, cleared);
```

`src/data/skills.ts`: delete `shardsFor` and its comment (it moved to `run.ts`).

`src/main.js`: change the constants import to `import { W, H } from './world/constants.ts';`. In the dev hook, replace `consts: { W, H, WORLD, TOWN_X, ROOM_X }` with `consts: { W, H }` and add getters `L: () => G.L, doors: () => G.doors, room: () => G.room` to `live`.

- [ ] **Step 8: Create a stub `src/systems/rooms.js` so floors load (filled in by Task 3)**

```js
// Rooms: waves, clearing, rewards and the doors to the next floor (round 1: battle rooms).
import { G } from '../world/state.ts';
import { planWaves } from '../data/run.ts';

export function startRoom(i, room) {
  return { ...room, waves: planWaves(G.run?.seed ?? 0, i), wave: -1, next: 0.8, cleared: false };
}
// Door rects on the right wall, top to bottom; `to` = what the next floor will be (null = the fixed exit)
export function makeDoors(rooms) {
  const ys = rooms.length === 1 ? [400] : rooms.length === 2 ? [260, 540] : [180, 400, 620];
  return rooms.map((to, k) => ({ x: G.L.w - 70, y: ys[k] - 55, w: 60, h: 110, to }));
}
```

- [ ] **Step 9: Run tsc and the unit tests**

Run: `npx tsc -p . && npx vitest run`
Expected: tsc errors only in render/UI files (`terrain.js`, `world.js`, `hud.js`, `hints.js`, `screens.js`, `menu.js`) that still import removed constants. Fix those imports minimally so tsc passes (full rendering work is Task 5):
- `terrain.js`, `world.js`, `hud.js`: change the constants import to `import { W, H } from '../world/constants.ts';` and replace each removed constant with its `G.L` field (`WORLD.w` → `G.L.w`, `WORLD.h` → `G.L.h`, `TOWN_X` → `G.L.townX`, `ROOM_X` → `G.L.roomX`, `GATE` → `G.L.gate`, `DOOR` → `G.L.door`, `TORCHES` → `G.L.torches`, `FOUNTAIN` → `G.L.fountain`, `F.trees` → `G.trees`, `F.ponds` → `G.ponds`, `MERCHANT` → `G.L.merchant`). Guard null uses: `if (G.L.fountain) { … }`, `if (G.doorClosed && G.L.door) …`, skip `drawMerchant` and its actor entry when `!G.L.merchant`.
- `hud.js`/`screens.js`: replace `F.name` with `floorLabel(G.floorIdx)` imported from `../world/floor.ts`.
- `hints.js`: replace `G.P.x > TOWN_X` with `G.L.kind !== 'town'` (3 places) and drop the import.
- `screens.js`: replace `FLOORS[s.floorIdx].name` with `floorLabel(s.floorIdx)` and `FLOORS.length` with `FLOOR_COUNT` (import from `../data/run.ts`).
Then rerun. Expected: tsc clean; vitest PASS except `tests/sim.test.ts` (bot still expects the old field; fixed in Task 6) and `tests/save.test.ts` suspend fixtures (Task 4). Note those two in the task report.

- [ ] **Step 10: Propose commit** (covers Tasks 1-2)

`git status`, `git diff --stat`, then propose: `refactor: add per-floor layouts and 20-floor run rules`

---

### Task 3: Rooms: waves, clearing, rewards, doors, and floor-to-floor flow

**Files:**
- Modify: `src/systems/rooms.js`, `src/systems/index.js`, `src/core/events.ts`
- Test: `tests/rooms.test.ts` (create)

**Interfaces:**
- Consumes: `startRoom`, `makeDoors` (Task 2 stub), `rollDoors`, `planWaves`, `rewardValue`, `kindOf`, `stepOf`, `actOf`, `scaled`, `makeMob`, `loadFloor`, `gainXp`, `gainCol`.
- Produces: `updateRoom(dt)`, `updateDoors(): boolean` (true when a door was entered and a new floor loaded), event `roomCleared: void`.

- [ ] **Step 1: Write the failing tests**

Create `tests/rooms.test.ts`:

```ts
// Room flow: waves spawn one after another, a cleared room pays its reward and shows doors, doors move you up a floor.
import { describe, it, expect, beforeEach } from 'vitest';
import { G, startRun, frame } from './harness.ts';
import { loadFloor } from '../src/world/floor.ts';
import { hitWall } from '../src/world/physics.ts';
import { rewardValue } from '../src/data/run.ts';

const frames = (n: number) => { for (let i = 0; i < n; i++) frame(); };
const killAll = () => { for (const m of G.mobs) { m.hp = 0; m.dead = Infinity; } };

describe('a battle room', () => {
  beforeEach(() => { startRun(1); loadFloor(1, { type: 'battle', reward: 'gold' }); });

  it('spawns its first wave shortly after you arrive, away from you and outside walls', () => {
    expect(G.mobs).toHaveLength(0);
    frames(60);
    expect(G.mobs.length).toBeGreaterThan(0);
    for (const m of G.mobs) {
      expect(Math.hypot(m.x - G.P!.x, m.y - G.P!.y)).toBeGreaterThanOrEqual(250);
      expect(hitWall(m)).toBe(false);
      expect(m.aggro).toBe(true);
    }
  });

  it('every wave, then the reward and 3 doors; no doors while mobs live', () => {
    frames(60);
    const waves = G.room!.waves.length;
    for (let w = 0; w < waves; w++) {
      expect(G.doors).toHaveLength(0);
      killAll(); frames(60);
    }
    expect(G.room!.cleared).toBe(true);
    expect(G.P!.col).toBe(rewardValue('gold', 0));
    expect(G.doors).toHaveLength(3);
  });

  it('walking into a door loads the next floor as the room it named', () => {
    frames(60); while (!G.room!.cleared) { killAll(); frames(60); }
    const d = G.doors[1];
    G.P!.x = d.x + d.w / 2; G.P!.y = d.y + d.h / 2; frame();
    expect(G.floorIdx).toBe(2);
    expect(G.room).toMatchObject({ type: d.to!.type, reward: d.to!.reward });
  });
});

describe('fixed exits', () => {
  beforeEach(() => startRun(1));

  it('the town has one door, to a battle room; you arrive at full HP', () => {
    expect(G.L!.kind).toBe('town');
    G.P!.hp = 5; loadFloor(0);
    expect(G.P!.hp).toBe(G.P!.maxHp);
    const d = G.doors[0]; G.P!.x = d.x + 30; G.P!.y = d.y + 55; frame();
    expect(G.floorIdx).toBe(1); expect(G.room!.type).toBe('battle');
  });

  it('rooms do not heal you on arrival', () => {
    G.P!.hp = 5; loadFloor(1, { type: 'battle', reward: 'xp' });
    expect(G.P!.hp).toBe(5);
  });

  it('the last room before the boss has a single door to the boss floor', () => {
    loadFloor(3, { type: 'battle', reward: 'xp' }); frames(60);
    while (!G.room!.cleared) { killAll(); frames(60); }
    expect(G.doors).toHaveLength(1); expect(G.doors[0].to).toBeNull();
    const d = G.doors[0]; G.P!.x = d.x + 30; G.P!.y = d.y + 55; frame();
    expect(G.floorIdx).toBe(4); expect(G.L!.kind).toBe('boss');
  });

  it('a potion reward with full pockets pays Gold instead', () => {
    G.P!.potions = 3; loadFloor(1, { type: 'battle', reward: 'potion' }); frames(60);
    while (!G.room!.cleared) { killAll(); frames(60); }
    expect(G.P!.potions).toBe(3); expect(G.P!.col).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run tests/rooms.test.ts`
Expected: FAIL. No waves spawn (`updateRoom` doesn't exist yet).

- [ ] **Step 3: Implement `src/systems/rooms.js`**

```js
// Rooms: waves, clearing, rewards and the doors to the next floor (round 1: battle rooms).
// A room spawns its waves one by one; when the last one dies it pays the reward its door promised and opens
// the doors for the next floor (see data/run.ts for the door table).
import { G } from '../world/state.ts';
import { planWaves, rollDoors, rewardValue, kindOf, stepOf, actOf, ACT_LEN } from '../data/run.ts';
import { MOBS } from '../data/mobs.ts';
import { SHOP } from '../data/shop.ts';
import { makeMob, scaled, loadFloor } from '../world/floor.ts';
import { hitWall } from '../world/physics.ts';
import { rng } from '../core/rng.ts';
import { emit } from '../core/events.ts';
import { ring } from './fx.js';
import { gainXp, gainCol } from './combat.js';

const WAVE_GAP = 0.8; // seconds between a wave dying and the next one appearing

export function startRoom(i, room) {
  return { ...room, waves: planWaves(G.run?.seed ?? 0, i), wave: -1, next: WAVE_GAP, cleared: false };
}

// Door rects on the right wall, top to bottom; `to` = what the next floor will be (null = the fixed exit)
export function makeDoors(rooms) {
  const ys = rooms.length === 1 ? [400] : rooms.length === 2 ? [260, 540] : [180, 400, 620];
  return rooms.map((to, k) => ({ x: G.L.w - 70, y: ys[k] - 55, w: 60, h: 110, to }));
}

function spawnPoint(r) {
  const { L, P } = G;
  for (let tries = 0; tries < 40; tries++) {
    const p = { x: 80 + rng() * (L.w - 240), y: 80 + rng() * (L.h - 160), r };
    if (Math.hypot(p.x - P.x, p.y - P.y) >= 260 && !hitWall(p)) return p;
  }
  return { x: L.w - 300, y: L.h / 2, r }; // open floor near the door wall, which every preset keeps clear
}

function spawnWave(wave) {
  for (const { id, n } of wave) {
    const M = scaled(MOBS[id]);
    for (let k = 0; k < n; k++) {
      const p = spawnPoint(M.radius), m = makeMob(p.x, p.y, false, M);
      m.aggro = true; G.mobs.push(m); ring(p.x, p.y, 5, 50, 0.4, '255,120,120');
    }
  }
}

function payReward(reward) {
  const { P } = G, act = actOf(G.floorIdx);
  if (reward === 'gold') gainCol(rewardValue('gold', act), P);
  else if (reward === 'xp') gainXp(rewardValue('xp', act));
  else if (reward === 'potion') { if (P.potions < SHOP.potion.max) P.potions++; else gainCol(SHOP.potion.price(), P); }
}

export function updateRoom(dt) {
  const R = G.room;
  if (!R || R.cleared || G.mobs.some(m => m.hp > 0)) return;
  if ((R.next -= dt) > 0) return;
  if (R.wave + 1 < R.waves.length) { R.wave++; spawnWave(R.waves[R.wave]); R.next = WAVE_GAP; return; }
  R.cleared = true;
  payReward(R.reward);
  const i = G.floorIdx, last = stepOf(i) === ACT_LEN - 2; // the room right before the boss
  G.doors = makeDoors(last ? [null] : rollDoors(G.run.seed, i));
  emit('roomCleared');
}

// Walking into a door takes you to the next floor. Returns true when a new floor was loaded this step.
export function updateDoors() {
  const { P } = G;
  for (const d of G.doors) {
    if (P.x > d.x - P.r && P.x < d.x + d.w + P.r && P.y > d.y && P.y < d.y + d.h) {
      const next = G.floorIdx + 1;
      loadFloor(next, kindOf(next) === 'room' ? d.to : null);
      return true;
    }
  }
  return false;
}
```

Note: `rooms.js` ↔ `floor.ts` import each other. That's safe because neither uses the other at module top level, only inside functions. Keep it that way.

- [ ] **Step 4: Wire it into the game step and events**

`src/systems/index.js`:

```js
import { updateRoom, updateDoors } from './rooms.js';
// …
export function updateGame(dt) {
  if (assistOn()) G.run.assisted = true; // the record notes runs that used assist at any point
  if (updatePlayer(dt)) return; // walked through the portal: the new floor starts next step
  if (updateDoors()) return;    // walked through a door: same
  updateRoom(dt);
  updateMobs(dt);
  // (rest unchanged)
}
```

`src/core/events.ts`: add `roomCleared: void;` to `GameEvents`.

- [ ] **Step 5: Run the room tests and the suite**

Run: `npx vitest run tests/rooms.test.ts tests/mechanics.test.ts tests/run.test.ts tests/data.test.ts`
Expected: PASS.

- [ ] **Step 6: Propose commit**

`feat: add room waves, rewards and doors between floors`

---

### Task 4: Save v2: run seed, room, HP; drop old suspends; bestLegacy; import migration

**Files:**
- Modify: `src/core/save.ts`, `src/world/floor.ts` (snapshot/resume)
- Test: `tests/save.test.ts`, `tests/mechanics.test.ts`

**Interfaces:**
- Consumes: `FLOOR_COUNT`, `ROOM_TYPES`, `REWARDS` (run.ts).
- Produces:
  - `SAVE_VERSION = 2`
  - `Suspend` v2 shape: `{ floorIdx, room: Room | null, player: { …, hp?: number }, run: { floor, kills, time, assisted, seed, bosses } }`
  - `meta.bestLegacy: Best | null`
  - `export let legacySuspendDropped: boolean`

- [ ] **Step 1: Write the failing tests**

In `tests/save.test.ts`:
- Change the `suspend` fixture to v2:

```ts
  const suspend = { floorIdx: 7, room: { type: 'battle', reward: 'gold' },
    player: { lv: 7, xp: 40, hp: 150, maxHp: 220, atk: 28, up: { keenEdge: 2 }, pendingUpgrades: 1, skill2: 'vorpal', col: 120, potions: 2, scrolls: 1 },
    run: { floor: 8, kills: 41, time: 300, assisted: false, seed: 12345, bosses: 1 } };
```

- In `'starts from defaults with empty storage'`, expect `meta` to equal `{ best: null, bestLegacy: null, hintsSeen: [], shards: 0, unlocked: ['sonicLeap'], loadout: null, storySeen: [] }`.
- In `'migrates v0 saves…'`, the old record now lands in `bestLegacy`: `expect(s.meta.best).toBeNull(); expect(s.meta.bestLegacy).toMatchObject({ floor: 2, lv: 8, assisted: false });`, and the stored slot check becomes `toMatchObject({ v: s.SAVE_VERSION, data: { best: null, bestLegacy: { floor: 2 } } })`.
- In the test using `floorIdx: 42`, keep the expectation (out of range → null), with the fixture spread.
- Add:

```ts
describe('version 2', () => {
  it('drops a suspended run from the 4-floor version and flags it once; meta keeps shards and moves best to bestLegacy', async () => {
    const oldSuspend = { floorIdx: 1, player: { lv: 7, xp: 40, maxHp: 220, atk: 28, up: {}, pendingUpgrades: 0, skill2: null, col: 0, potions: 0, scrolls: 0 }, run: { floor: 2, kills: 4, time: 30 } };
    const s = await boot({
      'saoy.suspend': JSON.stringify({ v: 1, savedAt: '', data: oldSuspend }),
      'saoy.meta': JSON.stringify({ v: 1, savedAt: '', data: { best: { floor: 3, lv: 9, time: 400, kills: 50, cleared: false }, shards: 70, unlocked: ['sonicLeap', 'horizontal'] } }),
    });
    expect(s.loadSuspend()).toBeNull();
    expect(s.legacySuspendDropped).toBe(true);
    expect(storage.dump()['saoy.suspend']).toBeUndefined();
    expect(storage.dump()['saoy.suspend.bak']).toBeUndefined();
    expect(s.meta.shards).toBe(70);
    expect(s.meta.unlocked).toEqual(['sonicLeap', 'horizontal']);
    expect(s.meta.best).toBeNull();
    expect(s.meta.bestLegacy).toMatchObject({ floor: 3 });
  });

  it('imports a version-1 export file: settings and meta migrate, its suspended run is dropped', async () => {
    const s = await boot();
    const file = JSON.stringify({ game: 'floorbreaker', v: 1, settings: { music: 20 }, meta: { best: { floor: 4, lv: 20, time: 900, kills: 300, cleared: true }, shards: 12 },
      suspend: { floorIdx: 2, player: { lv: 3, xp: 0, maxHp: 120, atk: 14 }, run: { floor: 3, kills: 1, time: 10 } } });
    expect(s.importSave(file)).toEqual({ ok: true });
    expect(s.settings.music).toBe(20);
    expect(s.meta.bestLegacy).toMatchObject({ cleared: true });
    expect(s.loadSuspend()).toBeNull();
  });
});
```

In `tests/mechanics.test.ts` add to `describe('assist mode and suspend')`:

```ts
  it('resume keeps the room, its seed and the HP you left with', async () => {
    const { snapshotRun, resumeRun } = await import('../src/world/floor.ts');
    quietField(); G.P!.hp = 40;
    const snap = snapshotRun(), seed = G.run!.seed;
    startRun(2); resumeRun(snap);
    expect(G.floorIdx).toBe(1); expect(G.room!.reward).toBe('gold');
    expect(G.run!.seed).toBe(seed); expect(G.P!.hp).toBe(40);
  });
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run tests/save.test.ts tests/mechanics.test.ts`
Expected: FAIL (`bestLegacy`, `legacySuspendDropped`, v2 schema missing).

- [ ] **Step 3: Implement v2 in `src/core/save.ts`**

- `import { FLOOR_COUNT, ROOM_TYPES, REWARDS } from '../data/run.ts';` (replace the `FLOORS` import).
- `export const SAVE_VERSION = 2;`
- Make migrations slot-aware, with `null` meaning "drop this slot":

```ts
// MIGRATIONS[n] turns version-n data into version n+1 for a slot; null drops the slot.
// v0 = before envelopes existed (raw objects). v1 -> v2: the run grew from 4 to 20 floors, so a suspended
// 4-floor run can't continue, and the old best record is kept aside as bestLegacy.
const MIGRATIONS: Record<number, (data: any, slot: string) => any> = {
  0: data => data,
  1: (data, slot) => slot === 'suspend' ? null
    : slot === 'meta' ? { ...data, bestLegacy: data.best ?? null, best: null } : data,
};
export let legacySuspendDropped = false;
function migrate(data: unknown, from: number, slot: string) {
  for (let v = from; v < SAVE_VERSION && data != null; v++) data = MIGRATIONS[v](data, slot);
  return data;
}
```

- In `load()`, replace the migration loop with:

```ts
  const data = migrate(env.data, env.v, slot);
  if (data == null) { raw.del(slot); raw.del(slot + '.bak'); if (slot === 'suspend') legacySuspendDropped = true; return null; }
  const result = schema.safeParse(data);
```

- `MetaSchema`: add `bestLegacy: BestSchema.nullable().default(null),` after `best`.
- `SuspendSchema`:

```ts
const SuspendSchema = z.object({
  floorIdx: z.number().int().min(0).max(FLOOR_COUNT - 1),
  room: z.object({ type: z.enum(ROOM_TYPES), reward: z.enum(REWARDS).nullable() }).nullable().default(null),
  player: z.object({ lv: z.number().int().min(1), xp: z.number().min(0), hp: z.number().positive().optional(), maxHp: z.number().positive(), atk: z.number().positive(),
    up: z.record(z.string(), z.number().int().min(0)).default({}), pendingUpgrades: z.number().int().min(0).default(0),
    skill2: z.string().nullable().default(null),
    col: z.number().int().min(0).default(0), potions: z.number().int().min(0).default(0), scrolls: z.number().int().min(0).default(0) }),
  run: z.object({ floor: z.number().int().min(1), kills: z.number().int().min(0), time: z.number().min(0), assisted: z.boolean().default(false),
    seed: z.number().int(), bosses: z.number().int().min(0).default(0) }),
});
```

- Import goes through the same migrations:

```ts
const ExportSchema = z.object({
  game: z.enum(['floorbreaker', 'sword-art-on-you']), // the old name: files exported before the rename still import
  v: z.number().int().min(0).max(SAVE_VERSION),
  settings: z.unknown(), meta: z.unknown(), suspend: z.unknown().nullable(),
});
export function importSave(text: string): { ok: true } | { ok: false; error: { th: string; en: string } } {
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { return { ok: false, error: { th: 'ไฟล์ไม่ใช่ JSON', en: 'The file is not JSON' } }; }
  const bad = { ok: false as const, error: { th: 'ไฟล์ไม่ใช่เซฟของ Floorbreaker หรือข้อมูลเสียหาย', en: 'Not a Floorbreaker save, or the data is damaged' } };
  const r = ExportSchema.safeParse(parsed);
  if (!r.success) return bad;
  const st = SettingsSchema.safeParse(migrate(r.data.settings, r.data.v, 'settings'));
  const me = MetaSchema.safeParse(migrate(r.data.meta, r.data.v, 'meta'));
  const suRaw = r.data.suspend == null ? null : migrate(r.data.suspend, r.data.v, 'suspend');
  const su = suRaw == null ? null : SuspendSchema.safeParse(suRaw);
  if (!st.success || !me.success || (su && !su.success)) return bad;
  Object.assign(settings, st.data); saveSettings();
  Object.assign(meta, me.data); saveMeta();
  if (su?.success) writeSuspend(su.data); else clearSuspend();
  return { ok: true };
}
```

- [ ] **Step 4: Snapshot and resume v2 in `src/world/floor.ts`**

```ts
// Suspend save: the character, run progress and the room you were in. Resuming restarts that floor from its
// start (waves and doors re-roll identically from the run seed); mid-fight state isn't stored.
export function snapshotRun(): Suspend {
  const { P, run } = G;
  return { floorIdx: G.floorIdx, room: G.room ? { type: G.room.type, reward: G.room.reward } : null,
    player: { lv: P!.lv, xp: P!.xp, hp: P!.hp, maxHp: P!.maxHp, atk: P!.atk, up: { ...P!.up }, pendingUpgrades: P!.pendingUpgrades,
      skill2: P!.skills[1], col: P!.col, potions: P!.potions, scrolls: P!.scrolls },
    run: { floor: run!.floor, kills: run!.kills, time: run!.time, assisted: !!run!.assisted, seed: run!.seed, bosses: run!.bosses } };
}
export function resumeRun(s: Suspend) {
  newPlayer(); const { skill2, hp, ...player } = s.player;
  Object.assign(G.P!, player, { up: { ...s.player.up }, skills: ['sonicLeap', slot2(skill2)] });
  G.run = { ...s.run };
  loadFloor(s.floorIdx, s.room);
  if (hp !== undefined) G.P!.hp = G.P!.lag = Math.min(hp, G.P!.maxHp); // towns heal on load anyway
}
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run tests/save.test.ts tests/mechanics.test.ts`
Expected: PASS.

- [ ] **Step 6: Propose commit**

`feat: save version 2 for the 20-floor run`

---

### Task 5: Painting, HUD, text and story for 20 floors

**Files:**
- Modify: `src/render/terrain.js`, `src/render/world.js`, `src/render/hud.js`, `src/render/menu.js`, `src/ui/screens.js`, `src/systems/hints.js`, `src/scenes/index.js`, `src/audio/audio.js`, `src/data/story.ts`, `index.html`
- Test: `e2e/smoke.spec.ts` (unchanged, must still pass); manual check in the browser pane

**Interfaces:**
- Consumes: `G.L`, `G.doors`, `G.trees`, `G.ponds`, `floorLabel`, `actOf`, `kindOf`, `FLOOR_COUNT`, `legacySuspendDropped`, `meta.bestLegacy`.
- Produces: nothing new for later tasks.

- [ ] **Step 1: Terrain per layout (`src/render/terrain.js`)**

Replace `paintFloor` with:

```js
function paintFloor() {
  const { F, L } = G;
  bg.width = L.w; bg.height = L.h; // resizing also clears it
  const g = bg.getContext('2d');
  g.imageSmoothingEnabled = false;
  fill(g, L.kind === 'town' ? 'town' : `ground-${F.ground}`, 0, 0, L.w, L.h);
  const placed = [...G.WALLS, ...G.doors, ...(L.door ? [L.door] : [])];
  const scatter = (names, count, gap) => { // dirt patches and small decorations that don't touch each other or walls
    for (let tries = 0, n = 0; n < count && tries < count * 25; tries++) {
      const img = IMG[pick(names)], p = { x: rand(20, Math.min(L.roomX, L.w) - img.width - 20), y: rand(0, L.h - img.height), w: img.width, h: img.height };
      if (placed.some(q => overlaps(p, q, gap))) continue;
      placed.push(p); n++;
      g.drawImage(img, p.x, p.y);
    }
  };
  if (L.kind !== 'town') { scatter(PATCHES, 4, 48); scatter(DECO, 22, 6); }
  for (let i = 0; i < 30; i++) { // soft light and shade so the repeating ground doesn't look flat
    const x = Math.random() * L.w, y = Math.random() * L.h, r = 60 + Math.random() * 160;
    const rg = g.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, Math.random() < 0.5 ? 'rgba(255,255,200,.08)' : 'rgba(0,30,0,.12)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rg; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  if (L.kind === 'boss') {
    fill(g, 'bossroom', L.roomX, 0, L.w - L.roomX, L.h);
    if (F.roomTint) { g.fillStyle = F.roomTint; g.fillRect(L.roomX, 0, L.w - L.roomX, L.h); }
  }
  if (L.fountain) {
    const fn = IMG.fountain, f = L.fountain;
    g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(f.x + 5, f.y + 30, fn.width * 0.5, fn.width * 0.22, 0, 0, 7); g.fill();
    g.drawImage(fn, f.x - fn.width / 2, f.y - fn.height * 0.55);
  }
  for (const p of G.ponds) { // stone rim, then water
    g.fillStyle = '#7d8798'; g.beginPath(); g.roundRect(p.x - 6, p.y - 6, p.w + 12, p.h + 12, 26); g.fill();
    g.save(); g.beginPath(); g.roundRect(p.x, p.y, p.w, p.h, 20); g.clip(); fill(g, 'water', p.x, p.y, p.w, p.h);
    g.fillStyle = 'rgba(0,20,60,.18)'; g.fillRect(p.x, p.y + p.h * 0.6, p.w, p.h * 0.4); g.restore();
  }
  for (const w of L.gate) {
    fill(g, 'wall', w.x, w.y, w.w, w.h);
    g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(w.x, w.y, w.w, w.h);
    g.fillStyle = 'rgba(255,255,255,.15)'; g.fillRect(w.x, w.y, 4, w.h);
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(w.x + w.w, w.y, 8, w.h);
  }
  for (const [x, y, k] of G.trees) {
    const img = IMG[TREE_TYPES[k].img];
    g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(x + img.width / 2, y + img.height - 8, img.width * 0.4, 12, 0, 0, 7); g.fill();
    g.drawImage(img, x, y);
  }
  g.font = 'bold 22px system-ui'; g.textAlign = 'center'; g.fillStyle = 'rgba(255,255,255,.3)';
  if (L.kind === 'town') g.fillText(F.town, L.w / 2, 80);
  if (L.kind === 'boss') g.fillText('Boss Room', (L.roomX + L.w) / 2 + 20, 160);
}
```

Also replace `bg.width = WORLD.w; bg.height = WORLD.h;` at the top with `bg.width = W; bg.height = H;` (it is resized per floor) and remove `ROAD_Y`.

- [ ] **Step 2: Doors, torches, fog, camera, merchant (`src/render/world.js`)**

Add a door painter and call it in `drawWorld` right after `drawPortal();`:

```js
// Room doors: a stone arch on the right wall, glowing in the colour of what's behind it, with a sign over it
const DOOR_LOOK = {
  gold: ['#ffd35a', { th: 'Gold', en: 'Gold' }], xp: ['#5fc3ff', { th: 'XP', en: 'XP' }], potion: ['#7dff8a', { th: 'Potion', en: 'Potion' }],
};
function doorLook(d) {
  const i = G.floorIdx + 1;
  if (!d.to) return kindOf(i) === 'boss' ? ['#ff6b5f', { th: 'บอส', en: 'Boss' }] : ['#f4ecd8', { th: 'ไปต่อ', en: 'Onward' }];
  return DOOR_LOOK[d.to.reward] ?? ['#f4ecd8', { th: 'ห้องถัดไป', en: 'Next room' }];
}
function drawDoors() {
  for (const d of G.doors) {
    const [col, name] = doorLook(d), glow = 0.55 + 0.2 * Math.sin(G.time * 3 + d.y);
    ctx.save();
    ctx.fillStyle = '#3a3d4a'; ctx.fillRect(d.x - 8, d.y - 10, d.w + 16, d.h + 10);             // stone frame
    ctx.fillStyle = '#0c0d12'; ctx.fillRect(d.x, d.y, d.w, d.h);                                 // opening
    ctx.globalAlpha = glow; ctx.fillStyle = col; ctx.fillRect(d.x + 6, d.y + 6, d.w - 12, d.h - 6); // light inside
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center'; ctx.font = `800 15px ${FN}`; ctx.lineJoin = 'round'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.85)';
    ctx.strokeText(t(name), d.x + d.w / 2, d.y - 18); ctx.fillStyle = col; ctx.fillText(t(name), d.x + d.w / 2, d.y - 18);
    ctx.restore();
  }
}
```

Imports to add: `import { kindOf } from '../data/run.ts';`, `t` from `../core/i18n.ts` (next to `tr`), `FN` from `./canvas.js` if not already imported.

Other edits in `world.js`:
- `drawTorches`: loop over `G.L.torches` (empty off boss floors).
- `drawDoor`: `const D = G.L.door; if (!G.doorClosed || !D) return;` and use `D` for `DOOR`.
- `drawFog`: clip to `ctx.rect(0, 0, Math.min(G.L.roomX, G.L.w), G.L.h)`, start the x loop at `-fw + ox` and end at `G.L.w`, and loop y to `G.L.h`. Only call it when `G.F.fog && G.L.kind !== 'town'`.
- Camera: `cam.x = clamp(P.x - W / 2, 0, G.L.w - W); cam.y = clamp(P.y - H / 2, 0, G.L.h - H);`
- `drawMerchant`: `const m = G.L.merchant; if (!m) return; const { x, y } = m;`. Actor list: push `{ y: G.L.merchant.y, draw: drawMerchant }` only when `G.L.merchant`.

- [ ] **Step 3: HUD floor counter and minimap (`src/render/hud.js`)**

- Import `floorLabel` from `../world/floor.ts`.
- Replace the zone lines in `drawPlayerPanel` with:

```js
  const L = G.L, where = L.kind === 'town' ? ['SAFE ZONE · ' + tr('HP ฟื้นฟู', 'HP regen'), '#9fe89f'] : L.kind === 'boss' ? ['BOSS', '#ff8a7a'] : ['', '#cfd8e6'];
  ctx.textAlign = 'left'; label([floorLabel(G.floorIdx), F.town, where[0]].filter(Boolean).join(' · '), 22, 92, where[1], `600 13px ${FT}`);
```

- Minimap: size it per floor and drop the road:

```js
const mm = document.createElement('canvas'), MM = 0.1;
function paintMinimap() {
  const L = G.L; mm.width = L.w * MM; mm.height = L.h * MM;
  const g = mm.getContext('2d');
  g.fillStyle = L.kind === 'town' ? '#c9a56e' : ['#7fa846', '#4f8f3d', '#3c5b47', '#3f7f9a'][actOf(G.floorIdx)]; g.fillRect(0, 0, mm.width, mm.height);
  if (L.kind === 'boss') { g.fillStyle = '#4a3a44'; g.fillRect(L.roomX * MM, 0, (L.w - L.roomX) * MM, mm.height); }
  g.fillStyle = '#1f2a22'; for (const w of G.WALLS) g.fillRect(w.x * MM, w.y * MM, Math.max(2, w.w * MM), Math.max(2, w.h * MM));
  g.fillStyle = '#3d8fd0'; for (const p of G.ponds) g.fillRect(p.x * MM, p.y * MM, p.w * MM, p.h * MM);
}
```

  In `drawMinimap`: use `G.L.door` instead of `DOOR` (guard null), draw doors as `ctx.fillStyle = '#f4ecd8'; for (const d of G.doors) ctx.fillRect(x + d.x * MM, y + d.y * MM, 4, d.h * MM);`, and set the caption to `` `${floorLabel(G.floorIdx)} · ${F.town}` ``. Import `actOf` from `../data/run.ts`.

- [ ] **Step 4: Title art, screens, hints, story, music**

`src/render/menu.js`: import `actOf` from `../data/run.ts`, and set `reached` with:

```js
  reached = Math.max(1, b ? (b.cleared ? FLOORS.length : actOf(b.floor - 1) + 1) : 1, s ? actOf(s.floorIdx) + 1 : 1);
```

`src/ui/screens.js` (imports: `floorLabel` from `../world/floor.ts`; `FLOOR_COUNT` from `../data/run.ts`; `legacySuspendDropped` from `../core/save.ts`):
- `renderTitle` record line:

```js
  const b = meta.best, old = meta.bestLegacy;
  $('record').textContent = [
    legacySuspendDropped ? tr('เซฟพักจากเวอร์ชันเก่าเล่นต่อไม่ได้แล้ว', "Your old saved run can't continue in this version.") : '',
    b ? tr('ดีที่สุด: ', 'Best: ') + `${b.cleared ? tr(`ผ่านครบ ${FLOOR_COUNT} ชั้น`, `all ${FLOOR_COUNT} floors`) : floorLabel(b.floor - 1)} · Lv.${b.lv} · ${fmtTime(b.time)}${b.assisted ? ' · assist' : ''}` : '',
    old ? tr(`เวอร์ชันเก่า: ชั้น ${old.floor}/4`, `Old version: floor ${old.floor}/4`) : '',
  ].filter(Boolean).join(' · ');
```

- Continue info: `` `${floorLabel(s.floorIdx)} · Lv.${s.player.lv} · ${fmtTime(s.run.time)}` ``.
- `endRun`: title `cleared ? tr(`ผ่านชั้น ${FLOOR_COUNT} แล้ว`, `FLOOR ${FLOOR_COUNT} CLEARED`) : tr('ตัวละครถูกลบ', 'CHARACTER DELETED')`; clear message uses `FLOOR_COUNT + 1`; death message `` tr(`ตายที่${floorLabel(G.floorIdx)} ตอน Lv.${P.lv} ตัวละครนี้ถูกลบแล้ว`, `Died on ${floorLabel(G.floorIdx)} at Lv.${P.lv}. This character has been deleted.`) ``.
- `on('floorLoaded', …)` toast:

```js
on('floorLoaded', i => {
  const k = G.L.kind, sub = k === 'boss' ? tr('บอส: ', 'Boss: ') + G.F.boss.name
    : k === 'town' ? tr('ฟื้น HP เต็มแล้ว พ่อค้าอยู่ข้างน้ำพุ', 'Fully healed. The merchant is by the fountain.')
    : tr('เคลียร์ห้องเพื่อเปิดประตู', 'Clear the room to open the doors');
  toast(`${floorLabel(i)} · ${G.F.town}`, sub);
});
```

`src/systems/hints.js`: replace the `heal` and `shop` hints and add a `doors` hint (keep the rest):

```js
  { id: 'heal', when: () => G.L.kind !== 'town' && G.P.hp < G.P.maxHp * 0.4, title: () => tr('HP ต่ำ', 'Low HP'),
    sub: () => tr(`กด ${k('potion')} เพื่อดื่ม Potion ส่วนเมืองขององก์ถัดไปจะฟื้น HP ให้เต็ม`, `Press ${k('potion')} to drink a Potion. The next act's town heals you fully.`) },
  { id: 'shop', when: () => G.L.kind === 'town' && G.P.col >= 40, title: () => tr('มี Gold แล้ว', "You've got Gold"),
    sub: () => tr(`พ่อค้าอยู่ข้างน้ำพุ กด ${k('interact')} เพื่อซื้อ Potion แล้วกด ${k('potion')} เพื่อดื่ม`, `The merchant is by the fountain. ${k('interact')} to buy Potions, ${k('potion')} to drink one.`) },
  { id: 'doors', when: () => G.doors.length > 1, title: () => tr('เลือกทาง', 'Pick a door'),
    sub: () => tr('ป้ายเหนือประตูบอกว่าห้องถัดไปให้อะไร เดินเข้าประตูที่อยากไป', 'The sign over each door shows what the next room gives. Walk through the one you want.') },
```

`src/scenes/index.js`: story plays at each act's town:

```js
on('floorLoaded', i => {
  if (kindOf(i) !== 'town') return;
  const id = 'floor' + actOf(i);
  if (STORY[id] && !meta.storySeen.includes(id)) storyQueue.push(id);
});
```

(import `kindOf, actOf` from `../data/run.ts`).

`src/audio/audio.js`: `on('floorLoaded', i => playMusic(actOf(i)));` (import `actOf`).

`src/data/story.ts` edits (keep everything else):
- floor0 last line → `{ th: 'เมืองนี้ชื่อ Firstlight สินะ ออกไม่ได้ก็ต้องปีนขึ้นไป บอสตัวแรกรออยู่ที่ชั้น 5', en: "So this is Firstlight. If I can't log out, I climb. The first boss waits on floor 5." }`
- floor1 first line → `{ th: 'ปลดล็อกชั้น 6: Hornfield', en: 'Floor 6 unlocked: Hornfield.' }`
- floor2 first line → `{ th: 'ปลดล็อกชั้น 11: Mistwell', en: 'Floor 11 unlocked: Mistwell.' }`
- floor3 first line → `{ th: 'ปลดล็อกชั้น 16: Canalis', en: 'Floor 16 unlocked: Canalis.' }`
- ending lines 1-2 → `{ th: 'ผ่านชั้น 20 แล้ว ประตูชั้น 21 ยังปิดอยู่', en: 'Floor 20 cleared. The gate to floor 21 is still sealed.' }` and `{ th: 'ยี่สิบชั้นแล้ว เหลืออีก 80', en: 'Twenty floors down. Eighty to go.' }`

`index.html` how-to tips: add one item after the first tip:

```html
      <li data-en="Clearing a room opens doors. The sign over each door shows what the next room gives.">เคลียร์ห้องแล้วจะมีประตูให้เลือก ป้ายเหนือประตูบอกว่าห้องถัดไปให้อะไร</li>
```

- [ ] **Step 5: Check it in the browser**

Run `npx tsc -p . && npx playwright test e2e/smoke.spec.ts`, expected PASS. Then open the dev server in the browser pane: Dive In, check the town (fountain, merchant, one "Onward" door), walk through, clear the room's waves, see 3 doors with signs, pick one, check the floor counter reads "Floor 3/20". Take screenshots of the town, a room with doors, and a boss floor (`__saoy.loadFloor(4)`).

- [ ] **Step 6: Propose commit**

`feat: paint towns, rooms and boss floors with doors and a floor counter`

---

### Task 6: Bots, balance and full-loop tests for 20 floors

**Files:**
- Modify: `tests/harness.ts`, `tests/sim.test.ts`, `e2e/loop.spec.ts`, `e2e/playthrough.bot.ts`, and the tuning values in `src/data/run.ts` / `src/data/player.ts` as needed
- Test: the files above

**Interfaces:**
- Consumes: `G.L`, `G.doors`, `G.room`, `buy`, `drinkPotion`.
- Produces: `createBot()` (no level goals), `playRun(seed, maxSeconds = 3600)`.

- [ ] **Step 1: Rewrite the headless bot (`tests/harness.ts`)**

Replace `createBot` and `playRun` with:

```ts
// A scripted player for the 20-floor run: buys Potions in town, clears rooms (stepping out of telegraphs),
// takes the first door, and fights bosses the way the old bot did.
export function createBot() {
  let last = { x: 0, y: 0 }, stuck = 0, detour = 0, side = 1;
  const walkTo = (tx: number, ty: number) => {
    const P = G.P!;
    if (detour > 0) { detour--; [tx, ty] = [P.x - (ty - P.y) * side, P.y + (tx - P.x) * side]; }
    else if (Math.hypot(P.x - last.x, P.y - last.y) < 0.5 && Math.hypot(tx - P.x, ty - P.y) > 30) {
      if (++stuck > 60) { stuck = 0; detour = 40; side = -side; }
    } else stuck = 0;
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
    if (dist(P, tg) < tg.r + 50) { attack(); if (P.skillCd[0] <= 0) skill(); }
  };
  return function think() {
    const { P, boss, mobs, L } = G as Required<typeof G>;
    if (P.hp < P.maxHp * 0.35 && P.potions > 0) drinkPotion();
    if (G.portal) return G.portal.armed ? walkTo(G.portal.x, G.portal.y) : away(G.portal);
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
    else { walkTo(boss.x, boss.y); if (dist(P, boss) < boss.r + 50) { attack(); if (P.skillCd[0] <= 0) skill(); } }
  };
}

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
```

Add imports: `buy, drinkPotion` from `../src/systems/shop.js`. Remove `TOWN_X`, `ROOM_X`, `WORLD`. In `violations()`, skip the boss when `G.boss.hp <= 0`: `for (const e of [G.P!, ...(G.boss!.hp > 0 ? [G.boss!] : []), ...G.mobs.filter(m => m.hp > 0)])`. Also flag `if (G.P!.x < 0 || G.P!.x > G.L!.w || G.P!.y < 0 || G.P!.y > G.L!.h) out.push('player outside the floor');`.

- [ ] **Step 2: Update the sim tests (`tests/sim.test.ts`)**

- `const runs = [1, 2, 3, 4, 5].map(seed => ({ seed, ...playRun(seed) }));`
- Balance guard:

```ts
  it('the game is beatable and most runs reach the first boss', () => {
    // Balance guard: if a change makes this fail, the game got much harder (or broke a floor transition)
    expect(runs.some(r => r.over === 'win'), JSON.stringify(runs)).toBe(true);
    expect(runs.filter(r => r.floor >= 5).length, JSON.stringify(runs)).toBeGreaterThanOrEqual(3);
  });
```

- `createBot([5, 10, 15])` → `createBot()` in the determinism test.

- [ ] **Step 3: Run the sims and tune**

Run: `npx vitest run tests/sim.test.ts`
Expected: violations and timeouts empty. If the balance guard fails, tune in this order and rerun until it passes (record the final values in the commit report):
1. `planWaves` wave size `3 + step + w` → `2 + step + w`.
2. `mobScale` step `0.08` → `0.06` (the spec allows tuning; note the value in the report).
3. `rewardValue('xp', …)` `120 + 80 * act` → `160 + 100 * act`.
4. `PLAYER.xpToNext` `lv * 50` → `lv * 40`.

Then run 20 seeds once (a temporary test file, deleted afterwards, like the soak in the earlier playtest) and report the win rate and the floor reached on deaths.

- [ ] **Step 4: Rewrite the full-loop browser test (`e2e/loop.spec.ts`)**

Replace `takePortal` and the clear loop with floor-by-floor helpers:

```ts
// Finish whatever floor we're on: towns and cleared rooms -> first door, rooms -> kill each wave, boss -> kill + portal
async function finishFloor(page: Page) {
  const from = await hook(page, 's.floorIdx') as number;
  await settle(page);
  const kind = await hook(page, 's.L.kind');
  if (kind === 'boss') {
    await hook(page, 's.P.x = s.boss.x - 160, s.P.y = s.boss.y, s.boss.awake = true, s.hurtEnemy(s.boss, s.boss.hp + 1, true)');
    if (from === 19) return;
    await until(page, '!!s.portal');
    await hook(page, 's.P.x = s.portal.x - 120, s.P.y = s.portal.y');
    await until(page, 's.portal.armed && s.portal.wait <= 0');
    await hook(page, 's.P.x = s.portal.x, s.P.y = s.portal.y');
  } else {
    if (kind === 'room') await until(page, '(s.mobs.forEach(m => m.hp > 0 && s.hurtEnemy(m, m.hp + 1, true)), s.doors.length > 0)', 30_000);
    await hook(page, 's.P.x = s.doors[0].x + 30, s.P.y = s.doors[0].y + 55');
  }
  await until(page, `s.floorIdx === ${from + 1}`);
}
```

- Clear loop: `for (let f = 0; f < 20; f++) await finishFloor(page);` then the existing ending/result/title checks. Keep the shop step at the start (the town now has the merchant at `s.L.merchant`; use `s.P.x = s.L.merchant.x, s.P.y = s.L.merchant.y + 30`). Raise `test.setTimeout` to `180_000`.
- Suspend loop: replace the floor-1 boss with `await finishFloor(page); await finishFloor(page);` (town → room 1 → room 2), so the saved floor is 2; expect `s.floorIdx` to be `2` after Continue.
- Death loop and the language tests: unchanged.

- [ ] **Step 5: Rewrite the in-page bot (`e2e/playthrough.bot.ts`)**

In the `BOT` string, replace `think()` with the same decision order as the headless bot, using key events:
1. overlays (unchanged)
2. potion when low (`tap('KeyQ')`)
3. portal
4. town shopping: walk to `s.L.merchant`, `tap('KeyE')`; the overlay handler buys
5. doors: walk to `s.doors[0]`
6. room: fight the nearest live mob (`tap('KeyJ')`, `tap('KeyK')`)
7. boss: the existing boss branch with `C.ROOM_X` → `s.L.roomX` and `600` → `s.L.h / 2`

Remove `goals`, `phase`, `shopped`, and the `C.TOWN_X` filter. Change the floor note to `note('reached floor ' + (s.floorIdx + 1) + ' (' + s.L.kind + ')')`. Raise the poll timeout to `1_200_000` and `test.describe.configure({ timeout: 1_500_000 })`.

- [ ] **Step 6: Run everything**

Run: `npm run check`
Expected: PASS (tsc, all unit tests, 6 browser tests).
Run: `npx playwright test --config e2e/capture.config.ts e2e/playthrough.bot.ts`
Expected: both runs end with a win or a death on a floor ≥ 5, and `errors: []`.

- [ ] **Step 7: Propose commit**

`test: play the 20-floor run with bots and full-loop tests`

---

## Self-review notes

- Spec coverage for round 1: act/floor structure (Task 1), sizes and `G.bounds` as `G.L` (Task 2), battle rooms, waves, rewards, door table (Tasks 1, 3), boss floors with the portal to the next town (Tasks 2, 3), save v2 with seed, room, HP, legacy drop, bestLegacy and import (Task 4), floor counter, minimap, doors, toasts, story and music by act (Task 5), sims and full-loop tests (Task 6).
- Deferred to later rounds by the spec: elite/spring/shop/shrine/challenge rooms (`AVAILABLE_ROOMS` grows), Blade Art build, boss arena mechanics, the boss intro card.
- Names used across tasks: `G.L`, `layoutFor`, `fountainHit`, `loadFloor(i, room)`, `floorLabel`, `scaled`, `startRoom`, `makeDoors`, `updateRoom`, `updateDoors`, `rollDoors`, `planWaves`, `pickPreset`, `rewardValue`, `shardsFor`, `legacySuspendDropped`, `bestLegacy`, `enterRoom`, `enterBoss`.
