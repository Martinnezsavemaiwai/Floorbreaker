// Settings window: audio, comfort toggles, key rebinding, assist mode and save export/import.
import { settings, saveSettings, exportSave, importSave } from '../core/save.ts';
import { codesFor, codeLabel, rebind, resetBindings } from '../core/input.ts';
import { clock } from '../core/app.ts';
import { applyAudio } from '../audio/audio.js';
import { $, confirmDialog } from './screens.js';

const ACTION_NAMES = {
  up: 'เดินขึ้น', down: 'เดินลง', left: 'เดินซ้าย', right: 'เดินขวา', attack: 'ฟันดาบ', skill: 'Blade Art 1', skill2: 'Blade Art 2', dodge: 'กลิ้งหลบ', potion: 'ดื่ม Potion', interact: 'คุย / เปิดร้าน',
  pause: 'หยุดเกม', mute: 'ปิด/เปิดเสียง', fullscreen: 'เต็มจอ',
};

for (const k of ['music', 'sfx']) {
  const el = $('s-' + k), out = el.nextElementSibling;
  el.value = settings[k]; out.textContent = settings[k];
  el.oninput = () => { settings[k] = +el.value; out.textContent = el.value; saveSettings(); applyAudio(); };
}
for (const k of ['shake', 'flash', 'hints']) {
  const el = $('s-' + k); el.checked = settings[k];
  el.onchange = () => { settings[k] = el.checked; saveSettings(); };
}

// Assist mode: less damage taken and/or a slower game clock
export const applyAssist = () => { clock.scale = settings.assistSpeed; };
for (const k of ['assistDamage', 'assistSpeed']) {
  const el = $('s-' + k); el.value = String(settings[k]);
  el.onchange = () => { settings[k] = +el.value; saveSettings(); applyAssist(); };
}
applyAssist();
{ const el = $('s-aim'); el.value = settings.aim; el.onchange = () => { settings.aim = el.value; saveSettings(); }; }

// ---------- key rebinding ----------
/** @type {[string, import('../data/controls.ts').Action[]][]} */
const GROUPS = [['เดิน', ['up', 'down', 'left', 'right']], ['ต่อสู้', ['attack', 'skill', 'skill2', 'dodge', 'potion', 'interact']], ['ระบบ', ['pause', 'mute', 'fullscreen']]];
let listening = null; // the action waiting for a key, or null
export const isRebinding = () => listening !== null;
const keysText = a => codesFor(a).map(codeLabel).join(' / ') || '—';
function say(msg, warn = false) { const el = $('bind-status'); el.textContent = msg; el.classList.toggle('warn', warn); }

