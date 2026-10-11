// Save system: legacy migration, validation fallbacks, suspend round-trip, export/import.
// save.ts reads storage when it's imported, so each test installs a fake localStorage and re-imports it.
import { describe, it, expect, beforeEach, vi } from 'vitest';

function fakeStorage(init: Record<string, string> = {}) {
  const m = new Map(Object.entries(init));
  return {
    getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, String(v)),
    removeItem: (k: string) => void m.delete(k), dump: () => Object.fromEntries(m),
  };
}
let storage: ReturnType<typeof fakeStorage>;
async function boot(init: Record<string, string> = {}) {
  storage = fakeStorage(init);
  vi.stubGlobal('localStorage', storage);
  vi.resetModules();
  return import('../src/core/save.ts');
}
beforeEach(() => vi.unstubAllGlobals());

describe('loading', () => {
  it('starts from defaults with empty storage', async () => {
    const s = await boot();
    expect(s.settings).toMatchObject({ music: 60, sfx: 80, hints: true, assistDamage: 1, assistSpeed: 1, bindings: {} });
    expect(s.meta).toEqual({ best: null, bestLegacy: null, hintsSeen: [], shards: 0, unlocked: ['sonicLeap'], loadout: null, storySeen: [] });
    expect(s.loadSuspend()).toBeNull();
  });

  it('migrates v0 saves (raw settings + separate best key) into versioned slots', async () => {
    const s = await boot({
      'saoy.settings': JSON.stringify({ music: 30, sfx: 40, shake: false, flash: true }),
      'saoy.best': JSON.stringify({ floor: 2, lv: 8, time: 120, kills: 30, cleared: false }),
    });
    expect(s.settings).toMatchObject({ music: 30, sfx: 40, shake: false, flash: true, hints: true }); // new field defaulted
    expect(s.meta.best).toBeNull(); expect(s.meta.bestLegacy).toMatchObject({ floor: 2, lv: 8, assisted: false });
    const dump = storage.dump();
    expect(dump['saoy.best']).toBeUndefined();                    // legacy key folded away
    expect(JSON.parse(dump['saoy.meta'])).toMatchObject({ v: s.SAVE_VERSION, data: { best: null, bestLegacy: { floor: 2 } } });
  });

  it('falls back to defaults on corrupt data and keeps the bad copy as .bak', async () => {
    const s = await boot({ 'saoy.settings': '{not json', 'saoy.meta': JSON.stringify({ v: 1, savedAt: '', data: { best: { floor: 'x' } } }) });
    expect(s.settings.music).toBe(60);
    expect(s.meta.best).toBeNull();
    expect(storage.dump()['saoy.settings.bak']).toBe('{not json');
    expect(storage.dump()['saoy.meta.bak']).toContain('"floor":"x"');
  });

  it('ignores out-of-range values instead of trusting them', async () => {
    const s = await boot({ 'saoy.settings': JSON.stringify({ v: 1, savedAt: '', data: { music: 900 } }) });
    expect(s.settings.music).toBe(60);
  });

  it('leaves saves from a newer game version alone', async () => {
    const future = JSON.stringify({ v: 99, savedAt: '', data: { music: 10 } });
    const s = await boot({ 'saoy.settings': future });
    expect(s.settings.music).toBe(60);
    expect(storage.dump()['saoy.settings']).toBe(future);
  });
});

