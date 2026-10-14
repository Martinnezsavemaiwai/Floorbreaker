// The four scenes and the transitions between them: title -> intro -> play, with pause pushed on top of play.
// Also owns the run lifecycle around the suspend slot: save on quit / tab close, consume on continue,
// delete when the run ends (permadeath) or a new character starts.
import { G } from '../world/state.ts';
import { tr } from '../core/i18n.ts';
import { newRun, resumeRun } from '../world/floor.ts';
import { scenes, clock } from '../core/app.ts';
import { releaseAll } from '../core/input.ts';
import { settings, loadSuspend, writeSuspend, clearSuspend } from '../core/save.ts';
import { on } from '../core/events.ts';
import { updateGame, updateFx } from '../systems/index.js';
import { drawWorld } from '../render/world.js';
import { stopPreviews } from '../render/preview.js';
import { refreshMenuBg, drawMenuBg, drawIntro, INTRO_TIME } from '../render/menu.js';
import { initAudio, stopMusic, playMusic, pauseMusic, resumeMusic, SFX } from '../audio/audio.js';
import { screen, showPicker, renderShop, renderShrine, showStoryLine, confirmDialog, $ } from '../ui/screens.js';
import { nearMerchant, buy, price, canBuy } from '../systems/shop.js';
import { nearShrine, take } from '../systems/shrine.js';
import { kindOf, actOf } from '../data/run.ts';
import { STORY } from '../data/story.ts';
import { meta, saveMeta } from '../core/save.ts';
import { SHOP } from '../data/shop.ts';
import { sayEvent, shopText, potionsFullText } from '../systems/merchant.js';
import { nextPick, cardsFor, applyCard } from '../systems/build.js';

let resume = null; // suspend data to continue from once the intro finishes

export const titleScene = {
  name: 'menu',
  enter() { clock.scale = settings.assistSpeed; G.P = null; G.run = null; storyQueue.length = 0; refreshMenuBg(); playMusic('title'); screen('title-screen'); }, // silent until the first click/key (autoplay rules)
  update() {}, draw: drawMenuBg,
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
    else if (nextPick()) scenes.push(pickScene);
  },
  draw: drawWorld,
};
const pauseScene = {
  name: 'paused', blocksUpdate: true, // Play keeps drawing underneath, frozen
  enter() { releaseAll(); pauseMusic(); screen('pause'); },
  exit() { screen(null); resumeMusic(); },
};

// Pick scene: freezes play like pause. Shows a level-up, a new-Art (elite) or an evolution (boss) pick;
// a new Art with both slots full asks which slot to replace in a second step.
let pickKind = null, cards = [];
const pickScene = {
  name: 'upgrade', blocksUpdate: true,
  enter() { releaseAll(); pickKind = nextPick(); cards = cardsFor(pickKind); showPicker(pickKind, cards); },
  exit() { stopPreviews(); screen(null); },
};
export const picking = () => scenes.top === pickScene;
export function pickUpgrade(i) {
  if (!picking() || !cards[i]) return;
  const follow = applyCard(cards[i], pickKind);
  if (follow) { cards = follow; showPicker(follow[0].kind === 'replace' || follow[0].kind === 'skip' ? 'replace' : 'modart', cards); return; }
  scenes.pop(); // play re-pushes the scene next step while picks remain
}
$('upgrade-cards').addEventListener('click', e => {
  const card = /** @type {HTMLElement | null} */ (/** @type {Element} */ (e.target).closest('[data-pick]'));
  if (card) pickUpgrade(+card.dataset.pick);
});

// Town shop: also freezes play. A bought Skill Scroll adds a pending pick, so the picker opens right after leaving.
const shopScene = {
  name: 'shop', blocksUpdate: true,
  enter() { releaseAll(); renderShop('', shopText('open')); if (G.npc.merchant) G.npc.merchant.greeted = true; screen('shop'); },
  exit() { screen(null); },
};
export const shopping = () => scenes.top === shopScene;
export function openShop() { if (playing() && nearMerchant()) scenes.push(shopScene); }
export function closeShop() { if (shopping()) { scenes.pop(); sayEvent('farewell'); } }
export function buyItem(id) {
  if (!shopping() || !SHOP[id]) return;
  const noRoom = id === 'mod' && G.P.col >= price(id) && !canBuy(id);
  const ok = buy(id);
  renderShop(ok ? tr(`ซื้อ ${SHOP[id].name} แล้ว`, `Bought: ${SHOP[id].name}`)
    : noRoom ? tr('ไม่มีท่าไหนใส่ธาตุเพิ่มได้แล้ว', 'None of your Arts has room for another element.')
    : tr('Gold ไม่พอ หรือพกเต็มแล้ว', "Not enough Gold, or you can't carry more"),
    ok ? shopText(id === 'mod' ? 'boughtMod' : 'bought') : G.P.col < price(id) ? shopText('cantAfford')
      : id === 'potion' && G.P.potions >= SHOP.potion.max ? potionsFullText() : shopText('cantAfford'));
}
$('shop-items').addEventListener('click', e => {
  const card = /** @type {HTMLElement | null} */ (/** @type {Element} */ (e.target).closest('[data-buy]'));
  if (card) buyItem(card.dataset.buy);
});

// Shrine: freezes play like the shop. An offer that needs a choice queues a pick, which opens after leaving.
const shrineScene = {
  name: 'shrine', blocksUpdate: true,
  enter() { releaseAll(); renderShrine(); screen('shrine'); },
  exit() { screen(null); },
};
export const atShrine = () => scenes.top === shrineScene;
export function openShrine() { if (playing() && nearShrine()) scenes.push(shrineScene); }
export function closeShrine() { if (atShrine()) scenes.pop(); }
export function takeOffer(id) { if (atShrine() && take(id)) scenes.pop(); }
$('shrine-offers').addEventListener('click', e => {
  const card = /** @type {HTMLElement | null} */ (/** @type {Element} */ (e.target).closest('[data-offer]'));
  if (card) takeOffer(card.dataset.offer);
});
// Interact: the merchant if one is near, else the shrine
export function interact() { if (nearMerchant()) openShop(); else openShrine(); }

// Story: a floor's beat plays once per save, the first time that floor loads (queued, shown on the next play step)
const storyQueue = [];
let line = 0;
on('floorLoaded', i => {
  if (kindOf(i) !== 'town') return;
  const id = 'floor' + actOf(i);
  if (STORY[id] && !meta.storySeen.includes(id)) storyQueue.push(id);
});
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

const liveRun = () => G.run && !G.run.over && (scenes.top === playScene || scenes.top === pauseScene || scenes.top === pickScene || scenes.top === shopScene || scenes.top === shrineScene || scenes.top === storyScene);
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
  if (saved && !await confirmDialog({ title: tr('เริ่มตัวละครใหม่?', 'Start a new character?'), ok: tr('เริ่มใหม่', 'Start over'),
    msg: tr(`ตัวละคร Lv.${saved.player.lv} ที่เซฟไว้จะถูกลบ และกู้คืนไม่ได้`, `Your saved Lv.${saved.player.lv} character will be deleted. This can't be undone.`) })) return;
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
export function suspendRun() { if (liveRun()) writeSuspend(G.entry); }
export function saveAndQuit() { suspendRun(); goHome(); }

on('runOver', clearSuspend); // permadeath: a finished run can't be continued
