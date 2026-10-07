// Canvas HUD: SAO-style player panel, stacked boss HP bars, skill slots and the minimap.
import { G, rage } from '../world/state.ts';
import { W, H, WORLD, TOWN_X, ROOM_X, DOOR } from '../world/constants.ts';
import { PLAYER } from '../data/player.ts';
import { SKILLS } from '../data/skills.ts';
import { IMG } from '../core/assets.ts';
import { on } from '../core/events.ts';
import { keyLabel } from '../core/input.ts';
import { clamp } from '../core/math.ts';
import { ctx, FN, FT } from './canvas.js';

const A = PLAYER.attack;
// slot icon per skill: blade angle and glow colour
const ICON = { attack: [Math.PI / 4, null], sonicLeap: [-Math.PI / 4, '#5fc3ff'], horizontal: [Math.PI / 2, '#ffcf6a'], vorpal: [0, '#ff8a5a'] };

// SAO-style slanted HP bar with a white "damage lag" segment
function slant(x, y, w, h) {
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w - h * 0.8, y + h); ctx.lineTo(x, y + h); ctx.closePath();
}
function hpBar(x, y, w, h, frac, lag) {
  slant(x, y, w, h); ctx.fillStyle = 'rgba(8,12,20,.85)'; ctx.fill();
  ctx.save(); ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fillRect(x, y, w * clamp(lag, 0, 1), h);
  const col = frac > 0.5 ? ['#a6ff8a', '#3fbf3f'] : frac > 0.25 ? ['#ffe58a', '#d4a017'] : ['#ff9a8a', '#d42f2f'];
  const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, col[0]); g.addColorStop(1, col[1]);
  ctx.fillStyle = g; ctx.fillRect(x, y, w * clamp(frac, 0, 1), h);
  ctx.restore();
  slant(x, y, w, h); ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.5; ctx.stroke();
}
// Small text over the world gets a dark outline so it reads on bright grass and stone
function label(text, x, y, color, font) {
  ctx.font = font; ctx.lineJoin = 'round'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.85)';
  ctx.strokeText(text, x, y); ctx.fillStyle = color; ctx.fillText(text, x, y);
}
function panel(x, y, w, h, r = 10) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = 'rgba(10,14,24,.78)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1; ctx.stroke();
}

function drawPlayerPanel() {
  const { P, F } = G;
  slant(14, 14, 404, 60); ctx.fillStyle = 'rgba(10,14,24,.78)'; ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.lineWidth = 1; ctx.stroke();
  // level badge
  ctx.beginPath(); ctx.arc(46, 44, 21, 0, 7); ctx.fillStyle = '#f39a1d'; ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.stroke();
  ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = `700 10px ${FN}`; ctx.fillText('LV', 46, 36);
  ctx.font = `800 17px ${FN}`; ctx.fillText(String(P.lv), 46, 54);
  ctx.textAlign = 'left'; ctx.font = `700 14px ${FN}`; ctx.fillStyle = '#fff'; ctx.fillText('PLAYER', 78, 33);
  hpBar(78, 39, 316, 15, P.hp / P.maxHp, P.lag / P.maxHp);
  ctx.textAlign = 'right'; ctx.font = `700 13px ${FN}`; ctx.fillStyle = '#fff';
  ctx.fillText(`${Math.max(0, Math.ceil(P.hp))} / ${P.maxHp}`, 380, 33);
  ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(78, 59, 240, 3);
  ctx.fillStyle = '#5fc3ff'; ctx.fillRect(78, 59, 240 * P.xp / PLAYER.xpToNext(P.lv), 3);
  const zone = P.x < TOWN_X ? ['SAFE ZONE · HP ฟื้นฟู', '#9fe89f'] : P.x > ROOM_X ? ['BOSS ROOM', '#ff8a7a'] : ['FIELD', '#cfd8e6'];
  ctx.textAlign = 'left'; label(`${F.name} · ${zone[0]}`, 22, 92, zone[1], `600 13px ${FT}`);
  label(`${P.col} Col`, 22, 110, '#ffe14d', `700 13px ${FN}`);
}

