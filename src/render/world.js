// Drawing the live world: terrain, telegraphs, y-sorted actors, effects, fog and screen tint.
import { G, rage } from '../world/state.ts';
import { tr, t } from '../core/i18n.ts';
import { kindOf, ELITE_MOD_NAME, actOf } from '../data/run.ts';
import { W, H } from '../world/constants.ts';
import { PLAYER } from '../data/player.ts';
import { MOVES, BOSS_RULES, ARENA } from '../data/bosses.ts';
import { SKILLS } from '../data/skills.ts';
import { keyLabel } from '../core/input.ts';
import { nearMerchant } from '../systems/shop.js';
import { nearShrine } from '../systems/shrine.js';
import { IMG } from '../core/assets.ts';
import { settings } from '../core/save.ts';
import { clamp } from '../core/math.ts';
import { burst } from '../systems/fx.js';
import { ctx, frame, shadow, dirCol, FN, FT, sword as drawSword } from './canvas.js';
import { bg, vig } from './terrain.js';
import { emit } from '../core/events.ts';
import { dominantElement } from '../systems/build.js';
import { setActive } from '../systems/elements.js';
import { ELEMENTS, ELEMENT_IDS } from '../data/elements.ts';
import { tallProps, drawTall } from './props.js';
import { drawHud } from './hud.js';
import { scenes } from '../core/app.ts';
import { pose, applyPose, REDUCED } from './anim.js';

const SWING = PLAYER.attack.swing;

// Render-side motion from the per-frame position change (entities carry no velocity field); kept in e.anim
function motion(e) {
  const a = e.anim ??= {};
  if (a.t === undefined) Object.assign(a, { t: G.time, x: e.x, y: e.y, vx: 0, mv: false });
  const dt = G.time - a.t;
  if (dt > 0) {
    const dx = e.x - a.x;
    Object.assign(a, { vx: dx / dt, mv: Math.hypot(dx, e.y - a.y) > 0.3, t: G.time, x: e.x, y: e.y });
  }
  return a;
}

function drawMob(m) {
  const { time } = G, M = m.def, dying = m.hp <= 0;
  if (m.sprout) {
    shadow(m.x, m.y, m.r); // a small green root shape that sways and shrinks as it withers
    const k = Math.min(1, m.life / 1.5), sw = Math.sin(time * 5 + m.sx) * 3;
    ctx.save(); ctx.translate(m.x, m.y); ctx.scale(k, k); ctx.lineCap = 'round';
    ctx.strokeStyle = m.hurt > 0 ? '#fff' : '#4f7a2c'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(-8, 0); ctx.quadraticCurveTo(-12 + sw, -16, -4, -28); ctx.moveTo(8, 0); ctx.quadraticCurveTo(12 + sw, -14, 5, -24); ctx.moveTo(0, 2); ctx.lineTo(sw, -32); ctx.stroke();
    ctx.fillStyle = '#9be05a'; ctx.beginPath(); ctx.arc(sw, -34, 5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    return;
  }
  // wind-up: shake + red flash; lunge: hop toward the target
  const mo = motion(m), pz = dying ? pose(m, 'mob', time, { reduced: REDUCED, dyingFor: time - m.anim.deadAt })
    : pose(m, 'mob', time, { reduced: REDUCED, vx: mo.vx, moving: mo.mv });
  shadow(m.x, m.y, m.r, pz.alpha);
  const jit = m.wind > 0 && !dying ? Math.sin(time * 70) * 2 : 0, hop = m.lunge > 0 ? Math.sin((m.lunge / M.lunge) * Math.PI) * 12 : 0;
  const x = Math.round(m.x + jit + Math.cos(m.face) * hop), y = Math.round(m.y + Math.sin(m.face) * hop);
  // reduced-flash mode: no white/blink frames, the steady red glow + "!" carry the wind-up
  const flash = settings.flash && !dying && (m.hurt > 0 || (m.wind > 0 && Math.floor(time * 16) % 2 === 0));
  const img = flash ? IMG[M.white] : IMG[M.img], k = M.scale ?? 1;
  ctx.save(); applyPose(ctx, x, y + m.r, pz);
  if (m.elite) { ctx.shadowColor = '#a688ff'; ctx.shadowBlur = 18; }
  if (m.wind > 0 && m.hurt <= 0) { ctx.shadowColor = '#ff2020'; ctx.shadowBlur = 14; }
  else if (M.armor && m.armorT <= 0) { ctx.shadowColor = '#9fd8ff'; ctx.shadowBlur = 10; } // steady blue rim = guard up
  const tint = m.frozen > 0 ? '#5ac8ff' : m.burn?.t > 0 ? '#ff963c' : m.poison?.t > 0 ? '#78ff96' : null; // element status rim
  if (tint && !(m.wind > 0 && m.hurt <= 0)) { ctx.shadowColor = tint; ctx.shadowBlur = 12; }
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
  if (dying) return;
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
  if (m.elite) { ctx.fillStyle = '#a688ff'; ctx.fillRect(m.x - 18, m.y - 50, 36, 3); }
  if (m.elite && m.mod) {
    ctx.save(); ctx.textAlign = 'center'; ctx.font = `700 12px ${FT}`; ctx.lineJoin = 'round'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.85)';
    const s = t(ELITE_MOD_NAME[m.mod]); ctx.strokeText(s, m.x, m.y - 56); ctx.fillStyle = '#c9b6ff'; ctx.fillText(s, m.x, m.y - 56); ctx.restore();
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
    // treant keeps its own sway/swell: only the hit recoil and stun sway come from the pose (pose is read with breathing/walk ignored)
    const bp = pose(b, 'boss', time, { reduced: REDUCED, kx: b.x - G.P.x, ky: b.y - G.P.y }), fx = b.hurt > 0 ? bp.ox : 0, fy = b.hurt > 0 ? bp.oy : 0;
    ctx.save(); ctx.translate(b.x + jit + fx, b.y + b.r * 0.6 + fy); ctx.rotate(Math.sin(time * 1.6) * 0.04 + (b.stun > 0 ? bp.rot : 0)); ctx.scale(swell, 1 / swell);
    if (rage()) { ctx.shadowColor = '#ff4020'; ctx.shadowBlur = 30; }
    const img = b.hurt > 0 && settings.flash ? IMG.treantWhite : IMG[rage() ? F.boss.rageImg : F.boss.img];
    ctx.drawImage(img, -img.width / 2, -img.height);
    ctx.restore();
    return;
  }
  const bm = motion(b), bp = pose(b, 'boss', time, { reduced: REDUCED, rage: rage(), vx: bm.vx, moving: bm.mv, kx: b.x - G.P.x, ky: b.y - G.P.y });
  ctx.save(); applyPose(ctx, b.x + jit, b.y - b.z + b.r, bp); if (rage()) { ctx.shadowColor = '#ffb300'; ctx.shadowBlur = 25; }
  const img = b.hurt > 0 && settings.flash ? IMG[F.boss.img + 'White'] : IMG[rage() ? F.boss.rageImg : F.boss.img];
  frame(img, dirCol(b.ang), attacking ? 4 : Math.floor(time * 5) % 4, b.x + jit, b.y - b.z, F.boss.scale);
  ctx.restore();
  if (b.stun > 0) { // stars circling above the head
    ctx.fillStyle = '#ffe14d'; ctx.font = '900 22px system-ui'; ctx.textAlign = 'center';
    for (let i = 0; i < 3; i++) { const a = time * 5 + i * 2.1; ctx.fillText('★', b.x + Math.cos(a) * b.r * 0.8, b.y - b.r * 2.2 + Math.sin(a) * 8); }
  }
}

