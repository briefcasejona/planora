// The page for IT administrators: which Microsoft permissions Planora asks for, where data goes, and
// how to approve it for a whole organisation. Plain DOM (no React), so the page stays small. Nothing is tracked.
import '../index.css';
import { appUrl } from '../lib/platform';
import { h, pageLang, siteFooter } from '../site/dom';
import { adminConsentUrl } from './consent';
import { texts } from './texts';

const lang = pageLang();
const t = texts[lang];
document.documentElement.lang = lang;
document.title = t.pageTitle;
const clientId = import.meta.env.VITE_MS_CLIENT_ID as string | undefined;

/** Text with a little markup (<b>, links) that we wrote ourselves in texts.ts. */
function rich(tag: string, html: string, cls = ''): HTMLElement {
  const el = h(tag, cls ? { class: cls } : {});
  el.innerHTML = html;
  return el;
}

const heading = (text: string) => h('h2', { class: 'mt-10 mb-3 text-xl font-bold' }, text);
const list = (items: string[]) =>
  h(
    'ul',
    { class: 'list-disc space-y-2 pl-6 text-slate-700 dark:text-slate-300' },
    ...items.map((i) => rich('li', i, 'pl-1')),
  );
const cell = 'border-b border-slate-200 p-2 align-top dark:border-slate-800';

const table = h(
  'div',
  { class: 'overflow-x-auto' },
  h(
    'table',
    { class: 'w-full min-w-[32rem] text-left text-sm' },
    h('thead', {}, h('tr', {}, ...t.permissionHeads.map((x) => h('th', { class: cell + ' font-semibold' }, x)))),
    h(
      'tbody',
      {},
      ...t.permissions.map((p) =>
        h(
          'tr',
          {},
          h('td', { class: cell + ' font-mono whitespace-nowrap' }, p.scope),
          h('td', { class: cell }, p.feature),
          h('td', { class: cell + ' text-slate-600 dark:text-slate-400' }, p.when),
        ),
      ),
    ),
  ),
);

const approve = clientId
  ? h(
      'div',
      { class: 'space-y-3' },
      h(
        'a',
        {
          href: adminConsentUrl(clientId, appUrl('auth-redirect.html')),
          class: 'inline-block rounded-xl bg-brand-600 px-6 py-3 font-semibold text-white shadow-sm hover:bg-brand-700',
          rel: 'noopener',
        },
        t.approveLink,
      ),
      h(
        'p',
        { class: 'text-sm text-slate-600 dark:text-slate-300' },
        t.clientIdLabel + ': ',
        h('code', { class: 'font-mono select-all' }, clientId),
      ),
    )
  : h('p', { class: 'text-sm text-slate-500' }, t.approveNoId);

const root = document.getElementById('for-it')!;
root.append(
  h(
    'header',
    {},
    h('img', { src: 'icon.svg', alt: '', class: 'h-12 w-12 rounded-2xl' }),
    h('h1', { class: 'mt-3 text-3xl font-bold text-balance' }, t.title),
    h('p', { class: 'mt-3 text-slate-600 dark:text-slate-300' }, t.intro),
  ),
  heading(t.factsTitle),
  list(t.facts),
  heading(t.permissionsTitle),
  h('p', { class: 'mb-3 text-slate-600 dark:text-slate-300' }, t.permissionsIntro),
  table,
  h('p', { class: 'mt-3 text-sm text-slate-500 dark:text-slate-400' }, t.signInNote),
  heading(t.approveTitle),
  h('p', { class: 'mb-4 text-slate-700 dark:text-slate-300' }, t.approveIntro),
  approve,
  h(
    'ol',
    { class: 'mt-4 list-decimal space-y-2 pl-6 text-sm text-slate-700 dark:text-slate-300' },
    ...t.approveSteps.map((s) => h('li', { class: 'pl-1' }, s)),
  ),
  heading(t.limitTitle),
  list(t.limit),
  heading(t.verifyTitle),
  rich('p', t.verify, 'text-slate-700 dark:text-slate-300'),
  heading(t.contactTitle),
  rich('p', t.contact, 'text-slate-700 dark:text-slate-300'),
  siteFooter(lang),
);