function drawBossBar() {
  const { boss, F } = G;
  if (!boss.awake || boss.hp <= 0) return;
  // SAO bosses show several stacked HP bars: one drains at a time, pips count the ones left
  const bars = F.boss.bars, seg = boss.maxHp / bars, left = Math.ceil(boss.hp / seg);
  const frac = (boss.hp - (left - 1) * seg) / seg, lag = boss.lag > left * seg ? 1 : (boss.lag - (left - 1) * seg) / seg;
  const w = 440, x = (W - w) / 2, y = H - 118; // bottom centre, above the skill slots
  panel(x - 12, y - 28, w + 24, 60, 10); // backing plate so the bar reads over any floor
  ctx.textAlign = 'center'; label(F.boss.name, W / 2, y - 9, rage() ? '#ffd760' : '#fff', `700 14px ${FN}`);
  hpBar(x, y, w, 14, frac, lag);
  // pips = bars still to go after this one (filled) / already broken (hollow)
  for (let i = 0; i < bars; i++) {
    slant(x + i * 26, y + 20, 22, 7);
    if (i < left - 1) { ctx.fillStyle = '#ff6a4d'; ctx.fill(); }
    else { ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 1; ctx.stroke(); }
  }
  ctx.textAlign = 'right'; label(`×${left}`, x + w, y + 27, '#fff', `800 12px ${FN}`);
}

function drawFlask(x, y, full) {
  ctx.save(); ctx.globalAlpha = full ? 1 : 0.35;
  ctx.fillStyle = '#e8eef7'; ctx.fillRect(x - 4, y - 18, 8, 7);                  // neck
  ctx.beginPath(); ctx.arc(x, y, 11, 0, 7); ctx.fillStyle = '#e8eef7'; ctx.fill(); // glass
  ctx.beginPath(); ctx.arc(x, y + 1, 8.5, 0, 7); ctx.fillStyle = '#ff5a6a'; ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(x - 5, y - 4, 3, 5);       // shine
  ctx.restore();
}

function drawSkillSlots() {
  const P = G.P, s = 56, gap = 18, y = H - s - 18;
  const skill = (slot, action) => {
    const id = P.skills[slot], S = SKILLS[id], cd = P.skillCd[slot];
    return { key: keyLabel(action), label: S.short, cd: Math.max(0, cd) / S.cd, glow: cd <= 0, secs: cd, icon: id };
  };
  const slots = [
    { key: keyLabel('attack'), label: 'ฟัน', cd: Math.max(0, P.atkCd) / A.cd, glow: false, icon: 'attack' },
    skill(0, 'skill'), ...(P.skills[1] ? [skill(1, 'skill2')] : []),
    { key: keyLabel('potion'), label: `Potion ×${P.potions}`, cd: 0, glow: false, potion: true },
  ];
  const x0 = W / 2 - (slots.length * s + (slots.length - 1) * gap) / 2;
  slots.forEach((sl, i) => {
    const x = x0 + i * (s + gap), cx = x + s / 2, cy = y + s / 2;
    ctx.save();
    if (sl.glow) { ctx.shadowColor = '#f39a1d'; ctx.shadowBlur = 16; }
    panel(x, y, s, s, 12); ctx.restore();
    if (sl.glow) { ctx.beginPath(); ctx.roundRect(x, y, s, s, 12); ctx.strokeStyle = '#f39a1d'; ctx.lineWidth = 2; ctx.stroke(); }
    if (sl.potion) drawFlask(cx, cy + 4, P.potions > 0);
    else {
      const [rot, glow] = ICON[sl.icon];
      ctx.save(); ctx.translate(cx, cy + 2); ctx.rotate(rot);
      if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = 10; }
      ctx.drawImage(IMG.sword, -7, -16, 14, 28); ctx.restore();
    }
    if (sl.cd > 0) { // radial cooldown sweep
      ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, s, s, 12); ctx.clip();
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, s, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * sl.cd); ctx.closePath();
      ctx.fillStyle = 'rgba(0,0,0,.75)'; ctx.fill(); ctx.restore();
      if (sl.secs > 0.05) {
        ctx.textAlign = 'center'; ctx.font = `800 18px ${FN}`; ctx.lineJoin = 'round';
        ctx.strokeStyle = 'rgba(0,0,0,.9)'; ctx.lineWidth = 4; ctx.strokeText(sl.secs.toFixed(1), cx, cy + 7);
        ctx.fillStyle = '#fff'; ctx.fillText(sl.secs.toFixed(1), cx, cy + 7);
      }
    }
    ctx.font = `800 11px ${FN}`;
    const kw = Math.max(18, ctx.measureText(sl.key).width + 8); // wider badge for long names like Shift
    ctx.beginPath(); ctx.roundRect(x + 4, y + 4, kw, 16, 4); ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fill();
    ctx.textAlign = 'center'; ctx.font = `800 11px ${FN}`; ctx.fillStyle = '#2b313b'; ctx.fillText(sl.key, x + 4 + kw / 2, y + 16);
    label(sl.label, cx, y + s + 14, '#fff', `600 12px ${FT}`);
  });
}

