// Settings window: audio, comfort toggles, key rebinding, assist mode and save export/import.
import { settings, saveSettings, exportSave, importSave } from '../core/save.ts';
import { codesFor, codeLabel, rebind, resetBindings } from '../core/input.ts';
import { clock } from '../core/app.ts';
import { applyAudio } from '../audio/audio.js';
import { $, confirmDialog, dropTips } from './screens.js';
import { t, tr, setLang } from '../core/i18n.ts';
import { on } from '../core/events.ts';

const ACTION_TEXT = {
  up: { th: 'เดินขึ้น', en: 'Walk up' }, down: { th: 'เดินลง', en: 'Walk down' }, left: { th: 'เดินซ้าย', en: 'Walk left' }, right: { th: 'เดินขวา', en: 'Walk right' },
  attack: { th: 'ฟันดาบ', en: 'Slash' }, skill: 'Blade Art 1', skill2: 'Blade Art 2', skill3: 'Blade Art 3', dodge: { th: 'กลิ้งหลบ', en: 'Dodge roll' }, potion: { th: 'ดื่ม Potion', en: 'Drink Potion' },
  interact: { th: 'คุย / เปิดร้าน', en: 'Talk / shop' }, pause: { th: 'หยุดเกม', en: 'Pause' }, mute: { th: 'ปิด/เปิดเสียง', en: 'Sound on/off' }, fullscreen: { th: 'เต็มจอ', en: 'Fullscreen' },
};
const ACTION_NAMES = new Proxy(ACTION_TEXT, { get: (o, k) => t(o[k]) }); // reads in the current language

