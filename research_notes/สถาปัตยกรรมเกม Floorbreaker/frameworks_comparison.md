# Browser 2D Game Frameworks vs Staying Vanilla, for migrating "Sword Art On You" (status as of Oct 2026)

Research date: 2026-10-07. Version numbers, dates, licenses and download counts come straight from the npm registry API (`registry.npmjs.org/<pkg>`, `api.npmjs.org/downloads`) unless another source is cited. Bundle sizes come from the bundlephobia API (full minified ESM/CJS build before tree-shaking, gzip). These are upper bounds; tree-shaking can reduce them, PixiJS v8 especially.

## Comparison table (summary)

| Option | Latest stable (date) | Pre-release / next | Maintenance (Oct 2026) | npm downloads (Sep 5 to Oct 4, 2026) | License | Bundle (min / gzip) | TypeScript |
|---|---|---|---|---|---|---|---|
| Phaser 4 | 4.2.1 "Giedi" (2026-07-09) | none | Active: 4.0.0 on 2026-04-10, 4.1.0 on 04-30, 4.2.0 on 06-19, 4.2.1 on 07-09 | 1,674,463 | MIT | 1.37 MB / 356 KB | Yes, official TS types and Vite TS template |
| Phaser 3 | 3.90.0 (2025-05-23) | n/a | Last 3.x release is 3.90.0. No later 3.x on npm | (same package) | MIT | not measured (rate-limited) | Yes |
| PixiJS v8 | 8.22.0 (2026-10-01) | 8.22.0-dev builds daily | Very active, monthly minors (8.18/8.19 in Jun 2026, 8.20 in Aug 2026) | 4,686,550 | MIT | 925 KB / 265 KB (tree-shakeable) | Written in TS |
| @pixi/sound | 6.0.1 (2024-07-27) | none | No release in more than 2 years | n/a | MIT | n/a | TS |
| @pixi/tilemap | 5.0.2 (2025-07-14) | none | Slow | n/a | MIT | n/a | TS |
| KAPLAY | 3001.0.19 (2025-06-15), npm `latest` | 4000.0.0-alpha.27.1 (2026-05-12), npm `next` | v4000 still alpha after more than a year, with breaking changes; v3001 frozen | 30,780 | MIT | 184 KB / 67 KB (v3001) | Yes |
| Excalibur.js | 0.32.0 (2025-12-23) | 0.33.0-alpha.247 (2026-09-21) | Active alpha stream; still pre-1.0 | 40,178 | BSD-2-Clause | 571 KB / 145 KB | Written in TS (TS-first) |
| LittleJS | 1.25.0 (2026-10-04) | none | Active (release 3 days before research date) | 5,871 | MIT | 361 KB / 125 KB full build | JS with TS support / types |
| Godot 4 web export | Docs at Godot 4.7 "stable" | n/a | Active | n/a | MIT | roughly 35 MB uncompressed .wasm, plus .pck | GDScript; C# cannot export to web |
| Vanilla Canvas + TS + Vite | n/a | n/a | You maintain it | n/a | n/a | 0 KB engine | Opt-in |

### Feature matrix (built-in, without third-party add-ons)

