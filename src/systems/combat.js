// Damage, death, XP. Sounds, music and result screens hang off the events emitted here.
import { G, rage } from '../world/state.ts';
import { tr } from '../core/i18n.ts';
import { knock, hitWall } from '../world/physics.ts';
import { makeMob } from '../world/floor.ts';
import { isFinalFloor, ELITE_RULES } from '../data/run.ts';
import { PLAYER } from '../data/player.ts';
import { BOSS_RULES, ARENA } from '../data/bosses.ts';
import { clamp } from '../core/math.ts';
import { emit } from '../core/events.ts';
import { settings } from '../core/save.ts';
import { clock } from '../core/app.ts';
import { counter } from './player.js';
import { text, burst, ring, kick, dropLoot } from './fx.js';
import { mods } from './upgrades.js';
import { bossReward } from './build.js';
import { onSproutKilled } from './arena.js';
import { applyElements, onElementKill } from './elements.js';

export const targets = () => [...G.mobs, G.boss].filter(e => e.hp > 0 && (e !== G.boss || G.boss.awake));

export function gainCol(n, at) { G.P.col += n; text(at.x + 14, at.y - 34, `+${n} Gold`, '#ffe14d'); }
export function gainXp(n) {
  const P = G.P;
  P.xp += n; text(P.x, P.y - 30, '+' + n + ' XP', '#7fd4ff');
  while (P.xp >= PLAYER.xpToNext(P.lv)) {
    P.xp -= PLAYER.xpToNext(P.lv); P.lv++; P.pendingUpgrades++; P.maxHp += PLAYER.perLevel.hp; P.atk += PLAYER.perLevel.atk; P.hp = P.maxHp;
    text(P.x, P.y - 50, 'LEVEL UP!', '#ffd54a', true); emit('levelUp');
    burst(P.x, P.y, 30, '#ffd54a', 220, 0.8, 5, true); ring(P.x, P.y, 10, 90, 0.5, '255,213,74');
  }
}

export function hurtEnemy(e, d, big, crit = false, art = null) {
  if (e.hp <= 0) return;
  const { P, F, boss, run } = G;
  if (e === boss && e.stun > 0) d = Math.round(d * ARENA.pillars.stunDmg); // dazed by a pillar (DoT goes through dot(), not here)
  const guarded = e !== boss && e.def.armor && e.armorT <= 0;
  if (guarded && big) { // a heavy hit shatters the guard: full damage now and for the next few seconds
    e.armorT = e.def.armor.regen; text(e.x, e.y - e.r - 26, 'BREAK!', '#9fd8ff', true);
    ring(e.x, e.y, 10, 60, 0.3, '159,216,255'); emit('guardBreak');
  } else if (guarded) { d = Math.max(1, Math.round(d * 0.25)); text(e.x, e.y - e.r - 26, 'GUARD', '#c8d0dc'); }
  e.hp -= d; e.hurt = 0.1; e.sinceHit = 0; text(e.x, e.y - e.r - (e.z || 0), crit ? d + '!' : d, crit ? '#ffe14d' : big ? '#ffb347' : '#fff', big || crit); emit('hit', { big });
  const steal = mods().lifesteal; // every enemy hit comes from the player
  if (steal && !e.sprout) P.hp = Math.min(P.maxHp, P.hp + steal);
  burst(e.x, e.y - (e.z || 0), big ? 14 : 7, '#fff3c4', 320, 0.25, 3, false);
  kick(big ? 0.09 : 0.045, big ? 6 : 2);
  if (e !== boss) { knock(e, P, e.def.knockback[big ? 'heavy' : 'light']); if (big) e.wind = 0; } // heavy hits stagger a winding-up mob
  else if (F.boss.summon && !boss.summoned && rage()) {
    boss.summoned = true; emit('bossSummon');
    text(boss.x, boss.y - 130, F.boss.name.split(' ')[0] + tr(' เรียกพวกมาช่วย!', ' calls for backup!'), '#ff7043', true);
    for (let i = 0; i < F.boss.summon; i++) {
      const m = makeMob(boss.x + (i ? 90 : -90), boss.y + 90, true);
      m.x = clamp(m.x, G.L.roomX + 60, G.L.w - 20); if (hitWall(m)) { m.x = boss.x; m.y = boss.y; } // spot inside a wall (pillar): spawn on the boss instead
      G.mobs.push(m); ring(m.x, m.y, 5, 60, 0.4, '255,80,200');
    }
  }
  if (art) applyElements(e, art, d); // only Art hits carry elements (chains, bolts and blasts pass no art)
  if (e.hp <= 0) kill(e);
}

