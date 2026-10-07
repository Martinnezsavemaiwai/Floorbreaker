// The four scenes and the transitions between them: title -> intro -> play, with pause pushed on top of play.
// Also owns the run lifecycle around the suspend slot: save on quit / tab close, consume on continue,
// delete when the run ends (permadeath) or a new character starts.
import { G } from '../world/state.ts';
import { newRun, resumeRun, snapshotRun } from '../world/floor.ts';
import { scenes } from '../core/app.ts';
import { releaseAll } from '../core/input.ts';
import { loadSuspend, writeSuspend, clearSuspend } from '../core/save.ts';
import { on } from '../core/events.ts';
import { updateGame, updateFx } from '../systems/index.js';
import { drawWorld } from '../render/world.js';
import { updateMenuBg, drawMenuBg, drawIntro, INTRO_TIME } from '../render/menu.js';
import { initAudio, stopMusic, pauseMusic, resumeMusic, SFX } from '../audio/audio.js';
import { screen, showPauseStats, confirmDialog } from '../ui/screens.js';

let resume = null; // suspend data to continue from once the intro finishes

export const titleScene = {
  name: 'menu',
  enter() { G.P = null; G.run = null; stopMusic(); screen('title-screen'); },
  update: updateMenuBg, draw: drawMenuBg,
};
const introScene = {
  name: 'intro',
  enter() { screen(null); stopMusic(); G.introT = 0; SFX.linkStart(); },
  update(dt) { G.introT += dt; if (G.introT > INTRO_TIME) newGame(); },
  draw: drawIntro,
};
const playScene = {
  name: 'play',
  update(dt) { if (!G.run.over) updateGame(dt); updateFx(dt); }, // after death/clear the shatter FX keep playing
  draw: drawWorld,
};
const pauseScene = {
  name: 'paused', blocksUpdate: true, // Play keeps drawing underneath, frozen
  enter() { releaseAll(); pauseMusic(); showPauseStats(); screen('pause'); },
  exit() { screen(null); resumeMusic(); },
};

const liveRun = () => G.run && !G.run.over && (scenes.top === playScene || scenes.top === pauseScene);
export const playing = () => scenes.top === playScene && !G.run?.over; // in control of a live character

export function newGame() {
  if (resume) { resumeRun(resume); resume = null; } else newRun();
  if (scenes.top !== playScene) scenes.replace(playScene);
}
export function pauseGame() { if (playing()) scenes.push(pauseScene); }
export function resumeGame() { if (scenes.top === pauseScene) scenes.pop(); }
export function goHome() { scenes.replace(titleScene); }

// Link Start = a brand-new character; it replaces (deletes) a suspended run after asking
export async function startIntro() {
  const saved = loadSuspend();
  if (saved && !await confirmDialog({ title: 'เริ่มตัวละครใหม่?', ok: 'เริ่มใหม่',
    msg: `ตัวละครที่เซฟพักไว้ (Lv.${saved.player.lv}) จะหายถาวร` })) return;
  clearSuspend(); resume = null;
  initAudio(); scenes.replace(introScene);
}
// Continue = load the suspended run; the slot is consumed (roguelike rule) and rewritten on the next quit
export function continueRun() {
  resume = loadSuspend();
  if (!resume) return;
  clearSuspend();
  initAudio(); scenes.replace(introScene);
}
export function suspendRun() { if (liveRun()) writeSuspend(snapshotRun()); }
export function saveAndQuit() { suspendRun(); goHome(); }

on('runOver', clearSuspend); // permadeath: a finished run can't be continued
