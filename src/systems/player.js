// Player actions and movement: 3-hit sword combo, two Sword Skill slots (-> post-motion delay), dodge roll, input buffer, town regen.
import { G } from '../world/state.ts';
import { TOWN_X } from '../world/constants.ts';
import { move, applyKnock } from '../world/physics.ts';
import { loadFloor } from '../world/floor.ts';
import { PLAYER } from '../data/player.ts';
import { SKILLS } from '../data/skills.ts';
import { dist, rand } from '../core/math.ts';
import { emit } from '../core/events.ts';
import { moveVector, mouse } from '../core/input.ts';
import { text, burst, ring, kick } from './fx.js';
import { targets, hurtEnemy } from './combat.js';
import { mods } from './upgrades.js';
import { rng } from '../core/rng.ts';

const A = PLAYER.attack, SK = SKILLS.sonicLeap, C = PLAYER.combo, RL = PLAYER.roll;
const free = () => G.P.delay <= 0 && G.P.dash <= 0 && G.P.roll <= 0 && G.P.thrust <= 0;
const canAttack = () => G.P.atkCd <= 0 && free();
const canSkill = slot => !!G.P.skills[slot] && G.P.skillCd[slot] <= 0 && free();
const live = () => G.P && !G.run.over;

// A player hit: critical roll (only drawn when the upgrade exists, so plain runs keep their RNG sequence)
function hit(e, dmg, big, m) {
  const crit = m.crit > 0 && rng() < m.crit;
  hurtEnemy(e, crit ? dmg * 2 : dmg, big, crit);
}

export function attack() {
  if (!live()) return;
  const P = G.P;
  if (!canAttack()) { P.buf = { kind: 'attack', t: PLAYER.inputBuffer }; return; }
  const m = mods();
  P.combo = P.comboT > 0 ? (P.combo + 1) % 3 : 0;
  const fin = P.finisher = P.combo === 2;
  P.atkCd = A.cd * m.attackCd * (fin ? C.cdMult : 1); P.comboT = P.atkCd + C.window;
  P.swing = A.swing; P.swingDir = -P.swingDir; emit('swing');
  if (fin) { P.kx = Math.cos(P.ang) * C.lunge; P.ky = Math.sin(P.ang) * C.lunge; emit('finisher'); }
  const range = fin ? C.range : A.range, arc = fin ? C.halfArc : A.halfArc;
  for (const e of targets()) {
    if (dist(P, e) > range + e.r) continue;
    let a = Math.atan2(e.y - P.y, e.x - P.x) - P.ang;
    a = Math.atan2(Math.sin(a), Math.cos(a));
    const dmg = P.atk + m.atkBonus + rand(0, A.dmgRand);
    if (Math.abs(a) <= arc) hit(e, fin ? Math.round(dmg * C.mult) : dmg, fin, m);
  }
}
// Dodge roll toward the movement keys (or the aim when standing still)
export function roll() {
  if (!live()) return;
  const P = G.P;
  if (P.rollCd > 0 || !free()) return;
  const v = moveVector();
  P.rollAng = v.moving ? Math.atan2(v.y, v.x) : P.ang;
  P.roll = RL.time; P.rollCd = RL.cd; P.combo = 0; P.comboT = 0; P.buf = null;
  burst(P.x, P.y + 10, 8, '#c8b89a', 140, 0.35, 4, false); emit('roll');
}
const skillDmg = (S, m) => Math.round((G.P.atk + m.atkBonus) * S.dmgMult * m.skillDmg);
export function skill(slot = 0) {
  if (!live()) return;
  const P = G.P, id = P.skills[slot];
  if (!id) return;
  if (!canSkill(slot)) { P.buf = { kind: 'skill', slot, t: PLAYER.inputBuffer }; return; }
  const S = SKILLS[id], m = mods();
  P.skillCd[slot] = S.cd * m.skillCd; P.combo = 0; P.comboT = 0; emit('skill');
  text(P.x, P.y - 30, S.name + '!', '#ffb347', true);
  if (id === 'sonicLeap') { P.dash = SK.dashTime; P.hitSet = new Set(); }
  else if (id === 'horizontal') { // one full turn: everything in reach gets hit once
    const H = SKILLS.horizontal;
    for (const e of targets()) if (dist(P, e) < H.radius + e.r) hit(e, skillDmg(H, m), true, m);
    P.spin = 0.25; P.delay = H.delay; ring(P.x, P.y, 20, H.radius, 0.3, '255,215,130'); kick(0.05, 6);
  } else { P.thrust = SKILLS.vorpal.windup; P.thrustAng = P.ang; } // vorpal: rooted wind-up, the stab lands when it runs out
}
// Vorpal Strike: everything inside the long, narrow box along the locked aim
function stab() {
  const P = G.P, V = SKILLS.vorpal, m = mods(), cx = Math.cos(P.thrustAng), cy = Math.sin(P.thrustAng);
  for (const e of targets()) {
    const dx = e.x - P.x, dy = e.y - P.y, along = dx * cx + dy * cy, side = Math.abs(dx * -cy + dy * cx);
    if (along > -e.r && along < V.length + e.r && side < V.width / 2 + e.r) hit(e, skillDmg(V, m), true, m);
  }
  P.beam = 0.18; P.delay = V.delay; kick(0.07, 10);
  burst(P.x + cx * V.length, P.y + cy * V.length, 14, '#ffd27a', 300, 0.35, 4, false);
}

