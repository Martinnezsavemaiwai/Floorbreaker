// EN/TH: every player-facing string is a { th, en } pair (or a plain string when both languages share it,
// like skill and boss names). `t` picks the current language; DOM text in index.html carries its English
// in data-en and is swapped by applyLang().
import { settings, saveSettings, type Lang } from './save.ts';
import { emit } from './events.ts';

export type Text = string | { th: string; en: string };
export const t = (x: Text) => (typeof x === 'string' ? x : x[settings.lang]);
export const tr = (th: string, en: string) => (settings.lang === 'en' ? en : th);

// Static markup: data-en holds the English, the Thai is remembered from the original markup on first swap.
// data-en-label / data-en-title do the same for aria-label / title.
export function applyLang() {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = settings.lang;
  for (const el of document.querySelectorAll<HTMLElement>('[data-en]')) {
    el.dataset.th ??= el.textContent ?? '';
    el.textContent = tr(el.dataset.th, el.dataset.en!);
  }
  for (const [attr, key] of [['aria-label', 'enLabel'], ['title', 'enTitle']] as const)
    for (const el of document.querySelectorAll<HTMLElement>(`[data-${key === 'enLabel' ? 'en-label' : 'en-title'}]`)) {
      const thKey = key + 'Th';
      el.dataset[thKey] ??= el.getAttribute(attr) ?? '';
      el.setAttribute(attr, tr(el.dataset[thKey]!, el.dataset[key]!));
    }
}

export function setLang(lang: Lang) {
  if (settings.lang === lang) return;
  settings.lang = lang; saveSettings(); applyLang(); emit('langChanged', lang);
}
