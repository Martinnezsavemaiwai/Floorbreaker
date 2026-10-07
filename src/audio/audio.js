// Music: Ninja Adventure tracks (CC0). SFX: synthesized with Web Audio (the GitHub pack ships no sound effects).
// Gameplay never calls sounds directly — the bottom of this file maps game events to SFX and music.
import { settings } from '../core/save.ts';
import { on } from '../core/events.ts';

const MUSIC = { 0: 'theme_plain', 1: 'theme_swamp', 2: 'theme_dream', boss: 'theme_lost_village', clear: 'theme_dream' };
const tracks = {};
let AC, master, music = null, muted = false;

// Needs a user gesture (browser autoplay policy), so it's called from the Link Start click
export function initAudio() {
  if (AC) return;
  AC = new AudioContext(); master = AC.createGain(); master.connect(AC.destination);
  for (const n of new Set(Object.values(MUSIC))) { tracks[n] = new Audio(`assets/music/${n}.mp3`); tracks[n].loop = true; }
  applyAudio();
}
export function applyAudio() {
  if (!AC) return;
  master.gain.value = muted ? 0 : settings.sfx / 100 * 0.6;
  for (const t of Object.values(tracks)) { t.volume = settings.music / 100 * 0.5; t.muted = muted; }
}
export function playMusic(key) {
  const t = tracks[MUSIC[key]];
  if (!t || t === music) return;
  if (music) music.pause();
  music = t; t.currentTime = 0; t.play().catch(() => {});
}
export function stopMusic() { if (music) music.pause(); music = null; }
export const pauseMusic = () => music?.pause();
export const resumeMusic = () => music?.play().catch(() => {});
export function toggleMute() { muted = !muted; applyAudio(); return muted; }

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
export const SFX = {
  swing: () => noise(0.13, 0.3, 1500, 1.2, 5000),
  hit: big => { noise(0.08, 0.4, 900); tone(big ? 120 : 180, 0.12, 'square', 0.15, 50); },
  skill: () => { tone(300, 0.25, 'sawtooth', 0.1, 1400); noise(0.28, 0.25, 4000, 1, 700); },
  shatter: () => [2093, 2637, 3136, 4186].forEach((f, i) => tone(f, 0.3, 'triangle', 0.08, f * 0.8, i * 0.035)),
  hurt: () => { tone(220, 0.22, 'square', 0.16, 80); noise(0.12, 0.25, 500); },
  dodge: () => tone(900, 0.12, 'sine', 0.12, 2200),
  windup: () => tone(660, 0.06, 'square', 0.05),
  shot: () => { noise(0.18, 0.18, 2500, 2, 600); tone(520, 0.15, 'triangle', 0.06, 260); },
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

// ---------- game events -> sound ----------
on('swing', SFX.swing);
on('skill', SFX.skill);
on('hit', ({ big }) => SFX.hit(big));
on('mobDeath', SFX.shatter);
on('bossDeath', () => { SFX.slam(); SFX.shatter(); playMusic('clear'); });
on('portalOpen', SFX.portal);
on('playerHurt', SFX.hurt);
on('dodge', SFX.dodge);
on('playerDeath', () => { stopMusic(); SFX.death(); });
on('levelUp', SFX.levelUp);
on('upgradePicked', SFX.ui);
on('mobWindup', SFX.windup);
on('mobShot', SFX.shot);
on('bossWake', () => { SFX.roar(); playMusic('boss'); });
on('bossSummon', SFX.roar);
on('bossWind', mv => { if (mv !== 'charge') SFX.bossWind(); }); // charge has its own whoosh (bossCharge)
on('bossImpact', SFX.slam);
on('bossCharge', SFX.charge);
on('floorLoaded', i => playMusic(i));
