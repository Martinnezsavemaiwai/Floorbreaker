// Composes the game's music as BeepBox songs and renders them to looping MP3s.
//
//   node scripts/make_music.mjs            # every song
//   node scripts/make_music.mjs boss       # just one
//
// For each song it writes:
//   art-src/music/<name>.json   the BeepBox song (File > Import in beepbox.co to edit it)
//   art-src/music.txt           a beepbox.co link per song (opens it in the editor)
//   public/assets/music/<name>.mp3
// Songs are written as chords + a melody per bar; bass, chords (arpeggiated) and drums follow a style.
// The loop is rendered twice and the second pass kept, so reverb/echo tails wrap around and it loops seamlessly.
// Needs the beepbox npm package (devDependency) and ffmpeg on PATH.
import { Song, Synth } from 'beepbox';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const RATE = 44100;
const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const KEY_BASE = { C: 12, D: 14, E: 16, F: 17, G: 19, A: 21 }; // BeepBox: pitch 0 = the key's root at MIDI basePitch
const midi = n => { // "C#5" / "Bb4" -> MIDI number
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(n);
  if (!m) throw new Error(`bad note ${n}`);
  return 12 * (+m[3] + 1) + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
};
const chordNotes = (name, octave) => { // "Am" / "Bb" / "F#m" -> triad as MIDI numbers, root in `octave`
  const m = /^([A-G][#b]?)(m?)$/.exec(name);
  const root = midi(m[1] + octave);
  return [root, root + (m[2] ? 3 : 4), root + 7];
};

// ---------- instruments ----------
const chip = (wave, volume, extra = {}) => ({ type: 'chip', wave, volume, fadeInSeconds: 0, fadeOutTicks: -3, effects: ['reverb'], reverb: 20, ...extra });
const arp = (wave, volume, extra = {}) => chip(wave, volume, { effects: ['chord type', 'reverb'], chord: 'arpeggio', ...extra });
const noise = (wave, volume) => ({ type: 'noise', wave, volume, fadeInSeconds: 0, fadeOutTicks: -1, effects: [] });

// ---------- accompaniment styles (ticks: 4 per beat) ----------
// each returns the notes of one bar as [midiPitches, startTick, endTick, volume]
const BASS = {
  bounce: ([r], t) => [[r, 0, 4], [r + 12, 4, 8], [r + 7, 8, 12], [r + 12, 12, 16]],
  march: ([r], t) => Array.from({ length: 8 }, (_, i) => [i % 2 ? r + 12 : r, i * 2, i * 2 + 2]),
  drive: ([r], t) => Array.from({ length: 8 }, (_, i) => [r, i * 2, i * 2 + 1.5]),
  long: ([r], t) => [[r, 0, t]],
  waltz: ([r], t) => [[r, 0, 4], [r + 7, 4, 8], [r + 12, 8, 12]],
};
const CHORDS = {
  hold: (c, t) => [[c, 0, t]],                                    // one arpeggiated chord per bar
  beats: (c, t) => Array.from({ length: t / 4 }, (_, i) => [c, i * 4, i * 4 + 3]), // re-struck every beat
};
const DRUMS = { // K kick, S snare (retro noise channel), H hi-hat (white noise channel); one char per tick
  basic: { K: 'x.......x.......', S: '....x.......x...', H: 'x.x.x.x.x.x.x.x.' },
  march: { K: 'x..x....x..x....', S: '....x.......x.xx', H: 'x.x.x.x.x.x.x.x.' },
  boss: { K: 'x...x...x...x...', S: '....x.......x...', H: 'xxxxxxxxxxxxxxxx' },
  soft: { K: 'x...............', S: '................', H: '........x.......' },
  waltz: { K: 'x...........', S: '............', H: '....x...x...' },
  none: { K: '', S: '', H: '' },
};

// ---------- the songs ----------
// chords: one per bar; melody: one string per bar, "note:ticks" ("r" = rest). The last 8 bars of a 16-bar
// loop repeat the chords with the melody resting for 4 bars (the arpeggio carries) and then its second half.
const SONGS = {
  floor1: { // bright, hopeful field
    key: 'C', scale: 'normal :)', bpm: 120, beats: 4, bass: 'bounce', chords: 'hold', drums: 'basic',
    lead: chip('square', 70, { effects: ['vibrato', 'reverb'], vibrato: 'delayed' }), pad: arp('1/4 pulse', 50), low: chip('triangle', 100),
    prog: ['C', 'G', 'Am', 'F', 'C', 'G', 'Am', 'F'],
    melody: ['E5:2 G5:2 C6:4 B5:2 A5:2 G5:4', 'D5:2 G5:2 B5:4 A5:4 G5:4', 'C6:2 B5:2 A5:4 E5:4 A5:4', 'F5:4 A5:4 G5:4 F5:2 E5:2',
             'E5:2 G5:2 C6:4 D6:2 E6:2 D6:4', 'B5:4 G5:4 D6:4 B5:4', 'A5:2 B5:2 C6:4 B5:2 A5:2 E5:4', 'F5:4 E5:2 D5:2 C5:8'],
  },
  floor2: { // heavy, heroic march
    key: 'D', scale: 'normal :(', bpm: 110, beats: 4, bass: 'march', chords: 'beats', drums: 'march',
    lead: chip('square', 70, { effects: ['vibrato', 'reverb'], vibrato: 'light' }), pad: arp('square', 40), low: chip('triangle', 100),
    prog: ['Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'F', 'C'],
    melody: ['D5:6 A4:2 D5:4 F5:4', 'F5:4 D5:4 Bb4:8', 'C5:6 F5:2 A5:4 G5:4', 'E5:8 C5:4 E5:4',
             'F5:6 E5:2 D5:4 A5:4', 'Bb5:4 A5:4 F5:4 D5:4', 'C6:4 A5:4 F5:4 A5:4', 'G5:6 F5:2 E5:8'],
  },
  floor3: { // misty forest: sparse, echoing
    key: 'A', scale: 'expert', bpm: 90, beats: 4, bass: 'long', chords: 'hold', drums: 'soft',
    lead: chip('triangle', 80, { effects: ['echo', 'reverb'], echoSustain: 50, echoDelayBeats: 0.75, reverb: 40 }),
    pad: arp('rounded', 50, { effects: ['chord type', 'echo', 'reverb'], echoSustain: 40, echoDelayBeats: 0.5, reverb: 40 }),
    low: chip('triangle', 80),
    prog: ['Am', 'F', 'Dm', 'E', 'Am', 'F', 'Dm', 'E'],
    melody: ['r:4 E5:4 A5:8', 'r:8 C6:4 A5:4', 'F5:8 E5:4 D5:4', 'E5:12 r:4',
             'r:4 A5:4 B5:4 C6:4', 'A5:12 r:4', 'D6:4 C6:4 A5:4 F5:4', 'G#5:8 E5:8'],
  },
  floor4: { // water town: flowing waltz
    key: 'F', scale: 'normal :)', bpm: 100, beats: 3, bass: 'waltz', chords: 'hold', drums: 'waltz',
    lead: chip('rounded', 80, { effects: ['vibrato', 'reverb'], vibrato: 'light', reverb: 30 }), pad: arp('1/8 pulse', 45), low: chip('triangle', 100),
    prog: ['F', 'Dm', 'Bb', 'C', 'F', 'Dm', 'Bb', 'C'],
    melody: ['A5:6 C6:3 A5:3', 'F5:6 D5:3 F5:3', 'D6:6 C6:3 Bb5:3', 'A5:6 G5:6',
             'A5:3 C6:3 F6:6', 'E6:3 D6:3 A5:6', 'Bb5:3 A5:3 G5:3 F5:3', 'E5:6 G5:6'],
  },
  boss: { // urgent, driving
    key: 'E', scale: 'expert', bpm: 150, beats: 4, bass: 'drive', chords: 'beats', drums: 'boss',
    lead: chip('square', 70), pad: arp('sawtooth', 35), low: chip('triangle', 100),
    prog: ['Em', 'C', 'D', 'B', 'Em', 'C', 'D', 'B'],
    melody: ['E5:2 E5:2 G5:2 E5:2 B5:4 A5:2 G5:2', 'G5:2 G5:2 E5:2 G5:2 C6:4 B5:2 A5:2', 'F#5:2 F#5:2 A5:2 F#5:2 D6:4 C6:2 A5:2', 'D#6:4 B5:4 F#5:4 D#5:4',
             'E6:4 D6:2 B5:2 G5:4 E5:4', 'C6:4 B5:2 G5:2 E5:4 G5:4', 'D6:4 C6:2 A5:2 F#5:4 A5:4', 'B5:8 D#6:4 F#6:4'],
  },
  clear: { // victory fanfare (8 bars)
    key: 'G', scale: 'normal :)', bpm: 90, beats: 4, bass: 'long', chords: 'hold', drums: 'soft', bars: 8,
    lead: chip('square', 70, { effects: ['vibrato', 'reverb'], vibrato: 'delayed', reverb: 30 }), pad: arp('1/4 pulse', 45), low: chip('triangle', 100),
    prog: ['G', 'C', 'D', 'G', 'G', 'C', 'D', 'G'],
    melody: ['G5:2 B5:2 D6:4 G6:8', 'E6:4 G6:4 E6:4 C6:4', 'F#6:4 E6:2 D6:2 A5:4 D6:4', 'B5:4 D6:4 G6:8',
             'D6:8 B5:8', 'C6:8 E6:8', 'D6:4 C6:4 B5:4 A5:4', 'G5:16'],
  },
  title: { // vast and calm
    key: 'C', scale: 'normal :)', bpm: 80, beats: 4, bass: 'long', chords: 'hold', drums: 'none',
    lead: chip('triangle', 80, { reverb: 50 }), pad: arp('rounded', 45, { reverb: 50 }), low: chip('triangle', 80),
    prog: ['C', 'Am', 'F', 'G', 'C', 'Am', 'F', 'G'],
    melody: ['G5:8 E5:8', 'A5:8 C6:8', 'A5:6 G5:2 F5:8', 'D5:8 G5:8',
             'E6:8 D6:4 C6:4', 'C6:8 A5:8', 'F5:4 A5:4 C6:8', 'B5:8 D6:8'],
  },
};

// ---------- building the BeepBox song ----------
const pt = (tick, volume = 100) => ({ tick, pitchBend: 0, volume });
const note = (pitches, start, end, vol = 100) => ({ pitches, points: [pt(start, vol), pt(end, vol)] });

function parseBar(text, ticks) {
  const out = []; let t = 0;
  for (const tok of text.trim().split(/\s+/)) {
    const [n, d] = tok.split(':'); const dur = +d;
    if (n !== 'r') out.push([[midi(n)], t, t + dur]);
    t += dur;
  }
  if (t !== ticks) throw new Error(`bar "${text}" is ${t} ticks, expected ${ticks}`);
  return out;
}

// One channel from a list of bars (each a list of [midiPitches, start, end, vol?]); identical bars share a pattern
function channel(type, instrument, bars, base) {
  const patterns = [], keys = [], sequence = [];
  for (const bar of bars) {
    if (!bar.length) { sequence.push(0); continue; }
    const notes = bar.map(([p, s, e, v]) => note([p].flat().map(x => x - base), s, e, v)); // a single pitch or a chord
    const k = JSON.stringify(notes);
    let i = keys.indexOf(k);
    if (i < 0) { i = keys.length; keys.push(k); patterns.push({ notes }); }
    sequence.push(i + 1);
  }
  return { type, ...(type === 'pitch' ? { octaveScrollBar: 3 } : {}), instruments: [instrument], patterns, sequence };
}

function build(s) {
  const ticks = s.beats * 4, base = KEY_BASE[s.key];
  const bars = s.bars ?? 16;
  const prog = Array.from({ length: bars }, (_, i) => s.prog[i % s.prog.length]);
  const lead = Array.from({ length: bars }, (_, i) => {
    if (bars === 8) return parseBar(s.melody[i], ticks);
    if (i < 8) return parseBar(s.melody[i], ticks);
    return i < 12 ? [] : parseBar(s.melody[i - 8], ticks); // B section: 4 bars of breathing room, then the second phrase
  });
  const drum = (line, pitch, vol) => line ? prog.map(() => [...line].flatMap((c, t) => (c === 'x' ? [[[pitch], t, t + 1, vol]] : []))) : prog.map(() => []);
  const d = DRUMS[s.drums];
  return {
    format: 'BeepBox', version: 9, scale: s.scale, key: s.key, introBars: 0, loopBars: bars,
    beatsPerBar: s.beats, ticksPerBeat: 4, beatsPerMinute: s.bpm, layeredInstruments: false, patternInstruments: false,
    channels: [
      channel('pitch', s.lead, lead, base),
      channel('pitch', s.pad, prog.map(c => CHORDS[s.chords](chordNotes(c, 4), ticks)), base),
      channel('pitch', s.low, prog.map(c => BASS[s.bass](chordNotes(c, 2), ticks)), base),
      channel('drum', noise('retro', 80), prog.map((_, i) => [...drum(d.K, 1, 100)[i], ...drum(d.S, 7, 80)[i]]), 0),
      channel('drum', noise('white', 40), drum(d.H, 11, 50), 0),
    ],
  };
}

// ---------- rendering ----------
function render(json, name) {
  const song = new Song(); song.fromJsonObject(json);
  const synth = new Synth(song);
  synth.loopRepeatCount = -1; // loop forever while rendering
  const loop = Math.round(synth.getSamplesPerBar() * song.barCount);
  const L = new Float32Array(loop * 2), R = new Float32Array(loop * 2);
  synth.synthesize(L, R, loop * 2, true);
  const pcm = Buffer.alloc(loop * 4); // second pass only: 16-bit stereo
  for (let i = 0; i < loop; i++) {
    pcm.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(L[loop + i] * 32767))), i * 4);
    pcm.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(R[loop + i] * 32767))), i * 4 + 2);
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0); header.writeUInt32LE(36 + pcm.length, 4); header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(2, 22); header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 4, 28); header.writeUInt16LE(4, 32); header.writeUInt16LE(16, 34); header.write('data', 36); header.writeUInt32LE(pcm.length, 40);
  const wav = join(tmpdir(), `saoy-${name}.wav`);
  writeFileSync(wav, Buffer.concat([header, pcm]));
  // same loudness for every track; no fades, so the loop point stays clean
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', wav, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-ar', '44100',
    '-codec:a', 'libmp3lame', '-b:a', '128k', `public/assets/music/${name}.mp3`]);
  rmSync(wav);
  return loop / RATE;
}

mkdirSync('art-src/music', { recursive: true });
const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(SONGS);
const links = [];
for (const name of Object.keys(SONGS)) {
  const json = build(SONGS[name]);
  writeFileSync(`art-src/music/${name}.json`, JSON.stringify(json, null, 1));
  const song = new Song(); song.fromJsonObject(json);
  links.push(`${name}: https://www.beepbox.co/#${song.toBase64String()}`); // BeepBox's own compact link format
  if (names.includes(name)) console.log(`public/assets/music/${name}.mp3: ${render(json, name).toFixed(1)} s loop`);
}
writeFileSync('art-src/music.txt', '# Open a link to edit the song in BeepBox (generated by scripts/make_music.mjs)\n' + links.join('\n') + '\n');
