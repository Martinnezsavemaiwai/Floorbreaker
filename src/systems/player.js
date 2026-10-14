// Player actions and movement: 3-hit sword combo, two Blade Art slots (-> post-motion delay), dodge roll, input buffer, town regen.
import { G } from '../world/state.ts';
import { move, applyKnock, hitWall } from '../world/physics.ts';
import { loadFloor } from '../world/floor.ts';
import { PLAYER } from '../data/player.ts';
import { SKILLS, BLADE_EVO } from '../data/skills.ts';
import { dist, rand } from '../core/math.ts';
import { emit } from '../core/events.ts';
import { moveVector, mouse } from '../core/input.ts';
import { pad } from '../core/gamepad.ts';
import { settings } from '../core/save.ts';
import { clock } from '../core/app.ts';
import { text, burst, ring, kick } from './fx.js';
import { targets, hurtEnemy } from './combat.js';
import { frostRing } from './elements.js';
import { mods } from './upgrades.js';
import { rng } from '../core/rng.ts';

const AIM_ASSIST = PLAYER.aimAssist, A = PLAYER.attack, SK = SKILLS.sonicLeap, C = PLAYER.combo, RL = PLAYER.roll;
const SHADE_COL = '185,163,255';
const free = () => G.P.delay <= 0 && G.P.dash <= 0 && G.P.roll <= 0 && G.P.thrust <= 0 && G.P.parry <= 0;
const canAttack = () => G.P.atkCd <= 0 && free();
const canSkill = slot => !!G.P.skills[slot] && G.P.skillCd[slot] <= 0 && free();
const live = () => G.P && !G.run.over;

// A player hit: critical roll (only drawn when the upgrade exists, so plain runs keep their RNG sequence)
function hit(e, dmg, big, m, art) {
  const crit = m.crit > 0 && rng() < m.crit;
  hurtEnemy(e, crit ? dmg * 2 : dmg, big, crit, art);
}

