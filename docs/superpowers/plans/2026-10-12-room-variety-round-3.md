# Room Variety, Round 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the doors between rooms a real choice: elites get one modifier, and four new room types arrive: spring, challenge, wandering shop and shrine.

**Architecture:** Room rules and data stay in `src/data/run.ts` (elite modifiers, shrine offers). Room behaviour stays in `src/systems/rooms.js`. Each room type branches inside `startRoom` / `updateRoom`. The wandering shop reuses the town shop scene with one extra item. The element-mod purchase and the shrine's mod reward reuse the build pick scene through a new `G.rewards` kind, `'mod'`. The shrine gets its own small scene and window. New run state (`run.curse`, `P.modBuys`) is added with Zod defaults, so the save version doesn't change.

**Tech Stack:** Vanilla JS + TypeScript (checked JS), Vite, Zod, Vitest, Playwright (local Chrome).

**Spec:** `docs/superpowers/specs/2026-10-09-twenty-floor-run-design.md` (sections ประเภทห้อง, คุณสมบัติของ elite, ข้อเสนอของศาลเจ้า, กฎสร้างประตู; round 3 = "ห้องหลากหลาย"). Rewards from these rooms follow `docs/superpowers/specs/2026-10-09-in-run-progression-design.md` (ร้านเร่ sells a chosen mod starting at 90 Gold, rising each purchase).

## Global Constraints

- Room types after this round: battle, elite, spring, shop, shrine, challenge. Door weights (unchanged): battle 35, elite 20, shop 15, shrine 12, challenge 10, spring 8. The pre-boss door set must include a spring or shop, and an elite when none was offered earlier in the act (`rollDoors` already enforces both once the types are available).
- Elite modifiers, one per elite, chosen from the run seed:
  - shield: guard up, use the existing guard-break system, regen 3 s
  - fast: +40% speed
  - split: on death splits into 2 small copies, each 30% of the elite's max HP
  - regen: heals 3% of max HP per second after 2 s without being hit
  - Elites keep ×4 HP and ×1.5 damage.
- Spring: no fight. Walking up to the fountain heals 50% of max HP once. Doors are open from the start.
- Wandering shop: no fight. A merchant sells Potion, Skill Scroll and an element mod you choose (pick the element, then the Art). The mod price is 90 Gold, +40 per mod bought this run. It is only offered while at least one Art can take a mod. Doors are open from the start.
- Shrine: no fight. The player takes 1 of 2 offers (seeded), or walks past. Offers:
  - lose 15% max HP → an element mod you choose
  - pay 120 Gold → evolve an Art of your choice
  - a curse (enemies +25% for the next 2 floors that have enemies) → 150 Gold + 1 Potion
  - lose 1 Potion → full heal + 10 max HP
  - An offer the player can't pay for, or that would have no effect, is shown disabled.
- Challenge: survive 30 s of waves while taking at most 3 hits → the door's reward ×2. More than 3 hits → no reward, but the doors still open. Remaining enemies vanish when the timer ends. The HUD shows the timer and hits.
- All gameplay randomness uses the seeded rng (`rng()`) or `makeRng(seed…)`. "Is X available?" checks never draw rng.
- Every player-facing string is a TH/EN pair (`tr` / `Text`), plain voice, no " · " joining sentences, no em dashes in sentences. Game nouns stay English (Elite, Gold, Potion, Skill Scroll, Blade Art, Art and element names).
- **Commits:** the user commits (global CLAUDE.md). "Propose commit" = run `git status` and `git diff --stat`, and report the message. Never run `git commit`.
- `npm run check` must pass at the end of every task.

## File Structure

| File | Responsibility |
|---|---|
| `src/data/run.ts` | `ELITE_MODS`, `planElite` picks a modifier, `SHRINE` offers + `rollShrine`, `AVAILABLE_ROOMS` grows per task, room constants |
| `src/systems/rooms.js` | elite modifier spawn, spring heal, challenge timer/hits/double reward, shop/shrine room setup, curse flag |
| `src/systems/combat.js` | split on elite death; `sinceHit` reset for regen |
| `src/systems/mobs.js` | regen tick |
| `src/systems/build.js` | `'mod'` reward: element cards → Art follow-up; generic empty-pick skip |
| `src/systems/shop.js`, `src/data/shop.ts` | `mod` item, `shopItems()`, `P.modBuys` |
| `src/systems/shrine.js` (create) | shrine offers: availability + apply |
| `src/scenes/index.js`, `src/ui/screens.js`, `index.html`, `src/main.js` | shrine scene/window, interact routing, picker headers for mod picks, room toasts |
| `src/render/world.js`, `src/render/hud.js` | door looks per type, shrine altar, elite modifier label, challenge HUD, cursed label |
| `src/world/floor.ts`, `src/world/state.ts`, `src/core/save.ts` | `G.cursed`, `run.curse`, `P.modBuys`, layout points for spring/shop/shrine |
| `tests/*`, `e2e/*` | see each task |

---

### Task 1: Elite modifiers

**Files:**
- Modify: `src/data/run.ts`, `src/systems/rooms.js`, `src/systems/combat.js`, `src/systems/mobs.js`, `src/world/state.ts`, `src/render/world.js`
- Test: `tests/rooms.test.ts`, `tests/run.test.ts`

**Interfaces:**
- Produces: `ELITE_MODS = ['shield', 'fast', 'split', 'regen'] as const`, `type EliteMod`, `ELITE_MOD_NAME: Record<EliteMod, Text>`, `ELITE_RULES = { fast: 1.4, splitHp: 0.3, splitScale: 0.75, regen: 0.03, regenDelay: 2, shieldRegen: 3 }`; `WaveMob.mod?: EliteMod`; `Mob.mod?: EliteMod`, `Mob.sinceHit?: number`.

- [ ] **Step 1: Write the failing tests**

`tests/run.test.ts`, add:

```ts
  it('each elite gets one modifier from the seed; every modifier shows up across seeds', () => {
    const seen = new Set<string>();
    for (let s = 1; s < 80; s++) {
      const e = planElite(s, 2)[0].find(m => m.elite)!;
      expect(ELITE_MODS).toContain(e.mod);
      expect(planElite(s, 2)[0].find(m => m.elite)!.mod).toBe(e.mod); // deterministic
      seen.add(e.mod!);
    }
    expect([...seen].sort()).toEqual([...ELITE_MODS].sort());
  });
```

  (import `ELITE_MODS`). Update the existing `'an elite room is one wave…'` test: the elite entry now also carries `mod`, so compare with `toMatchObject({ id: 'frenzyBoar', n: 1, elite: true })`.

`tests/rooms.test.ts`, add:

