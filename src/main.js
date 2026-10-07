// Self-hosted fonts (Fontsource): Kanit for Thai, Exo 2 for numbers/Latin
import '@fontsource/kanit/300.css';
import '@fontsource/kanit/400.css';
import '@fontsource/kanit/600.css';
import '@fontsource/exo-2/500.css';
import '@fontsource/exo-2/700.css';
import '@fontsource/exo-2/800.css';
import './style.css';

const cv = document.getElementById('c'), ctx = cv.getContext('2d');
const W = cv.width, H = cv.height, WORLD = { w: 2000, h: 1200 }, TOWN_X = 400, ROOM_X = 1500;
const ROOM = { x0: ROOM_X + 40, x1: WORLD.w, y0: 0, y1: WORLD.h };
const GATE = [{ x: ROOM_X, y: 0, w: 40, h: 540 }, { x: ROOM_X, y: 660, w: 40, h: 540 }];
const DOOR = { x: ROOM_X, y: 540, w: 40, h: 120 };
const TORCHES = [[1570, 80], [1570, 1120], [1960, 80], [1960, 1120], [1570, 470], [1570, 730]];
// Trees from village.png: sprite source rect, draw scale, and the solid box (relative to the drawn sprite)
const TREE = {
  big: { src: [0, 96, 64, 48], s: 2, hit: [20, 30, 88, 56] },
  small: { src: [64, 96, 32, 32], s: 2.5, hit: [14, 22, 52, 50] },
};

// ---------- floors ----------
const FLOORS = [
  {
    name: 'Floor 1', town: 'Town of Beginnings', grass: 0, roomTint: null, torch: '255,150,60',
    trees: [[660, 220, 'big'], [930, 780, 'big'], [1200, 380, 'small'], [800, 420, 'small'], [560, 860, 'small'], [1320, 720, 'small'], [1100, 1020, 'big']],
    spawns: [[600, 200], [650, 900], [900, 450], [1050, 250], [1100, 700], [1300, 950], [1350, 200], [800, 1050]],
    mob: { name: 'Frenzy Boar', img: 'boar', white: 'boarWhite', kind: 'beast', hp: 45, dmg: 10, speed: 140, wind: 0.35, xp: 25 },
    boss: { name: 'Kobold Lord', img: 'boss1', rageImg: 'boss1Rage', hp: 900, scale: 7, cd: [1.8, 1.1],
            moves: ['slam', 'charge'], rageMoves: ['slam', 'charge', 'leap'], dmg: { slam: 30, charge: 24, leap: 34, quake: 0 } },
  },
  {
    name: 'Floor 2', town: 'Urbus', grass: 11, roomTint: 'rgba(70,0,110,.3)', torch: '150,110,255',
    trees: [[520, 120, 'big'], [760, 300, 'small'], [980, 140, 'big'], [1250, 260, 'small'], [640, 760, 'big'], [880, 920, 'small'],
            [1150, 800, 'big'], [1340, 1000, 'small'], [480, 1000, 'small'], [1080, 420, 'small']],
    spawns: [[650, 250], [900, 300], [1150, 200], [700, 450], [1300, 450], [600, 880], [1000, 720], [1250, 700], [1000, 1050]],
    mob: { name: 'Taurus Soldier', img: 'taurusT', white: 'taurusWhite', kind: 'humanoid', hp: 90, dmg: 16, speed: 125, wind: 0.4, xp: 45 },
    boss: { name: 'Asterius the Taurus King', img: 'boss2', rageImg: 'boss2Rage', hp: 1800, scale: 8, cd: [1.6, 1.0], summon: 2,
            moves: ['slam', 'charge', 'quake'], rageMoves: ['slam', 'charge', 'leap', 'quake'], dmg: { slam: 40, charge: 34, leap: 40, quake: 30 } },
  },
  {
    name: 'Floor 3', town: 'Zumfut', grass: 0, roomTint: 'rgba(0,60,30,.3)', fieldTint: 'rgba(10,20,45,.35)', fog: true, torch: '120,255,150',
    trees: [[460, 60, 'big'], [700, 180, 'small'], [880, 60, 'big'], [1120, 200, 'small'], [1300, 80, 'small'], [520, 330, 'small'],
            [980, 360, 'big'], [1260, 380, 'small'], [460, 700, 'big'], [720, 800, 'small'], [900, 700, 'small'], [1100, 760, 'big'],
            [1340, 820, 'small'], [560, 980, 'small'], [820, 1020, 'big'], [1240, 1040, 'small']],
    spawns: [[640, 120], [1020, 120], [800, 300], [1180, 320], [650, 470], [1150, 480], [620, 880], [1000, 900], [1300, 700], [1000, 1100]],
    mob: { name: 'Dark Elf Warrior', img: 'elfT', white: 'bossWhite', kind: 'humanoid', hp: 140, dmg: 22, speed: 135, wind: 0.35, xp: 70 },
    // The treant is a big tree sprite instead of a character sheet: slow, no charge/leap, roots erupt under you
    boss: { name: 'Nerius the Evil Treant', tree: true, img: 'village', rageImg: 'treeRage', hp: 3200, bars: 5, r: 70, speed: [35, 50], cd: [1.5, 0.9], summon: 3,
            moves: ['slam', 'roots', 'quake'], rageMoves: ['roots', 'roots', 'quake', 'slam'], dmg: { slam: 55, roots: 45, quake: 40 } },
  },
];

const keys = {}, mouse = { x: W / 2, y: H / 2 }, cam = { x: 0, y: 0 };
// state: menu -> intro (Link Start tunnel) -> play <-> paused -> dead | win
let state = 'menu', P, mobs, boss, texts, parts, rings, doorClosed, portal, last, stop = 0, shake = 0, time = 0, introT = 0;
let floorIdx = 0, F = FLOORS[0], WALLS = [], run;
const SWING = 0.2;

// ---------- settings, records & screens ----------
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem('saoy.' + k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem('saoy.' + k, JSON.stringify(v)); } catch {} },
};
const settings = Object.assign({ music: 60, sfx: 80, shake: !reduced, flash: !reduced }, store.get('settings', {}));
const $ = id => document.getElementById(id);
const fmtTime = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
let current = 'title-screen', backTo = 'title-screen';
function screen(id) {
  current = id;
  for (const s of document.querySelectorAll('.screen')) s.classList.toggle('on', s.id === id);
  $(id)?.querySelector('.btn.primary, .btn, input')?.focus({ preventScroll: true });
}
function toast(title, sub, sec = 3.2) {
  $('toast-title').textContent = title; $('toast-sub').textContent = sub;
  const t = $('toast'); t.classList.remove('on'); void t.offsetWidth; t.style.setProperty('--dur', sec + 's'); t.classList.add('on');
}
function statCards(el, items) { el.innerHTML = items.map(([k, v]) => `<div class="stat"><span>${k}</span><b>${v}</b></div>`).join(''); }
const runStats = () => [['ชั้นที่ไปถึง', run.floor], ['เลเวล', P.lv], ['ล้มศัตรู', run.kills], ['เวลา', fmtTime(run.time)]];
function renderRecord() {
  const b = store.get('best', null);
  $('record').textContent = b ? `สถิติดีที่สุด: ${b.cleared ? 'เคลียร์ทุกชั้น' : 'ชั้น ' + b.floor} · Lv.${b.lv} · ${fmtTime(b.time)}` : '';
}
function endRun(cleared) {
  const best = store.get('best', null), mine = { floor: run.floor, lv: P.lv, time: run.time, kills: run.kills, cleared };
  const better = !best || mine.floor > best.floor || (mine.floor === best.floor && (cleared && !best.cleared || mine.lv > best.lv));
  if (better) store.set('best', mine);
  $('result-head').textContent = cleared ? 'System · Clear' : 'System · Game Over';
  $('result-title').textContent = cleared ? 'CONGRATULATIONS' : 'YOU ARE DEAD';
  $('result-title').className = 'result-title ' + (cleared ? 'clear' : 'dead');
  $('result-msg').textContent = cleared ? `ล้ม ${F.boss.name} ได้ · ชั้นที่ 4 ยังไม่เปิด (to be continued)`
                                        : `ตัวละคร Lv.${P.lv} ตายที่ ${F.name} และหายไปตลอดกาล`;
  $('newrec').hidden = !better; statCards($('result-stats'), runStats()); renderRecord();
  setTimeout(() => screen('result'), cleared ? 1400 : 1100);
}
function pauseGame() {
  if (state !== 'play') return;
  state = 'paused'; for (const k in keys) keys[k] = false; music?.pause();
  statCards($('pause-stats'), runStats()); screen('pause');
}
function resumeGame() { state = 'play'; screen(null); music?.play().catch(() => {}); }
function openSub(id) { backTo = current; screen(id); }
function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen?.().catch(() => {});
}
function startIntro() { initAudio(); screen(null); stopMusic(); state = 'intro'; introT = 0; SFX.linkStart(); }
function goHome() { state = 'menu'; P = null; stopMusic(); renderRecord(); screen('title-screen'); }
const ACTIONS = {
  start: () => ready.then(startIntro), howto: () => openSub('howto'), settings: () => openSub('settings'),
  back: () => screen(backTo), resume: resumeGame, quit: goHome, home: goHome, fullscreen: toggleFullscreen,
};
document.addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (b) { SFX.ui(); ACTIONS[b.dataset.act](); } });
// Settings controls
for (const k of ['music', 'sfx']) {
  const el = $('s-' + k), out = el.nextElementSibling;
  el.value = settings[k]; out.textContent = settings[k];
  el.oninput = () => { settings[k] = +el.value; out.textContent = el.value; store.set('settings', settings); applyAudio(); };
}
for (const k of ['shake', 'flash']) {
  const el = $('s-' + k); el.checked = settings[k];
  el.onchange = () => { settings[k] = el.checked; store.set('settings', settings); };
}
renderRecord();