// Town merchant / shop wanderer: faces the player, hops and tilts through a wave, speaks in a bubble; name tag always,
// the key prompt only when close enough to open the shop
const bubbles = []; // collected during the actor pass, drawn last so nothing paints over speech
function drawMerchant() {
  const { x, y } = G.L.merchant, M = G.npc.merchant;
  const mp = pose(G.L.merchant, 'npc', G.time, { reduced: REDUCED, moving: false });
  if (M.wave > 0) { // wave: one hop and a few tilts over 0.6 s, halved under reduced motion
    const p = 1 - M.wave / 0.6, k = REDUCED ? 0.5 : 1;
    mp.oy -= 6 * k * Math.sin(p * Math.PI); mp.rot += 0.12 * k * Math.sin(p * Math.PI * 4);
  }
  shadow(x, y, 14);
  ctx.save(); applyPose(ctx, x, y, mp);
  frame(IMG.merchant, M.face, Math.floor(G.time * 2) % 2 ? 0 : 2, x, y, 3);
  ctx.restore();
  ctx.textAlign = 'center'; ctx.font = `700 13px ${FT}`; ctx.lineJoin = 'round'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.8)';
  const name = tr('ร้านค้า', 'Shop'), tag = nearMerchant() ? `[${keyLabel('interact')}] ${name}` : name;
  ctx.strokeText(tag, x, y - 34); ctx.fillStyle = nearMerchant() ? '#ffe14d' : '#fff'; ctx.fillText(tag, x, y - 34);
  if (M.bubble && scenes.top?.name === 'play') bubbles.push([x, y - 52, M.bubble]);
}

function drawFolk(f) {
  const fp = pose(f, 'npc', G.time, { reduced: REDUCED, moving: f.moving });
  shadow(f.x, f.y, 12);
  ctx.save(); applyPose(ctx, f.x, f.y, fp);
  frame(IMG[f.sheet], f.face, f.moving ? Math.floor(G.time * 5) % 4 : Math.floor(G.time * 2) % 2 ? 0 : 2, f.x, f.y, 3);
  ctx.restore();
  if (f.bubble && scenes.top?.name === 'play') bubbles.push([f.x, f.y - 52, f.bubble]);
}

