// The in-run build: which Arts sit in slots 2-3, the element mods on each Art, which Arts evolved, and the cards
// that change them. Three kinds of pick: a level-up (mods + stat upgrades), a new Art (elite rooms) and an
// evolution shard (bosses). Card rolls use the seeded rng; "is there a pick?" checks never touch it.
import { G } from '../world/state.ts';
import { ELEMENT_IDS, ELEMENTS, EL } from '../data/elements.ts';
import { SKILLS } from '../data/skills.ts';
import { UPGRADES } from '../data/upgrades.ts';
import { SHOP } from '../data/shop.ts';
import { rng } from '../core/rng.ts';
import { emit } from '../core/events.ts';
import { isUnlocked } from './meta.js';
import { applyUpgrade } from './upgrades.js';
import { text, burst, kick } from './fx.js';
import { gainCol } from './combat.js';
import { elementCount, setActive } from './elements.js';

const MAX_MODS = 2, OFFER = 3, MOD_WEIGHT = 2, STAT_WEIGHT = 1, SHARD_GOLD = 100;

export const ownedArts = () => ['blade', ...G.P.skills.filter(Boolean)];
const mods = art => G.P.mods[art] ?? [];
export const artElements = art => [...mods(art)];
// Most mods wins; a tie goes to the element gained first (elements never gained sort last, in ELEMENT_IDS order)
const topElement = (count) => {
  const order = G.P.modOrder ?? [], rank = el => (order.includes(el) ? order.indexOf(el) : order.length);
  const best = ELEMENT_IDS.filter(el => count(el) > 0).sort((a, b) => count(b) - count(a) || rank(a) - rank(b));
  return best[0] ?? null;
};
export const dominantElement = () => topElement(elementCount);
export const artColor = art => { const els = mods(art), el = topElement(e => els.filter(x => x === e).length); return el ? ELEMENTS[el].color : null; };
export const setProgress = () => ELEMENT_IDS.map(el => ({ el, n: elementCount(el), need: EL.set.need, active: setActive(el) }));
export const freeModSlots = () => ownedArts().reduce((n, a) => n + MAX_MODS - mods(a).length, 0);
export const modCards = () => ownedArts().filter(a => mods(a).length < MAX_MODS)
  .flatMap(art => ELEMENT_IDS.map(el => ({ kind: 'mod', art, el })));
// A chosen mod: the element first, then an Art that still has room for it
export const elementCards = () => ELEMENT_IDS.filter(el => modCards().some(c => c.el === el)).map(el => ({ kind: 'element', el }));
export const statCards = () => Object.keys(UPGRADES).filter(id => (G.P.up[id] ?? 0) < UPGRADES[id].max).map(id => ({ kind: 'stat', id }));

// n distinct cards, weighted, drawn with the seeded rng
function draw(pool, n) {
  const out = [], left = [...pool];
  while (out.length < n && left.length) {
    let x = rng() * left.reduce((s, p) => s + p.w, 0), k = 0;
    while ((x -= left[k].w) > 0) k++;
    out.push(left.splice(k, 1)[0].card);
  }
  return out;
}
export const rollLevelCards = () => draw([...modCards().map(card => ({ card, w: MOD_WEIGHT })), ...statCards().map(card => ({ card, w: STAT_WEIGHT }))], OFFER);
export const rollArtCards = () => {
  const fresh = Object.keys(SKILLS).filter(id => SKILLS[id].pool !== 'fixed' && isUnlocked(id) && !G.P.skills.includes(id));
  return fresh.length ? draw(fresh.map(id => ({ card: { kind: 'art', id }, w: 1 })), OFFER) : draw(statCards().map(card => ({ card, w: 1 })), OFFER);
};
export const evolveCards = () => ownedArts().filter(a => !G.P.evolved.includes(a)).map(art => ({ kind: 'evolve', art }));

export const hasLevelPick = () => !!G.P && G.P.pendingUpgrades > 0 && (modCards().length + statCards().length) > 0;
export const nextPick = () => (G.rewards.length ? G.rewards[0] : hasLevelPick() ? 'level' : null);
// A reward with nothing to offer (no new Art, every upgrade maxed) shows a lone skip so the reward still drains
export const cardsFor = kind => {
  if (kind === 'level') return rollLevelCards();
  const cards = kind === 'art' ? rollArtCards() : kind === 'mod' ? elementCards() : evolveCards();
  return cards.length ? cards : [{ kind: 'skip' }];
};

export function evolve(art) {
  if (G.P.evolved.includes(art)) return;
  G.P.evolved.push(art); emit('artEvolved', art);
  const P = G.P; text(P.x, P.y - 60, 'EVOLVED!', '#ffe9a8', true); burst(P.x, P.y, 40, artColor(art) ?? '#fff6e2', 260, 0.9, 6, true); kick(0.5, 8);
}

// Apply a picked card. Returns follow-up cards when the pick needs a second choice (which slot to replace), else null.
// A level pick spends one pending level; a reward pick removes its entry from G.rewards.
export function applyCard(card, kind) {
  const P = G.P;
  if (card.kind === 'art') {
    const free = P.skills.indexOf(null, 1);
    if (free < 0) return [...[1, 2].map(slot => ({ kind: 'replace', id: card.id, slot })), { kind: 'skip' }];
    P.skills[free] = card.id;
  } else if (card.kind === 'replace') {
    delete P.mods[P.skills[card.slot]]; P.evolved = P.evolved.filter(a => a !== P.skills[card.slot]);
    P.skills[card.slot] = card.id; P.skillCd[card.slot] = 0;
  } else if (card.kind === 'element') return modCards().filter(c => c.el === card.el); // second step: which Art
  else if (card.kind === 'mod') {
    const before = elementCount(card.el);
    P.mods[card.art] = [...mods(card.art), card.el];
    (P.modOrder ??= []).includes(card.el) || P.modOrder.push(card.el);
    if (before < EL.set.need && elementCount(card.el) >= EL.set.need) emit('setBonus', card.el);
    if (P.mods[card.art].length >= MAX_MODS) evolve(card.art);
  } else if (card.kind === 'evolve') evolve(card.art);
  else if (card.kind === 'stat') { const left = P.pendingUpgrades; applyUpgrade(card.id); P.pendingUpgrades = left; } // applyUpgrade spends a level itself; undone here, spent below for level picks only
  if (kind === 'level') P.pendingUpgrades = Math.max(0, P.pendingUpgrades - 1);
  else G.rewards.shift();
  return null;
}

// A non-final boss: full heal, then an evolution pick, or Potion + Gold when nothing is left to evolve
export function bossReward() {
  const P = G.P;
  P.hp = P.lag = P.maxHp;
  if (evolveCards().length) G.rewards.push('evolve');
  else { if (P.potions < SHOP.potion.max) P.potions++; else gainCol(SHOP.potion.price(), P); gainCol(SHARD_GOLD, P); }
}
