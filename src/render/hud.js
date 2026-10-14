// Canvas HUD in pixels (see render/pixel.js): the player pane, the boss bar, skill slots and off-screen guide arrows.
// Coordinates here are HUD px (480 x 320); text is placed in HUD px and drawn crisp at screen resolution.
import { G, rage } from '../world/state.ts';
import { tr } from '../core/i18n.ts';
import { W, H } from '../world/constants.ts';
import { floorLabel } from '../world/floor.ts';
import { actOf, ROOM_RULES } from '../data/run.ts';
import { PLAYER } from '../data/player.ts';
import { SKILLS } from '../data/skills.ts';
import { ICON } from '../data/skillIcons.ts';
import { ELEMENTS } from '../data/elements.ts';
import { FLOORS } from '../data/floors.ts';
import { IMG, icon } from '../core/assets.ts';
import { artElements, artColor, setProgress } from '../systems/build.js';
import { keyLabel } from '../core/input.ts';
import { FT } from './canvas.js';
import { PX, hc, LEAD, INK, INK2, beginPixels, endPixels, pane, ring, bar, gem, coin, text } from './pixel.js';

const A = PLAYER.attack, HW = W / PX, HH = H / PX;
const torchHex = () => '#' + FLOORS[actOf(G.floorIdx)].torch.split(',').map(n => (+n).toString(16).padStart(2, '0')).join('');
const hpCol = f => f > 0.5 ? '#5fd35a' : f > 0.25 ? '#e8b931' : '#e8473a';

// A HUD block turns see-through while the player, the boss or a door sign is behind it (rect in HUD px)
function veil(x, y, w, h) {
  const behind = e => { const sx = (e.x - G.cam.x) / PX, sy = (e.y - G.cam.y) / PX; return sx > x - 12 && sx < x + w + 12 && sy > y - 20 && sy < y + h + 15; };
  hc.globalAlpha = behind(G.P) || (G.boss.hp > 0 && behind(G.boss)) || G.doors.some(d => [d.x + d.w / 2, d.x - 20, d.x - 90].some(x => behind({ x, y: d.y + d.h / 2 }))) ? 0.3 : 1; // the door and the sign left of it
}

function portrait(x, y, s) {
  const img = IMG.player;
  if (!img) return;
  const c = img.width / 4; // facing down, standing: head and shoulders
  hc.drawImage(img, c * 0.18, c * 0.02, c * 0.64, c * 0.64, x, y, s, s);
}

function drawPlayerPane() {
  const { P, F, L } = G, x = 6, y = 6, w = 176, h = 46, acc = torchHex();
  veil(x, y, w, h + 22);
  pane(x, y, w, h, acc);
  pane(x + 4, y + 4, 34, 34, null, '#22232f'); portrait(x + 6, y + 6, 30);
  // level tag hanging off the portrait
  pane(x + 3, y + 30, 32, 14, acc, '#101118'); // level plate over the portrait's foot: big white number, small LV
  text('LV', x + 7, y + 41, { size: 10, weight: 800, color: acc }); text(String(P.lv), x + 31, y + 42, { size: 16, weight: 800, color: '#fff', align: 'right' });
  text(G.run.name || 'PLAYER', x + 43, y + 13, { size: 14, weight: 800 });
  text(`${Math.max(0, Math.ceil(P.hp))}/${P.maxHp}`, x + w - 5, y + 13, { size: 12, weight: 800, color: INK2, align: 'right' });
  bar(x + 42, y + 16, w - 47, 9, P.hp / P.maxHp, P.lag / P.maxHp, hpCol(P.hp / P.maxHp), 10);
  bar(x + 42, y + 26, w - 47, 4, P.xp / PLAYER.xpToNext(P.lv), 0, '#5fc3ff');
  // element sets: n/3 per element, lit once the set bonus is on
  setProgress().forEach((e, i) => {
    const gx = x + 42 + i * 33, gy = y + 33;
    gem(gx, gy, ELEMENTS[e.el].color, e.active || e.n > 0);
    text(`${Math.min(e.n, e.need)}/${e.need}`, gx + 9, gy + 7, { size: 11, weight: 800, color: e.active ? '#fff' : INK2 });
  });
  // under the pane: where you are, and your Gold
  const where = L.kind === 'town' ? ['SAFE ZONE · ' + tr('HP ฟื้นฟู', 'HP regen'), '#9fe89f'] : L.kind === 'boss' ? ['BOSS', '#ff8a7a'] : ['', INK];
  text([floorLabel(G.floorIdx), F.town, where[0], G.cursed && tr('คำสาป', 'Cursed')].filter(Boolean).join(' · '), x + 2, y + h + 9,
    { size: 12, weight: 600, font: FT, color: G.cursed ? '#c9b6ff' : where[1] });
  coin(x + 2, y + h + 13); text(`${P.col}`, x + 11, y + h + 19, { size: 12, weight: 800, color: '#ffe14d' });
  hc.globalAlpha = 1;
}

