// NPC dialogue: which line a situation picks, and that every line exists in both languages.
import { describe, it, expect } from 'vitest';
import { pickLine, LINES } from '../src/data/dialogue.ts';

const all = (x: unknown): { th: string; en: string }[] => Array.isArray(x) ? x.flatMap(all) : (x && typeof x === 'object' && 'th' in (x as object)) ? [x as any] : Object.values(x as object).flatMap(all);

describe('dialogue', () => {
  it('every line has Thai and English, no em dashes, no " · " joins', () => {
    for (const l of all(LINES)) {
      expect(l.th.length && l.en.length).toBeTruthy();
      expect(l.th + l.en).not.toMatch(/—| · /);
    }
  });
  it('merchant situations follow the priority order', () => {
    const m = (c: object) => pickLine('merchant', { act: 1, ...c }, () => 0).en;
    expect(m({ firstVisit: true, lowHp: true })).toBe(LINES.merchant.firstVisit[0].en);
    expect(m({ lowHp: true, broke: true })).toBe(LINES.merchant.lowHp[0].en);
    expect(m({ afterBoss: true, potionsFull: true })).toBe(LINES.merchant.afterBoss[0].en);
    expect(m({ broke: true, potionsFull: true })).toBe(LINES.merchant.broke[0].en);
    expect(m({ potionsFull: true })).toBe(LINES.merchant.potionsFull[0].en);
    expect(m({})).toBe(LINES.merchant.generic[1][0].en);
  });
  it('events win over situations; the wanderer and townsfolk use their own pools', () => {
    expect(pickLine('merchant', { act: 0, lowHp: true, event: 'bought' }, () => 0).en).toBe(LINES.merchant.bought[0].en);
    expect(pickLine('wanderer', { act: 2, event: 'boughtMod' }, () => 0).en).toBe(LINES.wanderer.boughtMod[0].en);
    expect(LINES.folk[3].map(l => l.en)).toContain(pickLine('folk', { act: 3 }, () => 0.99).en);
  });
  it('an event the table lacks falls through to situation/generic without throwing', () => {
    const line = pickLine('merchant', { act: 0, event: 'boughtMod' } as any, () => 0);
    expect(line.en).toBe(LINES.merchant.generic[0][0].en);
    expect(() => pickLine('merchant', { act: 0, lowHp: true, event: 'boughtMod' } as any, () => 0)).not.toThrow();
    expect(pickLine('merchant', { act: 0, lowHp: true, event: 'boughtMod' } as any, () => 0).en).toBe(LINES.merchant.lowHp[0].en);
  });
  it('act is clamped to the pool range for merchant generic and folk', () => {
    expect(pickLine('merchant', { act: 99 }, () => 0).en).toBe(LINES.merchant.generic[3][0].en);
    expect(pickLine('merchant', { act: -1 }, () => 0).en).toBe(LINES.merchant.generic[0][0].en);
    expect(pickLine('folk', { act: 99 }, () => 0).en).toBe(LINES.folk[3][0].en);
    expect(pickLine('folk', { act: -1 }, () => 0).en).toBe(LINES.folk[0][0].en);
  });
});

import { G, startRun } from './harness.ts';
import { pickPreset, ROOM_PRESETS } from '../src/data/run.ts';
import { hitWall } from '../src/world/physics.ts';
import { loadFloor } from '../src/world/floor.ts';

// Grid walk (20 px cells, player radius) from a to b avoiding walls: true if reachable
function reachable(a: { x: number; y: number }, b: { x: number; y: number }) {
  const S = 20, W = Math.ceil(G.L!.w / S), H = Math.ceil(G.L!.h / S), seen = new Set<number>(), q = [[Math.round(a.x / S), Math.round(a.y / S)]];
  const free = (cx: number, cy: number) => cx >= 0 && cy >= 0 && cx < W && cy < H && !hitWall({ x: cx * S, y: cy * S, r: 14 });
  while (q.length) {
    const [cx, cy] = q.shift()!; const k = cy * W + cx;
    if (seen.has(k) || !free(cx, cy)) continue; seen.add(k);
    if (Math.hypot(cx * S - b.x, cy * S - b.y) < S * 1.5) return true;
    q.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
  }
  return false;
}

