// Character animation poses (spec "A1"): pure draw transforms from state the game already has.
import { describe, it, expect } from 'vitest';
import { pose, walkFrame } from '../src/render/anim.js';

const idle = (o: object = {}) => ({ x: 0, y: 0, sx: 0, moving: false, hurt: 0, swing: 0, kx: 0, ky: 0, ...o });
const NEUTRAL = { sx: 1, sy: 1, rot: 0, ox: 0, oy: 0, alpha: 1 };

describe('pose()', () => {
  it('idle breathes: sy moves with time, within 2.5%', () => {
    const a = pose(idle(), 'mob', 0), b = pose(idle(), 'mob', 0.4);
    expect(a.sy).not.toBeCloseTo(b.sy, 4);
    for (let t = 0; t < 2; t += 0.05) { const p = pose(idle(), 'mob', t); expect(Math.abs(p.sy - 1)).toBeLessThanOrEqual(0.0251); }
  });

  it('two mobs breathe out of phase', () => {
    expect(pose(idle({ sx: 0 }), 'mob', 1).sy).not.toBeCloseTo(pose(idle({ sx: 3 }), 'mob', 1).sy, 3);
  });

  it('a hit recoils along the knockback and flattens first', () => {
    const p = pose(idle({ hurt: 0.1, kx: 300, ky: 0 }), 'mob', 0);
    expect(p.ox).toBeGreaterThan(0); expect(Math.abs(p.oy)).toBeLessThan(0.01);
    expect(p.ox).toBeLessThanOrEqual(4); expect(p.sx).toBeGreaterThan(1); expect(p.sy).toBeLessThan(1);
  });

  it('walking lifts 3 px on the passing frames only, never leans or stretches', () => {
    for (let t = 0; t < 1; t += 0.01) {
      const e = idle({ moving: true }), p = pose(e, 'player', t);
      expect(p.oy).toBe(walkFrame(e, 'player', t) % 2 ? -3 : 0);
      expect(p.rot).toBe(0);
    }
  });

  it('the walk frame steps 0-3 at the sheet rate, staggered by spawn x', () => {
    expect([0, 0.1, 0.2, 0.3, 0.4].map(t => walkFrame(idle(), 'player', t + 0.001))).toEqual([0, 1, 2, 3, 0]);
    expect(walkFrame(idle({ sx: 1 }), 'mob', 0)).toBe(1);
  });

  it('a dying mob tips over and fades out over 0.4 s', () => {
    const half = pose(idle({ hp: 0 }), 'mob', 0, { dyingFor: 0.2 }), done = pose(idle({ hp: 0 }), 'mob', 0, { dyingFor: 0.4 });
    expect(half.alpha).toBeGreaterThan(0); expect(half.alpha).toBeLessThan(1);
    expect(Math.abs(half.rot)).toBeGreaterThan(0.3);
    expect(done.alpha).toBe(0);
  });

  it('mob wind-up squashes; boss stun sways', () => {
    expect(pose(idle({ wind: 0.2, def: { wind: 0.4 } }), 'mob', 0).sx).toBeGreaterThan(1);
    const s = [0.1, 0.6].map(t => pose(idle({ stun: 1 }), 'boss', t).rot);
    expect(s[0]).not.toBeCloseTo(s[1], 3);
  });

  it('reduced motion halves every deviation', () => {
    const full = pose(idle({ hurt: 0.1, kx: 300, ky: 0 }), 'mob', 0), half = pose(idle({ hurt: 0.1, kx: 300, ky: 0 }), 'mob', 0, { reduced: true });
    expect(half.ox).toBeCloseTo(full.ox / 2, 5);
    expect(half.sx - 1).toBeCloseTo((full.sx - 1) / 2, 5);
  });

  it('neutral when nothing is happening and breathing sits at its zero crossing', () => {
    const p = pose(idle(), 'mob', 0);
    expect({ ...p, sy: 1, sx: 1 }).toEqual(NEUTRAL);
  });
});

