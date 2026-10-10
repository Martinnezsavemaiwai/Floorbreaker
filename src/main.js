// Entry point: fonts/styles, input wiring, the frame loop, and the dev-only test hook.
// Self-hosted fonts (Fontsource): Kanit for Thai, Exo 2 for numbers/Latin
import '@fontsource/kanit/300.css';
import { tr, applyLang } from './core/i18n.ts';
import '@fontsource/kanit/400.css';
import '@fontsource/kanit/600.css';
import '@fontsource/exo-2/700.css';
import '@fontsource/exo-2/800.css';
import './style.css';
import { W, H } from './world/constants.ts';
import { G } from './world/state.ts';
import { loadFloor } from './world/floor.ts';
import { hitWall } from './world/physics.ts';
import { scenes, clock } from './core/app.ts';
import { runFrames } from './core/loop.ts';
import { ready } from './core/assets.ts';
import { pad, pollPad, rumble } from './core/gamepad.ts';
import { PAD, PAD_BUTTONS } from './data/controls.ts';
import { on } from './core/events.ts';
import { settings } from './core/save.ts';
import { keys, mouse, actionForKey, actionForButton, releaseAll, keyLabel } from './core/input.ts';
import { drinkPotion } from './systems/shop.js';
import { SHOP } from './data/shop.ts';
import { attack, skill, roll, hurtPlayer, hurtEnemy, startBossMove, updateGame, updateFx } from './systems/index.js';
import { drawWorld } from './render/world.js';
import { cv } from './render/canvas.js';
import { toggleMute, initAudio, playMusic } from './audio/audio.js';
import { $, current, closeSub, inSubScreen, openSub, toast, bindActions, dialogOpen } from './ui/screens.js';
import { resetKeys, downloadSave, pickImport } from './ui/settings.js';
import { titleScene, playing, newGame, pauseGame, resumeGame, startIntro, continueRun, goHome, saveAndQuit, suspendRun, picking, pickUpgrade,
  shopping, openShop, closeShop, buyItem, reading, storyNext, storySkip } from './scenes/index.js';

function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen?.().catch(() => {});
}
const mute = () => toast(toggleMute() ? tr('ปิดเสียงแล้ว', 'Sound off') : tr('เปิดเสียงแล้ว', 'Sound on'), tr(`กด ${keyLabel('mute')} เพื่อสลับ`, `Press ${keyLabel('mute')} to toggle`), 1.4);

bindActions({
  start: () => ready.then(startIntro), continue: () => ready.then(continueRun),
  howto: () => openSub('howto'), skills: () => openSub('skills'), settings: () => openSub('settings'), back: closeSub,
  resume: resumeGame, saveQuit: saveAndQuit, home: goHome, fullscreen: toggleFullscreen,
  resetKeys, exportSave: downloadSave, importSave: pickImport, closeShop, storyNext, storySkip,
});

// Keyboard: physical keys -> actions (data/controls.ts + rebinding). Gameplay keys only count while a live character is in control.
const GAME_ACTIONS = { attack, skill: () => skill(0), skill2: () => skill(1), dodge: roll, mute, potion: drinkPotion, interact: openShop };
addEventListener('keydown', e => {
  if (dialogOpen()) return; // the confirm <dialog> handles its own keys (Esc = cancel)
  if (picking() && /^(Digit|Numpad)[1-9]$/.test(e.code)) return pickUpgrade(+e.code.at(-1) - 1);
  const action = actionForKey(e.code);
  if (reading()) { // Enter / Space / attack advance (handled here, so the focused button doesn't click too); Esc skips
    if (e.repeat) return;
    if (['Enter', 'NumpadEnter', 'Space'].includes(e.code) || action === 'attack' || action === 'interact') { e.preventDefault(); storyNext(); }
    else if (action === 'pause') storySkip();
    return;
  }
  if (shopping()) { // number keys buy, Esc / interact leaves
    if (/^(Digit|Numpad)[1-9]$/.test(e.code)) buyItem(Object.keys(SHOP)[+e.code.at(-1) - 1]);
    else if ((action === 'pause' || action === 'interact') && !e.repeat) closeShop();
    return;
  }
  if (action === 'fullscreen' && !e.repeat) return toggleFullscreen();
  if (action === 'pause') return back();
  if (!playing()) return; // leave keys alone while a menu (sliders, buttons) has focus
  keys[e.code] = true;
  if (action === 'dodge') e.preventDefault(); // Space must not also press a focused button or scroll
  if (GAME_ACTIONS[action] && !(action === 'mute' && e.repeat)) GAME_ACTIONS[action]();
});
addEventListener('keyup', e => { keys[e.code] = false; });
// Esc / Start / B: pause in play, otherwise close whatever is open, one layer at a time
function back() {
  if (playing()) pauseGame();
  else if (reading()) storySkip();
  else if (shopping()) closeShop();
  else if (current === 'pause') resumeGame();
  else if (inSubScreen()) closeSub();
  else if (current === 'result') goHome();
}

