// The main canvas plus small drawing helpers shared by world, HUD and menu rendering.
import { IMG } from '../core/assets.ts';

export const cv = /** @type {HTMLCanvasElement} */ (document.getElementById('c'));
export const ctx = cv.getContext('2d');
export const FN = "'Exo 2','Kanit',system-ui,sans-serif", FT = "'Kanit','Exo 2',system-ui,sans-serif";

export const dirCol = a => Math.abs(Math.cos(a)) > Math.abs(Math.sin(a)) ? (Math.cos(a) > 0 ? 3 : 2) : (Math.sin(a) > 0 ? 0 : 1);
export function frame(img, col, row, x, y, scale) {
  if (!img) return;
  const s = 16 * scale;
  ctx.drawImage(img, col * 16, row * 16, 16, 16, Math.round(x - s / 2), Math.round(y - s * 0.6), s, s);
}
export function shadow(x, y, r, k = 1) {
  ctx.globalAlpha = k; ctx.drawImage(IMG.shadow, x - r * 1.1 * k, y + r * 0.45, r * 2.2 * k, r * 1.2 * k); ctx.globalAlpha = 1;
}
