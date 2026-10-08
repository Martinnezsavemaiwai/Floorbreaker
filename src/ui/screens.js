// DOM overlay screens (title, how-to, pause, result) and the toast queue. Reads game state, never owns it.
import { G } from '../world/state.ts';
import { meta, saveMeta, loadSuspend } from '../core/save.ts';
import { on, emit } from '../core/events.ts';
import { keyLabel } from '../core/input.ts';
import { FLOORS } from '../data/floors.ts';
import { UPGRADES } from '../data/upgrades.ts';
import { SHOP } from '../data/shop.ts';
import { price, canBuy } from '../systems/shop.js';
import { SKILLS } from '../data/skills.ts';
import { awardShards, isUnlocked, unlockSkill, equipSkill } from '../systems/meta.js';
import { SFX } from '../audio/audio.js';
import { t, tr } from '../core/i18n.ts';

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

// Toasts queue up so a floor banner and a tutorial hint never overwrite each other
const queue = [];
let showing = false, timer = 0;
function clearToasts() { queue.length = 0; clearTimeout(timer); showing = false; $('toast').classList.remove('on'); }
export function toast(title, sub, sec = 3.2) {
  queue.push({ title, sub, sec });
  if (!showing) nextToast();
}
function nextToast() {
  const item = queue.shift();
  showing = !!item;
  if (!item) return;
  $('toast-title').textContent = item.title; $('toast-sub').textContent = item.sub;
  const t = $('toast'); t.classList.remove('on'); void t.offsetWidth; t.style.setProperty('--dur', item.sec + 's'); t.classList.add('on');
  timer = setTimeout(nextToast, item.sec * 1000);
}

function statCards(el, items) { el.innerHTML = items.map(([k, v]) => `<div class="stat"><span>${k}</span><b>${v}</b></div>`).join(''); }
const runStats = () => [[tr('ชั้นที่ไปถึง', 'Floor'), G.run.floor], [tr('เลเวล', 'Level'), G.P.lv], [tr('ล้มศัตรู', 'Kills'), G.run.kills], [tr('เวลา', 'Time'), fmtTime(G.run.time)]];
const upgradeList = () => Object.entries(G.P.up).filter(([, k]) => k).map(([id, k]) => `${t(UPGRADES[id].name)}${k > 1 ? ' ×' + k : ''}`).join(' · ');
export function showPauseStats() {
  statCards($('pause-stats'), runStats());
  const list = upgradeList();
  $('pause-upgrades').textContent = list ? tr('อัปเกรด: ', 'Upgrades: ') + list : '';
}

// Level-up picker: one card per offered upgrade, with how many times it's been taken already
export function showUpgradePicker(offer) {
  $('upgrade-msg').textContent = tr(`เลเวล ${G.P.lv}! เลือกอัปเกรด 1 อย่าง (กด 1 ถึง ${offer.length} หรือคลิก)`, `Level ${G.P.lv}! Choose an upgrade (press 1 to ${offer.length}, or click).`);
  $('upgrade-cards').innerHTML = offer.map((id, i) => {
    const u = UPGRADES[id], have = G.P.up[id] ?? 0, name = t(u.name), desc = t(u.desc);
    const pips = Array.from({ length: u.max }, (_, k) => `<i class="${k < have ? 'got' : k === have ? 'next' : ''}"></i>`).join('');
    return `<button class="card" data-pick="${i}" aria-label="${i + 1}: ${name}. ${desc} (${have}/${u.max})">
      <kbd>${i + 1}</kbd><b>${name}</b><span>${desc}</span><span class="pips" aria-hidden="true">${pips}</span></button>`;
  }).join('');
  screen('upgrade');
  $('upgrade-cards').querySelector('.card')?.focus();
}

