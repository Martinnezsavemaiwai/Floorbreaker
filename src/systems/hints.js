// First-time tutorial hints, shown in context (each once per save, can be turned off in settings).
// Key names come from the current bindings, so rebinding updates the text too.
import { G } from '../world/state.ts';
import { tr } from '../core/i18n.ts';
import { TOWN_X } from '../world/constants.ts';
import { settings, meta, saveMeta } from '../core/save.ts';
import { keyLabel } from '../core/input.ts';
import { SKILLS } from '../data/skills.ts';
import { emit } from '../core/events.ts';

const k = keyLabel;
const HINTS = [
  { id: 'move', when: () => G.floorIdx === 0, title: () => tr('เดิน', 'Walking'),
    sub: () => tr(`กด ${k('up')} ${k('left')} ${k('down')} ${k('right')} เพื่อเดิน ใช้เมาส์เล็ง`, `${k('up')} ${k('left')} ${k('down')} ${k('right')} to walk, aim with the mouse`) },
  { id: 'attack', when: () => G.P.x > TOWN_X + 40, title: () => tr('ฟันดาบ', 'Slash'),
    sub: () => tr(`คลิกซ้าย หรือกด ${k('attack')}`, `Left click or press ${k('attack')}`) },
  { id: 'windup', when: () => G.mobs.some(m => m.wind > 0), title: () => tr('ระวัง', 'Careful'),
    sub: () => tr('ถ้ามี ! สีแดงขึ้นเหนือหัวมอนสเตอร์ แปลว่ามันกำลังจะตี ถอยออกมาก่อน', "A red ! over a monster means it's about to hit. Step back.") },
  { id: 'skill', when: () => G.run.kills >= 1, title: () => 'Gale Rush',
    sub: () => tr(`คลิกขวาหรือกด ${k('skill')} เพื่อพุ่งไปข้างหน้า ตอนพุ่งจะไม่โดนดาเมจ`, `Right click or press ${k('skill')} to dash. Nothing can hit you mid-dash.`) },
  { id: 'roll', when: () => G.P.x > TOWN_X && G.P.hp < G.P.maxHp, title: () => tr('กลิ้งหลบ', 'Dodge roll'),
    sub: () => tr(`กด ${k('dodge')} เพื่อกลิ้งไปทางที่เดินอยู่ ตอนกลิ้งจะไม่โดนดาเมจ`, `${k('dodge')} rolls you the way you're walking. Nothing can hit you mid-roll.`) },
  { id: 'combo', when: () => G.run.kills >= 3, title: () => tr('คอมโบ', 'Combo'),
    sub: () => tr('ฟันต่อกัน 3 ครั้ง ครั้งที่สามเป็นท่าปิดสีทอง แรงกว่าเดิมและกระแทกศัตรูกระเด็น', 'Swing three times in a row. The third is a gold finisher that hits harder and knocks enemies back.') },
  { id: 'skill2', when: () => !!G.P.skills[1], title: () => SKILLS[G.P.skills[1]].name,
    sub: () => tr(`Blade Art ช่อง 2 กด ${k('skill2')} หรือคลิกปุ่มกลางเมาส์`, `Your slot 2 Blade Art. Press ${k('skill2')} or middle click.`) },
  { id: 'heal', when: () => G.P.x > TOWN_X && G.P.hp < G.P.maxHp * 0.4, title: () => tr('HP ต่ำ', 'Low HP'),
    sub: () => tr('กลับเข้าเมืองทางซ้ายสุด HP จะค่อยๆ ฟื้นเอง', 'Head back to town on the far left. Your HP refills there.') },
  { id: 'shop', when: () => G.P.col >= 40, title: () => tr('มี Gold แล้ว', "You've got Gold"),
    sub: () => tr(`แวะหาพ่อค้าในเมือง กด ${k('interact')} เพื่อซื้อ Potion แล้วกด ${k('potion')} เพื่อดื่ม`, `Visit the merchant in town. ${k('interact')} to buy Potions, ${k('potion')} to drink one.`) },
  { id: 'boss', when: () => G.boss.awake, title: () => tr('ห้องบอส', 'Boss room'),
    sub: () => tr('เห็นวงสีแดงที่พื้นให้รีบออก ประตูจะล็อกจนกว่าบอสตาย', 'Get out of red circles on the ground. The door stays locked until the boss dies.') },
  { id: 'save', when: () => G.run.time > 45, title: () => tr('อยากพัก?', 'Need a break?'),
    sub: () => tr(`กด ${k('pause')} เพื่อหยุดเกม หรือปิดแท็บไปเลยก็ได้ เกมเซฟไว้ให้แล้ว`, `${k('pause')} pauses. You can also just close the tab; the game saves.`) },
];
const GAP = 5; // seconds between hints so they never stack up
let wait = 0;

export function updateHints(dt) {
  if (!settings.hints || (wait -= dt) > 0) return;
  const h = HINTS.find(h => !meta.hintsSeen.includes(h.id) && h.when());
  if (!h) return;
  meta.hintsSeen.push(h.id); saveMeta();
  emit('hint', { title: h.title(), sub: h.sub() });
  wait = GAP;
}