const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const pick = a => a[Math.floor(Math.random() * a.length)];
const rage = () => boss.hp < boss.maxHp / 2;

// ---------- sprites (Ninja Adventure, CC0, pixel-boy) ----------
// Character sheets: 16x16 frames, columns = down/up/left/right, rows 0-3 walk, row 4 attack.
const IMG = {};
// 'source-in' = flat silhouette, 'multiply' = recolor keeping the pixel shading
function tinted(img, mode, col) {
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0); g.globalCompositeOperation = mode; g.fillStyle = col; g.fillRect(0, 0, c.width, c.height);
  g.globalCompositeOperation = 'destination-in'; g.drawImage(img, 0, 0);
  return c;
}
const TINTS = {
  taurus: { taurusT: '#d09a70' }, village: { treeRage: '#ff7050' },
  boss: { boss1: '#ff4a3a', boss1Rage: '#ff9a30', boss2: '#b070ff', boss2Rage: '#ff50b0', elfT: '#8a78c0' },
};
const loadImg = n => { const i = new Image(); i.src = `assets/${n}.png`; return i.decode().then(() => i); };
const ready = Promise.all(['player', 'boar', 'taurus', 'boss', 'shadow', 'sword', 'floor', 'interior', 'village', 'fog'].map(n => loadImg(n).then(img => {
  IMG[n] = img; IMG[n + 'White'] = tinted(img, 'source-in', '#fff');
  for (const [k, col] of Object.entries(TINTS[n] || {})) IMG[k] = tinted(img, 'multiply', col);
})));
// ---------- audio ----------
// Music: Ninja Adventure tracks (CC0). SFX: synthesized with Web Audio (the GitHub pack ships no sound effects).
const MUSIC = { 0: 'theme_plain', 1: 'theme_swamp', 2: 'theme_dream', boss: 'theme_lost_village', clear: 'theme_dream' };
const tracks = {};
let AC, master, music = null, muted = false;
function initAudio() {
  if (AC) return;
  AC = new AudioContext(); master = AC.createGain(); master.connect(AC.destination);
  for (const n of new Set(Object.values(MUSIC))) { tracks[n] = new Audio(`assets/music/${n}.mp3`); tracks[n].loop = true; }
  applyAudio();
}
function applyAudio() {
  if (!AC) return;
  master.gain.value = muted ? 0 : settings.sfx / 100 * 0.6;
  for (const t of Object.values(tracks)) { t.volume = settings.music / 100 * 0.5; t.muted = muted; }
}
function playMusic(key) {
  const t = tracks[MUSIC[key]];
  if (!t || t === music) return;
  if (music) music.pause();
  music = t; t.currentTime = 0; t.play().catch(() => {});
}
function stopMusic() { if (music) music.pause(); music = null; }
function toggleMute() {
  muted = !muted; applyAudio();
  toast(muted ? 'ปิดเสียงแล้ว' : 'เปิดเสียงแล้ว', 'กด M เพื่อสลับ', 1.4);
}
let noiseBuf;
function tone(freq, dur, type = 'square', vol = 0.2, slideTo, at = 0) {
  if (!AC) return;
  const t0 = AC.currentTime + at, o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.connect(g).connect(master); o.start(t0); o.stop(t0 + dur);
}
function noise(dur, vol, freq, q = 1, slideTo, at = 0) {
  if (!AC) return;
  if (!noiseBuf) {
    noiseBuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t0 = AC.currentTime + at, s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
  s.buffer = noiseBuf; f.type = 'bandpass'; f.Q.value = q; f.frequency.setValueAtTime(freq, t0);
  if (slideTo) f.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  s.connect(f).connect(g).connect(master); s.start(t0); s.stop(t0 + dur);
}
const SFX = {
  swing: () => noise(0.13, 0.3, 1500, 1.2, 5000),
  hit: big => { noise(0.08, 0.4, 900); tone(big ? 120 : 180, 0.12, 'square', 0.15, 50); },
  skill: () => { tone(300, 0.25, 'sawtooth', 0.1, 1400); noise(0.28, 0.25, 4000, 1, 700); },
  shatter: () => [2093, 2637, 3136, 4186].forEach((f, i) => tone(f, 0.3, 'triangle', 0.08, f * 0.8, i * 0.035)),
  hurt: () => { tone(220, 0.22, 'square', 0.16, 80); noise(0.12, 0.25, 500); },
  dodge: () => tone(900, 0.12, 'sine', 0.12, 2200),
  windup: () => tone(660, 0.06, 'square', 0.05),
  slam: () => { tone(90, 0.5, 'sine', 0.6, 35); noise(0.45, 0.45, 300, 0.7, 80); },
  charge: () => noise(0.4, 0.3, 200, 0.8, 900),
  roar: () => { tone(80, 0.9, 'sawtooth', 0.25, 45); noise(0.9, 0.3, 400, 0.5, 120); },
  levelUp: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, 'triangle', 0.15, null, i * 0.08)),
  portal: () => [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, 0.6, 'sine', 0.1, null, i * 0.1)),
  bossWind: () => { tone(160, 0.45, 'sawtooth', 0.12, 520); tone(240, 0.45, 'square', 0.05, 780); },
  linkStart: () => { [262, 330, 392, 523, 659, 784, 1047].forEach((f, i) => tone(f, 0.5, 'sine', 0.08, null, i * 0.11)); noise(1.6, 0.12, 600, 0.6, 6000); },
  ui: () => tone(1320, 0.05, 'sine', 0.05),
  death: () => { tone(440, 1.4, 'triangle', 0.2, 55); [1568, 1175, 880].forEach((f, i) => tone(f, 0.4, 'triangle', 0.06, null, 0.2 + i * 0.12)); },
};

const dirCol = a => Math.abs(Math.cos(a)) > Math.abs(Math.sin(a)) ? (Math.cos(a) > 0 ? 3 : 2) : (Math.sin(a) > 0 ? 0 : 1);
function frame(img, col, row, x, y, scale) {
  if (!img) return;
  const s = 16 * scale;
  ctx.drawImage(img, col * 16, row * 16, 16, 16, Math.round(x - s / 2), Math.round(y - s * 0.6), s, s);
}

