# Quality, Saves, Performance, Deployment and IP for "Sword Art On You" (HTML5 Canvas hobby ARPG)

Research date: 2026-10-07. Source dates are noted where known; anything older than 2024 is flagged.

## Testing: unit tests, deterministic headless bot sims, replay/snapshot, Playwright E2E. What is realistic solo?

### Takeaway
Pull pure game logic (update(dt), collision, combat math, RNG) out of index.html into ES modules that run without the DOM. Then the existing console "bot" sims can run as Vitest tests in Node. Use a fixed timestep with a seeded RNG so a run is a pure function of (seed, inputs). Add one Playwright smoke test that controls the page clock. That is enough for a solo dev.

### Cited Findings
- Fixed-timestep accumulator: "The renderer produces time and the simulation consumes it in discrete dt sized steps". Clamp the max steps per frame to avoid the "spiral of death". Interpolate between states using alpha = leftover accumulator / dt. — [Gaffer On Games, Fix Your Timestep (classic article, 2004, still the standard reference)](https://gafferongames.com/post/fix_your_timestep/)
- Playwright `page.clock.install()` mocks `Date`, `setTimeout`, `setInterval`, `requestAnimationFrame`, `cancelAnimationFrame`, `requestIdleCallback`, `performance` and `Event.timeStamp`. It provides `pauseAt`, `fastForward` and `runFor` for manual time control. — [Playwright docs: Clock](https://playwright.dev/docs/clock)
- Community game-QA guidance suggests exposing a deterministic hook such as `window.advanceTime(ms)` that drives the update loop, so Playwright can step frames and then compare canvas output with `toHaveScreenshot()`. — [game-qa skill (community, low authority)](https://skills.sh/opusgamelabs/game-creator/game-qa); [qaskills: Playwright clock guide (community)](https://qaskills.sh/blog/playwright-clock-time-control-testing-guide)

### Inferences
- Realistic solo ladder, in this order: (1) move logic into `src/sim/*.js` with no `window`/`canvas` access. (2) Port the existing bot invariants (no NaN positions, no entity inside walls, HP within bounds) to Vitest tests that loop `update(1/60)` N times with a seeded PRNG (mulberry32 or sfc32, about 5 lines each) and scripted inputs. (3) Replay/regression: store `{seed, version, inputs:[frame,keys]}` and assert a final-state hash. Re-record when balance changes on purpose. (4) One Playwright test that loads the page, installs the clock, presses Start, runs for a few seconds and checks for no console errors plus one screenshot. Pixel screenshots are flaky across GPUs and OSes, so keep at most one or two, or compare `canvas.toDataURL()` at fixed state on CI only.
- `Math.random()` cannot be seeded. Every gameplay random call has to go through the game's own RNG, or replays will drift. Visual-only effects can keep using Math.random.
- Do not snapshot-test whole state objects. They churn on every content change. Hash or assert specific invariants instead.

### Gaps
- I did not fetch the Vitest docs (environment `node` vs `jsdom` vs browser mode). Vitest runs plain ES modules in Node by default, which matches the plan above, but this was not verified against current docs.
- I found no authoritative primary source on replay testing specifically for browser games.

## Save system: localStorage vs IndexedDB, eviction (Safari ITP), itch.io iframe partitioning, schema versioning, suspend saves, export/import

### Takeaway
A small JSON save (well under 1 MB) fits easily in localStorage. Size is not the risk. The risks are eviction and partitioning: Safari's 7-day script-storage cap, LRU eviction under disk pressure, and itch.io's cross-origin iframe, which some browsers partition or clear. Treat browser storage as a cache. Add a versioned schema with migrations and an export/import (copy string or download file) button.

### Cited Findings
- Web Storage is capped at 10 MiB per origin (5 MiB localStorage + 5 MiB sessionStorage). Going over throws `QuotaExceededError`. IndexedDB quotas are far larger: Chrome allows 60% of disk per origin; Firefox best-effort allows min(10% of disk, 10 GiB); Safari allows ~60% for browser apps and ~15% for embedded WebViews. — [MDN: Storage quotas and eviction criteria](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)
- Eviction triggers are storage pressure, exceeding the browser maximum, and Safari's proactive eviction after 7 days with no user interaction. Eviction is LRU, skips persistent origins, and deletes all of an origin's data at once. `navigator.storage.persist()` opts in to persistence (Firefox prompts; Chrome and Safari decide by heuristics). `navigator.storage.estimate()` reports usage and quota. — [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)
- WebKit deletes "all of a website's script-writable storage after seven days of Safari use without user interaction on the site". This covers IndexedDB, LocalStorage, SessionStorage, and Service Worker registrations and cache. Home-screen web apps are exempt in practice. Shipped in Safari 13.1 / iOS 13.4 (March 2020; older but still referenced by MDN). — [WebKit blog: Full Third-Party Cookie Blocking and More (2020)](https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/)
- Safari 17 (Aug 2023): cross-origin frames get separate storage partitions and only ~10% of the main frame's origin quota. `persist()` is granted by heuristics such as being a Home Screen Web App. LRU eviction is based on user-interaction timestamps. — [WebKit blog: Updates to Storage Policy (2023)](https://webkit.org/blog/14403/updates-to-storage-policy/)
- itch.io embeds HTML5 games in an iframe. Browsers can treat that storage as third-party and partition it or wipe it between sessions. Suggested fixes: make storage first-party (host the game elsewhere or use itch's fullscreen/redirect option), add an export/import save fallback, and warn players that incognito does not persist. — [Bugnet blog (June 2026; vendor blog, medium authority)](https://bugnet.io/blog/how-to-fix-construct3-localstorage-save-lost-in-itch-io-iframe)
- Sources conflict on whether itch.io updates wipe localStorage. A Sept 2022 thread reported that each update moved the game to a new CDN address and lost data. Replies in 2023–2024 say data survives updates. No itch staff response in the thread. — [itch.io forum: html5 local storage is lost at every update](https://itch.io/t/2346400/html5-local-storage-is-lost-at-every-update)
- Other itch threads report random localStorage loss and iPad localStorage failing by default. — [itch.io forum: randomly losing localstorage](https://itch.io/t/5464689/web-browser-game-randomly-losing-localstorage-data); [itch.io forum: localStorage on iPad](https://itch.io/t/2636350/localstorage-doesnt-work-for-html5-games-on-ipad-by-default)

### Inferences
- Stay on localStorage for now. Settings, best record and one suspend slot are a few KB, and IndexedDB has the same eviction and partitioning exposure, so moving buys nothing at this size. Move to IndexedDB only if saves grow past ~1 MB or need binary data.
- Schema: `{v: 3, savedAt, gameVersion, data}`. On load, run migrations in a loop (`while (s.v < CURRENT) s = migrations[s.v](s)`). Wrap `JSON.parse` and every storage access in try/catch: Safari private mode or blocked storage throws. Keep a backup key (`save.bak`) written before overwriting, so a crash mid-write does not lose everything.
- Permadeath suspend save: save on quit, pause or `visibilitychange`→hidden (more reliable than `beforeunload`, especially on mobile), then delete the slot when the run resumes. This prevents save-scumming. Optionally store a hash to discourage casual edits; tampering cannot be stopped client-side, and for a free solo game it does not matter.
- Export/import: `btoa(JSON.stringify(save))` into a textarea or clipboard, plus a `Blob` download of a `.json` file. This is the only fully reliable defence against itch iframe/Safari loss.
- Prefix keys (e.g. `saoy:`), because GitHub Pages user sites share one origin (`user.github.io`) across all repos.

### Gaps
- I could not confirm from itch.io official docs which origin hosts HTML5 games (commonly reported as `html-classic.itch.zone`) or whether that origin is stable across uploads. The creator HTML5 docs do not mention storage.
- The current Chrome/Firefox storage-partitioning behavior specifically for itch embeds was not verified from browser vendor docs.

## Performance: Canvas 2D practices, WebGL threshold, profiling, frame pacing, GC

### Takeaway
At this scale (top-down tile game, tens of entities), Canvas 2D is enough when these are in place: pre-render static tile layers to an offscreen canvas once per floor, draw at integer coordinates with image smoothing off, no per-frame `shadowBlur`, rAF plus a fixed timestep, and no per-frame allocations in hot loops. Consider WebGL only after profiling shows a draw-call bottleneck. PixiJS or a similar library is the usual route.

### Cited Findings
- MDN tips: pre-render repeated content to an offscreen canvas; use integer coordinates (`Math.floor`) to avoid sub-pixel anti-aliasing; do not scale images inside `drawImage` (cache scaled copies); use layered canvases (static background / game / UI); use CSS for large static backgrounds; scale up with CSS transforms; create the context with `{alpha: false}`; handle high-DPI by scaling canvas attributes, CSS size and `ctx.scale` together; batch calls; avoid unneeded state changes; avoid `shadowBlur`; avoid text rendering where possible; use `requestAnimationFrame`, not `setInterval`. — [MDN: Optimizing canvas](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas)
- Fixed timestep plus interpolation decouples simulation from display refresh, which matters on 120/144 Hz monitors. — [Gaffer On Games](https://gafferongames.com/post/fix_your_timestep/)

### Inferences
- Pixel art: set `ctx.imageSmoothingEnabled = false` after every canvas resize (resizing resets context state) and add CSS `image-rendering: pixelated`. Render to a fixed low-res internal canvas (e.g. 320x180 or 480x270) and scale it up by an integer factor with CSS. That covers devicePixelRatio more simply than full DPR backing stores and suits pixel art.
- Cache text such as HUD numbers or damage labels to small canvases, or redraw only on change. `fillText` with web fonts is expensive per frame.
- GC: reuse vector and particle objects through pools or arrays, and avoid closures, `map`, `filter` and spreads inside `update`/`render`. Use the Chrome DevTools Performance panel to look for sawtooth memory and "Minor GC" spikes.
- Profiling: Chrome DevTools Performance panel (frames, long tasks); Firefox Profiler; an in-game FPS/frame-time overlay toggled by a key.

### Gaps
- I did not fetch web.dev or Chrome docs on DevTools frame profiling or on OffscreenCanvas in workers. Not needed at this scale.
- I found no quantitative benchmark for when Canvas 2D stops keeping up with sprite counts. Hardware-dependent, so measure it.

## Deployment: itch.io HTML5 requirements, GitHub Pages + Vite, PWA, audio autoplay, fonts, cache busting

### Takeaway
itch.io wants a ZIP with `index.html` at its root: at most 1,000 files, 500 MB total, 200 MB per file, filenames at most 240 characters. Use relative asset paths. With Vite, set `base: './'` so one build works on both itch and GitHub Pages; Vite's docs suggest `base: '/<REPO>/'` for project pages. Audio must start after a user gesture. A PWA/service worker is optional, and only becomes useful if a GitHub Pages "installable" build is wanted (it also helps with Safari's 7-day eviction).

### Cited Findings
- itch.io HTML5: ZIP (or a single HTML file), `index.html` required, UTF-8 filenames, at most 1,000 files after extraction, filename at most 240 chars, total at most 500 MB, single file at most 200 MB. Display modes: "Embed in page" (fixed dimensions, optional fullscreen button) or "Click to launch in fullscreen". Options for Click to Play (on by default), scrollbars, and a Mobile Friendly toggle. HTML5 games take payment only as donations. The page does not document SharedArrayBuffer. — [itch.io docs: Uploading HTML5 games](https://itch.io/docs/creators/html5)
- Vite GitHub Pages: `base: '/'` for user/org sites or custom domains, `base: '/<REPO>/'` for project sites. Set Pages source to "GitHub Actions" and use `.github/workflows/deploy.yml` with `actions/checkout`, `actions/setup-node`, `actions/configure-pages`, `actions/upload-pages-artifact` (uploads `./dist`) and `actions/deploy-pages`. Current docs pin these by SHA. — [Vite: Deploying a Static Site](https://vite.dev/guide/static-deploy)
- Chrome autoplay policy has covered Web Audio since Chrome 71. An `AudioContext` created at page load starts suspended and needs `resume()` after a user interaction. Testing flag: `--autoplay-policy=no-user-gesture-required`. — [Chrome Developers: Autoplay policy](https://developer.chrome.com/blog/autoplay) (published 2017, updated 2018; still current behavior)

### Inferences
- With no build step, the current single `index.html` can be zipped as-is (with the assets folder) and uploaded, or pushed with butler. Vite pays off once the code is split into modules or tests need imports. Vite also adds hashed filenames, which handles cache busting automatically. Without Vite, append `?v=1.2.3` to script and asset URLs.
- itch.io's "Click to Play" overlay doubles as the user gesture that unlocks audio, but still call `audioCtx.resume()` on the first keydown or click.
- Self-host fonts, or use a pixel bitmap font from the CC0 pack. That avoids CDN dependency, FOUT in canvas text (canvas does not wait for webfonts; use `document.fonts.load()` before the first draw), and Google Fonts privacy concerns for EU players.
- Service worker: skip for v1. If added later, a cache-first worker plus a versioned cache name, or `vite-plugin-pwa`. A stale service worker is a common source of "my update doesn't show" bugs.
- Keep the asset count low (sprite atlases, few audio files). The Ninja Adventure pack has thousands of files, so copy only the files actually used, or the ZIP will go over the 1,000-file limit.

### Gaps
- itch.io's SharedArrayBuffer (COOP/COEP) embed option is not described on the HTML5 docs page. The game does not need it, since it uses no wasm threads.
- I did not verify a current legal source on Google Fonts and GDPR (a 2022 Munich court ruling is often cited, but I did not fetch it).

## Version control & CI: .gitignore, GitHub Actions, butler

### Takeaway
`git init` now. Ignore `node_modules/`, `dist/`, and the cloned asset repo (or copy only the used assets into `assets/` and ignore the clone with its nested `.git`). Use a single GitHub Actions workflow that runs `npm test`, builds, deploys to Pages, and runs `butler push dist user/game:html5` with `BUTLER_API_KEY` as a secret.

### Cited Findings
- butler syntax: `butler push <dir> user/game:channel`, `--userversion 1.1.0` or `--userversion-file`. Auth in CI with the `BUTLER_API_KEY` env var. Uploads are diffed (rsync-style blocks plus a server-side byte diff), so only changes are sent. HTML5 channels must be marked "HTML5 / playable in browser" on the itch Edit page after the first push, and the project type must be HTML. — [itch.io docs: butler pushing](https://itch.io/docs/butler/pushing.html)
- Vite's Pages workflow (see above) gives the deploy job. — [Vite](https://vite.dev/guide/static-deploy)

### Inferences
- Suggested `.gitignore`:
  ```
  node_modules/
  dist/
  # third-party asset clone (has its own .git); keep only copied, used files in assets/
  /Ninja-Adventure*/
  /vendor-assets/
  test-results/
  playwright-report/
  .DS_Store
  Thumbs.db
  *.log
  ```
  A cloned repo inside the working tree with its own `.git` gets added as an embedded repo/gitlink (git warns about this), not as files. Ignore it, or use a submodule if it must be tracked. Include the CC0 license text and credits file in the shipped build.
- CI: one workflow on push to `main`: `npm ci` → `npm test` (Vitest) → `npx playwright install --with-deps chromium && npx playwright test` (optional) → `npm run build` → Pages deploy job + butler job. butler install in CI: download from broth.itch.zone (per butler docs; URL not fetched here).

### Gaps
- I did not fetch butler's install/CI page for the exact download URL or an official GitHub Action. Community actions exist but were not verified.

## Legal/IP: SAO-derived name, Aincrad, "Link Start", boss names in a free itch.io fan game (not legal advice)

### Takeaway
"SWORD ART ONLINE" is a registered US trademark owned by Kadokawa covering game software. "Sword Art On You" is a close pun on it. Copyright also covers SAO-specific setting and character elements (Aincrad, Illfang the Kobold Lord, Asterius, Nerius). I found no published Kadokawa/Aniplex fan-game guideline for SAO, and no documented SAO fan-game takedown. itch.io takes nothing down proactively but removes content on a rights-holder complaint. Practical risk for a free, obscure fan game is low but not zero, and the likely outcome is a takedown, not a lawsuit. Renaming to original terms removes most of the risk.

### Cited Findings
- USPTO "SWORD ART ONLINE" serial 79208179, reg. no. 5940485, status "Registered" (Dec 24, 2019; filed Aug 12, 2016). Kadokawa also holds serial 86568253 and registrations for game titles such as "Sword Art Online Variant Showdown" (79311344) and "Unleash Blading" (79342402), covering downloadable game programs. — [Justia trademarks: Kadokawa Corporation](https://trademark.justia.com/owners/kadokawa-corporation-3059400) (detail page returned 403; figures are from the search snippet of [Justia detail page](https://trademarks.justia.com/792/08/sword-art-79208179.html). Verify on USPTO TSDR.)
- Kadokawa publishes 二次創作 (fan work) guidelines for specific properties, e.g. YouTube monetization under its Creator Support Program for some titles. I found no SAO-specific guideline. — [Kadokawa topics](https://www.kadokawa.co.jp/topics/10932/); searches for an official SAO 二次創作 guideline returned nothing relevant ([search context: denfaminicogamer](https://news.denfaminicogamer.jp/news/220805q))
- Typical Japanese corporate fan-work guidelines (e.g. Capcom) permit non-commercial individual work without notice and generally ban for-profit use, with small doujin-event exceptions. — [Denfaminicogamer (Nov 2025)](https://news.denfaminicogamer.jp/news/251105r); [Inside Games (Nov 2025)](https://www.inside-games.jp/article/2025/11/05/173614.html)
- itch.io ToS (updated Apr 15, 2023): publishers warrant they hold the rights to what they upload. Infringing copyright or trademark is prohibited. DMCA notices go to support@itch.io. Counter-notice is available. Content or accounts may be removed without notice. — [itch.io Terms](https://itch.io/docs/legal/terms)
- itch.io publishes takedown notices publicly (e.g. "Apotris"). Community answers say itch does not police fan games in advance but removes them on complaint. — [itch.io takedown: Apotris](https://itch.io/takedowns/1499978); [itch.io forum post](https://itch.io/post/10329186)
- An SAO-themed fan game ("Alfheim Online Ascension") is listed on itch.io, which shows such projects exist. Its status or any permission was not verified. — [artofsully.itch.io](https://artofsully.itch.io/alfheimonlineascension)
- Large-scale fan-game takedowns do happen with some rights holders (Nintendo, 379 games via DMCA in Jan 2021; older but notable). — [Nintendo Life (2021)](https://www.nintendolife.com/news/2021/01/nintendo_issues_mass_dmca_takedown_379_fan-made_games_forcibly_removed)

### Inferences
- Risk ranking, highest first: (1) the title "Sword Art On You" plus SAO-style logo or marketing tags (trademark, plus search confusion with official games). (2) Lifted proper nouns and character names: Aincrad, Illfang, Asterius, Nerius, Kirito/Asuna if used. (3) Mechanics and genre (floor-climbing death game, VRMMO premise). These are not protectable as such.
- Mitigations used in common practice: rename (an original title, original floor-castle name, original boss names), keep the "trapped in a VR death game" premise, which is a genre trope (.hack, Log Horizon); put a fan-work disclaimer on the itch page ("unofficial, not affiliated with Kadokawa/Aniplex/Bandai Namco"); stay free with no donations (note: itch HTML5 pages default to donation-only payments, so disable donations); do not use official art, music, logos or font. The CC0 Ninja Adventure assets already help here. Respond promptly to any notice.
- "Link Start" is a short phrase, and short phrases are generally not copyrightable. Whether it is trademarked in Japan or the US was not verified, so a small risk remains.
- Calling it parody has weak footing for a game in US law, and Japanese law has no general fair-use or parody exception. Do not rely on it.

### Gaps
- J-PlatPat (Japan) records for ソードアート・オンライン, アインクラッド/Aincrad or "Link Start" were not checked.
- I found no documented Kadokawa/Aniplex takedown of an SAO fan game, positive or negative. Absence of evidence is not permission.
- I did not confirm whether Kadokawa has a corporate-wide game fan-work policy. Only property-specific guidelines were found.