// Break a line into words (Thai has no spaces, so Intl.Segmenter finds the word edges), then into characters when
// a single word is still wider than the box
const seg = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter('th', { granularity: 'word' }) : null;
function wrapText(text, max) {
  const words = seg ? [...seg.segment(text)].map(s => s.segment) : text.split(/(?<= )/);
  const lines = []; let cur = '';
  const fits = s => ctx.measureText(s).width <= max;
  for (const w of words) {
    if (fits(cur + w)) { cur += w; continue; }
    if (cur) { lines.push(cur.trimEnd()); cur = ''; }
    for (const ch of w.trimStart()) { if (fits(cur + ch) || !cur) cur += ch; else { lines.push(cur); cur = ch; } }
  }
  if (cur.trim()) lines.push(cur.trimEnd());
  return lines;
}

// Speech bubble: dark glass box with a tail, wrapped to 240 px, kept inside the screen; wrapping is cached per text and language
function drawBubble(x, bottom, bubble) {
  ctx.save(); ctx.font = `700 16px ${FT}`; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  const text = t(bubble.text), key = text + '|' + settings.lang;
  if (bubble.wrap?.key !== key) { const lines = wrapText(text, 240); bubble.wrap = { key, lines, w: Math.max(...lines.map(l => ctx.measureText(l).width)) }; }
  const { lines, w } = bubble.wrap, bw = w + 20, bh = lines.length * 24 + 16;
  const bx = clamp(x - bw / 2, G.cam.x + 8, G.cam.x + W - 8 - bw);
  const P = G.P; // never cover the player's head: lift the bubble above it when the player stands under it, behind the speaker
  if (P.y < bottom + 52 && P.x > bx - 14 && P.x < bx + bw + 14) bottom = Math.min(bottom, P.y - 56);
  bottom = Math.max(bottom, G.cam.y + 8 + bh);
  const by = bottom - bh;
  ctx.fillStyle = 'rgba(16,17,24,.94)'; ctx.strokeStyle = 'rgba(239,232,214,.45)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 10); ctx.fill(); ctx.stroke();
  const tx = clamp(x, bx + 14, bx + bw - 14);
  ctx.beginPath(); ctx.moveTo(tx - 6, bottom - 0.5); ctx.lineTo(tx + 6, bottom - 0.5); ctx.lineTo(x, bottom + 8); ctx.closePath(); ctx.fill();
  ctx.lineJoin = 'round'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.85)'; ctx.fillStyle = '#fff6e0';
  lines.forEach((l, i) => { ctx.strokeText(l, bx + 10, by + 28 + i * 24); ctx.fillText(l, bx + 10, by + 28 + i * 24); });
  ctx.restore();
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

function drawWaves() {
  if (!G.waves.length) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.shadowColor = '#9fe8ff'; ctx.shadowBlur = 18;
  for (const w of G.waves) {
    const a = Math.atan2(w.vy, w.vx);
    ctx.strokeStyle = `rgba(190,240,255,${Math.min(1, w.left / 120)})`; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(w.x - Math.cos(a) * w.r, w.y - Math.sin(a) * w.r, w.r * 1.4, a - 1.1, a + 1.1); ctx.stroke();
  }
  ctx.restore();
}

function drawArena() {
  const A = G.arena;
  if (!A || G.boss.hp <= 0) return;
  ctx.save();
  if (A.id === 'flood') {
    const F = ARENA.flood, f = A.flood, L = G.L, rx = L.roomX, rw = L.w - rx;
    const plats = () => { for (const [x, y] of F.platforms) { ctx.beginPath(); ctx.arc(x, y, F.platR, 0, 7); ctx.fill(); } };
    if (f.on > 0) { // water everywhere except the platforms
      ctx.save(); ctx.beginPath(); ctx.rect(rx, 0, rw, L.h);
      for (const [x, y] of F.platforms) { ctx.moveTo(x + F.platR, y); ctx.arc(x, y, F.platR, 0, 7, true); }
      ctx.clip('evenodd');
      ctx.fillStyle = 'rgba(40,110,190,.42)'; ctx.fillRect(rx, 0, rw, L.h);
      ctx.strokeStyle = 'rgba(190,230,255,.35)'; ctx.lineWidth = 2;
      for (let y = 20; y < L.h; y += 36) { ctx.beginPath(); for (let x = rx; x <= L.w; x += 20) ctx.lineTo(x, y + Math.sin(x / 38 + G.time * 3 + y) * 5); ctx.stroke(); }
      ctx.restore();
    }
    ctx.fillStyle = '#6f6a63'; plats(); // stone discs, drawn over the water
    ctx.strokeStyle = '#4e4945'; ctx.lineWidth = 4; for (const [x, y] of F.platforms) { ctx.beginPath(); ctx.arc(x, y, F.platR, 0, 7); ctx.stroke(); }
    ctx.strokeStyle = '#8a837c'; ctx.lineWidth = 2; for (const [x, y] of F.platforms) { ctx.beginPath(); ctx.arc(x, y, F.platR * 0.6, 0, 7); ctx.stroke(); }
    if (f.warn > 0) { // blue creeping in from the room edges
      const k = 1 - f.warn / F.warn, g = ctx.createRadialGradient(rx + rw / 2, L.h / 2, 150, rx + rw / 2, L.h / 2, rw * 0.62);
      g.addColorStop(0, 'rgba(60,140,230,0)'); g.addColorStop(1, `rgba(60,140,230,${0.55 * k})`);
      ctx.fillStyle = g; ctx.fillRect(rx, 0, rw, L.h);
    }
  }
  if (A.id === 'rockfall') { // pillars are drawn with the actors (drawPillar)
    const R = ARENA.rockfall;
    for (const r of A.rocks) {
      const k = 1 - Math.max(0, r.t) / R.warn, rad = R.radius * (0.4 + 0.6 * k);
      ctx.fillStyle = `rgba(0,0,0,${0.25 + 0.3 * k})`; ctx.beginPath(); ctx.ellipse(r.x, r.y, rad, rad * 0.6, 0, 0, 7); ctx.fill();
      if (r.t < 0.25) { ctx.strokeStyle = 'rgba(255,60,60,.8)'; ctx.lineWidth = 3; ctx.stroke(); }
      if (r.t < 0.2) { ctx.fillStyle = '#8a7a6a'; ctx.beginPath(); ctx.arc(r.x, r.y - r.t * 900, 16, 0, 7); ctx.fill(); }
    }
  }
  ctx.restore();
}

