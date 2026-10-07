// Boss AI: walk toward the player, then pick a (weighted-by-repetition) move from the phase's list.
// Each move telegraphs for MOVES[mv].wind seconds, then RESOLVE[mv] fires; ACTIVE moves run every step.
import { G, rage } from '../world/state.ts';
import { ROOM, ROOM_X, WORLD } from '../world/constants.ts';
import { move } from '../world/physics.ts';
import { BOSS_RULES, MOVES } from '../data/bosses.ts';
import { clamp, dist, lerp, pick, rand } from '../core/math.ts';
import { emit } from '../core/events.ts';
import { text, burst, ring, kick } from './fx.js';
import { hurtPlayer } from './combat.js';

const bossDmg = k => Math.round(G.F.boss.dmg[k] * (rage() ? BOSS_RULES.rageDmgMult : 1));
const wind = mv => MOVES[mv].wind[rage() ? 1 : 0];
function endAct() { const b = G.boss; b.act = null; b.cd = G.F.boss.cd[rage() ? 1 : 0]; b.z = 0; }
function setAct(act, t) { const b = G.boss; b.act = act; b.t = b.tMax = t; b.hitP = false; }
function impact(x, y, r0, r1, dust, hitstop, shakeAmt) {
  ring(x, y, r0, r1, 0.35, '255,80,80'); burst(x, y, dust, '#9a7a5a', 320, 0.6, 7, false); kick(hitstop, shakeAmt); emit('bossImpact');
}

export function startBossMove(mv) {
  const { boss, P } = G, fast = rage();
  emit('bossWind', mv);
  if (mv === 'leap') {
    boss.from = { x: boss.x, y: boss.y };
    boss.to = { x: clamp(P.x, ROOM.x0 + boss.r, WORLD.w - boss.r), y: clamp(P.y, boss.r, WORLD.h - boss.r) };
  } else if (mv === 'roots') { // spikes under the player plus random spots around the room
    boss.spots = [{ x: P.x, y: P.y }];
    for (let i = 0; i < MOVES.roots.extraSpots[fast ? 1 : 0]; i++) boss.spots.push({ x: rand(ROOM.x0 + 40, WORLD.w - 40), y: rand(40, WORLD.h - 40) });
  }
  setAct(mv, wind(mv));
}

// Moves that animate every step while active
const ACTIVE = {
  dash(dt, b, P) {
    const ox = b.x, oy = b.y, sp = MOVES.charge.speed;
    move(b, Math.cos(b.ang) * sp * dt, Math.sin(b.ang) * sp * dt, ROOM.x0);
    if (Math.random() < 0.6) burst(b.x, b.y + b.r * 0.7, 1, '#8a6a4a', 60, 0.4, 6, false);
    if (!b.hitP && dist(b, P) < b.r + P.r) { b.hitP = true; hurtPlayer(bossDmg('charge'), b); }
    if (b.t <= 0 || (b.x === ox && b.y === oy)) { endAct(); kick(0, 6); }
  },
  leap(dt, b, P) {
    const k = 1 - b.t / b.tMax, e = k * k * (3 - 2 * k);
    b.x = lerp(b.from.x, b.to.x, e); b.y = lerp(b.from.y, b.to.y, e); b.z = Math.sin(k * Math.PI) * MOVES.leap.height;
    if (b.t > 0) return;
    b.x = b.to.x; b.y = b.to.y;
    impact(b.x, b.y, 30, 120, 36, 0.08, 18);
    if (dist(b, P) < MOVES.leap.radius + P.r) hurtPlayer(bossDmg('leap'), b);
    endAct();
  },
  wave(dt, b, P) {
    const Q = MOVES.quake;
    b.waveR += Q.speed * dt;
    if (!b.hitP && Math.abs(dist(b, P) - b.waveR) < Q.width) { b.hitP = true; hurtPlayer(bossDmg('quake'), b); }
    if (b.waveR > Q.maxR) endAct();
  },
};
// What happens when a move's telegraph runs out
const RESOLVE = {
  slam(b, P) {
    ring(b.x, b.y, 40, 140, 0.35, '255,80,80'); burst(b.x, b.y, 30, '#9a7a5a', 300, 0.6, 7, false); kick(0.06, 14); emit('bossImpact');
    if (dist(b, P) < MOVES.slam.radius + P.r) hurtPlayer(bossDmg('slam'), b);
    endAct();
  },
  roots(b, P) {
    for (const s of b.spots) {
      burst(s.x, s.y, 14, '#7a5a30', 260, 0.5, 7, false); ring(s.x, s.y, 10, 60, 0.3, '120,200,90');
      if (!b.hitP && dist(s, P) < MOVES.roots.radius + P.r) { b.hitP = true; hurtPlayer(bossDmg('roots'), s); }
    }
    kick(0.04, 10); emit('bossImpact'); endAct();
  },
  quake(b) { kick(0.05, 16); emit('bossImpact'); b.act = 'wave'; b.waveR = MOVES.quake.startR; b.hitP = false; },
  charge() { setAct('dash', MOVES.charge.dashTime); emit('bossCharge'); },
};

export function updateBoss(dt) {
  const { boss: b, P, F } = G;
  b.lag = b.lag > b.hp ? Math.max(b.hp, b.lag - 160 * dt) : b.hp;
  if (!b.awake && P.x > ROOM_X + 60) {
    b.awake = true; G.doorClosed = true; kick(0, 10); emit('bossWake');
    text(b.x, b.y - 70, F.boss.name, '#ff7043', true);
  }
  if (!b.awake || b.hp <= 0) return;
  b.hurt -= dt;
  if (!b.act) {
    b.cd -= dt;
    const a = Math.atan2(P.y - b.y, P.x - b.x), sp = F.boss.speed[rage() ? 1 : 0];
    b.ang = a;
    if (dist(b, P) > b.r + P.r) move(b, Math.cos(a) * sp * dt, Math.sin(a) * sp * dt, ROOM.x0);
    if (b.cd <= 0) startBossMove(pick(rage() ? F.boss.rageMoves : F.boss.moves));
    return;
  }
  b.t -= dt;
  if (ACTIVE[b.act]) ACTIVE[b.act](dt, b, P);
  else if (b.t <= 0) RESOLVE[b.act](b, P);
}
