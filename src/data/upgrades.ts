// Level-up upgrades: on every level-up the player picks 1 of 3. Each can be taken up to `max` times.
// Effects are read through systems/upgrades.js (`mods`), so stacking stays in one place.
export interface UpgradeDef { name: string; desc: string; max: number }

export const UPGRADES = {
  keenEdge:   { name: 'คมดาบ',          desc: 'พลังโจมตี +2', max: 5 },
  quickSlash: { name: 'ฟันไว',          desc: 'คูลดาวน์การฟัน −10%', max: 3 },
  leapPower:  { name: 'Sword Skill แรงขึ้น', desc: 'ดาเมจ Sword Skill ทุกท่า +20%', max: 3 },
  leapCharge: { name: 'ชาร์จไว',         desc: 'คูลดาวน์ Sword Skill ทุกท่า −15%', max: 3 },
  vitality:   { name: 'พลังชีวิต',        desc: 'HP สูงสุด +15 และฟื้นเต็ม', max: 5 },
  lifesteal:  { name: 'ดูดเลือด',        desc: 'ฟื้น 1 HP ทุกครั้งที่ฟันโดน', max: 3 },
  swift:      { name: 'ฝีเท้าเบา',        desc: 'ความเร็วเดิน +6%', max: 3 },
  critical:   { name: 'จุดตาย',          desc: 'โอกาสคริติคอล +6% (ดาเมจ ×2)', max: 3 },
  secondWind: { name: 'ตั้งหลัก',          desc: 'ช่วงอมตะหลังโดนตี +0.1 วินาที', max: 2 },
} satisfies Record<string, UpgradeDef>;

export type UpgradeId = keyof typeof UPGRADES;
export const OFFER_SIZE = 3;