export function attack() {
  if (!live()) return;
  const P = G.P;
  if (!canAttack()) { P.buf = { kind: 'attack', t: PLAYER.inputBuffer }; return; }
  assistAim();
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
    const dmg = (P.atk + m.atkBonus + rand(0, A.dmgRand));
    if (Math.abs(a) <= arc) hit(e, fin ? Math.round(dmg * C.mult) : Math.round(dmg), fin, m, 'blade');
  }
  if (fin && P.evolved.includes('blade')) P.glow = 0.6;
  if (fin && P.evolved.includes('blade')) launchWave(P.x, P.y, P.ang, BLADE_EVO.range, Math.round((P.atk + m.atkBonus) * C.mult * BLADE_EVO.mult), 'blade');
}
// Dodge roll toward the movement keys (or the aim when standing still)
export function roll() {
  if (!live()) return;
  const P = G.P;
  if (P.rollCd > 0 || !free()) return;
  const v = moveVector();
  P.rollAng = v.moving ? Math.atan2(v.y, v.x) : P.ang;
  P.roll = RL.time; P.rollCd = RL.cd; P.combo = 0; P.comboT = 0; P.buf = null;
  burst(P.x, P.y + 10, 8, '#c8b89a', 140, 0.35, 4, false); emit('roll'); frostRing(P.x, P.y);
}
// Without a pointer to aim with, swings and skills turn toward the nearest enemy roughly in front
const facingMove = () => pad.active || settings.aim === 'move';
function assistAim() {
  const P = G.P;
  if (!facingMove() || pad.aiming) return;
  let best = null, bd = Infinity;
  for (const e of targets()) {
    const d = dist(P, e) - e.r, a = Math.atan2(e.y - P.y, e.x - P.x) - P.ang;
    if (d < AIM_ASSIST.range && Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < AIM_ASSIST.cone && d < bd) { best = e; bd = d; }
  }
  if (best) P.ang = Math.atan2(best.y - P.y, best.x - P.x);
}
const skillDmg = (S, m) => Math.round((G.P.atk + m.atkBonus) * S.dmgMult * m.skillDmg);
export function skill(slot = 0) {
  if (!live()) return;
  const P = G.P, id = P.skills[slot];
  if (!id) return;
  if (!canSkill(slot)) { P.buf = { kind: 'skill', slot, t: PLAYER.inputBuffer }; return; }
  assistAim();
  const S = SKILLS[id], m = mods();
  if (P.evolved.includes(id)) P.glow = 0.6;
  P.skillCd[slot] = S.cd * m.skillCd; P.combo = 0; P.comboT = 0; emit('skill');
  text(P.x, P.y - 30, S.name + '!', '#ffb347', true);
  if (id === 'sonicLeap') {
    P.dash = SK.dashTime; P.dashArt = 'sonicLeap'; P.hitSet = new Set(); frostRing(P.x, P.y);
    if (P.evolved.includes('sonicLeap')) { // Twin Gale: spend a charge; the full cooldown runs from the first dash and refills both
      if (P.galeCharges >= SK.evo.charges) P.galeT = P.skillCd[0];
      P.galeCharges--;
      P.skillCd[0] = P.galeCharges > 0 ? SK.dashTime + SK.delay + SK.evo.gap : Math.max(P.galeT, SK.dashTime + SK.delay);
    }
  }
  else if (id === 'horizontal') { // one full turn: everything in reach gets hit once
    const H = SKILLS.horizontal, twice = P.evolved.includes('horizontal');
    spinHit();
    P.spin = twice ? 0.5 : 0.25; P.spin2 = twice ? H.evo.turnGap : 0; P.delay = H.delay + (twice ? H.evo.turnGap : 0);
  } else if (id === 'crescent') {
    const Cw = SKILLS.crescent, dmg = skillDmg(Cw, m);
    const angs = P.evolved.includes('crescent') ? [-Cw.evo.fan, 0, Cw.evo.fan].map(d => P.ang + d * Math.PI / 180) : [P.ang];
    const shared = new Set(); // the fan's waves share one hit list: a target is hit once, not per wave
    for (const a of angs) launchWave(P.x, P.y, a, Cw.range, dmg, 'crescent', shared);
    P.delay = Cw.delay; kick(0.03, 4);
  } else if (id === 'riposte') { P.parry = SKILLS.riposte.stance; P.moving = false; ring(P.x, P.y, 10, 40, 0.3, '255,240,200'); }
  else if (id === 'shade') shadeStep(true);
  else if (id === 'vorpal') { P.thrust = SKILLS.vorpal.windup; P.thrustAng = P.ang; } // vorpal: rooted wind-up, the stab lands when it runs out
}
// One Cyclone Edge turn: hit everything in reach; Maelstrom Edge also drags non-boss targets in, stopping at contact
function spinHit() {
  const P = G.P, H = SKILLS.horizontal, m = mods(), pull = P.evolved.includes('horizontal') ? H.evo.pull : 0;
  for (const e of targets()) {
    const d = dist(P, e);
    if (d >= H.radius + e.r) continue;
    hit(e, skillDmg(H, m), true, m, 'horizontal');
    if (pull && e !== G.boss && d > 0) { Object.assign(e, { kx: 0, ky: 0 }); // drop the hit's outward knock so the net move is a pull
      const k = Math.min(pull, Math.max(0, d - P.r - e.r)) / d; move(e, (P.x - e.x) * k, (P.y - e.y) * k); }
  }
  ring(P.x, P.y, 20, H.radius, 0.3, '255,215,130'); kick(0.05, 6);
}
// Shade Step: blink behind a target (or to its near side if the far side is blocked) and stab; no target = a short dash.
// A landing spot is valid when it's not in a wall and doesn't cross into the boss room while the boss sleeps.
function landOk(x, y) {
  const P = G.P;
  if (hitWall({ x, y, r: P.r }) || x < P.r || x > G.L.w - P.r || y < P.r || y > G.L.h - P.r) return false;
  return G.boss.awake || !(x > G.L.roomX && P.x <= G.L.roomX);
}
function shadeTarget(cone) {
  const P = G.P;
  let best = null, bd = Infinity;
  for (const e of targets()) {
    const d = dist(P, e); if (d > SKILLS.shade.reach + e.r || d >= bd || e === P.shadeLast) continue;
    if (cone) { let a = Math.atan2(e.y - P.y, e.x - P.x) - P.ang; a = Math.atan2(Math.sin(a), Math.cos(a)); if (Math.abs(a) > cone) continue; }
    best = e; bd = d;
  }
  return best;
}
function shadeStep(first) {
  const P = G.P, S = SKILLS.shade, m = mods();
  if (first) P.shadeLast = null;
  const e = shadeTarget(first ? S.cone * Math.PI / 180 : 0);
  let spot = null;
  if (e) {
    const a = Math.atan2(e.y - P.y, e.x - P.x), gap = e.r + P.r + 8;
    spot = [[e.x + Math.cos(a) * gap, e.y + Math.sin(a) * gap], [e.x - Math.cos(a) * gap, e.y - Math.sin(a) * gap]].find(([x, y]) => landOk(x, y));
  }
  // no target, or no legal landing spot: a short dash (Gale Rush's dash state, but no contact damage, no i-frames, Shade's own recovery)
  if (!spot) { if (first) { P.dash = S.dash / SK.dashSpeed; P.dashArt = null; P.hitSet = new Set(); } return; }
  P.trail.push({ x: P.x, y: P.y, t: 0.25, col: SHADE_COL });
  [P.x, P.y] = spot; P.ang = Math.atan2(e.y - P.y, e.x - P.x);
  P.trail.push({ x: P.x, y: P.y, t: 0.25, col: SHADE_COL });
  hit(e, skillDmg(S, m), true, m, 'shade'); burst(e.x, e.y, 12, '#b9a3ff', 240, 0.35, 4, false); kick(0.06, 6);
  P.delay = S.delay; P.shadeLast = e;
  if (first && P.evolved.includes('shade')) P.shadeChain = S.evo.chainGap;
}
// Sword waves (Crescent Wave, the evolved finisher): fly straight, hit each enemy once, die on walls or at the end of their range
function launchWave(x, y, ang, range, dmg, art, hit = new Set()) {
  const Cw = SKILLS.crescent;
  G.waves.push({ x, y, vx: Math.cos(ang) * Cw.speed, vy: Math.sin(ang) * Cw.speed, left: range, dmg, art, hit, r: Cw.waveR });
}
function updateWaves(dt) {
  const m = mods();
  G.waves = G.waves.filter(w => {
    const step = Math.hypot(w.vx, w.vy) * dt;
    w.x += w.vx * dt; w.y += w.vy * dt; w.left -= step;
    if (w.left <= 0 || hitWall({ x: w.x, y: w.y, r: 6 })) return false;
    for (const e of targets()) if (!w.hit.has(e) && dist(w, e) < w.r + e.r) { w.hit.add(e); hit(e, w.dmg, true, m, w.art); }
    return true;
  });
}
// Riposte: a hit during the stance becomes a counter around the player (the hit itself is cancelled by combat.js)
export function counter() {
  const P = G.P, R = SKILLS.riposte, m = mods();
  P.parry = 0; P.inv = 0.4;
  if (P.evolved.includes('riposte')) P.slowmo = R.evo.slowTime; // before the hits: a killing counter's win clears it
  for (const e of targets()) if (dist(P, e) < R.radius + e.r) hit(e, skillDmg(R, m), true, m, 'riposte');
  ring(P.x, P.y, 20, R.radius, 0.35, '255,240,200'); text(P.x, P.y - 30, 'RIPOSTE!', '#fff1c4', true); kick(0.12, 10);
}
// Piercing Fang: everything inside the long, narrow box along the locked aim
function stab() {
  const P = G.P, V = SKILLS.vorpal, m = mods(), cx = Math.cos(P.thrustAng), cy = Math.sin(P.thrustAng);
  for (const e of targets()) {
    const dx = e.x - P.x, dy = e.y - P.y, along = dx * cx + dy * cy, side = Math.abs(dx * -cy + dy * cx);
    if (along > -e.r && along < V.length + e.r && side < V.width / 2 + e.r) hit(e, skillDmg(V, m), true, m, 'vorpal');
  }
  P.beam = 0.18; P.delay = V.delay; kick(0.07, 10);
  burst(P.x + cx * V.length, P.y + cy * V.length, 14, '#ffd27a', 300, 0.35, 4, false);
  if (P.evolved.includes('vorpal')) { P.fangLine = V.evo.lineDelay; P.fangX = P.x; P.fangY = P.y; }
}
// Rending Fang: the follow-up blast down the same line, longer and wider
function fangBlast() {
  const P = G.P, V = SKILLS.vorpal, m = mods(), cx = Math.cos(P.thrustAng), cy = Math.sin(P.thrustAng);
  for (const e of targets()) {
    const dx = e.x - P.fangX, dy = e.y - P.fangY, along = dx * cx + dy * cy, side = Math.abs(dx * -cy + dy * cx);
    if (along > -e.r && along < V.evo.lineLen + e.r && side < V.evo.lineWidth / 2 + e.r)
      hit(e, Math.round((P.atk + m.atkBonus) * V.evo.lineMult * m.skillDmg), true, m, 'vorpal');
  }
  P.fangBeam = 0.18; kick(0.05, 8);
  for (let i = 1; i <= 6; i++) burst(P.fangX + cx * V.evo.lineLen * i / 6, P.fangY + cy * V.evo.lineLen * i / 6, 6, '#ffd27a', 220, 0.3, 4, false);
}