```ts
describe('elite modifiers', () => {
  const spawnElite = (mod: string) => {
    startRun(1); loadFloor(2, { type: 'elite', reward: null });
    G.room!.waves = [[{ id: G.F!.mob.name ? 'frenzyBoar' : 'frenzyBoar', n: 1, elite: true, mod } as any]];
    frames(60);
    return G.mobs.find(m => m.elite)!;
  };

  it('fast: 40% faster than the plain elite', () => {
    const e = spawnElite('fast');
    expect(e.def.speed).toBe(Math.round(scaledSpeed() * 1.4));
  });

  it('shield: guard up, normal hits take a quarter until a heavy hit breaks it', () => {
    const e = spawnElite('shield'), hp = e.hp;
    hurtEnemy(e, 40, false); expect(hp - e.hp).toBe(10);
  });

  it('split: dies into 2 small copies with 30% of its max HP each, which must die too', () => {
    const e = spawnElite('split'), max = e.maxHp;
    hurtEnemy(e, e.hp + 1, true);
    const kids = G.mobs.filter(m => m.hp > 0);
    expect(kids).toHaveLength(2);
    for (const k of kids) { expect(k.maxHp).toBe(Math.round(max * 0.3)); expect(k.elite).toBe(false); }
    expect(G.room!.cleared).toBe(false);
  });

  it('regen: heals 3%/s of max HP after 2 s without a hit', () => {
    const e = spawnElite('regen'); G.P!.x = 60; G.P!.y = 60; // keep away from it
    e.hp = Math.round(e.maxHp / 2); e.sinceHit = 0;
    const low = e.hp; frames(60); expect(e.hp).toBe(low);      // within 2 s: no regen
    frames(120); expect(e.hp).toBeGreaterThan(low);              // after: heals
  });
});
```

  Write `scaledSpeed()` as a small helper in that test file: the act-1 melee mob's `speed` after `scaled()` (speed is not scaled by floor, so it equals `MOBS.frenzyBoar.speed`). Use `MOBS.frenzyBoar.speed` directly and delete the helper if simpler. Import `hurtEnemy` from `../src/systems/combat.js` and `MOBS` from `../src/data/mobs.ts`. In `spawnElite`, use `'frenzyBoar'` as the id. The odd ternary above is a typo; just write `id: 'frenzyBoar'`.

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run tests/run.test.ts tests/rooms.test.ts`
Expected: FAIL (`ELITE_MODS` missing, modifiers have no effect).

- [ ] **Step 3: Data (`src/data/run.ts`)**

```ts
// One modifier per elite, from the run seed: a guard to break, speed, splitting on death, or regeneration
export const ELITE_MODS = ['shield', 'fast', 'split', 'regen'] as const;
export type EliteMod = (typeof ELITE_MODS)[number];
export const ELITE_MOD_NAME: Record<EliteMod, Text> = {
  shield: { th: 'มีโล่', en: 'Shielded' }, fast: { th: 'ว่องไว', en: 'Swift' },
  split: { th: 'แตกตัว', en: 'Splitting' }, regen: { th: 'ฟื้นเลือด', en: 'Regenerating' },
};
export const ELITE_RULES = { fast: 1.4, splitHp: 0.3, splitScale: 0.75, regen: 0.03, regenDelay: 2, shieldRegen: 3 };
```

- `WaveMob`: add `mod?: EliteMod`.
- `planElite`: `const mod = ELITE_MODS[Math.floor(makeRng(seed * 19 + i * 3)() * ELITE_MODS.length)];` and set the elite entry to `{ id: F.mob, n: 1, elite: true, mod }`.
- Import `type { Text } from '../core/i18n.ts'` (type-only, no cycle).

- [ ] **Step 4: Spawn and behaviour**

`src/world/state.ts` `Mob`: add `mod?: EliteMod; sinceHit?: number;` (import the type from run.ts).

`src/systems/rooms.js` `spawnWave`, building the elite def:

```js
    let M = base;
    if (elite) {
      M = { ...base, hp: Math.round(base.hp * ELITE.hp), dmg: Math.round(base.dmg * ELITE.dmg),
        radius: Math.round(base.radius * ELITE.radius), scale: (base.scale ?? 1) * ELITE.scale };
      if (mod === 'fast') M = { ...M, speed: Math.round(M.speed * ELITE_RULES.fast), wanderSpeed: Math.round(M.wanderSpeed * ELITE_RULES.fast) };
      if (mod === 'shield') M = { ...M, armor: { regen: ELITE_RULES.shieldRegen } };
    }
    // …after makeMob: m.elite = !!elite; m.mod = elite ? mod : undefined; m.sinceHit = 0;
```

  (destructure `mod` from the wave entry; import `ELITE_RULES`).

`src/systems/combat.js`:
- In `hurtEnemy`, right after `e.hp -= d; e.hurt = 0.1; …`, add `e.sinceHit = 0;`.
- In `kill(e)`'s mob branch, after the existing death lines:

```js
    if (e.mod === 'split') { // the elite falls apart into two smaller copies
      const R = ELITE_RULES, kid = { ...e.def, hp: Math.round(e.maxHp * R.splitHp), scale: (e.def.scale ?? 1) * R.splitScale, radius: Math.round(e.def.radius * R.splitScale), armor: undefined };
      for (const side of [-1, 1]) {
        const k = makeMob(e.x + side * 30, e.y, false, kid); k.aggro = true; k.sinceHit = 0; G.mobs.push(k);
        ring(k.x, k.y, 5, 40, 0.3, '166,136,255');
      }
    }
```

  (import `ELITE_RULES` from `../data/run.ts`; `makeMob` is already imported).

`src/systems/mobs.js`: in the mob loop after `tickStatus(m, dt); if (m.hp <= 0) continue;`, add:

```js
    m.sinceHit = (m.sinceHit ?? 0) + dt;
    if (m.mod === 'regen' && m.sinceHit > ELITE_RULES.regenDelay) m.hp = Math.min(m.maxHp, m.hp + m.maxHp * ELITE_RULES.regen * dt);
```

  Note: HP becomes fractional. The HP bar uses a ratio, which is fine. The tests compare with `toBeGreaterThan`.

`src/render/world.js` mob draw: after the elite bar line, label the modifier:

```js
  if (m.elite && m.mod) {
    ctx.textAlign = 'center'; ctx.font = `700 12px ${FT}`; ctx.lineJoin = 'round'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.85)';
    const s = t(ELITE_MOD_NAME[m.mod]); ctx.strokeText(s, m.x, m.y - 56); ctx.fillStyle = '#c9b6ff'; ctx.fillText(s, m.x, m.y - 56);
  }