for (const k of ['music', 'sfx']) {
  const el = $('s-' + k), out = el.nextElementSibling;
  el.value = settings[k]; out.textContent = settings[k];
  el.oninput = () => { settings[k] = +el.value; out.textContent = el.value; saveSettings(); applyAudio(); };
}
for (const k of ['shake', 'flash', 'hints']) {
  const el = $('s-' + k); el.checked = settings[k];
  el.onchange = () => { settings[k] = el.checked; saveSettings(); if (k === 'hints' && !el.checked) dropTips(); };
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
/** @type {[import('../core/i18n.ts').Text, import('../data/controls.ts').Action[]][]} */
const GROUPS = [[{ th: 'เดิน', en: 'Move' }, ['up', 'down', 'left', 'right']], [{ th: 'ต่อสู้', en: 'Combat' }, ['attack', 'skill', 'skill2', 'skill3', 'dodge', 'potion', 'interact']], [{ th: 'ระบบ', en: 'System' }, ['pause', 'mute', 'fullscreen']]];
let listening = null; // the action waiting for a key, or null
export const isRebinding = () => listening !== null;
const keysText = a => codesFor(a).map(codeLabel).join(' / ') || '—';
function say(msg, warn = false) { const el = $('bind-status'); el.textContent = msg; el.classList.toggle('warn', warn); }

function renderBinds() {
  $('binds').innerHTML = GROUPS.map(([title, actions]) => `<div class="bind-group"><h3>${t(title)}</h3><div class="rows">${
    actions.map(a => {
      const on = listening === a, unset = !codesFor(a).length;
      const aria = on ? `${ACTION_NAMES[a]}: ` + tr('กำลังรอปุ่มใหม่', 'waiting for a new key') : `${ACTION_NAMES[a]}: ${keysText(a)}. ` + tr('กดเพื่อเปลี่ยน', 'Press to change');
      return `<span>${ACTION_NAMES[a]}</span><button class="bind${on ? ' listening' : ''}${unset ? ' unset' : ''}" data-bind="${a}"
        aria-label="${aria}">${on ? tr('กดปุ่ม…', 'Press a key…') : keysText(a)}</button>`;
    }).join('')}</div></div>`).join('');
}
$('binds').addEventListener('click', e => {
  const b = e.target.closest('[data-bind]');
  if (!b) return;
  listening = b.dataset.bind; renderBinds();
  say(tr(`กดปุ่มใหม่สำหรับ "${ACTION_NAMES[listening]}" (Esc ยกเลิก)`, `Press a new key for "${ACTION_NAMES[listening]}" (Esc cancels)`));
  $('binds').querySelector(`[data-bind="${listening}"]`)?.focus();
});
function describe(action, code, r) {
  if ('reason' in r) {
    return [r.reason === 'pause-conflict'
      ? tr(`${codeLabel(code)} ใช้กับคำสั่งอื่นอยู่ เลยตั้งเป็นปุ่มหยุดเกมไม่ได้ ลองปุ่มที่ยังว่าง`, `${codeLabel(code)} is already used by another action, so it can't pause. Try a free key.`)
      : tr(`${codeLabel(code)} เป็นปุ่มหยุดเกมปุ่มเดียว ต้องตั้งปุ่มหยุดเกมใหม่ก่อน`, `${codeLabel(code)} is your only pause key. Give pause another key first.`), true];
  }
  if (!r.moved.length) return [`"${ACTION_NAMES[action]}" = ${codeLabel(code)}`, false];
  const from = r.moved.map(m => `"${ACTION_NAMES[m.from]}"${m.left.length ? '' : tr(' (ตอนนี้ไม่มีปุ่ม)', ' (now has no key)')}`).join(', ');
  return [tr(`${codeLabel(code)} ถูกย้ายจาก ${from} มาเป็น "${ACTION_NAMES[action]}"`, `${codeLabel(code)} moved from ${from} to "${ACTION_NAMES[action]}"`), r.moved.some(m => !m.left.length)];
}
// Capture phase + stopImmediatePropagation: the key that's being assigned must not also pause/attack
addEventListener('keydown', e => {
  if (!listening) return;
  e.preventDefault(); e.stopImmediatePropagation();
  const action = listening; listening = null;
  if (e.code === 'Escape' && action !== 'pause') say(tr('ยกเลิกแล้ว', 'Cancelled')); // Esc cancels, except when binding pause itself
  else say(...describe(action, e.code, rebind(action, e.code)));
  renderBinds();
  $('binds').querySelector(`[data-bind="${action}"]`)?.focus();
}, true);
export function resetKeys() { resetBindings(); renderBinds(); say(tr('คืนค่าปุ่มเริ่มต้นแล้ว', 'Default keys restored')); }
renderBinds();

// ---------- save export / import ----------
export function downloadSave() {
  const blob = new Blob([exportSave()], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = `floorbreaker-save-${new Date().toISOString().slice(0, 10)}.json`;
  a.click(); URL.revokeObjectURL(a.href);
  $('save-status').textContent = tr('Export แล้ว เก็บไฟล์นี้ไว้ ใช้ Import กลับมาได้ทุกเมื่อ', 'Exported. Keep the file; you can Import it any time.');
}
export function pickImport() { $('import-file').click(); }
$('import-file').addEventListener('change', async e => {
  const file = e.target.files?.[0];
  e.target.value = '';
  if (!file) return;
  const ok = await confirmDialog({ title: tr('Import เซฟ', 'Import save'), ok: tr('แทนที่เซฟ', 'Replace save'),
    msg: tr(`ตั้งค่า สถิติ และตัวละครที่เซฟไว้ในเครื่องนี้ จะถูกแทนด้วยข้อมูลจาก "${file.name}"`, `Your settings, records and saved character on this device will be replaced with "${file.name}".`) });
  if (!ok) return;
  const r = importSave(await file.text());
  if ('error' in r) { $('save-status').textContent = tr('Import ไม่สำเร็จ: ', 'Import failed: ') + t(r.error); return; }
  $('save-status').textContent = tr('Import เสร็จแล้ว กำลังโหลดใหม่…', 'Imported. Reloading…');
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
const stateSyncs = [...document.querySelectorAll('.state')].map(s => {
  const el = $(/** @type {HTMLElement} */ (s).dataset.for), sync = () => { s.textContent = el.checked ? tr('เปิด', 'On') : tr('ปิด', 'Off'); };
  el.addEventListener('change', sync); sync();
  return sync;
});

// ---------- language: the title's ไทย | EN tabs and the settings select ----------
const langSel = $('s-lang');
function syncLang() {
  langSel.value = settings.lang;
  for (const b of document.querySelectorAll('[data-lang]')) b.setAttribute('aria-pressed', String(/** @type {HTMLElement} */ (b).dataset.lang === settings.lang));
}
langSel.onchange = () => setLang(langSel.value);
document.addEventListener('click', e => {
  const b = /** @type {HTMLElement | null} */ (/** @type {Element} */ (e.target).closest('[data-lang]'));
  if (b) setLang(/** @type {'th' | 'en'} */ (b.dataset.lang));
});
on('langChanged', () => { syncLang(); renderBinds(); for (const f of stateSyncs) f(); });
syncLang();
