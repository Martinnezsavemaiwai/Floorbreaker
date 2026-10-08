// Blade Arts. Slot 1 is always Gale Rush (it doubles as the dash dodge); slot 2 holds one skill unlocked with
// Memory Shards (meta currency, earned at the end of every run, kept forever). Damage = attack * dmgMult.
export interface SkillDef { name: string; short: string; desc: string; cost: number; cd: number; dmgMult: number; delay: number }

export const SKILLS = {
  sonicLeap: { name: 'Gale Rush', short: 'Gale Rush', desc: 'พุ่งไปข้างหน้า ฟันทุกตัวที่ผ่าน · ระหว่างพุ่งไม่โดนดาเมจ', cost: 0,
    cd: 3, dmgMult: 2.5, delay: 0.5, dashTime: 0.18, dashSpeed: 900, hitRadius: 35 },
  horizontal: { name: 'Cyclone Edge', short: 'Cyclone', desc: 'ฟันหมุนรอบตัว โดนทุกตัวรอบๆ · เหมาะตอนโดนรุม', cost: 30,
    cd: 4, dmgMult: 1.8, delay: 0.3, radius: 95 },
  vorpal: { name: 'Piercing Fang', short: 'Fang', desc: 'ง้างสั้นๆ แล้วแทงตรงไกลมาก ดาเมจสูงสุด · ใช้เจาะบอส', cost: 60,
    cd: 6, dmgMult: 3.5, delay: 0.3, windup: 0.25, length: 180, width: 46 },
} satisfies Record<string, SkillDef & Record<string, unknown>>;
export type SkillId = keyof typeof SKILLS;

// Memory Shards for a finished run: kills, floors cleared, and a bonus for clearing the game
export const shardsFor = (kills: number, floorsCleared: number, cleared: boolean) =>
  Math.floor(kills / 4) + 10 * floorsCleared + (cleared ? 20 : 0);
