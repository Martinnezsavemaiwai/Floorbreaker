// DOM overlay screens (title, how-to, pause, result) and the toast queue. Reads game state, never owns it.
import { G } from '../world/state.ts';
import { meta, saveMeta, loadSuspend, takeLegacyNotice } from '../core/save.ts';
import { on, emit } from '../core/events.ts';
import { keyLabel } from '../core/input.ts';
import { FLOOR_COUNT, SHRINE, SHRINE_IDS, ROOM_RULES } from '../data/run.ts';
import { floorLabel } from '../world/floor.ts';
import { UPGRADES } from '../data/upgrades.ts';
import { SHOP } from '../data/shop.ts';
import { price, canBuy, shopItems } from '../systems/shop.js';
import { canTake } from '../systems/shrine.js';
import { SKILLS, BLADE_EVO, artName, evoName } from '../data/skills.ts';
import { ownedArts, artElements, setProgress } from '../systems/build.js';
import { ELEMENTS } from '../data/elements.ts';
import { awardShards, isUnlocked, unlockSkill } from '../systems/meta.js';
import { SFX } from '../audio/audio.js';
import { t, tr } from '../core/i18n.ts';
import { previewFor, startPreviews } from '../render/preview.js';
import { IMG } from '../core/assets.ts';

export const $ = id => /** @type {any} */ (document.getElementById(id)); // DOM ids come from index.html
const fmtTime = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export let current = 'title-screen';
let backTo = 'title-screen';
export function screen(id) {
  current = id;
  for (const s of document.querySelectorAll('.screen')) s.classList.toggle('on', s.id === id);
  if (id === 'title-screen') { renderTitle(); clearToasts(); } // a run's banners don't belong on the title
  if (id === 'howto') renderHowTo();
  if (id === 'skills') renderSkills();
  if (id === 'pause') showPauseStats(); // also on the way back from settings, where the language may have changed
  // focus the likely action first: the open tab, the lit pane, the primary button, then anything usable
  const el = $(id), first = ['[role=tab][aria-selected=true]', '.pane.lit', '.btn.primary:not([hidden])', '.btn, .pane, input'].map(q => el?.querySelector(q)).find(Boolean);
  /** @type {HTMLElement | undefined} */ (first)?.focus({ preventScroll: true });
}
export const openSub = id => { backTo = current; screen(id); };
export const closeSub = () => screen(backTo);
export const inSubScreen = () => current === 'howto' || current === 'settings' || current === 'skills';

// Toasts queue up so a floor banner and a tutorial hint never overwrite each other.
// `floor` toasts (banners, cleared, challenge result) go stale once you move on: a new floor drops them.
const queue = [];
let showing = null, timer = 0;
function clearToasts() { emit('toastsCleared'); queue.length = 0; clearTimeout(timer); showing = null; $('toast').classList.remove('on'); $('moment').classList.remove('on'); }
export function toast(title, sub, sec = 3.2, floor = false) {
  queue[floor ? 'unshift' : 'push']({ title, sub, sec, floor }); emit('toast', sec); // floor news can't wait behind hints
  if (!showing) nextToast();
}
function dropFloorToasts() {
  let sec = 0;
  for (let i = queue.length - 1; i >= 0; i--) if (queue[i].floor) sec += queue.splice(i, 1)[0].sec;
  if (showing?.floor) { clearTimeout(timer); sec += showing.sec; showing = null; }
  emit('toast', -sec); // hand the dropped time back (the merchant waits for banners to clear)
}
function nextToast() {
  const item = queue.shift();
  showing = item ?? null;
  if (!item) return;
  $('toast-title').textContent = item.title; $('toast-sub').textContent = item.sub;
  const t = $('toast'); t.classList.remove('on'); void t.offsetWidth; t.style.setProperty('--dur', item.sec + 's'); t.classList.add('on');
  timer = setTimeout(nextToast, item.sec * 1000);
}

