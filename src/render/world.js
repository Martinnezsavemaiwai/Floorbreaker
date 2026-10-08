// Drawing the live world: terrain, telegraphs, y-sorted actors, effects, fog and screen tint.
import { G, rage } from '../world/state.ts';
import { W, H, WORLD, TOWN_X, ROOM_X, DOOR, TORCHES } from '../world/constants.ts';
import { PLAYER } from '../data/player.ts';
import { MOVES } from '../data/bosses.ts';
import { MERCHANT } from '../data/shop.ts';
import { SKILLS } from '../data/skills.ts';
import { keyLabel } from '../core/input.ts';
import { nearMerchant } from '../systems/shop.js';
import { IMG } from '../core/assets.ts';
import { settings } from '../core/save.ts';
import { clamp } from '../core/math.ts';
import { burst } from '../systems/fx.js';
import { ctx, frame, shadow, dirCol, FT, sword as drawSword } from './canvas.js';
import { bg, vig } from './terrain.js';
import { drawHud } from './hud.js';

const SWING = PLAYER.attack.swing;

function drawMob(m) {
  const { time } = G, M = m.def;
  shadow(m.x, m.y, m.r);
  // wind-up: shake + red flash; lunge: hop toward the target
  const jit = m.wind > 0 ? Math.sin(time * 70) * 2 : 0, hop = m.lunge > 0 ? Math.sin((m.lunge / M.lunge) * Math.PI) * 12 : 0;
  const x = Math.round(m.x + jit + Math.cos(m.face) * hop), y = Math.round(m.y + Math.sin(m.face) * hop);
  // reduced-flash mode: no white/blink frames, the steady red glow + "!" carry the wind-up
  const flash = settings.flash && (m.hurt > 0 || (m.wind > 0 && Math.floor(time * 16) % 2 === 0));
  const img = flash ? IMG[M.white] : IMG[M.img], k = M.scale ?? 1;
  ctx.save();
  if (m.wind > 0 && m.hurt <= 0) { ctx.shadowColor = '#ff2020'; ctx.shadowBlur = 14; }
  else if (M.armor && m.armorT <= 0) { ctx.shadowColor = '#9fd8ff'; ctx.shadowBlur = 10; } // steady blue rim = guard up
  if (M.kind === 'beast') {
    const f = Math.floor(time * 6 + m.sx) % 2, s = 48 * k; // sheet faces left
    ctx.translate(x, y); if (Math.cos(m.face) > 0) ctx.scale(-1, 1);
    const c = img.height; // square frames, two side by side
    ctx.drawImage(img, f * c, 0, c, c, -s / 2, -s * 0.6, s, s);
  } else {
    const row = m.wind > 0 || m.lunge > 0 ? 4 : Math.floor(time * 8 + m.sx) % 4;
    frame(img, dirCol(m.face), row, x, y, 3 * k);
  }
  ctx.restore();
  if (M.armor) drawGuard(m, x, y - 30 * k - 14);
  if (m.wind > 0 && M.ranged) { // aim line toward the player, brighter as the shot gets close
    const P = G.P, k = 1 - m.wind / M.wind;
    ctx.save(); ctx.strokeStyle = `rgba(255,70,70,${0.3 + 0.6 * k})`; ctx.lineWidth = 3; ctx.setLineDash([8, 6]);
    ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(m.x + (P.x - m.x) * k, m.y + (P.y - m.y) * k); ctx.stroke(); ctx.restore();
  }
  if (m.wind > 0) { ctx.fillStyle = '#ff4040'; ctx.font = '900 18px system-ui'; ctx.textAlign = 'center'; ctx.fillText('!', x, y - 36); }
  if (m.hp < m.maxHp) {
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(m.x - 18, m.y - 44, 36, 5);
    ctx.fillStyle = '#ff4d4d'; ctx.fillRect(m.x - 18, m.y - 44, 36 * m.hp / m.maxHp, 5);
  }
}

