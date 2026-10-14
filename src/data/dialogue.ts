// What NPCs say. Plain voice, no speeches. pickLine chooses by situation (merchant) or by act (townsfolk).
import type { Text } from '../core/i18n.ts';
type Line = Extract<Text, { th: string; en: string }>;
type Pool = Line[];
export type Who = 'merchant' | 'wanderer' | 'folk';
export type LineCtx = {
  act: number;
  firstVisit?: boolean;
  lowHp?: boolean;
  afterBoss?: boolean;
  broke?: boolean;
  potionsFull?: boolean;
  event?: 'open' | 'bought' | 'cantAfford' | 'boughtMod' | 'farewell' | 'greet';
};
export const LINES = {
  merchant: {
    firstVisit: [{ th: 'มาใหม่สินะ ซื้อ Potion ติดตัวไว้สักขวดก่อนออกไป', en: 'New here? Take a Potion with you before you head out.' }],
    lowHp: [{ th: 'เลือดออกขนาดนั้นยังจะเดินต่ออีกเหรอ ดื่ม Potion ก่อนเถอะ', en: "You're bleeding. Drink something before you go on." }],
    afterBoss: [{ th: 'ได้ยินว่าตัวข้างบนล้มแล้ว ใช่ฝีมือคุณรึเปล่า', en: 'Heard the thing upstairs went down. That was you?' }],
    broke: [{ th: 'ไม่มีเงินก็ยืนดูได้ ไม่คิดค่าดู', en: 'No coin? Looking is free.' }],
    potionsFull: [{ th: 'กระเป๋าเต็มแล้ว ใส่ Potion เพิ่มไม่ได้หรอก', en: "Your bag's full. No room for another Potion." }],
    generic: [ // one pool per act
      [{ th: 'ชั้นแรกๆ ยังพอไหว ชั้นถัดไปไม่แน่', en: "The first floors are kind. The rest aren't." }],
      [{ th: 'พวกมีเขาข้างนอกชอบพุ่งชน อย่ายืนเป็นเส้นตรงกับมัน', en: "The horned ones charge. Don't stand in a straight line with them." }],
      [{ th: 'หมอกหนาขึ้นทุกวัน ฉันแทบมองไม่เห็นป้ายร้านตัวเอง', en: 'The mist gets thicker every day. I can barely see my own sign.' }],
      [{ th: 'น้ำขึ้นถึงขั้นบันไดแล้ว ถ้าได้ยินเสียงน้ำ ให้หาที่สูงไว้', en: "The water's up to the steps. If you hear it rising, find high ground." }],
    ],
    open: [{ th: 'ดูตามสบาย', en: 'Take your time.' }],
    bought: [{ th: 'ขอบใจ ใช้ให้คุ้มล่ะ', en: 'Thanks. Make it count.' }],
    cantAfford: [{ th: 'เงินยังไม่พอ', en: 'Not enough Gold for that.' }],
    farewell: [{ th: 'ระวังตัวด้วย', en: 'Watch yourself out there.' }, { th: 'กลับมาอีกนะ ถ้ายังไหว', en: 'Come back. If you can.' }],
  },
  wanderer: {
    greet: [{ th: 'ไม่คิดว่าจะเจอคนในนี้', en: "Didn't expect company down here." }],
    generic: [{ th: 'ของแพงกว่าในเมือง ก็แบกลงมาเองนี่นา', en: 'Pricier than town. I carried all of it here myself.' },
              { th: 'ฉันขายของไปทั่วหอคอย ไม่ค่อยอยู่ที่ไหนนาน', en: "I sell all over the tower. I don't stay anywhere long." }],
    open: [{ th: 'ของมีจำกัด เลือกดีๆ', en: 'Stock is short. Choose well.' }],
    bought: [{ th: 'ขอบใจ ใช้ให้คุ้มล่ะ', en: 'Thanks. Make it count.' }],
    boughtMod: [{ th: 'ธาตุนี้เข้ากับดาบคุณดี', en: 'That one suits your blade.' }],
    cantAfford: [{ th: 'เงินยังไม่พอ', en: 'Not enough Gold for that.' }],
    farewell: [{ th: 'ถ้าโชคดี เจอกันอีกไม่กี่ชั้นข้างบน', en: 'With luck, see you a few floors up.' }],
  },
  folk: [ // one pool per act
    [{ th: 'เห็นประตูทางขวานั่นไหม ทุกคนที่เข้าไปบอกว่าจะกลับมา', en: "See that door on the right? Everyone who went in said they'd be back." },
     { th: 'ตอนเด็กๆ ฉันนึกว่าหอนี้ไม่มีชั้นบนสุด', en: 'When I was a kid I thought this tower had no top.' }],
    [{ th: 'ราชาเขาโคอยู่ชั้นสิบ เสาในห้องนั้นแตกง่ายกว่าที่เห็น', en: 'The Horned King waits on floor ten. The pillars in there break easier than they look.' },
     { th: 'ฟางกองนั้นเก็บไว้ให้วัว ไม่ใช่ให้นั่ง', en: "That hay's for the cattle, not for sitting." }],
    [{ th: 'ในหมอกมีรากงอกขึ้นมา ตัดมันทิ้งแล้วจะมองเห็นทาง', en: "Roots grow in the mist. Cut them and you'll see the way." },
     { th: 'โคมพวกนี้จุดไว้ทั้งวัน ไม่งั้นคนหลงทาง', en: 'We keep these lamps lit all day or people get lost.' }],
    [{ th: 'นางม้าชั้นยี่สิบทำน้ำท่วมห้อง ขึ้นไปยืนบนหินไว้', en: 'The Tide Mare floods her hall. Get up on the stones.' },
     { th: 'เรือลำสุดท้ายออกไปเมื่อเดือนก่อน ไม่มีใครกลับมา', en: 'The last boat left a month ago. Nobody came back.' }],
  ] as Pool[],
};

const pick = (pool: Pool, r: () => number): Line =>
  pool[Math.min(pool.length - 1, Math.floor(r() * pool.length))];
const byAct = (pools: Pool[], act: number): Pool =>
  pools[Math.min(pools.length - 1, Math.max(0, act))];
const SITUATIONS = ['firstVisit', 'lowHp', 'afterBoss', 'broke', 'potionsFull'] as const;

export function pickLine(who: Who, ctx: LineCtx, r: () => number = Math.random): Line {
  if (who === 'folk') return pick(byAct(LINES.folk, ctx.act), r);
  const table = LINES[who] as unknown as Record<string, Pool | Pool[]>;
  const eventPool = ctx.event ? (table[ctx.event] as Pool | undefined) : undefined;
  if (eventPool) return pick(eventPool, r);
  if (who === 'merchant') {
    const situation = SITUATIONS.find(k => ctx[k]);
    if (situation) return pick(LINES.merchant[situation], r);
    return pick(byAct(LINES.merchant.generic, ctx.act), r);
  }
  return pick(table.generic as Pool, r);
}
