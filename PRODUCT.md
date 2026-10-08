# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Players who find the game on itch.io and play it in the browser (desktop keyboard + mouse, or a gamepad), in one sitting or in short sessions resumed later. Both Thai and international players: the game ships with an EN/TH language switch.

## Product Purpose
Floorbreaker is a free hobby browser action roguelite: trapped in a game world, climb the floors of the Spire, beat one boss per floor, and die for good. Success: a new player goes from the title screen into play in one or two clicks, understands that death is permanent, and wants one more run.

## Positioning
A short, hand-made top-down pixel-art action roguelite with a "trapped in a game world" story frame, readable boss telegraphs, and a run that fits in one sitting. It is a fan-inspired original, not affiliated with any existing franchise.

## Operating Context
- Played inside an itch.io iframe (960 x 640 embed, fullscreen button) or a self-hosted static build; the canvas is letterboxed at 3:2.
- Menus are DOM over the canvas: title, Blade Arts (skill unlocks), how to play, settings (audio/visual, key bindings, assist, save export/import), pause, level-up picker, shop, story dialogue, result.
- Input: keyboard + mouse, gamepad (menus are pad-navigable). Players alt-tab often; the game pauses and keeps a suspend save.

## Capabilities and Constraints
- 4 floors, each with a town (safe zone, merchant), a field and a boss room; permadeath with a suspend save and "Continue".
- Meta progression: Memory Shards unlock Blade Arts between runs.
- Assist options (damage taken, game speed); runs that use them are labelled "assist".
- Static build only (Vite); no server, no accounts; saves live in browser storage with file export/import.
- Language: EN/TH switch is required (decided 2026-10-08); Thai is the current only full text.

## Brand Commitments
- Name: Floorbreaker. Setting names: The Spire, Firstlight, Hornfield, Mistwell, Canalis.
- All art and music are original (art-src/, BeepBox songs). No names, art, logos or fonts from Sword Art Online or any other franchise.
- Voice: the "System" speaks in short, cold notifications; the player character speaks plainly in first person.

## Evidence on Hand
- Sprites, scenery and textures: public/assets/*.png (pixel art, top-down), sources in art-src/.
- Music: public/assets/music/*.mp3 (title, floor1-4, boss, clear).
- Fonts: Kanit, Exo 2 (OFL).
- No reviews, player counts or press exist; do not invent them.

## Product Principles
- Get into play fast: title to control in one or two clicks.
- The world leads: menus should feel like part of the game world the player is trapped in, not a separate app.
- Death is permanent and must be stated plainly before it happens.
- Every control works with keyboard, mouse and gamepad.

## Accessibility & Inclusion
Follows Game Accessibility Guidelines basic tier as far as practical: remappable keys, assist mode, screen-shake and flash toggles (defaulting off under prefers-reduced-motion), separate music/SFX volume, visible focus, readable text contrast on menus.
