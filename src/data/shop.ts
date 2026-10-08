// Town merchant: what it sells and where it stands. Gold drops from every kill (mobs.ts `col`).
export const MERCHANT = { x: 230, y: 420, reach: 70 }; // inside the safe zone, above the road

export const SHOP = {
  potion: { name: 'Healing Potion', desc: 'ฟื้น HP 50% · ใช้ได้ทุกที่ · พกได้สูงสุด 3', price: () => 40, max: 3 },
  // an extra level-up pick; each one costs more than the last
  pick: { name: 'Skill Scroll', desc: 'เลือกอัปเกรดเพิ่ม 1 อย่าง', price: (bought: number) => 150 + 100 * bought, max: Infinity },
} satisfies Record<string, { name: string; desc: string; price: (bought: number) => number; max: number }>;
export type ShopItem = keyof typeof SHOP;
export const POTION_HEAL = 0.5; // fraction of max HP
