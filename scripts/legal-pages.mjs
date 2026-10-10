// Turns the legal documents in legal/*.md into static pages in public/legal/.
// Vite copies public/ into every build, so the pages are on the website
// (…/planora/legal/privacy.html) and inside the desktop app and APK.
// Run after editing a document: npm run legal

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const PAGES = [
  { src: 'privacy-policy.md', out: 'privacy.html', lang: 'en', alt: 'privacy.nl.html' },
  { src: 'privacy-policy.nl.md', out: 'privacy.nl.html', lang: 'nl', alt: 'privacy.html' },
  { src: 'terms-of-use.md', out: 'terms.html', lang: 'en', alt: 'terms.nl.html' },
  { src: 'terms-of-use.nl.md', out: 'terms.nl.html', lang: 'nl', alt: 'terms.html' },
  { src: 'contact.md', out: 'contact.html', lang: 'en', alt: 'contact.nl.html' },
  { src: 'contact.nl.md', out: 'contact.nl.html', lang: 'nl', alt: 'contact.html' },
  { src: 'THIRD_PARTY_NOTICES.md', out: 'licenses.html', lang: 'en' },
];

/** Links between the documents point to the generated pages. */
const LINKS = Object.fromEntries(PAGES.map((p) => [p.src, p.out]));

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function inline(text) {
  return (
    esc(text)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>')
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) => {
        const target = LINKS[href] ?? href;
        return /^(https:\/\/|mailto:|[\w.-]+\.html$)/.test(target) ? `<a href="${target}">${label}</a>` : label;
      })
      // Bare URLs become links; a full stop or comma right after a URL ends the sentence, not the URL.
      .replace(/(^|[\s(])(https:\/\/[^\s<)]*[^\s<).,;:])/g, '$1<a href="$2">$2</a>')
  );
}

function toHtml(md) {
  const lines = md.replace(/<!--[\s\S]*?-->/g, '').split(/\r?\n/);
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('```')) {
      const body = [];
      for (i++; i < lines.length && !lines[i].startsWith('```'); i++) body.push(lines[i]);
      out.push(`<pre>${esc(body.join('\n'))}</pre>`);
      i++;
    } else if (/^#{1,4} /.test(line)) {
      const level = line.match(/^#+/)[0].length;
      out.push(`<h${level}>${inline(line.slice(level + 1))}</h${level}>`);
      i++;
    } else if (line.startsWith('|')) {
      const rows = [];
      for (; i < lines.length && lines[i].startsWith('|'); i++) rows.push(lines[i]);
      const cells = (r) =>
        r
          .replace(/^\||\|$/g, '')
          .split('|')
          .map((c) => c.trim());
      const [head, , ...body] = rows;
      out.push(
        `<div class="table"><table><thead><tr>${cells(head)
          .map((c) => `<th>${inline(c)}</th>`)
          .join('')}</tr></thead><tbody>${body
          .map(
            (r) =>
              `<tr>${cells(r)
                .map((c) => `<td>${inline(c)}</td>`)
                .join('')}</tr>`,
          )
          .join('')}</tbody></table></div>`,
      );
    } else if (/^\s*- /.test(line)) {
      const items = [];
      for (; i < lines.length && /^\s*- /.test(lines[i]); i++) items.push(lines[i].replace(/^\s*- /, ''));
      out.push(`<ul>${items.map((t) => `<li>${inline(t)}</li>`).join('')}</ul>`);
    } else if (line.trim() === '') {
      i++;
    } else {
      const para = [];
      for (; i < lines.length && lines[i].trim() && !/^(#|\||```|\s*- )/.test(lines[i]); i++) para.push(lines[i]);
      out.push(`<p>${inline(para.join(' '))}</p>`);
    }
  }
  return out.join('\n');
}

const STYLE = `body{font:16px/1.6 system-ui,sans-serif;max-width:46rem;margin:0 auto;padding:1.5rem 1rem 4rem;color:#1e293b;background:#fff}
a{color:#4f46e5}h1{font-size:1.6rem;line-height:1.25}h2{margin-top:2rem;font-size:1.2rem}h3{font-size:1.05rem}
.table{overflow-x:auto}table{border-collapse:collapse;width:100%;font-size:.9rem;margin:1rem 0}th,td{border:1px solid #cbd5e1;padding:.4rem .5rem;text-align:left;vertical-align:top}th{background:#f1f5f9}
pre{white-space:pre-wrap;font-size:.75rem;background:#f8fafc;border:1px solid #e2e8f0;padding:.75rem;border-radius:.5rem}
code{font-size:.9em}nav{font-size:.9rem;margin-bottom:1rem;display:flex;gap:1rem;flex-wrap:wrap}
@media (prefers-color-scheme:dark){body{color:#e2e8f0;background:#0f172a}a{color:#a5b4fc}th{background:#1e293b}th,td{border-color:#334155}pre{background:#1e293b;border-color:#334155}}`;

mkdirSync('public/legal', { recursive: true });
for (const page of PAGES) {
  const md = readFileSync(`legal/${page.src}`, 'utf8');
  const title = (md.match(/^# (.+)$/m)?.[1] ?? 'Planora').replace(/[*`]/g, '');
  const nav = [
    page.alt &&
      `<a href="${page.alt}" hreflang="${page.lang === 'nl' ? 'en' : 'nl'}">${page.lang === 'nl' ? 'English' : 'Nederlands'}</a>`,
    `<a href="../">Planora</a>`,
  ]
    .filter(Boolean)
    .join('');
  const html = `<!doctype html>
<html lang="${page.lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">
<meta name="referrer" content="no-referrer">
<title>${esc(title)}</title>
<style>${STYLE}</style>
</head>
<body>
<nav>${nav}</nav>
<main>
${toHtml(md)}
</main>
</body>
</html>
`;
  writeFileSync(`public/legal/${page.out}`, html);
  console.log('wrote', `public/legal/${page.out}`);
}
