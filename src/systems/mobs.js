// Field mobs: wander, chase outside town, wind up (telegraph) then lunge; sidestep around trees.
import { G } from '../world/state.js';
import { TOWN_X } from '../world/constants.js';
import { move, applyKnock } from '../world/physics.js';
import { makeMob } from '../world/floor.js';
import { dist, rand } from '../core/math.js';
import { emit } from '../core/events.js';
import { hurtPlayer } from './combat.js';

export function updateMobs(dt) {
  const { P, F } = G, M = F.mob;
  for (const m of G.mobs) {
    if (m.hp <= 0) { if ((m.dead -= dt) <= 0) Object.assign(m, makeMob(m.sx, m.sy)); continue; }
    m.cd -= dt; m.hurt -= dt; m.lunge -= dt;
    applyKnock(m, dt, TOWN_X);
    const d = dist(m, P), chase = d < M.chaseRange && P.x > TOWN_X, wr = M.wanderRange;
    if (m.wind > 0) {
      m.face = Math.atan2(P.y - m.y, P.x - m.x); m.wind -= dt;
      if (m.wind <= 0) { m.lunge = M.lunge; m.cd = M.attackCd; if (d < m.r + P.r + M.reach) hurtPlayer(M.dmg, m); }
      continue;
    }
    if (!chase && (Math.hypot(m.wx - m.x, m.wy - m.y) < 5 || Math.random() < dt * 0.3)) {
      m.wx = m.sx + rand(-wr, wr); m.wy = m.sy + rand(-wr, wr);
    }
    const tx = chase ? P.x : m.wx, ty = chase ? P.y : m.wy;
    m.face = Math.atan2(ty - m.y, tx - m.x);
    if (chase && d <= m.r + P.r + M.attackRange) { if (m.cd <= 0) { m.wind = M.wind; emit('mobWindup'); } continue; }
    const sp = chase ? M.speed : M.wanderSpeed, ox = m.x, oy = m.y, siding = m.side > 0;
    if (siding) { // walking around an obstacle
      m.side -= dt;
      move(m, -Math.sin(m.face) * m.sideDir * sp * dt, Math.cos(m.face) * m.sideDir * sp * dt, TOWN_X);
    } else move(m, Math.cos(m.face) * sp * dt, Math.sin(m.face) * sp * dt, TOWN_X);
    if (Math.hypot(m.x - ox, m.y - oy) < sp * dt * 0.3) { // (nearly) blocked: sidestep for a moment
      m.sideDir = siding ? -m.sideDir : (Math.random() < 0.5 ? 1 : -1); m.side = 0.5;
      if (!chase) { m.wx = m.sx + rand(-wr, wr); m.wy = m.sy + rand(-wr, wr); }
    }
  }
}
