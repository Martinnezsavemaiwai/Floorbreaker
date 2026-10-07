// Static floor art, painted once per floor into an offscreen canvas (plus the screen vignette).
import { G } from '../world/state.js';
import { W, H, WORLD, TOWN_X, ROOM_X, GATE } from '../world/constants.js';
import { TREE_TYPES } from '../data/floors.js';
import { IMG } from '../core/assets.js';
import { on } from '../core/events.js';
import { rand, pick, overlaps } from '../core/math.js';

export const bg = document.createElement('canvas'); bg.width = WORLD.w; bg.height = WORLD.h;
export const vig = document.createElement('canvas'); vig.width = W; vig.height = H;
{
  const v = vig.getContext('2d'), vg = v.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.65);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.6)');
  v.fillStyle = vg; v.fillRect(0, 0, W, H);
}
// Tilesets: 16px tiles drawn at 3x, [col, row] in the sheet. floor.png repeats its dirt layout 11 columns over
// in a second palette (F.grass offset); the plain/detail grass tiles differ per half, so they're listed per floor.
const T = 48;
const TILE = {
  grass: [[[0, 12], [[1, 12], [2, 11], [3, 11], [2, 12], [3, 12], [4, 12]]], [[11, 12], [[12, 12], [13, 12], [14, 12], [15, 12]]]],
  dirt: [[[0, 7], [1, 7], [2, 7]], [[0, 8], [1, 8], [2, 8]], [[0, 9], [1, 9], [2, 9]]], // 3x3 dirt patch: [row][col]
  townBrick: [[1, 13], [5, 13], [6, 13], [5, 14], [6, 14]],
  bossBrick: [[12, 13], [16, 13], [17, 13], [16, 14], [17, 14]],
};
function tile(g, img, [c, r], x, y) { g.drawImage(img, c * 16, r * 16, 16, 16, x, y, T, T); }
function fillTiles(g, img, x0, y0, w, h, choose) {
  g.save(); g.beginPath(); g.rect(x0, y0, w, h); g.clip();
  for (let y = y0; y < y0 + h; y += T) for (let x = x0; x < x0 + w; x += T) tile(g, img, choose(), x, y);
  g.restore();
}
function paintFloor() {
  const F = G.F, g = bg.getContext('2d'), floor = IMG.floor, interior = IMG.interior, village = IMG.village;
  const gr = ([c, r]) => [c + F.grass, r];
  g.imageSmoothingEnabled = false;
  const [plain, detail] = TILE.grass[F.grass ? 1 : 0];
  fillTiles(g, floor, 0, 0, WORLD.w, WORLD.h, () => Math.random() < 0.8 ? plain : pick(detail));
  // Dirt patches that don't touch each other, the road or trees
  const placed = [{ x: 0, y: 552, w: WORLD.w, h: 96 }, ...G.WALLS];
  for (let tries = 0, n = 0; n < 8 && tries < 200; tries++) {
    const w = rand(3, 5), h = rand(3, 4);
    const p = { x: rand(TOWN_X / T + 1, ROOM_X / T - w - 1) * T, y: rand(0, WORLD.h / T - h) * T, w: w * T, h: h * T };
    if (placed.some(q => overlaps(p, q, T))) continue;
    placed.push(p); n++;
    for (let r = 0; r < h; r++) for (let c = 0; c < w; c++)
      tile(g, floor, gr(TILE.dirt[r === 0 ? 0 : r === h - 1 ? 2 : 1][c === 0 ? 0 : c === w - 1 ? 2 : 1]), p.x + c * T, p.y + r * T);
  }
  for (let i = 0; i < 25; i++) {
    const b = { x: rand(TOWN_X + 20, ROOM_X - 70), y: rand(0, WORLD.h - 48), w: 48, h: 48 };
    if (!placed.some(q => overlaps(b, q))) g.drawImage(village, pick([64, 80]), 80, 16, 16, b.x, b.y, 48, 48);
  }
  for (let x = TOWN_X - T; x < ROOM_X; x += T) { tile(g, floor, gr(TILE.dirt[0][1]), x, 600 - T); tile(g, floor, gr(TILE.dirt[2][1]), x, 600); }
  for (let i = 0; i < 60; i++) {
    const x = Math.random() * WORLD.w, y = Math.random() * WORLD.h, r = 60 + Math.random() * 160;
    const rg = g.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, Math.random() < 0.5 ? 'rgba(255,255,200,.08)' : 'rgba(0,30,0,.12)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rg; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  if (F.fieldTint) { g.fillStyle = F.fieldTint; g.fillRect(TOWN_X, 0, ROOM_X - TOWN_X, WORLD.h); }
  fillTiles(g, interior, 0, 0, TOWN_X, WORLD.h, () => pick(TILE.townBrick));
  fillTiles(g, interior, ROOM_X, 0, WORLD.w - ROOM_X, WORLD.h, () => pick(TILE.bossBrick));
  if (F.roomTint) { g.fillStyle = F.roomTint; g.fillRect(ROOM_X, 0, WORLD.w - ROOM_X, WORLD.h); }
  // fountain in town
  g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(205, 315, 64, 60, 0, 0, 7); g.fill();
  g.fillStyle = '#8a90a8'; g.beginPath(); g.arc(200, 300, 62, 0, 7); g.fill();
  const wg = g.createRadialGradient(190, 290, 5, 200, 300, 50);
  wg.addColorStop(0, '#9fd6ff'); wg.addColorStop(1, '#2d6fb0');
  g.fillStyle = wg; g.beginPath(); g.arc(200, 300, 50, 0, 7); g.fill();
  for (const w of GATE) {
    fillTiles(g, interior, w.x, w.y, w.w, w.h, () => pick(TILE.bossBrick));
    g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(w.x, w.y, w.w, w.h);
    g.fillStyle = 'rgba(255,255,255,.15)'; g.fillRect(w.x, w.y, 4, w.h);
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(w.x + w.w, w.y, 8, w.h);
  }
  for (const [x, y, k] of F.trees) {
    const t = TREE_TYPES[k], [sx, sy, sw, sh] = t.src;
    g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath();
    g.ellipse(x + sw * t.s / 2, y + sh * t.s - 10, sw * t.s * 0.4, 12, 0, 0, 7); g.fill();
    g.drawImage(village, sx, sy, sw, sh, x, y, sw * t.s, sh * t.s);
  }
  g.font = 'bold 22px system-ui'; g.textAlign = 'center'; g.fillStyle = 'rgba(255,255,255,.3)';
  g.fillText(F.town, TOWN_X / 2, 80);
  g.fillText('Boss Room', (ROOM_X + WORLD.w) / 2 + 20, 160);
}
on('floorLoaded', paintFloor);