function drawBoss() {
  const { boss: b, F, time } = G;
  const attacking = b.act && b.act !== 'charge', winding = (b.act === 'slam' || b.act === 'quake' || b.act === 'charge');
  if (F.boss.tree) { ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(b.x, b.y + b.r * 0.55, b.r * 1.4, b.r * 0.45, 0, 0, 7); ctx.fill(); }
  else shadow(b.x, b.y, b.r, 1 - b.z / 320);
  const jit = winding || b.act === 'roots' ? Math.sin(time * 60) * 3 : 0;
  if (F.boss.tree) { // the treant sways, swells while winding up, and glows red with rage
    const swell = winding || b.act === 'roots' ? 1 + 0.06 * Math.sin(time * 20) : 1;
    ctx.save(); ctx.translate(b.x + jit, b.y + b.r * 0.6); ctx.rotate(Math.sin(time * 1.6) * 0.04); ctx.scale(swell, 1 / swell);
    if (rage()) { ctx.shadowColor = '#ff4020'; ctx.shadowBlur = 30; }
    const img = b.hurt > 0 && settings.flash ? IMG.treantWhite : IMG[rage() ? F.boss.rageImg : F.boss.img];
    ctx.drawImage(img, -img.width / 2, -img.height);
    ctx.restore();
    return;
  }
  ctx.save(); if (rage()) { ctx.shadowColor = '#ffb300'; ctx.shadowBlur = 25; }
  const img = b.hurt > 0 && settings.flash ? IMG[F.boss.img + 'White'] : IMG[rage() ? F.boss.rageImg : F.boss.img];
  frame(img, dirCol(b.ang), attacking ? 4 : Math.floor(time * 5) % 4, b.x + jit, b.y - b.z, F.boss.scale);
  ctx.restore();
}

// Town merchant: idles facing down; name tag always, the key prompt only when close enough to open the shop
function drawMerchant() {
  const { x, y } = MERCHANT;
  shadow(x, y, 14);
  frame(IMG.merchant, 0, Math.floor(G.time * 2) % 2 ? 0 : 2, x, y, 3);
  ctx.textAlign = 'center'; ctx.font = `700 13px ${FT}`; ctx.lineJoin = 'round'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.8)';
  const tag = nearMerchant() ? `[${keyLabel('interact')}] ร้านค้า` : 'ร้านค้า';
  ctx.strokeText(tag, x, y - 34); ctx.fillStyle = nearMerchant() ? '#ffe14d' : '#fff'; ctx.fillText(tag, x, y - 34);
}

// Guard pip over armored mobs: a shield while it holds, a draining bar while it's broken
function drawGuard(m, x, y) {
  ctx.save();
  if (m.armorT <= 0) {
    ctx.fillStyle = '#cfe8ff'; ctx.strokeStyle = '#2b4a6a'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x - 7, y - 7); ctx.lineTo(x + 7, y - 7); ctx.lineTo(x + 6, y + 2); ctx.lineTo(x, y + 8); ctx.lineTo(x - 6, y + 2); ctx.closePath();
    ctx.fill(); ctx.stroke();
  } else {
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(x - 14, y - 2, 28, 4);
    ctx.fillStyle = '#9fd8ff'; ctx.fillRect(x - 14, y - 2, 28 * (1 - m.armorT / m.def.armor.regen), 4);
  }
  ctx.restore();
}

function drawShots() {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const s of G.shots) {
    ctx.shadowColor = s.col; ctx.shadowBlur = 14; ctx.fillStyle = s.col;
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 0.45, 0, 7); ctx.fill();
  }
  ctx.restore();
}

