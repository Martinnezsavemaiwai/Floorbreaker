// The 20-floor run: 4 acts of town -> 3 rooms -> boss. Which floor is which, what the doors between rooms
// offer, what each room spawns, and the room layouts. Pure data and rules (no DOM, no G), so it's unit-testable.
// Doors and waves come from the run seed + floor number on their own rng stream: the same run rolls the same
// doors after a reload, and rolling them never shifts gameplay randomness.
import { makeRng } from '../core/rng.ts';
import { FLOORS, type TreeType } from './floors.ts';
import type { MobId } from './mobs.ts';
import type { Rect } from '../core/math.ts';
import type { Text } from '../core/i18n.ts';

export const FLOOR_COUNT = 20, ACT_LEN = 5;
export type FloorKind = 'town' | 'room' | 'boss';
export const actOf = (i: number) => Math.floor(i / ACT_LEN);
export const stepOf = (i: number) => i % ACT_LEN; // 0 town, 1-3 rooms, 4 boss
export const kindOf = (i: number): FloorKind => (stepOf(i) === 0 ? 'town' : stepOf(i) === ACT_LEN - 1 ? 'boss' : 'room');
export const isFinalFloor = (i: number) => i === FLOOR_COUNT - 1;
export const mobScale = (i: number) => 1 + 0.08 * stepOf(i); // inside an act: +8% HP and damage per floor

export const ROOM_TYPES = ['battle', 'elite', 'spring', 'shop', 'shrine', 'challenge'] as const;
export type RoomType = (typeof ROOM_TYPES)[number];
export const REWARDS = ['gold', 'xp', 'potion'] as const;
export type Reward = (typeof REWARDS)[number];
export interface Room { type: RoomType; reward: Reward | null }

export const ROOM_WEIGHTS: Record<RoomType, number> = { battle: 35, elite: 20, shop: 15, shrine: 12, challenge: 10, spring: 8 };
// Room types this build can actually run; later rounds add to it
export const AVAILABLE_ROOMS: RoomType[] = ['battle', 'elite', 'spring', 'challenge', 'shop', 'shrine'];
export const SHRINE_IDS = ['blood', 'gold', 'curse', 'potion'] as const;
export type ShrineId = (typeof SHRINE_IDS)[number];
export const SHRINE_RULES = { bloodHp: 0.15, goldCost: 120, curseFloors: 2, curseMult: 1.25, curseGold: 150, potionMaxHp: 10, reach: 70 };
// What each offer costs and gives (shown on the shrine's cards)
export const SHRINE: Record<ShrineId, { cost: Text; gain: Text }> = {
  blood: { cost: { th: 'เสีย HP สูงสุด 15%', en: 'Lose 15% max HP' }, gain: { th: 'ได้ mod ธาตุที่เลือกเอง', en: 'Gain an element mod of your choice' } },
  gold: { cost: { th: 'จ่าย 120 Gold', en: 'Pay 120 Gold' }, gain: { th: 'วิวัฒน์ท่าที่เลือกทันที', en: 'Evolve an Art of your choice now' } },
  curse: { cost: { th: 'ศัตรูแรงขึ้น 25% ใน 2 ชั้นถัดไปที่มีศัตรู', en: 'Enemies +25% for the next 2 floors with enemies' }, gain: { th: 'ได้ 150 Gold และ Potion 1 ขวด', en: 'Gain 150 Gold and a Potion' } },
  potion: { cost: { th: 'เสีย Potion 1 ขวด', en: 'Give up a Potion' }, gain: { th: 'ฟื้น HP เต็ม และ HP สูงสุด +10', en: 'Full heal and +10 max HP' } },
};
export function rollShrine(seed: number, i: number): ShrineId[] {
  const r = makeRng(seed * 23 + i * 31), left = [...SHRINE_IDS], out: ShrineId[] = [];
  while (out.length < 2) out.push(left.splice(Math.floor(r() * left.length), 1)[0]);
  return out;
}
// The room centre every preset keeps clear: the spring's fountain, the shop's merchant and the shrine stand here
export const ROOM_POINT = { x: 600, y: 400 };
export const ROOM_RULES = { springHeal: 0.5, springReach: 110, challengeTime: 30, challengeHits: 3, challengeEvery: 6 };
const HAS_REWARD: RoomType[] = ['battle', 'challenge']; // rooms whose door names a reward

export const rewardValue = (r: Reward, act: number) => (r === 'gold' ? 40 + 30 * act : r === 'xp' ? 120 + 80 * act : 1);

