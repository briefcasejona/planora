import { Icon } from '../../components/Icon';
import { useFormat } from '../../lib/format';
import { ABOUT_URL, DOWNLOAD_URL, WEB_APP_URL } from '../../lib/links';

/** How to put Planora on other devices, or share it with friends. */
export function InstallCard() {
  const { t } = useFormat();
  const link = (href: string, label: string) => (
    <a
      className="font-medium text-brand-600 underline dark:text-brand-200"
      href={href}
      target="_blank"
      rel="noreferrer noopener"
    >
      {label}
    </a>
  );
  return (
    <div className="card mb-4">
      <h3 className="mb-1 flex items-center gap-2 font-semibold">
        <Icon name="download" className="h-5 w-5" />
        {t('install.title')}
      </h3>
      <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">{t('install.intro')}</p>
      <ul className="space-y-2 text-sm">
        <li>
          <span className="font-medium">{t('install.about')}</span> {link(ABOUT_URL, ABOUT_URL.replace('https://', ''))}
        </li>
        <li>
          <span className="font-medium">{t('install.page')}</span>{' '}
          {link(DOWNLOAD_URL, DOWNLOAD_URL.replace('https://', ''))}
        </li>
        <li className="text-slate-600 dark:text-slate-300">{t('install.pageHint')}</li>
        <li>
          <span className="font-medium">{t('install.web')}</span>{' '}
          {link(WEB_APP_URL, WEB_APP_URL.replace('https://', ''))}
        </li>
      </ul>
      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{t('install.ownData')}</p>
    </div>
  );
}
