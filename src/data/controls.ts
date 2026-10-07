// Physical key codes (e.code) per action, so a Thai/AZERTY layout plays the same. Rebinding = editing this map.
export type Action = 'up' | 'down' | 'left' | 'right' | 'attack' | 'skill' | 'skill2' | 'dodge' | 'potion' | 'interact' | 'pause' | 'fullscreen' | 'mute';

export const BINDINGS: Record<Action, string[]> = {
  up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
  attack: ['KeyJ'], skill: ['KeyK'], skill2: ['KeyL'], dodge: ['Space'], potion: ['KeyQ'], interact: ['KeyE'],
  pause: ['Escape', 'KeyP'], fullscreen: ['KeyF'], mute: ['KeyM'],
};
// Gamepad (W3C "standard" mapping: Xbox / PlayStation layouts). Sticks move/aim; in menus the d-pad moves focus,
// A presses the focused button and B goes back (see main.js). Not rebindable yet.
export const PAD_BUTTONS: Partial<Record<number, Action>> = {
  0: 'dodge', 2: 'attack', 5: 'skill', 7: 'skill2', 4: 'potion', 3: 'interact', 9: 'pause',
};
export const PAD = { A: 0, B: 1, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15, deadzone: 0.25 };
export const MOUSE_BINDINGS: Partial<Record<number, Action>> = { 0: 'attack', 1: 'skill2', 2: 'skill' };