function statCards(el, items) { el.innerHTML = items.map(([k, v]) => `<div class="stat"><span>${k}</span><b>${v}</b></div>`).join(''); }
const runStats = () => [[tr('ชั้นที่ไปถึง', 'Floor'), G.run.floor], [tr('เลเวล', 'Level'), G.P.lv], [tr('ล้มศัตรู', 'Kills'), G.run.kills], [tr('เวลา', 'Time'), fmtTime(G.run.time)]];
const upgradeList = () => Object.entries(G.P.up).filter(([, k]) => k).map(([id, k]) => `${t(UPGRADES[id].name)}${k > 1 ? ' ×' + k : ''}`).join(', ');
const chip = (el, text, cls = '', extra = '') => `<span class="chip ${cls}" style="--el:${ELEMENTS[el].color}"${extra}>${text}</span>`;
function renderBuild() {
  const arts = ownedArts().map(a => {
    const evo = G.P.evolved.includes(a), mods = artElements(a);
    const nm = (a === 'blade' ? tr('ฟันปกติ', 'Slash') : artName(a)) + (evo ? ` / ${evoName(a)}` : '');
    return `<li><b>${nm}${evo ? ' ★' : ''}</b><span class="chips">${mods.length ? mods.map(e => chip(e, ELEMENTS[e].name)).join('') : `<i>${tr('ไม่มี mod', 'No mods')}</i>`}</span></li>`;
  }).join('');
  const sp = setProgress();
  const sets = sp.map(s => chip(s.el, `${ELEMENTS[s.el].name} ${Math.min(s.n, s.need)}/${s.need}${s.active ? ' ✓ ' + tr('ติดแล้ว', 'Active') : ''}`, `set${s.active ? ' on' : ''}`)).join('');
  const fx = sp.map(s => `<li class="${s.active ? 'on' : ''}"><b>${ELEMENTS[s.el].name}:</b> ${t(ELEMENTS[s.el].set)}</li>`).join('');
  const up = upgradeList();
  $('pause-build').innerHTML = `<h3>${tr('บิลด์', 'Build')}</h3><ul class="arts">${arts}</ul><div class="chips">${sets}</div><ul class="fx">${fx}</ul>${up ? `<p class="hint">${tr('อัปเกรด: ', 'Upgrades: ')}${up}</p>` : ''}`;
}
export function showPauseStats() {
  statCards($('pause-stats'), runStats());
  renderBuild();
}

