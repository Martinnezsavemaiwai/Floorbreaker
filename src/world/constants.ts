// Canvas size (must match <canvas width/height> in index.html). Floor geometry is per floor: see world/layout.ts.
export const W = 960, H = 640;
// The camera follows the player and stops at the map edge, so the screen is always filled with the world.
// Whatever stands under the HUD (player, boss, door signs) is handled by the HUD fading, not by the camera.
export function followCam(cam: { x: number; y: number }, p: { x: number; y: number }, L: { w: number; h: number }) {
  cam.x = Math.max(0, Math.min(L.w - W, p.x - W / 2));
  cam.y = Math.max(0, Math.min(L.h - H, p.y - H / 2));
}
