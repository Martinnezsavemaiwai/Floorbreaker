// Juice: floating text, particles, rings, hit-stop and screen shake.
import { G } from '../world/state.ts';
import { clock } from '../core/app.ts';
import { settings } from '../core/store.ts';

export function text(x, y, s, col, big) { G.texts.push({ x, y, s: String(s), col, big, t: 0.8 }); }
export function burst(x, y, n, col, spd, life, size, shard) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = spd * (0.3 + Math.random() * 0.7);
    G.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life, t: life * (0.6 + Math.random() * 0.4),
                   col, size: size * (0.5 + Math.random() * 0.5), rot: Math.random() * 6, vr: (Math.random() - 0.5) * 14, shard });
  }
}
export function ring(x, y, r0, r1, life, col) { G.rings.push({ x, y, r0, r1, life, t: life, col }); }
export function kick(hitstop, shakeAmt) {
  clock.hitStop = Math.max(clock.hitStop, hitstop);
  if (settings.shake) G.shake = Math.max(G.shake, shakeAmt);
}

export function updateFx(dt) {
  const f = Math.pow(0.03, dt);
  for (const p of G.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= f; p.vy *= f; p.rot += p.vr * dt; p.t -= dt; }
  for (const t of G.texts) { t.t -= dt; t.y -= 30 * dt; }
  for (const r of G.rings) r.t -= dt;
  for (const p of G.P.trail) p.t -= dt;
  G.parts = G.parts.filter(p => p.t > 0); G.texts = G.texts.filter(t => t.t > 0);
  G.rings = G.rings.filter(r => r.t > 0); G.P.trail = G.P.trail.filter(p => p.t > 0);
  G.shake *= Math.pow(0.002, dt);
}