```

  (import `ELITE_MOD_NAME`; `t` and `FT` are already available in world.js, add them if not).

- [ ] **Step 5: Run the tests**

Run: `npx tsc -p . && npx vitest run && npx playwright test e2e/smoke.spec.ts`
Expected: PASS.

- [ ] **Step 6: Propose commit**

`feat: give each elite a modifier`

---

### Task 2: Spring and challenge rooms

**Files:**
- Modify: `src/data/run.ts`, `src/systems/rooms.js`, `src/world/floor.ts`, `src/world/layout.ts` (spring fountain point), `src/render/world.js` (door looks), `src/render/hud.js` (challenge HUD), `src/ui/screens.js` (room toasts)
- Test: `tests/rooms.test.ts`, `tests/run.test.ts`

**Interfaces:**
- Produces: `ROOM_RULES = { springHeal: 0.5, springReach: 110, challengeTime: 30, challengeHits: 3, challengeEvery: 6 }` (run.ts); `RoomState.healed?: boolean`, `RoomState.challenge?: { left: number; hits: number; spawnT: number; failed?: boolean }`; `ROOM_POINT = { x: 600, y: 400 }` (run.ts, the centre every preset keeps clear).

- [ ] **Step 1: Write the failing tests**

`tests/rooms.test.ts`, add:

```ts
describe('a spring room', () => {
  beforeEach(() => { startRun(1); loadFloor(2, { type: 'spring', reward: null }); });

  it('has no enemies and open doors from the start', () => {
    frames(60);
    expect(G.mobs.filter(m => m.hp > 0)).toHaveLength(0);
    expect(G.doors.length).toBeGreaterThan(0);
  });

  it('walking to the fountain heals 50% of max HP once', () => {
    G.P!.hp = 10;
    G.P!.x = 600; G.P!.y = 480; frame();
    expect(G.P!.hp).toBe(10 + Math.round(G.P!.maxHp * 0.5));
    G.P!.hp = 10; frame();
    expect(G.P!.hp).toBe(10); // only once
  });

  it('the fountain is solid', () => {
    expect(hitWall({ x: 600, y: 400, r: 14 })).toBe(true);
  });
});

describe('a challenge room', () => {
  beforeEach(() => { startRun(1); loadFloor(2, { type: 'challenge', reward: 'gold' }); });

  it('keeps sending waves for 30 s, then clears the leftovers and pays the reward twice with <= 3 hits', () => {
    frames(60 * 10);
    expect(G.mobs.some(m => m.hp > 0)).toBe(true);
    for (const m of G.mobs) { m.hp = 0; m.dead = Infinity; } // keep the player safe in this test
    G.P!.inv = 999;                                            // and unhurt
    frames(60 * 21);
    expect(G.room!.cleared).toBe(true);
    expect(G.mobs.filter(m => m.hp > 0)).toHaveLength(0);
    expect(G.P!.col).toBe(2 * rewardValue('gold', 0));
    expect(G.doors.length).toBeGreaterThan(0);
  });

  it('more than 3 hits: no reward, doors still open', () => {
    for (let i = 0; i < 4; i++) { G.P!.inv = 0; hurtPlayer(1); }
    expect(G.room!.challenge!.hits).toBe(4);
    G.P!.inv = 999; frames(60 * 31);
    expect(G.room!.cleared).toBe(true);
    expect(G.P!.col).toBe(0);
    expect(G.doors.length).toBeGreaterThan(0);
  });
});
```

  (import `hurtPlayer` from `../src/systems/combat.js`, `hitWall` from `../src/world/physics.ts`, `rewardValue` from run.ts, if not imported).

`tests/run.test.ts`: the round-2 test `'round 2 rolls battle and elite rooms…'` becomes `'doors roll only the room types this build has, and only battle/challenge doors name a reward'`:

```ts
    for (const d of all) {
      expect(AVAILABLE_ROOMS).toContain(d.type);
      expect(['battle', 'challenge'].includes(d.type) ? d.reward !== null : d.reward === null).toBe(true);
    }
```

  (import `AVAILABLE_ROOMS`).

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run tests/rooms.test.ts tests/run.test.ts`
Expected: FAIL.

- [ ] **Step 3: Data**

`src/data/run.ts`:

```ts
export const AVAILABLE_ROOMS: RoomType[] = ['battle', 'elite', 'spring', 'challenge'];
// The room centre every preset keeps clear: the spring's fountain, the shop's merchant and the shrine stand here
export const ROOM_POINT = { x: 600, y: 400 };
export const ROOM_RULES = { springHeal: 0.5, springReach: 110, challengeTime: 30, challengeHits: 3, challengeEvery: 6 };
```

- [ ] **Step 4: Rooms (`src/systems/rooms.js`)**

- `startRoom`:

```js
export function startRoom(i, room) {
  const base = { ...room, wave: -1, next: WAVE_GAP, cleared: false };
  if (room.type === 'elite') return { ...base, waves: planElite(G.run?.seed ?? 0, i) };
  if (room.type === 'challenge') return { ...base, waves: planWaves(G.run?.seed ?? 0, i), challenge: { left: ROOM_RULES.challengeTime, hits: 0, spawnT: 0 } };
  if (room.type === 'battle') return { ...base, waves: planWaves(G.run?.seed ?? 0, i) };
  return { ...base, waves: [] }; // spring, shop, shrine: no fight, the doors open right away
}
```

- `updateRoom`:

```js
export function updateRoom(dt) {
  const R = G.room;
  if (!R) return;
  if (R.type === 'spring' && !R.healed && G.L.fountain && dist(G.P, G.L.fountain) < ROOM_RULES.springReach) {
    R.healed = true; const heal = Math.round(G.P.maxHp * ROOM_RULES.springHeal);
    G.P.hp = Math.min(G.P.maxHp, G.P.hp + heal); text(G.P.x, G.P.y - 30, '+' + heal, '#7dff8a', true); burst(G.P.x, G.P.y, 20, '#7dff8a', 180, 0.7, 4, false);
  }
  if (R.cleared) return;
  if (R.challenge) return updateChallenge(R, dt);
  if (G.mobs.some(m => m.hp > 0)) return;
  if ((R.next -= dt) > 0) return;
  if (R.wave + 1 < R.waves.length) { R.wave++; spawnWave(R.waves[R.wave]); R.next = WAVE_GAP; return; }
  finish(R, 1);
}

// Challenge: a wave every few seconds for 30 s; at the end the leftovers vanish and the reward pays x2 (or nothing past 3 hits)
function updateChallenge(R, dt) {
  const C = R.challenge;
  C.left -= dt; C.spawnT -= dt;
  if (C.left > 0) {
    if (C.spawnT <= 0) { spawnWave(R.waves[(++R.wave) % R.waves.length]); C.spawnT = ROOM_RULES.challengeEvery; }
    return;
  }
  for (const m of G.mobs) if (m.hp > 0) { m.hp = 0; m.dead = Infinity; burst(m.x, m.y, 12, '#8fe3ff', 200, 0.6, 6, true); }
  C.failed = C.hits > ROOM_RULES.challengeHits;
  emit('challengeOver', !C.failed);
  finish(R, C.failed ? 0 : 2);
}

function finish(R, times) {
  R.cleared = true;
  for (let k = 0; k < times; k++) payReward(R.reward);
  if (R.type === 'elite') G.rewards.push('art');
  const i = G.floorIdx, last = stepOf(i) === ACT_LEN - 2; // the room right before the boss
  G.doors = makeDoors(last ? [null] : rollDoors(G.run.seed, i));
  emit('roomCleared');
}
on('playerHurt', () => { const C = G.room?.challenge; if (C && !G.room.cleared) C.hits++; });
```

  (imports: `ROOM_RULES` from run.ts, `dist` from `../core/math.ts`, `text, burst` from `./fx.js`, `on` from `../core/events.ts`). `on(…)` at module top level is fine: events.ts imports nothing from systems.

