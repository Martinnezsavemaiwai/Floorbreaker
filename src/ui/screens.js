// DOM overlay screens (title, how-to, pause, result) and the toast queue. Reads game state, never owns it.
import { G } from '../world/state.ts';
import { meta, saveMeta, loadSuspend } from '../core/save.ts';
import { on } from '../core/events.ts';
import { keyLabel } from '../core/input.ts';
import { FLOORS } from '../data/floors.ts';
import { UPGRADES } from '../data/upgrades.ts';
import { SFX } from '../audio/audio.js';

export const $ = id => /** @type {any} */ (document.getElementById(id)); // DOM ids come from index.html
const fmtTime = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export let current = 'title-screen';
let backTo = 'title-screen';
export function screen(id) {
  current = id;
  for (const s of document.querySelectorAll('.screen')) s.classList.toggle('on', s.id === id);
  if (id === 'title-screen') { renderTitle(); clearToasts(); } // a run's banners don't belong on the title
  if (id === 'howto') renderHowTo();
  /** @type {HTMLElement | null} */ ($(id)?.querySelector('[role=tab][aria-selected=true], .btn.primary:not([hidden]), .btn, input'))?.focus({ preventScroll: true });
}
export const openSub = id => { backTo = current; screen(id); };
export const closeSub = () => screen(backTo);
export const inSubScreen = () => current === 'howto' || current === 'settings';

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
const runStats = () => [['ชั้นที่ไปถึง', G.run.floor], ['เลเวล', G.P.lv], ['ล้มศัตรู', G.run.kills], ['เวลา', fmtTime(G.run.time)]];
const upgradeList = () => Object.entries(G.P.up).filter(([, k]) => k).map(([id, k]) => `${UPGRADES[id].name}${k > 1 ? ' ×' + k : ''}`).join(' · ');
export function showPauseStats() {
  statCards($('pause-stats'), runStats());
  const list = upgradeList();
  $('pause-upgrades').textContent = list ? 'อัปเกรด: ' + list : '';
}

// Level-up picker: one card per offered upgrade, with how many times it's been taken already
export function showUpgradePicker(offer) {
  $('upgrade-msg').textContent = `Lv.${G.P.lv} · เลือกอัปเกรด 1 อย่าง · กด 1–${offer.length} หรือคลิก`;
  $('upgrade-cards').innerHTML = offer.map((id, i) => {
    const u = UPGRADES[id], have = G.P.up[id] ?? 0;
    const pips = Array.from({ length: u.max }, (_, k) => `<i class="${k < have ? 'got' : k === have ? 'next' : ''}"></i>`).join('');
    return `<button class="card" data-pick="${i}" aria-label="${i + 1}: ${u.name} — ${u.desc} (${have}/${u.max})">
      <kbd>${i + 1}</kbd><b>${u.name}</b><span>${u.desc}</span><span class="pips" aria-hidden="true">${pips}</span></button>`;
  }).join('');
  screen('upgrade');
  $('upgrade-cards').querySelector('.card')?.focus();
}

// Title: best record + a Continue button when a suspended run exists
function renderTitle() {
  const b = meta.best;
  $('record').textContent = b ? `สถิติดีที่สุด: ${b.cleared ? 'เคลียร์ทุกชั้น' : 'ชั้น ' + b.floor} · Lv.${b.lv} · ${fmtTime(b.time)}${b.assisted ? ' · assist' : ''}` : '';
  const s = loadSuspend();
  $('continue-btn').hidden = !s;
  if (s) $('continue-info').textContent = `${FLOORS[s.floorIdx].name} · Lv.${s.player.lv} · ${fmtTime(s.run.time)}`;
  $('start-btn').classList.toggle('primary', !s);
}

// How-to: key list from the current bindings
function renderHowTo() {
  const k = a => `<kbd>${keyLabel(a)}</kbd>`;
  $('howto-keys').innerHTML = [
    [`${k('up')}${k('left')}${k('down')}${k('right')}`, 'เดิน · เมาส์ใช้เล็ง'],
    [`${k('attack')} / คลิกซ้าย`, 'ฟันดาบ'],
    [`${k('skill')} / คลิกขวา`, 'Sword Skill: Sonic Leap'],
    [k('pause'), 'หยุดเกม'], [k('mute'), 'ปิด/เปิดเสียง'], [k('fullscreen'), 'เต็มจอ'],
  ].map(([keys, what]) => `<span>${keys}</span><span>${what}</span>`).join('');
}

function endRun({ cleared }) {
  const { run, P, F } = G;
  const best = meta.best, mine = { floor: run.floor, lv: P.lv, time: run.time, kills: run.kills, cleared, assisted: !!run.assisted };
  const better = !best || mine.floor > best.floor || (mine.floor === best.floor && (cleared && !best.cleared || mine.lv > best.lv));
  if (better) { meta.best = mine; saveMeta(); }
  $('result').className = 'screen ' + (cleared ? 'clear' : 'dead');
  $('result-head').textContent = cleared ? 'System · Clear' : 'System · Game Over';
  $('result-title').textContent = cleared ? 'CONGRATULATIONS' : 'YOU ARE DEAD';
  $('result-msg').textContent = cleared ? `ล้ม ${F.boss.name} ได้ · ชั้นที่ 4 ยังไม่เปิด (to be continued)`
                                        : `ตัวละคร Lv.${P.lv} ตายที่ ${F.name} และหายไปตลอดกาล`;
  // Only celebrate a real improvement: a first-ever death on floor 1 is not a "new record"
  $('newrec').hidden = !(better && (best || cleared || run.floor > 1));
  statCards($('result-stats'), runStats());
  setTimeout(() => screen('result'), cleared ? 1400 : 1100);
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
on('floorLoaded', () => toast(`${G.F.name} · ${G.F.town}`, `บอสชั้นนี้: ${G.F.boss.name}`));
on('portalOpen', () => toast(`Congratulations! ${G.F.name} Cleared`, 'เดินเข้าประตูมิติสีฟ้าเพื่อขึ้นชั้นถัดไป', 4.5));
on('hint', ({ title, sub }) => toast(title, sub, 4.5));

// Buttons carry data-act="name"; main.js supplies what each name does
export function bindActions(actions) {
  document.addEventListener('click', e => {
    const b = /** @type {HTMLElement | null} */ (/** @type {Element} */ (e.target).closest('[data-act]'));
    if (b && actions[b.dataset.act]) { SFX.ui(); actions[b.dataset.act](); }
  });
}
