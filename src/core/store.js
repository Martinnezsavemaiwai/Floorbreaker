// localStorage with a key prefix; every access is wrapped because private modes and partitioned iframes throw.
export const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem('saoy.' + k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem('saoy.' + k, JSON.stringify(v)); } catch {} },
};

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const settings = Object.assign({ music: 60, sfx: 80, shake: !reduced, flash: !reduced }, store.get('settings', {}));
export const saveSettings = () => store.set('settings', settings);