`src/core/events.ts`: add `challengeOver: boolean;`.

- [ ] **Step 5: Spring fountain point (`src/world/floor.ts`)**

In `loadFloor`, right after `const L = G.L = layoutFor(kind);`, add `if (room?.type === 'spring') L.fountain = { ...ROOM_POINT };` (import `ROOM_POINT`). The existing wall build already adds `fountainHit(L.fountain)` and terrain.js already paints `L.fountain`.

- [ ] **Step 6: Door looks, HUD, toasts**

`src/render/world.js` `doorLook(d)`, before the reward lookup:

```js
  if (d.to.type === 'spring') return ['#7dff8a', { th: 'น้ำพุ', en: 'Spring' }];
  if (d.to.type === 'challenge') { const r = DOOR_LOOK[d.to.reward][1]; return ['#ff8a5f', { th: `ท้าทาย: ${r.th} ×2`, en: `Challenge: ${r.en} ×2` }]; }
```

`src/render/hud.js`: add and call from `drawHud()`:

```js
// Challenge room: seconds left and hits taken, top centre (red once the hit budget is gone)
function drawChallenge() {
  const C = G.room?.challenge;
  if (!C || G.room.cleared) return;
  const over = C.hits > ROOM_RULES.challengeHits, s = `${Math.max(0, C.left).toFixed(1)} · ` + tr(`โดน ${C.hits}/${ROOM_RULES.challengeHits}`, `Hits ${C.hits}/${ROOM_RULES.challengeHits}`);
  ctx.textAlign = 'center'; label(s, W / 2, 30, over ? '#ff6b5f' : '#ffd35a', `800 18px ${FN}`);
}
```

  (import `ROOM_RULES`).

`src/ui/screens.js`: in the `floorLoaded` toast, choose the room sub-line by type:

```js
  const type = G.room?.type;
  const sub = k === 'boss' ? tr('บอส: ', 'Boss: ') + G.F.boss.name
    : k === 'town' ? tr('ฟื้น HP เต็มแล้ว พ่อค้าอยู่ข้างน้ำพุ', 'Fully healed. The merchant is by the fountain.')
    : type === 'spring' ? tr('เดินไปที่น้ำพุเพื่อฟื้น HP ครึ่งหลอด', 'Walk to the fountain to heal half your HP.')
    : type === 'challenge' ? tr('รอด 30 วินาที โดนตีไม่เกิน 3 ครั้ง ได้รางวัลสองเท่า', 'Survive 30 s and take 3 hits or fewer for a double reward.')
    : type === 'elite' ? tr('ล้ม Elite แล้วเลือกท่าใหม่', 'Beat the Elite to pick a new Blade Art.')
    : tr('เคลียร์ห้องเพื่อเปิดประตู', 'Clear the room to open the doors.');
```

  and add `on('challengeOver', ok => toast(ok ? tr('ผ่านการท้าทาย', 'Challenge passed') : tr('ไม่ผ่านการท้าทาย', 'Challenge failed'), ok ? tr('ได้รางวัลสองเท่า', 'Double reward.') : tr('โดนตีเกิน 3 ครั้ง ไม่ได้รางวัล', 'More than 3 hits. No reward.')));`.

- [ ] **Step 7: Run the tests**

Run: `npx tsc -p . && npx vitest run && npx playwright test e2e/smoke.spec.ts`
Expected: PASS. Bots now meet spring and challenge rooms. If `tests/sim.test.ts` changes outcome, report per-seed results (no tuning). If the e2e loop's `finishFloor` takes 30 s per challenge room and hits a timeout, leave it for Task 5 and say so.

- [ ] **Step 8: Propose commit**

`feat: add spring and challenge rooms`

---

### Task 3: Wandering shop and the chosen element mod

**Files:**
- Modify: `src/data/run.ts`, `src/data/shop.ts`, `src/systems/shop.js`, `src/systems/build.js`, `src/scenes/index.js`, `src/ui/screens.js`, `src/world/floor.ts`, `src/world/state.ts`, `src/core/save.ts`, `src/render/world.js`, `src/main.js`
- Test: `tests/build.test.ts`, `tests/mechanics.test.ts`, `tests/rooms.test.ts`

**Interfaces:**
- Produces: `SHOP.mod` (price 90 + 40 per bought), `shopItems(): ShopItem[]` (the town hides `mod`), `price(id)` reads `P.modBuys` for `mod`, `P.modBuys: number`; `G.rewards` kind `'mod'`; build.js `elementCards()`, `cardsFor('mod')`, card kind `{ kind: 'element', el }`.

- [ ] **Step 1: Write the failing tests**

`tests/build.test.ts`, add:

```ts
describe('a chosen element mod (shop / shrine)', () => {
  beforeEach(() => { startRun(1); enterRoom(1); });

  it('first the element, then the Art; only Arts with room for a mod', () => {
    G.P!.mods = { blade: ['ember', 'storm'] }; G.rewards = ['mod'];
    const els = cardsFor('mod');
    expect(els.map(c => c.kind === 'element' && c.el)).toEqual(['ember', 'storm', 'thorn', 'tide']);
    const arts = applyCard({ kind: 'element', el: 'tide' }, 'mod')!;
    expect(arts.map(c => c.kind === 'mod' && c.art)).toEqual(['sonicLeap']); // the sword is full
    expect(G.rewards).toEqual(['mod']);
    applyCard(arts[0], 'mod');
    expect(G.P!.mods.sonicLeap).toEqual(['tide']); expect(G.rewards).toEqual([]);
  });

  it('with no Art able to take a mod, the pick is a lone skip', () => {
    G.P!.mods = { blade: ['ember', 'ember'], sonicLeap: ['tide', 'tide'] }; G.rewards = ['mod'];
    expect(cardsFor('mod')).toEqual([{ kind: 'skip' }]);
  });
});
```

`tests/mechanics.test.ts` `describe('col and shop')`, add:

