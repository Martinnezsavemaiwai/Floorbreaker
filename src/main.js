// Entry point: fonts/styles, input wiring, the frame loop, and the dev-only test hook.
// Self-hosted fonts (Fontsource): Kanit for Thai, Exo 2 for numbers/Latin
import '@fontsource/kanit/300.css';
import '@fontsource/kanit/400.css';
import '@fontsource/kanit/600.css';
import '@fontsource/exo-2/700.css';
import '@fontsource/exo-2/800.css';
import './style.css';
import { W, H, WORLD, TOWN_X, ROOM_X } from './world/constants.ts';
import { G } from './world/state.ts';
import { loadFloor } from './world/floor.ts';
import { hitWall } from './world/physics.ts';
import { scenes, clock } from './core/app.ts';
import { runFrames } from './core/loop.ts';
import { ready } from './core/assets.ts';
import { keys, mouse, actionForKey, actionForButton, releaseAll, keyLabel } from './core/input.ts';
import { attack, skill, hurtPlayer, startBossMove, updateGame, updateFx } from './systems/index.js';
import { drawWorld } from './render/world.js';
import { cv } from './render/canvas.js';
import { toggleMute } from './audio/audio.js';
import { current, closeSub, inSubScreen, openSub, toast, bindActions, dialogOpen } from './ui/screens.js';
import { resetKeys, downloadSave, pickImport } from './ui/settings.js';
import { titleScene, playing, newGame, pauseGame, resumeGame, startIntro, continueRun, goHome, saveAndQuit, suspendRun, picking, pickUpgrade } from './scenes/index.js';

function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen?.().catch(() => {});
}
const mute = () => toast(toggleMute() ? 'ปิดเสียงแล้ว' : 'เปิดเสียงแล้ว', `กด ${keyLabel('mute')} เพื่อสลับ`, 1.4);

bindActions({
  start: () => ready.then(startIntro), continue: () => ready.then(continueRun),
  howto: () => openSub('howto'), settings: () => openSub('settings'), back: closeSub,
  resume: resumeGame, saveQuit: saveAndQuit, home: goHome, fullscreen: toggleFullscreen,
  resetKeys, exportSave: downloadSave, importSave: pickImport,
});

// Keyboard: physical keys -> actions (data/controls.ts + rebinding). Gameplay keys only count while a live character is in control.
const GAME_ACTIONS = { attack, skill, mute };
addEventListener('keydown', e => {
  if (dialogOpen()) return; // the confirm <dialog> handles its own keys (Esc = cancel)
  if (picking() && /^(Digit|Numpad)[1-9]$/.test(e.code)) return pickUpgrade(+e.code.at(-1) - 1);
  const action = actionForKey(e.code);
  if (action === 'fullscreen' && !e.repeat) return toggleFullscreen();
  if (action === 'pause') {
    if (playing()) pauseGame();
    else if (current === 'pause') resumeGame();
    else if (inSubScreen()) closeSub();
    else if (current === 'result') goHome();
    return;
  }
  if (!playing()) return; // leave keys alone while a menu (sliders, buttons) has focus
  keys[e.code] = true;
  if (GAME_ACTIONS[action] && !(action === 'mute' && e.repeat)) GAME_ACTIONS[action]();
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { releaseAll(); pauseGame(); });
cv.addEventListener('mousemove', e => {
  const r = cv.getBoundingClientRect();
  mouse.x = (e.clientX - r.left) * W / r.width; mouse.y = (e.clientY - r.top) * H / r.height;
});
cv.addEventListener('mousedown', e => { const a = actionForButton(e.button); if (a && playing()) GAME_ACTIONS[a](); });
cv.addEventListener('contextmenu', e => e.preventDefault());
mouse.x = W / 2; mouse.y = H / 2;

const frames = runFrames(real => { clock.advance(real); scenes.draw(); });
// Switching tabs doesn't always fire blur; pause there too and drop the stale frame time
// Leaving the tab also writes the suspend save, so closing it mid-run loses nothing
document.addEventListener('visibilitychange', () => { if (document.hidden) { pauseGame(); suspendRun(); } else frames.reset(); });
addEventListener('pagehide', suspendRun);
scenes.replace(titleScene);

// Dev-only handle for console/bot playtests; stripped from production builds.
if (import.meta.env.DEV) {
  const live = { state: () => G.run?.over || scenes.top?.name, P: () => G.P, mobs: () => G.mobs, shots: () => G.shots, boss: () => G.boss, F: () => G.F,
                 floorIdx: () => G.floorIdx, portal: () => G.portal, run: () => G.run, clock: () => clock, scenes: () => scenes, cam: () => G.cam };
  /** @type {any} */ (window).__saoy = Object.defineProperties(
    { tick: dt => clock.advance(dt), update: updateGame, updateFx, draw: drawWorld, newGame, loadFloor, attack, skill, hurtPlayer,
      hitWall, startBossMove, keys, mouse, ready, consts: { W, H, WORLD, TOWN_X, ROOM_X } },
    Object.fromEntries(Object.entries(live).map(([k, get]) => [k, { get }])));
}
