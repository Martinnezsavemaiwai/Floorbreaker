// Shrine offers: each has a price; a shrine grants one, then goes dark. Rewards that need a choice (a mod, an
// evolution) go through the build pick scene via G.rewards.
import { G } from '../world/state.ts';
import { SHRINE_RULES as S } from '../data/run.ts';
import { SHOP } from '../data/shop.ts';
import { dist } from '../core/math.ts';
import { emit } from '../core/events.ts';
import { modCards, evolveCards } from './build.js';
import { gainCol } from './combat.js';
import { ring } from './fx.js';

export const nearShrine = () => !!G.P && !!G.L?.shrine && !G.room?.shrineUsed && dist(G.P, G.L.shrine) < S.reach;
export function canTake(id) {
  const P = G.P, R = G.room;
  if (!R || R.type !== 'shrine' || R.shrineUsed || !R.offers?.includes(id)) return false;
  if (id === 'blood') return modCards().length > 0;
  if (id === 'gold') return P.col >= S.goldCost && evolveCards().length > 0;
  if (id === 'potion') return P.potions > 0;
  return true; // curse
}
export function take(id) {
  if (!canTake(id)) return false;
  const P = G.P;
  if (id === 'blood') { P.maxHp = Math.round(P.maxHp * (1 - S.bloodHp)); P.hp = P.lag = Math.min(P.hp, P.maxHp); G.rewards.push('mod'); }
  else if (id === 'gold') { P.col -= S.goldCost; G.rewards.push('evolve'); }
  else if (id === 'curse') { G.run.curse = (G.run.curse ?? 0) + S.curseFloors; gainCol(S.curseGold, P); if (P.potions < SHOP.potion.max) P.potions++; else gainCol(SHOP.potion.price(), P); }
  else if (id === 'potion') { P.potions--; P.maxHp += S.potionMaxHp; P.hp = P.lag = P.maxHp; }
  G.room.shrineUsed = true; ring(G.L.shrine.x, G.L.shrine.y, 10, 90, 0.5, '201,182,255'); emit('shrineTaken', id);
  return true;
}