// Returns true when the player stepped into the portal and a new floor was loaded (skip the rest of this step)
export function updatePlayer(dt) {
  const P = G.P;
  P.atkCd -= dt; P.skillCd[0] -= dt; P.skillCd[1] -= dt; P.spin -= dt; P.beam -= dt; P.hurt -= dt; P.swing -= dt; P.inv -= dt; P.comboT -= dt; P.rollCd -= dt;
  if (P.buf) {
    const b = P.buf;
    if (b.kind === 'attack' ? canAttack() : canSkill(b.slot)) { P.buf = null; b.kind === 'attack' ? attack() : skill(b.slot); }
    else if ((b.t -= dt) <= 0) P.buf = null;
  }
  P.lag = P.lag > P.hp ? Math.max(P.hp, P.lag - 50 * dt) : P.hp;
  G.run.time += dt;

  if (P.dash > 0) {
    P.dash -= dt;
    move(P, Math.cos(P.ang) * SK.dashSpeed * dt, Math.sin(P.ang) * SK.dashSpeed * dt);
    P.trail.push({ x: P.x, y: P.y, t: 0.25 });
    for (const e of targets()) if (!P.hitSet.has(e) && dist(P, e) < e.r + SK.hitRadius) {
      const m = mods();
      P.hitSet.add(e); hit(e, skillDmg(SK, m), true, m);
    }
    if (P.dash <= 0) P.delay = SK.delay;
  } else if (P.thrust > 0) {
    P.thrust -= dt; P.moving = false;
    if (P.thrust <= 0) stab();
  } else if (P.roll > 0) {
    P.roll -= dt;
    move(P, Math.cos(P.rollAng) * RL.speed * dt, Math.sin(P.rollAng) * RL.speed * dt);
    P.moving = true;
  } else {
    P.ang = Math.atan2(mouse.y + G.cam.y - P.y, mouse.x + G.cam.x - P.x);
    applyKnock(P, dt);
    if (P.delay > 0) { P.delay -= dt; P.moving = false; }
    else {
      const v = moveVector();
      const sp = PLAYER.speed * mods().speed;
      move(P, v.x * sp * dt, v.y * sp * dt);
      P.moving = v.moving;
    }
  }
  if (P.x < TOWN_X) P.hp = Math.min(P.maxHp, P.hp + PLAYER.townRegen * dt);
  if (G.portal && dist(P, G.portal) < 40) { loadFloor(G.floorIdx + 1); return true; }
  return false;
}
