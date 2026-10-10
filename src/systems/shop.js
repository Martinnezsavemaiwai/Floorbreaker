// Buying from the town merchant and drinking potions. Prices and items live in data/shop.ts.
import { G } from '../world/state.ts';
import { SHOP, MERCHANT_REACH, POTION_HEAL } from '../data/shop.ts';
import { dist } from '../core/math.ts';
import { emit } from '../core/events.ts';
import { text, burst } from './fx.js';

export const nearMerchant = () => !!G.P && !!G.L?.merchant && dist(G.P, G.L.merchant) < MERCHANT_REACH;
export const price = id => SHOP[id].price(G.P.scrolls);
export const canBuy = id => G.P.col >= price(id) && (id !== 'potion' || G.P.potions < SHOP.potion.max);

export function buy(id) {
  if (!canBuy(id)) return false;
  const P = G.P;
  P.col -= price(id);
  if (id === 'potion') P.potions++;
  else { P.scrolls++; P.pendingUpgrades++; } // the play scene opens the picker once the shop closes
  emit('bought', id);
  return true;
}

export function drinkPotion() {
  const P = G.P;
  if (!P || G.run.over || P.potions <= 0 || P.hp >= P.maxHp) return;
  P.potions--;
  const heal = Math.round(P.maxHp * POTION_HEAL);
  P.hp = Math.min(P.maxHp, P.hp + heal);
  text(P.x, P.y - 30, '+' + heal, '#7dff8a', true); burst(P.x, P.y, 16, '#7dff8a', 160, 0.6, 4, false);
  emit('potion');
}