// Stone block; a crack shows after the first hit
function drawPillar(p) {
  shadow(p.x + p.w / 2, p.y + p.h, p.w * 0.6);
  ctx.fillStyle = '#6b6560'; ctx.fillRect(p.x, p.y - 44, p.w, p.h + 44);
  ctx.fillStyle = '#8a837c'; ctx.fillRect(p.x, p.y - 44, p.w, 14);
  ctx.fillStyle = '#4e4945'; ctx.fillRect(p.x + p.w - 10, p.y - 30, 10, p.h + 30);
  if (p.hits > 0) {
    ctx.strokeStyle = '#1e1b19'; ctx.lineWidth = 3; ctx.beginPath();
    ctx.moveTo(p.x + 14, p.y - 30); ctx.lineTo(p.x + 26, p.y - 8); ctx.lineTo(p.x + 18, p.y + 12); ctx.lineTo(p.x + 32, p.y + 34); ctx.stroke();
  }
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

const spinPh = s => (s > 0.25 ? s - 0.25 : s); // Maelstrom Edge's 0.5 s spin is two 0.25 s turns
// Cyclone Edge: a golden ring sweeping round; Piercing Fang: aim line while winding up, then the stab beam
function drawSkillFx(P) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  if (P.spin > 0) {
    const R = SKILLS.horizontal.radius, k = 1 - spinPh(P.spin) / 0.25;
    ctx.shadowColor = '#ffcf6a'; ctx.shadowBlur = 20; ctx.strokeStyle = `rgba(255,215,130,${1 - k * 0.6})`; ctx.lineWidth = 14;
    ctx.beginPath(); ctx.arc(P.x, P.y, R * (0.6 + 0.4 * k), P.ang, P.ang + Math.PI * 2 * Math.min(1, k * 1.6)); ctx.stroke();
  }
  if (P.parry > 0) {
    ctx.shadowColor = '#fff1c4'; ctx.shadowBlur = 16; ctx.strokeStyle = `rgba(255,241,196,${0.55 + 0.35 * Math.sin(performance.now() / 60)})`; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(P.x, P.y, 30, P.ang - 0.9, P.ang + 0.9); ctx.stroke();
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
  const FL = V.evo;
  if (P.fangLine > 0) {
    ctx.strokeStyle = `rgba(255,140,90,${0.4 + 0.5 * (1 - P.fangLine / FL.lineDelay)})`; ctx.lineWidth = 3; ctx.setLineDash([10, 6]);
    ctx.beginPath(); ctx.moveTo(P.fangX, P.fangY); ctx.lineTo(P.fangX + cx * FL.lineLen, P.fangY + cy * FL.lineLen); ctx.stroke(); ctx.setLineDash([]);
  }
  if (P.fangBeam > 0) {
    ctx.shadowColor = '#ff9a5a'; ctx.shadowBlur = 28; ctx.strokeStyle = `rgba(255,220,170,${P.fangBeam / 0.18})`; ctx.lineWidth = FL.lineWidth * 0.8;
    ctx.beginPath(); ctx.moveTo(P.fangX, P.fangY); ctx.lineTo(P.fangX + cx * FL.lineLen, P.fangY + cy * FL.lineLen); ctx.stroke();
  }
  ctx.restore();
}

function swordAngle(P) {
  if (P.swing > 0) { const k = 1 - P.swing / SWING, e = 1 - (1 - k) ** 3; return P.ang + P.swingDir * (-1.3 + 2.6 * e); }
  if (P.dash > 0) return P.ang;
  if (P.thrust > 0 || P.beam > 0) return P.thrustAng; // blade pointed down the stab line
  if (P.spin > 0) return P.ang + Math.PI * 2 * (1 - spinPh(P.spin) / 0.25);
  if (P.delay > 0) return P.ang + P.swingDir * 1.4; // follow-through pose after the skill
  return P.ang + P.swingDir * -0.5 + Math.sin(G.time * 3) * 0.05;
}
// One thin ring at the feet per active set bonus, steady unless flashing is on
function drawAura(P) {
  const sets = ELEMENT_IDS.filter(setActive);
  if (!sets.length) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineWidth = 2;
  sets.forEach((el, i) => {
    const pulse = settings.flash ? 0.5 + 0.2 * Math.sin(G.time * 3 + i) : 0.6;
    ctx.strokeStyle = ELEMENTS[el].color; ctx.shadowColor = ELEMENTS[el].color; ctx.shadowBlur = 10; ctx.globalAlpha = pulse;
    ctx.beginPath(); ctx.ellipse(P.x, P.y + P.r * 1.05, P.r * (1.5 + i * 0.35), P.r * (0.85 + i * 0.2), 0, 0, 7); ctx.stroke();
  });
  ctx.restore();
}
// Afterglow after an evolved Art fires: a soft halo round the body, in the Art's colour
function drawGlow(P, col) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, P.glow / 0.6) * 0.5;
  const g = ctx.createRadialGradient(P.x, P.y, 4, P.x, P.y, 56); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(P.x, P.y, 56, 0, 7); ctx.fill(); ctx.restore();
}
function drawPlayer() {
  const P = G.P, time = G.time;
  if (P.hp <= 0) return;
  // Blade Art light trail
  if (P.trail.length > 1) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.shadowColor = '#7fd4ff'; ctx.shadowBlur = 20;
    for (let i = 1; i < P.trail.length; i++) {
      const a = P.trail[i - 1], b = P.trail[i];
      ctx.strokeStyle = `rgba(${b.col ?? '127,212,255'},${b.t * 3})`; ctx.lineWidth = 22 * b.t * 4;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    ctx.restore();
  }
  shadow(P.x, P.y, P.r);
  const dom = dominantElement(), bladeCol = dom && ELEMENTS[dom].color, glowCol = bladeCol ?? '#ffe9a8';
  drawAura(P); if (P.glow > 0) drawGlow(P, glowCol);
  drawSkillFx(P);
  const skillFx = P.delay > 0 || P.dash > 0 || P.thrust > 0, col = dirCol(P.ang), sa = swordAngle(P);
  const hx = P.x + Math.cos(P.ang) * 6, hy = P.y + 4 + Math.sin(P.ang) * 4; // hand
  const pm = motion(P), pp = pose(P, 'player', time, { reduced: REDUCED, vx: pm.vx }), foot = P.y + P.r;
  if (P.moving && !REDUCED) { // dust every second footfall
    const st = Math.floor(time * 10);
    if (st !== pm.step) { pm.step = st; if ((pm.steps = (pm.steps ?? 0) + 1) % 2 === 0) burst(P.x, P.y + P.r, 3, actOf(G.floorIdx) === 3 ? '#bfe6ff' : '#b49a76', 60, 0.35, 3, false); }
  }
  const sword = () => {
    ctx.save(); applyPose(ctx, P.x, foot, pp); ctx.translate(hx, hy); ctx.rotate(sa - Math.PI / 2); // sprite has the grip on top, blade pointing down
    if (skillFx || P.swing > 0) { ctx.shadowColor = '#7fd4ff'; ctx.shadowBlur = skillFx ? 18 : 8; }
    if (P.glow > 0) { ctx.shadowColor = glowCol; ctx.shadowBlur = 24; }
    drawSword(42, bladeCol); ctx.restore();
  };
  // Swing arc that follows the blade tip
  if (P.swing > 0) {
    const start = P.ang - P.swingDir * 1.3;
    const fin = P.finisher, a = 0.3 + P.swing / SWING * 0.7; // the combo finisher gets a wider, golden arc
    ctx.save(); applyPose(ctx, P.x, foot, pp); ctx.globalCompositeOperation = 'lighter'; ctx.shadowColor = fin ? '#ffcf6a' : '#bfe8ff'; ctx.shadowBlur = fin ? 26 : 18; ctx.lineCap = 'round';
    ctx.strokeStyle = fin ? `rgba(255,215,130,${a})` : `rgba(220,240,255,${a})`; ctx.lineWidth = fin ? 16 : 10;
    ctx.beginPath(); ctx.arc(hx, hy, fin ? 54 : 40, Math.min(start, sa), Math.max(start, sa)); ctx.stroke();
    ctx.restore();
  }
  const behind = Math.sin(sa) < -0.3; // blade pointing up = behind the body
  if (behind) sword();
  ctx.save(); applyPose(ctx, P.x, foot, pp);
  if (skillFx) { ctx.shadowColor = P.delay > 0 ? '#ffb347' : '#7fd4ff'; ctx.shadowBlur = 22; }
  const row = P.swing > 0 || P.dash > 0 ? 4 : P.moving ? Math.floor(time * 10) % 4 : 0;
  if (P.inv > 0) ctx.globalAlpha *= settings.flash && Math.floor(time * 20) % 2 ? 0.35 : 0.65; // i-frame blink (steady when flashing is off)
  if (P.roll > 0) { // roll: squashed, see-through, legs spinning fast
    ctx.globalAlpha *= 0.6; // the pose already squashes the roll
    frame(IMG.player, dirCol(P.rollAng), Math.floor(time * 30) % 4, P.x, P.y, 3);
  } else frame(P.hurt > 0.15 && settings.flash ? IMG.playerWhite : IMG.player, col, row, P.x, P.y, 3);
  ctx.restore();
  if (!behind) sword();
}