// ---------- static art, painted per floor ----------
const bg = document.createElement('canvas'); bg.width = WORLD.w; bg.height = WORLD.h;
const vig = document.createElement('canvas'); vig.width = W; vig.height = H;
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
const overlaps = (a, b, m = 0) => a.x < b.x + b.w + m && b.x < a.x + a.w + m && a.y < b.y + b.h + m && b.y < a.y + a.h + m;
function paintFloor() {
  const g = bg.getContext('2d'), floor = IMG.floor, interior = IMG.interior, village = IMG.village;
  const gr = ([c, r]) => [c + F.grass, r];
  g.imageSmoothingEnabled = false;
  const [plain, detail] = TILE.grass[F.grass ? 1 : 0];
  fillTiles(g, floor, 0, 0, WORLD.w, WORLD.h, () => Math.random() < 0.8 ? plain : pick(detail));
  // Dirt patches that don't touch each other, the road or trees
  const placed = [{ x: 0, y: 552, w: WORLD.w, h: 96 }, ...WALLS];
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
    const t = TREE[k], [sx, sy, sw, sh] = t.src;
    g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath();
    g.ellipse(x + sw * t.s / 2, y + sh * t.s - 10, sw * t.s * 0.4, 12, 0, 0, 7); g.fill();
    g.drawImage(village, sx, sy, sw, sh, x, y, sw * t.s, sh * t.s);
  }
  g.font = 'bold 22px system-ui'; g.textAlign = 'center'; g.fillStyle = 'rgba(255,255,255,.3)';
  g.fillText(F.town, TOWN_X / 2, 80);
  g.fillText('Boss Room', (ROOM_X + WORLD.w) / 2 + 20, 160);
}

// ---------- game state ----------
function mob(x, y, summoned = false) {
  const M = F.mob;
  return { x, y, sx: x, sy: y, wx: x, wy: y, r: 16, hp: M.hp, maxHp: M.hp, cd: 0, dead: 0, hurt: 0, face: 0,
           side: 0, sideDir: 1, wind: 0, lunge: 0, kx: 0, ky: 0, summoned };
}
function loadFloor(i) {
  floorIdx = i; F = FLOORS[i];
  WALLS = [...GATE, ...F.trees.map(([x, y, k]) => { const h = TREE[k].hit; return { x: x + h[0], y: y + h[1], w: h[2], h: h[3] }; })];
  paintFloor(); paintMinimap();
  mobs = F.spawns.map(([x, y]) => mob(x, y));
  boss = { x: 1760, y: 600, z: 0, r: F.boss.r || 40, hp: F.boss.hp, lag: F.boss.hp, maxHp: F.boss.hp, awake: false, cd: 2, act: null,
           t: 0, tMax: 1, ang: 0, hurt: 0, hitP: false, summoned: false };
  Object.assign(P, { x: 200, y: 600, hp: P.maxHp, lag: P.maxHp, dash: 0, delay: 0, trail: [], kx: 0, ky: 0, inv: 0, buf: null });
  texts = []; parts = []; rings = []; doorClosed = false; portal = null; stop = 0; shake = 0;
  if (run) run.floor = Math.max(run.floor, i + 1);
  toast(`${F.name} · ${F.town}`, `บอสชั้นนี้: ${F.boss.name}`);
  playMusic(i);
}
function newGame() {
  P = { r: 14, maxHp: 100, atk: 10, lv: 1, xp: 0, ang: 0, atkCd: 0, skillCd: 0, hurt: 0, swing: 0, swingDir: 1, hitSet: null };
  run = { floor: 1, kills: 0, time: 0 };
  loadFloor(0); state = 'play';
}

function hitWall(e) {
  const ws = doorClosed ? [...WALLS, DOOR] : WALLS;
  return ws.some(w => {
    const cx = clamp(e.x, w.x, w.x + w.w), cy = clamp(e.y, w.y, w.y + w.h);
    return (e.x - cx) ** 2 + (e.y - cy) ** 2 < e.r * e.r;
  });
}
function move(e, dx, dy, minX = 0) {
  e.x += dx; if (hitWall(e) || e.x < e.r + minX || e.x > WORLD.w - e.r) e.x -= dx;
  e.y += dy; if (hitWall(e) || e.y < e.r || e.y > WORLD.h - e.r) e.y -= dy;
}
function knock(e, from, power) { const a = Math.atan2(e.y - from.y, e.x - from.x); e.kx = Math.cos(a) * power; e.ky = Math.sin(a) * power; }
function applyKnock(e, dt, minX) {
  if (Math.abs(e.kx) + Math.abs(e.ky) < 5) return;
  move(e, e.kx * dt, e.ky * dt, minX);
  const f = Math.pow(0.0005, dt); e.kx *= f; e.ky *= f;
}

// ---------- juice ----------
function text(x, y, s, col, big) { texts.push({ x, y, s, col, big, t: 0.8 }); }
function burst(x, y, n, col, spd, life, size, shard) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = spd * (0.3 + Math.random() * 0.7);
    parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life, t: life * (0.6 + Math.random() * 0.4),
                 col, size: size * (0.5 + Math.random() * 0.5), rot: Math.random() * 6, vr: (Math.random() - 0.5) * 14, shard });
  }
}
function ring(x, y, r0, r1, life, col) { rings.push({ x, y, r0, r1, life, t: life, col }); }
function kick(hitstop, shakeAmt) { stop = Math.max(stop, hitstop); if (settings.shake) shake = Math.max(shake, shakeAmt); }

function gainXp(n) {
  P.xp += n; text(P.x, P.y - 30, '+' + n + ' XP', '#7fd4ff');
  while (P.xp >= P.lv * 50) {
    P.xp -= P.lv * 50; P.lv++; P.maxHp += 20; P.atk += 3; P.hp = P.maxHp;
    text(P.x, P.y - 50, 'LEVEL UP!', '#ffd54a', true); SFX.levelUp();
    burst(P.x, P.y, 30, '#ffd54a', 220, 0.8, 5, true); ring(P.x, P.y, 10, 90, 0.5, '255,213,74');
  }
}
function hurtEnemy(e, d, big) {
  if (e.hp <= 0) return;
  e.hp -= d; e.hurt = 0.1; text(e.x, e.y - e.r - (e.z || 0), d, big ? '#ffb347' : '#fff', big); SFX.hit(big);
  burst(e.x, e.y - (e.z || 0), big ? 14 : 7, '#fff3c4', 320, 0.25, 3, false);
  kick(big ? 0.09 : 0.045, big ? 6 : 2);
  if (e !== boss) { knock(e, P, big ? 480 : 260); if (big) e.wind = 0; } // Sword Skill staggers a winding-up mob
  else if (F.boss.summon && !boss.summoned && rage()) {
    boss.summoned = true; SFX.roar(); text(boss.x, boss.y - 130, `${F.boss.name.split(' ')[0]} เรียกลูกน้อง!`, '#ff7043', true);
    for (let i = 0; i < F.boss.summon; i++) {
      const m = mob(boss.x + (i ? 90 : -90), boss.y + 90, true);
      m.x = clamp(m.x, ROOM.x0 + 20, WORLD.w - 20); mobs.push(m); ring(m.x, m.y, 5, 60, 0.4, '255,80,200');
    }
  }
  if (e.hp > 0) return;
  if (e === boss) {
    doorClosed = false; kick(0.35, 20); run.kills++; SFX.slam(); SFX.shatter(); playMusic('clear');
    burst(e.x, e.y, 90, '#8fe3ff', 420, 1.6, 12, true); burst(e.x, e.y, 40, '#ffd54a', 300, 1.4, 8, true);
    ring(e.x, e.y, 20, 260, 0.8, '143,227,255');
    for (const m of mobs) if (m.summoned && m.hp > 0) { m.hp = 0; m.dead = Infinity; burst(m.x, m.y, 20, '#8fe3ff', 260, 0.9, 8, true); }
    gainXp(F.mob.xp * 6);
    if (floorIdx < FLOORS.length - 1) {
      portal = { x: boss.x, y: boss.y }; SFX.portal();
      toast(`Congratulations! ${F.name} Cleared`, 'เดินเข้าประตูมิติสีฟ้าเพื่อขึ้นชั้นถัดไป', 4.5);
    } else {
      state = 'win';
      endRun(true);
    }
  } else {
    e.dead = e.summoned ? Infinity : 6; gainXp(F.mob.xp); SFX.shatter(); run.kills++;
    burst(e.x, e.y, 26, '#8fe3ff', 260, 0.9, 9, true); ring(e.x, e.y, 5, 50, 0.3, '143,227,255');
  }
}
function hurtPlayer(d, from) {
  if (state !== 'play') return;
  if (P.dash > 0) { text(P.x, P.y - 24, 'DODGE', '#7fd4ff'); SFX.dodge(); return; } // Sword Skill dash = i-frames
  if (P.inv > 0) return; // brief invulnerability after a hit, so a mob crowd can't chain-stun you
  P.hp -= d; P.hurt = 0.25; P.inv = INV_TIME; text(P.x, P.y - 20, '-' + d, '#ff5252', d >= 20); SFX.hurt();
  if (from) knock(P, from, d >= 20 ? 520 : 280);
  burst(P.x, P.y, 10, '#ff5252', 220, 0.35, 4, false); kick(0.05, d >= 20 ? 10 : 5);
  if (P.hp <= 0) {
    P.hp = 0; state = 'dead'; stopMusic(); SFX.death();
    burst(P.x, P.y, 40, '#8fe3ff', 260, 1.4, 9, true);
    endRun(false);
  }
}