// Minimap: static terrain is pre-rendered per floor, dots are drawn live
const mm = document.createElement('canvas'), MM = 0.1; mm.width = WORLD.w * MM; mm.height = WORLD.h * MM;
function paintMinimap() {
  const g = mm.getContext('2d');
  g.fillStyle = ['#7fa846', '#4f8f3d', '#3c5b47', '#3f7f9a'][G.floorIdx] ?? '#5a7a4a'; g.fillRect(0, 0, mm.width, mm.height);
  g.fillStyle = '#a07a4c'; g.fillRect(TOWN_X * MM, 560 * MM, (ROOM_X - TOWN_X) * MM, 80 * MM);
  g.fillStyle = '#c9a56e'; g.fillRect(0, 0, TOWN_X * MM, mm.height);
  g.fillStyle = '#4a3a44'; g.fillRect(ROOM_X * MM, 0, (WORLD.w - ROOM_X) * MM, mm.height);
  g.fillStyle = '#1f2a22'; for (const w of G.WALLS) g.fillRect(w.x * MM, w.y * MM, Math.max(2, w.w * MM), Math.max(2, w.h * MM));
  g.fillStyle = '#3d8fd0'; for (const p of G.F.ponds ?? []) g.fillRect(p.x * MM, p.y * MM, p.w * MM, p.h * MM);
}
on('floorLoaded', paintMinimap);
function drawMinimap() {
  const { P, boss, portal, F } = G, w = mm.width, h = mm.height, x = W - w - 16, y = 16;
  panel(x - 6, y - 6, w + 12, h + 30, 10);
  ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, w, h, 6); ctx.clip();
  ctx.globalAlpha = 0.9; ctx.drawImage(mm, x, y); ctx.globalAlpha = 1;
  if (G.doorClosed) { ctx.fillStyle = '#ff4a3a'; ctx.fillRect(x + DOOR.x * MM, y + DOOR.y * MM, DOOR.w * MM, DOOR.h * MM); }
  ctx.fillStyle = '#ff5a4a'; for (const m of G.mobs) if (m.hp > 0) ctx.fillRect(x + m.x * MM - 1.5, y + m.y * MM - 1.5, 3, 3);
  if (boss.hp > 0) {
    const r = 4 + (boss.awake ? Math.sin(G.time * 6) : 0);
    ctx.beginPath(); ctx.arc(x + boss.x * MM, y + boss.y * MM, r, 0, 7); ctx.fillStyle = '#ff2d2d'; ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke();
  }
  if (portal) { ctx.beginPath(); ctx.arc(x + portal.x * MM, y + portal.y * MM, 4, 0, 7); ctx.fillStyle = '#5fc3ff'; ctx.fill(); }
  ctx.save(); ctx.translate(x + P.x * MM, y + P.y * MM); ctx.rotate(P.ang);
  ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-4, -4); ctx.lineTo(-2, 0); ctx.lineTo(-4, 4); ctx.closePath();
  ctx.fillStyle = '#fff'; ctx.fill(); ctx.restore();
  ctx.restore();
  ctx.textAlign = 'left'; ctx.font = `600 11px ${FT}`; ctx.fillStyle = '#e8eef7'; ctx.fillText(`${F.name} · ${F.town}`, x, y + h + 16);
}

export function drawHud() {
  if (G.run.over) return; // the death/clear screen takes over; a stale HP bar behind it only confuses
  drawPlayerPanel(); drawBossBar(); drawSkillSlots(); drawMinimap();
}