```ts
  it('the wandering shop sells a chosen mod for 90 Gold, then 130; the town does not sell it', async () => {
    const { buy, price, shopItems, canBuy } = await import('../src/systems/shop.js');
    startRun(1);
    expect(shopItems()).not.toContain('mod');
    loadFloor(2, { type: 'shop', reward: null });
    expect(shopItems()).toContain('mod');
    G.P!.col = 1000;
    expect(price('mod')).toBe(90);
    expect(buy('mod')).toBe(true);
    expect(G.rewards).toEqual(['mod']); expect(price('mod')).toBe(130); expect(G.P!.col).toBe(910);
    G.P!.mods = { blade: ['ember', 'ember'], sonicLeap: ['tide', 'tide'] };
    expect(canBuy('mod')).toBe(false); // nothing could take it
  });
```

`tests/rooms.test.ts`, add:

```ts
describe('a wandering shop room', () => {
  beforeEach(() => { startRun(1); loadFloor(2, { type: 'shop', reward: null }); });
  it('has a merchant at the room centre, no enemies and open doors', () => {
    frames(30);
    expect(G.L!.merchant).toEqual({ x: 600, y: 400 });
    expect(G.mobs.filter(m => m.hp > 0)).toHaveLength(0);
    expect(G.doors.length).toBeGreaterThan(0);
  });
});
```

`tests/save.test.ts`: in `'round-trips a suspended run…'`, add `modBuys: 2` to the fixture player and expect it back. Add a test that a v3 suspend without `modBuys` loads with `modBuys: 0`.

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run tests/build.test.ts tests/mechanics.test.ts tests/rooms.test.ts tests/save.test.ts`
Expected: FAIL.

- [ ] **Step 3: Data and shop logic**

`src/data/run.ts`: `export const AVAILABLE_ROOMS: RoomType[] = ['battle', 'elite', 'spring', 'challenge', 'shop'];`

`src/data/shop.ts`: add after `pick`:

```ts
  // an element mod of your choice (wandering shop only); each one costs more than the last
  mod: { name: 'Element Mod', desc: { th: 'เลือกธาตุแล้วเลือกท่าที่จะใส่เอง', en: 'Choose an element, then the Art it goes on.' }, price: (bought: number) => 90 + 40 * bought, max: Infinity },
```

`src/systems/shop.js`:

```js
import { modCards } from './build.js';
// The town merchant sells Potions and Skill Scrolls; the wandering shop adds a chosen element mod
export const shopItems = () => Object.keys(SHOP).filter(id => id !== 'mod' || G.room?.type === 'shop');
export const price = id => SHOP[id].price(id === 'mod' ? G.P.modBuys : G.P.scrolls);
export const canBuy = id => G.P.col >= price(id) && (id !== 'potion' || G.P.potions < SHOP.potion.max) && (id !== 'mod' || modCards().length > 0);
// in buy(): replace the else-branch with
  else if (id === 'pick') { P.scrolls++; P.pendingUpgrades++; } // the play scene opens the picker once the shop closes
  else { P.modBuys++; G.rewards.push('mod'); }
```

  `nearMerchant` already reads `G.L.merchant`.

`src/world/floor.ts` `loadFloor`: after the spring line add `if (room?.type === 'shop') L.merchant = { ...ROOM_POINT };`.

`src/world/state.ts` `Player`: add `modBuys: number; // element mods bought this run (sets their price)`. `newPlayer`: `modBuys: 0,`. `snapshotRun`: include `modBuys: P!.modBuys`. `src/core/save.ts` `SuspendSchema.player`: `modBuys: z.number().int().min(0).default(0),`.

- [ ] **Step 4: The `'mod'` pick (`src/systems/build.js`)**

```js
// A chosen mod: the element first, then an Art that still has room for it
export const elementCards = () => ELEMENT_IDS.filter(el => modCards().some(c => c.el === el)).map(el => ({ kind: 'element', el }));
```

- `cardsFor`: `kind === 'mod' ? elementCards() : …`, and make the existing empty-to-skip fallback apply to every reward kind (`'art'`, `'mod'`, `'evolve'`): if the list is empty, return `[{ kind: 'skip' }]`.
- `applyCard`: add before the mod branch:

```js
  if (card.kind === 'element') return modCards().filter(c => c.el === card.el); // second step: which Art
```

  The following `'mod'` card is applied with kind `'mod'`, which shifts `G.rewards`. That is the existing non-level path.

- [ ] **Step 5: Shop window and picker headers**

`src/ui/screens.js`:
- `renderShop`: iterate `shopItems()` instead of `Object.entries(SHOP)` (`const ids = shopItems(); … ids.map((id, i) => { const it = SHOP[id]; … })`).
- `PICK_TITLE`: add `mod: { th: 'เลือกธาตุ', en: 'Choose an element' }, modart: { th: 'ใส่ให้ท่าไหน', en: 'Which Art gets it?' }`.
- `showPicker` message: `mod` → `tr('เลือกธาตุที่จะใส่', 'Choose the element.')`, `modart` → `tr('เลือกท่าที่จะได้ธาตุนี้', 'Choose the Art that gets it.')`.
- `cardHtml`: add the `element` card: `glass = ELEMENTS[c.el].color; title = ELEMENTS[c.el].name; body = t(ELEMENTS[c.el].hit);`.

`src/scenes/index.js`:
- `buyItem`: map the number key through `shopItems()` (in main.js the keydown handler uses `Object.keys(SHOP)[n]`; change it to `shopItems()[n]`).
- `pickUpgrade`: the follow-up header kind is `follow[0].kind === 'replace' || follow[0].kind === 'skip' ? 'replace' : 'modart'`.

`src/render/world.js` `doorLook`: `if (d.to.type === 'shop') return ['#ffd35a', { th: 'ร้านเร่', en: 'Wandering shop' }];`. Room toast in screens.js: `type === 'shop' ? tr('มีพ่อค้าเร่อยู่กลางห้อง กด E เพื่อซื้อของ', 'A wandering merchant stands in the middle. Press E to shop.')` (use `keyLabel('interact')` for the key).

- [ ] **Step 6: Run the tests**

Run: `npx tsc -p . && npx vitest run && npx playwright test e2e/smoke.spec.ts`
Expected: PASS.

- [ ] **Step 7: Propose commit**

`feat: add the wandering shop and chosen element mods`

---

### Task 4: Shrine and the curse

**Files:**
- Create: `src/systems/shrine.js`
- Modify: `src/data/run.ts`, `src/systems/rooms.js`, `src/world/floor.ts`, `src/world/state.ts`, `src/core/save.ts`, `src/scenes/index.js`, `src/ui/screens.js`, `index.html`, `src/main.js`, `src/render/world.js`, `src/render/hud.js`
- Test: `tests/shrine.test.ts` (create), `tests/save.test.ts`

**Interfaces:**
- Produces: `SHRINE` offer table + `ShrineId = 'blood' | 'gold' | 'curse' | 'potion'`, `rollShrine(seed, i): ShrineId[]` (2 distinct), `SHRINE_RULES = { bloodHp: 0.15, goldCost: 120, curseFloors: 2, curseMult: 1.25, curseGold: 150, potionMaxHp: 10, reach: 70 }` (run.ts); shrine.js `canTake(id): boolean`, `take(id): boolean`, `nearShrine(): boolean`; `run.curse: number`, `G.cursed: boolean`; `RoomState.shrineUsed?: boolean`, `RoomState.offers?: ShrineId[]`; `L.shrine?: Point`.

