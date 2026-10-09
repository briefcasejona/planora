// The about page: what Planora is, who it's for and why, with a FAQ.
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

const heading = (text: string) => h('h2', { class: 'mt-12 mb-4 text-xl font-bold' }, text);

function cards(items: { title: string; text: string }[]): HTMLElement {
  return h(
    'div',
    { class: 'grid gap-3 sm:grid-cols-2' },
    ...items.map((i) =>
      h(
        'div',
        { class: 'rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900' },
        h('h3', { class: 'font-semibold' }, i.title),
        h('p', { class: 'mt-1 text-sm text-slate-600 dark:text-slate-300' }, i.text),
      ),
    ),
  );
}

const root = document.getElementById('about')!;
root.append(
  h(
    'header',
    { class: 'text-center' },
    h('img', { src: 'icon.svg', alt: '', class: 'mx-auto h-16 w-16 rounded-2xl' }),
    h('p', { class: 'mt-3 text-sm font-semibold tracking-wide text-brand-600 dark:text-brand-200' }, 'Planora'),
    h('h1', { class: 'mt-1 text-3xl font-bold sm:text-4xl' }, t.tagline),
    h('p', { class: 'mx-auto mt-4 max-w-xl text-slate-600 dark:text-slate-300' }, t.intro),
    h(
      'div',
      { class: 'mt-6 flex flex-wrap justify-center gap-3' },
      h(
        'a',
        {
          href: './',
          class: 'rounded-xl bg-brand-600 px-6 py-3 font-semibold text-white shadow-sm hover:bg-brand-700',
        },
        t.openApp,
      ),
      h(
        'a',
        {
          href: 'download.html',
          class:
            'rounded-xl border border-slate-300 bg-white px-6 py-3 font-medium text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100',
        },
        t.download,
      ),
    ),
    h('p', { class: 'mt-3 text-sm text-slate-500 dark:text-slate-400' }, t.noAccount),
  ),
  heading(t.howTitle),
  h(
    'ol',
    { class: 'list-decimal space-y-3 pl-6 text-slate-700 dark:text-slate-300' },
    ...t.how.map((s) => rich('li', s, 'pl-1')),
  ),
  heading(t.featuresTitle),
  cards(t.features),
  heading(t.forWhoTitle),
  cards(t.forWho),
  heading(t.whyTitle),
  cards(t.why),
  heading(t.faqTitle),
  h(
    'div',
    { class: 'space-y-2' },
    ...t.faq.map((f) =>
      h(
        'details',
        { class: 'rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900' },
        h('summary', { class: 'cursor-pointer font-semibold' }, f.q),
        rich('p', f.a, 'mt-2 text-sm text-slate-600 dark:text-slate-300'),
      ),
    ),
  ),
  heading(t.madeByTitle),
  rich('p', t.madeBy, 'text-slate-700 dark:text-slate-300'),
  siteFooter(lang),
);