// A dash or roll stops at the boss door while the boss sleeps: entering (and getting locked in) takes a deliberate walk
function dashMove(P, dx, dy) {
  const x0 = P.x;
  move(P, dx, dy);
  if (!G.boss.awake && P.x > G.L.roomX && x0 <= G.L.roomX) P.x = G.L.roomX;
}

// Returns true when the player stepped into the portal and a new floor was loaded (skip the rest of this step)
export function updatePlayer(dt) {
  const P = G.P;
  P.atkCd -= dt; P.skillCd[0] -= dt; P.skillCd[1] -= dt; P.skillCd[2] -= dt; P.spin -= dt; P.beam -= dt; P.fangBeam -= dt; P.hurt -= dt; P.swing -= dt; P.inv -= dt; P.comboT -= dt; P.rollCd -= dt; P.glow -= dt;
  if (P.buf) {
    const b = P.buf;
    if (b.kind === 'attack' ? canAttack() : canSkill(b.slot)) { P.buf = null; b.kind === 'attack' ? attack() : skill(b.slot); }
    else if ((b.t -= dt) <= 0) P.buf = null;
  }
  updateWaves(dt);
  if (P.galeCharges < SK.evo.charges && (P.galeT -= dt) <= 0) { P.galeCharges = SK.evo.charges; P.skillCd[0] = 0; }
  if (P.spin2 > 0 && (P.spin2 -= dt) <= 0 && P.hp > 0 && !G.run.over) spinHit();
  if (P.fangLine > 0 && (P.fangLine -= dt) <= 0 && P.hp > 0 && !G.run.over) fangBlast();
  if (P.shadeChain > 0 && (P.shadeChain -= dt) <= 0 && P.hp > 0 && !G.run.over) shadeStep(false);
  if (P.slowmo > 0) { // sim dt over the scale is real time; the assist setting owns the scale otherwise
    P.slowmo -= dt / (clock.scale || 1);
    clock.scale = settings.assistSpeed * (P.slowmo > 0 ? SKILLS.riposte.evo.slow : 1);
  }
  P.lag = P.lag > P.hp ? Math.max(P.hp, P.lag - 50 * dt) : P.hp;
  G.run.time += dt;

  if (P.dash > 0) {
    P.dash -= dt;
    dashMove(P, Math.cos(P.ang) * SK.dashSpeed * dt, Math.sin(P.ang) * SK.dashSpeed * dt);
    P.trail.push({ x: P.x, y: P.y, t: 0.25, col: P.dashArt ? undefined : SHADE_COL });
    if (P.dashArt === 'sonicLeap') for (const e of targets()) if (!P.hitSet.has(e) && dist(P, e) < e.r + SK.hitRadius) {
      const m = mods();
      P.hitSet.add(e); hit(e, skillDmg(SK, m), true, m, 'sonicLeap');
    }
    if (P.dash <= 0) P.delay = P.dashArt === 'sonicLeap' ? SK.delay : SKILLS.shade.delay;
  } else if (P.thrust > 0) {
    P.thrust -= dt; P.moving = false;
    if (P.thrust <= 0) stab();
  } else if (P.parry > 0) {
    P.parry -= dt; P.moving = false;
    if (P.parry <= 0) P.delay = SKILLS.riposte.delay;
  } else if (P.roll > 0) {
    P.roll -= dt;
    dashMove(P, Math.cos(P.rollAng) * RL.speed * dt, Math.sin(P.rollAng) * RL.speed * dt);
    P.moving = true;
  } else {
    // aim: right stick, else the walking direction (pad, or the "move" setting), else the mouse
    if (pad.aiming) P.ang = Math.atan2(pad.aim.y, pad.aim.x);
    else if (facingMove()) { const v = moveVector(); if (v.moving) P.ang = Math.atan2(v.y, v.x); }
    else P.ang = Math.atan2(mouse.y + G.cam.y - P.y, mouse.x + G.cam.x - P.x);
    applyKnock(P, dt);
    if (P.delay > 0) { P.delay -= dt; P.moving = false; }
    else {
      const v = moveVector();
      const sp = PLAYER.speed * mods().speed;
      move(P, v.x * sp * dt, v.y * sp * dt);
      P.moving = v.moving;
    }
  }
  if (P.x < G.L.townX) P.hp = Math.min(P.maxHp, P.hp + PLAYER.townRegen * dt);
  const portal = G.portal;
  if (portal) { // it opens after a moment, and only takes you once you walk into it
    portal.wait -= dt;
    const inside = dist(P, portal) < 40;
    if (!inside) portal.armed = true;
    else if (portal.armed && portal.wait <= 0) { loadFloor(G.floorIdx + 1); return true; }
  }
  return false;
}