| Feature | Phaser 4 | PixiJS v8 | KAPLAY | Excalibur | LittleJS | Godot 4 | Vanilla |
|---|---|---|---|---|---|---|---|
| Scenes | Yes | No (DIY with Containers) | Yes (`scene()`/`go()`) | Yes, with transitions and per-scene loading | Minimal (DIY) | Yes | DIY (already informal) |
| Collision / physics | Arcade (AABB/circle) + Matter.js | No | Area/body components | Full 2D physics, ECS, sleeping bodies | Tile collision + Box2D plugin | Full | Custom circle-vs-rect (exists) |
| Tilemaps / Tiled | Tilemap + Tiled JSON loader | @pixi/tilemap (renderer only) | `addLevel()` ASCII maps | `@excaliburjs/plugin-tiled` 0.32.0 | Tile layers + built-in level editor | TileMap + editor | Offscreen canvas (exists) |
| Sprite animation | Yes | AnimatedSprite | Yes | Yes | Yes | Yes | Custom (exists) |
| Input: kb/mouse/gamepad/touch | All | Pointer events only | All | All | All, incl. gamepad/touch | All | DIY |
| Audio | WebAudio sound manager | @pixi/sound add-on | Yes | Yes, plus `SoundManager` channels since 0.31 | ZzFX synth + spatial audio | Yes (web caveats) | Web Audio + HTMLAudio (exists) |
| Camera | Yes (follow, shake, zoom, bounds) | DIY (container transform) | Yes | Yes | Yes | Yes | DIY (shake exists) |
| Particles | Yes | ParticleContainer (renderer only) | Yes | GPU particle emitters (0.30) | Yes, with design tool | Yes | Custom (exists) |
| Filters/lighting | Unified Filter system, 1-line lights | Filters (pixi-filters 6.1.5) | Shaders | Materials/shaders | Shaders | Full | DIY |

---

## Is Phaser 4 released/stable? What changed vs Phaser 3? Is Phaser 3.8x still recommended?

### Takeaway
Yes. Phaser 4.0.0 "Caladan" shipped as stable on 2026-04-10 and has had three releases since (latest 4.2.1, 2026-07-09). The official Vite TS template now targets Phaser 4. Phaser 3's last release is 3.90.0 (May 2025), so new projects should start on Phaser 4. The 3-to-4 changes mostly affect renderer internals, not gameplay APIs.