// ---------- combat ----------
const targets = () => [...mobs, boss].filter(e => e.hp > 0 && (e !== boss || boss.awake));
// Input buffer: a press that arrives a little early (still on cooldown / mid-skill) fires as soon as it's allowed
// Bot full runs: no i-frames 1/4 wins, 0.6s 5/6, 0.4s 7/8 — i-frames mostly stop simultaneous multi-hits
const BUFFER = 0.15, INV_TIME = 0.4;
const canAttack = () => P.atkCd <= 0 && P.delay <= 0 && P.dash <= 0;
const canSkill = () => P.skillCd <= 0 && P.delay <= 0 && P.dash <= 0;
function attack() {
  if (state !== 'play') return;
  if (!canAttack()) { P.buf = { kind: 'attack', t: BUFFER }; return; }
  P.atkCd = 0.32; P.swing = SWING; P.swingDir = -P.swingDir; SFX.swing();
  for (const e of targets()) {
    if (dist(P, e) > 55 + e.r) continue;
    let a = Math.atan2(e.y - P.y, e.x - P.x) - P.ang;
    a = Math.atan2(Math.sin(a), Math.cos(a));
    if (Math.abs(a) <= Math.PI * 0.4) hurtEnemy(e, P.atk + rand(0, 3));
  }
}
function skill() {
  if (state !== 'play') return;
  if (!canSkill()) { P.buf = { kind: 'skill', t: BUFFER }; return; }
  P.skillCd = 3; P.dash = 0.18; P.hitSet = new Set(); SFX.skill();
  text(P.x, P.y - 30, 'Sonic Leap!', '#ffb347', true);
}
const bossDmg = k => Math.round(F.boss.dmg[k] * (rage() ? 1.25 : 1));
function endBossAct() { boss.act = null; boss.cd = F.boss.cd[rage() ? 1 : 0]; boss.z = 0; }
function bossAct(act, t) { boss.act = act; boss.t = boss.tMax = t; boss.hitP = false; }
function startBossMove(mv) {
  const fast = rage();
  if (mv !== 'charge') SFX.bossWind(); // audio cue to go with the red telegraph (charge has its own whoosh)
  if (mv === 'leap') {
    boss.from = { x: boss.x, y: boss.y };
    boss.to = { x: clamp(P.x, ROOM.x0 + boss.r, WORLD.w - boss.r), y: clamp(P.y, boss.r, WORLD.h - boss.r) };
    bossAct('leap', fast ? 0.8 : 1);
  } else if (mv === 'roots') { // spikes under the player plus random spots around the room
    boss.spots = [{ x: P.x, y: P.y }];
    for (let i = 0; i < (fast ? 8 : 4); i++) boss.spots.push({ x: rand(ROOM.x0 + 40, WORLD.w - 40), y: rand(40, WORLD.h - 40) });
    bossAct('roots', fast ? 0.75 : 0.95);
  } else bossAct(mv, mv === 'quake' ? 0.9 : fast ? 0.6 : 0.9);
}

function updateBoss(dt) {
  if (!boss.awake && P.x > ROOM_X + 60) {
    boss.awake = true; doorClosed = true; kick(0, 10); SFX.roar(); playMusic('boss');
    text(boss.x, boss.y - 70, F.boss.name, '#ff7043', true);
  }
  if (!boss.awake || boss.hp <= 0) return;
  boss.hurt -= dt;
  if (!boss.act) {
    boss.cd -= dt;
    const a = Math.atan2(P.y - boss.y, P.x - boss.x), sp = (F.boss.speed || [65, 95])[rage() ? 1 : 0];
    boss.ang = a;
    if (dist(boss, P) > boss.r + P.r) move(boss, Math.cos(a) * sp * dt, Math.sin(a) * sp * dt, ROOM.x0);
    if (boss.cd <= 0) startBossMove(pick(rage() ? F.boss.rageMoves : F.boss.moves));
    return;
  }
  boss.t -= dt;
  if (boss.act === 'dash') {
    const ox = boss.x, oy = boss.y;
    move(boss, Math.cos(boss.ang) * 760 * dt, Math.sin(boss.ang) * 760 * dt, ROOM.x0);
    if (Math.random() < 0.6) burst(boss.x, boss.y + boss.r * 0.7, 1, '#8a6a4a', 60, 0.4, 6, false);
    if (!boss.hitP && dist(boss, P) < boss.r + P.r) { boss.hitP = true; hurtPlayer(bossDmg('charge'), boss); }
    if (boss.t <= 0 || (boss.x === ox && boss.y === oy)) { endBossAct(); kick(0, 6); }
  } else if (boss.act === 'leap') {
    const k = 1 - boss.t / boss.tMax, e = k * k * (3 - 2 * k);
    boss.x = lerp(boss.from.x, boss.to.x, e); boss.y = lerp(boss.from.y, boss.to.y, e); boss.z = Math.sin(k * Math.PI) * 160;
    if (boss.t <= 0) {
      boss.x = boss.to.x; boss.y = boss.to.y;
      ring(boss.x, boss.y, 30, 120, 0.35, '255,80,80'); burst(boss.x, boss.y, 36, '#9a7a5a', 320, 0.6, 7, false); kick(0.08, 18); SFX.slam();
      if (dist(boss, P) < 110 + P.r) hurtPlayer(bossDmg('leap'), boss);
      endBossAct();
    }
  } else if (boss.act === 'wave') {
    boss.waveR += 380 * dt;
    if (!boss.hitP && Math.abs(dist(boss, P) - boss.waveR) < 22) { boss.hitP = true; hurtPlayer(bossDmg('quake'), boss); }
    if (boss.waveR > 520) endBossAct();
  } else if (boss.t <= 0) {
    if (boss.act === 'slam') {
      ring(boss.x, boss.y, 40, 140, 0.35, '255,80,80'); burst(boss.x, boss.y, 30, '#9a7a5a', 300, 0.6, 7, false); kick(0.06, 14); SFX.slam();
      if (dist(boss, P) < 130 + P.r) hurtPlayer(bossDmg('slam'), boss);
      endBossAct();
    } else if (boss.act === 'roots') {
      for (const s of boss.spots) {
        burst(s.x, s.y, 14, '#7a5a30', 260, 0.5, 7, false); ring(s.x, s.y, 10, 60, 0.3, '120,200,90');
        if (!boss.hitP && dist(s, P) < 60 + P.r) { boss.hitP = true; hurtPlayer(bossDmg('roots'), s); }
      }
      kick(0.04, 10); SFX.slam(); endBossAct();
    } else if (boss.act === 'quake') {
      kick(0.05, 16); SFX.slam(); boss.act = 'wave'; boss.waveR = 40; boss.hitP = false;
    } else { bossAct('dash', 0.45); SFX.charge(); }
  }
}