// One picker for every pick: level-up (mods + stats), a new Art (elite), an evolution shard (boss), or which slot to replace
const PICK_TITLE = {
  level: { th: 'เลเวลอัป', en: 'Level Up' }, art: { th: 'ท่าใหม่', en: 'New Blade Art' },
  evolve: { th: 'เศษกระจกวิวัฒน์', en: 'Evolution Shard' }, replace: { th: 'ช่องเต็มแล้ว', en: 'Slots full' },
  mod: { th: 'เลือกธาตุ', en: 'Choose an element' }, modart: { th: 'ใส่ให้ท่าไหน', en: 'Which Art gets it?' },
};
const evoOf = a => (a === 'blade' ? BLADE_EVO : SKILLS[a].evo);
const name = a => (a === 'blade' ? tr('ฟันปกติ', 'Slash') : artName(a));
function cardHtml(c, i) {
  const P = G.P, key = `<kbd>${i + 1}</kbd>`;
  let glass = '', title = '', body = '', extra = '';
  if (c.kind === 'mod') {
    const E = ELEMENTS[c.el], had = P.mods[c.art] ?? [], evolves = had.length + 1 >= 2 && !P.evolved.includes(c.art);
    glass = E.color; title = `${name(c.art)} + ${E.name}`; body = t(E.hit);
    extra = `<span class="pips" aria-hidden="true">${[0, 1].map(k => `<i class="${k < had.length ? 'got' : k === had.length ? 'next' : ''}"></i>`).join('')}</span>`
      + (evolves ? `<span class="price">${tr('วิวัฒน์!', 'Evolves!')} ${evoName(c.art)}</span>` : '');
  } else if (c.kind === 'element') { glass = ELEMENTS[c.el].color; title = ELEMENTS[c.el].name; body = t(ELEMENTS[c.el].hit);
  } else if (c.kind === 'stat') {
    const u = UPGRADES[c.id], have = P.up[c.id] ?? 0;
    title = t(u.name); body = t(u.desc);
    extra = `<span class="pips" aria-hidden="true">${Array.from({ length: u.max }, (_, k) => `<i class="${k < have ? 'got' : k === have ? 'next' : ''}"></i>`).join('')}</span>`;
  } else if (c.kind === 'art') { title = SKILLS[c.id].name; body = t(SKILLS[c.id].desc); }
  else if (c.kind === 'replace') { title = tr(`แทน ${SKILLS[P.skills[c.slot]].name}`, `Replace ${SKILLS[P.skills[c.slot]].name}`); body = tr(`ช่อง ${c.slot + 1} ได้ ${SKILLS[c.id].name} มอดของท่าเดิมจะหายไป`, `Slot ${c.slot + 1} gets ${SKILLS[c.id].name}. The old Art's mods are lost.`); }
  else if (c.kind === 'skip') { title = tr('ไม่เอาท่านี้', 'Keep my Arts'); body = tr('เก็บท่าที่มีอยู่ไว้ทั้งหมด', 'Keep everything as it is.'); }
  else if (c.kind === 'evolve') { title = `${name(c.art)} → ${evoName(c.art)}`; body = t(evoOf(c.art).desc); }
  const pv = previewFor(c), cv = pv ? `<canvas data-preview='${JSON.stringify(pv)}' width="160" height="90" aria-hidden="true"></canvas>` : '';
  return `<button class="card" data-pick="${i}" ${glass ? `style="--glass:${glass}"` : ''} aria-label="${i + 1}: ${title}. ${body}">${cv}${key}<b>${title}</b><span>${body}</span>${extra}</button>`;
}
export function showPicker(kind, cards) {
  $('upgrade-h').textContent = t(PICK_TITLE[kind]);
  $('upgrade-msg').textContent = kind === 'level'
    ? tr(`เลเวล ${G.P.lv}! เลือกอัปเกรด 1 อย่าง (กด 1 ถึง ${cards.length} หรือคลิก)`, `Level ${G.P.lv}! Choose an upgrade (press 1 to ${cards.length}, or click).`)
    : kind === 'art' ? (cards.length === 1 && cards[0].kind === 'skip' ? tr('ไม่มีท่าใหม่ให้เลือกแล้ว', 'No new Blade Arts left to pick.') : tr('เลือกท่าใหม่ 1 ท่า', 'Choose a new Blade Art.'))
    : kind === 'evolve' ? tr('เลือกท่าที่จะวิวัฒน์', 'Choose an Art to evolve.')
    : kind === 'mod' ? tr('เลือกธาตุที่จะใส่', 'Choose the element.')
    : kind === 'modart' ? tr('เลือกท่าที่จะได้ธาตุนี้', 'Choose the Art that gets it.')
    : tr('ช่องท่าเต็มแล้ว จะแทนท่าไหน', 'Both slots are full. Which Art should it replace?');
  $('upgrade-cards').innerHTML = cards.map(cardHtml).join('');
  screen('upgrade');
  startPreviews($('upgrade-cards'));
  $('upgrade-cards').querySelector('.card')?.focus();
}