function drawTelegraph() {
  const b = G.boss;
  if (!b.act || b.hp <= 0) return;
  const p = 1 - b.t / b.tMax, pulse = 0.5 + 0.5 * Math.sin(G.time * 30);
  ctx.save();
  ctx.strokeStyle = `rgba(255,60,60,${0.5 + pulse * 0.4})`; ctx.lineWidth = 3; ctx.fillStyle = 'rgba(255,40,40,.28)';
  const circle = (x, y, r) => {
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, r * p, 0, 7); ctx.fill();
  };
  if (b.act === 'slam') circle(b.x, b.y, MOVES.slam.radius);
  else if (b.act === 'charge') {
    ctx.translate(b.x, b.y); ctx.rotate(b.ang);
    ctx.strokeRect(0, -b.r, MOVES.charge.length, b.r * 2); ctx.fillRect(0, -b.r, MOVES.charge.length * p, b.r * 2);
  } else if (b.act === 'leap') circle(b.to.x, b.to.y, MOVES.leap.radius);
  else if (b.act === 'roots') for (const s of b.spots) circle(s.x, s.y, MOVES.roots.radius);
  else if (b.act === 'quake') {
    ctx.strokeStyle = `rgba(200,80,255,${0.5 + pulse * 0.5})`; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(b.x, b.y, 50 + 30 * p, 0, 7); ctx.stroke();
  } else if (b.act === 'volley') { // a short spoke along each shot's path, growing as the wind-up runs out
    ctx.lineWidth = 6; ctx.lineCap = 'round';
    for (const a of b.angs) {
      ctx.beginPath(); ctx.moveTo(b.x + Math.cos(a) * b.r, b.y + Math.sin(a) * b.r);
      ctx.lineTo(b.x + Math.cos(a) * (b.r + 30 + 90 * p), b.y + Math.sin(a) * (b.r + 30 + 90 * p)); ctx.stroke();
    }
  } else if (b.act === 'wave') {
    ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(200,90,255,.8)'; ctx.lineWidth = 24;
    ctx.shadowColor = '#c060ff'; ctx.shadowBlur = 20;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.waveR, 0, 7); ctx.stroke();
  }
  ctx.restore();
}

// Horizontal Square: a golden ring sweeping round; Vorpal Strike: aim line while winding up, then the stab beam
function drawSkillFx(P) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  if (P.spin > 0) {
    const R = SKILLS.horizontal.radius, k = 1 - P.spin / 0.25;
    ctx.shadowColor = '#ffcf6a'; ctx.shadowBlur = 20; ctx.strokeStyle = `rgba(255,215,130,${1 - k * 0.6})`; ctx.lineWidth = 14;
    ctx.beginPath(); ctx.arc(P.x, P.y, R * (0.6 + 0.4 * k), P.ang, P.ang + Math.PI * 2 * Math.min(1, k * 1.6)); ctx.stroke();
  }
  const V = SKILLS.vorpal, cx = Math.cos(P.thrustAng), cy = Math.sin(P.thrustAng);
  if (P.thrust > 0) {
    ctx.strokeStyle = `rgba(255,140,90,${0.4 + 0.5 * (1 - P.thrust / V.windup)})`; ctx.lineWidth = 3; ctx.setLineDash([10, 6]);
    ctx.beginPath(); ctx.moveTo(P.x, P.y); ctx.lineTo(P.x + cx * V.length, P.y + cy * V.length); ctx.stroke();
  }
  if (P.beam > 0) {
    ctx.shadowColor = '#ff9a5a'; ctx.shadowBlur = 24; ctx.strokeStyle = `rgba(255,200,140,${P.beam / 0.18})`; ctx.lineWidth = V.width * 0.7;
    ctx.beginPath(); ctx.moveTo(P.x, P.y); ctx.lineTo(P.x + cx * V.length, P.y + cy * V.length); ctx.stroke();
  }
  ctx.restore();
}

