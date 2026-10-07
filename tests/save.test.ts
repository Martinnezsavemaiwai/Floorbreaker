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
    expect(s.meta).toEqual({ best: null, hintsSeen: [], shards: 0, unlocked: ['sonicLeap'], loadout: null, storySeen: [] });
    expect(s.loadSuspend()).toBeNull();
  });

  it('migrates v0 saves (raw settings + separate best key) into versioned slots', async () => {
    const s = await boot({
      'saoy.settings': JSON.stringify({ music: 30, sfx: 40, shake: false, flash: true }),
      'saoy.best': JSON.stringify({ floor: 2, lv: 8, time: 120, kills: 30, cleared: false }),
    });
    expect(s.settings).toMatchObject({ music: 30, sfx: 40, shake: false, flash: true, hints: true }); // new field defaulted
    expect(s.meta.best).toMatchObject({ floor: 2, lv: 8, assisted: false });
    const dump = storage.dump();
    expect(dump['saoy.best']).toBeUndefined();                    // legacy key folded away
    expect(JSON.parse(dump['saoy.meta'])).toMatchObject({ v: s.SAVE_VERSION, data: { best: { floor: 2 } } });
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
  const suspend = { floorIdx: 1, player: { lv: 7, xp: 40, maxHp: 220, atk: 28, up: { keenEdge: 2 }, pendingUpgrades: 1, skill2: 'vorpal', col: 120, potions: 2, scrolls: 1 }, run: { floor: 2, kills: 41, time: 300, assisted: false } };

  it('round-trips a suspended run and clears it', async () => {
    const s = await boot();
    s.writeSuspend(suspend);
    expect(s.loadSuspend()).toEqual(suspend);
    s.clearSuspend();
    expect(s.loadSuspend()).toBeNull();
  });

  it('loads a suspend written before upgrades and Col existed', async () => {
    const { up, pendingUpgrades, skill2, col, potions, scrolls, ...oldPlayer } = suspend.player;
    const s = await boot({ 'saoy.suspend': JSON.stringify({ v: 1, savedAt: '', data: { ...suspend, player: oldPlayer } }) });
    expect(s.loadSuspend()?.player).toMatchObject({ up: {}, col: 0, potions: 0 });
  });

  it('rejects a suspend for a floor that does not exist', async () => {
    const s = await boot({ 'saoy.suspend': JSON.stringify({ v: 1, savedAt: '', data: { ...suspend, floorIdx: 42 } }) });
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

  it('refuses files that are not this game\'s save', async () => {
    const s = await boot();
    expect(s.importSave('hello')).toMatchObject({ ok: false });
    expect(s.importSave(JSON.stringify({ game: 'other', v: 1 }))).toMatchObject({ ok: false });
    expect(s.settings.music).toBe(60); // nothing was applied
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