// Shop: one card per item with its price; cards you can't afford are disabled, not hidden
// Shop and shrine card art (art-src/icons-shop.png, icons-shrine.png); nothing until imported
const cardIcon = (/** @type {string} */ n) => { const img = IMG[n]; return img instanceof HTMLImageElement ? `<img class="ico" src="${img.src}" alt="">` : ''; };
export function renderShop(status = '', line = '') {
  const P = G.P;
  $('shop-col').textContent = tr(`มี ${P.col} Gold`, `${P.col} Gold`) + ` · Potion ${P.potions}/${SHOP.potion.max}`;
  $('shop-items').innerHTML = shopItems().map((id, i) => {
    const it = SHOP[id];
    const full = id === 'potion' && P.potions >= it.max, ok = canBuy(id), cost = full ? tr('เต็มแล้ว', 'Full') : price(id) + ' Gold';
    return `<button class="card" data-buy="${id}" ${ok ? '' : 'aria-disabled="true"'}
      aria-label="${i + 1}: ${it.name}, ${cost}. ${t(it.desc)}">
      <kbd>${i + 1}</kbd>${cardIcon(`icons-shop-${Object.keys(SHOP).indexOf(id) + 1}`)}<b>${it.name}</b><span>${t(it.desc)}</span><span class="price">${cost}</span></button>`;
  }).join('');
  $('shop-status').textContent = status;
  if (line) $('shop-line').textContent = line;
}

// Shrine: two offers, each card shows what you get then the price; offers you can't take are disabled
export function renderShrine() {
  $('shrine-offers').innerHTML = (G.room?.offers ?? []).map((id, i) => {
    const o = SHRINE[id], ok = canTake(id);
    return `<button class="card" data-offer="${id}" ${ok ? '' : 'aria-disabled="true"'} aria-label="${i + 1}: ${t(o.cost)}. ${t(o.gain)}">
      <kbd>${i + 1}</kbd>${cardIcon(`icons-shrine-${SHRINE_IDS.indexOf(id) + 1}`)}<b>${t(o.gain)}</b><span>${t(o.cost)}</span></button>`;
  }).join('');
}

// Story window: one line at a time, the speaker as the title
export function showStoryLine(line, i, n) {
  $('story-who').textContent = t(line.who); $('story-text').textContent = t(line.text); $('story-page').textContent = `${i + 1} / ${n}`;
  if (current !== 'story') screen('story');
}

// Blade Arts: the pool a run's Art picks draw from; Memory Shards unlock more Arts for it
function renderSkills(status = '') {
  $('shards-have').textContent = tr(`มี ${meta.shards} Memory Shard`, `${meta.shards} Memory Shards`);
  $('skill-cards').innerHTML = Object.entries(SKILLS).map(([id, S]) => {
    const own = isUnlocked(id);
    const state = S.pool === 'fixed' ? tr('ช่อง 1 ติดตัวเสมอ', 'Always in slot 1') : own ? tr('อยู่ในกองสุ่มแล้ว', 'In the pool') : tr(`ปลดล็อก ${S.cost} Shard`, `Unlock for ${S.cost} Shards`);
    const off = own || meta.shards < S.cost;
    return `<button class="card${own ? ' on' : ''}" data-skill="${id}" ${off ? 'aria-disabled="true"' : ''} aria-label="${S.name}, ${state}. ${t(S.desc)}">
      <b lang="en">${S.name}</b><span>${t(S.desc)}</span><span class="price">${state}</span></button>`;
  }).join('');
  $('skills-status').textContent = status;
}
$('skill-cards').addEventListener('click', e => {
  const id = /** @type {HTMLElement | null} */ (/** @type {Element} */ (e.target).closest('[data-skill]'))?.dataset.skill;
  if (!id || isUnlocked(id)) return;
  renderSkills(unlockSkill(id) ? tr(`ปลดล็อก ${SKILLS[id].name} แล้ว จะโผล่ให้เลือกหลังเคลียร์ห้อง Elite`, `${SKILLS[id].name} unlocked. It can now show up after Elite rooms.`)
    : tr('Shard ยังไม่พอ ได้เพิ่มทุกครั้งที่จบรอบ', 'Not enough Shards yet. You earn more at the end of every run.'));
  SFX.ui();
});

