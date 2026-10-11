// Elements on hit: an Art hit applies each element modded onto that Art (systems/build.js owns the mods).
// Statuses tick on the game clock; damage-over-time goes through combat's dot(), which never re-applies
// elements, so chains and burns can't loop. Set bonuses switch on at 3 mods of one element across all Arts.
import { G } from '../world/state.ts';
import { EL } from '../data/elements.ts';
import { dist } from '../core/math.ts';
import { hurtEnemy, dot, targets } from './combat.js';
import { ring } from './fx.js';

const modsOf = art => G.P.mods[art] ?? [];
// One slow at a time: the stronger one wins while it lasts; an expired slow never leaks into a new one
const slow = (e, k, t) => { e.slowK = e.slowT > 0 ? Math.max(e.slowK ?? 0, k) : k; e.slowT = Math.max(e.slowT > 0 ? e.slowT : 0, t); };
export const elementCount = el => Object.values(G.P.mods).reduce((n, els) => n + els.filter(e => e === el).length, 0);
export const setActive = el => elementCount(el) >= EL.set.need;
const isBoss = e => e === G.boss;

export function applyElements(e, art, dmg) {
  const els = modsOf(art);
  for (const el of new Set(els)) {
    if (e.hp <= 0 && el !== 'storm') continue; // a killing blow sets no status: "dies while burning" means it already was
    const k = els.filter(x => x === el).length === 2 ? EL.double : 1;
    if (el === 'ember') {
      const stacks = Math.min(EL.ember.stacks, (e.burn?.t > 0 ? e.burn.stacks : 0) + 1);
      e.burn = { dps: dmg * EL.ember.dps * k, t: EL.ember.time, stacks };
    } else if (el === 'storm') {
      const near = targets().filter(o => o !== e && dist(o, e) < EL.storm.range).sort((a, b) => dist(a, e) - dist(b, e)).slice(0, EL.storm.chain);
      for (const o of near) { G.bolts.push({ x1: e.x, y1: e.y, x2: o.x, y2: o.y, t: 0.15 }); hurtEnemy(o, Math.round(dmg * EL.storm.mult * k), false); }
    } else if (el === 'thorn') {
      e.poison = { dps: dmg * EL.thorn.dps * k, t: EL.thorn.time };
      slow(e, EL.thorn.slow, EL.thorn.slowTime);
    } else if (el === 'tide') {
      if (!isBoss(e)) { e.kx *= EL.tide.knock * k; e.ky *= EL.tide.knock * k; }
      const n = (e.tide?.t > 0 ? e.tide.n : 0) + 1;
      if (n >= EL.tide.hits) {
        e.tide = { n: 0, t: 0 };
        if (isBoss(e)) slow(e, EL.tide.bossSlow, EL.tide.freeze);
        else e.frozen = EL.tide.freeze * k;
        ring(e.x, e.y, 10, 40, 0.3, '90,200,255');
      } else e.tide = { n, t: EL.tide.window };
    }
  }
  if (setActive('storm') && ++G.P.stormHits % EL.set.stormEvery === 0) { // a bolt from above
    ring(e.x, e.y, 5, 50, 0.25, '166,136,255'); hurtEnemy(e, G.P.atk * EL.set.stormBolt, true);
  }
}

// Burn and poison deal their damage every 0.5 s; slow, freeze and Tide stacks wear off
export function tickStatus(e, dt) {
  for (const s of [e.burn, e.poison]) if (s) s.t -= dt;
  if (e.slowT > 0) e.slowT -= dt;
  if (e.frozen > 0) e.frozen -= dt;
  if (e.tide?.t > 0) e.tide.t -= dt;
  const rate = (e.burn?.t > 0 ? e.burn.dps * e.burn.stacks : 0) + (e.poison?.t > 0 ? e.poison.dps : 0);
  if (rate <= 0) { e.dotAcc = e.dotTick = 0; return; }
  e.dotAcc = (e.dotAcc ?? 0) + rate * dt;
  if (e.dotAcc >= 1 && (e.dotTick = (e.dotTick ?? 0) - dt) <= 0) { const n = Math.floor(e.dotAcc); e.dotAcc -= n; e.dotTick = 0.5; dot(e, n); }
}

// 0 while frozen, slowed by the strongest active slow, else 1
export const speedFactor = e => (e.frozen > 0 ? 0 : e.slowT > 0 ? 1 - (e.slowK ?? 0) : 1);

// Tide set: rolling or dashing leaves a ring of frost that slows every enemy inside it
export function frostRing(x, y) {
  if (!setActive('tide')) return;
  const R = EL.set.tideRing;
  ring(x, y, 20, R.radius, 0.5, '90,200,255');
  for (const e of targets()) if (dist(e, { x, y }) < R.radius + e.r) slow(e, R.slow, R.time);
}

// on death: Ember set blast, Thorn set heal (called by combat's kill())
export function onElementKill(e) {
  if (setActive('ember') && e.burn?.t > 0) {
    const B = EL.set.emberBlast;
    ring(e.x, e.y, 10, B.radius, 0.35, '255,150,60');
    for (const o of targets()) if (o !== e && dist(o, e) < B.radius + o.r) hurtEnemy(o, G.P.atk * B.mult, true);
  }
  if (setActive('thorn') && e.poison?.t > 0) G.P.hp = Math.min(G.P.maxHp, G.P.hp + EL.set.thornHeal);
}
