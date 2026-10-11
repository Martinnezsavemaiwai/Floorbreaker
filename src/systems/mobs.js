// Field mobs: wander, chase outside town, wind up (telegraph) then lunge; sidestep around trees.
// Ranged mobs hold a distance instead and fire a shot that flies straight until it hits the player, a wall or town.
import { G } from '../world/state.ts';
import { move, applyKnock, hitWall } from '../world/physics.ts';
import { dist, rand } from '../core/math.ts';
import { emit } from '../core/events.ts';
import { rng } from '../core/rng.ts';
import { hurtPlayer } from './combat.js';
import { tickStatus, speedFactor } from './elements.js';

export function updateMobs(dt) {
  const { P } = G;
  updateShots(dt);
  for (const m of G.mobs) {
    const L = G.L, M = m.def, R = M.ranged, maxX = m.summoned ? L.w : L.roomX; // field mobs stay out of the boss room
    if (m.hp <= 0) continue; // the dead stay dead: rooms are cleared wave by wave
    tickStatus(m, dt);
    if (m.hp <= 0) continue;              // a burn/poison tick can kill
    if (m.frozen > 0) { applyKnock(m, dt, L.townX, maxX); continue; } // frozen: no thinking, no attacking
    m.cd -= dt; m.hurt -= dt; m.lunge -= dt; m.armorT -= dt;
    applyKnock(m, dt, L.townX, maxX);
    const d = dist(m, P), chase = (m.aggro || d < M.chaseRange) && P.x > L.townX, wr = M.wanderRange;
    if (m.wind > 0) {
      m.face = Math.atan2(P.y - m.y, P.x - m.x); m.wind -= dt;
      if (m.wind <= 0) {
        m.cd = M.attackCd;
        if (R) shoot(m, R, M.dmg);
        else { m.lunge = M.lunge; if (d < m.r + P.r + M.reach) hurtPlayer(M.dmg, m); }
      }
      continue;
    }
    if (!chase && (Math.hypot(m.wx - m.x, m.wy - m.y) < 5 || rng() < dt * 0.3)) {
      m.wx = m.sx + rand(-wr, wr); m.wy = m.sy + rand(-wr, wr);
    }
    const back = chase && R && d < R.keep; // too close: back away while still facing the player
    const tx = back ? 2 * m.x - P.x : chase ? P.x : m.wx, ty = back ? 2 * m.y - P.y : chase ? P.y : m.wy;
    m.face = Math.atan2(ty - m.y, tx - m.x);
    if (chase && !back && d <= (R ? R.range : m.r + P.r + M.attackRange)) {
      m.face = Math.atan2(P.y - m.y, P.x - m.x);
      if (m.cd <= 0) { m.wind = M.wind; emit('mobWindup'); }
      continue;
    }
    const sp = (chase ? M.speed : M.wanderSpeed) * speedFactor(m), ox = m.x, oy = m.y, siding = m.side > 0;
    if (siding) { // walking around an obstacle
      m.side -= dt;
      move(m, -Math.sin(m.face) * m.sideDir * sp * dt, Math.cos(m.face) * m.sideDir * sp * dt, L.townX, maxX);
    } else move(m, Math.cos(m.face) * sp * dt, Math.sin(m.face) * sp * dt, L.townX, maxX);
    if (Math.hypot(m.x - ox, m.y - oy) < sp * dt * 0.3) { // (nearly) blocked: sidestep for a moment
      m.sideDir = siding ? -m.sideDir : (rng() < 0.5 ? 1 : -1); m.side = 0.5;
      if (!chase) { m.wx = m.sx + rand(-wr, wr); m.wy = m.sy + rand(-wr, wr); }
    }
  }
}

function shoot(m, R, dmg) {
  const { P } = G, a = Math.atan2(P.y - m.y, P.x - m.x);
  G.shots.push({ x: m.x + Math.cos(a) * m.r, y: m.y + Math.sin(a) * m.r, vx: Math.cos(a) * R.shotSpeed, vy: Math.sin(a) * R.shotSpeed,
                 r: R.shotR, dmg, col: R.color, life: R.range * 1.5 / R.shotSpeed });
  emit('mobShot');
}
function updateShots(dt) {
  const { P } = G;
  G.shots = G.shots.filter(s => {
    s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
    if (Math.hypot(P.x - s.x, P.y - s.y) < P.r + s.r) { hurtPlayer(s.dmg, s); return false; }
    return s.life > 0 && s.x > G.L.townX && !hitWall(s);
  });
}