describe('suspend + export/import', () => {
  const suspend = { floorIdx: 7, room: { type: 'battle' as const, reward: 'gold' as const },
    player: { lv: 7, xp: 40, hp: 150, maxHp: 220, atk: 28, up: { keenEdge: 2 }, pendingUpgrades: 1, build: { arts: ['vorpal', null] as [string, string | null], mods: { blade: ['ember'], vorpal: ['storm', 'storm'] } as Record<string, ('ember' | 'storm')[]>, evolved: ['vorpal'] }, col: 120, potions: 2, scrolls: 1, modBuys: 2 },
    run: { floor: 8, kills: 41, time: 300, assisted: false, seed: 12345, bosses: 1, curse: 0 } };

  it('round-trips a suspended run and clears it', async () => {
    const s = await boot();
    s.writeSuspend(suspend);
    expect(s.loadSuspend()).toEqual(suspend);
    s.clearSuspend();
    expect(s.loadSuspend()).toBeNull();
  });

  it('keeps the curse count, and a suspend without one loads as 0', async () => {
    const s = await boot();
    s.writeSuspend({ ...suspend, run: { ...suspend.run, curse: 1 } });
    expect(s.loadSuspend()!.run.curse).toBe(1);

    const s2 = await boot({ 'saoy.suspend': JSON.stringify({ v: 3, savedAt: '', data: { ...suspend, run: { ...suspend.run, curse: undefined } } }) });
    expect(s2.loadSuspend()!.run.curse).toBe(0);
  });

  it('loads a suspend written before upgrades and Gold existed', async () => {
    const { up, pendingUpgrades, build, col, potions, scrolls, modBuys, ...oldPlayer } = suspend.player;
    const s = await boot({ 'saoy.suspend': JSON.stringify({ v: 3, savedAt: '', data: { ...suspend, player: oldPlayer } }) });
    expect(s.loadSuspend()?.player).toMatchObject({ up: {}, col: 0, potions: 0 });
  });

  it('loads a v3 suspend without modBuys as zero', async () => {
    const { modBuys, ...oldPlayer } = suspend.player;
    const s = await boot({ 'saoy.suspend': JSON.stringify({ v: 3, savedAt: '', data: { ...suspend, player: oldPlayer } }) });
    expect(s.loadSuspend()?.player.modBuys).toBe(0);
  });

  it('rejects a suspend for a floor that does not exist', async () => {
    const s = await boot({ 'saoy.suspend': JSON.stringify({ v: 3, savedAt: '', data: { ...suspend, floorIdx: 42 } }) });
    expect(s.loadSuspend()).toBeNull();
  });

  it('exports everything and imports it into a fresh browser', async () => {
    const a = await boot();
    a.settings.music = 25; a.saveSettings();
    a.meta.best = { floor: 3, lv: 15, time: 260, kills: 100, cleared: true, assisted: false }; a.saveMeta();
    a.writeSuspend(suspend);
    const file = a.exportSave();

    const b = await boot();
    expect(b.importSave(file)).toEqual({ ok: true });
    expect(b.settings.music).toBe(25);
    expect(b.meta.best?.cleared).toBe(true);
    expect(b.loadSuspend()).toEqual(suspend);
  });

  it('still imports a save exported under the old name', async () => {
    const a = await boot(); a.writeSuspend(suspend);
    const old = JSON.parse(a.exportSave()); old.game = 'sword-art-on-you';
    const b = await boot();
    expect(b.importSave(JSON.stringify(old))).toEqual({ ok: true });
    expect(b.loadSuspend()).toEqual(suspend);
  });

  it('refuses files that are not this game\'s save', async () => {
    const s = await boot();
    expect(s.importSave('hello')).toMatchObject({ ok: false });
    expect(s.importSave(JSON.stringify({ game: 'other', v: 1 }))).toMatchObject({ ok: false });
    expect(s.settings.music).toBe(60); // nothing was applied
  });
});