// Shop: one card per item with its price; cards you can't afford are disabled, not hidden
export function renderShop(status = '') {
  const P = G.P;
  $('shop-col').textContent = tr(`มี ${P.col} Gold`, `${P.col} Gold`) + ` · Potion ${P.potions}/${SHOP.potion.max}`;
  $('shop-items').innerHTML = Object.entries(SHOP).map(([id, it], i) => {
    const full = id === 'potion' && P.potions >= it.max, ok = canBuy(id), cost = full ? tr('เต็มแล้ว', 'Full') : price(id) + ' Gold';
    return `<button class="card" data-buy="${id}" ${ok ? '' : 'aria-disabled="true"'}
      aria-label="${i + 1}: ${it.name}, ${cost}. ${t(it.desc)}">
      <kbd>${i + 1}</kbd><b>${it.name}</b><span>${t(it.desc)}</span><span class="price">${cost}</span></button>`;
  }).join('');
  $('shop-status').textContent = status;
}

// Story window: one line at a time, the speaker as the title
export function showStoryLine(line, i, n) {
  $('story-who').textContent = t(line.who); $('story-text').textContent = t(line.text); $('story-page').textContent = `${i + 1} / ${n}`;
  if (current !== 'story') screen('story');
}

// Blade Arts: unlock with Memory Shards, pick the slot-2 skill for the next run
function renderSkills(status = '') {
  $('shards-have').textContent = tr(`มี ${meta.shards} Memory Shard`, `${meta.shards} Memory Shards`);
  $('skill-cards').innerHTML = Object.entries(SKILLS).map(([id, S]) => {
    const own = isUnlocked(id), slot = id === 'sonicLeap' ? tr('ช่อง 1 (เปลี่ยนไม่ได้)', 'Slot 1 (always)') : meta.loadout === id ? tr('ใส่ช่อง 2 อยู่', 'In slot 2') : null;
    const state = slot ?? (own ? tr('ใส่ช่อง 2', 'Put in slot 2') : tr(`ปลดล็อก ${S.cost} Shard`, `Unlock for ${S.cost} Shards`));
    const off = id === 'sonicLeap' || (!own && meta.shards < S.cost);
    return `<button class="card${slot ? ' on' : ''}" data-skill="${id}" ${off ? 'aria-disabled="true"' : ''} aria-label="${S.name}, ${state}. ${t(S.desc)}">
      <b lang="en">${S.name}</b><span>${t(S.desc)}</span><span class="price">${state}</span></button>`;
  }).join('');
  $('skills-status').textContent = status;
}
$('skill-cards').addEventListener('click', e => {
  const id = /** @type {HTMLElement | null} */ (/** @type {Element} */ (e.target).closest('[data-skill]'))?.dataset.skill;
  if (!id || id === 'sonicLeap') return;
  if (isUnlocked(id)) { equipSkill(id); renderSkills(); }
  else renderSkills(unlockSkill(id) ? tr(`ปลดล็อก ${SKILLS[id].name} แล้ว และใส่ไว้ในช่อง 2`, `${SKILLS[id].name} unlocked and put in slot 2`) : tr('Shard ยังไม่พอ ได้เพิ่มทุกครั้งที่จบรอบ', 'Not enough Shards yet. You earn more at the end of every run.'));
  SFX.ui();
});

// Title: best record + a Continue button when a suspended run exists
function renderTitle() {
  const b = meta.best;
  $('record').textContent = b ? tr('ดีที่สุด: ', 'Best: ') + `${b.cleared ? tr('ผ่านครบ 4 ชั้น', 'all 4 floors') : tr('ชั้น ', 'floor ') + b.floor} · Lv.${b.lv} · ${fmtTime(b.time)}${b.assisted ? ' · assist' : ''}` : '';
  const s = loadSuspend();
  $('continue-btn').hidden = !s;
  if (s) $('continue-info').textContent = `${FLOORS[s.floorIdx].name} · Lv.${s.player.lv} · ${fmtTime(s.run.time)}`;
  $('start-btn').classList.toggle('lit', !s); $('continue-btn').classList.toggle('lit', !!s); // the likely next step is the lit pane
  $('shards-info').textContent = tr(`${meta.shards} Shard · ช่อง 2: `, `${meta.shards} Shards · slot 2: `) + (meta.loadout ? SKILLS[meta.loadout]?.name ?? '—' : tr('ว่าง', 'empty'));
}

