// localStorage with a key prefix; every access is wrapped because private modes and partitioned iframes throw.
export const store = {
  get<T>(k: string, d: T): T { try { return JSON.parse(localStorage.getItem('saoy.' + k) ?? 'null') ?? d; } catch { return d; } },
  set(k: string, v: unknown) { try { localStorage.setItem('saoy.' + k, JSON.stringify(v)); } catch {} },
};

export interface Settings { music: number; sfx: number; shake: boolean; flash: boolean }
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const settings: Settings = Object.assign({ music: 60, sfx: 80, shake: !reduced, flash: !reduced }, store.get<Partial<Settings>>('settings', {}));
export const saveSettings = () => store.set('settings', settings);
