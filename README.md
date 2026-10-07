# Sword Art On You

A browser action RPG inspired by Sword Art Online. Clear 3 floors of Aincrad, one boss per floor. Permadeath.

## Run

```
npm install
npm run dev        # http://localhost:5173
npm run check      # typecheck + unit/sim tests + browser smoke test
```

## Build & package

```
npm run build      # -> dist/ (static files, relative paths, works from any folder/subpath)
npm run preview    # serve dist/ locally to try the production build
npm run package    # build + sword-art-on-you-web.zip (contents of dist/ at the zip root)
```

`dist/` must be served over http(s); opening `index.html` straight from disk won't load ES modules.

**itch.io:** new project → Kind: HTML → upload the zip → "This file will be played in the browser" →
viewport 960 × 640, enable the fullscreen button. Saves live in the browser (itch.io may partition them);
Settings → Save → Export is the reliable backup.

## Credits

See [public/CREDITS.txt](public/CREDITS.txt) (shipped with the build). Fan project, not affiliated with the Sword Art Online
rights holders — rename the game and its proper nouns before publishing it anywhere public.
