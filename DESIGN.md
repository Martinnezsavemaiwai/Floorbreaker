---
name: Floorbreaker
description: Pixel-art stained glass of a tower chapel; every menu is a leaded pane lit in its floor's torch color.
colors:
  lead: "#0c0d12"
  wall: "#07080b"
  win-bg: "#101118"
  win-raise: "#171822"
  line: "#2b2d38"
  ink: "#efe8d6"
  ink-2: "#b9b2a2"
  firstlight: "#ff963c"
  hornfield: "#a688ff"
  mistwell: "#78ff96"
  canalis: "#5ac8ff"
  blood: "#ff5a4e"
  focus: "#ffffff"
typography:
  display:
    fontFamily: "'Exo 2', 'Kanit', system-ui, sans-serif"
    fontSize: "30px"
    fontWeight: 800
    letterSpacing: "0.06em"
  headline:
    fontFamily: "'Exo 2', 'Kanit', system-ui, sans-serif"
    fontSize: "clamp(18px, calc(var(--canvas-h) * .042), 30px)"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "0.02em"
  title:
    fontFamily: "'Exo 2', 'Kanit', system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "0.02em"
  body:
    fontFamily: "'Kanit', 'Exo 2', system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.6
  body-story:
    fontFamily: "'Kanit', 'Exo 2', system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.7
  label:
    fontFamily: "'Kanit', 'Exo 2', system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 600
  label-small:
    fontFamily: "'Kanit', 'Exo 2', system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
  numeral:
    fontFamily: "'Exo 2', 'Kanit', system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 800
    fontFeature: "tnum"
  keycap:
    fontFamily: "'Exo 2', 'Kanit', system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 700
rounded:
  none: "0px"
spacing:
  came: "2px"
  sm: "8px"
  md: "10px"
  lg: "16px"
components:
  window:
    backgroundColor: "{colors.win-bg}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    width: "min(440px, 100%)"
  window-wide:
    width: "min(700px, 100%)"
  window-header:
    backgroundColor: "{colors.firstlight}"
    textColor: "{colors.lead}"
    typography: "{typography.title}"
    padding: "11px 20px"
  window-body:
    padding: "16px 18px"
  button:
    backgroundColor: "{colors.win-raise}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "10px 14px"
  button-hover:
    backgroundColor: "{colors.firstlight}"
    textColor: "{colors.lead}"
  button-primary:
    backgroundColor: "{colors.firstlight}"
    textColor: "{colors.lead}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "10px 14px"
  button-ghost:
    textColor: "{colors.ink-2}"
    padding: "6px 10px"
  button-danger:
    backgroundColor: "{colors.blood}"
    textColor: "{colors.lead}"
  pane:
    backgroundColor: "{colors.win-bg}"
    textColor: "{colors.ink}"
    typography: "{typography.title}"
    rounded: "{rounded.none}"
    padding: "10px 14px"
  pane-lit:
    backgroundColor: "{colors.firstlight}"
    textColor: "{colors.lead}"
    typography: "{typography.headline}"
  card:
    backgroundColor: "{colors.win-raise}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "14px"
  card-hover:
    backgroundColor: "{colors.firstlight}"
    textColor: "{colors.lead}"
  stat:
    backgroundColor: "{colors.win-raise}"
    textColor: "{colors.ink}"
    typography: "{typography.numeral}"
    padding: "10px 12px"
  keycap:
    backgroundColor: "{colors.win-raise}"
    textColor: "{colors.ink}"
    typography: "{typography.keycap}"
    padding: "3px 7px"
  tab-button-pressed:
    backgroundColor: "{colors.firstlight}"
    textColor: "{colors.lead}"
    padding: "6px 10px"
  select:
    backgroundColor: "{colors.win-raise}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    padding: "7px 10px"
---

# Design System: Floorbreaker

## Overview

**Creative North Star: "The Spire's Glass"**

The menus are the window wall of the tower the player is trapped in. The title screen is a canvas of four tall pointed lancets, one per floor, each glazed in that floor's torch color with its boss as the window's figure; floors the best record has not reached stay dark, unglazed lead. The DOM menus continue the same material: every window, pane, card and button is a piece of dark glass held in black lead came, and it lights up in its floor's color when the player touches it.

The system is dark, saturated in small doses, and hard-edged. Light is the only accent: a surface is either dark glass at rest or lit glass in its floor color, and the switch between them is a step, not a glide. Pixel art stays pixel art; the wordmark is Exo 2 thresholded into real pixel letterforms and scaled up with smoothing off, so the logo, the lancets and the game sprites share one grain.

