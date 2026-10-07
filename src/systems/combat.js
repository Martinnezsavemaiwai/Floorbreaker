// Damage, death, XP. Sounds, music and result screens hang off the events emitted here.
import { G, rage } from '../world/state.ts';
import { ROOM, WORLD } from '../world/constants.ts';
import { knock } from '../world/physics.ts';
import { makeMob, isLastFloor } from '../world/floor.ts';
import { PLAYER } from '../data/player.ts';
import { BOSS_RULES } from '../data/bosses.ts';
import { clamp } from '../core/math.ts';
import { emit } from '../core/events.ts';
import { settings } from '../core/save.ts';
import { text, burst, ring, kick } from './fx.js';
import { mods } from './upgrades.js';

export const targets = () => [...G.mobs, G.boss].filter(e => e.hp > 0 && (e !== G.boss || G.boss.awake));

export function gainCol(n, at) { G.P.col += n; text(at.x + 14, at.y - 34, `+${n} Col`, '#ffe14d'); }
export function gainXp(n) {
  const P = G.P;
  P.xp += n; text(P.x, P.y - 30, '+' + n + ' XP', '#7fd4ff');
  while (P.xp >= PLAYER.xpToNext(P.lv)) {
    P.xp -= PLAYER.xpToNext(P.lv); P.lv++; P.pendingUpgrades++; P.maxHp += PLAYER.perLevel.hp; P.atk += PLAYER.perLevel.atk; P.hp = P.maxHp;
    text(P.x, P.y - 50, 'LEVEL UP!', '#ffd54a', true); emit('levelUp');
    burst(P.x, P.y, 30, '#ffd54a', 220, 0.8, 5, true); ring(P.x, P.y, 10, 90, 0.5, '255,213,74');
  }
}

export function hurtEnemy(e, d, big, crit = false) {
  if (e.hp <= 0) return;
  const { P, F, boss, run } = G;
  const guarded = e !== boss && e.def.armor && e.armorT <= 0;
  if (guarded && big) { // a heavy hit shatters the guard: full damage now and for the next few seconds
    e.armorT = e.def.armor.regen; text(e.x, e.y - e.r - 26, 'BREAK!', '#9fd8ff', true);
    ring(e.x, e.y, 10, 60, 0.3, '159,216,255'); emit('guardBreak');
  } else if (guarded) { d = Math.max(1, Math.round(d * 0.25)); text(e.x, e.y - e.r - 26, 'GUARD', '#c8d0dc'); }
  e.hp -= d; e.hurt = 0.1; text(e.x, e.y - e.r - (e.z || 0), crit ? d + '!' : d, crit ? '#ffe14d' : big ? '#ffb347' : '#fff', big || crit); emit('hit', { big });
  const steal = mods().lifesteal; // every enemy hit comes from the player
  if (steal) P.hp = Math.min(P.maxHp, P.hp + steal);
  burst(e.x, e.y - (e.z || 0), big ? 14 : 7, '#fff3c4', 320, 0.25, 3, false);
  kick(big ? 0.09 : 0.045, big ? 6 : 2);
  if (e !== boss) { knock(e, P, e.def.knockback[big ? 'heavy' : 'light']); if (big) e.wind = 0; } // heavy hits stagger a winding-up mob
  else if (F.boss.summon && !boss.summoned && rage()) {
    boss.summoned = true; emit('bossSummon');
    text(boss.x, boss.y - 130, `${F.boss.name.split(' ')[0]} เรียกลูกน้อง!`, '#ff7043', true);
    for (let i = 0; i < F.boss.summon; i++) {
      const m = makeMob(boss.x + (i ? 90 : -90), boss.y + 90, true);
      m.x = clamp(m.x, ROOM.x0 + 20, WORLD.w - 20); G.mobs.push(m); ring(m.x, m.y, 5, 60, 0.4, '255,80,200');
    }
  }
  if (e.hp > 0) return;
  if (e === boss) {
    G.doorClosed = false; kick(0.35, 20); run.kills++;
    burst(e.x, e.y, 90, '#8fe3ff', 420, 1.6, 12, true); burst(e.x, e.y, 40, '#ffd54a', 300, 1.4, 8, true);
    ring(e.x, e.y, 20, 260, 0.8, '143,227,255');
    for (const m of G.mobs) if (m.summoned && m.hp > 0) { m.hp = 0; m.dead = Infinity; burst(m.x, m.y, 20, '#8fe3ff', 260, 0.9, 8, true); }
    emit('bossDeath');
    gainXp(F.mob.xp * BOSS_RULES.xpMult); gainCol(F.mob.col * BOSS_RULES.xpMult, e);
    if (!isLastFloor()) { G.portal = { x: boss.x, y: boss.y }; emit('portalOpen'); }
    else { run.over = 'win'; emit('runOver', { cleared: true }); }
  } else {
    e.dead = e.summoned ? Infinity : e.def.respawn; gainXp(e.def.xp); gainCol(e.def.col, e); emit('mobDeath'); run.kills++;
    burst(e.x, e.y, 26, '#8fe3ff', 260, 0.9, 9, true); ring(e.x, e.y, 5, 50, 0.3, '143,227,255');
  }
}

export function hurtPlayer(d, from) {
  const { P, run } = G;
  if (run.over) return;
  if (P.dash > 0 || P.roll > 0) { text(P.x, P.y - 24, 'DODGE', '#7fd4ff'); emit('dodge'); return; } // Sword Skill dash and the roll = i-frames
  if (P.inv > 0) return; // brief invulnerability after a hit, so a mob crowd can't chain-stun you
  d = Math.max(1, Math.round(d * settings.assistDamage)); // assist mode: take less damage
  const heavy = d >= PLAYER.knockback.heavyFrom;
  P.hp -= d; P.hurt = 0.25; P.inv = PLAYER.invTime + mods().invBonus; text(P.x, P.y - 20, '-' + d, '#ff5252', heavy); emit('playerHurt');
  if (from) knock(P, from, PLAYER.knockback[heavy ? 'heavy' : 'light']);
  burst(P.x, P.y, 10, '#ff5252', 220, 0.35, 4, false); kick(0.05, d >= 20 ? 10 : 5);
  if (P.hp <= 0) {
    P.hp = 0; run.over = 'dead'; emit('playerDeath');
    burst(P.x, P.y, 40, '#8fe3ff', 260, 1.4, 9, true);
    emit('runOver', { cleared: false });
  }
}
