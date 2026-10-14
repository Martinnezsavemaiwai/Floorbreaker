// What the build looks like: helper values the renderer and HUD read, and the moments' events.
import { describe, it, expect, beforeEach } from 'vitest';
import { G, startRun, enterRoom } from './harness.ts';
import { dominantElement, artElements, artColor, setProgress, applyCard } from '../src/systems/build.js';
import { previewFor } from '../src/render/preview.js';
import { UPGRADES } from '../src/data/upgrades.ts';
import { on } from '../src/core/events.ts';

const got: string[] = [];
on('setBonus', el => got.push(el));

describe('build look helpers', () => {
  beforeEach(() => { startRun(1); enterRoom(1); got.length = 0; G.P!.pendingUpgrades = 9; });

  it('no mods: no dominant element; gems all 0/3', () => {
    expect(dominantElement()).toBeNull();
    expect(artColor('blade')).toBeNull();
    expect(setProgress().map(s => s.n)).toEqual([0, 0, 0, 0]);
  });

  it('dominant element = most mods; a tie goes to the element gained first', () => {
    applyCard({ kind: 'mod', art: 'blade', el: 'storm' }, 'level');
    applyCard({ kind: 'mod', art: 'sonicLeap', el: 'ember' }, 'level');
    expect(dominantElement()).toBe('storm');
    applyCard({ kind: 'mod', art: 'sonicLeap', el: 'ember' }, 'level');
    expect(dominantElement()).toBe('ember');
    expect(artElements('sonicLeap')).toEqual(['ember', 'ember']);
    expect(artColor('blade')).toBe('#a688ff');
  });

  it('setBonus fires once when an element reaches 3 mods', () => {
    G.P!.skills[1] = 'horizontal';
    for (const art of ['blade', 'sonicLeap', 'horizontal']) applyCard({ kind: 'mod', art, el: 'thorn' }, 'level');
    applyCard({ kind: 'mod', art: 'horizontal', el: 'thorn' }, 'level');
    expect(got).toEqual(['thorn']);
    expect(setProgress().find(s => s.el === 'thorn')).toMatchObject({ n: 4, need: 3, active: true });
  });
});

describe('HUD data', () => {
  beforeEach(() => { startRun(1); enterRoom(1); G.P!.pendingUpgrades = 9; });
  it('setProgress has 4 gems needing EL.set.need; artElements follows mods', async () => {
    const { EL } = await import('../src/data/elements.ts');
    expect(setProgress()).toHaveLength(4);
    expect(setProgress().every(s => s.need === EL.set.need)).toBe(true);
    applyCard({ kind: 'mod', art: 'blade', el: 'tide' }, 'level');
    expect(artElements('blade')).toEqual(['tide']);
  });
});

describe('card previews', () => {
  beforeEach(() => { startRun(1); enterRoom(1); });
  it('a mod card previews its Art in the element colour; the evolving one shows the evolved form', () => {
    expect(previewFor({ kind: 'mod', art: 'vorpal', el: 'storm' })).toMatchObject({ art: 'vorpal', evolved: false, el: 'storm' });
    G.P!.mods = { vorpal: ['ember'] }; G.P!.skills[1] = 'vorpal';
    expect(previewFor({ kind: 'mod', art: 'vorpal', el: 'storm' })).toMatchObject({ evolved: true });
    expect(previewFor({ kind: 'art', id: 'crescent' })).toMatchObject({ art: 'crescent', evolved: false, el: null });
    expect(previewFor({ kind: 'evolve', art: 'riposte' })).toMatchObject({ art: 'riposte', evolved: true });
    expect(previewFor({ kind: 'element', el: 'tide' })).toMatchObject({ art: null, el: 'tide' });
    expect(previewFor({ kind: 'stat', id: Object.keys(UPGRADES)[0] })).toHaveProperty('stat');
    expect(previewFor({ kind: 'skip' })).toBeNull();
  });
});
