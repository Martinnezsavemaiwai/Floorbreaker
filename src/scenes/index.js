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
import { initAudio, stopMusic, playMusic, pauseMusic, resumeMusic, SFX } from '../audio/audio.js';
import { screen, showPauseStats, showUpgradePicker, renderShop, showStoryLine, confirmDialog, $ } from '../ui/screens.js';
import { nearMerchant, buy } from '../systems/shop.js';
import { STORY } from '../data/story.ts';
import { meta, saveMeta } from '../core/save.ts';
import { SHOP } from '../data/shop.ts';
import { rollOffer, applyUpgrade, hasPendingUpgrade } from '../systems/upgrades.js';

let resume = null; // suspend data to continue from once the intro finishes

export const titleScene = {
  name: 'menu',
  enter() { G.P = null; G.run = null; storyQueue.length = 0; playMusic('title'); screen('title-screen'); }, // silent until the first click/key (autoplay rules)
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
  update(dt) {
    if (!G.run.over) updateGame(dt);
    updateFx(dt); // after death/clear the shatter FX keep playing
    if (G.run.over) return;
    if (storyQueue.length) scenes.push(storyScene);
    else if (hasPendingUpgrade()) scenes.push(upgradeScene);
  },
  draw: drawWorld,
};
const pauseScene = {
  name: 'paused', blocksUpdate: true, // Play keeps drawing underneath, frozen
  enter() { releaseAll(); pauseMusic(); showPauseStats(); screen('pause'); },
  exit() { screen(null); resumeMusic(); },
};

// Level-up picker: freezes play like pause; one pick per pending level, then back to the fight
let offer = [];
const upgradeScene = {
  name: 'upgrade', blocksUpdate: true,
  enter() { releaseAll(); offer = rollOffer(); showUpgradePicker(offer); },
  exit() { screen(null); },
};
export const picking = () => scenes.top === upgradeScene;
export function pickUpgrade(i) {
  if (!picking() || !offer[i]) return;
  applyUpgrade(offer[i]);
  scenes.pop(); // play re-pushes the picker next step if another level is still pending
}
$('upgrade-cards').addEventListener('click', e => {
  const card = /** @type {HTMLElement | null} */ (/** @type {Element} */ (e.target).closest('[data-pick]'));
  if (card) pickUpgrade(+card.dataset.pick);
});

// Town shop: also freezes play. A bought Skill Scroll adds a pending pick, so the picker opens right after leaving.
const shopScene = {
  name: 'shop', blocksUpdate: true,
  enter() { releaseAll(); renderShop(); screen('shop'); },
  exit() { screen(null); },
};
export const shopping = () => scenes.top === shopScene;
export function openShop() { if (playing() && nearMerchant()) scenes.push(shopScene); }
export function closeShop() { if (shopping()) scenes.pop(); }
export function buyItem(id) {
  if (!shopping() || !SHOP[id]) return;
  renderShop(buy(id) ? `ซื้อ ${SHOP[id].name} แล้ว` : 'Gold ไม่พอ หรือของเต็มแล้ว');
}
$('shop-items').addEventListener('click', e => {
  const card = /** @type {HTMLElement | null} */ (/** @type {Element} */ (e.target).closest('[data-buy]'));
  if (card) buyItem(card.dataset.buy);
});

// Story: a floor's beat plays once per save, the first time that floor loads (queued, shown on the next play step)
const storyQueue = [];
let line = 0;
on('floorLoaded', i => { const id = 'floor' + i; if (STORY[id] && !meta.storySeen.includes(id)) storyQueue.push(id); });
const storyScene = {
  name: 'story', blocksUpdate: true,
  enter() { releaseAll(); line = 0; showStory(); },
  exit() {
    const id = storyQueue.shift();
    if (!meta.storySeen.includes(id)) { meta.storySeen.push(id); saveMeta(); }
    screen(G.run?.over ? 'result' : null); // the ending hands over to the result screen
  },
};
on('ending', () => { if (scenes.top === playScene) { storyQueue.push('ending'); scenes.push(storyScene); } });
const showStory = () => { const lines = STORY[storyQueue[0]]; showStoryLine(lines[line], line, lines.length); };
export const reading = () => scenes.top === storyScene;
export function storyNext() {
  if (!reading()) return;
  if (++line < STORY[storyQueue[0]].length) showStory(); else scenes.pop();
}
export function storySkip() { if (reading()) scenes.pop(); }

const liveRun = () => G.run && !G.run.over && (scenes.top === playScene || scenes.top === pauseScene || scenes.top === upgradeScene || scenes.top === shopScene || scenes.top === storyScene);
export const playing = () => scenes.top === playScene && !G.run?.over; // in control of a live character

export function newGame() {
  if (resume) { resumeRun(resume); resume = null; } else newRun();
  if (scenes.top !== playScene) scenes.replace(playScene);
}
export function pauseGame() { if (playing()) scenes.push(pauseScene); }
export function resumeGame() { if (scenes.top === pauseScene) scenes.pop(); }
export function goHome() { scenes.replace(titleScene); }

// Dive In = a brand-new character; it replaces (deletes) a suspended run after asking
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
