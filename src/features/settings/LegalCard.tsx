import { Icon } from '../../components/Icon';
import { useFormat } from '../../lib/format';
import { type LegalPage, legalUrl } from '../../lib/links';

const PAGES: LegalPage[] = ['privacy', 'terms', 'contact', 'licenses'];

/** Links to the published privacy policy, terms of use, contact page and open-source licenses. */
export function LegalCard() {
  const { t, lang } = useFormat();
  return (
    <div className="card mb-4">
      <h3 className="mb-1 flex items-center gap-2 font-semibold">
        <Icon name="link" className="h-5 w-5" />
        {t('legal.title')}
      </h3>
      <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">{t('legal.intro')}</p>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {PAGES.map((page) => (
          <li key={page}>
            <a
              className="font-medium text-brand-600 underline dark:text-brand-200"
              href={legalUrl(page, lang)}
              target="_blank"
              rel="noreferrer noopener"
            >
              {t('legal.' + page)}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
