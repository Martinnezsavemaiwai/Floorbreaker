// Short story beats, shown once per save the first time each floor loads (kept in meta.storySeen).
// `ending` plays on every clear, before the result screen.
// The System talks in short, cold notices; "you" talks like a person stuck in a game.
import type { Text } from '../core/i18n.ts';

export interface Line { who: Text; text: Text }

const SYS = 'System', YOU = { th: 'คุณ', en: 'You' };

export const STORY: Record<string, Line[]> = {
  floor0: [
    { who: SYS, text: { th: 'ผู้เล่นใหม่เข้าสู่ระบบ ตำแหน่ง: The Spire ชั้น 1 จาก 100', en: 'New player logged in. Location: The Spire, floor 1 of 100.' } },
    { who: SYS, text: { th: 'คำสั่ง Log Out ใช้งานไม่ได้ ทางออกอยู่ที่ชั้น 100', en: 'Log Out is unavailable. The exit is on floor 100.' } },
    { who: SYS, text: { th: 'ถ้า HP เหลือ 0 ตัวละครจะถูกลบ และกู้คืนไม่ได้', en: 'If your HP hits 0, your character is deleted. It cannot be restored.' } },
    { who: YOU, text: { th: 'เมืองนี้ชื่อ Firstlight สินะ ออกไม่ได้ก็ต้องปีนขึ้นไป บอสชั้นนี้รออยู่สุดถนนเส้นนั้น', en: "So this is Firstlight. If I can't log out, I climb. The boss is at the end of that road." } },
  ],
  floor1: [
    { who: SYS, text: { th: 'ปลดล็อกชั้น 2: Hornfield', en: 'Floor 2 unlocked: Hornfield.' } },
    { who: YOU, text: { th: 'คนในเมืองบอกว่าห้องบอสมีวัวยักษ์เฝ้าอยู่ ส่วนทหาร Taurus ในทุ่งก็โหดใช่เล่น', en: 'People here say a giant bull guards the boss room. The Taurus soldiers in the fields hit hard too.' } },
    { who: YOU, text: { th: 'มีพวกขว้างหอกจากไกลๆ ด้วย เห็นเส้นสีแดงเล็งมาเมื่อไหร่ต้องหลบ', en: 'Some of them throw javelins from far off. If a red line points at me, I move.' } },
  ],
  floor2: [
    { who: SYS, text: { th: 'ปลดล็อกชั้น 3: Mistwell', en: 'Floor 3 unlocked: Mistwell.' } },
    { who: YOU, text: { th: 'หมอกหนาจนแทบมองไม่เห็นทาง Dark Elf ซุ่มอยู่ในป่านี้ แล้วเวทของพวกมันก็เจ็บมาก', en: "The fog is so thick I can barely see the path. Dark Elves hide in these woods, and their spells hurt." } },
    { who: YOU, text: { th: 'กลางป่ามีต้นไม้ยักษ์ที่เดินได้ ชั้นนี้ยากสุดตั้งแต่มาเลย', en: "There's a giant tree in the middle of the forest, and it walks. This is the worst floor yet." } },
  ],
  floor3: [
    { who: SYS, text: { th: 'ปลดล็อกชั้น 4: Canalis', en: 'Floor 4 unlocked: Canalis.' } },
    { who: YOU, text: { th: 'ทั้งเมืองมีแต่คลองกับบ่อน้ำ ต้องระวังอย่าให้โดนไล่ต้อนจนติดริมน้ำ', en: "This town is all canals and ponds. I can't let them back me up against the water." } },
    { who: YOU, text: { th: 'บอสที่นี่เป็นม้าน้ำยักษ์ ยิงน้ำออกมาเป็นวง ต้องรอช่องระหว่างวงแล้วแทรกเข้าไป', en: 'The boss here is a giant seahorse that fires rings of water. I have to wait for a gap between rings and slip through.' } },
  ],
  ending: [
    { who: SYS, text: { th: 'ผ่านชั้น 4 แล้ว ประตูชั้น 5 ยังปิดอยู่', en: 'Floor 4 cleared. The gate to floor 5 is still sealed.' } },
    { who: YOU, text: { th: 'สี่ชั้นแล้ว เหลืออีก 96', en: 'Four floors down. Ninety-six to go.' } },
    { who: YOU, text: { th: 'อย่างน้อยตอนนี้ก็รู้แล้วว่าหอนี้ปีนได้ พักก่อน แล้วค่อยไปต่อ', en: "At least now I know this tower can be climbed. I'll rest, then keep going." } },
    { who: SYS, text: { th: 'ขอบคุณที่เล่น Floorbreaker เรื่องราวยังไม่จบ', en: 'Thanks for playing Floorbreaker. To be continued.' } },
  ],
};
