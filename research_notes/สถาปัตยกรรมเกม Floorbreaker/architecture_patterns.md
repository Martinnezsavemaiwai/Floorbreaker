# Code Architecture Patterns for "Sword Art On You" (2D browser action RPG, outgrowing one file)

Scope: how to split a ~1000-line single-file vanilla JS Canvas 2D game (global state, FLOORS array, variable-dt rAF loop with hit-stop, string state machine, if/else update/draw, switch-based boss AI, DOM menus, Web Audio SFX, localStorage) into a maintainable structure for more floors, items/inventory, NPCs/dialogue/quests, more enemies/bosses, and maybe mobile. Solo hobby scale (~50 live entities). Research date: 2026-10-07.

Source-quality note: several primary sources are old but still canonical (Fiedler 2004; Nystrom's book, written 2009–2014, online). Library facts (miniplex, bitECS, inkjs, Zod, Vite) come from their current repos/docs as fetched in Oct 2026; the fetch tool could not always surface exact release dates.

## Game loop: fixed timestep vs variable dt, hit-stop/pause/slow-mo, interpolation

### Takeaway
Use a fixed simulation step (e.g. 1/60 s) driven by an accumulator inside requestAnimationFrame, clamp the frame delta to avoid the "spiral of death", and implement hit-stop / slow-mo / pause by scaling or zeroing the time fed into the accumulator. Render interpolation is optional for a 60 Hz sim on 60 Hz displays but becomes worthwhile on 120/144 Hz screens.

### Cited Findings
- Fiedler's "Fix Your Timestep!" (published 10 June 2004) walks through variable dt -> semi-fixed -> accumulator. Variable dt makes physics behave differently at different framerates (objects can tunnel or simulations "explode"); semi-fixed risks the "spiral of death" when simulation can't keep up; the fix is "the renderer produces time and the simulation consumes it in discrete dt-sized steps", carrying leftover time to the next frame. — [Gaffer On Games, Fix Your Timestep!](https://gafferongames.com/post/fix_your_timestep/)
- Fiedler's canonical code shape: `accumulator += frameTime; while (accumulator >= dt) { integrate(state, t, dt); accumulator -= dt; } alpha = accumulator / dt; render(lerp(previous, current, alpha));` — [Gaffer On Games](https://gafferongames.com/post/fix_your_timestep/)
- Nystrom (Game Programming Patterns, "Game Loop"): variable time step "makes gameplay non-deterministic and unstable"; "fixed update, variable rendering" is described as the most adaptable option; he passes a normalized `lag` (0..1) to the renderer to extrapolate/interpolate, noting errors are "less noticeable than the stuttering you get if you don't." — [Game Programming Patterns: Game Loop](https://gameprogrammingpatterns.com/game-loop.html)
- Nystrom on the simplest (unsynchronized) loop: "if there's any variation, it will directly affect the game speed." — [Game Programming Patterns: Game Loop](https://gameprogrammingpatterns.com/game-loop.html)

### Inferences
- For this game the concrete benefits of fixed step are: frame-perfect boss move timings and i-frames identical on 60/120/144 Hz monitors and slow phones; reproducible bugs; simpler collision (no tunneling on lag spikes). These matter more than raw physics accuracy in an action RPG.
- Hit-stop, slow-mo and pause all become one knob: `timeScale`. Hit-stop = set `timeScale = 0` for N real milliseconds (count it down with *real* dt, not sim dt, or it never ends). Slow-mo = `timeScale = 0.3`. Pause = don't step the play scene at all (scene-stack overlay, see next section). UI/menus/particles that should keep animating during hit-stop can be updated with real dt separately.
- Interpolation: store `prevX/prevY` on moving entities before each step and lerp by `alpha` when drawing. Cheap to add later; skip it initially if the target is 60 Hz and it looks fine. Flag: interpolation is the part most likely to cause subtle bugs (teleports, spawns lerping from 0,0) — reset prev = current on teleport/spawn.
- Suggested shape (TypeScript):

```ts
// core/loop.ts
const STEP = 1 / 60;
const MAX_FRAME = 0.25; // ponytail-style clamp: avoids spiral of death after tab switch
let acc = 0, last = performance.now();
export const time = { scale: 1, hitStop: 0 }; // hitStop in real seconds

export function startLoop(step: (dt: number) => void, render: (alpha: number) => void) {
  function frame(now: number) {
    let real = Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    if (time.hitStop > 0) { time.hitStop -= real; real = 0; }
    acc += real * time.scale;
    while (acc >= STEP) { step(STEP); acc -= STEP; }
    render(acc / STEP);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
```

- Also reset `last` on `visibilitychange` so returning to the tab doesn't dump a huge delta (the clamp already caps damage).

### Gaps
- No primary source found specifically on hit-stop implementation in fixed-step loops; the above is an inference from the accumulator model.
- No 2018–2026 primary source fetched that re-evaluates Fiedler for browser games specifically; his article remains the de facto reference.

## Scene/state management and AI: scene stack, FSMs, behavior trees vs FSM vs utility AI

### Takeaway
Replace the `state` string with a small scene stack (pushdown automaton): Title, Play, and overlays (Pause, Dialogue, Inventory, GameOver) pushed on top of Play. For player/enemy AI use plain FSMs (object-of-states or a `switch` on a state field with timers). For bosses, a phase-based FSM with weighted move selection covers this scale; behavior trees and utility AI are over-engineering for a handful of hand-authored bosses.

### Cited Findings
- FSMs fit entities whose behavior divides into "a relatively small number of distinct options" and that respond to inputs/events over time; uses include AI, input handling, menu navigation. — [Game Programming Patterns: State](https://gameprogrammingpatterns.com/state.html)
- Hierarchical state machines let a substate defer unhandled input to a superstate, avoiding duplication (e.g. shared jump/duck handling). — [Game Programming Patterns: State](https://gameprogrammingpatterns.com/state.html)
- Pushdown automata replace the single state pointer with a stack; push a new state and pop back to the previous one (example: firing mid-action then returning). — [Game Programming Patterns: State](https://gameprogrammingpatterns.com/state.html)
- FSMs are limited (not Turing complete); "the trend these days in game AI is more toward ... behavior trees and planning systems" for complex AI. — [Game Programming Patterns: State](https://gameprogrammingpatterns.com/state.html)

### Inferences
- The scene stack is the same pushdown idea applied at game level: `Pause`, `Dialogue`, `Inventory` are pushed over `Play`; Play stops updating (or only the top scene updates) but still draws underneath. This removes most `if (state === 'paused')` branches.

```ts
// core/scenes.ts
export interface Scene {
  enter?(): void; exit?(): void;
  update(dt: number): void;
  draw(ctx: CanvasRenderingContext2D, alpha: number): void;
  blocksUpdate?: boolean; // overlays like Pause set true
}
const stack: Scene[] = [];
export const scenes = {
  push(s: Scene) { stack.push(s); s.enter?.(); },
  pop() { stack.pop()?.exit?.(); },
  replace(s: Scene) { this.pop(); this.push(s); },
  update(dt: number) { for (let i = stack.length - 1; i >= 0; i--) { stack[i].update(dt); if (stack[i].blocksUpdate) break; } },
  draw(ctx: CanvasRenderingContext2D, a: number) { for (const s of stack) s.draw(ctx, a); },
};
```

- Enemy/boss FSM shape that stays data-friendly: state name + timer; move definitions live in data, behavior functions live in code keyed by name (the current "switch over move names" is already 80% of this — keep it, just move it into `systems/bossAI.ts` and key moves from a `Record<string, MoveFn>` table instead of a giant switch).

```ts
type MoveFn = (boss: Boss, w: World, t: number) => boolean; // returns true when done
export const MOVES: Record<string, MoveFn> = { slash3, dashStrike, spinAoe };

// data: { id: "kobold_lord", phases: [{ hpBelow: 1.0, moves: [["slash3", 3], ["dashStrike", 1]] },
//                                    { hpBelow: 0.5, moves: [["spinAoe", 2], ["dashStrike", 2]] }] }
```

- Over-engineering flags: behavior-tree libraries, GOAP, or utility AI pay off with many agents choosing among many contextual actions; with ~5–15 hand-authored bosses, "phase -> weighted random move -> recover window" is easier to tune and read. Revisit only if bosses start needing reactive decision-making that a phase list can't express.
- Player: an FSM (`idle | run | attack(n) | dodge | hurt | dead`) with explicit timers makes combo windows, cancel rules, and i-frames visible in one place.

### Gaps
- No 2018–2026 primary source fetched comparing BT/utility AI at small scale; the recommendation rests on Nystrom plus general scope reasoning.

## Entity model: ECS (bitECS, miniplex, becsy) vs component OOP vs plain data + systems

### Takeaway
At ~50 entities, performance is not a reason to adopt ECS. The best fit is "plain data objects + system functions": typed entity objects in arrays (or one `World` with a few lists), with behavior in module-level functions grouped by concern. If you want ECS ergonomics later, miniplex is the lowest-ceremony option because entities stay plain JS objects; bitECS is aimed at data-oriented/performance cases you don't have.

### Cited Findings
- Nystrom: use the Component pattern when a class "touches multiple domains", is "getting massive", or inheritance can't pick reusable parts precisely; costs include more objects to wire and harder inter-component communication; warns against "over-engineering a 'solution' to a non-existent problem." — [Game Programming Patterns: Component](https://gameprogrammingpatterns.com/component.html)
- miniplex: entities are plain JavaScript objects and components are their properties; archetype queries like `world.with("position", "velocity")` / `.without("paused")`; `world.add/remove/addComponent/removeComponent`; reactive `onEntityAdded/onEntityRemoved`; no built-in system scheduler — you call systems from your own loop. ~1.1k GitHub stars, MIT. — [miniplex on GitHub](https://github.com/hmans/miniplex)
- bitECS: TypeScript ECS, "minimal, less opinionated", ~5 KB minzipped, zero dependencies, data-oriented with SoA typed arrays (e.g. `Float32Array`) or AoS objects; API `createWorld`, `addEntity`, `addComponent`, `query`; used by Third Room and Mozilla Hubs. ~1.5k stars. — [bitECS on GitHub](https://github.com/NateTheGreatt/bitECS)
- Joshua Manton (1 Feb 2023) argues ECS benefits (composition, designer tooling, performance) are overstated for most games; he first used a "megastruct" (all fields + flags), then moved to a small set of typed entity kinds; calls ECS "just a compression algorithm." — [Why I removed components from my engine](https://joshuamanton.substack.com/p/why-i-removed-components-from-my)
- Industry blog summary: ECS "earns its cost when a game has many entities that interact in varied combinations" (bullet hell, simulations, strategy); a complex one-off boss can feel forced into the systems mold; indie devs should be "ruthless in only implementing things that you actually need." — [Wayline: ECS for indie game devs](https://www.wayline.io/blog/ecs-for-indie-game-devs) (secondary/blog source, moderate reliability)

### Inferences
- Recommended shape: one discriminated-union entity type plus systems. This keeps TypeScript narrowing (`switch (e.kind)`), and replaces the current if/else-per-kind in update/draw with per-concern functions.

```ts
// entities/types.ts
interface Base { id: number; kind: string; x: number; y: number; prevX: number; prevY: number;
                 hp: number; maxHp: number; r: number; dead?: boolean; }
export interface Player extends Base { kind: "player"; fsm: PlayerState; stamina: number; inv: Inventory; }
export interface Mob    extends Base { kind: "mob"; defId: string; ai: MobAI; }
export interface Boss   extends Base { kind: "boss"; defId: string; phase: number; move?: ActiveMove; }
export interface Npc    extends Base { kind: "npc"; dialogue: string; }
export type Entity = Player | Mob | Boss | Npc;

// core/world.ts
export const world = { player: null! as Player, entities: [] as Entity[], projectiles: [] as Projectile[], particles: [] as Particle[] };

// systems/movement.ts, systems/combat.ts, systems/ai.ts, render/drawEntities.ts ... each a plain function(world, dt)
```

- Keep particles/projectiles in their own arrays (they're numerous, short-lived, uniform) — swap-remove for deletion; pool only if GC hitches are actually observed.
- Over-engineering flags: a generic component registry, entity IDs + lookup maps everywhere, or porting to bitECS SoA typed arrays — all solve problems (10k+ entities, cache locality) this game doesn't have. Upgrade path: if entity variety explodes (many optional capabilities mixed freely), adopt miniplex — the plain-object entities above migrate with little change.

### Gaps
- Could not confirm current release versions/dates of miniplex/bitECS (fetch didn't expose them); becsy was not researched.

## Data-driven content: JSON/TS data, dialogue (Ink / Yarn), Zod validation, hot reload

### Takeaway
Keep content as TypeScript data modules (`src/data/*.ts`) typed with `satisfies`, which gives free compile-time validation and Vite HMR; move to JSON + Zod only for content that is produced by external tools (Tiled/LDtk maps, Ink output) or user saves. For dialogue/quests, Ink via inkjs is the most mature web-ready option; Yarn's JS runtimes are community-maintained.

### Cited Findings
- inkjs: JavaScript port of inkle's ink, "full compatibility", zero dependencies; API `new Story(json)`, `Continue()`/`ContinueMaximally()`, `currentChoices`, `ChooseChoiceIndex()`, `variablesState`, and `state.ToJson()` for saves; an integrated compiler is available via the `/full` submodule; v2.x supports ink 1.0+ / JSON format 20+. — [inkjs on GitHub](https://github.com/y-lohse/inkjs)
- Yarn: no official `YarnSpinnerTool/YarnSpinner-JS` repo exists (404). Community options: bondage.js (Yarn parser for JS; stable version not fully Yarn 2 compliant) and yarn-bound (wrapper over a forked bondage.js aiming for Yarn 2.0 spec, simpler API, `isDialogueEnd`). — [bondage on npm](https://npmjs.com/package/bondage); [yarn-bound on npm](https://npmjs.com/package/yarn-bound)
- Zod 4 is the stable major version (4.6 recently released at fetch time); "2kb core bundle (gzipped)", zero dependencies, plus "Zod Mini" for smaller builds; `Schema.parse(input)` validates. — [zod.dev](https://zod.dev/)
- Vite supports JSON imports with named imports for tree-shaking, `import.meta.glob()` (with `{ eager: true }` to turn into direct imports), and an HMR API via `import.meta.hot`. Vite "only performs transpilation on .ts files and does NOT perform type checking." — [Vite Features](https://vite.dev/guide/features)

### Inferences
- The existing `FLOORS` array is already the right idea; split it by type, reference by string id:

```ts
// data/mobs.ts
export const MOBS = {
  boar:   { hp: 30, dmg: 6, speed: 70, ai: "charger", xp: 5, loot: "common_beast" },
  kobold: { hp: 45, dmg: 9, speed: 90, ai: "melee",   xp: 9, loot: "kobold" },
} satisfies Record<string, MobDef>;
export type MobId = keyof typeof MOBS;

// data/loot.ts — weighted tables
export const LOOT = { kobold: [{ item: "potion_s", w: 60 }, { item: "iron_sword", w: 5 }, { item: null, w: 35 }] } satisfies Record<string, LootEntry[]>;

// data/floors.ts
export const FLOORS: FloorDef[] = [{ id: 1, map: "floor1.tmj", mobs: ["boar", "kobold"], boss: "kobold_lord" }];
```

- `satisfies` + `keyof typeof` gives typo-checking of cross-references (`loot: "kobld"` fails at `tsc --noEmit`) without a runtime validator. Because Vite doesn't type-check, add `tsc --noEmit` as a script/CI step or rely on the editor.
- Zod belongs at trust boundaries: loading localStorage saves (old/corrupt versions), and external-tool JSON. Include a `version` field in saves and a migrate step.
- Ink fits NPC dialogue + quest flags: Ink variables can hold quest state, `state.ToJson()` serializes it into the save, and external functions can call into game code (give item, start quest). Flag: an Ink pipeline adds a compile step (inky editor or inkjs `/full`); for a few dozen lines of NPC barks, a plain TS array of lines is simpler — adopt Ink when branching/conditions appear.
- Hot reload: data in TS modules hot-reloads via Vite HMR automatically on full-module reload; for "live tuning" without losing game state, accept the data module in `import.meta.hot.accept` and swap the table in place.

### Gaps
- Did not verify Yarn Spinner's own (official) web/JS plans for 2025–2026; only community runtimes found.
- No GDC data-driven-design talk was fetched; data-driven guidance here rests on library docs plus inference.

## Maps: Tiled (.tmj) workflow, object layers, LDtk alternative, loading

### Takeaway
Tiled's JSON (.tmj) format is simple to load in vanilla JS: tile layers for visuals, an object layer for spawns/triggers/NPCs/exits with custom properties, and either a collision tile layer or collision rectangles. LDtk is a strong alternative with a cleaner entity/field model and IntGrid collision layers. Either is a big improvement over hand-coded tree positions in FLOORS; pick one and write a ~100-line loader rather than adopting a framework just for maps.

### Cited Findings
- Tiled JSON top-level fields include `width`, `height`, `tilewidth`, `tileheight`, `orientation`, `infinite`, `version`, `tiledversion`, `properties`; layer types `tilelayer` (data as array or base64, optional zlib/gzip/zstd compression), `objectgroup` (`objects` array), `imagelayer`, and `group`. — [Tiled JSON Map Format](https://doc.mapeditor.org/en/stable/reference/json-map-format/)
- Tiled objects have `id`, `name`, `x`, `y`, `width`, `height`, `rotation`, a `type`/`class` field, shapes (rect, ellipse, point, polygon, polyline), and a `properties` array of `{ name, type, value }` (types: string, int, float, bool, color, file, object, class). — [Tiled JSON Map Format](https://doc.mapeditor.org/en/stable/reference/json-map-format/)
- Tilesets are embedded or external `.tsj` via `source`, each with `firstgid` mapping global tile IDs; infinite maps use `chunks`. Tiled 1.9 renamed `type` to `class`; per the doc this was reverted in 1.10 for compatibility (so loaders should read `type ?? class`). — [Tiled JSON Map Format](https://doc.mapeditor.org/en/stable/reference/json-map-format/)
- LDtk JSON separates `defs` (layers, entities and their fields, tilesets, enums) from `levels` (`layerInstances`, `entityInstances`, `fieldInstances`, IntGrid layers); offers a "Super simple export", separate level files, and a published JSON schema. — [LDtk JSON overview](https://ldtk.io/docs/game-dev/json-overview/) (page showed "1.2.2, Jan 2023" which may be a stale doc stamp; current LDtk version not verified)

### Inferences
- Workflow: in Tiled, disable "infinite", keep CSV/array encoding (no compression), use external tilesets carefully (or embed to keep one file), and create layers: `ground` (tiles), `deco` (tiles, drawn over player if needed), `collision` (tile layer with one "solid" tile, or object rects), `entities` (objects: `type` = `spawn_mob`, `boss`, `npc`, `exit`, `trigger`, `chest`, with properties like `mob=kobold`, `count=3`, `dialogue=smith_intro`).
- Loader shape:

```ts
// maps/loadTiled.ts
export function loadMap(tmj: TiledMap) {
  const solid = tmj.layers.find(l => l.name === "collision" && l.type === "tilelayer")!.data!;
  const objs = tmj.layers.filter(l => l.type === "objectgroup").flatMap(l => l.objects!);
  const props = (o: TiledObject) => Object.fromEntries((o.properties ?? []).map(p => [p.name, p.value]));
  return {
    w: tmj.width, h: tmj.height, tile: tmj.tilewidth,
    isSolid: (tx: number, ty: number) => solid[ty * tmj.width + tx] !== 0,
    spawns: objs.map(o => ({ kind: o.type ?? (o as any).class, x: o.x, y: o.y, ...props(o) })),
  };
}
```

- Pre-render static tile layers to an offscreen canvas once per floor and blit with camera offset — big win for Canvas 2D perf, especially on mobile.
- Choosing: Tiled is more general and widely supported by engines; LDtk is purpose-built for 2D levels with typed entity fields and auto-tiling, which suits per-floor dungeon layouts. Both import into Phaser/Pixi via plugins, but for vanilla Canvas a hand loader is the lightest path.

### Gaps
- Did not fetch Phaser/Pixi Tiled loader docs or LDtk "Super simple export" details; current LDtk version unconfirmed.

## Asset pipeline: atlases, Aseprite export, audio formats/sprites, preloading, Vite

### Takeaway
Pack sprites into one or a few atlases (Aseprite CLI export or free-tex-packer) with JSON frame data, preload everything per floor behind a simple loading screen using Promise.all, and for audio ship a widely-decodable format (MP3 or AAC/M4A) as baseline — Safari's Web Audio decode support for Ogg/WebM has historically lagged. howler.js gives audio sprites and fallbacks if the hand-rolled SFX object becomes painful.

### Cited Findings
- Aseprite CLI exports sprite sheets with JSON: `--sheet`, `--data`, `--format json-array`, `--sheet-pack`, `--list-tags` (animation tags in JSON), `--split-layers`, `--filename-format`. Example: `aseprite -b --split-layers animation.ase --sheet sheet.png --data sheet.json --format json-array --list-tags --filename-format '{title}-{layer}-{frame}.png'`. — [Aseprite CLI docs](https://www.aseprite.org/docs/cli/)
- Safari 15 added WebM/Opus for the `<audio>` element but not for Web Audio `decodeAudioData()` (2021). — [AppleInsider, Aug 2021](https://appleinsider.com/articles/21/08/10/apple-adds-webm-web-audio-support-to-safari-in-latest-ios-15-beta)
- Ogg Opus/Vorbis support arrived in Safari 18.4 (March 2025, macOS 15.4/iOS 18.4), but a 2025 tester reports it as incomplete/buggy. — [frequal.com: Ogg Opus still not working in Safari 18.4](https://frequal.com/java/OggOpusStillNotWorkingInSafari18_4.html) (individual developer report; treat as anecdotal); WebKit tracking bug: [WebKit Bugzilla 183852](https://bugs.webkit.org/show_bug.cgi?id=183852)
- howler.js: audio sprites ("define and control segments of files"), defaults to Web Audio and falls back to HTML5 Audio, ~7 KB gzipped, zero dependencies. — [howlerjs.com](https://howlerjs.com/)
- Vite static assets: `?url` imports an asset as a URL, `?raw` as a string; `import.meta.glob` can enumerate asset folders. — [Vite Features](https://vite.dev/guide/features)

### Inferences
- Atlas use in Canvas 2D: `ctx.drawImage(atlasImg, f.x, f.y, f.w, f.h, dx, dy, f.w, f.h)` with frame rects from the JSON; animation = tag name -> frame range + per-frame duration (Aseprite JSON includes durations). One `assets/` source folder with `.ase` files and a `npm run sprites` script calling the Aseprite CLI keeps art reproducible.
- Audio: since SFX are currently synthesized in Web Audio, keep that (zero assets!). When adding recorded music/SFX, ship MP3 (or M4A) for universal decode; optionally Opus/WebM for Chromium/Firefox with MP3 fallback. Remember the iOS/Chrome rule that the AudioContext must be resumed in a user gesture (first click/tap on the title screen).
- Preloader shape:

```ts
// core/assets.ts
const images = new Map<string, HTMLImageElement>();
export const loadImage = (url: string) => new Promise<HTMLImageElement>((res, rej) => {
  const i = new Image(); i.onload = () => { images.set(url, i); res(i); }; i.onerror = rej; i.src = url; });
export async function preload(urls: string[], onProgress: (p: number) => void) {
  let done = 0;
  await Promise.all(urls.map(u => loadImage(u).then(() => onProgress(++done / urls.length))));
}
```

- Vite: put atlases in `src/assets` and import with `?url` (hashed filenames, cache-busting); put large/rarely changed files (music) in `public/`. Over-engineering flag: no need for a separate asset build tool, manifest generator, or texture compression at this scale.

### Gaps
- free-tex-packer docs not fetched; MDN's current codec compatibility table for Safari Web Audio not fetched — verify Ogg decode on a real iPhone before relying on it.

## Event bus / messaging and decoupling DOM UI from game state

### Takeaway
Use a tiny typed event emitter for one-to-many "something happened" notifications (hit, kill, levelUp, itemPicked, bossPhase) so combat doesn't directly call audio/particles/UI; keep direct function calls for everything else. DOM UI should read game state (or subscribe to events) and dispatch commands, never own game state.

### Cited Findings
- Nystrom's Component chapter points to messaging / the Event Queue pattern as an option for communication between decoupled parts, while warning against over-engineering. — [Game Programming Patterns: Component](https://gameprogrammingpatterns.com/component.html)
- Nystrom's FSM chapter lists menu navigation and input handling as natural FSM uses — supporting modeling DOM menus as scenes/states rather than ad-hoc flags. — [Game Programming Patterns: State](https://gameprogrammingpatterns.com/state.html)

### Inferences
- Typed bus in ~10 lines (no library needed; `EventTarget` also works but loses payload typing):

```ts
// core/events.ts
type Events = {
  hit: { target: Entity; dmg: number; crit: boolean; x: number; y: number };
  death: { entity: Entity };
  itemPicked: { itemId: ItemId; qty: number };
  bossPhase: { bossId: string; phase: number };
};
type Handler<K extends keyof Events> = (e: Events[K]) => void;
const subs: { [K in keyof Events]?: Handler<K>[] } = {};
export const on = <K extends keyof Events>(k: K, h: Handler<K>) => ((subs[k] ??= []) as Handler<K>[]).push(h);
export const emit = <K extends keyof Events>(k: K, e: Events[K]) => subs[k]?.forEach(h => (h as Handler<K>)(e));

// systems/combat.ts: emit("hit", {...}); time.hitStop = 0.06;
// audio/sfx.ts:      on("hit", e => sfx.play(e.crit ? "crit" : "hit"));
// fx/particles.ts:   on("hit", e => spawnSparks(e.x, e.y));
// ui/hud.ts:         on("itemPicked", e => toast(`+${e.qty} ${ITEMS[e.itemId].name}`));
```

- Over-engineering flags: don't route everything through the bus (input, movement, per-frame updates) — it hides control flow and makes debugging harder. A deferred queue (Nystrom's Event Queue) is only needed if handlers mutate the same lists being iterated (e.g. spawning entities during collision loops) — in that case collect spawns in a `pending` array and flush after the step.
- DOM/canvas split: canvas HUD for per-frame info (HP bars, damage numbers); DOM for menus, inventory, dialogue boxes (better text, accessibility, touch input). DOM scenes call `scenes.push(...)` / game commands (`equip(itemId)`), and render from state on `enter()` or on events; they never cache their own copy of inventory.
- Mobile: input abstraction (`input.move: {x,y}`, `input.attack: boolean`) fed by keyboard or an on-screen joystick keeps systems input-agnostic.

### Gaps
- Did not fetch Nystrom's Observer/Event Queue chapters directly or an open-source HTML5 game demonstrating this split; guidance is inference.

## Recommended folder structure

### Takeaway
Move to Vite + TypeScript with a flat, concern-based layout; aim for ~15–25 files, not a deep framework. Migrate incrementally: extract data first, then the loop/scenes, then systems, keeping the game runnable after each step.

### Cited Findings
- Vite provides the dev server with HMR, JSON/asset imports, and glob imports used by this layout; it transpiles TS without type-checking. — [Vite Features](https://vite.dev/guide/features)
- Nystrom warns against applying architectural patterns to "a non-existent problem." — [Game Programming Patterns: Component](https://gameprogrammingpatterns.com/component.html)

### Inferences
- Concrete layout:

```
sword-art-on-you/
  index.html               # canvas + DOM UI roots only
  package.json             # scripts: dev, build, typecheck (tsc --noEmit), sprites (aseprite CLI)
  public/                  # music, large static files (served as-is)
  art-src/                 # .ase / .tmx / .ink sources (not shipped)
  src/
    main.ts                # boot: load save, preload, push TitleScene, startLoop
    core/
      loop.ts              # fixed-step accumulator, timeScale, hitStop
      scenes.ts            # scene stack
      input.ts             # keyboard/touch -> intent
      events.ts            # typed emit/on
      assets.ts            # preload images/json
      save.ts              # localStorage + Zod schema + version migrate
      rng.ts               # seeded RNG (loot, AI) — optional
    scenes/
      title.ts  play.ts  pause.ts  dialogue.ts  inventory.ts  gameover.ts
    world/
      world.ts             # entity lists, current floor, camera
      types.ts             # Entity union, defs types
      spawn.ts             # create entities from defs + map objects
    systems/
      player.ts            # player FSM, combo/dodge
      mobAI.ts             # small FSMs by ai id
      bossAI.ts            # phases + MOVES table
      combat.ts            # hitboxes, damage, i-frames, emits events
      physics.ts           # movement + tile collision
      loot.ts  inventory.ts  quests.ts
    render/
      draw.ts              # entities, map prerender, camera, interpolation
      hud.ts               # canvas HUD
      particles.ts
    audio/
      sfx.ts               # existing Web Audio SFX object, subscribes to events
    ui/                    # DOM menus/inventory/dialogue panels
    data/
      floors.ts  mobs.ts  bosses.ts  items.ts  loot.ts  npcs.ts  quests.ts
      dialogue/*.ink.json  # if/when Ink is adopted
    maps/
      loadTiled.ts
  assets/ (or src/assets/) # atlases (png+json), tmj maps
```

- Migration order (each step shippable): (1) Vite + rename to `main.js`, no TS yet; (2) move FLOORS into `data/`; (3) extract loop + scene stack, delete state string; (4) split update/draw into systems/render by concern; (5) add TS gradually (`allowJs`, `checkJs`); (6) add Tiled maps, items/inventory, events; (7) Ink/NPCs, mobile input.
- Explicit over-engineering risks to avoid at this scale: full ECS libraries, dependency injection, a generic plugin/system scheduler, a custom asset build pipeline, behavior-tree frameworks, and switching to Phaser purely for structure (it brings its own scene/loader/tilemap model — a reasonable choice only if a rewrite is acceptable).

### Gaps
- Did not review specific open-source HTML5 action RPG repos or the official Phaser Vite/TS template to compare layouts; the structure above is synthesized from patterns, not copied from a verified exemplar.
