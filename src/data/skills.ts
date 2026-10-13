// Blade Arts. Slot 1 is always Gale Rush (it doubles as the dash dodge); slots 2-3 fill during a run from elite rooms.
// `pool`: 'fixed' = always slot 1, 'start' = in the run's pool from the start, 'unlock' = needs Memory Shards.
// Damage = attack * dmgMult.
import type { Text } from '../core/i18n.ts';
export interface SkillDef { name: string; short: string; desc: Text; cost: number; pool: 'fixed' | 'start' | 'unlock'; cd: number; dmgMult: number; delay: number; evo: { name: string; desc: Text } & Record<string, unknown> }

export const SKILLS = {
  sonicLeap: { name: 'Gale Rush', short: 'Gale Rush', desc: { th: 'พุ่งไปข้างหน้า ฟันทุกตัวที่ขวางทาง ตอนพุ่งจะไม่โดนดาเมจ', en: "Dash forward and cut through anything in the way. You can't be hit mid-dash." }, cost: 0, pool: 'fixed',
    cd: 3, dmgMult: 2.5, delay: 0.5, dashTime: 0.18, dashSpeed: 900, hitRadius: 35,
    evo: { name: 'Twin Gale', desc: { th: 'พุ่งได้ 2 ครั้งติดกันก่อนต้องรอคูลดาวน์', en: 'Dash twice in a row before the cooldown.' }, charges: 2, gap: 0.3 } },
  horizontal: { name: 'Cyclone Edge', short: 'Cyclone', desc: { th: 'หมุนตัวฟันรอบทิศ ใช้ตอนโดนล้อม', en: "Spin and hit everything around you. Use it when you're surrounded." }, cost: 30, pool: 'start',
    cd: 4, dmgMult: 1.8, delay: 0.3, radius: 95,
    evo: { name: 'Maelstrom Edge', desc: { th: 'หมุน 2 รอบ และดูดศัตรูเข้าหาตัว', en: 'Spin twice and pull enemies in.' }, turns: 2, turnGap: 0.25, pull: 60 } },
  vorpal: { name: 'Piercing Fang', short: 'Fang', desc: { th: 'ง้างแป๊บเดียวแล้วแทงยาวไปข้างหน้า ดาเมจสูงสุดในสามท่า เก็บไว้ใช้กับบอส', en: 'A quick wind-up, then a long straight thrust. The hardest-hitting of the three; save it for bosses.' }, cost: 60, pool: 'start',
    cd: 6, dmgMult: 3.5, delay: 0.3, windup: 0.25, length: 180, width: 46,
    evo: { name: 'Rending Fang', desc: { th: 'แทงแล้วตามด้วยระเบิดเป็นแนวยาว', en: 'The stab is followed by a long blast down the line.' }, lineLen: 360, lineWidth: 70, lineMult: 1.0, lineDelay: 0.2 } },
  crescent: { name: 'Crescent Wave', short: 'Crescent', desc: { th: 'ปล่อยคลื่นดาบพุ่งไปข้างหน้า ทะลุศัตรูทุกตัวที่ขวาง', en: 'Send a sword wave forward. It cuts through everything in its path.' }, cost: 0, pool: 'start',
    cd: 4, dmgMult: 1.6, delay: 0.25, speed: 520, range: 360, waveR: 22,
    evo: { name: 'Triple Crescent', desc: { th: 'ปล่อยคลื่นดาบ 3 ลูกเป็นรูปพัด', en: 'Throw three waves in a fan.' }, fan: 18 } },
  riposte: { name: 'Riposte', short: 'Riposte', desc: { th: 'ตั้งท่ารับ ถ้าโดนตีระหว่างนั้นจะไม่เสียเลือดและสวนกลับแรงมาก ถ้าไม่โดนตีจะเสียจังหวะครู่หนึ่ง', en: "Take a guard stance. Get hit during it and you take no damage and strike back hard. If nothing hits you, you're left open for a moment." }, cost: 30, pool: 'unlock',
    cd: 5, dmgMult: 3.0, delay: 0.3, stance: 0.6, radius: 80,
    evo: { name: 'Still Moment', desc: { th: 'สวนกลับแล้วเวลารอบตัวช้าลงครู่หนึ่ง', en: 'A counter slows time for a moment.' }, slow: 0.4, slowTime: 1.2 } },
  shade: { name: 'Shade Step', short: 'Shade', desc: { th: 'วาร์ปไปข้างหลังศัตรูที่ใกล้ที่สุดตรงหน้าแล้วแทง ถ้าไม่มีเป้าหมายจะพุ่งไปข้างหน้าสั้นๆ', en: "Step behind the nearest enemy in front of you and stab. With no one in reach, it's a short dash." }, cost: 60, pool: 'unlock',
    cd: 5, dmgMult: 2.2, delay: 0.2, reach: 220, cone: 50, dash: 120,
    evo: { name: 'Shadow Chain', desc: { th: 'วาร์ปต่อไปหาศัตรูอีกตัว', en: 'Step on to one more enemy.' }, chainGap: 0.15 } },
} satisfies Record<string, SkillDef & Record<string, unknown>>;
export type SkillId = keyof typeof SKILLS;

// Mod targets include the basic sword ('blade'), which isn't a slotted Art
export const artName = (id: string) => (id === 'blade' ? 'Slash' : SKILLS[id as SkillId]?.name ?? id);
// The evolved sword: the combo finisher also throws a wave (damage relative to the finisher hit)
export const BLADE_EVO = { name: 'Moonrend', desc: { th: 'ท่าปิดคอมโบปล่อยคลื่นดาบออกไปด้วย', en: 'Your combo finisher also throws a sword wave.' }, range: 260, mult: 0.8 };
export const evoName = (id: string) => (id === 'blade' ? BLADE_EVO.name : SKILLS[id as SkillId]?.evo.name ?? id);