// Doors after clearing the room on floor `from` (a step 1 or 2 room); each door picks what floor from+1 will be.
// Fixed exits (town -> first room, last room -> boss, boss -> next town) are not rolled.
export function rollDoors(seed: number, from: number, available: readonly RoomType[] = AVAILABLE_ROOMS): Room[] {
  const r = makeRng(seed * 31 + from * 7919), out: Room[] = [], key = (d: Room) => `${d.type}:${d.reward}`;
  const make = (type: RoomType): Room => ({ type, reward: HAS_REWARD.includes(type) ? REWARDS[Math.floor(r() * REWARDS.length)] : null });
  const add = (d: Room) => { if (out.length < 3 && !out.some(o => key(o) === key(d))) out.push(d); };
  if (stepOf(from) === ACT_LEN - 3) { // the last pick before the boss
    const rest = available.filter(t => t === 'spring' || t === 'shop');
    if (rest.length) add(make(rest[Math.floor(r() * rest.length)]));
    if (available.includes('elite') && !rollDoors(seed, from - 1, available).some(d => d.type === 'elite')) add(make('elite'));
  }
  const total = available.reduce((s, t) => s + ROOM_WEIGHTS[t], 0);
  for (let tries = 0; out.length < 3 && tries < 60; tries++) {
    let x = r() * total, t = available[0];
    for (const a of available) { x -= ROOM_WEIGHTS[a]; if (x < 0) { t = a; break; } }
    add(make(t));
  }
  return out;
}

export type WaveMob = { id: MobId; n: number; elite?: boolean; mod?: EliteMod };
// One modifier per elite, from the run seed: a guard to break, speed, splitting on death, or regeneration
export const ELITE_MODS = ['shield', 'fast', 'split', 'regen'] as const;
export type EliteMod = (typeof ELITE_MODS)[number];
export const ELITE_MOD_NAME: Record<EliteMod, Text> = {
  shield: { th: 'มีโล่', en: 'Shielded' }, fast: { th: 'ว่องไว', en: 'Swift' },
  split: { th: 'แตกตัว', en: 'Splitting' }, regen: { th: 'ฟื้นเลือด', en: 'Regenerating' },
};
export const ELITE_RULES = { fast: 1.4, splitHp: 0.3, splitScale: 0.75, regen: 0.03, regenDelay: 2, shieldRegen: 3 };
// Elite room: the act's melee mob as an elite (x4 HP, x1.5 damage, bigger) with 3 of the same as escorts
export const ELITE = { hp: 4, dmg: 1.5, radius: 1.3, scale: 1.4 };
export const planElite = (seed: number, i: number): WaveMob[][] => {
  const F = FLOORS[actOf(i)], mod = ELITE_MODS[Math.floor(makeRng(seed * 19 + i * 3)() * ELITE_MODS.length)];
  return [[{ id: F.mob, n: 1, elite: true, mod }, { id: F.mob, n: 3 }]];
};
// What a room on floor i spawns, wave by wave: mostly the act's melee mob, its ranged mob, and one swarm/armored
// group from the act's extras in the last wave
export function planWaves(seed: number, i: number): WaveMob[][] {
  const r = makeRng(seed * 17 + i * 104729), F = FLOORS[actOf(i)], step = stepOf(i);
  const count = step === 1 ? 2 : 3, waves: WaveMob[][] = [];
  for (let w = 0; w < count; w++) {
    const size = 3 + step + w, ranged = w === count - 1 ? 2 : 1;
    const wave: WaveMob[] = [{ id: F.mob, n: size - ranged }, { id: F.ranged, n: ranged }];
    if (w === count - 1 && F.extras.length) { const e = F.extras[Math.floor(r() * F.extras.length)]; wave.push({ id: e.mob, n: e.group ?? 1 }); }
    waves.push(wave);
  }
  return waves;
}

// Room layouts (1200x800). Every preset keeps the player's start, the room centre and the door wall clear.
export const START_ZONE: Rect = { x: 60, y: 340, w: 160, h: 120 };
export const CENTER_ZONE: Rect = { x: 540, y: 340, w: 120, h: 120 };
export const DOOR_ZONE: Rect = { x: 1040, y: 0, w: 160, h: 800 };
export const ROOM_PRESETS: { trees: [number, number, TreeType][]; ponds?: Rect[] }[] = [
  { trees: [[300, 120, 'big'], [760, 520, 'big'], [380, 300, 'small']] },
  { trees: [[260, 520, 'big'], [820, 100, 'big'], [600, 600, 'small'], [420, 160, 'small']] },
  { trees: [[360, 220, 'big'], [300, 600, 'small'], [820, 560, 'small']], ponds: [{ x: 720, y: 180, w: 200, h: 140 }] },
  { trees: [[200, 140, 'small'], [880, 380, 'big'], [420, 560, 'big']], ponds: [{ x: 520, y: 120, w: 180, h: 130 }] },
];
export const pickPreset = (seed: number, i: number) => Math.floor(makeRng(seed * 13 + i * 7)() * ROOM_PRESETS.length);

export const shardsFor = (kills: number, floorsPassed: number, bosses: number, cleared: boolean) =>
  Math.floor(kills / 4) + 3 * floorsPassed + 10 * bosses + (cleared ? 20 : 0);