- [ ] **Step 1: Write the failing tests**

Create `tests/shrine.test.ts`:

```ts
// Shrine: two seeded offers, each with a price; one per shrine. Plus the curse it can lay on the next floors.
import { describe, it, expect, beforeEach } from 'vitest';
import { G, startRun, frame } from './harness.ts';
import { loadFloor } from '../src/world/floor.ts';
import { rollShrine, SHRINE_RULES, mobScale } from '../src/data/run.ts';
import { canTake, take } from '../src/systems/shrine.js';

describe('shrine offers', () => {
  beforeEach(() => { startRun(1); loadFloor(2, { type: 'shrine', reward: null }); });

  it('2 different offers, the same for the same seed and floor', () => {
    const o = rollShrine(5, 2);
    expect(o).toHaveLength(2); expect(new Set(o).size).toBe(2); expect(rollShrine(5, 2)).toEqual(o);
    expect(G.room!.offers).toEqual(rollShrine(G.run!.seed, 2));
  });

  it('blood: 15% max HP for a chosen mod', () => {
    const max = G.P!.maxHp;
    expect(take('blood')).toBe(true);
    expect(G.P!.maxHp).toBe(Math.round(max * (1 - SHRINE_RULES.bloodHp)));
    expect(G.rewards).toEqual(['mod']);
  });

  it('gold: needs 120 Gold, then queues an evolution pick', () => {
    G.P!.col = 100; expect(canTake('gold')).toBe(false);
    G.P!.col = 200; expect(take('gold')).toBe(true);
    expect(G.P!.col).toBe(80); expect(G.rewards).toEqual(['evolve']);
  });

  it('potion: needs a Potion, gives a full heal and +10 max HP', () => {
    G.P!.potions = 0; expect(canTake('potion')).toBe(false);
    G.P!.potions = 1; G.P!.hp = 5; const max = G.P!.maxHp;
    take('potion');
    expect(G.P!.potions).toBe(0); expect(G.P!.maxHp).toBe(max + 10); expect(G.P!.hp).toBe(G.P!.maxHp);
  });

  it('one offer per shrine', () => {
    G.P!.col = 999;
    expect(take('gold')).toBe(true);
    expect(canTake('curse')).toBe(false);
  });

  it('curse: 150 Gold + 1 Potion now, enemies +25% on the next 2 floors that have enemies (towns skipped)', () => {
    G.P!.col = 0; G.P!.potions = 0;
    take('curse');
    expect(G.P!.col).toBe(150); expect(G.P!.potions).toBe(1);
    loadFloor(3, { type: 'battle', reward: 'gold' }); expect(G.cursed).toBe(true);
    for (let i = 0; i < 60; i++) frame();
    const m = G.mobs.find(x => x.def.name === G.F!.mob.name)!;
    expect(m.maxHp).toBe(Math.round(Math.round(G.F!.mob.hp * mobScale(3)) * 1.25));
    loadFloor(4); expect(G.cursed).toBe(true);   // boss floor counts
    loadFloor(5); expect(G.cursed).toBe(false);  // town: no enemies, not counted
    loadFloor(6, { type: 'battle', reward: 'gold' }); expect(G.cursed).toBe(false); // 2 floors used up
  });
});
```

  Note on the expected curse HP: apply the curse multiplier inside `scaled()` together with `mobScale`, as one rounding: `Math.round(hp * mobScale(i) * 1.25)`. Write the test's expectation as `Math.round(G.F!.mob.hp * mobScale(3) * SHRINE_RULES.curseMult)` to match.

`tests/save.test.ts`: round-trip `run.curse: 1`; a v3 suspend without `curse` loads with `curse: 0`. In tests/mechanics.test.ts `'resume keeps the room…'`, nothing changes.

Add one resume test in tests/shrine.test.ts:

```ts
  it('resuming a cursed floor keeps it cursed and does not use up an extra floor', async () => {
    const { resumeRun } = await import('../src/world/floor.ts');
    take('curse');
    loadFloor(3, { type: 'battle', reward: 'gold' });
    const entry = G.entry!;
    startRun(2); resumeRun(entry);
    expect(G.cursed).toBe(true); expect(G.run!.curse).toBe(1);
  });
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run tests/shrine.test.ts tests/save.test.ts`
Expected: FAIL.

- [ ] **Step 3: Data (`src/data/run.ts`)**

```ts
export const AVAILABLE_ROOMS: RoomType[] = ['battle', 'elite', 'spring', 'challenge', 'shop', 'shrine'];
export const SHRINE_IDS = ['blood', 'gold', 'curse', 'potion'] as const;
export type ShrineId = (typeof SHRINE_IDS)[number];
export const SHRINE_RULES = { bloodHp: 0.15, goldCost: 120, curseFloors: 2, curseMult: 1.25, curseGold: 150, potionMaxHp: 10, reach: 70 };
// What each offer costs and gives (shown on the shrine's cards)
export const SHRINE: Record<ShrineId, { cost: Text; gain: Text }> = {
  blood: { cost: { th: 'เสีย HP สูงสุด 15%', en: 'Lose 15% max HP' }, gain: { th: 'ได้ mod ธาตุที่เลือกเอง', en: 'Gain an element mod of your choice' } },
  gold: { cost: { th: 'จ่าย 120 Gold', en: 'Pay 120 Gold' }, gain: { th: 'วิวัฒน์ท่าที่เลือกทันที', en: 'Evolve an Art of your choice now' } },
  curse: { cost: { th: 'ศัตรูแรงขึ้น 25% ใน 2 ชั้นถัดไป', en: 'Enemies +25% for the next 2 floors' }, gain: { th: 'ได้ 150 Gold และ Potion 1 ขวด', en: 'Gain 150 Gold and a Potion' } },
  potion: { cost: { th: 'เสีย Potion 1 ขวด', en: 'Give up a Potion' }, gain: { th: 'ฟื้น HP เต็ม และ HP สูงสุด +10', en: 'Full heal and +10 max HP' } },
};
export function rollShrine(seed: number, i: number): ShrineId[] {
  const r = makeRng(seed * 23 + i * 31), left = [...SHRINE_IDS], out: ShrineId[] = [];
  while (out.length < 2) out.push(left.splice(Math.floor(r() * left.length), 1)[0]);
  return out;
}
```

- [ ] **Step 4: Shrine logic (`src/systems/shrine.js`)**

