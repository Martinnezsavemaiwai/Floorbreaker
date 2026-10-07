// Gamepad polling (the Gamepad API has no button events). Called once per rendered frame: updates the stick
// state that input.ts/player.js read, and returns the buttons pressed since the last poll. The left stick also
// produces d-pad presses when it's pushed past halfway, so menus can be driven with either.
import { PAD } from '../data/controls.ts';

export const pad = { move: { x: 0, y: 0 }, aim: { x: 0, y: 0 }, aiming: false, active: false, connected: false };
let prev = new Set<number>();

const stick = (x: number, y: number) => (Math.hypot(x, y) < PAD.deadzone ? { x: 0, y: 0 } : { x, y });
export function pollPad(): number[] {
  const gp = [...(globalThis.navigator?.getGamepads?.() ?? [])].find(g => g?.connected);
  pad.connected = !!gp;
  if (!gp) { pad.move = { x: 0, y: 0 }; pad.aiming = false; prev = new Set(); return []; }
  const [lx = 0, ly = 0, rx = 0, ry = 0] = gp.axes;
  pad.move = stick(lx, ly); pad.aim = stick(rx, ry); pad.aiming = !!(pad.aim.x || pad.aim.y);
  const down = new Set(gp.buttons.flatMap((b, i) => (b.pressed ? [i] : [])));
  if (ly < -0.5) down.add(PAD.UP); if (ly > 0.5) down.add(PAD.DOWN);
  if (lx < -0.5) down.add(PAD.LEFT); if (lx > 0.5) down.add(PAD.RIGHT);
  const pressed = [...down].filter(i => !prev.has(i));
  prev = down;
  if (pressed.length || pad.move.x || pad.move.y || pad.aiming) pad.active = true; // the mouse hands control back (main.js)
  return pressed;
}

// Short rumble on the first connected pad (Chrome / Edge; silently nothing elsewhere)
export function rumble(strong: number, ms = 120) {
  const gp: any = [...(globalThis.navigator?.getGamepads?.() ?? [])].find(g => g?.connected);
  gp?.vibrationActuator?.playEffect?.('dual-rumble', { duration: ms, strongMagnitude: strong, weakMagnitude: strong / 2 }).catch?.(() => {});
}