// Death of a mob or the boss: shared by hits and damage-over-time
export function kill(e) {
  const { F, boss, run } = G;
  // run.over: the player died earlier this frame (a shot lands before the boss's burn ticks); no rewards, no win
  if (e.dead === Infinity || run.over) return;
  if (!e.sprout) onElementKill(e); // sprouts are props: no Ember blast, no Thorn heal
  if (e === boss) {
    e.dead = Infinity;
    G.doorClosed = false; kick(0.6, 20); run.kills++; run.bosses++;
    burst(e.x, e.y, 90, '#8fe3ff', 420, 1.6, 12, true); burst(e.x, e.y, 40, '#ffd54a', 300, 1.4, 8, true);
    ring(e.x, e.y, 20, 260, 0.8, '143,227,255');
    for (const m of G.mobs) if ((m.summoned || m.sprout) && m.hp > 0) { m.hp = 0; m.dead = Infinity; burst(m.x, m.y, 20, '#8fe3ff', 260, 0.9, 8, true); }
    emit('bossDeath');
    if (!isFinalFloor(G.floorIdx)) bossReward();
    gainXp(F.mob.xp * BOSS_RULES.xpMult); gainCol(F.mob.col * BOSS_RULES.xpMult, e); dropLoot(e.x, e.y, 18, 90);
    if (!isFinalFloor(G.floorIdx)) { G.portal = { x: boss.x, y: boss.y, wait: BOSS_RULES.portalDelay, armed: false }; emit('portalOpen'); }
    else { G.P.slowmo = 0; clock.scale = settings.assistSpeed; run.over = 'win'; emit('runOver', { cleared: true }); }
  } else if (e.sprout) { // cut down: lifts the fog, pays nothing
    e.dead = Infinity; onSproutKilled();
    burst(e.x, e.y, 18, '#78c850', 240, 0.6, 7, false); ring(e.x, e.y, 5, 60, 0.3, '120,220,90');
  } else {
    e.dead = Infinity; gainXp(e.def.xp); gainCol(e.def.col, e); dropLoot(e.x, e.y, e.def.col, e.def.xp); emit('mobDeath', { x: e.x, y: e.y }); run.kills++;
    burst(e.x, e.y, 26, '#8fe3ff', 260, 0.9, 9, true); ring(e.x, e.y, 5, 50, 0.3, '143,227,255');
    if (e.mod === 'split') { // the elite falls apart into two smaller copies
      const R = ELITE_RULES, kid = { ...e.def, hp: Math.round(e.maxHp * R.splitHp), scale: (e.def.scale ?? 1) * R.splitScale, radius: Math.round(e.def.radius * R.splitScale), armor: undefined };
      for (const side of [-1, 1]) {
        const k = makeMob(e.x, e.y, false, kid), L = G.L;
        k.x = clamp(e.x + side * 30, L.townX + k.r, L.roomX - k.r);
        if (hitWall(k)) k.x = e.x; // no room beside it: spawn on top of the elite instead of inside a wall
        k.aggro = true; k.elite = false; k.sinceHit = 0; G.mobs.push(k);
        ring(k.x, k.y, 5, 40, 0.3, '166,136,255');
      }
    }
  }
}

// Damage from burn/poison: a number pops, no knockback, no hit-stop, no elements
export function dot(e, n) {
  if (e.hp <= 0) return;
  e.hp -= n; text(e.x + 10, e.y - e.r - 16, n, e.poison?.t > 0 ? '#78ff96' : '#ff963c');
  if (e.hp <= 0) kill(e);
}

export function hurtPlayer(d, from, env) { // env: environmental damage (flood), can't be parried
  const { P, run } = G;
  if (run.over) return;
  if ((P.dash > 0 && P.dashArt === 'sonicLeap') || P.roll > 0) { text(P.x, P.y - 24, 'DODGE', '#7fd4ff'); emit('dodge'); return; } // Blade Art dash and the roll = i-frames
  if (P.parry > 0 && !env) { counter(); return; }
  if (P.inv > 0 && !env) return; // flood ticks neither respect nor grant i-frames; brief invulnerability after a hit, so a mob crowd can't chain-stun you
  d = Math.max(1, Math.round(d * settings.assistDamage)); // assist mode: take less damage
  const heavy = d >= PLAYER.knockback.heavyFrom;
  P.hp -= d; P.hurt = 0.25; if (!env) P.inv = PLAYER.invTime + mods().invBonus; text(P.x, P.y - 20, '-' + d, '#ff5252', heavy); emit('playerHurt');
  if (from) knock(P, from, PLAYER.knockback[heavy ? 'heavy' : 'light']);
  burst(P.x, P.y, 10, '#ff5252', 220, 0.35, 4, false); if (!env) kick(0.05, d >= 20 ? 10 : 5);
  if (P.hp <= 0) {
    P.hp = 0; P.slowmo = 0; clock.scale = settings.assistSpeed; run.over = 'dead'; emit('playerDeath');
    burst(P.x, P.y, 40, '#8fe3ff', 260, 1.4, 9, true);
    emit('runOver', { cleared: false });
  }
}
