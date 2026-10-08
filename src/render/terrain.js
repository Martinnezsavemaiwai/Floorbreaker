// Static floor art, painted once per floor into an offscreen canvas (plus the screen vignette).
import { G } from '../world/state.ts';
import { W, H, WORLD, TOWN_X, ROOM_X, GATE } from '../world/constants.ts';
import { TREE_TYPES } from '../data/floors.ts';
import { IMG } from '../core/assets.ts';
import { on } from '../core/events.ts';
import { rand, pick, overlaps } from '../core/math.ts';

export const bg = document.createElement('canvas'); bg.width = WORLD.w; bg.height = WORLD.h;
export const vig = document.createElement('canvas'); vig.width = W; vig.height = H;
{
  const v = vig.getContext('2d'), vg = v.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.65);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.6)');
  v.fillStyle = vg; v.fillRect(0, 0, W, H);
}
// Our own art (art-src/ -> scripts/import_art.py): tileable textures laid as canvas patterns, plus loose pieces
// (dirt patches, flowers and stones) scattered over the field. Everything draws 1:1.
const fill = (g, name, x, y, w, h) => {
  g.save(); g.fillStyle = g.createPattern(IMG[name], 'repeat'); g.fillRect(x, y, w, h); g.restore();
};
const PATCHES = ['patches-1', 'patches-2', 'patches-3'];
const DECO = Array.from({ length: 8 }, (_, i) => `deco-${i + 1}`);
const ROAD_Y = 600 - 80; // road.png is 160 px tall with the dirt band in its middle 60%, centred on y = 600

function paintFloor() {
  const F = G.F, g = bg.getContext('2d');
  g.imageSmoothingEnabled = false;
  fill(g, `ground-${F.ground}`, 0, 0, WORLD.w, WORLD.h);
  // dirt patches and small decorations that don't touch each other, the road or trees
  const placed = [{ x: 0, y: 540, w: WORLD.w, h: 120 }, ...G.WALLS];
  const scatter = (names, count, gap) => {
    for (let tries = 0, n = 0; n < count && tries < count * 25; tries++) {
      const img = IMG[pick(names)], p = { x: rand(TOWN_X + 20, ROOM_X - img.width - 20), y: rand(0, WORLD.h - img.height), w: img.width, h: img.height };
      if (placed.some(q => overlaps(p, q, gap))) continue;
      placed.push(p); n++;
      g.drawImage(img, p.x, p.y);
    }
  };
  scatter(PATCHES, 7, 48);
  scatter(DECO, 40, 6);
  g.save(); g.translate(0, ROAD_Y); g.fillStyle = g.createPattern(IMG.road, 'repeat-x'); g.fillRect(TOWN_X, 0, ROOM_X - TOWN_X, IMG.road.height); g.restore();
  for (let i = 0; i < 60; i++) { // soft light and shade so the repeating ground doesn't look flat
    const x = Math.random() * WORLD.w, y = Math.random() * WORLD.h, r = 60 + Math.random() * 160;
    const rg = g.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, Math.random() < 0.5 ? 'rgba(255,255,200,.08)' : 'rgba(0,30,0,.12)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rg; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  fill(g, 'town', 0, 0, TOWN_X, WORLD.h);
  fill(g, 'bossroom', ROOM_X, 0, WORLD.w - ROOM_X, WORLD.h);
  if (F.roomTint) { g.fillStyle = F.roomTint; g.fillRect(ROOM_X, 0, WORLD.w - ROOM_X, WORLD.h); }
  // fountain in town
  const fn = IMG.fountain;
  g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(205, 330, fn.width * 0.5, fn.width * 0.22, 0, 0, 7); g.fill();
  g.drawImage(fn, 200 - fn.width / 2, 300 - fn.height * 0.55);
  for (const p of F.ponds ?? []) { // stone rim, then water
    g.fillStyle = '#7d8798'; g.beginPath(); g.roundRect(p.x - 6, p.y - 6, p.w + 12, p.h + 12, 26); g.fill();
    g.save(); g.beginPath(); g.roundRect(p.x, p.y, p.w, p.h, 20); g.clip(); fill(g, 'water', p.x, p.y, p.w, p.h);
    g.fillStyle = 'rgba(0,20,60,.18)'; g.fillRect(p.x, p.y + p.h * 0.6, p.w, p.h * 0.4); g.restore(); // deeper toward the far edge
  }
  for (const w of GATE) {
    fill(g, 'wall', w.x, w.y, w.w, w.h);
    g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(w.x, w.y, w.w, w.h);
    g.fillStyle = 'rgba(255,255,255,.15)'; g.fillRect(w.x, w.y, 4, w.h);
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(w.x + w.w, w.y, 8, w.h);
  }
  for (const [x, y, k] of F.trees) {
    const img = IMG[TREE_TYPES[k].img];
    g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(x + img.width / 2, y + img.height - 8, img.width * 0.4, 12, 0, 0, 7); g.fill();
    g.drawImage(img, x, y);
  }
  g.font = 'bold 22px system-ui'; g.textAlign = 'center'; g.fillStyle = 'rgba(255,255,255,.3)';
  g.fillText(F.town, TOWN_X / 2, 80);
  g.fillText('Boss Room', (ROOM_X + WORLD.w) / 2 + 20, 160);
}
on('floorLoaded', paintFloor);
