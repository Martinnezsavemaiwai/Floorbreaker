// Code-driven character animation: pure draw transforms (walk bounce, squash/stretch, recoil, fall) computed from
// state the entities already carry. Drawing only: nothing here changes positions, hitboxes or timings.
import { PLAYER } from '../data/player.ts';
export const REDUCED = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
const A = {
  breathe: 0.025, period: { player: 1.6, npc: 1.6, mob: 1.6, boss: 2.4 }, rageBreath: 1.5,
  // rate = walk-sheet frames per second; the bounce follows those frames, so body and legs move as one
  walk: { bounce: { player: 3, npc: 3, mob: 3, boss: 2 }, rate: { player: 10, npc: 6, mob: 8, boss: 5 } },
  hit: { recoil: { player: 4, npc: 4, mob: 4, boss: 2 }, flat: 0.12, flatTime: 0.08 },
  wind: 0.1, lunge: 0.08, die: { time: 0.4, tilt: 1.22 }, stun: 0.08, dash: { sx: 1.12, sy: 0.9 },
  swing: { squash: 0.08, stretch: 0.06, squashTime: 0.06, finisher: 1.5 },
};
const SWING_LEN = PLAYER.attack.swing; // e.swing counts down from it
// mirrors the hurt timers set in combat.js (player 0.25, mobs/boss 0.1); keep in sync if those change
const HURT_LEN = { player: 0.25, npc: 0.25, mob: 0.1, boss: 0.1 };

// Which of the 4 walk frames (0, 2 = foot down, 1, 3 = passing) an entity shows at time t. The sprite row and the
// pose bounce both read it, so they can't drift apart. e.sx (spawn x) staggers mobs so a pack doesn't march in step.
export function walkFrame(e, kind, t) {
  return Math.floor(t * A.walk.rate[A.walk.rate[kind] ? kind : 'player'] + (e.sx ?? 0)) % 4;
}

export function pose(e, kind, t, o = {}) {
  if (o.dyingFor !== undefined) { // tip over away from the killing hit, fading
    const k = Math.max(0, Math.min(1, o.dyingFor / A.die.time)), side = (e.kx ?? 0) >= 0 ? 1 : -1;
    return damp({ sx: 1, sy: 1, rot: side * A.die.tilt * k, ox: 0, oy: 0, alpha: 1 - k }, o.reduced);
  }
  let sx = 1, sy = 1, rot = 0, ox = 0, oy = 0, alpha = 1;
  // breathe (idle): phase per entity (e.sx is the spawn x, already used as a seed in render/world.js)
  kind = A.period[kind] ? kind : 'player'; // unknown kind: player tables
  const per = A.period[kind] / (kind === 'boss' && o.rage ? A.rageBreath : 1);
  const b = Math.sin((t / per) * Math.PI * 2 + (e.sx ?? 0));
  sy += b * A.breathe; sx -= b * A.breathe / 2;
  // walk: the body lifts one art pixel on the passing frames and drops on the foot-down frames. No lean or stretch:
  // rotating and rescaling pixel art every frame makes it wobble
  if ((o.moving ?? e.moving) && walkFrame(e, kind, t) % 2) oy -= A.walk.bounce[kind];
  if (e.def?.wind > 0 && e.wind > 0) { // mob wind-up: squash more as the attack nears (e.wind counts down)
    const k = 1 - e.wind / e.def.wind;
    sx += A.wind * k; sy -= A.wind * k;
  }
  if (e.lunge > 0) sy += A.lunge;
  if (e.swing > 0) { // player swing: squash at the start, then stretch
    const elapsed = SWING_LEN - e.swing, m = e.finisher ? A.swing.finisher : 1;
    if (elapsed < A.swing.squashTime) { sx += A.swing.squash * m; sy -= A.swing.squash * m; }
    else { sx -= A.swing.stretch * m; sy += A.swing.stretch * m; }
  }
  if (e.dash > 0 || e.roll > 0) { sx = A.dash.sx; sy = A.dash.sy; }
  if (e.hurt > 0) { // hit: recoil along the knockback, decaying; flatten first
    const max = HURT_LEN[kind], k = Math.min(1, e.hurt / max), kx = o.kx ?? e.kx ?? 0, ky = o.ky ?? e.ky ?? 0, len = Math.hypot(kx, ky) || 1;
    ox += kx / len * A.hit.recoil[kind] * k;
    oy += ky / len * A.hit.recoil[kind] * k;
    const elapsed = max - Math.min(max, e.hurt);
    if (elapsed < A.hit.flatTime) { const f = 1 - elapsed / A.hit.flatTime; sx += A.hit.flat * f; sy -= A.hit.flat * f; }
  }
  if (kind === 'boss' && e.stun > 0) rot += Math.sin(t * 3) * A.stun;
  return damp({ sx, sy, rot, ox, oy, alpha }, o.reduced);
}
function damp(p, reduced) {
  if (!reduced) return p;
  return { sx: 1 + (p.sx - 1) / 2, sy: 1 + (p.sy - 1) / 2, rot: p.rot / 2, ox: p.ox / 2, oy: p.oy / 2, alpha: p.alpha };
}
export function applyPose(ctx, x, y, p) {
  ctx.translate(x + p.ox, y + p.oy); ctx.rotate(p.rot); ctx.scale(p.sx, p.sy); ctx.translate(-x, -y);
  ctx.globalAlpha *= p.alpha;
}
