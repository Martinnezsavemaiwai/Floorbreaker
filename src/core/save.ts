// Persistence: settings, meta progress (best record, hints seen) and one suspend slot for the current run.
// Every slot is stored as a versioned envelope { v, savedAt, data }, migrated forward on load and validated
// with Zod. Anything unreadable falls back to defaults, and the bad copy is kept as "<slot>.bak".
// Browser storage is only a cache (Safari wipes it after 7 idle days, itch.io iframes may partition it),
// so export/import is the one reliable backup.
import { z } from 'zod';
import { FLOOR_COUNT, ROOM_TYPES, REWARDS } from '../data/run.ts';
import { ELEMENT_IDS } from '../data/elements.ts';

export const SAVE_VERSION = 3;
const PREFIX = 'saoy.';

// Storage that never throws: private mode, blocked iframes and Node tests all behave like "empty"
const raw = {
  get(k: string) { try { return globalThis.localStorage?.getItem(PREFIX + k) ?? null; } catch { return null; } },
  set(k: string, v: string) { try { globalThis.localStorage?.setItem(PREFIX + k, v); } catch {} },
  del(k: string) { try { globalThis.localStorage?.removeItem(PREFIX + k); } catch {} },
};

const reduced = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false; // undefined in Node tests
// First visit: Thai for Thai browsers, English for everyone else (Node tests: Thai, the original text)
const nav = globalThis.navigator, firstLang = !nav?.languages || nav.languages.some(l => /^th/i.test(l)) ? 'th' : 'en';

// ---------- schemas ----------
const SettingsSchema = z.object({
  lang: z.enum(['th', 'en']).default(firstLang),
  music: z.number().min(0).max(100).default(60),
  sfx: z.number().min(0).max(100).default(80),
  shake: z.boolean().default(!reduced),
  flash: z.boolean().default(!reduced),
  hints: z.boolean().default(true),
  aim: z.enum(['move', 'mouse']).default('move'), // face where you walk (+ aim assist) or aim with the mouse
  assistDamage: z.number().min(0.25).max(1).default(1), // damage taken multiplier
  assistSpeed: z.number().min(0.5).max(1).default(1),   // game speed multiplier
  bindings: z.record(z.string(), z.array(z.string())).default({}), // per-action overrides of data/controls.ts
});
const BestSchema = z.object({
  floor: z.number().int().min(1), lv: z.number().int().min(1), time: z.number().min(0),
  kills: z.number().int().min(0), cleared: z.boolean(), assisted: z.boolean().default(false),
});
const MetaSchema = z.object({ best: BestSchema.nullable().default(null), bestLegacy: BestSchema.nullable().default(null), hintsSeen: z.array(z.string()).default([]),
  shards: z.number().int().min(0).default(0), unlocked: z.array(z.string()).default(['sonicLeap']), loadout: z.string().nullable().default(null), // Blade Art meta
  storySeen: z.array(z.string()).default([]) });
const SuspendSchema = z.object({
  floorIdx: z.number().int().min(0).max(FLOOR_COUNT - 1),
  room: z.object({ type: z.enum(ROOM_TYPES), reward: z.enum(REWARDS).nullable() }).nullable().default(null),
  player: z.object({ lv: z.number().int().min(1), xp: z.number().min(0), hp: z.number().positive().optional(), maxHp: z.number().positive(), atk: z.number().positive(),
    up: z.record(z.string(), z.number().int().min(0)).default({}), pendingUpgrades: z.number().int().min(0).default(0),
    build: z.object({
      arts: z.tuple([z.string().nullable(), z.string().nullable()]),
      mods: z.record(z.string(), z.array(z.enum(ELEMENT_IDS)).max(2)),
      evolved: z.array(z.string()),
    }).default({ arts: [null, null], mods: {}, evolved: [] }),
    col: z.number().int().min(0).default(0), potions: z.number().int().min(0).default(0), scrolls: z.number().int().min(0).default(0), modBuys: z.number().int().min(0).default(0) }),
  run: z.object({ floor: z.number().int().min(1), kills: z.number().int().min(0), time: z.number().min(0), assisted: z.boolean().default(false),
    seed: z.number().int(), bosses: z.number().int().min(0).default(0), curse: z.number().int().min(0).default(0) }),
});
export type Settings = z.infer<typeof SettingsSchema>;
export type Lang = Settings['lang'];
export type Meta = z.infer<typeof MetaSchema>;
export type Best = z.infer<typeof BestSchema>;
export type Suspend = z.infer<typeof SuspendSchema>;

// ---------- versioned slots ----------
interface Envelope { v: number; savedAt: string; data: unknown }
const isEnvelope = (x: any): x is Envelope => x && typeof x === 'object' && typeof x.v === 'number' && 'data' in x;

