// Upgrade picks and their effects. P.up counts how many times each upgrade was taken;
// mods() turns those counts into the multipliers the combat/movement code reads (keep data/upgrades.ts descs in sync).
import { G } from '../world/state.ts';
import { UPGRADES } from '../data/upgrades.ts';
import { emit } from '../core/events.ts';

const n = id => G.P.up?.[id] ?? 0;

export function mods() {
  return {
    atkBonus: 2 * n('keenEdge'),
    attackCd: 0.9 ** n('quickSlash'),
    skillDmg: 1 + 0.2 * n('leapPower'),
    skillCd: 0.85 ** n('leapCharge'),
    lifesteal: 1 * n('lifesteal'),
    speed: 1 + 0.06 * n('swift'),
    crit: 0.06 * n('critical'),
    invBonus: 0.1 * n('secondWind'),
  };
}

export function applyUpgrade(id) {
  const P = G.P;
  P.up[id] = n(id) + 1;
  if (id === 'vitality') { P.maxHp += 15; P.hp = P.maxHp; }
  P.pendingUpgrades = Math.max(0, P.pendingUpgrades - 1);
  emit('upgradePicked', id);
}
