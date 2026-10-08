// Blade Arts. Slot 1 is always Gale Rush (it doubles as the dash dodge); slot 2 holds one skill unlocked with
// Memory Shards (meta currency, earned at the end of every run, kept forever). Damage = attack * dmgMult.
import type { Text } from '../core/i18n.ts';
export interface SkillDef { name: string; short: string; desc: Text; cost: number; cd: number; dmgMult: number; delay: number }

export const SKILLS = {
  sonicLeap: { name: 'Gale Rush', short: 'Gale Rush', desc: { th: 'พุ่งไปข้างหน้า ฟันทุกตัวที่ขวางทาง ตอนพุ่งจะไม่โดนดาเมจ', en: "Dash forward and cut through anything in the way. You can't be hit mid-dash." }, cost: 0,
    cd: 3, dmgMult: 2.5, delay: 0.5, dashTime: 0.18, dashSpeed: 900, hitRadius: 35 },
  horizontal: { name: 'Cyclone Edge', short: 'Cyclone', desc: { th: 'หมุนตัวฟันรอบทิศ ใช้ตอนโดนล้อม', en: "Spin and hit everything around you. Use it when you're surrounded." }, cost: 30,
    cd: 4, dmgMult: 1.8, delay: 0.3, radius: 95 },
  vorpal: { name: 'Piercing Fang', short: 'Fang', desc: { th: 'ง้างแป๊บเดียวแล้วแทงยาวไปข้างหน้า ดาเมจสูงสุดในสามท่า เก็บไว้ใช้กับบอส', en: 'A quick wind-up, then a long straight thrust. The hardest-hitting of the three; save it for bosses.' }, cost: 60,
    cd: 6, dmgMult: 3.5, delay: 0.3, windup: 0.25, length: 180, width: 46 },
} satisfies Record<string, SkillDef & Record<string, unknown>>;
export type SkillId = keyof typeof SKILLS;

// Memory Shards for a finished run: kills, floors cleared, and a bonus for clearing the game
export const shardsFor = (kills: number, floorsCleared: number, cleared: boolean) =>
  Math.floor(kills / 4) + 10 * floorsCleared + (cleared ? 20 : 0);