```js
// Shrine offers: each has a price; a shrine grants one, then goes dark. Rewards that need a choice (a mod, an
// evolution) go through the build pick scene via G.rewards.
import { G } from '../world/state.ts';
import { SHRINE_RULES as S } from '../data/run.ts';
import { SHOP } from '../data/shop.ts';
import { dist } from '../core/math.ts';
import { emit } from '../core/events.ts';
import { modCards, evolveCards } from './build.js';
import { gainCol } from './combat.js';
import { ring } from './fx.js';

export const nearShrine = () => !!G.P && !!G.L?.shrine && !G.room?.shrineUsed && dist(G.P, G.L.shrine) < S.reach;
export function canTake(id) {
  const P = G.P, R = G.room;
  if (!R || R.type !== 'shrine' || R.shrineUsed || !R.offers?.includes(id)) return false;
  if (id === 'blood') return modCards().length > 0;
  if (id === 'gold') return P.col >= S.goldCost && evolveCards().length > 0;
  if (id === 'potion') return P.potions > 0;
  return true; // curse
}
export function take(id) {
  if (!canTake(id)) return false;
  const P = G.P;
  if (id === 'blood') { P.maxHp = Math.round(P.maxHp * (1 - S.bloodHp)); P.hp = Math.min(P.hp, P.maxHp); G.rewards.push('mod'); }
  else if (id === 'gold') { P.col -= S.goldCost; G.rewards.push('evolve'); }
  else if (id === 'curse') { G.run.curse = (G.run.curse ?? 0) + S.curseFloors; gainCol(S.curseGold, P); if (P.potions < SHOP.potion.max) P.potions++; else gainCol(SHOP.potion.price(), P); }
  else if (id === 'potion') { P.potions--; P.maxHp += S.potionMaxHp; P.hp = P.lag = P.maxHp; }
  G.room.shrineUsed = true; ring(G.L.shrine.x, G.L.shrine.y, 10, 90, 0.5, '201,182,255'); emit('shrineTaken', id);
  return true;
}
```

  Add `shrineTaken: string;` to `src/core/events.ts`.

- [ ] **Step 5: Room, curse and save**

`src/systems/rooms.js` `startRoom`: `if (room.type === 'shrine') return { ...base, waves: [], offers: rollShrine(G.run?.seed ?? 0, i) };` (import `rollShrine`).

`src/world/state.ts`: `Run` add `curse?: number;`; `G` add `cursed: false,`.
`src/world/floor.ts`:
- `loadFloor`: right after the shop line, add `if (room?.type === 'shrine') L.shrine = { ...ROOM_POINT };` (add `shrine?: Point` to `Layout` in layout.ts).
- Before spawning anything (near the top, after `G.L = …`): `G.cursed = kind !== 'town' && (G.run?.curse ?? 0) > 0;`.
- After `G.entry = snapshotRun();` (so the snapshot keeps the count from before this floor): `if (G.cursed) G.run!.curse!--;`.
- `scaled`: `const k = mobScale(i) * (G.cursed ? SHRINE_RULES.curseMult : 1);`, and change the early return to `k === 1 ? M : …`.
- `newRun`: `G.run = { …, curse: 0 }`. `snapshotRun` run: add `curse: run!.curse ?? 0`.
`src/core/save.ts` `SuspendSchema.run`: `curse: z.number().int().min(0).default(0),`.

- [ ] **Step 6: Shrine scene, window, interact**

`index.html`, after the shop section:

```html
<section id="shrine" class="screen" role="dialog" aria-labelledby="shrine-h">
  <div class="win wide" style="--glass:var(--hornfield)"><header id="shrine-h" data-en="Shrine">ศาลเจ้า</header><div class="body">
    <p class="result-msg" data-en="Take one offer, or walk past. Each one has a price.">รับข้อเสนอได้ 1 อย่าง หรือเดินผ่านไป ทุกข้อเสนอมีราคา</p>
    <div class="cards" id="shrine-offers"><!-- filled by ui/screens.js --></div>
    <button class="btn" data-act="closeShrine"><span class="ic"><svg class="ico"><use href="#i-back"/></svg></span><span data-en="Walk past">เดินผ่าน</span><kbd>Esc</kbd></button>
  </div></div>
</section>
```

`src/ui/screens.js`:

```js
// Shrine: two offers, each card shows the price then what you get; offers you can't take are disabled
export function renderShrine() {
  $('shrine-offers').innerHTML = (G.room?.offers ?? []).map((id, i) => {
    const o = SHRINE[id], ok = canTake(id);
    return `<button class="card" data-offer="${id}" ${ok ? '' : 'aria-disabled="true"'} aria-label="${i + 1}: ${t(o.cost)}. ${t(o.gain)}">
      <kbd>${i + 1}</kbd><b>${t(o.gain)}</b><span>${t(o.cost)}</span></button>`;
  }).join('');
}
```

  (import `SHRINE` from run.ts, `canTake` from `../systems/shrine.js`). Room toast: `type === 'shrine' ? tr(`ศาลเจ้าอยู่กลางห้อง กด ${keyLabel('interact')} เพื่อดูข้อเสนอ`, `A shrine stands in the middle. Press ${keyLabel('interact')} to see its offers.`)`.

`src/scenes/index.js`:

```js
const shrineScene = {
  name: 'shrine', blocksUpdate: true,
  enter() { releaseAll(); renderShrine(); screen('shrine'); },
  exit() { screen(null); },
};
export const atShrine = () => scenes.top === shrineScene;
export function openShrine() { if (playing() && nearShrine()) scenes.push(shrineScene); }
export function closeShrine() { if (atShrine()) scenes.pop(); }
export function takeOffer(id) { if (atShrine() && take(id)) scenes.pop(); } // the pick scene follows if the offer needs a choice
$('shrine-offers').addEventListener('click', e => {
  const card = /** @type {HTMLElement | null} */ (/** @type {Element} */ (e.target).closest('[data-offer]'));
  if (card) takeOffer(card.dataset.offer);
});
// Interact: the merchant if one is near, else the shrine
export function interact() { if (nearMerchant()) openShop(); else openShrine(); }
```

  Add `shrineScene` to `liveRun`. Import `renderShrine`, `nearShrine`, `take`.

`src/main.js`:
- `GAME_ACTIONS.interact: interact` (was `openShop`).
- `bindActions` add `closeShrine`.
- In keydown, after the `shopping()` block:

```js
  if (atShrine()) { // number keys take an offer, Esc / interact walks past
    if (/^(Digit|Numpad)[1-9]$/.test(e.code)) takeOffer(G.room?.offers?.[+e.code.at(-1) - 1]);
    else if ((action === 'pause' || action === 'interact') && !e.repeat) closeShrine();
    return;
  }
```

- `back()`: add `else if (atShrine()) closeShrine();` after the shop line.

`src/render/world.js`:
- Draw the shrine altar as an actor, sorted by y like the merchant: a stone plinth with a glowing violet crystal, dim when used, and a name tag (`[E] ศาลเจ้า` / `[E] Shrine` when near, like the merchant tag):