describe('version 2', () => {
  it('drops a suspended run from the 4-floor version and flags it once; meta keeps shards and moves best to bestLegacy', async () => {
    const oldSuspend = { floorIdx: 1, player: { lv: 7, xp: 40, maxHp: 220, atk: 28, up: {}, pendingUpgrades: 0, skill2: null, col: 0, potions: 0, scrolls: 0 }, run: { floor: 2, kills: 4, time: 30 } };
    const s = await boot({
      'saoy.suspend': JSON.stringify({ v: 1, savedAt: '', data: oldSuspend }),
      'saoy.meta': JSON.stringify({ v: 1, savedAt: '', data: { best: { floor: 3, lv: 9, time: 400, kills: 50, cleared: false }, shards: 70, unlocked: ['sonicLeap', 'horizontal'] } }),
    });
    expect(s.takeLegacyNotice()).toBe(true); // known without loadSuspend() being called first
    expect(s.takeLegacyNotice()).toBe(false); // once only
    expect(s.loadSuspend()).toBeNull();
    expect(storage.dump()['saoy.suspend']).toBeUndefined();
    expect(storage.dump()['saoy.suspend.bak']).toBeUndefined();
    expect(s.meta.shards).toBe(70 + 30); // + the v3 Cyclone Edge refund
    expect(s.meta.unlocked).toEqual(['sonicLeap', 'horizontal']);
    expect(s.meta.best).toBeNull();
    expect(s.meta.bestLegacy).toMatchObject({ floor: 3 });
  });

  it('imports a version-1 export file: settings and meta migrate, its suspended run is dropped', async () => {
    const s = await boot();
    const file = JSON.stringify({ game: 'floorbreaker', v: 1, settings: { music: 20 }, meta: { best: { floor: 4, lv: 20, time: 900, kills: 300, cleared: true }, shards: 12 },
      suspend: { floorIdx: 2, player: { lv: 3, xp: 0, maxHp: 120, atk: 14 }, run: { floor: 3, kills: 1, time: 10 } } });
    expect(s.importSave(file)).toEqual({ ok: true });
    expect(s.settings.music).toBe(20);
    expect(s.meta.bestLegacy).toMatchObject({ cleared: true });
    expect(s.loadSuspend()).toBeNull();
  });
});

describe('rebinding', () => {
  it('replaces the primary key, keeps the arrow secondary, and steals the key from other actions', async () => {
    await boot();
    const input = await import('../src/core/input.ts');
    input.rebind('up', 'KeyJ'); // J was attack
    expect(input.codesFor('up')).toEqual(['KeyJ', 'ArrowUp']);
    expect(input.codesFor('attack')).toEqual([]);
    expect(input.actionForKey('KeyJ')).toBe('up');
    expect(input.keyLabel('attack')).toBe('—');
    input.resetBindings();
    expect(input.codesFor('attack')).toEqual(['KeyJ']);
  });
});

describe('default keys vs custom bindings', () => {
  it('a default key yields to a custom binding that claims it', async () => {
    await boot();
    const input = await import('../src/core/input.ts'), { settings } = await import('../src/core/save.ts');
    expect(input.actionForKey('KeyI')).toBe('skill3');
    settings.bindings.potion = ['KeyI'];
    expect(input.actionForKey('KeyI')).toBe('potion');
    expect(input.codesFor('skill3')).toEqual([]);
  });
});

describe('version 3', () => {
  it('moves a v2 suspend slot-2 Art into build.arts and starts with no mods', async () => {
    const v2 = { floorIdx: 6, room: { type: 'battle', reward: 'xp' },
      player: { lv: 5, xp: 10, hp: 90, maxHp: 160, atk: 20, up: {}, pendingUpgrades: 0, skill2: 'horizontal', col: 30, potions: 1, scrolls: 0 },
      run: { floor: 7, kills: 30, time: 200, assisted: false, seed: 99, bosses: 1 } };
    const s = await boot({ 'saoy.suspend': JSON.stringify({ v: 2, savedAt: '', data: v2 }) });
    expect(s.loadSuspend()!.player.build).toEqual({ arts: ['horizontal', null], mods: {}, evolved: [] });
  });

  it('refunds Shards for Arts that became free (Cyclone 30, Fang 60) and keeps the rest', async () => {
    const s = await boot({ 'saoy.meta': JSON.stringify({ v: 2, savedAt: '', data: { shards: 5, unlocked: ['sonicLeap', 'horizontal', 'vorpal'], hintsSeen: ['move'] } }) });
    expect(s.meta.shards).toBe(5 + 30 + 60);
    expect(s.meta.hintsSeen).toEqual(['move']);
  });

  it('a suspend with an unknown element or more than 2 mods on one Art fails validation instead of loading', async () => {
    const bad = { floorIdx: 1, room: null,
      player: { lv: 1, xp: 0, hp: 100, maxHp: 100, atk: 10, build: { arts: [null, null], mods: { blade: ['fire'] }, evolved: [] } },
      run: { floor: 2, kills: 0, time: 1, seed: 1 } };
    const s = await boot({ 'saoy.suspend': JSON.stringify({ v: 3, savedAt: '', data: bad }) });
    expect(s.loadSuspend()).toBeNull();
  });
});
