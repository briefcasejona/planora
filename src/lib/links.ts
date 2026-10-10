/** Public places where Planora can be opened or downloaded (no data is hosted there). */
export const WEB_APP_URL = 'https://briefcasejona.github.io/planora/';
export const RELEASES_URL = 'https://github.com/briefcasejona/planora/releases/latest';
export const DOWNLOAD_URL = WEB_APP_URL + 'download.html';

export type LegalPage = 'privacy' | 'terms' | 'contact' | 'licenses';

/**
 * The published legal pages (generated from legal/*.md by `npm run legal`). Always the website
 * address, so the desktop and Android apps open them in the browser instead of inside the app.
 */
export const legalUrl = (page: LegalPage, lang: string) =>
  `${WEB_APP_URL}legal/${page}${lang === 'nl' && page !== 'licenses' ? '.nl' : ''}.html`;