function update(dt) {
  P.atkCd -= dt; P.skillCd -= dt; P.hurt -= dt; P.swing -= dt; P.inv -= dt;
  if (P.buf) {
    const b = P.buf;
    if ((b.kind === 'attack' ? canAttack : canSkill)()) { P.buf = null; b.kind === 'attack' ? attack() : skill(); }
    else if ((b.t -= dt) <= 0) P.buf = null;
  }
  P.lag = P.lag > P.hp ? Math.max(P.hp, P.lag - 50 * dt) : P.hp;
  boss.lag = boss.lag > boss.hp ? Math.max(boss.hp, boss.lag - 160 * dt) : boss.hp;
  run.time += dt;

  // Player: Sword Skill dash -> post-motion delay -> normal movement
  if (P.dash > 0) {
    P.dash -= dt;
    move(P, Math.cos(P.ang) * 900 * dt, Math.sin(P.ang) * 900 * dt);
    P.trail.push({ x: P.x, y: P.y, t: 0.25 });
    for (const e of targets()) if (!P.hitSet.has(e) && dist(P, e) < e.r + 35) {
      P.hitSet.add(e); hurtEnemy(e, Math.round(P.atk * 2.5), true);
    }
    if (P.dash <= 0) P.delay = 0.5;
  } else {
    P.ang = Math.atan2(mouse.y + cam.y - P.y, mouse.x + cam.x - P.x);
    applyKnock(P, dt);
    if (P.delay > 0) { P.delay -= dt; P.moving = false; }
    else {
      const dx = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
      const dy = (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0);
      const l = Math.hypot(dx, dy) || 1;
      move(P, dx / l * 220 * dt, dy / l * 220 * dt);
      P.moving = dx || dy;
    }
  }
  if (P.x < TOWN_X) P.hp = Math.min(P.maxHp, P.hp + 15 * dt);
  if (portal && dist(P, portal) < 40) { loadFloor(floorIdx + 1); return; }

  // Mobs: wander, chase outside town, wind up (telegraph) then lunge
  for (const m of mobs) {
    if (m.hp <= 0) { if ((m.dead -= dt) <= 0) Object.assign(m, mob(m.sx, m.sy)); continue; }
    m.cd -= dt; m.hurt -= dt; m.lunge -= dt;
    applyKnock(m, dt, TOWN_X);
    const d = dist(m, P), chase = d < 260 && P.x > TOWN_X;
    if (m.wind > 0) {
      m.face = Math.atan2(P.y - m.y, P.x - m.x); m.wind -= dt;
      if (m.wind <= 0) { m.lunge = 0.15; m.cd = 1; if (d < m.r + P.r + 24) hurtPlayer(F.mob.dmg, m); }
      continue;
    }
    if (!chase && (Math.hypot(m.wx - m.x, m.wy - m.y) < 5 || Math.random() < dt * 0.3)) {
      m.wx = m.sx + rand(-80, 80); m.wy = m.sy + rand(-80, 80);
    }
    const tx = chase ? P.x : m.wx, ty = chase ? P.y : m.wy;
    m.face = Math.atan2(ty - m.y, tx - m.x);
    if (chase && d <= m.r + P.r + 8) { if (m.cd <= 0) { m.wind = F.mob.wind; SFX.windup(); } continue; }
    const sp = chase ? F.mob.speed : 50, ox = m.x, oy = m.y, siding = m.side > 0;
    if (siding) { // walking around an obstacle
      m.side -= dt;
      move(m, -Math.sin(m.face) * m.sideDir * sp * dt, Math.cos(m.face) * m.sideDir * sp * dt, TOWN_X);
    } else move(m, Math.cos(m.face) * sp * dt, Math.sin(m.face) * sp * dt, TOWN_X);
    if (Math.hypot(m.x - ox, m.y - oy) < sp * dt * 0.3) { // (nearly) blocked: sidestep for a moment
      m.sideDir = siding ? -m.sideDir : (Math.random() < 0.5 ? 1 : -1); m.side = 0.5;
      if (!chase) { m.wx = m.sx + rand(-80, 80); m.wy = m.sy + rand(-80, 80); }
    }
  }

  updateBoss(dt);
}

function updateFx(dt) {
  const f = Math.pow(0.03, dt);
  for (const p of parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= f; p.vy *= f; p.rot += p.vr * dt; p.t -= dt; }
  for (const t of texts) { t.t -= dt; t.y -= 30 * dt; }
  for (const r of rings) r.t -= dt;
  for (const p of P.trail) p.t -= dt;
  parts = parts.filter(p => p.t > 0); texts = texts.filter(t => t.t > 0);
  rings = rings.filter(r => r.t > 0); P.trail = P.trail.filter(p => p.t > 0);
  shake *= Math.pow(0.002, dt);
}

