// Level-up upgrades: on every level-up the player picks 1 of 3. Each can be taken up to `max` times.
// Effects are read through systems/upgrades.js (`mods`), so stacking stays in one place.
import type { Text } from '../core/i18n.ts';
export interface UpgradeDef { name: Text; desc: Text; max: number }

export const UPGRADES = {
  keenEdge:   { name: { th: 'คมดาบ', en: 'Keen Edge' }, desc: { th: 'พลังโจมตี +2', en: 'Attack +2' }, max: 5 },
  quickSlash: { name: { th: 'ฟันไว', en: 'Quick Slash' }, desc: { th: 'คูลดาวน์การฟัน −10%', en: 'Slash cooldown −10%' }, max: 3 },
  leapPower:  { name: { th: 'Blade Art แรงขึ้น', en: 'Art Power' }, desc: { th: 'ดาเมจ Blade Art ทุกท่า +20%', en: 'All Blade Art damage +20%' }, max: 3 },
  leapCharge: { name: { th: 'ชาร์จไว', en: 'Quick Charge' }, desc: { th: 'คูลดาวน์ Blade Art ทุกท่า −15%', en: 'All Blade Art cooldowns −15%' }, max: 3 },
  vitality:   { name: { th: 'พลังชีวิต', en: 'Vitality' }, desc: { th: 'HP สูงสุด +15 และฟื้น HP จนเต็ม', en: 'Max HP +15, and heals you fully' }, max: 5 },
  lifesteal:  { name: { th: 'ดูดเลือด', en: 'Lifesteal' }, desc: { th: 'ฟันโดนแต่ละครั้งได้ HP คืน 1', en: 'Each hit heals you for 1 HP' }, max: 3 },
  swift:      { name: { th: 'ฝีเท้าเบา', en: 'Light Step' }, desc: { th: 'ความเร็วเดิน +6%', en: 'Move speed +6%' }, max: 3 },
  critical:   { name: { th: 'จุดตาย', en: 'Vital Point' }, desc: { th: 'โอกาสคริติคอล +6% (ดาเมจ ×2)', en: 'Critical chance +6% (×2 damage)' }, max: 3 },
  secondWind: { name: { th: 'ตั้งหลัก', en: 'Second Wind' }, desc: { th: 'หลังโดนตี จะไม่โดนดาเมจนานขึ้น 0.1 วินาที', en: 'After taking a hit, stay untouchable 0.1 s longer' }, max: 2 },
} satisfies Record<string, UpgradeDef>;

export type UpgradeId = keyof typeof UPGRADES;
export const OFFER_SIZE = 3;
