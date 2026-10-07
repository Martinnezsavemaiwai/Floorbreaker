// Persistence: settings, meta progress (best record, hints seen) and one suspend slot for the current run.
// Every slot is stored as a versioned envelope { v, savedAt, data }, migrated forward on load and validated
// with Zod. Anything unreadable falls back to defaults, and the bad copy is kept as "<slot>.bak".
// Browser storage is only a cache (Safari wipes it after 7 idle days, itch.io iframes may partition it),
// so export/import is the one reliable backup.
import { z } from 'zod';
import { FLOORS } from '../data/floors.ts';

export const SAVE_VERSION = 1;
const PREFIX = 'saoy.';

// Storage that never throws: private mode, blocked iframes and Node tests all behave like "empty"
const raw = {
  get(k: string) { try { return globalThis.localStorage?.getItem(PREFIX + k) ?? null; } catch { return null; } },
  set(k: string, v: string) { try { globalThis.localStorage?.setItem(PREFIX + k, v); } catch {} },
  del(k: string) { try { globalThis.localStorage?.removeItem(PREFIX + k); } catch {} },
};

const reduced = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false; // undefined in Node tests

// ---------- schemas ----------
const SettingsSchema = z.object({
  music: z.number().min(0).max(100).default(60),
  sfx: z.number().min(0).max(100).default(80),
  shake: z.boolean().default(!reduced),
  flash: z.boolean().default(!reduced),
  hints: z.boolean().default(true),
  assistDamage: z.number().min(0.25).max(1).default(1), // damage taken multiplier
  assistSpeed: z.number().min(0.5).max(1).default(1),   // game speed multiplier
  bindings: z.record(z.string(), z.array(z.string())).default({}), // per-action overrides of data/controls.ts
});
const BestSchema = z.object({
  floor: z.number().int().min(1), lv: z.number().int().min(1), time: z.number().min(0),
  kills: z.number().int().min(0), cleared: z.boolean(), assisted: z.boolean().default(false),
});
const MetaSchema = z.object({ best: BestSchema.nullable().default(null), hintsSeen: z.array(z.string()).default([]),
  shards: z.number().int().min(0).default(0), unlocked: z.array(z.string()).default(['sonicLeap']), loadout: z.string().nullable().default(null), // Sword Skill meta
  storySeen: z.array(z.string()).default([]) });
const SuspendSchema = z.object({
  floorIdx: z.number().int().min(0).max(FLOORS.length - 1),
  player: z.object({ lv: z.number().int().min(1), xp: z.number().min(0), maxHp: z.number().positive(), atk: z.number().positive(),
    up: z.record(z.string(), z.number().int().min(0)).default({}), pendingUpgrades: z.number().int().min(0).default(0),
    skill2: z.string().nullable().default(null),
    col: z.number().int().min(0).default(0), potions: z.number().int().min(0).default(0), scrolls: z.number().int().min(0).default(0) }),
  run: z.object({ floor: z.number().int().min(1), kills: z.number().int().min(0), time: z.number().min(0), assisted: z.boolean().default(false) }),
});
export type Settings = z.infer<typeof SettingsSchema>;
export type Meta = z.infer<typeof MetaSchema>;
export type Best = z.infer<typeof BestSchema>;
export type Suspend = z.infer<typeof SuspendSchema>;

// ---------- versioned slots ----------
interface Envelope { v: number; savedAt: string; data: unknown }
const isEnvelope = (x: any): x is Envelope => x && typeof x === 'object' && typeof x.v === 'number' && 'data' in x;

// MIGRATIONS[n] turns version-n data into version n+1. v0 = before envelopes existed (raw objects).
const MIGRATIONS: Record<number, (data: any) => any> = {
  0: data => data, // same shapes; v1 adds the envelope and new fields, which the schema defaults fill in
};

function load<S extends z.ZodType>(slot: string, schema: S, legacy?: () => unknown): z.output<S> | null {
  const text = raw.get(slot);
  let env: Envelope;
  try {
    const parsed = text !== null ? JSON.parse(text) : legacy?.();
    if (parsed == null) return null;
    env = isEnvelope(parsed) ? parsed : { v: 0, savedAt: '', data: parsed };
  } catch { if (text) raw.set(slot + '.bak', text); return null; }
  if (env.v > SAVE_VERSION) return null; // written by a newer build: leave it alone rather than guess
  let { v, data } = env;
  for (; v < SAVE_VERSION; v++) data = MIGRATIONS[v](data);
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
export const writeSuspend = (s: Suspend) => save('suspend', s);
export const clearSuspend = () => { raw.del('suspend'); raw.del('suspend.bak'); };

// One JSON file with every slot, so players can back up or move their save
export function exportSave() {
  return JSON.stringify({ game: 'sword-art-on-you', v: SAVE_VERSION, exportedAt: new Date().toISOString(),
                          settings, meta, suspend: loadSuspend() }, null, 2);
}
const ExportSchema = z.object({
  game: z.literal('sword-art-on-you'), v: z.number().int().max(SAVE_VERSION),
  settings: SettingsSchema, meta: MetaSchema, suspend: SuspendSchema.nullable(),
});
export function importSave(text: string): { ok: true } | { ok: false; error: string } {
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { return { ok: false, error: 'ไฟล์ไม่ใช่ JSON' }; }
  const r = ExportSchema.safeParse(parsed);
  if (!r.success) return { ok: false, error: 'ไฟล์ไม่ใช่เซฟของ Sword Art On You หรือข้อมูลเสียหาย' };
  Object.assign(settings, r.data.settings); saveSettings();
  Object.assign(meta, r.data.meta); saveMeta();
  if (r.data.suspend) writeSuspend(r.data.suspend); else clearSuspend();
  return { ok: true };
}