Density is moderate: windows top out at 440px (700px wide), content sits in a single column with an 8 to 10px rhythm, and text sizes stay between 12px and 34px. Thai and English share every surface; Kanit carries body and Thai, Exo 2 carries Latin titles and numbers.

Scope: the title canvas and the DOM menu windows. The in-game canvas HUD (bars, minimap, skill slots) predates this world and is legacy; nothing here is derived from it.

**Key Characteristics:**
- Black lead came (2-3px) around every surface, square corners, a 7px lead rivet in each corner.
- Four floor glass colors, one per window; the color of a window is set once and inherited by everything inside it.
- Lit state = the pane fills with its glass and its text turns lead-dark.
- Unreached progress is shown as dark, unglazed glass, never hidden.
- Motion steps in with a one-pixel overshoot; nothing in the UI glides.
- A white focus ring sits outside the lead, never on the glass.

## Colors

Near-black lead and smoked glass, lit by four jewel torch colors and one blood red.

### Primary
- **Firstlight Amber** (firstlight): the default glass. Lights Dive In, the title's language toggle, level-up and shop windows, the "new best" tag, text selection, and the logo's lowest band. It is the color of the first floor and of "start".

### Secondary
- **Hornfield Violet** (hornfield): the Blade Arts glass (title pane and window). The DOM value is lifted from the floor's in-game torch (150,110,255) so lead text on lit violet reaches 7:1; the canvas lancet keeps the torch value.
- **Mistwell Green** (mistwell): the How to play glass.
- **Canalis Blue** (canalis): the Settings glass.

### Tertiary
- **Blood Red** (blood): permadeath and destruction only. The death result window, the confirm dialog, the danger button, the "One life." rule box, unset key bindings, warnings.

### Neutral
- **Lead Came** (lead): every border, rivet, header came, and the text on any lit glass.
- **Spire Wall** (wall): the page behind the letterboxed canvas and the title wall's base.
- **Window Glass** (win-bg): the fill of every window body.
- **Raised Glass** (win-raise): buttons, cards, stats, keycaps, tab strip and window footers; one step above the window.
- **Came Highlight** (line): the 1px inner bevel on dark controls, empty pips, the off switch, scrollbars.
- **Parchment Ink** (ink): primary text, 15.2:1 on window glass.
- **Faded Ink** (ink-2): secondary text, hints, outputs, 8.3:1 on window glass.
- **Focus White** (focus): the focus ring only.

### Named Rules
**The One Glass Rule.** Each window or pane sets one floor color (`--glass`) and everything inside inherits it: header, hover fill, range accent, list markers, prices, pips, links. Don't mix two floor colors inside one window.