// How-to: key list from the current bindings
function renderHowTo() {
  const k = a => `<kbd>${keyLabel(a)}</kbd>`;
  $('howto-keys').innerHTML = [
    [`${k('up')}${k('left')}${k('down')}${k('right')}`, tr('เดิน (ใช้เมาส์เล็ง)', 'Walk (aim with the mouse)')],
    [`${k('attack')} / ` + tr('คลิกซ้าย', 'left click'), tr('ฟันดาบ', 'Slash')],
    [`${k('skill')} / ` + tr('คลิกขวา', 'right click'), 'Blade Art 1: Gale Rush'],
    [`${k('skill2')} / ` + tr('ปุ่มกลางเมาส์', 'middle click'), tr('Blade Art ช่อง 2 (เลือกได้ที่ Blade Arts ในหน้าแรก)', 'Blade Art 2 (pick it in Blade Arts on the title screen)')],
    [k('dodge'), tr('กลิ้งหลบ ตอนกลิ้งจะไม่โดนดาเมจ', 'Dodge roll. Nothing hits you mid-roll.')],
    [k('potion'), tr('ดื่ม Potion (ซื้อได้ที่ร้านในเมือง)', 'Drink a Potion (sold in town)')], [k('interact'), tr('คุยกับพ่อค้า', 'Talk to the merchant')],
    [k('pause'), tr('หยุดเกม', 'Pause')],
    [tr('จอย', 'Gamepad'), tr('สติ๊กซ้ายเดิน สติ๊กขวาเล็ง X ฟัน A กลิ้ง RB/RT Blade Art 1/2 LB Potion Y คุย Start หยุดเกม ในเมนูใช้ D-pad เลื่อน A เลือก B ย้อนกลับ',
      'Left stick walks, right stick aims. X attacks, A rolls, RB/RT use Blade Art 1/2, LB drinks a Potion, Y talks, Start pauses. In menus: D-pad moves, A selects, B goes back.')],
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
  $('result-title').textContent = cleared ? tr('ผ่านชั้น 4 แล้ว', 'FLOOR 4 CLEARED') : tr('ตัวละครถูกลบ', 'CHARACTER DELETED');
  $('result-msg').textContent = cleared ? tr(`${F.boss.name} ล้มแล้ว ประตูชั้น ${FLOORS.length + 1} ยังไม่เปิด`, `${F.boss.name} is down. The gate to floor ${FLOORS.length + 1} isn't open yet.`)
                                        : tr(`ตายที่ ${F.name} ตอน Lv.${P.lv} ตัวละครนี้ถูกลบแล้ว`, `Died on ${F.name} at Lv.${P.lv}. This character has been deleted.`);
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
export const dialogOpen = () => !!document.querySelector('dialog[open]');
on('runOver', endRun);
// a language switch re-renders whatever is open, without moving focus
on('langChanged', () => {
  if (current === 'title-screen') renderTitle();
  else if (current === 'howto') renderHowTo();
  else if (current === 'skills') renderSkills();
});
on('floorLoaded', () => toast(`${G.F.name} · ${G.F.town}`, tr('บอส: ', 'Boss: ') + G.F.boss.name));
on('portalOpen', () => toast(`${G.F.name} Cleared`, tr('เดินเข้าประตูสีฟ้าเพื่อขึ้นชั้นต่อไป', 'Step into the blue portal to go up.'), 4.5));
on('hint', ({ title, sub }) => toast(title, sub, 4.5));

// Buttons carry data-act="name"; main.js supplies what each name does
export function bindActions(actions) {
  document.addEventListener('click', e => {
    const b = /** @type {HTMLElement | null} */ (/** @type {Element} */ (e.target).closest('[data-act]'));
    if (b && actions[b.dataset.act]) { SFX.ui(); actions[b.dataset.act](); }
  });
}