### Cited Findings
- Phaser v4.0.0 "Caladan" was released on 10 April 2026, and v4.1.0 "Salusa" followed on 30 April 2026 — [phaser.io download](https://phaser.io/download/stable) (search snippet); npm confirms 4.0.0 on 2026-04-10, 4.1.0 on 04-30, 4.2.0 on 06-19 and 4.2.1 on 07-09 — [npm registry](https://registry.npmjs.org/phaser)
- The current stable release is "Phaser v4.2.1 'Giedi' … released on 9th July 2026" — [phaser.io/download/stable](https://phaser.io/download/stable)
- The final pre-release was 4.0.0-rc.7 (2026-03-25). The newest Phaser 3 release on npm is 3.90.0 (2025-05-23), after 3.88.2 (2025-02-13) — [npm registry](https://registry.npmjs.org/phaser)
- Phaser 4 has a new renderer. Phaser claims it can render "over a million animated sprites in a single draw call", up to 100x faster than before (vendor claim). The public API was kept "almost identical", and most Phaser 3 games "will just work" — [phaser.io/phaser4](https://phaser.io/phaser4)
- Phaser 4 adds a unified Filter system (bloom, glow, shadow, blur) that works on any game object or camera, plus lighting in one line of code and sprite self-shadows — [phaser.io/phaser4](https://phaser.io/phaser4)
- Breaking changes listed in the migration guide:
  - v3 `Pipeline` system removed and replaced by "RenderNodes"
  - FX and Masks unified into Filters; `BitmapMask` removed
  - `Point` deprecated in favor of `Vector2`
  - `Mesh`/`Plane` removed; `Math.PI2` replaced by `Math.TAU`
  - Bundled Spine 3/4 plugins removed
  - **Canvas renderer "should be considered deprecated"**
  - **`roundPixels` now defaults to `false`**
  - Texture coordinates now follow OpenGL convention (Y=0 at bottom)
  - Source: [Phaser v4 Migration Guide](https://github.com/phaserjs/phaser/blob/master/changelog/v4/4.0/MIGRATION-GUIDE.md)
- Phaser 4.2.1 measures 1.37 MB minified / 356 KB gzip as one non-tree-shakeable bundle — [bundlephobia API](https://bundlephobia.com/package/phaser@4.2.1)
- A 2026 comparison (reposted by Phaser News, Apr 2026) rated Phaser the most stable and best performing of Phaser/KAPLAY/Excalibur. It singled out Safari/iOS (WebKit) performance and noted that AI assistants give more accurate Phaser answers because more documentation exists — [JSLegendDev substack](https://jslegenddev.substack.com/p/i-tried-3-web-game-frameworks-so); [Phaser news repost](https://phaser.io/news/2026/04/phaser-vs-kaplay-vs-excalibur-2d-web-game-framework). This source is partisan because Phaser republished it.

### Inferences
- For a pixel-art game, Phaser 4's `roundPixels=false` default matters: set `pixelArt: true` / `roundPixels: true` in the game config to avoid shimmering sprites. Verify the exact config keys in the v4 docs.
- Phaser 3.90 still works, but it receives no new releases and most tutorials will migrate to v4. The only reason to choose 3.x is if a needed plugin (e.g. the old Spine plugins) has not been ported.
- The Canvas renderer is deprecated, so a Phaser 4 port should assume WebGL. Mobile WebGL support is universal in 2026, so this is fine.

### Gaps
- No official statement was found on whether Phaser 3 will get security or bug-fix releases. The absence of any 3.x release after May 2025 suggests it won't.
- No independent benchmark of Phaser 4 vs Phaser 3 was found beyond Phaser's own claims.

---

## PixiJS v8 is a renderer, not an engine. What pieces would need adding?

### Takeaway
PixiJS v8 (8.22.0, 2026-10-01) is the most actively maintained and most downloaded option (about 4.7M downloads/month). It gives you a fast WebGL/WebGPU scene graph, sprites, AnimatedSprite, ParticleContainer, filters and pointer events. You would still build the game loop structure, scenes, collision, keyboard/gamepad input, camera, tile maps and audio yourself or from add-ons, and the add-ons are maintained less actively than the core.

### Cited Findings
- Latest is 8.22.0 (2026-10-01), with daily dev builds (8.22.0-dev on 2026-10-07). Legacy 7.x line: 7.4.3 (2025-03-06) — [npm registry](https://registry.npmjs.org/pixi.js)
- v8.20.0 (Aug 2026) focused on the WebGPU path: WGSL overrides, render bundles, a Safari WGSL fallback, an opt-in `RenderOptions.flipY`, and a ParticleContainer tint/alpha fix. It also had a silent breaking change: `StructsAndGroups.isUniform` was replaced by `accessMode` — [GameDev.net](https://gamedev.net/news/5221-pixijs-v8200-released/)
- June 2026 shipped v8.18.0 (Graphics-to-SVG export) and v8.19.0 (live HTML-in-Canvas textures that render DOM elements as GPU textures). The project passed 500k weekly npm downloads. Its official ecosystem includes Spine, Filters, Sound, UI, React, Layout, DevTools and AssetPack. The blog doesn't mention v9 — [PixiJS blog, June 2026](https://pixijs.com/blog/june-2026)
- Add-on maintenance:
  - `@pixi/sound` 6.0.1, last published 2024-07-27
  - `@pixi/tilemap` 5.0.2 (2025-07-14)
  - `pixi-filters` 6.1.5 (2025-11-29)
  - Source: [npm registry](https://registry.npmjs.org/@pixi/sound)
- Full bundle is 925 KB minified / 265 KB gzip, before tree-shaking — [bundlephobia API](https://bundlephobia.com/package/pixi.js@8.22.0)

### Inferences
- What you would add for this ARPG:
  1. Scene/state manager. Your existing code likely already has one; port it to swap Pixi Containers.
  2. Collision. Keep your existing circle-vs-rect code (PixiJS has none).
  3. Keyboard and gamepad input. Keep your existing code or use the Gamepad API (PixiJS has only pointer events).
  4. Camera. A world Container with position/scale, with shake applied to its offset.
  5. Tile map. Bake to a RenderTexture (equivalent to your offscreen canvas) or use @pixi/tilemap. Tiled support means writing a small JSON parser yourself.
  6. Audio. Keep your Web Audio synth + HTMLAudio. @pixi/sound is optional and stale.
  7. Y-sorting. `container.sortableChildren = true` + `zIndex = y`, or manual sort.
- PixiJS is therefore the smallest jump in mental model from vanilla canvas: it replaces `drawImage` with sprites and keeps everything else. You gain little for gameplay structure. At about 30 entities, Canvas2D is not a bottleneck, so PixiJS's main draw (GPU throughput) barely matters here.
- The HTML-in-Canvas textures feature (8.19) is interesting, but DOM overlays over the canvas still work as-is.

### Gaps
- Exact list of v8 features without the add-ons was not re-verified on the pixijs.com docs in this session. The DIY list above reflects PixiJS's documented scope as a renderer.
- No source was found on whether `@pixi/sound` is officially deprecated or just stable/finished.

---

## KAPLAY maturity/stability in 2025-2026; Excalibur 0.30+ status; LittleJS suitability

### Takeaway
- **KAPLAY** is split. Stable v3001 is frozen (last release 3001.0.19, June 2025), and v4000 has been alpha since 2025 with breaking changes in each alpha, the latest alpha.27.1 from May 2026. That makes it risky for a project meant to grow.
- **Excalibur** is TS-first and actively developed. It's still pre-1.0 (stable 0.32.0, Dec 2025; 0.33 alphas through Sep 2026) and has an official Tiled plugin.
- **LittleJS** is active (1.25.0, Oct 2026), small and fast, with tile collision, gamepad/touch, particles and a ZzFX synth. Its tiny community makes it a niche choice.

### Cited Findings
- KAPLAY npm dist-tags: `latest` = 3001.0.19 (2025-06-15), `next` = 4000.0.0-alpha.27.1 (2026-05-12). v3001.0.2 was published 2024-11-01 — [npm registry](https://registry.npmjs.org/kaplay)
- KAPLAY v3001 was released Oct 31, 2024 as the Kaboom successor — [KAPLAY itch devlog](https://imaginary.itch.io/kaplobby/devlog/838891/the-egg-has-finally-hatched)
- Recent KAPLAY alphas:
  - v4000.0.0-alpha.26 (2026-01-12): sensor areas
  - alpha.27 (2026-03-19): breaking changes to the sprite data format and primitive UVs
  - alpha.27.1 (2026-05-12)
  - v3001.0.19 is described as the last v3001 release
  - Source: [KAPLAY GitHub releases](https://github.com/kaplayjs/kaplay/releases)
- The kaplayjs.com homepage banner promotes trying the "@next" (v4000) version — [kaplayjs.com](https://kaplayjs.com/). This contradicts npm `latest`, which still points at v3001, so the project itself sends mixed signals.
- A 2026 comparison judged KAPLAY the easiest to learn and good for jams and prototypes, but said "performance limitations will eventually surface on larger projects". It found Excalibur closest to Phaser, with a concise API and an impressive browser-extension debug mode, but needing more manual work — [JSLegendDev substack](https://jslegenddev.substack.com/p/i-tried-3-web-game-frameworks-so)
- KAPLAY v3001 bundle: 184 KB minified / 67 KB gzip — [bundlephobia API](https://bundlephobia.com/package/kaplay@3001.0.19)
- Excalibur npm: `latest` = 0.32.0 (2025-12-23), `next` = 0.33.0-alpha.247 (2026-09-21). Licensed BSD-2-Clause. `@excaliburjs/plugin-tiled` 0.32.0 was published the same day (2025-12-23) — [npm registry](https://registry.npmjs.org/excalibur). The GitHub releases summary I fetched gave 0.32.0's date as Dec 23 **2024**. npm's timestamp (2025) is authoritative.
- Excalibur release contents:
  - 0.30.0: GPU particle emitters, nine-slice graphics, scene-specific loading and transitions
  - 0.31.0: `SoundManager` channels, Query filtering, `maxVel`
  - 0.32.0: performance gains for tilemaps/physics/offscreen rendering, consistent body sleeping, Debug Draw browser extension, online playground
  - Source: [Excalibur GitHub releases](https://github.com/excaliburjs/Excalibur/releases)
- Excalibur bundle: 571 KB minified / 145 KB gzip — [bundlephobia API](https://bundlephobia.com/package/excalibur@0.32.0)
- LittleJS 1.25.0 was published 2026-10-04 under the MIT license — [npm registry](https://registry.npmjs.org/littlejsengine)
- LittleJS README claims:
  - WebGL2 + Canvas2D hybrid rendering
  - Tilemap collision, gamepad/touch input, ZzFX sound generator with spatial audio, particle system with a design tool
  - Box2D plugin, A* pathfinding, 2D/3D level editors, UI system with tweens
  - Zero dependencies; about 135 KB gzip full build, about 26 KB for minimal 2D games
  - About 4.2k GitHub stars and 100+ examples
  - Source: [LittleJS GitHub](https://github.com/KilledByAPixel/LittleJS)
- Bundlephobia measured LittleJS 1.25.0 at 361 KB minified / 125 KB gzip. That roughly matches the README's 135 KB claim — [bundlephobia API](https://bundlephobia.com/package/littlejsengine@1.25.0)
- Downloads (Sep 5 to Oct 4, 2026): Excalibur 40,178, KAPLAY 30,780, LittleJS 5,871. For comparison, Phaser had 1.67M and PixiJS 4.69M — [npm downloads API](https://api.npmjs.org/downloads/point/last-month/excalibur)

### Inferences
- **KAPLAY**: picking v3001 means a frozen codebase. Picking v4000 means alpha churn (the sprite data format changed in alpha.27). Neither suits a multi-year growth plan. Its "everything is a component tag" style also differs a lot from the existing vanilla OOP/loop code.
- **Excalibur** is the best "real engine, TypeScript-native" alternative to Phaser:
  - Built in: ECS, physics, Tiled plugin, sound channels, debug extension
  - Risks: pre-1.0 API changes between minors, and a community roughly 40x smaller than Phaser's by downloads
- **LittleJS** comes closest in spirit to the current code: a small, fast engine with a fixed-timestep loop, built-in tile collision, particles and synthesized sound (ZzFX, similar to the current Web Audio SFX). It suits the ~30-entity scale well. The trade-offs are a single-maintainer project, a tiny community, and less help available from docs and AI tools.

### Gaps
- No primary source on an Excalibur 1.0 date was found. The blog's "roadmap" link was not retrieved.
- No KAPLAY v4000 stable release date has been announced (the State of KAPLAY posts were not fetched).
- No independent performance benchmarks for LittleJS/Excalibur/KAPLAY at small entity counts were found. At 30 entities, all are expected to hit 60 fps easily (inference).

---

## Godot web export limitations (file size, startup, threads/SharedArrayBuffer, Safari/mobile) for itch.io

### Takeaway
Godot 4 (docs at 4.7 stable) can ship to itch.io using the default single-threaded export, which avoids the COOP/COEP header problem. But it's a full rewrite in GDScript, C# can't export to web, builds are tens of MB, and Safari/mobile web performance is weaker. It's a viable off-ramp only if the game outgrows the browser-first approach or targets native and mobile app stores.

### Cited Findings
- Exporting-for-web docs (Godot 4.7):
  - Single-threaded export is now the default and preferred option. Multi-threaded export needs `SharedArrayBuffer`, HTTPS, and the headers `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`. A PWA/service-worker workaround exists.
  - itch.io "doesn't provide on-the-fly compression".
  - "Safari has several issues with WebGL 2.0 support".
  - Web exports perform worse than native mobile exports.
  - "Projects written in C# using Godot 4 currently cannot be exported to the web."
  - Default sample-based audio has low latency but no effects support.
  - Custom export templates with unused features disabled are recommended to cut size and startup time.
  - Source: [Godot docs: Exporting for the Web](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html)
- A Dec 2024 forum report (Godot 4.x) measured a 35 MB .wasm plus a 56 MB .pck for a project with about 5 MB of assets. A responder said going below 10 MB is unrealistic without custom engine builds — [Godot Forum](https://forum.godotengine.org/t/export-optimising-a-build-for-size/94584)
- A secondary summary claims an empty Godot 4.4 project yields about 35 MB of WASM (about 25 MB after stripping), and that WASM gzips to about a quarter of its size. Treat this as approximate because it comes from search snippets of aggregator pages — [Godot web export guide (summerengine)](https://www.summerengine.com/ja/blog/godot-web-export-guide); [DEV Community](https://dev.to/ziva/godot-4-fur-web-spiele-export-wasm-und-browser-performance-4315)
- itch.io HTML5 limits: no single extracted file over 200 MB, 500 MB total (from search snippet) — [search summary citing itch.io/Godot forum](https://forum.godotengine.org/t/godot-export-to-the-web-issues/118678)

### Inferences
- Compared with the current game (one HTML file plus a sprite pack, likely under 5 MB), Godot multiplies download size by about 10x. itch.io doesn't compress on the fly, so players download the raw ~35 MB wasm unless you pre-compress, which itch.io doesn't serve with `Content-Encoding`. Startup takes seconds on mobile.
- The DOM overlay menus (HTML/CSS) can't carry over. All UI would be rebuilt in Godot Control nodes.
- Godot pays off only if the plan shifts toward native desktop or mobile builds or much larger content (editor-driven levels, many NPCs).

### Gaps
- No 2026-specific measurements of Godot 4.6/4.7 web build size or iOS Safari behavior were found. Figures are from Godot 4.x in 2024-2025 and may be outdated.

---

## Which option minimizes rewrite while maximizing future capability for a pixel-art top-down ARPG of this scope? Is a full engine overkill?

### Takeaway
At ~1000 lines, 3 floors and ~30 entities, performance isn't a reason to switch. Structure, tooling and content pipeline are. The recommended path has two stages:
1. **Now (low risk):** move to Vite + TypeScript ES modules, keep the vanilla Canvas 2D code, and split it into modules (loop, input, collision, entities, tilemap, audio, UI, save). Optionally adopt Tiled JSON for maps.
2. **If/when content grows (new floors, items, NPCs, mobile/touch, gamepad):** port to **Phaser 4**, the best supported and most stable option with every needed feature built in and the largest docs/AI knowledge base. **Excalibur** is the TS-first alternative and **LittleJS** the minimalist one.

Use PixiJS only if rendering becomes a bottleneck (it won't at this scale). Avoid KAPLAY while v4000 is still alpha. Keep Godot as a native/mobile off-ramp only.

### Cited Findings
- Phaser 4 is stable with frequent releases, and the official `phaserjs/template-vite-ts` template targets Phaser 4 with Vite 6.3.1 and TypeScript 5.7.2. Commands are `npm run dev` (localhost:8080) and `npm run build` to `dist/`. Static assets go in `public/assets/`. The template sends anonymous telemetry via `log.js`; disable it with `npm run dev-nolog` / `build-nolog` — [phaserjs/template-vite-ts](https://github.com/phaserjs/template-vite-ts)
- Phaser offers a `create-game-app` scaffolding tool for bundlers such as Vite, and a "Phaser Launcher" app — [phaser.io/download/stable](https://phaser.io/download/stable)
- Phaser was judged the strongest choice for stability and Safari/iOS performance. KAPLAY will hit performance limits on larger projects. Excalibur "isn't different enough to justify switching from Phaser" — [JSLegendDev substack](https://jslegenddev.substack.com/p/i-tried-3-web-game-frameworks-so)
- Engine sizes (gzip): Phaser 4.2.1 356 KB, PixiJS 8.22 265 KB, Excalibur 0.32 145 KB, LittleJS 1.25 125 KB, KAPLAY 3001 67 KB — [bundlephobia API](https://bundlephobia.com/)
- Godot web needs 30+ MB downloads and has Safari WebGL2 issues — [Godot docs](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html); [Godot Forum](https://forum.godotengine.org/t/export-optimising-a-build-for-size/94584)

### Inferences

**Migration effort from the current vanilla code (estimates, not sourced):**

| Target | What survives | What gets rewritten | Effort |
|---|---|---|---|
| Vanilla + Vite/TS modules | ~100% of logic; DOM menus; Web Audio; saves | Only file split, types and imports | Low (days) |
| LittleJS | Game logic, SFX ideas, DOM overlays | Rendering calls, loop, collision to `EngineObject`/tile collision | Medium |
| PixiJS v8 | Collision, input, audio, loop, DOM menus, saves | `drawImage` to Sprites; offscreen tilemap to RenderTexture; camera to Container | Low to medium |
| Phaser 4 | Game rules/data, DOM menus (canvas parent + absolutely positioned DOM), localStorage saves | Loop to `Scene.update`; entities to Sprites + Arcade bodies; tilemap to Tiled + Tilemap; particles, shake and hit-stop to built-ins (`camera.shake`, `time.timeScale`/pausing); audio to Phaser Sound or keep Web Audio | Medium to high (near-full rewrite of engine-side code, about 1-2 weeks hobby time) |
| Excalibur | Same as Phaser | Same as Phaser, ECS-style | Medium to high |
| KAPLAY | Game rules | Everything, plus component/tag paradigm | Medium to high, with alpha churn |
| Godot 4 | Art assets, design | Everything incl. UI (GDScript + Control nodes) | Very high |

**Is a full engine overkill?**
- For today's scope, mostly yes. Hit-stop, shake, particles, y-sort and collision already exist and work.
- What the developer actually lacks is architecture (modules, types, a scene/state machine, data-driven content), and Vite + TS provides that without an engine.
- An engine starts to pay off with:
  - Tiled-authored floors (Phaser/Excalibur load these natively)
  - Gamepad and touch input on mobile (Phaser/Excalibur/LittleJS have these built in)
  - Camera follow/bounds/zoom
  - Asset loading with progress
  - Audio unlock on iOS

**DOM UI overlays:**
- Every web option (vanilla, Pixi, Phaser, Excalibur, LittleJS, KAPLAY) renders into a `<canvas>`. HTML/CSS menus can stay as absolutely positioned siblings over the canvas, so the existing overlay menus survive.
- Phaser also has a DOM Element game object (`dom: { createContainer: true }` config). This is from my own knowledge of Phaser and not verified this session.
- Godot cannot reuse them.

**Pixel-art specifics:**
- Phaser: set `pixelArt: true` because v4's `roundPixels` defaults to false.
- Pixi: `TextureSource.defaultOptions.scaleMode = 'nearest'`.
- Vanilla: `ctx.imageSmoothingEnabled = false`.
- The Pixi and vanilla settings are from my own knowledge and not re-verified this session.

**Build tooling:**
- Vite + TypeScript is the standard (Phaser's official template uses it).
- `python -m http.server` can still serve the `vite build` output in `dist/`, and itch.io accepts that zipped `dist/` folder directly.
- Set `base: './'` in `vite.config` so asset paths are relative for itch.io. This is standard Vite practice from my own knowledge, not sourced here.

### Gaps
- No 2025-2026 Reddit/HN threads specifically about migrating a vanilla canvas ARPG were retrieved. The main community evidence is one comparison article that Phaser republished.
- No sourced data on Phaser 4 tree-shaking or custom builds to reduce its 356 KB gzip size.
- The migration effort estimates above are reasoned judgments, not measured data.