// Title: best record + a Continue button when a suspended run exists
function renderTitle() {
  const b = meta.best, old = meta.bestLegacy;
  $('record').textContent = [
    b ? tr('ดีที่สุด: ', 'Best: ') + `${b.cleared ? tr(`ผ่านครบ ${FLOOR_COUNT} ชั้น`, `all ${FLOOR_COUNT} floors`) : floorLabel(b.floor - 1)} · Lv.${b.lv} · ${fmtTime(b.time)}${b.assisted ? ' · assist' : ''}` : '',
    old ? (old.cleared ? tr('เวอร์ชันเก่า: ผ่านครบ 4 ชั้น', 'Old version: all 4 floors cleared') : tr(`เวอร์ชันเก่า: ชั้น ${old.floor}/4`, `Old version: floor ${old.floor}/4`)) : '',
  ].filter(Boolean).join(' · ');
  if (takeLegacyNotice()) $('legacy-note').textContent = tr('เซฟพักจากเวอร์ชันเก่าเล่นต่อไม่ได้แล้ว', "Your old saved run can't continue in this version."); // shown once, kept until the next boot
  const s = loadSuspend();
  $('continue-btn').hidden = !s;
  if (s) $('continue-info').textContent = `${floorLabel(s.floorIdx)} · Lv.${s.player.lv} · ${fmtTime(s.run.time)}`;
  $('start-btn').classList.toggle('lit', !s); $('continue-btn').classList.toggle('lit', !!s); // the likely next step is the lit pane
  $('shards-info').textContent = tr(`${meta.shards} Shard`, `${meta.shards} Shards`);
}

// How-to: key list from the current bindings
function renderHowTo() {
  const k = a => `<kbd>${keyLabel(a)}</kbd>`;
  $('howto-keys').innerHTML = [
    [`${k('up')}${k('left')}${k('down')}${k('right')}`, tr('เดิน (ใช้เมาส์เล็ง)', 'Walk (aim with the mouse)')],
    [`${k('attack')} / ` + tr('คลิกซ้าย', 'left click'), tr('ฟันดาบ', 'Slash')],
    [`${k('skill')} / ` + tr('คลิกขวา', 'right click'), 'Blade Art 1: Gale Rush'],
    [`${k('skill2')} / ` + tr('ปุ่มกลางเมาส์', 'middle click'), tr('Blade Art ช่อง 2 (ได้จากห้อง Elite)', 'Blade Art 2 (from Elite rooms)')],
    [k('skill3'), tr('Blade Art ช่อง 3 (ได้จากห้อง Elite)', 'Blade Art 3 (from Elite rooms)')],
    [k('dodge'), tr('กลิ้งหลบ ตอนกลิ้งจะไม่โดนดาเมจ', 'Dodge roll. Nothing hits you mid-roll.')],
    [k('potion'), tr('ดื่ม Potion (ซื้อที่ร้านในเมืองหรือพ่อค้าเร่ร่อน)', 'Drink a Potion (sold in town and by wandering merchants)')], [k('interact'), tr('คุยกับพ่อค้า หรือใช้ศาลเจ้า', 'Talk to a merchant or use a shrine')],
    [k('pause'), tr('หยุดเกม', 'Pause')],
    [tr('จอย', 'Gamepad'), tr('สติ๊กซ้ายเดิน สติ๊กขวาเล็ง X ฟัน A กลิ้ง RB/RT/LT Blade Art 1/2/3 LB Potion Y คุย Start หยุดเกม ในเมนูใช้ D-pad เลื่อน A เลือก B ย้อนกลับ',
      'Left stick walks, right stick aims. X attacks, A rolls, RB/RT/LT use Blade Art 1/2/3, LB drinks a Potion, Y talks, Start pauses. In menus: D-pad moves, A selects, B goes back.')],
    [k('mute'), tr('ปิด/เปิดเสียง', 'Sound on/off')], [k('fullscreen'), tr('เต็มจอ', 'Fullscreen')],
  ].map(([keys, what]) => `<span>${keys}</span><span>${what}</span>`).join('');
}

