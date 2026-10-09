// Small helpers shared by the public pages next to the app (download, about, privacy).
// Plain DOM, no React, so these pages stay small. Nothing is tracked.

export type Lang = 'nl' | 'en';

export type Child = Node | string | null | undefined | false;

export function h(tag: string, attrs: Record<string, string> = {}, ...children: Child[]): HTMLElement {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  for (const c of children) if (c) el.append(c);
  return el;
}

/** Dutch for Dutch browsers, English otherwise; `?lang=nl` or `?lang=en` overrides (for sharing). */
export function pageLang(): Lang {
  const asked = new URLSearchParams(location.search).get('lang');
  if (asked === 'nl' || asked === 'en') return asked;
  return navigator.language.toLowerCase().startsWith('nl') ? 'nl' : 'en';
}

export const CONTACT_EMAIL = 'planoradevelopment@outlook.com';

const FOOTER: Record<Lang, { about: string; download: string; privacy: string; app: string }> = {
  nl: { about: 'Over Planora', download: 'Downloaden', privacy: 'Privacy', app: 'Planora openen' },
  en: { about: 'About Planora', download: 'Download', privacy: 'Privacy', app: 'Open Planora' },
};

/** Links between the public pages, plus the contact address. */
export function siteFooter(lang: Lang): HTMLElement {
  const f = FOOTER[lang];
  const link = (href: string, label: string) =>
    h('a', { href, class: 'underline hover:text-brand-600 dark:hover:text-brand-200' }, label);
  return h(
    'footer',
    {
      class:
        'mt-12 flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-200 pt-4 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400',
    },
    link('./', f.app),
    link('about.html', f.about),
    link('download.html', f.download),
    link('privacy.html', f.privacy),
    link(`mailto:${CONTACT_EMAIL}`, CONTACT_EMAIL),
  );
}
