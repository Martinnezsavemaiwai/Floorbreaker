// Player actions and movement: sword swing, Sword Skill dash -> post-motion delay, input buffer, town regen.
import { G } from '../world/state.ts';
import { TOWN_X } from '../world/constants.ts';
import { move, applyKnock } from '../world/physics.ts';
import { loadFloor } from '../world/floor.ts';
import { PLAYER } from '../data/player.ts';
import { dist, rand } from '../core/math.ts';
import { emit } from '../core/events.ts';
import { moveVector, mouse } from '../core/input.ts';
import { text } from './fx.js';
import { targets, hurtEnemy } from './combat.js';
import { mods } from './upgrades.js';
import { rng } from '../core/rng.ts';

const A = PLAYER.attack, SK = PLAYER.skill;
const canAttack = () => G.P.atkCd <= 0 && G.P.delay <= 0 && G.P.dash <= 0;
const canSkill = () => G.P.skillCd <= 0 && G.P.delay <= 0 && G.P.dash <= 0;
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
  P.atkCd = A.cd * m.attackCd; P.swing = A.swing; P.swingDir = -P.swingDir; emit('swing');
  for (const e of targets()) {
    if (dist(P, e) > A.range + e.r) continue;
    let a = Math.atan2(e.y - P.y, e.x - P.x) - P.ang;
    a = Math.atan2(Math.sin(a), Math.cos(a));
    if (Math.abs(a) <= A.halfArc) hit(e, P.atk + m.atkBonus + rand(0, A.dmgRand), false, m);
  }
}
export function skill() {
  if (!live()) return;
  const P = G.P;
  if (!canSkill()) { P.buf = { kind: 'skill', t: PLAYER.inputBuffer }; return; }
  P.skillCd = SK.cd * mods().skillCd; P.dash = SK.dashTime; P.hitSet = new Set(); emit('skill');
  text(P.x, P.y - 30, SK.name + '!', '#ffb347', true);
}

// Returns true when the player stepped into the portal and a new floor was loaded (skip the rest of this step)
export function updatePlayer(dt) {
  const P = G.P;
  P.atkCd -= dt; P.skillCd -= dt; P.hurt -= dt; P.swing -= dt; P.inv -= dt;
  if (P.buf) {
    const b = P.buf;
    if ((b.kind === 'attack' ? canAttack : canSkill)()) { P.buf = null; b.kind === 'attack' ? attack() : skill(); }
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
      P.hitSet.add(e); hit(e, Math.round((P.atk + m.atkBonus) * SK.dmgMult * m.skillDmg), true, m);
    }
    if (P.dash <= 0) P.delay = SK.delay;
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