function endRun({ cleared }) {
  const { run, P, F } = G;
  const best = meta.best, mine = { floor: run.floor, lv: P.lv, time: run.time, kills: run.kills, cleared, assisted: !!run.assisted };
  const better = !best || mine.floor > best.floor || (mine.floor === best.floor && (cleared && !best.cleared || mine.lv > best.lv));
  if (better) { meta.best = mine; saveMeta(); }
  $('result').className = 'screen ' + (cleared ? 'clear' : 'dead');
  $('result-head').textContent = 'System';
  $('result-title').textContent = cleared ? tr(`ผ่านชั้น ${FLOOR_COUNT} แล้ว`, `FLOOR ${FLOOR_COUNT} CLEARED`) : tr('ตัวละครถูกลบ', 'CHARACTER DELETED');
  $('result-msg').textContent = cleared ? tr(`${F.boss.name} ล้มแล้ว ประตูชั้น ${FLOOR_COUNT + 1} ยังไม่เปิด`, `${F.boss.name} is down. The gate to floor ${FLOOR_COUNT + 1} isn't open yet.`)
                                        : tr(`ตายที่${floorLabel(G.floorIdx)} ตอน Lv.${P.lv} ตัวละครนี้ถูกลบแล้ว`, `Died on ${floorLabel(G.floorIdx)} at Lv.${P.lv}. This character has been deleted.`);
  // Only celebrate a real improvement: a first-ever death on floor 1 is not a "new record"
  $('newrec').hidden = !(better && (best || cleared || run.floor > 1));
  statCards($('result-stats'), runStats());
  const shards = awardShards(cleared);
  $('result-shards').textContent = tr(`ได้ Memory Shard +${shards} (มีทั้งหมด ${meta.shards}) เอาไปปลดล็อก Blade Art ได้ที่หน้าแรก`, `+${shards} Memory Shards (${meta.shards} total). Spend them on Blade Arts from the title screen.`);
  // a clear plays the ending story first; its window opens the result when it closes
  setTimeout(() => (cleared ? emit('ending') : screen('result')), cleared ? 1400 : 1100);
}