describe('town layout', () => {
  for (const i of [0, 5, 10, 15]) it(`floor ${i + 1}: props are solid, the merchant and every door are reachable from the start`, () => {
    startRun(1); loadFloor(i);
    expect(G.L!.props!.length).toBeGreaterThan(6);
    const stall = G.L!.props!.find(p => p.kind === 'stall')!;
    expect(hitWall({ x: stall.x + stall.w / 2, y: stall.y + stall.h / 2, r: 4 })).toBe(true);
    const start = G.L!.start, m = G.L!.merchant!;
    expect(reachable(start, { x: m.x, y: m.y + 30 })).toBe(true);
    for (const d of G.doors) expect(reachable(start, { x: d.x + d.w / 2 - 30, y: d.y + d.h / 2 })).toBe(true);
    expect(hitWall({ x: start.x, y: start.y, r: 14 })).toBe(false);
    for (const p of G.L!.props!.filter(q => q.solid)) expect(hitWall({ x: p.x + p.w / 2, y: p.y + p.h / 2, r: 2 }), p.kind).toBe(true);
  });
  it('the merchant front is reachable in every shop room preset', () => {
    const seen = new Set<number>();
    for (let seed = 1; seed <= 60; seed++) {
      startRun(seed); loadFloor(2, { type: 'shop', reward: null });
      seen.add(pickPreset(G.run!.seed, 2));
      const m = G.L!.merchant!;
      expect(reachable(G.L!.start, { x: m.x, y: m.y + 30 }), `seed ${seed}`).toBe(true);
    }
    expect(seen.size).toBe(ROOM_PRESETS.length);
  });
  it('the wandering shop has a cart behind the merchant', () => {
    startRun(1); loadFloor(2, { type: 'shop', reward: null });
    const m = G.L!.merchant!;
    expect(hitWall({ x: m.x, y: m.y - 50, r: 4 })).toBe(true);    // the cart
    expect(hitWall({ x: m.x, y: m.y + 30, r: 14 })).toBe(false);  // the player's spot in front
  });
});

const say = (M: { bubble: { text: unknown } | null }) => (M.bubble?.text as { en: string } | undefined)?.en;
import { SHOP } from '../src/data/shop.ts';
import { emit } from '../src/core/events.ts';
import { updateMerchant, merchantCtx, sayEvent } from '../src/systems/merchant.js';
describe('merchant behaviour', () => {
  it('faces the player within 220 px, waves once, and greets with the first-visit line', () => {
    startRun(1); loadFloor(0);
    const m = G.L!.merchant!; G.npc!.merchant!.age = 2; G.P!.x = m.x - 150; G.P!.y = m.y + 40;
    updateMerchant(0.1);
    const M = G.npc!.merchant!;
    expect(M.waved).toBe(true); expect(say(M)).toBe(LINES.merchant.firstVisit[0].en);
    G.P!.x = m.x - 400; for (let i = 0; i < 100; i++) updateMerchant(0.1); G.P!.x = m.x - 150; updateMerchant(0.1);
    expect(M.wave).toBe(0); // still the same visit: no second wave
  });
  it('low HP outranks the generic line once the quiet time has passed', () => {
    startRun(1); loadFloor(5); G.npc!.merchant!.greeted = true; G.npc!.merchant!.age = 2; G.P!.hp = 5;
    const m = G.L!.merchant!; G.P!.x = m.x; G.P!.y = m.y + 60;
    const M = G.npc!.merchant!, low = LINES.merchant.lowHp[0].en;
    updateMerchant(0.1); expect(say(M)).toBe(low);
    for (let i = 0; i < 32; i++) updateMerchant(0.1); // 3.3 s: bubble gone, still quiet
    expect(M.bubble).toBeNull();
    for (let i = 0; i < 59; i++) updateMerchant(0.1); // 9.2 s since the first line
    expect(say(M)).toBe(low); expect(M.bubble!.t).toBeGreaterThan(2.5);
  });
  it('does not speak during the first 1.5 s of a floor', () => {
    startRun(1); loadFloor(0); const m = G.L!.merchant!; G.P!.x = m.x; G.P!.y = m.y + 40;
    for (let i = 0; i < 14; i++) updateMerchant(0.1);
    expect(G.npc!.merchant!.bubble).toBeNull();
    for (let i = 0; i < 3; i++) updateMerchant(0.1);
    expect(say(G.npc!.merchant!)).toBe(LINES.merchant.firstVisit[0].en);
  });
  it('stays silent while a toast is up, then speaks', () => {
    startRun(1); loadFloor(0); const m = G.L!.merchant!, M = G.npc!.merchant!; G.P!.x = m.x; G.P!.y = m.y + 40;
    emit('toast', 3.2);
    for (let i = 0; i < 30; i++) updateMerchant(0.1);
    expect(M.bubble).toBeNull();
    for (let i = 0; i < 5; i++) updateMerchant(0.1);
    expect(say(M)).toBe(LINES.merchant.firstVisit[0].en);
  });
  it('clearing the toasts frees the merchant to speak after only the floor hold', () => {
    startRun(1); loadFloor(0); const m = G.L!.merchant!, M = G.npc!.merchant!; G.P!.x = m.x; G.P!.y = m.y + 40;
    emit('toast', 8); emit('toastsCleared');
    for (let i = 0; i < 16; i++) updateMerchant(0.1);
    expect(say(M)).toBe(LINES.merchant.firstVisit[0].en);
  });
  it('the wanderer greets first in a shop room', () => {
    startRun(1); loadFloor(2, { type: 'shop', reward: null }); const m = G.L!.merchant!, M = G.npc!.merchant!;
    M.age = 2; G.P!.x = m.x; G.P!.y = m.y + 40; updateMerchant(0.1);
    expect(say(M)).toBe(LINES.wanderer.greet[0].en);
  });
  it('merchantCtx: broke when nothing is affordable, potionsFull when the bag is full', () => {
    startRun(1); loadFloor(0); G.P!.col = 0; G.P!.potions = 0;
    expect(merchantCtx().broke).toBe(true); expect(merchantCtx().potionsFull).toBe(false);
    G.P!.col = 999; G.P!.potions = SHOP.potion.max;
    expect(merchantCtx().broke).toBe(false); expect(merchantCtx().potionsFull).toBe(true);
  });
  it('say() puts a farewell bubble up', () => {
    startRun(1); loadFloor(0); sayEvent('farewell');
    expect(LINES.merchant.farewell.map(l => l.en)).toContain(say(G.npc!.merchant!)!);
  });
});

