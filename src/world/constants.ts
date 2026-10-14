// Canvas size (must match <canvas width/height> in index.html). Floor geometry is per floor: see world/layout.ts.
export const W = 960, H = 640;
// The camera may scroll this far past the map edge (dark wall shows there), so the HUD bands along the top and
// bottom of the screen never sit over the player, a door or its sign when they stand against a wall
export const CAM_PAD = { x: 40, top: 120, bottom: 150 };
export function followCam(cam: { x: number; y: number }, p: { x: number; y: number }, L: { w: number; h: number }) {
  cam.x = Math.max(-CAM_PAD.x, Math.min(L.w - W + CAM_PAD.x, p.x - W / 2));
  cam.y = Math.max(-CAM_PAD.top, Math.min(L.h - H + CAM_PAD.bottom, p.y - H / 2));
}
