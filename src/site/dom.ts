// Small helpers shared by the public pages next to the app (download, about).
// Plain DOM, no React, so these pages stay small. Nothing is tracked.
import { legalPath } from '../lib/links';

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

const FOOTER: Record<Lang, Record<'app' | 'about' | 'download' | 'privacy' | 'terms' | 'contact', string>> = {
  nl: {
    app: 'Planora openen',
    about: 'Over Planora',
    download: 'Downloaden',
    privacy: 'Privacyverklaring',
    terms: 'Gebruiksvoorwaarden',
    contact: 'Contact',
  },
  en: {
    app: 'Open Planora',
    about: 'About Planora',
    download: 'Download',
    privacy: 'Privacy policy',
    terms: 'Terms of use',
    contact: 'Contact',
  },
};

/** Links between the public pages and to the legal pages. */
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
    link(legalPath('privacy', lang), f.privacy),
    link(legalPath('terms', lang), f.terms),
    link(legalPath('contact', lang), f.contact),
  );
}