// ---------- drawing ----------
function shadow(x, y, r, k = 1) {
  ctx.globalAlpha = k; ctx.drawImage(IMG.shadow, x - r * 1.1 * k, y + r * 0.45, r * 2.2 * k, r * 1.2 * k); ctx.globalAlpha = 1;
}
function drawMob(m) {
  shadow(m.x, m.y, m.r);
  // wind-up: shake + red flash; lunge: hop toward the target
  const jit = m.wind > 0 ? Math.sin(time * 70) * 2 : 0, hop = m.lunge > 0 ? Math.sin((m.lunge / 0.15) * Math.PI) * 12 : 0;
  const x = Math.round(m.x + jit + Math.cos(m.face) * hop), y = Math.round(m.y + Math.sin(m.face) * hop);
  // reduced-flash mode: no white/blink frames, the steady red glow + "!" carry the wind-up
  const flash = settings.flash && (m.hurt > 0 || (m.wind > 0 && Math.floor(time * 16) % 2 === 0));
  const img = flash ? IMG[F.mob.white] : IMG[F.mob.img];
  ctx.save();
  if (m.wind > 0 && m.hurt <= 0) { ctx.shadowColor = '#ff2020'; ctx.shadowBlur = 14; }
  if (F.mob.kind === 'beast') {
    const f = Math.floor(time * 6 + m.sx) % 2, s = 48; // sheet faces left
    ctx.translate(x, y); if (Math.cos(m.face) > 0) ctx.scale(-1, 1);
    ctx.drawImage(img, f * 16, 0, 16, 16, -s / 2, -s * 0.6, s, s);
  } else {
    const row = m.wind > 0 || m.lunge > 0 ? 4 : Math.floor(time * 8 + m.sx) % 4;
    frame(img, dirCol(m.face), row, x, y, 3);
  }
  ctx.restore();
  if (m.wind > 0) { ctx.fillStyle = '#ff4040'; ctx.font = '900 18px system-ui'; ctx.textAlign = 'center'; ctx.fillText('!', x, y - 36); }
  if (m.hp < m.maxHp) {
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(m.x - 18, m.y - 44, 36, 5);
    ctx.fillStyle = '#ff4d4d'; ctx.fillRect(m.x - 18, m.y - 44, 36 * m.hp / m.maxHp, 5);
  }
}
function drawBoss() {
  const b = boss, attacking = b.act && b.act !== 'charge', winding = (b.act === 'slam' || b.act === 'quake' || b.act === 'charge');
  if (F.boss.tree) { ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(b.x, b.y + b.r * 0.55, b.r * 1.4, b.r * 0.45, 0, 0, 7); ctx.fill(); }
  else shadow(b.x, b.y, b.r, 1 - b.z / 320);
  const jit = winding || b.act === 'roots' ? Math.sin(time * 60) * 3 : 0;
  if (F.boss.tree) { // big tree from village.png that sways, swells while winding up, and glows red with rage
    const s = 3.5, w = 64 * s, h = 48 * s, swell = winding || b.act === 'roots' ? 1 + 0.06 * Math.sin(time * 20) : 1;
    ctx.save(); ctx.translate(b.x + jit, b.y + b.r * 0.6); ctx.rotate(Math.sin(time * 1.6) * 0.04); ctx.scale(swell, 1 / swell);
    if (rage()) { ctx.shadowColor = '#ff4020'; ctx.shadowBlur = 30; }
    const img = b.hurt > 0 && settings.flash ? IMG.villageWhite : IMG[rage() ? F.boss.rageImg : F.boss.img];
    ctx.drawImage(img, 0, 96, 64, 48, -w / 2, -h, w, h);
    ctx.restore();
    ctx.save(); ctx.shadowColor = '#ff3020'; ctx.shadowBlur = 12; ctx.fillStyle = '#ffdd33';
    for (const dx of [-18, 18]) { ctx.beginPath(); ctx.arc(b.x + dx + jit, b.y - 40, 5, 0, 7); ctx.fill(); } // glowing eyes
    ctx.restore();
    return;
  }
  ctx.save(); if (rage()) { ctx.shadowColor = '#ffb300'; ctx.shadowBlur = 25; }
  const img = b.hurt > 0 && settings.flash ? IMG.bossWhite : IMG[rage() ? F.boss.rageImg : F.boss.img];
  frame(img, dirCol(b.ang), attacking ? 4 : Math.floor(time * 5) % 4, b.x + jit, b.y - b.z, F.boss.scale);
  ctx.restore();
}
function drawTelegraph() {
  if (!boss.act || boss.hp <= 0) return;
  const p = 1 - boss.t / boss.tMax, pulse = 0.5 + 0.5 * Math.sin(time * 30);
  ctx.save();
  ctx.strokeStyle = `rgba(255,60,60,${0.5 + pulse * 0.4})`; ctx.lineWidth = 3; ctx.fillStyle = 'rgba(255,40,40,.28)';
  if (boss.act === 'slam') {
    ctx.beginPath(); ctx.arc(boss.x, boss.y, 130, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.arc(boss.x, boss.y, 130 * p, 0, 7); ctx.fill();
  } else if (boss.act === 'charge') {
    ctx.translate(boss.x, boss.y); ctx.rotate(boss.ang);
    ctx.strokeRect(0, -boss.r, 340, boss.r * 2); ctx.fillRect(0, -boss.r, 340 * p, boss.r * 2);
  } else if (boss.act === 'leap') {
    ctx.beginPath(); ctx.arc(boss.to.x, boss.to.y, 110, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.arc(boss.to.x, boss.to.y, 110 * p, 0, 7); ctx.fill();
  } else if (boss.act === 'roots') {
    for (const s of boss.spots) {
      ctx.beginPath(); ctx.arc(s.x, s.y, 60, 0, 7); ctx.stroke();
      ctx.beginPath(); ctx.arc(s.x, s.y, 60 * p, 0, 7); ctx.fill();
    }
  } else if (boss.act === 'quake') {
    ctx.strokeStyle = `rgba(200,80,255,${0.5 + pulse * 0.5})`; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(boss.x, boss.y, 50 + 30 * p, 0, 7); ctx.stroke();
  } else if (boss.act === 'wave') {
    ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(200,90,255,.8)'; ctx.lineWidth = 24;
    ctx.shadowColor = '#c060ff'; ctx.shadowBlur = 20;
    ctx.beginPath(); ctx.arc(boss.x, boss.y, boss.waveR, 0, 7); ctx.stroke();
  }
  ctx.restore();
}
function swordAngle() {
  if (P.swing > 0) { const k = 1 - P.swing / SWING, e = 1 - (1 - k) ** 3; return P.ang + P.swingDir * (-1.3 + 2.6 * e); }
  if (P.dash > 0) return P.ang;
  if (P.delay > 0) return P.ang + P.swingDir * 1.4; // follow-through pose after the skill
  return P.ang + P.swingDir * -0.5 + Math.sin(time * 3) * 0.05;
}
function drawPlayer() {
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
  const skillFx = P.delay > 0 || P.dash > 0, col = dirCol(P.ang), sa = swordAngle();
  const hx = P.x + Math.cos(P.ang) * 6, hy = P.y + 4 + Math.sin(P.ang) * 4; // hand
  const sword = () => {
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(sa - Math.PI / 2); // sprite has the grip on top, blade pointing down
    if (skillFx || P.swing > 0) { ctx.shadowColor = '#7fd4ff'; ctx.shadowBlur = skillFx ? 18 : 8; }
    ctx.drawImage(IMG.sword, -12, -6, 24.5, 42); ctx.restore();
  };
  // Swing arc that follows the blade tip
  if (P.swing > 0) {
    const start = P.ang - P.swingDir * 1.3;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.shadowColor = '#bfe8ff'; ctx.shadowBlur = 18; ctx.lineCap = 'round';
    ctx.strokeStyle = `rgba(220,240,255,${0.3 + P.swing / SWING * 0.7})`; ctx.lineWidth = 10;
    ctx.beginPath(); ctx.arc(hx, hy, 40, Math.min(start, sa), Math.max(start, sa)); ctx.stroke();
    ctx.restore();
  }
  const behind = Math.sin(sa) < -0.3; // blade pointing up = behind the body
  if (behind) sword();
  ctx.save();
  if (skillFx) { ctx.shadowColor = P.delay > 0 ? '#ffb347' : '#7fd4ff'; ctx.shadowBlur = 22; }
  const row = P.swing > 0 || P.dash > 0 ? 4 : P.moving ? Math.floor(time * 10) % 4 : 0;
  const bob = P.moving && P.swing <= 0 ? Math.abs(Math.sin(time * 20)) * -2 : 0;
  if (P.inv > 0) ctx.globalAlpha = settings.flash && Math.floor(time * 20) % 2 ? 0.35 : 0.65; // i-frame blink (steady when flashing is off)
  frame(P.hurt > 0.15 && settings.flash ? IMG.playerWhite : IMG.player, col, row, P.x, P.y + bob, 3);
  ctx.restore();
  if (!behind) sword();
}
function drawTorches() {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const [x, y] of TORCHES) {
    const r = 110 + Math.sin(time * 9 + x) * 8 + Math.random() * 4;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${F.torch},.35)`); g.addColorStop(1, `rgba(${F.torch},0)`);
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.fillStyle = `rgb(${F.torch})`; ctx.beginPath(); ctx.ellipse(x, y - 4, 4, 7 + Math.random() * 2, 0, 0, 7); ctx.fill();
  }
  ctx.restore();
}
function drawDoor() {
  if (!doorClosed) return;
  ctx.save(); ctx.shadowColor = '#ff3030'; ctx.shadowBlur = 20;
  ctx.fillStyle = `rgba(200,30,30,${0.6 + 0.2 * Math.sin(time * 6)})`; ctx.fillRect(DOOR.x, DOOR.y, DOOR.w, DOOR.h);
  ctx.strokeStyle = '#ff8a80'; ctx.lineWidth = 2;
  for (let y = DOOR.y + 10; y < DOOR.y + DOOR.h; y += 20) { ctx.beginPath(); ctx.moveTo(DOOR.x, y); ctx.lineTo(DOOR.x + DOOR.w, y); ctx.stroke(); }
  ctx.restore();
}
function drawPortal() {
  if (!portal) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(portal.x, portal.y);
  for (let i = 0; i < 3; i++) {
    ctx.rotate(time * (1 + i * 0.5));
    ctx.strokeStyle = `rgba(127,212,255,${0.5 - i * 0.12})`; ctx.lineWidth = 6 - i;
    ctx.beginPath(); ctx.ellipse(0, 0, 44 - i * 10, 30 - i * 6, 0, 0, 5); ctx.stroke();
  }
  ctx.restore();
  if (Math.random() < 0.3) burst(portal.x, portal.y, 1, '#8fe3ff', 80, 0.8, 5, true);
}
function drawFx() {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const p of parts) {
    ctx.globalAlpha = clamp(p.t / p.life, 0, 1); ctx.fillStyle = p.col;
    if (p.shard) {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.beginPath();
      ctx.moveTo(0, -p.size); ctx.lineTo(p.size * 0.45, 0); ctx.lineTo(0, p.size); ctx.lineTo(-p.size * 0.45, 0); ctx.fill(); ctx.restore();
    } else ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  for (const r of rings) {
    const k = 1 - r.t / r.life; ctx.globalAlpha = r.t / r.life;
    ctx.strokeStyle = `rgb(${r.col})`; ctx.lineWidth = 6 * (1 - k) + 1;
    ctx.beginPath(); ctx.arc(r.x, r.y, r.r0 + (r.r1 - r.r0) * k, 0, 7); ctx.stroke();
  }
  ctx.restore();
  ctx.textAlign = 'center'; ctx.lineJoin = 'round';
  for (const t of texts) {
    const pop = 1 + Math.max(0, (t.t - 0.65) / 0.15) * 0.6;
    ctx.globalAlpha = clamp(t.t / 0.3, 0, 1);
    ctx.font = `900 ${Math.round((t.big ? 22 : 16) * pop)}px system-ui`;
    ctx.strokeStyle = 'rgba(0,0,0,.8)'; ctx.lineWidth = 4; ctx.strokeText(t.s, t.x, t.y);
    ctx.fillStyle = t.col; ctx.fillText(t.s, t.x, t.y);
  }
  ctx.globalAlpha = 1;
}

// SAO-style slanted HP bar with a white "damage lag" segment
function slant(x, y, w, h) {
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w - h * 0.8, y + h); ctx.lineTo(x, y + h); ctx.closePath();
}
const FN = "'Exo 2','Kanit',system-ui,sans-serif", FT = "'Kanit','Exo 2',system-ui,sans-serif";
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
function panel(x, y, w, h, r = 10) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = 'rgba(10,14,24,.62)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1; ctx.stroke();
}
function drawPlayerPanel() {
  slant(14, 14, 404, 60); ctx.fillStyle = 'rgba(10,14,24,.62)'; ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.lineWidth = 1; ctx.stroke();
  // level badge
  ctx.beginPath(); ctx.arc(46, 44, 21, 0, 7); ctx.fillStyle = '#f39a1d'; ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.stroke();
  ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = `700 10px ${FN}`; ctx.fillText('LV', 46, 36);
  ctx.font = `800 17px ${FN}`; ctx.fillText(P.lv, 46, 54);
  ctx.textAlign = 'left'; ctx.font = `700 14px ${FN}`; ctx.fillStyle = '#fff'; ctx.fillText('PLAYER', 78, 33);
  hpBar(78, 39, 316, 15, P.hp / P.maxHp, P.lag / P.maxHp);
  ctx.textAlign = 'right'; ctx.font = `700 12px ${FN}`; ctx.fillStyle = '#e8eef7';
  ctx.fillText(`${Math.ceil(P.hp)} / ${P.maxHp}`, 380, 33);
  ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(78, 59, 240, 3);
  ctx.fillStyle = '#5fc3ff'; ctx.fillRect(78, 59, 240 * P.xp / (P.lv * 50), 3);
  const zone = P.x < TOWN_X ? ['SAFE ZONE · HP ฟื้นฟู', '#9fe89f'] : P.x > ROOM_X ? ['BOSS ROOM', '#ff8a7a'] : ['FIELD', '#cfd8e6'];
  ctx.textAlign = 'left'; ctx.font = `600 12px ${FT}`; ctx.fillStyle = zone[1]; ctx.fillText(`${F.name} · ${zone[0]}`, 22, 92);
}
function drawBossBar() {
  if (!boss.awake || boss.hp <= 0) return;
  // SAO bosses show several stacked HP bars: one drains at a time, pips count the ones left
  const bars = F.boss.bars || 4, seg = boss.maxHp / bars, left = Math.ceil(boss.hp / seg);
  const frac = (boss.hp - (left - 1) * seg) / seg, lag = boss.lag > left * seg ? 1 : (boss.lag - (left - 1) * seg) / seg;
  const w = 440, x = (W - w) / 2, y = H - 118; // bottom centre, above the skill slots
  ctx.textAlign = 'center'; ctx.font = `700 14px ${FN}`; ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.lineWidth = 4; ctx.strokeText(F.boss.name, W / 2, y - 8);
  ctx.fillStyle = rage() ? '#ffd760' : '#fff'; ctx.fillText(F.boss.name, W / 2, y - 8);
  hpBar(x, y, w, 14, frac, lag);
  for (let i = 0; i < bars; i++) {
    const px = x + i * 22;
    slant(px, y + 19, 18, 6); ctx.fillStyle = i < left - 1 ? '#ff6a4d' : 'rgba(255,255,255,.18)'; ctx.fill();
  }
}
function drawSkillSlots() {
  const s = 56, gap = 12, x0 = W / 2 - s - gap / 2, y = H - s - 18;
  const slots = [
    { key: 'J', label: 'ฟัน', cd: Math.max(0, P.atkCd) / 0.32, glow: false },
    { key: 'K', label: 'Sonic Leap', cd: Math.max(0, P.skillCd) / 3, glow: P.skillCd <= 0, secs: P.skillCd },
  ];
  slots.forEach((sl, i) => {
    const x = x0 + i * (s + gap), cx = x + s / 2, cy = y + s / 2;
    ctx.save();
    if (sl.glow) { ctx.shadowColor = '#f39a1d'; ctx.shadowBlur = 16; }
    panel(x, y, s, s, 12); ctx.restore();
    if (sl.glow) { ctx.beginPath(); ctx.roundRect(x, y, s, s, 12); ctx.strokeStyle = '#f39a1d'; ctx.lineWidth = 2; ctx.stroke(); }
    ctx.save(); ctx.translate(cx, cy + 2); ctx.rotate(i ? -Math.PI / 4 : Math.PI / 4);
    if (i) { ctx.shadowColor = '#5fc3ff'; ctx.shadowBlur = 10; }
    ctx.drawImage(IMG.sword, -7, -16, 14, 28); ctx.restore();
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
    ctx.beginPath(); ctx.roundRect(x + 4, y + 4, 18, 16, 4); ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fill();
    ctx.textAlign = 'center'; ctx.font = `800 11px ${FN}`; ctx.fillStyle = '#2b313b'; ctx.fillText(sl.key, x + 13, y + 16);
    ctx.font = `600 11px ${FT}`; ctx.fillStyle = '#dfe7f2'; ctx.fillText(sl.label, cx, y + s + 13);
  });
}
// Minimap: static terrain is pre-rendered per floor, dots are drawn live
const mm = document.createElement('canvas'), MM = 0.1; mm.width = WORLD.w * MM; mm.height = WORLD.h * MM;
function paintMinimap() {
  const g = mm.getContext('2d');
  g.fillStyle = ['#7fa846', '#4f8f3d', '#3c5b47'][floorIdx]; g.fillRect(0, 0, mm.width, mm.height);
  g.fillStyle = '#a07a4c'; g.fillRect(TOWN_X * MM, 560 * MM, (ROOM_X - TOWN_X) * MM, 80 * MM);
  g.fillStyle = '#c9a56e'; g.fillRect(0, 0, TOWN_X * MM, mm.height);
  g.fillStyle = '#4a3a44'; g.fillRect(ROOM_X * MM, 0, (WORLD.w - ROOM_X) * MM, mm.height);
  g.fillStyle = '#1f2a22'; for (const w of WALLS) g.fillRect(w.x * MM, w.y * MM, Math.max(2, w.w * MM), Math.max(2, w.h * MM));
}
function drawMinimap() {
  const w = mm.width, h = mm.height, x = W - w - 16, y = 16;
  panel(x - 6, y - 6, w + 12, h + 30, 10);
  ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, w, h, 6); ctx.clip();
  ctx.globalAlpha = 0.9; ctx.drawImage(mm, x, y); ctx.globalAlpha = 1;
  if (doorClosed) { ctx.fillStyle = '#ff4a3a'; ctx.fillRect(x + DOOR.x * MM, y + DOOR.y * MM, DOOR.w * MM, DOOR.h * MM); }
  ctx.fillStyle = '#ff5a4a'; for (const m of mobs) if (m.hp > 0) ctx.fillRect(x + m.x * MM - 1.5, y + m.y * MM - 1.5, 3, 3);
  if (boss.hp > 0) {
    const r = 4 + (boss.awake ? Math.sin(time * 6) : 0);
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
function drawHud() { drawPlayerPanel(); drawBossBar(); drawSkillSlots(); drawMinimap(); }

// Title background: drifting crystal shards around a slowly turning ring (Aincrad's silhouette)
const shards = Array.from({ length: 46 }, () => ({ x: Math.random() * W, y: Math.random() * H, s: 3 + Math.random() * 9, v: 8 + Math.random() * 26, r: Math.random() * 6 }));
function drawMenuBg(dt) {
  const g = ctx.createRadialGradient(W / 2, H * 0.42, 40, W / 2, H / 2, W * 0.75);
  g.addColorStop(0, '#1d3654'); g.addColorStop(1, '#05070c'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.translate(W / 2, H * 0.42); ctx.rotate(time * 0.05);
  for (let i = 0; i < 3; i++) { ctx.strokeStyle = `rgba(95,195,255,${0.12 - i * 0.03})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, 0, 300 + i * 40, 90 + i * 14, 0, 0, 7); ctx.stroke(); }
  ctx.restore();
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const p of shards) {
    p.y -= p.v * dt; p.r += dt; if (p.y < -20) { p.y = H + 20; p.x = Math.random() * W; }
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.globalAlpha = 0.25 + 0.25 * Math.sin(time + p.x);
    ctx.fillStyle = '#8fe3ff'; ctx.beginPath(); ctx.moveTo(0, -p.s); ctx.lineTo(p.s * 0.45, 0); ctx.lineTo(0, p.s); ctx.lineTo(-p.s * 0.45, 0); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}
