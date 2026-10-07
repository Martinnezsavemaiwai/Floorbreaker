// First-time tutorial hints, shown in context (each once per save, can be turned off in settings).
// Key names come from the current bindings, so rebinding updates the text too.
import { G } from '../world/state.ts';
import { TOWN_X } from '../world/constants.ts';
import { settings, meta, saveMeta } from '../core/save.ts';
import { keyLabel } from '../core/input.ts';
import { emit } from '../core/events.ts';

const HINTS = [
  { id: 'move', when: () => G.floorIdx === 0, title: 'วิธีเดิน',
    sub: () => `${keyLabel('up')} ${keyLabel('left')} ${keyLabel('down')} ${keyLabel('right')} เดิน · เมาส์ใช้เล็งทิศ` },
  { id: 'attack', when: () => G.P.x > TOWN_X + 40, title: 'ฟันดาบ', sub: () => `คลิกซ้าย หรือกด ${keyLabel('attack')}` },
  { id: 'windup', when: () => G.mobs.some(m => m.wind > 0), title: 'ระวัง!', sub: () => 'มอนสเตอร์ขึ้น ! สีแดง = กำลังจะโจมตี ให้ถอยออกก่อน' },
  { id: 'skill', when: () => G.run.kills >= 1, title: 'Sword Skill: Sonic Leap', sub: () => `คลิกขวา หรือกด ${keyLabel('skill')} · ระหว่างพุ่งไม่โดนดาเมจ` },
  { id: 'heal', when: () => G.P.x > TOWN_X && G.P.hp < G.P.maxHp * 0.4, title: 'HP ต่ำ', sub: () => 'กลับเข้าเมือง (ซ้ายสุด) เพื่อฟื้น HP' },
  { id: 'shop', when: () => G.P.col >= 40, title: 'มี Col แล้ว', sub: () => `กลับเมืองไปหาพ่อค้า กด ${keyLabel('interact')} ซื้อ Potion (ดื่มด้วย ${keyLabel('potion')})` },
  { id: 'boss', when: () => G.boss.awake, title: 'ห้องบอส', sub: () => 'หลบวงสีแดงก่อนบอสฟาด · ประตูล็อกจนกว่าบอสจะตาย' },
  { id: 'save', when: () => G.run.time > 45, title: 'พักเกมได้', sub: () => `${keyLabel('pause')} หยุดเกม · ปิดแท็บได้เลย เกมเซฟให้อัตโนมัติ` },
];
const GAP = 5; // seconds between hints so they never stack up
let wait = 0;

export function updateHints(dt) {
  if (!settings.hints || (wait -= dt) > 0) return;
  const h = HINTS.find(h => !meta.hintsSeen.includes(h.id) && h.when());
  if (!h) return;
  meta.hintsSeen.push(h.id); saveMeta();
  emit('hint', { title: h.title, sub: h.sub() });
  wait = GAP;
}