function swordAngle(P) {
  if (P.swing > 0) { const k = 1 - P.swing / SWING, e = 1 - (1 - k) ** 3; return P.ang + P.swingDir * (-1.3 + 2.6 * e); }
  if (P.dash > 0) return P.ang;
  if (P.thrust > 0 || P.beam > 0) return P.thrustAng; // blade pointed down the stab line
  if (P.spin > 0) return P.ang + Math.PI * 2 * (1 - P.spin / 0.25);
  if (P.delay > 0) return P.ang + P.swingDir * 1.4; // follow-through pose after the skill
  return P.ang + P.swingDir * -0.5 + Math.sin(G.time * 3) * 0.05;
}
function drawPlayer() {
  const P = G.P, time = G.time;
  if (P.hp <= 0) return;
  // Sword Skill light trail
  if (P.trail.length > 1) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.shadowColor = '#7fd4ff'; ctx.shadowBlur = 20;
    for (let i = 1; i < P.trail.length; i++) {
      const a = P.trail[i - 1], b = P.trail[i];
      ctx.strokeStyle = `rgba(127,212,255,${b.t * 3})`; ctx.lineWidth = 22 * b.t * 4;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    ctx.restore();
  }
  shadow(P.x, P.y, P.r);
  drawSkillFx(P);
  const skillFx = P.delay > 0 || P.dash > 0 || P.thrust > 0, col = dirCol(P.ang), sa = swordAngle(P);
  const hx = P.x + Math.cos(P.ang) * 6, hy = P.y + 4 + Math.sin(P.ang) * 4; // hand
  const sword = () => {
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(sa - Math.PI / 2); // sprite has the grip on top, blade pointing down
    if (skillFx || P.swing > 0) { ctx.shadowColor = '#7fd4ff'; ctx.shadowBlur = skillFx ? 18 : 8; }
    drawSword(42); ctx.restore();
  };
  // Swing arc that follows the blade tip
  if (P.swing > 0) {
    const start = P.ang - P.swingDir * 1.3;
    const fin = P.finisher, a = 0.3 + P.swing / SWING * 0.7; // the combo finisher gets a wider, golden arc
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.shadowColor = fin ? '#ffcf6a' : '#bfe8ff'; ctx.shadowBlur = fin ? 26 : 18; ctx.lineCap = 'round';
    ctx.strokeStyle = fin ? `rgba(255,215,130,${a})` : `rgba(220,240,255,${a})`; ctx.lineWidth = fin ? 16 : 10;
    ctx.beginPath(); ctx.arc(hx, hy, fin ? 54 : 40, Math.min(start, sa), Math.max(start, sa)); ctx.stroke();
    ctx.restore();
  }
  const behind = Math.sin(sa) < -0.3; // blade pointing up = behind the body
  if (behind) sword();
  ctx.save();
  if (skillFx) { ctx.shadowColor = P.delay > 0 ? '#ffb347' : '#7fd4ff'; ctx.shadowBlur = 22; }
  const row = P.swing > 0 || P.dash > 0 ? 4 : P.moving ? Math.floor(time * 10) % 4 : 0;
  const bob = P.moving && P.swing <= 0 ? Math.abs(Math.sin(time * 20)) * -2 : 0;
  if (P.inv > 0) ctx.globalAlpha = settings.flash && Math.floor(time * 20) % 2 ? 0.35 : 0.65; // i-frame blink (steady when flashing is off)
  if (P.roll > 0) { // roll: squashed, see-through, legs spinning fast
    ctx.globalAlpha = 0.6; ctx.translate(P.x, P.y + 6); ctx.scale(1.1, 0.8); ctx.translate(-P.x, -P.y - 6);
    frame(IMG.player, dirCol(P.rollAng), Math.floor(time * 30) % 4, P.x, P.y, 3);
  } else frame(P.hurt > 0.15 && settings.flash ? IMG.playerWhite : IMG.player, col, row, P.x, P.y + bob, 3);
  ctx.restore();
  if (!behind) sword();
}