// "Link Start": a tunnel of rainbow rings rushing outward, then the game fades in
function drawIntro() {
  const k = introT / 1.9;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(W / 2, H / 2);
  for (let i = 0; i < 16; i++) {
    const p = (introT * 0.9 + i / 16) % 1, r = p * p * W * 0.9;
    ctx.strokeStyle = `hsla(${i * 23 + introT * 160},95%,62%,${(1 - p) * 0.8})`; ctx.lineWidth = 2 + p * 14;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.stroke();
  }
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 160); glow.addColorStop(0, `rgba(255,255,255,${0.5 * k})`); glow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = glow; ctx.fillRect(-160, -160, 320, 320);
  ctx.restore();
  ctx.globalAlpha = clamp((introT - 0.25) * 3, 0, 1) * clamp((1.9 - introT) * 4, 0, 1);
  ctx.textAlign = 'center'; ctx.font = `800 54px ${FN}`; ctx.fillStyle = '#fff'; ctx.fillText('LINK START', W / 2, H / 2 + 18);
  ctx.globalAlpha = 1;
  if (k > 0.8) { ctx.fillStyle = settings.flash ? `rgba(255,255,255,${(k - 0.8) * 5})` : `rgba(0,0,0,${(k - 0.8) * 5})`; ctx.fillRect(0, 0, W, H); }
}