function renderBinds() {
  $('binds').innerHTML = GROUPS.map(([title, actions]) => `<div class="bind-group"><h3>${title}</h3><div class="rows">${
    actions.map(a => {
      const on = listening === a, unset = !codesFor(a).length;
      const aria = on ? `${ACTION_NAMES[a]}: กำลังรอปุ่มใหม่` : `${ACTION_NAMES[a]}: ${keysText(a)} — กดเพื่อเปลี่ยน`;
      return `<span>${ACTION_NAMES[a]}</span><button class="bind${on ? ' listening' : ''}${unset ? ' unset' : ''}" data-bind="${a}"
        aria-label="${aria}">${on ? 'กดปุ่ม…' : keysText(a)}</button>`;
    }).join('')}</div></div>`).join('');
}
$('binds').addEventListener('click', e => {
  const b = e.target.closest('[data-bind]');
  if (!b) return;
  listening = b.dataset.bind; renderBinds();
  say(`กดปุ่มใหม่สำหรับ "${ACTION_NAMES[listening]}" · Esc ยกเลิก`);
  $('binds').querySelector(`[data-bind="${listening}"]`)?.focus();
});
function describe(action, code, r) {
  if ('reason' in r) {
    return [r.reason === 'pause-conflict'
      ? `ใช้ ${codeLabel(code)} เป็นปุ่มหยุดเกมไม่ได้ เพราะใช้กับคำสั่งอื่นอยู่ เลือกปุ่มที่ว่าง`
      : `${codeLabel(code)} เป็นปุ่มหยุดเกมปุ่มเดียว เปลี่ยนปุ่มหยุดเกมก่อน`, true];
  }
  if (!r.moved.length) return [`"${ACTION_NAMES[action]}" = ${codeLabel(code)}`, false];
  const from = r.moved.map(m => `"${ACTION_NAMES[m.from]}"${m.left.length ? '' : ' (ตอนนี้ไม่มีปุ่ม)'}`).join(', ');
  return [`${codeLabel(code)} ถูกย้ายจาก ${from} มาเป็น "${ACTION_NAMES[action]}"`, r.moved.some(m => !m.left.length)];
}
// Capture phase + stopImmediatePropagation: the key that's being assigned must not also pause/attack
addEventListener('keydown', e => {
  if (!listening) return;
  e.preventDefault(); e.stopImmediatePropagation();
  const action = listening; listening = null;
  if (e.code === 'Escape' && action !== 'pause') say('ยกเลิกแล้ว'); // Esc cancels, except when binding pause itself
  else say(...describe(action, e.code, rebind(action, e.code)));
  renderBinds();
  $('binds').querySelector(`[data-bind="${action}"]`)?.focus();
}, true);
export function resetKeys() { resetBindings(); renderBinds(); say('คืนค่าปุ่มเริ่มต้นแล้ว'); }
renderBinds();

// ---------- save export / import ----------
export function downloadSave() {
  const blob = new Blob([exportSave()], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = `floorbreaker-save-${new Date().toISOString().slice(0, 10)}.json`;
  a.click(); URL.revokeObjectURL(a.href);
  $('save-status').textContent = 'Export แล้ว เก็บไฟล์ไว้ใช้ Import ภายหลังได้';
}
export function pickImport() { $('import-file').click(); }
$('import-file').addEventListener('change', async e => {
  const file = e.target.files?.[0];
  e.target.value = '';
  if (!file) return;
  const ok = await confirmDialog({ title: 'Import เซฟ', ok: 'แทนที่เซฟ',
    msg: `ตั้งค่า สถิติ และตัวละครที่เซฟพักไว้ในเครื่องนี้ จะถูกแทนที่ด้วยไฟล์ "${file.name}"` });
  if (!ok) return;
  const r = importSave(await file.text());
  if ('error' in r) { $('save-status').textContent = 'Import ไม่สำเร็จ: ' + r.error; return; }
  $('save-status').textContent = 'Import สำเร็จ กำลังโหลดใหม่…';
  setTimeout(() => location.reload(), 600); // simplest way to re-apply every setting, binding and record
});

// ---------- tabs (WAI-ARIA tabs pattern: click or arrow keys) ----------
const tabs = /** @type {HTMLElement[]} */ ([...document.querySelectorAll('#settings [role=tab]')]);
function selectTab(tab) {
  for (const t of tabs) {
    const on = t === tab;
    t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1;
    $(t.getAttribute('aria-controls')).hidden = !on;
  }
  tab.focus();
}
for (const t of tabs) {
  t.addEventListener('click', () => selectTab(t));
  t.addEventListener('keydown', (/** @type {KeyboardEvent} */ e) => {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (d) { e.preventDefault(); selectTab(tabs[(tabs.indexOf(t) + d + tabs.length) % tabs.length]); }
  });
}
// on/off text next to each switch, so state isn't shown by colour and position alone
for (const s of /** @type {NodeListOf<HTMLElement>} */ (document.querySelectorAll('.state'))) {
  const el = $(s.dataset.for), sync = () => { s.textContent = el.checked ? 'เปิด' : 'ปิด'; };
  el.addEventListener('change', sync); sync();
}
