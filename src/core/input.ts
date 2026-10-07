// Turns raw keys/mouse into intents: a move vector, an aim point and named actions.
// Systems only ask for intents, so gamepad or on-screen touch controls are just another source later.
import { BINDINGS, MOUSE_BINDINGS, type Action } from '../data/controls.ts';

export const keys: Record<string, boolean> = {}; // held physical keys (e.code -> bool)
export const mouse = { x: 0, y: 0 };              // in canvas pixels

const held = (action: Action) => BINDINGS[action].some(code => keys[code]);
export function moveVector() {
  const x = (held('right') ? 1 : 0) - (held('left') ? 1 : 0), y = (held('down') ? 1 : 0) - (held('up') ? 1 : 0);
  const l = Math.hypot(x, y) || 1;
  return { x: x / l, y: y / l, moving: !!(x || y) };
}
export const actionForKey = (code: string) => (Object.keys(BINDINGS) as Action[]).find(a => BINDINGS[a].includes(code));
export const actionForButton = (button: number) => MOUSE_BINDINGS[button];
export const releaseAll = () => { for (const k in keys) keys[k] = false; };