function draw() {
  cam.x = clamp(P.x - W / 2, 0, WORLD.w - W); cam.y = clamp(P.y - H / 2, 0, WORLD.h - H);
  ctx.imageSmoothingEnabled = false;
  const sx = (Math.random() - 0.5) * shake, sy = (Math.random() - 0.5) * shake;
  ctx.save(); ctx.translate(Math.round(-cam.x + sx), Math.round(-cam.y + sy));
  ctx.drawImage(bg, 0, 0);
  drawTorches(); drawDoor(); drawPortal(); drawTelegraph();
  // y-sort so whoever is lower on screen is drawn in front
  const actors = [...mobs.filter(m => m.hp > 0).map(m => [m.y, () => drawMob(m)]), [P.y, drawPlayer]];
  if (boss.hp > 0) actors.push([boss.y, drawBoss]);
  for (const [, d] of actors.sort((a, b) => a[0] - b[0])) d();
  drawFx();
  if (F.fog) { // two drifting layers of the pack's fog texture over the field
    ctx.save(); ctx.beginPath(); ctx.rect(TOWN_X, 0, ROOM_X - TOWN_X, WORLD.h); ctx.clip();
    for (const [speed, alpha] of [[14, 0.16], [-22, 0.1]]) {
      ctx.globalAlpha = alpha; const fw = 960, fh = 528, ox = ((time * speed) % fw + fw) % fw;
      for (let x = TOWN_X - fw + ox; x < ROOM_X; x += fw) for (let y = 0; y < WORLD.h; y += fh) ctx.drawImage(IMG.fog, x, y, fw, fh);
    }
    ctx.restore();
  }
  ctx.restore();

  ctx.drawImage(vig, 0, 0);
  const low = P.hp / P.maxHp < 0.25, fl = settings.flash;
  const danger = P.hurt > 0 ? P.hurt / 0.25 * (fl ? 0.35 : 0.15) : low ? (fl ? 0.12 + 0.1 * Math.sin(time * 6) : 0.18) : 0;
  if (danger > 0) {
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.6);
    g.addColorStop(0, 'rgba(255,0,0,0)'); g.addColorStop(1, `rgba(255,0,0,${danger})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  drawHud();
}

// One simulation step (hit-stop freezes everything, pause freezes everything but drawing)
function tick(dt) {
  if (stop > 0) stop -= dt;
  else if (state !== 'paused') { if (state === 'play') update(dt); updateFx(dt); }
}
function loop(t) {
  const dt = Math.min((t - (last ?? t)) / 1000, 0.05); last = t; time += dt;
  if (state === 'intro') { introT += dt; drawIntro(); if (introT > 1.9) newGame(); }
  else if (P) { tick(dt); draw(); }
  else drawMenuBg(dt);
  requestAnimationFrame(loop);
}

// e.code = physical key, so controls work with a Thai keyboard layout too
addEventListener('keydown', e => {
  if (e.code === 'KeyF' && !e.repeat) { toggleFullscreen(); return; }
  if (e.code === 'Escape' || e.code === 'KeyP') {
    if (state === 'play') pauseGame();
    else if (current === 'pause') resumeGame();
    else if (current === 'howto' || current === 'settings') screen(backTo);
    return;
  }
  if (state !== 'play') return; // leave keys alone while a menu (sliders, buttons) has focus
  keys[e.code] = true;
  if (e.code === 'KeyJ') attack(); if (e.code === 'KeyK') skill();
  if (e.code === 'KeyM' && !e.repeat) toggleMute();
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; pauseGame(); });
// Switching tabs doesn't always fire blur; pause there too and drop the stale frame time
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(); else last = undefined; });
cv.addEventListener('mousemove', e => {
  const r = cv.getBoundingClientRect();
  mouse.x = (e.clientX - r.left) * W / r.width; mouse.y = (e.clientY - r.top) * H / r.height;
});
cv.addEventListener('mousedown', e => { if (e.button === 0) attack(); if (e.button === 2) skill(); });
cv.addEventListener('contextmenu', e => e.preventDefault());
requestAnimationFrame(loop);

// Dev-only handle for console/bot playtests (module scope hides these); stripped from production builds.
// ponytail: stopgap until the sim moves into DOM-free modules + Vitest (migration step 7)
if (import.meta.env.DEV) {
  const live = { state: () => state, P: () => P, mobs: () => mobs, boss: () => boss, F: () => F, floorIdx: () => floorIdx,
                 portal: () => portal, run: () => run, stop: () => stop };
  window.__saoy = Object.defineProperties(
    { tick, update, updateFx, draw, newGame, loadFloor, attack, skill, hurtPlayer, hitWall, startBossMove, keys, mouse, cam, ready,
      consts: { W, H, WORLD, TOWN_X, ROOM_X } },
    Object.fromEntries(Object.entries(live).map(([k, get]) => [k, { get }])));
}
