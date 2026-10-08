// Title background and the "Dive In" intro tunnel.
import { G } from '../world/state.ts';
import { W, H } from '../world/constants.ts';
import { settings } from '../core/save.ts';
import { clamp } from '../core/math.ts';
import { ctx, FN } from './canvas.js';

export const INTRO_TIME = 1.9;

// Drifting crystal shards around a slowly turning ring (the Spire's silhouette)
const shards = Array.from({ length: 46 }, () => ({ x: Math.random() * W, y: Math.random() * H, s: 3 + Math.random() * 9, v: 8 + Math.random() * 26, r: Math.random() * 6 }));
export function updateMenuBg(dt) {
  for (const p of shards) { p.y -= p.v * dt; p.r += dt; if (p.y < -20) { p.y = H + 20; p.x = Math.random() * W; } }
}
export function drawMenuBg() {
  const time = G.time;
  const g = ctx.createRadialGradient(W / 2, H * 0.42, 40, W / 2, H / 2, W * 0.75);
  g.addColorStop(0, '#1d3654'); g.addColorStop(1, '#05070c'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.translate(W / 2, H * 0.42); ctx.rotate(time * 0.05);
  for (let i = 0; i < 3; i++) { ctx.strokeStyle = `rgba(95,195,255,${0.12 - i * 0.03})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, 0, 300 + i * 40, 90 + i * 14, 0, 0, 7); ctx.stroke(); }
  ctx.restore();
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const p of shards) {
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.globalAlpha = 0.25 + 0.25 * Math.sin(time + p.x);
    ctx.fillStyle = '#8fe3ff'; ctx.beginPath(); ctx.moveTo(0, -p.s); ctx.lineTo(p.s * 0.45, 0); ctx.lineTo(0, p.s); ctx.lineTo(-p.s * 0.45, 0); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

// A tunnel of rainbow rings rushing outward, then the game fades in
export function drawIntro() {
  const t = G.introT, k = t / INTRO_TIME;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(W / 2, H / 2);
  for (let i = 0; i < 16; i++) {
    const p = (t * 0.9 + i / 16) % 1, r = p * p * W * 0.9;
    ctx.strokeStyle = `hsla(${i * 23 + t * 160},95%,62%,${(1 - p) * 0.8})`; ctx.lineWidth = 2 + p * 14;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.stroke();
  }
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 160); glow.addColorStop(0, `rgba(255,255,255,${0.5 * k})`); glow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = glow; ctx.fillRect(-160, -160, 320, 320);
  ctx.restore();
  ctx.globalAlpha = clamp((t - 0.25) * 3, 0, 1) * clamp((INTRO_TIME - t) * 4, 0, 1);
  ctx.textAlign = 'center'; ctx.font = `800 54px ${FN}`; ctx.fillStyle = '#fff'; ctx.fillText('DIVE IN', W / 2, H / 2 + 18);
  ctx.globalAlpha = 1;
  if (k > 0.8) { ctx.fillStyle = settings.flash ? `rgba(255,255,255,${(k - 0.8) * 5})` : `rgba(0,0,0,${(k - 0.8) * 5})`; ctx.fillRect(0, 0, W, H); }
}
