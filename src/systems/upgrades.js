// Upgrade picks and their effects. P.up counts how many times each upgrade was taken;
// mods() turns those counts into the multipliers the combat/movement code reads (keep data/upgrades.ts descs in sync).
import { G } from '../world/state.ts';
import { UPGRADES, OFFER_SIZE } from '../data/upgrades.ts';
import { rng } from '../core/rng.ts';
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

const available = () => Object.keys(UPGRADES).filter(id => n(id) < UPGRADES[id].max);

// 3 different upgrades that aren't maxed yet (seeded, so test runs are reproducible)
export function rollOffer() {
  const pool = available();
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  return pool.slice(0, OFFER_SIZE);
}

export function applyUpgrade(id) {
  const P = G.P;
  P.up[id] = n(id) + 1;
  if (id === 'vitality') { P.maxHp += 15; P.hp = P.maxHp; }
  P.pendingUpgrades = Math.max(0, P.pendingUpgrades - 1);
  emit('upgradePicked', id);
}

// Every level-up earns one pick; the play scene opens the picker when one is pending
// (pure check: must not consume the gameplay RNG, it runs every step)
export const hasPendingUpgrade = () => !!G.P && G.P.pendingUpgrades > 0 && available().length > 0;
