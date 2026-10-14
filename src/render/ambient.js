// Drawing the ambient critters (systems/ambient.js): a few canvas primitives each, culled by the camera.
import { G } from '../world/state.ts';
import { W, H } from '../world/constants.ts';
import { ctx } from './canvas.js';
import { actOf } from '../data/run.ts';
import { GRASS } from '../systems/ambient.js';

const WING = ['#ffd45a', '#ff9ec7', '#8fd0ff'], GROUND = new Set(['grasshopper', 'pollen', 'bubble', 'spray']);
const glow = document.createElement('canvas'); glow.width = glow.height = 16; // soft firefly halo, made once
{ const g = glow.getContext('2d'), r = g.createRadialGradient(8, 8, 0, 8, 8, 8); r.addColorStop(0, 'rgba(190,255,120,.9)'); r.addColorStop(1, 'rgba(190,255,120,0)'); g.fillStyle = r; g.fillRect(0, 0, 16, 16); }
const seen = c => c.x > G.cam.x - 40 && c.x < G.cam.x + W + 40 && c.y > G.cam.y - 60 && c.y < G.cam.y + H + 40;

function draw(c) {
  const { x, y, phase } = c, t = G.time;
  switch (c.kind) {
    case 'butterfly': {
      const f = Math.abs(Math.sin(t * 14 + phase)) * 3 + 0.8; ctx.fillStyle = WING[c.col];
      ctx.fillRect(x - f - 0.5, y - 2, f, 3); ctx.fillRect(x + 0.5, y - 2, f, 3);
      ctx.fillStyle = '#2a1a22'; ctx.fillRect(x - 0.5, y - 2, 1, 4); break;
    }
    case 'pollen': ctx.globalAlpha = 0.6; ctx.fillStyle = '#fff4b0'; ctx.fillRect(x, y, 2, 2); ctx.globalAlpha = 1; break;
    case 'leaf': {
      ctx.save(); ctx.translate(x, y); ctx.rotate(phase); ctx.fillStyle = G.floorIdx >= 10 ? '#7aa650' : '#c98a3a';
      ctx.fillRect(-3, -1.5, 6, 3); ctx.restore(); break;
    }
    case 'firefly': {
      const a = Math.max(0, Math.sin(t * 6.28 / c.per + phase)); if (a < 0.05) break;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a; ctx.drawImage(glow, x - 8, y - 8);
      ctx.fillStyle = '#f4ffb0'; ctx.fillRect(x - 1, y - 1, 2, 2); ctx.restore(); break;
    }
    case 'grasshopper': ctx.fillStyle = '#6fa83a'; ctx.fillRect(x - 3, y - 2 - c.z, 6, 3); ctx.fillStyle = '#3d6a1e'; ctx.fillRect(x + 1, y - 3 - c.z, 2, 2); break;
    case 'bubble': ctx.strokeStyle = 'rgba(200,240,255,.8)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, 1.5 + Math.min(c.t, 1.5) * 1.2, 0, 7); ctx.stroke(); break;
    case 'spray': ctx.globalAlpha = Math.min(1, c.life); ctx.fillStyle = '#d6f2ff'; ctx.fillRect(x, y, 2, 2); ctx.globalAlpha = 1; break;
    case 'gull': {
      const f = Math.sin(t * 8 + phase) * 3; ctx.strokeStyle = '#f2f2f2'; ctx.lineWidth = 2; ctx.beginPath();
      ctx.moveTo(x - 9, y + f); ctx.lineTo(x, y); ctx.lineTo(x + 9, y + f); ctx.stroke(); break;
    }
    case 'smoke': for (let i = 0; i < 3; i++) { // three overlapping puffs per chimney, a third of a cycle apart
      const k = (c.t / 3 + i / 3) % 1; ctx.globalAlpha = 0.8 * (1 - k); ctx.fillStyle = '#f4f4f4';
      ctx.beginPath(); ctx.arc(x + Math.sin(c.phase + k * 4) * 4 * k, y - k * 24, 2 + k * 6, 0, 7); ctx.fill();
    } ctx.globalAlpha = 1; break;
  }
}
const drawSet = ground => { for (const c of G.ambient.critters) if (GROUND.has(c.kind) === ground && (c.kind === 'smoke' ? seen({ x: c.x, y: c.y - 30 }) : seen(c))) draw(c); };
function drawTufts() {
  const [dark, tip] = GRASS[actOf(G.floorIdx)], t = G.time;
  ctx.save(); ctx.lineCap = 'round';
  for (const u of G.ambient.tufts) {
    if (!seen(u)) continue;
    const bend = u.lean + Math.sin(t * 1.6 + u.x * 0.1) * 0.05;
    for (let i = 0; i < u.blades; i++) {
      const o = (i - (u.blades - 1) / 2) * 5, h = 24 + ((i * 5 + u.blades) % 3) * 4, k = bend + o * 0.012, // outer blades splay a little
        mx = u.x + o + k * h * 0.35, my = u.y - h * 0.6, tx = u.x + o + k * h * 0.9, ty = u.y - h * Math.cos(k * 0.6);
      ctx.strokeStyle = dark; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(u.x + o, u.y); ctx.quadraticCurveTo(mx, my, tx, ty); ctx.stroke();
      ctx.strokeStyle = tip; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(mx + (tx - mx) * 0.2, my + (ty - my) * 0.2); ctx.quadraticCurveTo(mx + (tx - mx) * 0.6, my + (ty - my) * 0.6, tx, ty); ctx.stroke();
    }
  }
  ctx.restore();
}
export const drawAmbientGround = () => { drawTufts(); drawSet(true); drawBirdsGround(); };
export const drawAmbientAir = () => { drawSet(false); drawBirdsAir(); };

