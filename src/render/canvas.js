// The main canvas plus small drawing helpers shared by world, HUD and menu rendering.
import { IMG } from '../core/assets.ts';

export const cv = /** @type {HTMLCanvasElement} */ (document.getElementById('c'));
export const ctx = cv.getContext('2d');
export const FN = "'Silk','Kanit',system-ui,sans-serif", FT = "'Kanit','Silk',system-ui,sans-serif"; // Silk: see style.css

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
const tinted = new Map(); // colour -> sword sprite washed toward that colour (built once per colour)
function tintedSword(col) {
  let c = tinted.get(col);
  if (!c) {
    c = document.createElement('canvas'); c.width = IMG.sword.width; c.height = IMG.sword.height;
    const g = c.getContext('2d'); g.drawImage(IMG.sword, 0, 0);
    g.globalCompositeOperation = 'source-atop'; g.globalAlpha = 0.45; g.fillStyle = col; g.fillRect(0, 0, c.width, c.height);
    tinted.set(col, c);
  }
  return c;
}
export function sword(h, tint) {
  const img = tint ? tintedSword(tint) : IMG.sword, w = h * img.width / img.height;
  ctx.drawImage(img, -w / 2, -h * 0.15, w, h);
}
// Soft oval shadow under an actor; k < 1 shrinks and fades it (the boss mid-leap)
export function shadow(x, y, r, k = 1) {
  ctx.fillStyle = `rgba(0,0,0,${0.32 * k})`;
  ctx.beginPath(); ctx.ellipse(x, y + r * 1.05, r * 1.1 * k, r * 0.6 * k, 0, 0, 7); ctx.fill();
}