// Gamepad: in play the buttons are game actions; in menus the d-pad walks the focus, A presses, B goes back
const focusables = () => /** @type {HTMLElement[]} */ ([...(document.querySelector('dialog[open]') ?? document.querySelector('.screen.on'))?.querySelectorAll(
  'button:not([hidden]):not([disabled]), input, select, [role=tab][aria-selected=true]') ?? []]).filter(el => el.offsetParent); // visible only
function padMenu(btn) {
  const list = focusables(), el = /** @type {HTMLElement} */ (document.activeElement), i = list.indexOf(el);
  if (btn === PAD.A) return i < 0 ? list[0]?.focus() : el.click();
  if (btn === PAD.B || btn === 9) return dialogOpen() ? /** @type {HTMLDialogElement} */ ($('confirm')).close('cancel') : back();
  const step = btn === PAD.UP || btn === PAD.LEFT ? -1 : btn === PAD.DOWN || btn === PAD.RIGHT ? 1 : 0;
  if (!step) return;
  if (el instanceof HTMLInputElement && el.type === 'range' && (btn === PAD.LEFT || btn === PAD.RIGHT)) { // sliders take left/right
    step > 0 ? el.stepUp() : el.stepDown(); el.dispatchEvent(new Event('input', { bubbles: true })); return;
  }
  list[(i + step + list.length) % list.length]?.focus();
}
function padPress(btn) {
  if (!playing()) return padMenu(btn);
  const a = PAD_BUTTONS[btn];
  if (a === 'pause') back(); else GAME_ACTIONS[a]?.();
}
addEventListener('gamepadconnected', () => toast(tr('เชื่อมต่อจอยแล้ว', 'Gamepad connected'), tr('สติ๊กซ้ายเดิน สติ๊กขวาเล็ง X ฟัน A กลิ้ง RB/RT ใช้ Blade Art', 'Left stick walks, right stick aims, X attacks, A rolls, RB/RT for Blade Arts.'), 3.5));
on('playerHurt', () => { if (settings.shake) rumble(0.6); });
on('guardBreak', () => { if (settings.shake) rumble(0.3, 80); });
addEventListener('blur', () => { releaseAll(); pauseGame(); });
cv.addEventListener('mousemove', e => {
  const r = cv.getBoundingClientRect();
  mouse.x = (e.clientX - r.left) * W / r.width; mouse.y = (e.clientY - r.top) * H / r.height;
  pad.active = false; // the mouse takes aiming back from the pad
});
cv.addEventListener('mousedown', e => {
  const a = actionForButton(e.button);
  if (a) e.preventDefault(); // middle button = Blade Art 2, not autoscroll
  if (a && playing()) GAME_ACTIONS[a]();
});
cv.addEventListener('contextmenu', e => e.preventDefault());
mouse.x = W / 2; mouse.y = H / 2;

const frames = runFrames(real => { for (const b of pollPad()) padPress(b); clock.advance(real); scenes.draw(); });
// Switching tabs doesn't always fire blur; pause there too and drop the stale frame time
// Leaving the tab also writes the suspend save, so closing it mid-run loses nothing
document.addEventListener('visibilitychange', () => { if (document.hidden) { pauseGame(); suspendRun(); } else frames.reset(); });
addEventListener('pagehide', suspendRun);
applyLang();
scenes.replace(titleScene);
// Browsers only allow sound after a user gesture: start audio (and the title music) on the first click or key
const unlockAudio = () => { initAudio(); if (current === 'title-screen') playMusic('title'); };
addEventListener('pointerdown', unlockAudio, { once: true });
addEventListener('keydown', unlockAudio, { once: true });

// Dev-only handle for console/bot playtests; stripped from production builds.
if (import.meta.env.DEV) {
  const live = { state: () => G.run?.over || scenes.top?.name, P: () => G.P, mobs: () => G.mobs, shots: () => G.shots, boss: () => G.boss, F: () => G.F,
                 floorIdx: () => G.floorIdx, L: () => G.L, doors: () => G.doors, room: () => G.room, portal: () => G.portal, run: () => G.run, clock: () => clock, scenes: () => scenes, cam: () => G.cam };
  /** @type {any} */ (window).__saoy = Object.defineProperties(
    { tick: dt => clock.advance(dt), update: updateGame, updateFx, draw: drawWorld, newGame, loadFloor, attack, skill, hurtPlayer, hurtEnemy,
      hitWall, startBossMove, keys, mouse, ready, consts: { W, H } },
    Object.fromEntries(Object.entries(live).map(([k, get]) => [k, { get }])));
}