function drawBossBar() {
  const { boss, F } = G;
  if (!boss.awake || boss.hp <= 0) return;
  // Bosses show several stacked HP bars: one drains at a time, pips count the ones left
  const bars = F.boss.bars, seg = boss.maxHp / bars, left = Math.ceil(boss.hp / seg);
  const frac = (boss.hp - (left - 1) * seg) / seg, lag = boss.lag > left * seg ? 1 : (boss.lag - (left - 1) * seg) / seg;
  const w = 204, x = (HW - w) / 2, y = HH - 52; // bottom centre, just above the skill slots
  veil(x, y - 10, w, 22);
  text(F.boss.name, HW / 2, y - 3, { size: 13, weight: 800, color: rage() ? '#ffd760' : INK, align: 'center' });
  bar(x, y, w, 7, frac, lag, rage() ? '#ff7a3a' : '#d8372c', 0);
  // pips = bars still to go after this one (filled) / already broken (hollow)
  for (let i = 0; i < bars; i++) {
    hc.fillStyle = LEAD; hc.fillRect(x + i * 9, y + 9, 7, 4);
    hc.fillStyle = i < left - 1 ? '#ff6a4d' : '#26202a'; hc.fillRect(x + i * 9 + 1, y + 10, 5, 2);
  }
  text(`×${left}`, x + w, y + 15, { size: 11, weight: 800, align: 'right' });
  hc.globalAlpha = 1;
}

function flask(x, y, full) {
  hc.globalAlpha *= full ? 1 : 0.4;
  const img = IMG.potion; // the potion sprite, centred on the drawn flask's 14 px box
  if (img) { hc.drawImage(img, x + Math.round((14 - img.width) / 2), y + Math.round((14 - img.height) / 2)); hc.globalAlpha = 1; return; }
  hc.fillStyle = LEAD; hc.fillRect(x + 4, y, 6, 4); hc.fillRect(x + 1, y + 4, 12, 10); hc.fillRect(x + 2, y + 3, 10, 12);
  hc.fillStyle = '#b8642a'; hc.fillRect(x + 5, y + 1, 4, 2);                 // cork
  hc.fillStyle = '#e8eef7'; hc.fillRect(x + 2, y + 5, 10, 8); hc.fillRect(x + 3, y + 4, 8, 10);
  hc.fillStyle = '#ff5a6a'; hc.fillRect(x + 3, y + 8, 8, 5); hc.fillRect(x + 4, y + 7, 6, 7);
  hc.fillStyle = '#fff'; hc.fillRect(x + 4, y + 5, 1, 2);                    // shine
  hc.globalAlpha = 1;
}
// The sword sprite, rotated into a slot (pixel-art rotation at HUD resolution keeps it on the grid)
function slotSword(cx, cy, rot) {
  const img = IMG.sword;
  if (!img) return;
  const h = 22, w = h * img.width / img.height;
  hc.save(); hc.translate(cx, cy); hc.rotate(rot); hc.drawImage(img, -w / 2, -h / 2, w, h); hc.restore();
}