describe('pose() focused branches', () => {
  const near = (a: number, b: number) => expect(a).toBeCloseTo(b, 5);

  it('swing squashes in the first 0.06 s, then stretches; finisher scales x1.5', () => {
    const sq = pose(idle({ swing: 0.2 }), 'player', 0), st = pose(idle({ swing: 0.1 }), 'player', 0);
    near(sq.sx, 1.08); near(sq.sy, 0.92);
    near(st.sx, 0.94); near(st.sy, 1.06);
    near(pose(idle({ swing: 0.2, finisher: true }), 'player', 0).sx, 1.12);
    near(pose(idle({ swing: 0.1, finisher: true }), 'player', 0).sx, 0.91);
  });

  it('lunge stretches sy by 0.08', () => {
    near(pose(idle({ lunge: 0.15 }), 'mob', 0).sy, 1.08);
  });

  it('dash and roll use the dash pose', () => {
    for (const f of [{ dash: 0.1 }, { roll: 0.1 }]) {
      const p = pose(idle(f), 'player', 0);
      near(p.sx, 1.12); near(p.sy, 0.9);
    }
  });

  it('boss walk bounces at most 2 px', () => {
    let up = 0;
    for (let t = 0; t < 1; t += 0.01) up = Math.min(up, pose(idle({ moving: true }), 'boss', t, { vx: 200 }).oy);
    near(up, -2) ; expect(up).toBeGreaterThanOrEqual(-2.01);
  });

  it('boss breathes on a 2.4 s period; rage is 1.5x faster', () => {
    near(pose(idle(), 'boss', 0.3).sy, pose(idle(), 'boss', 2.7).sy);
    expect(pose(idle(), 'boss', 0.3).sy).not.toBeCloseTo(pose(idle(), 'boss', 1.5).sy, 3);
    near(pose(idle(), 'boss', 0.4, { rage: true }).sy, pose(idle(), 'mob', 0.4).sy);
  });


  it('death tilt follows the kx sign', () => {
    expect(pose(idle({ hp: 0, kx: -5 }), 'mob', 0, { dyingFor: 0.2 }).rot).toBeLessThan(0);
    expect(pose(idle({ hp: 0, kx: 5 }), 'mob', 0, { dyingFor: 0.2 }).rot).toBeGreaterThan(0);
  });

  it('dyingFor is clamped: negative shows nothing, past the end stays faded out', () => {
    const before = pose(idle({ hp: 0 }), 'mob', 0, { dyingFor: -0.1 });
    near(before.alpha, 1); near(before.rot, 0);
    near(pose(idle({ hp: 0 }), 'mob', 0, { dyingFor: 9 }).alpha, 0);
  });

  it('reduced motion halves rot and oy too', () => {
    const f = pose(idle({ moving: true }), 'player', 0.05, { vx: 200 });
    const h = pose(idle({ moving: true }), 'player', 0.05, { vx: 200, reduced: true });
    near(h.rot, f.rot / 2); near(h.oy, f.oy / 2);
    const fd = pose(idle({ hp: 0, kx: 5 }), 'mob', 0, { dyingFor: 0.2 });
    const hd = pose(idle({ hp: 0, kx: 5 }), 'mob', 0, { dyingFor: 0.2, reduced: true });
    near(hd.rot, fd.rot / 2);
  });

  it('hurt flatten ends after 0.08 s and the hurt ratio is capped', () => {
    const late = pose(idle({ hurt: 0.01, kx: 300 }), 'mob', 0);
    near(late.sx, 1); near(late.sy, 1);
    const capped = pose(idle({ hurt: 0.5, kx: 300 }), 'mob', 0);
    near(capped.ox, 4);
  });

  it('wind-up squashes sy below 1 as well as stretching sx', () => {
    const p = pose(idle({ wind: 0.2, def: { wind: 0.4 } }), 'mob', 0);
    expect(p.sy).toBeLessThan(1);
  });

  it('opts override knock direction and moving; unknown kind uses player tables', () => {
    const p = pose(idle({ hurt: 0.1 }), 'boss', 0, { kx: -5, ky: 0 });
    expect(p.ox).toBeLessThan(0); near(Math.abs(p.oy), 0);
    const w = pose(idle(), 'boss', 0.25, { moving: true }); // boss walk frame 1: passing
    expect(w.oy).toBeLessThan(0);
    const u = pose(idle({ moving: true }), 'nope', 0.15), pl = pose(idle({ moving: true }), 'player', 0.15);
    expect(u).toEqual(pl);
  });
});