import { updateFolk } from '../src/systems/townsfolk.js';
describe('townsfolk', () => {
  it('two per town, they wander for a minute without ending up inside a wall or out of bounds', () => {
    startRun(1); loadFloor(0);
    expect(G.npc!.folk!).toHaveLength(2);
    G.P!.x = 100; G.P!.y = 700; // far away
    const start = G.npc!.folk!.map(f => ({ x: f.x, y: f.y })); let moved = false;
    for (let i = 0; i < 60 * 60; i++) { updateFolk(1 / 60); moved ||= G.npc!.folk!.some((f, k) => f.x !== start[k].x || f.y !== start[k].y); }
    expect(moved).toBe(true);
    for (const f of G.npc!.folk!) {
      expect(hitWall({ x: f.x, y: f.y, r: 10 })).toBe(false);
      expect(f.x).toBeGreaterThan(0); expect(f.x).toBeLessThan(G.L!.w); expect(f.y).toBeGreaterThan(0); expect(f.y).toBeLessThan(G.L!.h);
    }
  });
  it('one walks up to the player: it stops, faces them and says one line per visit', () => {
    startRun(1); loadFloor(10);
    const f = G.npc!.folk![0]; G.P!.x = f.x + 60; G.P!.y = f.y;
    updateFolk(0.1);
    expect(f.bubble?.text).toBeTruthy(); expect(LINES.folk[2].map(l => l.en)).toContain((f.bubble!.text as { en: string }).en);
    expect(f.face).toBe(3); // player is to the right
    const at = { x: f.x, y: f.y }; updateFolk(0.5); expect({ x: f.x, y: f.y }).toEqual(at); // stopped
    f.bubble = null; for (let i = 0; i < 50; i++) updateFolk(0.1);
    expect(f.bubble).toBeNull();
    G.P!.x = f.x + 600; updateFolk(0.1); G.P!.x = f.x + 60; updateFolk(0.1); // away and back, same visit
    expect(f.bubble).toBeNull();
  });
  it('a folk line waits while the merchant bubble is showing', () => {
    startRun(1); loadFloor(0);
    const f = G.npc!.folk![0]; G.P!.x = f.x + 60; G.P!.y = f.y;
    G.npc!.merchant!.bubble = { text: { th: 'x', en: 'x' }, t: 3 };
    updateFolk(0.1); expect(f.bubble).toBeNull();
    G.npc!.merchant!.bubble = null; updateFolk(0.1); expect(f.bubble).toBeTruthy();
  });
  it('boss floors have no townsfolk', () => { startRun(1); loadFloor(4); expect(G.npc?.folk ?? []).toHaveLength(0); });
  it('rooms and boss floors have no townsfolk', () => {
    startRun(1); loadFloor(2, { type: 'battle', reward: 'xp' }); expect(G.npc?.folk ?? []).toHaveLength(0);
  });
});