**The Lead Text Rule.** Text on lit glass is always lead (#0c0d12), never white; every floor glass color is tuned so lead on it holds at least 7:1.

**The Blood Is Death Rule.** Blood red marks permadeath and irreversible actions only. It is never a decorative accent or a fifth floor color.

## Typography

**Display Font:** Exo 2 800 (with Kanit, system-ui)
**Body Font:** Kanit 400/600 (with Exo 2, system-ui)
**Label/Mono Font:** Exo 2 700 for keycaps and bindings

**Character:** Exo 2 heavy is the game's own voice: wide, mechanical, used for titles, numbers and the pixel wordmark. Kanit is round and legible in both Thai and Latin and carries everything a player reads.

### Hierarchy
- **Wordmark** (Exo 2 800, set at 20px, thresholded to 1-bit alpha, drawn 4x with smoothing off; five-band gradient from #fff8e8 to firstlight over a lead outline): the FLOORBREAKER logo on the canvas only.
- **Display** (Exo 2 800, 30px, 0.06em; 34px and 0.1em on death): result titles, colored in the window's glass.
- **Headline** (Exo 2 800, clamp up to 30px, 1.1): the lit title pane (Dive In).
- **Title** (Exo 2 800, 17px window headers; clamp 15-21px pane titles; 1.1, 0.02em): window headers and title panes.
- **Numeral** (Exo 2 800, 22px, tabular): stat values. Toasts use the same face at 21px.
- **Body** (Kanit 400, 15px, 1.6): rows, dialogs, messages. Story dialogue 17px/1.7; hints and tips 14px/1.55-1.65.
- **Label** (Kanit 600, 16px): button labels; 13px 400 sub-lines in buttons and panes.
- **Keycap** (Exo 2 700, 12-13px, tabular): kbd hints and key bindings.

### Named Rules
**The Solid Thai Rule.** Tracking is for Latin titles only. Under `:lang(th)` pane titles, window headers and result titles set letter-spacing to 0 so vowel and tone marks stay attached.

**The Proper Noun Rule.** Game nouns (Blade Art names, Memory Shard, Gold, Potion, boss and town names, "System") stay English in both languages and are marked `lang="en"`; every other UI word is translated.

## Layout

The game canvas is letterboxed at 3:2 and centered; DOM over it is positioned in canvas coordinates (`--canvas-h`, `--canvas-w`, `--canvas-top`) so menus land on the painted architecture at any viewport size.

The title is one composition: four lancets across the width, the wordmark in a tracery band above them, and the menu standing on the sill at 73.5% of the canvas height as a row of panes (86% of canvas width). The lit pane grows 1.7x and rises 3% of the canvas height past the sill line. The language toggle and fullscreen are small leaded tabs pinned 12px inside the canvas's top corners; the best record sits centered at 95.5%.

Menu windows are a single centered column (440px, or 700px wide) on a 62% black scrim with 16px page padding; bodies use a 10px gap, 16px by 18px padding, and scroll inside the window, never the page. Grids inside windows are fixed: stats and paired buttons in two equal columns, picker cards in `auto-fit` columns of at least 170px, key bindings in groups of at least 190px. The story window sits along the bottom above the skill bar (17% of the canvas) so the world stays visible.

Portrait (aspect at or below 1:1): the canvas pins to the top under 56px of tab space, and the menu moves to the bottom in thumb reach as a three-column grid with the lit pane spanning the full row; secondary pane sub-lines drop except Dive In's permadeath line and the Blade Arts shard count.

Known gap: portrait has no recomposition of the lancet wall yet; it keeps the landscape wall, scaled small, at the top. This is an open item, not a rule to copy.

## Elevation & Depth

Depth is lead and light, not shadow. Surfaces separate by stepping glass tone (wall, window, raised) and by lead borders; the inner 1px highlight on every control reads as the bevel of a came. Shadows exist only as a large ambient drop under floating windows and panes, and as colored glow from lit glass.

### Shadow Vocabulary
- **Window drop** (`0 18px 50px rgba(0,0,0,.6)`): every floating window, paired with a 2px inset ring of its glass.
- **Pane drop** (`0 10px 22px rgba(0,0,0,.55)`): title panes resting on the sill.
- **Glass glow** (`0 0 28px` glass at 55%; `0 0 40px rgba(255,150,60,.45)` on the lit pane): light spilling from a lit pane onto the wall.
- **Came bevel** (`inset 0 0 0 1px` line at rest, white at 35-60% when lit): the inner edge of every control.

### Named Rules
**The Lit Not Lifted Rule.** A hovered or focused control does not move or grow a shadow; it fills with its glass. Glow is the only elevation change.

## Shapes

Every DOM surface is a rectangle with square corners (0px) held in lead: 3px on windows, panes and cards, 2px on buttons, stats, keycaps and selects. Rivets are 7px lead squares in all four corners of windows, panes and cards. A single diagonal lead came crosses each window header (104deg, at 71%) and each title pane (118deg); one continuous line per surface, never a pattern.

The canvas is where curves live: pointed equilateral lancet arches with two cusped lobes, quatrefoils in the spandrels, trefoil stops on the tracery band. All of it is drawn at half resolution and scaled up with smoothing off, so every lead line stays a hard 2px pixel line. Keycaps and key bindings carry a 4px bottom border as a physical key edge.

## Components

### Buttons
Small dark panes that light up in their window's glass.
- **Shape:** square (0px), 2px lead border, 1px inner came bevel; icon in a 28px lead square on the left, keycap pushed to the right.
- **Default:** raised glass, parchment ink, Kanit 600 16px, padding 10px 14px, full width.
- **Hover / Focus:** fills with the window glass, lead text, icon turns parchment; a two-step brighten (0.8 to 1.15 to 1, 180ms, `steps(2)`). Focus adds the white 3px ring at 3px offset.
- **Primary:** lit at rest; hover mixes the glass 20% toward white.
- **Ghost:** transparent and borderless in faded ink, auto width (Back, Skip, Restore keys); on hover it becomes a raised pane, not lit glass.
- **Danger:** blood glass at rest, lead text; only in the confirm dialog.

### Title Panes
The title menu as a row of leaded glass panes on the sill.
- **Rest:** dark glass tinted 26% toward the pane's floor color, 3px lead border, rivets, one diagonal came, 1px glass inner edge, pane drop.
- **Hover / Focus:** fills with its glass (white-mixed at the top), lead text, glass glow, two-step brighten.
- **Lit (Dive In, or Continue when a run is saved):** white-gold to firstlight glass at rest, wider and raised past the sill; its sub-line states permadeath and never hides.
- **Colors:** Dive In and Continue firstlight, Blade Arts hornfield, How to play mistwell, Settings canalis.

### Cards / Containers
- **Windows:** window glass, 3px lead border, 2px inset glass ring, rivets, window drop. The header is a strip of lit glass (glass mixed 30% white at top) with a 3px lead underline and one diagonal came; footers are raised glass under a 3px lead line.
- **Picker cards** (level-up, shop, Blade Arts): raised glass tinted 14% toward the glass, 3px lead, rivets, 14px padding; Kanit 600 17px name, 14px faded description, keycap number, upgrade pips (14 by 6px, glass when owned, the next one pulsing in steps). Hover lights the whole card. Equipped card: 2px inset glass ring. Disabled: 50% opacity.
- **Stats:** raised glass tiles, 2px lead, 13px faded label over a 22px Exo 2 tabular numeral, in a fixed two-column grid.
- **Rule box:** blood at 14% over window glass with a 1px blood edge; the bold lead-in is blood. Used for the permadeath statement.

### Inputs / Fields
- **Select:** raised glass, 2px lead, square, Kanit 15px.
- **Switch:** 44 by 24px square track in came gray with a 16px square knob; on, the track fills with glass and the knob turns lead, moving in two steps.
- **Range:** native slider with `accent-color` set to the window glass.
- **Key binding:** keycap-styled button (Exo 2 700 13px, 4px bottom edge); hover and listening fill with glass; unset bindings turn blood with a blood inner ring.
- **Focus:** one treatment for every control, a white 3px outline at 3px offset; mouse focus shows none.

### Navigation
- **Settings tabs:** a raised strip with a 3px lead base; Kanit 600 15px tabs in faded ink, the selected tab takes window glass as background and a 3px glass underline.
- **Title tabs** (language, fullscreen): small leaded tabs (Exo 2 600 13px, 2px lead, translucent window glass); the pressed language lights firstlight. The two language tabs share one lead line.

### Lancet Wall (signature)
The canvas title background. Four lancets (84 by 226 buffer px at 2x), glazed as a jittered 4 by 9 grid of panes in shades of the floor torch color, lighter toward the top; the boss sprite outlined in lead as the figure; the town name letter-spaced in the inscription band at the foot. Unreached lancets are unglazed dark glass with a 18%-brightness desaturated silhouette and "? ? ?". Light pools on the wall below each glazed lancet, and a shaft breathes through it (still when flashing is off). Dive In floods the wall white (black with flashing off) over 0.35s, then rings in the four floor colors rush outward under "DIVE IN".

### Toast and Story
- **Toast:** a plain window without a header, centered at 16% of the canvas, Exo 2 800 21px title over a 14px faded sub-line; enters and leaves in 24 steps and hides whenever a menu window is open.
- **Story:** a wide window along the bottom with the speaker in the header and Kanit 17px/1.7 text over a faint bottom scrim.

## Do's and Don'ts

### Do:
- **Do** hold every DOM window, pane, card, button, keycap and field in lead with square corners: 3px for surfaces, 2px for controls, 7px rivets on windows, panes and cards.
- **Do** set one `--glass` per window or pane and let everything inside inherit it.
- **Do** light a control on hover and focus by filling it with its glass and switching its text to lead (#0c0d12).
- **Do** step every UI state change: `steps()` timing, a one-pixel or one-brightness overshoot, 160-300ms.
- **Do** show unreached progress as dark unglazed glass, and keep the permadeath line visible on Dive In at every size.
- **Do** draw canvas architecture at half resolution and scale it up with smoothing off; render sprites with `image-rendering: pixelated`.
- **Do** set Thai solid (letter-spacing 0) and mark English proper nouns `lang="en"`.
- **Do** keep the white focus ring outside the lead (3px at 3px offset), never as a glass fill.

### Don't:
- **Don't** round a DOM surface or control; curves belong to the canvas tracery (arches, cusps, foils), not to menus.
- **Don't** put white or parchment text on lit glass.
- **Don't** use blood red for anything but death, destruction and warnings.
- **Don't** ease or glide UI state; the exceptions are the 160ms scrim fade behind a window, the canvas light breathing and the Dive In rings.
- **Don't** raise a control with a shadow or translate on hover; glass glow is the only lift.
- **Don't** mix two floor colors inside one window.