function drawSkillSlots() {
  const P = G.P, s = 28, gap = 9, y = HH - s - 10;
  const skill = (slot, action) => {
    const id = P.skills[slot], S = SKILLS[id], cd = P.skillCd[slot];
    return { key: keyLabel(action), label: S.short, cd: Math.max(0, cd) / S.cd, ready: cd <= 0, secs: cd, icon: id, art: id };
  };
  const slots = [
    { key: keyLabel('attack'), label: tr('ฟัน', 'Slash'), cd: Math.max(0, P.atkCd) / A.cd, ready: false, icon: 'attack', art: 'blade' },
    skill(0, 'skill'), ...(P.skills[1] ? [skill(1, 'skill2')] : []), ...(P.skills[2] ? [skill(2, 'skill3')] : []),
    { key: keyLabel('potion'), label: `Potion ×${P.potions}`, cd: 0, ready: false, potion: true },
  ];
  const x0 = Math.round(HW / 2 - (slots.length * s + (slots.length - 1) * gap) / 2);
  veil(x0, y, slots.length * (s + gap), s + 10);
  const a = hc.globalAlpha;
  slots.forEach((sl, i) => {
    const x = x0 + i * (s + gap), cx = x + s / 2, cy = y + s / 2;
    const mods = sl.art ? artElements(sl.art) : [], ac = sl.art ? artColor(sl.art) : null;
    const img = sl.potion ? null : icon('art', sl.icon); // the Art's own framed icon; Slash and Potion keep the drawn pane
    if (img) hc.drawImage(img, x + Math.round((s - img.width) / 2), y + Math.round((s - img.height) / 2));
    else pane(x, y, s, s, ac);
    if (sl.ready) { ring(x, y, s, s, '#ff963c'); ring(x - 1, y - 1, s + 2, s + 2, 'rgba(255,150,60,.45)'); }
    if (sl.potion) flask(cx - 7, cy - 7, P.potions > 0);
    else if (!img) slotSword(cx, cy + 1, ICON[sl.icon][0]);
    hc.globalAlpha = a;
    if (sl.cd > 0) { // the cooldown drains top-down in whole pixels
      const ch = Math.ceil((s - 2) * sl.cd);
      hc.fillStyle = 'rgba(8,9,13,.72)'; hc.fillRect(x + 1, y + 1 + (s - 2 - ch), s - 2, ch);
      if (sl.secs > 0.05) text(sl.secs.toFixed(1), cx, cy + 5, { size: 15, weight: 800, align: 'center' });
    }
    // key badge, top-left
    const kw = Math.max(9, Math.ceil(sl.key.length * 3.6) + 4);
    hc.fillStyle = LEAD; hc.fillRect(x + 1, y + 1, kw + 2, 10);
    hc.fillStyle = INK; hc.fillRect(x + 2, y + 2, kw, 8);
    text(sl.key, x + 2 + kw / 2, y + 9, { size: 11, weight: 800, color: LEAD, align: 'center', outline: null });
    if (sl.art) {
      for (let k = 0; k < 2; k++) { // two mod pips along the bottom edge
        const px = cx - 6 + k * 7;
        hc.fillStyle = LEAD; hc.fillRect(px, y + s - 4, 5, 3);
        hc.fillStyle = mods[k] ? ELEMENTS[mods[k]].color : '#3a3c4a'; hc.fillRect(px + 1, y + s - 3, 3, 1);
      }
      if (P.evolved.includes(sl.art)) { // evolved mark, top-right
        gem(x + s - 9, y + 2, '#ffd35a', true);
        if (sl.art === 'sonicLeap') text(`×${P.galeCharges}`, x + 3, y + s - 6, { size: 12, weight: 800, color: '#ffd35a' });
      }
    }
    text(sl.label, cx, y + s + 8, { size: 12, weight: 600, font: FT, align: 'center' });
  });
  hc.globalAlpha = 1;
}

// Where to go when it is off screen: a pulsing pixel arrow on the screen edge, pointing at the open doors or the
// portal. (Rooms are barely bigger than the screen, so a minimap mostly covered the corner without telling much.)
function arrowAt(sx, sy, ang, col) {
  hc.save(); hc.translate(Math.round(sx), Math.round(sy)); hc.rotate(Math.round(ang / (Math.PI / 4)) * (Math.PI / 4)); // 8 directions keep it on the grid
  const tri = (k, c) => { hc.fillStyle = c; hc.beginPath(); hc.moveTo(7 + k, 0); hc.lineTo(-4 - k, -6 - k); hc.lineTo(-4 - k, 6 + k); hc.closePath(); hc.fill(); };
  tri(2, LEAD); tri(0, col); hc.restore();
}
function drawGuides() {
  const targets = [];
  if (G.doors.length) targets.push([G.doors.reduce((a, d) => a + d.x + d.w / 2, 0) / G.doors.length, G.doors.reduce((a, d) => a + d.y + d.h / 2, 0) / G.doors.length, '#f4ecd8']);
  if (G.portal) targets.push([G.portal.x, G.portal.y, '#5fc3ff']);
  for (const [tx, ty, col] of targets) {
    const sx = (tx - G.cam.x) / PX, sy = (ty - G.cam.y) / PX;
    if (sx > 0 && sx < HW && sy > 0 && sy < HH) continue; // on screen: the thing itself is the guide
    const cx = HW / 2, cy = HH / 2, ang = Math.atan2(sy - cy, sx - cx), m = 14;
    const k = Math.min((HW / 2 - m) / Math.abs(Math.cos(ang) || 1e-6), (HH / 2 - m) / Math.abs(Math.sin(ang) || 1e-6));
    hc.globalAlpha = 0.65 + 0.35 * Math.sin(G.time * 6);
    arrowAt(cx + Math.cos(ang) * k, cy + Math.sin(ang) * k, ang, col);
    hc.globalAlpha = 1;
  }
}

// Challenge room: seconds left and hits taken, top centre (red once the hit budget is gone)
function drawChallenge() {
  const C = G.room?.challenge;
  if (!C || G.room.cleared) return;
  const over = C.hits > ROOM_RULES.challengeHits, s = `${Math.max(0, C.left).toFixed(1)} · ` + tr(`โดน ${C.hits}/${ROOM_RULES.challengeHits}`, `Hits ${C.hits}/${ROOM_RULES.challengeHits}`);
  text(s, HW / 2, 16, { size: 18, weight: 800, color: over ? '#ff6b5f' : '#ffd35a', align: 'center' });
}
export function drawHud() {
  if (G.run.over) return; // the death/clear screen takes over; a stale HP bar behind it only confuses
  beginPixels();
  drawPlayerPane(); drawBossBar(); drawSkillSlots(); drawGuides(); drawChallenge();
  endPixels();
}
