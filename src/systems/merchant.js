// The merchant (town) and the wanderer (shop room): faces you, waves once, and speaks now and then.
// Cosmetic only: lines vary with Math.random, never the seeded rng().
import { G } from '../world/state.ts';
import { kindOf, actOf } from '../data/run.ts';
import { SHOP } from '../data/shop.ts';
import { pickLine } from '../data/dialogue.ts';
import { on } from '../core/events.ts';
import { tr } from '../core/i18n.ts';
import { shopItems, price } from './shop.js';

const SEE = 220, HOLD = 1.5, // no speech while the floor toast is up
  WAVE_AT = 160, SHOWN = 3, QUIET = 9, WAVE_TIME = 0.6;
let toastLeft = 0; // seconds of queued banner still on screen; the bubble would sit under it
on('toast', sec => { toastLeft += sec; });
on('toastsCleared', () => { toastLeft = 0; });
export const toastHeld = () => toastLeft > 0;
// one NPC bubble on screen at a time: ambient speech waits while any bubble is showing
export const bubbleUp = () => !!(G.npc?.merchant?.bubble || G.npc?.folk?.some(f => f.bubble));
export const newMerchantState = () => ({ face: 0, waved: false, wave: 0, bubble: null, quiet: 0, greeted: false, age: 0 });
const who = () => (G.room?.type === 'shop' ? 'wanderer' : 'merchant');

export function merchantCtx(event) {
  const M = G.npc.merchant, P = G.P, town = kindOf(G.floorIdx) === 'town';
  return { act: actOf(G.floorIdx), event,
    firstVisit: town && G.floorIdx === 0 && !M.greeted,
    lowHp: P.hp < P.maxHp * 0.4,
    afterBoss: town && actOf(G.floorIdx) >= 1 && !M.greeted,
    broke: !shopItems().some(id => P.col >= price(id)),
    potionsFull: P.potions >= SHOP.potion.max };
}
export const say = text => { const M = G.npc?.merchant; if (M) { M.bubble = { text, t: SHOWN }; M.quiet = QUIET; } };
// A line for an event (open, bought, farewell...); the wanderer's first line is always its greeting
export const lineFor = event => pickLine(who(), merchantCtx(event));
export const sayEvent = event => { for (const f of G.npc?.folk ?? []) f.bubble = null; say(lineFor(event)); };
export const potionsFullText = () => { const l = pickLine('merchant', { act: actOf(G.floorIdx), potionsFull: true }); return tr(l.th, l.en); };
export const shopText = event => { const l = lineFor(event); return tr(l.th, l.en); };

export function updateMerchant(dt) {
  toastLeft = Math.max(0, toastLeft - dt);
  const M = G.npc?.merchant, m = G.L?.merchant;
  if (!M || !m) return;
  const dx = G.P.x - m.x, dy = G.P.y - m.y, d = Math.hypot(dx, dy);
  M.age += dt; M.wave = Math.max(0, M.wave - dt); M.quiet -= dt;
  if (M.bubble && (M.bubble.t -= dt) <= 0) M.bubble = null;
  if (d < SEE) M.face = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 3 : 2) : (dy > 0 ? 0 : 1);
  if (d >= SEE || M.age < HOLD || toastLeft > 0 || bubbleUp()) return;
  const first = !M.waved && d < WAVE_AT;
  if (first) { M.waved = true; M.wave = WAVE_TIME; }
  if (first || M.quiet <= 0) {
    say(pickLine(who(), merchantCtx(who() === 'wanderer' && !M.greeted ? 'greet' : undefined)));
    M.greeted = true;
  }
}
