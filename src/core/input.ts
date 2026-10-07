// Turns raw keys/mouse into intents: a move vector, an aim point and named actions.
// Systems only ask for intents, so gamepad or on-screen touch controls are just another source later.
// Bindings = defaults from data/controls.ts overridden by the player's settings.bindings (rebinding).
import { BINDINGS, MOUSE_BINDINGS, type Action } from '../data/controls.ts';
import { settings, saveSettings } from './save.ts';

export const keys: Record<string, boolean> = {}; // held physical keys (e.code -> bool)
export const mouse = { x: 0, y: 0 };              // in canvas pixels
export const ACTIONS = Object.keys(BINDINGS) as Action[];

export const codesFor = (action: Action): string[] => settings.bindings[action] ?? BINDINGS[action];
const held = (action: Action) => codesFor(action).some(code => keys[code]);
export function moveVector() {
  const x = (held('right') ? 1 : 0) - (held('left') ? 1 : 0), y = (held('down') ? 1 : 0) - (held('up') ? 1 : 0);
  const l = Math.hypot(x, y) || 1;
  return { x: x / l, y: y / l, moving: !!(x || y) };
}
export const actionForKey = (code: string) => ACTIONS.find(a => codesFor(a).includes(code));
export const actionForButton = (button: number) => MOUSE_BINDINGS[button];
export const releaseAll = () => { for (const k in keys) keys[k] = false; };

// Replace the primary key of `action` (secondary keys like the arrows stay) and take `code` away from any
// other action that used it, so one key never triggers two actions. Returns what moved, so the UI can say so.
// Pause is special: it's the way out of every menu, so it may never be left unbound or steal a key.
export type RebindResult = { ok: true; moved: { from: Action; left: string[] }[] } | { ok: false; reason: 'pause-conflict' | 'pause-unbound' };
export function rebind(action: Action, code: string): RebindResult {
  const owners = ACTIONS.filter(a => a !== action && codesFor(a).includes(code));
  if (action === 'pause' && owners.length) return { ok: false, reason: 'pause-conflict' };
  if (owners.includes('pause') && codesFor('pause').length === 1) return { ok: false, reason: 'pause-unbound' };
  const moved = owners.map(a => {
    settings.bindings[a] = codesFor(a).filter(c => c !== code);
    return { from: a, left: settings.bindings[a] };
  });
  settings.bindings[action] = [code, ...codesFor(action).slice(1).filter(c => c !== code)];
  saveSettings();
  return { ok: true, moved };
}
export function resetBindings() { settings.bindings = {}; saveSettings(); }

// "KeyW" -> "W", "ArrowUp" -> "↑", "Escape" -> "Esc"
const NAMES: Record<string, string> = { ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Escape: 'Esc', Space: 'Space',
  ShiftLeft: 'Shift', ShiftRight: 'R-Shift', ControlLeft: 'Ctrl', ControlRight: 'R-Ctrl', AltLeft: 'Alt', Enter: 'Enter', Tab: 'Tab' };
export const codeLabel = (code?: string) => !code ? '—' : NAMES[code] ?? code.replace(/^Key|^Digit|^Numpad/, '');
export const keyLabel = (action: Action) => codeLabel(codesFor(action)[0]);