function drawTorches() {
  const torch = G.F.torch;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const [x, y] of TORCHES) {
    const r = 110 + Math.sin(G.time * 9 + x) * 8 + Math.random() * 4;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${torch},.35)`); g.addColorStop(1, `rgba(${torch},0)`);
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.fillStyle = `rgb(${torch})`; ctx.beginPath(); ctx.ellipse(x, y - 4, 4, 7 + Math.random() * 2, 0, 0, 7); ctx.fill();
  }
  ctx.restore();
}
function drawDoor() {
  if (!G.doorClosed) return;
  ctx.save(); ctx.shadowColor = '#ff3030'; ctx.shadowBlur = 20;
  ctx.fillStyle = `rgba(200,30,30,${0.6 + 0.2 * Math.sin(G.time * 6)})`; ctx.fillRect(DOOR.x, DOOR.y, DOOR.w, DOOR.h);
  ctx.strokeStyle = '#ff8a80'; ctx.lineWidth = 2;
  for (let y = DOOR.y + 10; y < DOOR.y + DOOR.h; y += 20) { ctx.beginPath(); ctx.moveTo(DOOR.x, y); ctx.lineTo(DOOR.x + DOOR.w, y); ctx.stroke(); }
  ctx.restore();
}
function drawPortal() {
  const portal = G.portal;
  if (!portal) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(portal.x, portal.y);
  for (let i = 0; i < 3; i++) {
    ctx.rotate(G.time * (1 + i * 0.5));
    ctx.strokeStyle = `rgba(127,212,255,${0.5 - i * 0.12})`; ctx.lineWidth = 6 - i;
    ctx.beginPath(); ctx.ellipse(0, 0, 44 - i * 10, 30 - i * 6, 0, 0, 5); ctx.stroke();
  }
  ctx.restore();
  if (Math.random() < 0.3) burst(portal.x, portal.y, 1, '#8fe3ff', 80, 0.8, 5, true);
}
function drawFx() {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const p of G.parts) {
    ctx.globalAlpha = clamp(p.t / p.life, 0, 1); ctx.fillStyle = p.col;
    if (p.shard) {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.beginPath();
      ctx.moveTo(0, -p.size); ctx.lineTo(p.size * 0.45, 0); ctx.lineTo(0, p.size); ctx.lineTo(-p.size * 0.45, 0); ctx.fill(); ctx.restore();
    } else ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  for (const r of G.rings) {
    const k = 1 - r.t / r.life; ctx.globalAlpha = r.t / r.life;
    ctx.strokeStyle = `rgb(${r.col})`; ctx.lineWidth = 6 * (1 - k) + 1;
    ctx.beginPath(); ctx.arc(r.x, r.y, r.r0 + (r.r1 - r.r0) * k, 0, 7); ctx.stroke();
  }
  ctx.restore();
  ctx.textAlign = 'center'; ctx.lineJoin = 'round';
  for (const t of G.texts) {
    const pop = 1 + Math.max(0, (t.t - 0.65) / 0.15) * 0.6;
    ctx.globalAlpha = clamp(t.t / 0.3, 0, 1);
    ctx.font = `900 ${Math.round((t.big ? 22 : 16) * pop)}px system-ui`;
    ctx.strokeStyle = 'rgba(0,0,0,.8)'; ctx.lineWidth = 4; ctx.strokeText(t.s, t.x, t.y);
    ctx.fillStyle = t.col; ctx.fillText(t.s, t.x, t.y);
  }
  ctx.globalAlpha = 1;
}
function drawFog() { // two drifting layers of the fog texture over the field
  ctx.save(); ctx.beginPath(); ctx.rect(TOWN_X, 0, ROOM_X - TOWN_X, WORLD.h); ctx.clip();
  for (const [speed, alpha] of [[14, 0.3], [-22, 0.18]]) {
    ctx.globalAlpha = alpha; const fw = 960, fh = 528, ox = ((G.time * speed) % fw + fw) % fw;
    for (let x = TOWN_X - fw + ox; x < ROOM_X; x += fw) for (let y = 0; y < WORLD.h; y += fh) ctx.drawImage(IMG.fog, x, y, fw, fh);
  }
  ctx.restore();
}
function drawDanger() { // red edge on hits and at low HP (steady instead of pulsing when flashing is off)
  const P = G.P, low = P.hp / P.maxHp < 0.25, fl = settings.flash;
  const danger = P.hurt > 0 ? P.hurt / 0.25 * (fl ? 0.35 : 0.15) : low ? (fl ? 0.12 + 0.1 * Math.sin(G.time * 6) : 0.18) : 0;
  if (danger <= 0) return;
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.6);
  g.addColorStop(0, 'rgba(255,0,0,0)'); g.addColorStop(1, `rgba(255,0,0,${danger})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

export function drawWorld() {
  const { P, cam } = G;
  cam.x = clamp(P.x - W / 2, 0, WORLD.w - W); cam.y = clamp(P.y - H / 2, 0, WORLD.h - H);
  ctx.imageSmoothingEnabled = false;
  const sx = (Math.random() - 0.5) * G.shake, sy = (Math.random() - 0.5) * G.shake;
  ctx.save(); ctx.translate(Math.round(-cam.x + sx), Math.round(-cam.y + sy));
  ctx.drawImage(bg, 0, 0);
  drawTorches(); drawDoor(); drawPortal(); drawTelegraph();
  // y-sort so whoever is lower on screen is drawn in front
  const actors = G.mobs.filter(m => m.hp > 0).map(m => ({ y: m.y, draw: () => drawMob(m) }));
  actors.push({ y: P.y, draw: drawPlayer }, { y: MERCHANT.y, draw: drawMerchant });
  if (G.boss.hp > 0) actors.push({ y: G.boss.y, draw: drawBoss });
  for (const a of actors.sort((a, b) => a.y - b.y)) a.draw();
  drawShots();
  drawFx();
  if (G.F.fog) drawFog();
  ctx.restore();
  ctx.drawImage(vig, 0, 0);
  drawDanger();
  drawHud();
}