```js
function drawShrine() {
  const s = G.L.shrine; if (!s) return;
  const used = G.room?.shrineUsed, glow = used ? 0.15 : 0.6 + 0.25 * Math.sin(G.time * 3);
  shadow(s.x, s.y, 22);
  ctx.fillStyle = '#4a4d5c'; ctx.fillRect(s.x - 22, s.y - 18, 44, 22); ctx.fillStyle = '#5f6375'; ctx.fillRect(s.x - 16, s.y - 30, 32, 14);
  ctx.save(); ctx.globalAlpha = glow; ctx.shadowColor = '#a688ff'; ctx.shadowBlur = used ? 0 : 18; ctx.fillStyle = '#c9b6ff';
  ctx.beginPath(); ctx.moveTo(s.x, s.y - 62); ctx.lineTo(s.x + 9, s.y - 44); ctx.lineTo(s.x, s.y - 30); ctx.lineTo(s.x - 9, s.y - 44); ctx.closePath(); ctx.fill(); ctx.restore();
  if (used) return;
  ctx.textAlign = 'center'; ctx.font = `700 13px ${FT}`; ctx.lineJoin = 'round'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.8)';
  const name = tr('ศาลเจ้า', 'Shrine'), tag = nearShrine() ? `[${keyLabel('interact')}] ${name}` : name;
  ctx.strokeText(tag, s.x, s.y - 72); ctx.fillStyle = nearShrine() ? '#e7dcff' : '#fff'; ctx.fillText(tag, s.x, s.y - 72);
}
```

  Push it into the actor list when `G.L.shrine` exists. Make the altar solid: in floor.ts, when placing the shrine, also push `{ x: 578, y: 382, w: 44, h: 22 }` (the plinth) into `G.WALLS`.
- `doorLook`: `if (d.to.type === 'shrine') return ['#c9b6ff', { th: 'ศาลเจ้า', en: 'Shrine' }];`.

`src/render/hud.js`: on the floor label line, when `G.cursed`, append `tr('คำสาป', 'Cursed')` as one more ` · `-joined data item (it's a status label, not a sentence) and colour the line `#c9b6ff`.

- [ ] **Step 7: Run the tests**

Run: `npx tsc -p . && npx vitest run && npx playwright test e2e/smoke.spec.ts`
Expected: PASS.

- [ ] **Step 8: Propose commit**

`feat: add shrines with priced offers and the curse`

---

### Task 5: Bots, full-loop tests and soak for the new rooms

**Files:**
- Modify: `tests/harness.ts`, `e2e/loop.spec.ts`, `e2e/playthrough.bot.ts`
- Test: the files above

- [ ] **Step 1: Headless bot (`tests/harness.ts`)**

In `createBot`'s `think`, before `if (G.doors.length) {…}`:

```ts
    const R = G.room;
    if (R?.type === 'spring' && !R.healed && L.fountain) return walkTo(L.fountain.x, L.fountain.y + 70);           // drink first
    if (R?.type === 'shop' && L.merchant && P.col >= 40 && P.potions < 3) {                                          // a Potion if affordable
      if (dist(P, L.merchant) > 40) return walkTo(L.merchant.x, L.merchant.y + 30);
      buy('potion'); return;
    }
    // shrines: the bot walks past (offers have prices the scripted player can't weigh)
```

Challenge rooms need no special code: the bot fights until the doors appear.

- [ ] **Step 2: Full-loop browser test (`e2e/loop.spec.ts`)**

- `finishFloor`, room branch: if `s.room.type === 'challenge'`, fast-forward the timer before waiting: `await hook(page, 's.room.challenge && (s.room.challenge.left = 0.1)')`. Keep the existing kill-until-doors loop for every room type. It also resolves spring, shop and shrine rooms at once, because their doors are already open.
- Add a test:

```ts
test('a shrine offer goes through the window and the picker', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  await diveIn(page);
  await hook(page, "s.loadFloor(2, { type: 'shrine', reward: null })");
  await settle(page);
  await hook(page, 's.P.col = 999, s.room.offers = ["gold", "curse"], s.P.x = 600, s.P.y = 450');
  await page.keyboard.press('KeyE');
  await expect(page.locator('#shrine')).toBeVisible();
  await page.keyboard.press('Digit1');
  await expect(page.locator('#upgrade')).toBeVisible({ timeout: 5_000 }); // evolve pick
  await page.keyboard.press('Digit1');
  await expect.poll(() => hook(page, 's.P.evolved.length')).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});
```

- [ ] **Step 3: In-page bot (`e2e/playthrough.bot.ts`)**

Mirror Step 1 with key events:
- spring: walk to `s.L.fountain`
- shop room: walk to `s.L.merchant` and `tap('KeyE')`; the overlay handler buys
- shrine: walk past
- the overlay handler must close `#shrine` with Escape if it is ever open

- [ ] **Step 4: Run everything and a soak**

Run: `npm run check`. Expected: PASS.
Run: `npx playwright test --config e2e/capture.config.ts e2e/playthrough.bot.ts`. Expected: both runs end (win or death on floor ≥ 5), `errors: []`.
Soak: a temporary test file plays seeds 100-119 with `playRun` and writes the results to a temp file. Report wins, deaths by floor, timeouts, and how often each room type was entered (count `loadFloor` room types via an `on('floorLoaded')` listener in the temp file). Then delete both files. Investigate any timeout to its root cause before reporting (game or bot?), and fix bots only when it's bot-only.

- [ ] **Step 5: Propose commit**

`test: cover the new room types in bots and full-loop tests`

---

## Self-review notes

- Spec coverage (round 3): elite modifiers (Task 1), spring and challenge (Task 2), wandering shop with the chosen mod at 90 +40 (Task 3), shrine with the four priced offers and the curse (Task 4), door rules now active for every type (Tasks 2-4 grow `AVAILABLE_ROOMS`; `rollDoors` already enforces the pre-boss spring/shop and the elite guarantee), bots/tests (Task 5).
- Out of scope (later rounds): boss arena mechanics and the boss intro card (round 5), new Arts and evolved forms (round 4), balance (round 6).
- Plan details to watch: the curse decrements after the floor-entry snapshot, so resuming doesn't burn an extra floor (tested). A shrine evolution or mod reward uses the existing pick scene through `G.rewards`. Empty reward picks resolve to a lone skip for every kind.
- Names used across tasks: `ELITE_MODS`, `ELITE_MOD_NAME`, `ELITE_RULES`, `ROOM_POINT`, `ROOM_RULES`, `SHRINE`, `SHRINE_IDS`, `SHRINE_RULES`, `rollShrine`, `shopItems`, `elementCards`, `canTake`, `take`, `nearShrine`, `openShrine`, `closeShrine`, `takeOffer`, `atShrine`, `interact`, `G.cursed`, `run.curse`, `P.modBuys`, `L.shrine`, `RoomState.healed/challenge/offers/shrineUsed`.