function drawTorches() {
  const torch = G.F.torch;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const [x, y] of G.L.torches) {
    const r = 110 + Math.sin(G.time * 9 + x) * 8 + Math.random() * 4;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${torch},.35)`); g.addColorStop(1, `rgba(${torch},0)`);
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.fillStyle = `rgb(${torch})`; ctx.beginPath(); ctx.ellipse(x, y - 4, 4, 7 + Math.random() * 2, 0, 0, 7); ctx.fill();
  }
  ctx.restore();
}
function drawDoor() {
  const DOOR = G.L.door;
  if (!G.doorClosed || !DOOR) return;
  ctx.save(); ctx.shadowColor = '#ff3030'; ctx.shadowBlur = 20;
  ctx.fillStyle = `rgba(200,30,30,${0.6 + 0.2 * Math.sin(G.time * 6)})`; ctx.fillRect(DOOR.x, DOOR.y, DOOR.w, DOOR.h);
  ctx.strokeStyle = '#ff8a80'; ctx.lineWidth = 2;
  for (let y = DOOR.y + 10; y < DOOR.y + DOOR.h; y += 20) { ctx.beginPath(); ctx.moveTo(DOOR.x, y); ctx.lineTo(DOOR.x + DOOR.w, y); ctx.stroke(); }
  ctx.restore();
}
// Room doors: a stone slab on the right wall, glowing in the colour of what's behind it, with a sign over it
const DOOR_LOOK = {
  gold: ['#ffd35a', { th: 'Gold', en: 'Gold' }], xp: ['#5fc3ff', { th: 'XP', en: 'XP' }], potion: ['#7dff8a', { th: 'Potion', en: 'Potion' }],
};
// Shrine altar: stone plinth with a violet crystal; dim once used, key prompt only when close
function drawShrine() {
  const s = G.L.shrine, used = G.room?.shrineUsed, glow = used ? 0.15 : 0.6 + 0.25 * Math.sin(G.time * 3);
  shadow(s.x, s.y, 22);
  ctx.fillStyle = '#4a4d5c'; ctx.fillRect(s.x - 22, s.y - 18, 44, 22); ctx.fillStyle = '#5f6375'; ctx.fillRect(s.x - 16, s.y - 30, 32, 14);
  ctx.save(); ctx.globalAlpha = glow; ctx.shadowColor = '#a688ff'; ctx.shadowBlur = used ? 0 : 18; ctx.fillStyle = '#c9b6ff';
  ctx.beginPath(); ctx.moveTo(s.x, s.y - 62); ctx.lineTo(s.x + 9, s.y - 44); ctx.lineTo(s.x, s.y - 30); ctx.lineTo(s.x - 9, s.y - 44); ctx.closePath(); ctx.fill(); ctx.restore();
  if (used) return;
  ctx.textAlign = 'center'; ctx.font = `700 13px ${FT}`; ctx.lineJoin = 'round'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.8)';
  const name = tr('ศาลเจ้า', 'Shrine'), tag = nearShrine() ? `[${keyLabel('interact')}] ${name}` : name;
  ctx.strokeText(tag, s.x, s.y - 72); ctx.fillStyle = nearShrine() ? '#e7dcff' : '#fff'; ctx.fillText(tag, s.x, s.y - 72);
}
function doorLook(d) {
  const i = G.floorIdx + 1;
  if (!d.to) return kindOf(i) === 'boss' ? ['#ff6b5f', { th: 'บอส', en: 'Boss' }] : ['#f4ecd8', { th: 'ไปต่อ', en: 'Onward' }];
  if (d.to.type === 'elite') return ['#a688ff', { th: 'Elite: ท่าใหม่', en: 'Elite: new Art' }];
  if (d.to.type === 'spring') return ['#7dff8a', { th: 'น้ำพุ', en: 'Spring' }];
  if (d.to.type === 'shrine') return ['#c9b6ff', { th: 'ศาลเจ้า', en: 'Shrine' }];
  if (d.to.type === 'shop') return ['#ffd35a', { th: 'ร้านเร่', en: 'Wandering shop' }];
  if (d.to.type === 'challenge') { const r = DOOR_LOOK[d.to.reward][1]; return ['#ff8a5f', { th: `ท้าทาย: ${r.th} ×2`, en: `Challenge: ${r.en} ×2` }]; }
  return DOOR_LOOK[d.to.reward] ?? ['#f4ecd8', { th: 'ห้องถัดไป', en: 'Next room' }];
}
// Icon shown floating in each doorway, drawn at (0,0) in a ~28px box
function doorIcon(d) {
  if (!d.to) return kindOf(G.floorIdx + 1) === 'boss' ? 'skull' : 'arrow';
  const { type, reward } = d.to;
  return type === 'battle' || type === 'challenge' ? (type === 'challenge' ? 'swords' : { gold: 'coin', xp: 'star', potion: 'flask' }[reward] ?? 'arrow')
    : { elite: 'mask', spring: 'drop', shop: 'bag', shrine: 'crystal' }[type] ?? 'arrow';
}
function drawIcon(kind, col) {
  ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  if (kind === 'coin') { ctx.arc(0, 0, 11, 0, 7); ctx.fill(); ctx.strokeStyle = '#0c0d12'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 6, 0, 7); ctx.stroke(); return; }
  if (kind === 'star') { for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 5 : 13; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill(); return; }
  if (kind === 'flask') { ctx.moveTo(-3, -12); ctx.lineTo(3, -12); ctx.lineTo(3, -4); ctx.lineTo(10, 10); ctx.lineTo(-10, 10); ctx.lineTo(-3, -4); ctx.closePath(); ctx.fill(); return; }
  if (kind === 'mask') {
    ctx.moveTo(-12, -13); ctx.quadraticCurveTo(-13, -4, -7, -2); ctx.lineTo(-8, 4); ctx.lineTo(0, 13); ctx.lineTo(8, 4); ctx.lineTo(7, -2); ctx.quadraticCurveTo(13, -4, 12, -13);
    ctx.quadraticCurveTo(6, -9, 0, -9); ctx.quadraticCurveTo(-6, -9, -12, -13); ctx.fill();
    ctx.fillStyle = '#0c0d12'; ctx.fillRect(-6, -3, 4, 3); ctx.fillRect(2, -3, 4, 3); return;
  }
  if (kind === 'drop') { ctx.moveTo(0, -13); ctx.quadraticCurveTo(12, 2, 8, 8); ctx.quadraticCurveTo(0, 15, -8, 8); ctx.quadraticCurveTo(-12, 2, 0, -13); ctx.fill(); return; }
  if (kind === 'bag') {
    ctx.moveTo(-4, -12); ctx.lineTo(4, -12); ctx.lineTo(2, -6); ctx.quadraticCurveTo(12, 0, 10, 8); ctx.quadraticCurveTo(0, 14, -10, 8); ctx.quadraticCurveTo(-12, 0, -2, -6); ctx.closePath(); ctx.fill(); return;
  }
  if (kind === 'crystal') { ctx.moveTo(0, -14); ctx.lineTo(9, -2); ctx.lineTo(0, 14); ctx.lineTo(-9, -2); ctx.closePath(); ctx.fill(); return; }
  if (kind === 'swords') { ctx.moveTo(-10, -10); ctx.lineTo(10, 10); ctx.moveTo(10, -10); ctx.lineTo(-10, 10); ctx.moveTo(-12, 4); ctx.lineTo(-4, 12); ctx.moveTo(12, 4); ctx.lineTo(4, 12); ctx.stroke(); return; }
  if (kind === 'skull') {
    ctx.arc(0, -3, 11, 0, 7); ctx.rect(-6, 4, 12, 9); ctx.fill();
    ctx.fillStyle = '#0c0d12'; ctx.beginPath(); ctx.arc(-4, -3, 3, 0, 7); ctx.arc(4, -3, 3, 0, 7); ctx.fill(); return;
  }
  ctx.moveTo(-12, 0); ctx.lineTo(10, 0); ctx.moveTo(2, -9); ctx.lineTo(11, 0); ctx.lineTo(2, 9); ctx.stroke(); // arrow
}
function archPath(x, y, w, h) { // round-topped doorway filling the rect
  const r = w / 2;
  ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x, y + r); ctx.arc(x + r, y + r, r, Math.PI, 0); ctx.lineTo(x + w, y + h); ctx.closePath();
}
function drawDoors() {
  for (const d of G.doors) {
    const [col, name] = doorLook(d), cx = d.x + d.w / 2, cy = d.y + d.h / 2;
    const near = clamp((220 - Math.hypot(G.P.x - cx, G.P.y - cy)) / 80, 0, 1); // label fades in over the last 80px before 220
    const glow = (0.55 + 0.2 * Math.sin(G.time * 3 + d.y)) * (d.armed ? 1 : 0.45);
    ctx.save();
    ctx.globalAlpha = d.armed ? 1 : 0.7;
    ctx.fillStyle = '#4a4d5c'; archPath(d.x - 8, d.y - 8, d.w + 16, d.h + 8); ctx.fill();         // stone arch
    ctx.fillStyle = '#0c0d12'; archPath(d.x, d.y, d.w, d.h); ctx.fill();                          // opening
    ctx.globalAlpha = glow; ctx.fillStyle = col; archPath(d.x + 6, d.y + 6, d.w - 12, d.h - 6); ctx.fill(); // inner glow
    ctx.globalAlpha = d.armed ? 1 : 0.5; ctx.translate(cx, cy + 8 + Math.sin(G.time * 2.5 + d.y) * 4);
    drawIcon(doorIcon(d), '#fff');
    ctx.restore();
    if (near <= 0) continue;
    ctx.save(); ctx.globalAlpha = near * (d.armed ? 1 : 0.6);
    ctx.textAlign = 'center'; ctx.font = `800 15px ${FN}`; ctx.lineJoin = 'round'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.85)';
    const sx = Math.min(cx, G.L.w - 6 - ctx.measureText(t(name)).width / 2); // long signs stay inside the wall
    ctx.strokeText(t(name), sx, d.y - 18); ctx.fillStyle = col; ctx.fillText(t(name), sx, d.y - 18);
    ctx.restore();
  }
}
function drawPortal() {
  const portal = G.portal;
  if (!portal) return;
  const k = 1 - Math.max(0, portal.wait) / BOSS_RULES.portalDelay; // grows open while it can't be entered yet
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(portal.x, portal.y); ctx.scale(k, k);
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
  for (const b of G.bolts) { // Storm chains: a jagged violet line
    ctx.globalAlpha = Math.min(1, b.t / 0.15); ctx.strokeStyle = '#c9b6ff'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(b.x1, b.y1);
    const mx = (b.x1 + b.x2) / 2 + (Math.random() - 0.5) * 24, my = (b.y1 + b.y2) / 2 + (Math.random() - 0.5) * 24;
    ctx.lineTo(mx, my); ctx.lineTo(b.x2, b.y2); ctx.stroke();
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
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, Math.min(G.L.roomX, G.L.w), G.L.h); ctx.clip();
  for (const [speed, alpha] of [[14, 0.3], [-22, 0.18]]) {
    ctx.globalAlpha = alpha; const fw = 960, fh = 528, ox = ((G.time * speed) % fw + fw) % fw;
    for (let x = -fw + ox; x < G.L.w; x += fw) for (let y = 0; y < G.L.h; y += fh) ctx.drawImage(IMG.fog, x, y, fw, fh);
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

// Elderroot's fog: darkness over the world (not the HUD) with a soft hole around the player; sprouts glow through it
let fogCv = null, fogWarned = false;
function drawVisionFog() {
  const A = G.arena; if (A?.id !== 'fog' || !G.boss.awake || G.boss.hp <= 0) return;
  const v = A.vision, px = G.P.x - G.cam.x, py = G.P.y - G.cam.y;
  if (v < 220 && !fogWarned) emit('arenaWarn', 'fog'); fogWarned = v < 220;
  fogCv ??= document.createElement('canvas'); if (fogCv.width !== W || fogCv.height !== H) { fogCv.width = W; fogCv.height = H; }
  const f = fogCv.getContext('2d');
  f.fillStyle = 'rgba(4,8,6,.94)'; f.fillRect(0, 0, W, H);
  const g = f.createRadialGradient(px, py, v * 0.45, px, py, v);
  g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  f.globalCompositeOperation = 'destination-out'; f.fillStyle = g; f.fillRect(0, 0, W, H); f.globalCompositeOperation = 'source-over';
  ctx.drawImage(fogCv, 0, 0);
  ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = '#78c850';
  for (const m of G.mobs) if (m.sprout && m.hp > 0) { ctx.beginPath(); ctx.arc(m.x - G.cam.x, m.y - G.cam.y, m.r * 0.7, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}

export function drawWorld() {
  const { P, cam } = G;
  cam.x = clamp(P.x - W / 2, 0, G.L.w - W); cam.y = clamp(P.y - H / 2, 0, G.L.h - H);
  ctx.imageSmoothingEnabled = false;
  const sx = (Math.random() - 0.5) * G.shake, sy = (Math.random() - 0.5) * G.shake;
  ctx.save(); ctx.translate(Math.round(-cam.x + sx), Math.round(-cam.y + sy));
  ctx.drawImage(bg, 0, 0);
  drawTorches(); drawDoor(); drawPortal(); drawDoors(); drawArena(); drawTelegraph();
  // y-sort so whoever is lower on screen is drawn in front
  for (const m of G.mobs) if (m.hp <= 0 && !m.sprout && m.anim?.deadAt === undefined) m.anim = { ...m.anim, deadAt: G.time };
  const actors = G.mobs.filter(m => m.hp > 0 || (!m.sprout && G.time - m.anim.deadAt < 0.4)).map(m => ({ y: m.y, draw: () => drawMob(m) }));
  actors.push({ y: P.y, draw: drawPlayer });
  if (G.L.merchant) actors.push({ y: G.L.merchant.y, draw: drawMerchant });
  for (const f of G.npc.folk ?? []) actors.push({ y: f.y, draw: () => drawFolk(f) });
  for (const p of tallProps()) actors.push({ y: p.y + p.h, draw: () => drawTall(p) });
  if (G.L.shrine) actors.push({ y: G.L.shrine.y, draw: drawShrine });
  for (const p of G.arena?.pillars ?? []) actors.push({ y: p.y + p.h, draw: () => drawPillar(p) });
  if (G.boss.hp > 0) actors.push({ y: G.boss.y, draw: drawBoss });
  for (const a of actors.sort((a, b) => a.y - b.y)) a.draw();
  drawShots();
  drawWaves();
  drawFx();
  if (G.F.fog && G.L.kind !== 'town') drawFog();
  for (const b of bubbles) drawBubble(...b);
  bubbles.length = 0;
  ctx.restore();
  ctx.drawImage(vig, 0, 0);
  drawVisionFog();
  if (P.slowmo > 0) { ctx.fillStyle = 'rgba(255,240,200,0.08)'; ctx.fillRect(0, 0, W, H); }
  drawDanger();
  drawHud();
}
