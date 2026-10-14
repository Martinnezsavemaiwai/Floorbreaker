// Juice: floating text, particles, rings, hit-stop and screen shake.
import { G } from '../world/state.ts';
import { clock } from '../core/app.ts';
import { settings } from '../core/save.ts';

export function text(x, y, s, col, big) { G.texts.push({ x, y, s: String(s), col, big, t: 0.8 }); }
export function burst(x, y, n, col, spd, life, size, shard) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = spd * (0.3 + Math.random() * 0.7);
    G.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life, t: life * (0.6 + Math.random() * 0.4),
                   col, size: size * (0.5 + Math.random() * 0.5), rot: Math.random() * 6, vr: (Math.random() - 0.5) * 14, shard });
  }
}
// Coins and XP orbs pop out of a kill, bounce once, then home in on the player. Purely visual: gainCol/gainXp have
// already paid the reward, so timing and tests don't depend on them.
export function dropLoot(x, y, coins, orbs) {
  const n = (k, m) => Math.min(m, Math.max(1, Math.round(k)));
  /** @type {['coin' | 'xp', number][]} */
  const plan = [['coin', coins > 0 ? n(coins / 3, 6) : 0], ['xp', orbs > 0 ? n(orbs / 15, 6) : 0]];
  for (const [kind, count] of plan)
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2, s = 60 + Math.random() * 90;
      G.loot.push({ kind, x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.6, z: 0, vz: 160 + Math.random() * 90, t: 0, seed: Math.random() * 10 });
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
  const P = G.P;
  for (const l of G.loot) {
    l.t += dt;
    if (l.t < 0.45 || !P) { // the pop: a small arc with ground friction, one bounce
      l.x += l.vx * dt; l.y += l.vy * dt; l.vx *= Math.pow(0.05, dt); l.vy *= Math.pow(0.05, dt);
      l.vz -= 900 * dt; l.z += l.vz * dt; if (l.z < 0) { l.z = 0; l.vz = -l.vz * 0.35; }
    } else { // then fly to the player, faster and faster
      const dx = P.x - l.x, dy = P.y - 12 - l.y, d = Math.hypot(dx, dy) || 1, sp = 260 + (l.t - 0.45) * 900;
      l.x += dx / d * Math.min(d, sp * dt); l.y += dy / d * Math.min(d, sp * dt); l.z *= Math.pow(0.01, dt);
      if (d < 10) { l.t = -1; burst(P.x, P.y - 12, 2, l.kind === 'coin' ? '#ffe14d' : '#7fd4ff', 90, 0.25, 3, true); }
    }
  }
  G.loot = G.loot.filter(l => l.t >= 0);
  for (const b of G.bolts) b.t -= dt; G.bolts = G.bolts.filter(b => b.t > 0);
  for (const p of G.P.trail) p.t -= dt;
  G.parts = G.parts.filter(p => p.t > 0); G.texts = G.texts.filter(t => t.t > 0);
  G.rings = G.rings.filter(r => r.t > 0); G.P.trail = G.P.trail.filter(p => p.t > 0);
  G.shake *= Math.pow(0.002, dt);
}
