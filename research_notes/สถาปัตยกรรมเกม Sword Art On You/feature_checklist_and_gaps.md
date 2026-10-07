# Feature Checklist and Gap Analysis: Small-Scope 2D Top-Down Action RPG / Roguelite ("Sword Art On You")

Tags used: **[MUST]** = must-have for an itch.io hobby release at this scope; **[SHOULD]** = should-have; **[NICE]** = nice-to-have. Tags are the researcher's judgment (inference), based on the cited findings. Game state assumed as described by the coordinator (single index.html, 3 floors, 1 skill, XP/levels, no items/gold/NPCs/story, full permadeath, localStorage best record + settings, keyboard+mouse only).

## Core loop & progression (meta-progression, build variety, difficulty curve, pacing, run length)

### Takeaway
Successful roguelites make death feel like part of the structure, not a "game over": they give permanent progress channels across runs and in-run build choices, while keeping the run itself skill-driven. For this game the biggest structural gap is that a run has no choices (no items, upgrades or skill picks) and death has no lasting reward beyond a best-record number.

### Cited Findings
- Supergiant deliberately gave Hades "many channels of permanent progression" plus an ongoing narrative that evolves between runs, wanting no sense of a "game over" moment, so death feels like a natural part of the structure. — [memoireonline (academic thesis on Hades narrative, 2022)](https://www.memoireonline.com/11/22/13305/m_Stories--video-games--investigating-narratives-through-play1.html)
- Hades developers focused heavily on the moment of death and what follows it, using humorous characters to take the sting out of dying. — [memoireonline (2022)](https://www.memoireonline.com/11/22/13305/m_Stories--video-games--investigating-narratives-through-play1.html)
- Greg Kasavin (Hades creative director): players carry mechanical knowledge across runs, which inspired an immortal protagonist who remembers previous runs; bosses remember prior encounters, giving "narrative continuity". He also stresses not letting a difficulty wall block players from content, and the value of non-essential "dumb stuff" that gives a game charm. — [GDC Podcast ep. 16 summary (gdconf.com, date not shown on page; likely 2021)](https://gdconf.com/news/roguelikes-and-narrative-design-hades-creative-director-greg-kasavin-gdc-podcast-ep-16)
- Roguelite meta-progression (permanent upgrades persisting across runs) keeps players motivated through failure but "must enhance rather than trivialize" the run-to-run skill challenge. — [bugnet.io blog (undated dev blog)](https://bugnet.io/blog/how-to-design-a-roguelite-meta-progression)
- Distinction: a roguelike emphasizes player competence gain, a roguelite emphasizes avatar competence gain. — [jwittsf design blog, "Metasystems Matter in Roguelite Games" (Apr 6, 2020)](https://jwittsf.design.blog/2020/04/06/metasystems-matter-in-roguelite-games)
- Counterpoint: some players report meta-progression grinds feel increasingly unrewarding and can remove the sense of genuine skill improvement. — [piefed community discussion (user opinion, undated)](https://piefed.keyboardvagabond.com/c/games/p/232999/meta-progression-in-roguelites-was-fun-for-a-while-but-it-s-starting-to-f)
- Dead Cells combines roguelite permadeath with metroidvania-style gradual unlocking of weapons/skills; paths branch (e.g., Ramparts vs. Sewers), some shorter but harder, giving route choice per run. — [Dead Cells itch.io page (Motion Twin)](https://motiontwin.itch.io/dead-cells)
- Vampire Survivors defines a ~30-minute "successful" run; failed runs produce a "near miss" effect (close to next level/chest/unlock) that drives "one more go". — [The Conversation (2023)](https://theconversation.com/vampire-survivors-how-developers-used-gambling-psychology-to-create-a-bafta-winning-game-203613)
- Hades-style template ("meta progression plus characterized dialogue") was absorbed by later roguelites (Rogue Legacy 2, Vampire Survivors etc.). — [Tom's Guide interview page title / search snippet; aggregator, treat as opinion](https://www.tomsguide.com/uk/features/hades-exclusive-interview-supergiant)

### Inferences
- Checklist (core loop):
  - [MUST] In-run build choice: at least one choice point per floor (e.g., pick 1 of 3 upgrades on level-up or after a boss). Currently levels give flat HP/ATK only, so every run plays identically.
  - [MUST] A reason to start another run after death: either unlocks or a short meta-currency shop. Minimal version: unlockable second Sword Skill / starting perk after first boss kill, stored in localStorage.
  - [SHOULD] 2-4 Sword Skills total (SAO flavor fits: skills unlocked/equipped), with only 2 slots so choice matters.
  - [SHOULD] Light meta-progression (e.g., "Cor" currency kept on death to buy small permanent stat or unlock new skills), kept small so it does not trivialize skill (per bugnet caveat).
  - [SHOULD] Target run length: 15-30 min for full clear for a browser game with 3 floors; a death on floor 1 should cost < 5 min. (Inference from VS 30-min benchmark; no direct source for browser games.)
  - [SHOULD] Difficulty curve: each floor introduces one new enemy behavior; boss difficulty escalates; optional easier mode (see Accessibility).
  - [NICE] Heat/ascension-style optional modifiers after first clear, daily seed, run-stat summary screen with history.
  - [NICE] Floor route choice (Dead Cells style) — likely out of scope for 3 floors.

### Gaps
- No primary GDC transcript for Hades/Rogue Legacy/Enter the Gungeon run-length or meta-economy numbers was retrieved; Tom's Guide interview page could not be read (truncated).
- No reliable data on typical run length for itch.io browser action RPGs.

## Content (enemy variety, boss patterns, items/loot, economy, NPCs/story delivery)

### Takeaway
Enemy design is about two readable questions ("can you avoid my damage / can you hit me?") delivered through anticipation-attack-recovery. The game's bosses already follow good practice; the content gap is mostly item/loot/economy and any story framing, which small games can deliver cheaply via short NPC lines in towns and death-screen text.

### Cited Findings
- Enemy design framed around two questions players must answer: "Can you avoid my damage?" and "Can you hit me?"; attacks have pre-attack animation (telegraph), execution, and recovery. — [Game Developer, Mike Stout, "Enemy Attacks and Telegraphing" (Sep 2, 2015 — older than preferred range but canonical)](https://gamedeveloper.com/design/enemy-attacks-and-telegraphing)
- Telegraph channels: animation wind-ups, VFX (particle buildup, flashes), audio cues, force feedback. — [Game Developer (2015)](https://gamedeveloper.com/design/enemy-attacks-and-telegraphing)
- Readable telegraphs turn getting hit into "a readable mistake the player can learn from" rather than an unfair surprise. — [bugnet.io (undated)](https://bugnet.io/blog/how-to-design-enemy-attack-telegraphs)
- Hades: narrative delivered through characters met between runs, death sequencing, bosses that remember you. — [GDC Podcast summary](https://gdconf.com/news/roguelikes-and-narrative-design-hades-creative-director-greg-kasavin-gdc-podcast-ep-16)
- Hades scale reference (not for hobby scope): ~8,000 voiced lines, six weapons. — [Tom's Guide search snippet (aggregator)](https://www.tomsguide.com/uk/features/hades-exclusive-interview-supergiant)

### Inferences
- Checklist (content):
  - [MUST] 2-3 distinct enemy archetypes per floor (melee lunger exists; add ranged shooter, and a tank/shielded or swarmer), each answering "avoid/hit" differently. Current state: "8-10 respawning mobs" — if all share the wind-up+lunge behavior, variety is the gap.
  - [MUST] Each boss has 3+ attacks with distinct telegraphs and a phase change — ALREADY MET (slam, charge, leap, quake, root spikes, 50% rage, summons).
  - [SHOULD] Pickups: healing drops, temporary buffs; simplest loot that adds decisions without an inventory UI.
  - [SHOULD] Economy: gold ("Col" in SAO) dropped by mobs, spent at a town shop/NPC (potions, upgrade choices). Towns currently only regen HP — the shop gives towns a purpose.
  - [SHOULD] Minimal story framing: intro text (trapped in a death game), 1-3 NPC lines per town, boss intro name card, ending screen. Cheap, high payoff for an SAO-themed game.
  - [NICE] Equipment slots (weapon/armor) with 3-5 items per floor; full inventory UI is likely overkill for a single-file game.
  - [NICE] Elite/mini-boss variants, floor events, secret areas, achievements.
  - [NICE] Bestiary/codex unlocked on kill (cheap meta "collection" reward).

### Gaps
- No sourced numeric guidance found on "enemy types per area" for small indie games; recommendations are inference.
- No source retrieved for item/loot design specifics in Enter the Gungeon / Soul Knight.

## Game feel & combat (input buffering, i-frames, cancel windows, hitbox clarity, telegraphs)

### Takeaway
Invisible forgiveness ("cheating in the player's favor") is a standard part of polished action games: Dead Cells has 30-40 such tricks. The game already has strong juice (hit-stop, shake, particles, numbers) and i-frame dash; the likely missing pieces are input buffering, attack-cancel into dash, and hitbox/hurtbox generosity.

### Cited Findings
- Dead Cells designer Sébastien Bénard described ~30-40 small hidden techniques that make the game feel fair (e.g., "just in time jump" after leaving a ledge, climbing assistance, combat tricks). — [80.lv (May 8, 2019)](https://80.lv/articles/dead-cells-hidden-tricks-that-make-the-game-feel-fair)
- Bénard's principle: understand what the player is trying to do; if it's not meant to be the challenge, make sure they succeed. GDC 2019 talk "Dead Cells: What the F*n!?" argued that making life easier made the game more hardcore without rage-quits. — [80.lv (2019)](https://80.lv/articles/dead-cells-hidden-tricks-that-make-the-game-feel-fair); [GoNintendo (2019)](https://gonintendo.com/stories/324643-dead-cells-getting-a-second-panel-at-gdc-2019)
- Input buffering = remembering an input pressed slightly early and executing it at the first valid moment; drops in "off by a few frames" inputs feel unresponsive. — [Wayline blog (undated)](https://www.wayline.io/blog/input-buffering-responsive-game-feel); [bugnet.io (undated)](https://bugnet.io/blog/how-to-implement-input-buffering-for-responsive-controls)
- Suggested buffer windows: ~100-120 ms for standard action, 60-80 ms precision, 150-200 ms slow-paced. — [bugnet.io (undated; heuristics, not research)](https://bugnet.io/blog/how-to-fix-platformer-jump-feels-unresponsive)
- Telegraph = anticipation, attack, recovery; recovery is the player's punish window. — [Game Developer (2015)](https://gamedeveloper.com/design/enemy-attacks-and-telegraphing)

### Inferences
- Checklist (game feel):
  - [MUST] Input buffer (~100-150 ms) for attack and skill pressed during swing / post-motion delay. Very cheap in vanilla JS (store last-press timestamp).
  - [MUST] I-frames on dash — ALREADY MET. Brief i-frames after taking damage — verify present.
  - [MUST] Enemy telegraphs + recovery windows — ALREADY MET for mobs and bosses.
  - [SHOULD] Cancel window: allow dash to cancel late swing frames (attack recovery), not the SAO post-motion delay itself (that delay is the skill's intended cost).
  - [SHOULD] Generous hitboxes (player sword arc slightly larger than visual; player hurtbox slightly smaller than sprite). Common "cheat in player's favor" trick per Bénard's principle.
  - [SHOULD] Clear damage-taken feedback distinct from dealing damage (red flash/vignette, distinct SFX), and low-HP warning.
  - [NICE] Aim assist / slight target snapping for mouse aim; combo string (3-hit chain) on basic attack; dodge-roll separate from the skill.

### Gaps
- No primary source (GDC transcript) on attack-cancel windows specifically for top-down games; recommendation is inference from general practice.

## UX & onboarding (tutorial, feedback, menus, gamepad, rebinding, pause, save/continue)

### Takeaway
Basic-tier accessibility guidelines double as a UX checklist: interactive tutorial, minimal menus to start playing, remappable controls, UI reachable with the gameplay input device, persistent settings. The game has menus, pause and settings; missing are an in-play tutorial, rebinding and gamepad support.

### Cited Findings
- GAG basic: "Include interactive tutorials"; minimal menu navigation to start the game; "Allow controls to be remapped / reconfigured"; UI accessible via the same input method as gameplay; persistent settings. — [Game Accessibility Guidelines, Basic tier (gameaccessibilityguidelines.com)](https://gameaccessibilityguidelines.com/basic/)
- XAG 107 Input: control remapping, hold-vs-toggle options, support for accessible peripherals. XAG 112 UI navigation: logical reading and focus order in menus. — [Xbox Accessibility Guidelines list (devdocs.xbox.com; XAG v3.2, Jun 8 2023)](https://devdocs.xbox.com/build/game-principles/accessibility/xbox-accessibility-guidelines.md); [Microsoft Learn XAG intro (page updated Aug 2026)](https://learn.microsoft.com/en-us/gaming/accessibility/guidelines)
- Browser games should show control requirements in-game, not only on the store page. — [dev.to audit of 200 HTML5 games (measured Aug 5, 2026)](https://dev.to/liza_18827c15bdd387c4cd9c/why-your-browser-game-is-unplayable-on-a-phone-7hi)

### Inferences
- Checklist (UX):
  - [MUST] Title -> play in 1-2 clicks — likely MET.
  - [MUST] Pause that also pauses on window blur/tab hidden (`visibilitychange`) — verify; browser players alt-tab constantly.
  - [MUST] In-game first-run tutorial prompts (move / attack / skill / dash-through-attack) on floor 1 town or field, not just a how-to screen. Gap: currently only a how-to menu.
  - [MUST] Control hints visible in HUD or pause screen.
  - [SHOULD] Key rebinding (store in localStorage with other settings). Also needed for AZERTY/non-QWERTY layouts.
  - [SHOULD] Gamepad support via the Gamepad API (left stick move, right stick aim, buttons). Native browser API, no library needed. Menus must be navigable by pad (XAG 112).
  - [SHOULD] Death/result screen with run stats (floor, time, kills, level) and "retry" focused by default — partly MET (result screens exist).
  - [NICE] Boss intro card, floor-transition card, credits screen (CC0 assets do not require credit, but crediting Ninja Adventure / music is good practice).

### Gaps
- No specific source retrieved on gamepad usage share among itch.io browser players.

## Accessibility (GAG basic tier + relevant XAG for a 2D action game)

### Takeaway
The game already covers several basics (separate music/SFX volume, screen-shake toggle, reduced flashing, persistent settings). Main gaps vs. GAG basic and XAG: remapping, difficulty/assist options, game speed, information not conveyed by color/sound alone, readable text size/contrast checks, and accessibility info on the itch page.

### Cited Findings
- GAG Basic tier items (paraphrased) — Motor: adjustable game speed; haptics toggle; large well-spaced touch targets; adjustable control sensitivity; UI usable with gameplay input; simplified/alternative controls; remappable controls. Cognitive: avoid flicker and repetitive patterns; player-paced text; interactive tutorials; simple clear language; minimal menus to start; clear text formatting; readable default font size. Vision: high text/UI contrast; info not by color alone; large spaced elements. Hearing: separate volume for effects/speech/music; info not conveyed by sound alone; subtitles for important speech, clearly presented. Speech: speech input optional. General: solicit accessibility feedback; persistent settings; in-game and store-page accessibility info; "Offer a wide choice of difficulty levels". — [Game Accessibility Guidelines, Basic](https://gameaccessibilityguidelines.com/basic/)
- XAG list (v3.2, Jun 8 2023): 101 Text display, 102 Contrast, 103 Additional cues, 104 Subtitles/captions, 105 Audio accessibility, 106 Screen narration, 107 Input, 108 Difficulty options, 109 Object clarity, 110 Haptics, 111 Audio description, 112 UI navigation, 113 UI focus handling, 114 UI context, 115 Error messages, 116 Time limits, 117 Visual distractions and motion, 118 Photosensitivity, 119 Chat, 120 Communication, 121 Accessible feature documentation, 122 Customer support, 123 Mental health. — [devdocs.xbox.com XAG](https://devdocs.xbox.com/build/game-principles/accessibility/xbox-accessibility-guidelines.md)
- XAG 103: don't rely on a single sense for any cue (pair visual and audio). XAG 105: independent volume sliders. XAG 117: opt-outs for camera shake, parallax, motion blur. — [devdocs.xbox.com XAG](https://devdocs.xbox.com/build/game-principles/accessibility/xbox-accessibility-guidelines.md)
- XAG 108: four or more difficulty levels or presets plus individually adjustable mechanics ("assists"), including an ultra-low difficulty mode so a wide range of players can progress. — [Microsoft Learn XAG (search snippet of XAG 108)](https://learn.microsoft.com/en-us/gaming/accessibility/guidelines)
- Kasavin: hitting a difficulty wall that blocks story is among the most frustrating experiences; Hades was designed so varied skill levels can see the story. (Hades shipped "God Mode" assist — known fact, not retrieved here.) — [GDC Podcast summary](https://gdconf.com/news/roguelikes-and-narrative-design-hades-creative-director-greg-kasavin-gdc-podcast-ep-16)

### Inferences
- Already met: separate music/SFX volume (GAG hearing, XAG 105); screen-shake toggle (XAG 117); reduced flashing (GAG cognitive, XAG 118 partially); persistent settings (GAG general); telegraphs are visual + likely audio (verify for XAG 103).
- Checklist (accessibility) — missing:
  - [MUST] Remappable keys (GAG motor, XAG 107).
  - [MUST] At least one assist option: e.g., "Story/Assist mode" with damage taken x0.5 or growing damage resistance on each death (Hades God Mode-like), or checkpoint per floor instead of full restart. Full permadeath with no assist fails GAG "wide choice of difficulty levels".
  - [SHOULD] Game speed slider (e.g., 70/85/100%) — trivial with a dt multiplier in a canvas loop (GAG motor).
  - [SHOULD] Every important cue not by color alone: boss attack zones need shape/outline not just red tint; low HP needs SFX + flash (GAG vision/hearing, XAG 103).
  - [SHOULD] Hold-vs-toggle: none needed unless any action requires holding; verify.
  - [SHOULD] Text size and contrast check on HUD and DOM menus (XAG 101/102); DOM menus can respect browser zoom.
  - [SHOULD] Accessibility features listed on the itch.io page (GAG general, XAG 121).
  - [NICE] Damage-number toggle, HUD scale option, colorblind-safe telegraph palette, one-handed / mouse-only mode, `prefers-reduced-motion` auto-default for shake/flash.
  - N/A at this scope: subtitles (no speech), screen narration, chat.

### Gaps
- XAG 108 text was taken from a search snippet; full XAG 108 page was not fetched.
- GAG intermediate/advanced tiers not reviewed.

## Save systems for permadeath games (suspend save vs none)

### Takeaway
Players expect a suspend save in roguelikes (save on quit, deleted on load) so interruptions are cheap without enabling save-scumming. Returnal's lack of one drew criticism and was patched in. For a browser game, where tabs get closed or refreshed accidentally, a localStorage suspend save is especially valuable.

### Cited Findings
- Returnal (2021) launched without mid-run saves; players complained, noting roguelikes like Hades have suspended saves; a 2.0 update added "Suspend Cycle". — [GameRevolution (2021)](https://www.gamerevolution.com/news/680219-returnal-no-save-divides-community); [CGMagazine (2021)](https://www.cgmagonline.com/news/returnal-2-0-update-adds-suspend-feature); [TheSixthAxis (Oct 26, 2021)](https://www.thesixthaxis.com/2021/10/26/returnal-2-0-update-lets-you-save-the-game-mid-run-photo-mode-patch-notes/)
- Traditional roguelike model: suspend/resume save deleted on resume, preventing save scumming while allowing breaks. — [Steam community, Wizard of Legend discussion (user posts)](https://steamcommunity.com/app/445980/discussions/0/3158630999990338673); [Steam community, Wayward Souls discussion](https://steamcommunity.com/app/559260/discussions/0/3160848559790293589)
- "A player who must stop right now should lose nearly nothing"; quicksave-on-exit is cheap and among the most appreciated invisible features. — [bugnet.io "Save systems: what players expect" (undated dev blog)](https://bugnet.io/blog/save-systems-what-players-expect)

### Inferences
- [MUST] Suspend save: on floor transition / entering town (and on `pagehide`), write run state (floor, level, XP, HP, unlocks) to localStorage; title shows "Continue"; delete on load or death. Saving at town entry only (not mid-combat) keeps it simple — town = SAO "safe zone" checkpoint fits theme.
- [SHOULD] Meta-progress (unlocks, currency, best record) saved separately and immediately.
- [NICE] Export/import save string (localStorage can be wiped by browser cleaning, private mode, itch.io domain changes).

### Gaps
- Whether itch.io iframe localStorage persists reliably across game updates (itch serves each upload under a versioned path/subdomain) was not verified — worth testing.

## Mobile/touch support expectations for browser games on itch.io

### Takeaway
Many itch.io HTML5 games ignore touch, and phone visitors land on them anyway; the minimum is honesty (label desktop-only, show controls in-game) plus a working fullscreen button. Full touch controls (twin-stick virtual joysticks) are a nice-to-have for this game since it needs move + aim + 2 actions.

### Cited Findings
- Audit of 200 HTML5 games (Aug 5, 2026): 68 of 155 control lists never mention touch/phone; 26 list only keyboard movement; all 14 live portal pages for keyboard games invite players to "tap" but describe only keyboard controls. — [dev.to (2026)](https://dev.to/liza_18827c15bdd387c4cd9c/why-your-browser-game-is-unplayable-on-a-phone-7hi)
- On a 390x844 phone the embedded game box is ~331x207 CSS px; recommendations: test on real phones, limit to ~2 simultaneous touch inputs, use `touch-action: none` and non-passive listeners, use Pointer Events instead of mouse-only handlers, targets well above 24 px, display control requirements in-game, clearly label desktop-only games. — [dev.to (2026)](https://dev.to/liza_18827c15bdd387c4cd9c/why-your-browser-game-is-unplayable-on-a-phone-7hi)
- itch.io embed options: click-to-play, maximized mode, fullscreen on mobile (iOS falls back to maximized), mobile-friendly flags and compatibility warnings for non-mobile-friendly projects. — [itch.io update (Jan 22, 2018)](https://itch.io/updates/more-embed-options-for-html5-games)
- Enable the fullscreen button and set embed size to the game's aspect ratio; a mis-sized embed can hide parts of the game. — [itch.io forum post](https://itch.io/post/10626415); [itch.io community thread](https://itch.io/t/373852/suggestion-click-to-play-screen-of-html5-games-should-show-smaller-even-for-not-maximized-games)
- Many itch devs add touch after noticing phone players (devlogs). — [itch.io devlog example](https://itch.io/devlog/766856/added-mobile-support-to-web-version.amp)

### Inferences
- [MUST] itch page: fullscreen button on, correct embed size, "Desktop: keyboard + mouse (gamepad if added)" stated; mark as not mobile-friendly if no touch.
- [MUST] Canvas scales to fit window/fullscreen with correct aspect (verify).
- [SHOULD] If touch is skipped, show a "keyboard/mouse required" notice when a touch-only device is detected.
- [NICE] Touch controls: left virtual stick move, auto-aim at nearest enemy (drops the aim input), 2 buttons (attack, skill). Pointer Events make this mostly additive.

### Gaps
- No itch.io statistics on share of mobile visitors to HTML5 games.

## Prioritized gap analysis for "Sword Art On You"

### Takeaway
Combat and juice are already above typical hobby level; what makes it feel incomplete is the loop around combat (no choices, no rewards that persist, no reason for towns), plus a few cheap-but-expected quality items (suspend save, rebinding, tutorial, assist mode, pause on blur). Priorities below are ordered by impact per effort for a single-file vanilla JS game.

### Cited Findings
- Roguelites rely on permanent progression channels and death-as-structure to motivate repeated runs. — [memoireonline (2022)](https://www.memoireonline.com/11/22/13305/m_Stories--video-games--investigating-narratives-through-play1.html); [bugnet.io](https://bugnet.io/blog/how-to-design-a-roguelite-meta-progression)
- Suspend saves are an expected roguelike feature. — [CGMagazine (2021)](https://www.cgmagonline.com/news/returnal-2-0-update-adds-suspend-feature)
- Remapping, interactive tutorials and multiple difficulty levels are GAG basic-tier. — [GAG Basic](https://gameaccessibilityguidelines.com/basic/)
- Hidden player-favoring forgiveness is standard polish. — [80.lv (2019)](https://80.lv/articles/dead-cells-hidden-tricks-that-make-the-game-feel-fair)

### Inferences
Already strong (no work needed): telegraphed mob + boss attacks with phases; i-frame dash with SAO post-motion cost; hit-stop/shake/particles/damage numbers; boss multi-bar HP; minimap; SAO-styled menus; music/SFX volume split; shake toggle; reduced flashing; persistent settings; best record.

Prioritized gaps (P1 = do before calling it "complete"):

| # | Gap | Tag | Effort | Why |
|---|-----|-----|--------|-----|
| P1 | Level-up / post-boss **choice of 1-of-3 upgrades** (stat, skill modifier, passive) | MUST | Low-Med | Only source of run variety; turns XP into decisions |
| P1 | **Suspend save** at town entry + "Continue" on title | MUST | Low | Expected genre feature; browser tabs close |
| P1 | **Pause on tab blur** (`visibilitychange`) | MUST | Trivial | Browser-specific frustration |
| P1 | **Input buffer** for attack/skill (~120 ms) | MUST | Trivial | Responsiveness; cheap |
| P1 | **In-field tutorial prompts** on floor 1 | MUST | Low | GAG basic; how-to menu is not enough |
| P1 | **More enemy archetypes**: at least 1 ranged + 1 tank/swarm, new one per floor | MUST | Med | Field combat variety (verify current variety) |
| P1 | **itch page basics**: fullscreen, embed size, controls + desktop-only label, accessibility list | MUST | Trivial | First impression; phone visitors |
| P2 | **Key rebinding** | SHOULD (GAG basic) | Low-Med | Accessibility + non-QWERTY |
| P2 | **Assist/easy option** (damage taken multiplier, or "checkpoint at floor" mode) | SHOULD (GAG basic) | Low | Permadeath-from-floor-1 with no option is a wall |
| P2 | **Meta-progression**: currency kept on death, unlock 2nd-4th Sword Skill / small perks | SHOULD | Med | Reason to rerun; SAO-flavored |
| P2 | **Gold + town shop/NPC** (potions, upgrades) | SHOULD | Med | Gives towns purpose; economy loop |
| P2 | **Gamepad support** (Gamepad API) incl. menu navigation | SHOULD | Med | Common expectation for action games |
| P2 | **Minimal story**: intro text, 1-3 NPC lines per town, boss name card, ending | SHOULD | Low | Theme payoff; cheap |
| P2 | Game speed slider; color-independent telegraphs; HUD text size/contrast pass | SHOULD | Low | GAG/XAG basics |
| P2 | Dash cancels late basic-swing recovery; generous hit/hurtboxes | SHOULD | Low | Feel |
| P3 | Healing/buff drops; run-history stats screen; achievements; bestiary | NICE | Low-Med | Retention |
| P3 | Equipment slots / small item pool | NICE | Med-High | Depth, but needs inventory UI |
| P3 | Touch controls (virtual stick + auto-aim + 2 buttons) | NICE | Med | Mobile reach |
| P3 | Optional hard modifiers after clear, daily seed, save export | NICE | Med | Replay for dedicated players |

- Suggested cut line for a "complete" itch.io v1.0: all P1 + rebinding + assist option + minimal story. Everything else is post-launch.

### Gaps
- Gap analysis is based on the coordinator's feature description, not on reading index.html; items marked "verify" (enemy variety per floor, pause on blur, damage i-frames, canvas scaling, audio cues on telegraphs) should be checked in code.
