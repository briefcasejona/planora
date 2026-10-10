import { describe, expect, it } from 'vitest';
import { type LegalPage, legalUrl, WEB_APP_URL } from './links';

const PAGES: LegalPage[] = ['privacy', 'terms', 'contact', 'licenses'];
/** The generated pages, e.g. '/public/legal/privacy.html'. */
const GENERATED = Object.keys(import.meta.glob('/public/legal/*.html', { query: '?url' }));

describe('legal page links', () => {
  it('point to the website in the right language (licenses only exist in English)', () => {
    expect(legalUrl('privacy', 'nl')).toBe(WEB_APP_URL + 'legal/privacy.nl.html');
    expect(legalUrl('privacy', 'en')).toBe(WEB_APP_URL + 'legal/privacy.html');
    expect(legalUrl('licenses', 'nl')).toBe(WEB_APP_URL + 'legal/licenses.html');
  });

  it('every linked page has been generated (run `npm run legal` after editing legal/*.md)', () => {
    for (const page of PAGES)
      for (const lang of ['nl', 'en']) {
        const file = '/public/' + legalUrl(page, lang).slice(WEB_APP_URL.length);
        expect(GENERATED, file).toContain(file);
      }
  });
});
