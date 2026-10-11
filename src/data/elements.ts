// The four elements, one per act (the same colours as that act's stained glass on the title screen).
// A mod = one Art + one element: every hit of that Art applies the element. See systems/elements.js.
import type { Text } from '../core/i18n.ts';

export const ELEMENT_IDS = ['ember', 'storm', 'thorn', 'tide'] as const;
export type ElementId = (typeof ELEMENT_IDS)[number];

export const ELEMENTS: Record<ElementId, { name: string; color: string; hit: Text; set: Text }> = {
  ember: { name: 'Ember', color: '#ff963c',
    hit: { th: 'ศัตรูติดไฟ โดนดาเมจต่อเนื่อง 3 วินาที ซ้อนได้ 3 ชั้น', en: 'Sets enemies on fire for 3 s. Stacks 3 times.' },
    set: { th: 'ศัตรูที่ตายตอนติดไฟจะระเบิดใส่ตัวรอบๆ', en: 'Enemies that die while burning explode.' } },
  storm: { name: 'Storm', color: '#a688ff',
    hit: { th: 'สายฟ้ากระโดดไปโดนอีก 2 ตัวที่อยู่ใกล้', en: 'Lightning jumps to 2 nearby enemies.' },
    set: { th: 'ทุกการโจมตีโดนครั้งที่ 6 จะมีฟ้าผ่าลงมา', en: 'Every 6th hit calls down a bolt.' } },
  thorn: { name: 'Thorn', color: '#78ff96',
    hit: { th: 'ศัตรูติดพิษและเดินช้าลง', en: 'Poisons enemies and slows them down.' },
    set: { th: 'ฆ่าศัตรูที่ติดพิษแล้วได้ HP คืน 2', en: 'Killing a poisoned enemy heals 2 HP.' } },
  tide: { name: 'Tide', color: '#5ac8ff',
    hit: { th: 'ศัตรูกระเด็นไกลขึ้น โดนครบ 3 ครั้งจะแข็งไปครู่หนึ่ง', en: 'Knocks enemies further. 3 hits freeze them for a moment.' },
    set: { th: 'กลิ้งหรือพุ่งแล้วทิ้งวงน้ำแข็งที่ทำให้ศัตรูช้าลง', en: 'Rolling or dashing leaves a ring of frost that slows enemies.' } },
};

// Tuning (spec values). `double`: the same element twice on one Art.
export const EL = {
  double: 1.5,
  ember: { dps: 0.2, time: 3, stacks: 3 },
  storm: { chain: 2, range: 140, mult: 0.4 },
  thorn: { dps: 0.15, time: 4, slow: 0.3, slowTime: 2 },
  tide: { knock: 1.5, hits: 3, window: 2, freeze: 0.6, bossSlow: 0.4 },
  set: { need: 3, emberBlast: { mult: 2, radius: 70 }, stormEvery: 6, stormBolt: 2, thornHeal: 2, tideRing: { radius: 90, slow: 0.4, time: 1.5 } },
};
