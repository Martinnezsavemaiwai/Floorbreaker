import type { Text } from '../core/i18n.ts';

// Town merchant: what it sells and where it stands. Gold drops from every kill (mobs.ts `col`).
export const MERCHANT = { x: 230, y: 420, reach: 70 }; // inside the safe zone, above the road

export const SHOP = {
  potion: { name: 'Healing Potion', desc: { th: 'ฟื้น HP ครึ่งหลอด ใช้ที่ไหนก็ได้ พกได้ 3 ขวด', en: 'Heals half your HP. Works anywhere. Carry up to 3.' }, price: () => 40, max: 3 },
  // an extra level-up pick; each one costs more than the last
  pick: { name: 'Skill Scroll', desc: { th: 'ได้เลือกอัปเกรดเพิ่มอีก 1 ครั้ง', en: 'One extra upgrade pick.' }, price: (bought: number) => 150 + 100 * bought, max: Infinity },
} satisfies Record<string, { name: string; desc: Text; price: (bought: number) => number; max: number }>;
export type ShopItem = keyof typeof SHOP;
export const POTION_HEAL = 0.5; // fraction of max HP
