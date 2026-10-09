// The download page: recognises the visitor's device, shows the one download
// that fits with short install steps, and lists the other devices below.
// Plain DOM (no React), so the page stays small. Nothing is tracked.
import '../index.css';
import { type Device, DOWNLOADS, detectDevice } from './devices';
import { type Lang, texts } from './texts';

const lang: Lang = navigator.language.toLowerCase().startsWith('nl') ? 'nl' : 'en';
const t = texts[lang];
document.documentElement.lang = lang;
document.title = t.pageTitle;

type Child = Node | string | null | undefined | false;
function h(tag: string, attrs: Record<string, string> = {}, ...children: Child[]): HTMLElement {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  for (const c of children) if (c) el.append(c);
  return el;
}

/** Small drawings of the iPhone buttons people have to look for. */
const SHARE_ICON =
  '<svg viewBox="0 0 24 24" class="inline h-5 w-5 align-text-bottom" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 3v12M8 7l4-4 4 4"/><path d="M5 11v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8"/></svg>';
const ADD_ICON =
  '<svg viewBox="0 0 24 24" class="inline h-5 w-5 align-text-bottom" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 8v8M8 12h8"/></svg>';

function step(html: string): HTMLElement {
  const li = h('li', { class: 'pl-1' });
  li.innerHTML = html.replace('{share}', SHARE_ICON).replace('{add}', ADD_ICON);
  return li;
}

function button(href: string, label: string, primary: boolean): HTMLElement {
  const cls = primary
    ? 'inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3 font-semibold text-white shadow-sm hover:bg-brand-700'
    : 'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-medium text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';
  return h('a', { href, class: cls, rel: 'noopener' }, label);
}

function deviceCard(device: Device, main: boolean): HTMLElement {
  const info = t.devices[device];
  const buttons = h('div', { class: 'mt-4 flex flex-wrap gap-2' });
  DOWNLOADS[device].forEach((d, i) => buttons.append(button(d.href, info.buttons[i], main && i === 0)));
  const steps = h(
    'ol',
    { class: 'mt-4 list-decimal space-y-2 pl-5 text-sm text-slate-700 dark:text-slate-300' },
    ...info.steps.map(step),
  );
  const note = info.note ? h('p', { class: 'mt-3 text-xs text-slate-500 dark:text-slate-400' }, info.note) : null;
  if (!main) {
    return h(
      'details',
      {
        class: 'rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900',
        'data-device': device,
      },
      h('summary', { class: 'cursor-pointer font-semibold' }, info.name),
      buttons,
      steps,
      note,
    );
  }
  return h(
    'section',
    {
      class: 'rounded-2xl border-2 border-brand-500 bg-white p-5 shadow-sm dark:bg-slate-900',
      'data-device': device,
      'aria-labelledby': 'main-device',
    },
    h('p', { class: 'text-sm text-slate-500 dark:text-slate-400' }, t.forYourDevice),
    h('h2', { id: 'main-device', class: 'text-xl font-bold' }, info.name),
    info.intro ? h('p', { class: 'mt-1 text-sm text-slate-600 dark:text-slate-300' }, info.intro) : null,
    buttons,
    steps,
    note,
  );
}

const ua = navigator.userAgent;
const current = detectDevice(ua, navigator.maxTouchPoints ?? 0);
const others = (Object.keys(DOWNLOADS) as Device[]).filter((d) => d !== current);
const iosNotSafari = current === 'ios' && /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);

const root = document.getElementById('download')!;
const parts: Child[] = [
  h(
    'header',
    { class: 'mb-6 flex items-center gap-3' },
    h('img', { src: 'icon.svg', alt: '', class: 'h-12 w-12 rounded-xl' }),
    h(
      'div',
      {},
      h('h1', { class: 'text-2xl font-bold' }, t.heading),
      h('p', { class: 'text-sm text-slate-600 dark:text-slate-300' }, t.subheading),
    ),
  ),
  iosNotSafari
    ? h(
        'p',
        {
          role: 'alert',
          class: 'mb-4 rounded-xl bg-amber-100 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100',
        },
        t.openInSafari,
      )
    : null,
  deviceCard(current, true),
  h('h2', { class: 'mt-8 mb-3 font-semibold' }, t.otherDevices),
  h('div', { class: 'space-y-2' }, ...others.map((d) => deviceCard(d, false))),
  h(
    'section',
    { class: 'mt-8 space-y-2 text-sm text-slate-600 dark:text-slate-300' },
    h('p', {}, t.webApp, ' ', h('a', { href: './', class: 'font-medium text-brand-600 underline' }, t.openWebApp)),
    h('p', {}, t.syncNote),
    h('p', { class: 'text-xs text-slate-500 dark:text-slate-400' }, t.privacy),
  ),
];
for (const p of parts) if (p) root.append(p);
