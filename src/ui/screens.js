// DOM overlay screens (title, how-to, settings, pause, result) and the toast. Reads game state, never owns it.
import { G } from '../world/state.ts';
import { store, settings, saveSettings } from '../core/store.ts';
import { on } from '../core/events.ts';
import { applyAudio, SFX } from '../audio/audio.js';

const $ = id => /** @type {any} */ (document.getElementById(id)); // DOM ids come from index.html
const fmtTime = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export let current = 'title-screen';
let backTo = 'title-screen';
export function screen(id) {
  current = id;
  for (const s of document.querySelectorAll('.screen')) s.classList.toggle('on', s.id === id);
  /** @type {HTMLElement | null} */ ($(id)?.querySelector('.btn.primary, .btn, input'))?.focus({ preventScroll: true });
}
export const openSub = id => { backTo = current; screen(id); };
export const closeSub = () => screen(backTo);
export const inSubScreen = () => current === 'howto' || current === 'settings';

export function toast(title, sub, sec = 3.2) {
  $('toast-title').textContent = title; $('toast-sub').textContent = sub;
  const t = $('toast'); t.classList.remove('on'); void t.offsetWidth; t.style.setProperty('--dur', sec + 's'); t.classList.add('on');
}

function statCards(el, items) { el.innerHTML = items.map(([k, v]) => `<div class="stat"><span>${k}</span><b>${v}</b></div>`).join(''); }
const runStats = () => [['ชั้นที่ไปถึง', G.run.floor], ['เลเวล', G.P.lv], ['ล้มศัตรู', G.run.kills], ['เวลา', fmtTime(G.run.time)]];
export const showPauseStats = () => statCards($('pause-stats'), runStats());

export function renderRecord() {
  const b = store.get('best', null);
  $('record').textContent = b ? `สถิติดีที่สุด: ${b.cleared ? 'เคลียร์ทุกชั้น' : 'ชั้น ' + b.floor} · Lv.${b.lv} · ${fmtTime(b.time)}` : '';
}
function endRun({ cleared }) {
  const { run, P, F } = G;
  const best = store.get('best', null), mine = { floor: run.floor, lv: P.lv, time: run.time, kills: run.kills, cleared };
  const better = !best || mine.floor > best.floor || (mine.floor === best.floor && (cleared && !best.cleared || mine.lv > best.lv));
  if (better) store.set('best', mine);
  $('result-head').textContent = cleared ? 'System · Clear' : 'System · Game Over';
  $('result-title').textContent = cleared ? 'CONGRATULATIONS' : 'YOU ARE DEAD';
  $('result-title').className = 'result-title ' + (cleared ? 'clear' : 'dead');
  $('result-msg').textContent = cleared ? `ล้ม ${F.boss.name} ได้ · ชั้นที่ 4 ยังไม่เปิด (to be continued)`
                                        : `ตัวละคร Lv.${P.lv} ตายที่ ${F.name} และหายไปตลอดกาล`;
  $('newrec').hidden = !better; statCards($('result-stats'), runStats()); renderRecord();
  setTimeout(() => screen('result'), cleared ? 1400 : 1100);
}
on('runOver', endRun);
on('floorLoaded', () => toast(`${G.F.name} · ${G.F.town}`, `บอสชั้นนี้: ${G.F.boss.name}`));
on('portalOpen', () => toast(`Congratulations! ${G.F.name} Cleared`, 'เดินเข้าประตูมิติสีฟ้าเพื่อขึ้นชั้นถัดไป', 4.5));

// Buttons carry data-act="name"; main.js supplies what each name does
export function bindActions(actions) {
  document.addEventListener('click', e => {
    const b = /** @type {HTMLElement | null} */ (/** @type {Element} */ (e.target).closest('[data-act]'));
    if (b) { SFX.ui(); actions[b.dataset.act](); }
  });
}

// Settings controls
for (const k of ['music', 'sfx']) {
  const el = $('s-' + k), out = el.nextElementSibling;
  el.value = settings[k]; out.textContent = settings[k];
  el.oninput = () => { settings[k] = +el.value; out.textContent = el.value; saveSettings(); applyAudio(); };
}
for (const k of ['shake', 'flash']) {
  const el = $('s-' + k); el.checked = settings[k];
  el.onchange = () => { settings[k] = el.checked; saveSettings(); };
}
renderRecord();