// MIGRATIONS[n] turns version-n data into version n+1 for a slot; null drops the slot.
// v0 = before envelopes existed (raw objects). v1 -> v2: the run grew from 4 to 20 floors, so a suspended
// 4-floor run can't continue, and the old best record is kept aside as bestLegacy.
const MIGRATIONS: Record<number, (data: any, slot: string) => any> = {
  0: data => data,
  1: (data, slot) => slot === 'suspend' ? null
    : slot === 'meta' ? { ...data, bestLegacy: data.best ?? null, best: null } : data,
  2: (data, slot) => {
    // v2 -> v3: the build. A v2 slot-2 Art moves into build.arts; Cyclone Edge and Piercing Fang became free,
    // so Shards spent on them come back (30 / 60, the v2 prices).
    if (slot === 'suspend') { const { skill2 = null, ...p } = data.player ?? {}; return { ...data, player: { ...p, build: { arts: [skill2, null], mods: {}, evolved: [] } } }; }
    if (slot === 'meta') {
      const paid: Record<string, number> = { horizontal: 30, vorpal: 60 }, had: string[] = data.unlocked ?? [];
      return { ...data, shards: (data.shards ?? 0) + had.reduce((s, id) => s + (paid[id] ?? 0), 0) };
    }
    return data;
  },
};
let legacySuspendDropped = false; // set when a v1 suspend is dropped; read once through takeLegacyNotice
function migrate(data: unknown, from: number, slot: string) {
  for (let v = from; v < SAVE_VERSION && data != null; v++) data = MIGRATIONS[v](data, slot);
  return data;
}

function load<S extends z.ZodType>(slot: string, schema: S, legacy?: () => unknown): z.output<S> | null {
  const text = raw.get(slot);
  let env: Envelope;
  try {
    const parsed = text !== null ? JSON.parse(text) : legacy?.();
    if (parsed == null) return null;
    env = isEnvelope(parsed) ? parsed : { v: 0, savedAt: '', data: parsed };
  } catch { if (text) raw.set(slot + '.bak', text); return null; }
  if (env.v > SAVE_VERSION) return null; // written by a newer build: leave it alone rather than guess
  const data = migrate(env.data, env.v, slot);
  if (data == null) { raw.del(slot); raw.del(slot + '.bak'); if (slot === 'suspend') legacySuspendDropped = true; return null; }
  const result = schema.safeParse(data);
  if (!result.success) { if (text) raw.set(slot + '.bak', text); return null; }
  return result.data;
}
function save(slot: string, data: unknown) {
  const prev = raw.get(slot);
  if (prev) raw.set(slot + '.bak', prev);
  raw.set(slot, JSON.stringify({ v: SAVE_VERSION, savedAt: new Date().toISOString(), data }));
}

// ---------- public API ----------
export const settings: Settings = load('settings', SettingsSchema) ?? SettingsSchema.parse({});
export const saveSettings = () => save('settings', settings);

// v0 kept the best record under its own "saoy.best" key; fold it into meta the first time we load
export const meta: Meta = load('meta', MetaSchema, () => { const b = raw.get('best'); return b && { best: JSON.parse(b) }; })
  ?? MetaSchema.parse({});
if (raw.get('best') !== null) { save('meta', meta); raw.del('best'); }
export const saveMeta = () => save('meta', meta);

export const loadSuspend = () => load('suspend', SuspendSchema);
loadSuspend(); // eager, so a dropped v1 suspend is known before the title asks
/** True once if an old-version suspended run was dropped on boot, then false. */
export const takeLegacyNotice = () => { const f = legacySuspendDropped; legacySuspendDropped = false; return f; };
export const writeSuspend = (s: Suspend) => save('suspend', s);
export const clearSuspend = () => { raw.del('suspend'); raw.del('suspend.bak'); };

// One JSON file with every slot, so players can back up or move their save
export function exportSave() {
  return JSON.stringify({ game: 'floorbreaker', v: SAVE_VERSION, exportedAt: new Date().toISOString(),
                          settings, meta, suspend: loadSuspend() }, null, 2);
}
const ExportSchema = z.object({
  game: z.enum(['floorbreaker', 'sword-art-on-you']), // the old name: files exported before the rename still import
  v: z.number().int().min(0).max(SAVE_VERSION),
  settings: z.unknown(), meta: z.unknown(), suspend: z.unknown().nullable(),
});
export function importSave(text: string): { ok: true } | { ok: false; error: { th: string; en: string } } {
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { return { ok: false, error: { th: 'ไฟล์ไม่ใช่ JSON', en: 'The file is not JSON' } }; }
  const bad = { ok: false as const, error: { th: 'ไฟล์ไม่ใช่เซฟของ Floorbreaker หรือข้อมูลเสียหาย', en: 'Not a Floorbreaker save, or the data is damaged' } };
  const r = ExportSchema.safeParse(parsed);
  if (!r.success) return bad;
  const st = SettingsSchema.safeParse(migrate(r.data.settings, r.data.v, 'settings'));
  const me = MetaSchema.safeParse(migrate(r.data.meta, r.data.v, 'meta'));
  const suRaw = r.data.suspend == null ? null : migrate(r.data.suspend, r.data.v, 'suspend');
  const su = suRaw == null ? null : SuspendSchema.safeParse(suRaw);
  if (!st.success || !me.success || (su && !su.success)) return bad;
  Object.assign(settings, st.data); saveSettings();
  Object.assign(meta, me.data); saveMeta();
  if (su?.success) writeSuspend(su.data); else clearSuspend();
  return { ok: true };
}
