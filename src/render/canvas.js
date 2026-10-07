// The main canvas plus small drawing helpers shared by world, HUD and menu rendering.
import { IMG } from '../core/assets.ts';

export const cv = /** @type {HTMLCanvasElement} */ (document.getElementById('c'));
export const ctx = cv.getContext('2d');
export const FN = "'Exo 2','Kanit',system-ui,sans-serif", FT = "'Kanit','Exo 2',system-ui,sans-serif";

export const dirCol = a => Math.abs(Math.cos(a)) > Math.abs(Math.sin(a)) ? (Math.cos(a) > 0 ? 3 : 2) : (Math.sin(a) > 0 ? 0 : 1);
// One cell of a 4-column character sheet; the cell size comes from the sheet, and `scale` is per 16 px of cell
// (so a 16 px pack sheet and a 48 px sheet of our own both draw 48 screen px at scale 3)
export function frame(img, col, row, x, y, scale) {
  if (!img) return;
  const c = img.width / 4, s = 16 * scale;
  ctx.drawImage(img, col * c, row * c, c, c, Math.round(x - s / 2), Math.round(y - s * 0.6), s, s);
}
// The sword sprite (hilt at the top, blade pointing down) at `h` px tall, keeping the image's proportions;
// the origin is the hand, a little below the pommel
export function sword(h) {
  const img = IMG.sword, w = h * img.width / img.height;
  ctx.drawImage(img, -w / 2, -h * 0.15, w, h);
}
export function shadow(x, y, r, k = 1) {
  ctx.globalAlpha = k; ctx.drawImage(IMG.shadow, x - r * 1.1 * k, y + r * 0.45, r * 2.2 * k, r * 1.2 * k); ctx.globalAlpha = 1;
}