// birds: perched ones are a body + head with a peck bob; flying ones flap a two-frame V and cast a fading shadow
function drawBird(b) {
  ctx.save(); ctx.translate(b.x, b.y); ctx.scale(1.6, 1.6); ctx.translate(-b.x, -b.y); drawBird1(b); ctx.restore();
}
function drawBird1(b) {
  const t = G.time;
  if (!b.flying) {
    const bob = Math.max(0, Math.sin(b.peck * 5)) * 2;
    ctx.globalAlpha = 0.25; ctx.fillStyle = '#000'; ctx.fillRect(b.x - 5, b.y - 1, 10, 3); ctx.globalAlpha = 1;
    ctx.fillStyle = '#7a5a40'; ctx.fillRect(b.x - 5, b.y - 6, 9, 6); ctx.fillStyle = '#e8dcc0'; ctx.fillRect(b.x - 2, b.y - 3, 5, 3);
    ctx.fillStyle = '#3a2a20'; ctx.fillRect(b.x + 3, b.y - 9 + bob, 4, 4); ctx.fillStyle = '#ffb030'; ctx.fillRect(b.x + 7, b.y - 8 + bob, 3, 2);
    return;
  }
  const f = Math.sin(t * 24 + b.x) > 0 ? -3 : 3;
  ctx.globalAlpha = Math.max(0, 0.3 * (1 - b.z / 220)); ctx.fillStyle = '#000'; ctx.fillRect(b.x - 4, b.y, 8, 2);
  ctx.globalAlpha = 1; ctx.strokeStyle = '#3a2a20'; ctx.lineWidth = 3; ctx.beginPath();
  ctx.moveTo(b.x - 9, b.y - b.z + f); ctx.lineTo(b.x, b.y - b.z); ctx.lineTo(b.x + 9, b.y - b.z + f); ctx.stroke();
}
export const drawBirdsGround = () => { for (const b of G.ambient.birds) if (!b.flying && seen(b)) drawBird(b); };
export const drawBirdsAir = () => { for (const b of G.ambient.birds) if (b.flying && seen({ x: b.x, y: b.y - b.z })) drawBird(b); };
