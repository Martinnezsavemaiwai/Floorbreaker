// Blade Arts. Slot 1 is always Gale Rush (it doubles as the dash dodge); slots 2-3 fill during a run from elite rooms.
// `pool`: 'fixed' = always slot 1, 'start' = in the run's pool from the start, 'unlock' = needs Memory Shards.
// Damage = attack * dmgMult.
import type { Text } from '../core/i18n.ts';
export interface SkillDef { name: string; short: string; desc: Text; cost: number; pool: 'fixed' | 'start' | 'unlock'; cd: number; dmgMult: number; delay: number }

export const SKILLS = {
  sonicLeap: { name: 'Gale Rush', short: 'Gale Rush', desc: { th: 'พุ่งไปข้างหน้า ฟันทุกตัวที่ขวางทาง ตอนพุ่งจะไม่โดนดาเมจ', en: "Dash forward and cut through anything in the way. You can't be hit mid-dash." }, cost: 0, pool: 'fixed',
    cd: 3, dmgMult: 2.5, delay: 0.5, dashTime: 0.18, dashSpeed: 900, hitRadius: 35 },
  horizontal: { name: 'Cyclone Edge', short: 'Cyclone', desc: { th: 'หมุนตัวฟันรอบทิศ ใช้ตอนโดนล้อม', en: "Spin and hit everything around you. Use it when you're surrounded." }, cost: 30, pool: 'start',
    cd: 4, dmgMult: 1.8, delay: 0.3, radius: 95 },
  vorpal: { name: 'Piercing Fang', short: 'Fang', desc: { th: 'ง้างแป๊บเดียวแล้วแทงยาวไปข้างหน้า ดาเมจสูงสุดในสามท่า เก็บไว้ใช้กับบอส', en: 'A quick wind-up, then a long straight thrust. The hardest-hitting of the three; save it for bosses.' }, cost: 60, pool: 'start',
    cd: 6, dmgMult: 3.5, delay: 0.3, windup: 0.25, length: 180, width: 46 },
} satisfies Record<string, SkillDef & Record<string, unknown>>;
export type SkillId = keyof typeof SKILLS;

// Round 2: an evolved Art hits 30% harder. Round 4 replaces this with each Art's own evolved form.
export const EVOLVED_DMG = 1.3;
// Mod targets include the basic sword ('blade'), which isn't a slotted Art
export const artName = (id: string) => (id === 'blade' ? 'Slash' : SKILLS[id as SkillId]?.name ?? id);
