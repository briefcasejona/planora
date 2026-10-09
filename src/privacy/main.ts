// The privacy page: in plain language, what Planora keeps, where data can go, and who to contact.
// Plain DOM (no React), so the page stays small. Nothing is tracked.
import '../index.css';
import { h, pageLang, siteFooter } from '../site/dom';
import { texts } from './texts';

const lang = pageLang();
const t = texts[lang];
document.documentElement.lang = lang;
document.title = t.pageTitle;

/** Text with a little markup (<b>, links) that we wrote ourselves in texts.ts. */
function rich(tag: string, html: string, cls = ''): HTMLElement {
  const el = h(tag, cls ? { class: cls } : {});
  el.innerHTML = html;
  return el;
}

const root = document.getElementById('privacy')!;
root.append(
  h(
    'header',
    { class: 'mb-6 flex items-center gap-3' },
    h('a', { href: 'about.html' }, h('img', { src: 'icon.svg', alt: 'Planora', class: 'h-12 w-12 rounded-xl' })),
    h(
      'div',
      {},
      h('h1', { class: 'text-2xl font-bold' }, t.heading),
      h('p', { class: 'text-sm text-slate-500 dark:text-slate-400' }, t.updated),
    ),
  ),
  h(
    'p',
    {
      class:
        'rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100',
    },
    t.summary,
  ),
  ...t.sections.map((s) =>
    h(
      'section',
      { class: 'mt-8' },
      h('h2', { class: 'mb-2 text-lg font-semibold' }, s.title),
      ...s.body.map((p) => rich('p', p, 'mt-2 text-slate-700 dark:text-slate-300')),
      s.list
        ? h(
            'ul',
            { class: 'mt-2 list-disc space-y-2 pl-6 text-slate-700 dark:text-slate-300' },
            ...s.list.map((li) => rich('li', li, 'pl-1')),
          )
        : null,
    ),
  ),
  siteFooter(lang),
);
