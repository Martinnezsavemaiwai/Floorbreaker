// Physical key codes (e.code) per action, so a Thai/AZERTY layout plays the same. Rebinding = editing this map.
export type Action = 'up' | 'down' | 'left' | 'right' | 'attack' | 'skill' | 'dodge' | 'potion' | 'interact' | 'pause' | 'fullscreen' | 'mute';

export const BINDINGS: Record<Action, string[]> = {
  up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
  attack: ['KeyJ'], skill: ['KeyK'], dodge: ['Space'], potion: ['KeyQ'], interact: ['KeyE'],
  pause: ['Escape', 'KeyP'], fullscreen: ['KeyF'], mute: ['KeyM'],
};
export const MOUSE_BINDINGS: Partial<Record<number, Action>> = { 0: 'attack', 2: 'skill' };
