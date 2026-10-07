// The four scenes and the transitions between them: title -> intro -> play, with pause pushed on top of play.
import { G } from '../world/state.ts';
import { newRun } from '../world/floor.ts';
import { scenes } from '../core/app.ts';
import { releaseAll } from '../core/input.ts';
import { updateGame, updateFx } from '../systems/index.js';
import { drawWorld } from '../render/world.js';
import { updateMenuBg, drawMenuBg, drawIntro, INTRO_TIME } from '../render/menu.js';
import { initAudio, stopMusic, pauseMusic, resumeMusic, SFX } from '../audio/audio.js';
import { screen, renderRecord, showPauseStats } from '../ui/screens.js';

export const titleScene = {
  name: 'menu',
  enter() { G.P = null; G.run = null; stopMusic(); renderRecord(); screen('title-screen'); },
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

export const playing = () => scenes.top === playScene && !G.run?.over; // in control of a live character
export function newGame() { newRun(); if (scenes.top !== playScene) scenes.replace(playScene); }
export function pauseGame() { if (playing()) scenes.push(pauseScene); }
export function resumeGame() { if (scenes.top === pauseScene) scenes.pop(); }
export function startIntro() { initAudio(); scenes.replace(introScene); }
export function goHome() { scenes.replace(titleScene); }
