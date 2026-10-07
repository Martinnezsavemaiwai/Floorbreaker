// Short story beats, shown once per save the first time each floor loads (kept in meta.storySeen).
// `ending` plays on every clear, before the result screen.
// Original lines in the spirit of the setting; `who` is the window title.
export interface Line { who: string; text: string }

export const STORY: Record<string, Line[]> = {
  floor0: [
    { who: 'System', text: 'ยินดีต้อนรับสู่ Aincrad ปราสาทลอยฟ้า 100 ชั้น' },
    { who: 'System', text: 'แจ้งเตือน: ไม่พบคำสั่ง Log Out · ทางออกเดียวคือพิชิตชั้นบนสุด' },
    { who: 'System', text: 'เมื่อ HP เหลือ 0 ตัวละครจะถูกลบถาวร · ขอให้โชคดี' },
    { who: 'คุณ', text: 'Town of Beginnings… ถ้าออกไม่ได้ ก็ต้องเดินหน้าอย่างเดียว ไปหาบอสที่ปลายถนนกัน' },
  ],
  floor1: [
    { who: 'System', text: 'ชั้น 2 เปิดแล้ว · เมือง Urbus' },
    { who: 'คุณ', text: 'ชาวเมืองลือกันว่าห้องบอสมีวัวกระทิงยักษ์เฝ้าอยู่ พวกทหาร Taurus ในทุ่งก็ไม่ธรรมดา' },
    { who: 'คุณ', text: 'แถมยังมีพวกขว้างหอกจากระยะไกลด้วย ต้องคอยดูเส้นเล็งสีแดงให้ดี' },
  ],
  floor2: [
    { who: 'System', text: 'ชั้น 3 เปิดแล้ว · หมู่บ้าน Zumfut' },
    { who: 'คุณ', text: 'ป่านี้หมอกหนาจนมองไม่เห็นทาง ได้ยินว่า Dark Elf ซุ่มอยู่ทั่ว และเวทของพวกมันแรงมาก' },
    { who: 'คุณ', text: 'ที่ใจกลางป่ามีต้นไม้ยักษ์ที่ขยับได้… ชั้นนี้คงเป็นด่านที่ยากที่สุดจนถึงตอนนี้' },
  ],
  ending: [
    { who: 'System', text: 'Floor 3 Cleared · ประตูสู่ชั้น 4 ยังไม่เปิด' },
    { who: 'คุณ', text: 'ผ่านมาสามชั้นแล้ว… แต่ยังเหลืออีก 97 ชั้นกว่าจะได้กลับบ้าน' },
    { who: 'คุณ', text: 'อย่างน้อยวันนี้ก็รู้แล้วว่าปราสาทนี้พิชิตได้ พักก่อนแล้วค่อยไปต่อ' },
    { who: 'System', text: 'ขอบคุณที่เล่น Sword Art On You · to be continued' },
  ],
};