// Themed confirmation for irreversible actions. Resolves true only when the danger button is chosen;
// Esc and "ยกเลิก" cancel (native <dialog> handles focus trapping and Esc).
export function confirmDialog({ title, msg, ok }) {
  const d = $('confirm');
  $('confirm-title').textContent = title; $('confirm-msg').textContent = msg; $('confirm-ok').textContent = ok;
  d.returnValue = '';
  d.showModal();
  d.querySelector('button[value=cancel]').focus(); // the safe choice is the default
  return new Promise(resolve => d.addEventListener('close', () => resolve(d.returnValue === 'ok'), { once: true }));
}
// Name for a new character; resolves to the trimmed name ('' = PLAYER) or null when cancelled
export function nameDialog(last) {
  const d = $('name-dialog'), input = $('name-input');
  input.value = last; d.returnValue = '';
  // Enter would submit with the form's first button (Cancel); it means "go" here
  input.onkeydown = e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); d.close('ok'); } };
  d.showModal(); input.select();
  return new Promise(resolve => d.addEventListener('close', () => resolve(d.returnValue === 'ok' ? input.value.trim() : null), { once: true }));
}
export const dialogOpen = () => !!document.querySelector('dialog[open]');
on('runOver', endRun);
// a language switch re-renders whatever is open, without moving focus
on('langChanged', () => {
  if (current === 'title-screen') renderTitle();
  else if (current === 'howto') renderHowTo();
  else if (current === 'skills') renderSkills();
});
const bossCard = (down) => {
  const c = $('boss-card'), b = G.F.boss;
  $('boss-card-name').textContent = b.name;
  $('boss-card-sub').textContent = down ? tr('ล้มแล้ว', 'Defeated') : t(b.epithet);
  $('boss-card-hint').textContent = down ? '' : t(b.hint);
  c.classList.remove('on', 'down'); void c.offsetWidth; c.classList.add('on'); if (down) c.classList.add('down');
};
$('boss-card').addEventListener('animationend', e => { if (e.target === e.currentTarget) e.currentTarget.classList.remove('on', 'down'); });
on('bossWake', () => bossCard(false));
on('bossDeath', () => bossCard(true));
on('floorLoaded', i => {
  $('boss-card').classList.remove('on', 'down'); $('moment').classList.remove('on');
  const k = G.L.kind, type = G.room?.type, sub = k === 'boss' ? tr('บอส: ', 'Boss: ') + G.F.boss.name
    : k === 'town' ? tr('ฟื้น HP เต็มแล้ว พ่อค้าอยู่ที่แผงร้าน', 'Fully healed. The merchant is at the market stall.')
    : type === 'spring' ? tr('เดินไปที่น้ำพุเพื่อฟื้น HP ครึ่งหลอด', 'Walk to the fountain to heal half your HP.')
    : type === 'challenge' ? tr(`รอด ${ROOM_RULES.challengeTime} วินาที โดนตีไม่เกิน ${ROOM_RULES.challengeHits} ครั้ง ได้รางวัลสองเท่า`, `Survive ${ROOM_RULES.challengeTime} s and take ${ROOM_RULES.challengeHits} hits or fewer for a double reward.`)
    : type === 'shop' ? tr(`มีพ่อค้าเร่อยู่กลางห้อง กด ${keyLabel('interact')} เพื่อซื้อของ`, `A wandering merchant stands in the middle. Press ${keyLabel('interact')} to shop.`)
    : type === 'shrine' ? tr(`ศาลเจ้าอยู่กลางห้อง กด ${keyLabel('interact')} เพื่อดูข้อเสนอ`, `A shrine stands in the middle. Press ${keyLabel('interact')} to see its offers.`)
    : type === 'elite' ? tr('ล้ม Elite แล้วเลือกท่าใหม่', 'Beat the Elite to pick a new Blade Art.')
    : tr('เคลียร์ห้องเพื่อเปิดประตู', 'Clear the room to open the doors.');
  dropFloorToasts();
  toast(`${floorLabel(i)} · ${G.F.town}`, sub, 3.2, true);
});
on('challengeOver', ok => toast(ok ? tr('ผ่านการท้าทาย', 'Challenge passed') : tr('ไม่ผ่านการท้าทาย', 'Challenge failed'), ok ? tr('ได้รางวัลสองเท่า', 'Double reward.') : tr(`โดนตีเกิน ${ROOM_RULES.challengeHits} ครั้ง ไม่ได้รางวัล`, `More than ${ROOM_RULES.challengeHits} hits. No reward.`), 3.2, true));
on('portalOpen', () => toast(tr(`ผ่าน ${floorLabel(G.floorIdx)} แล้ว`, `${floorLabel(G.floorIdx)} Cleared`), tr('เดินเข้าประตูสีฟ้าเพื่อขึ้นชั้นต่อไป', 'Step into the blue portal to go up.'), 4.5, true));
// The evolve banner shares the boss card's row in the notice strip and pauses under an open picker, so it shows once the picker closes
on('artEvolved', art => {
  $('boss-card').classList.remove('on', 'down'); // a boss kill can offer an evolve pick; don't stack the two banners
  $('moment-name').textContent = evoName(art); $('moment-sub').textContent = tr('ท่าวิวัฒน์แล้ว', 'Art evolved');
  const m = $('moment'); m.classList.remove('on'); void m.offsetWidth; m.classList.add('on');
});
$('moment').addEventListener('animationend', e => { if (e.target === e.currentTarget) e.currentTarget.classList.remove('on'); });
on('setBonus', el => { SFX.setBonus(); toast(tr(`ชุด ${ELEMENTS[el].name} ติดแล้ว`, `${ELEMENTS[el].name} set active`), t(ELEMENTS[el].set)); });
on('hint', ({ title, sub }) => toast(title, sub, 4.5));

// Buttons carry data-act="name"; main.js supplies what each name does
export function bindActions(actions) {
  document.addEventListener('click', e => {
    const b = /** @type {HTMLElement | null} */ (/** @type {Element} */ (e.target).closest('[data-act]'));
    if (b && actions[b.dataset.act]) { SFX.ui(); actions[b.dataset.act](); }
  });
}
