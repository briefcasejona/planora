import { useSearchParams } from 'react-router-dom';
import { Chips } from '../../components/ui';
import { useFormat } from '../../lib/format';
import { MicrosoftCard } from './MicrosoftCard';
import { GoogleCard, IcsCard } from './OtherCalendars';
import { PlanningSettings } from './PlanningSettings';
import { PrivacyCenter } from './PrivacyCenter';
import { SyncCard } from './SyncCard';

type Tab = 'planning' | 'calendars' | 'sync' | 'privacy';

export function SettingsPage() {
  const { t } = useFormat();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'planning';
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">{t('nav.settings')}</h1>
      <div className="mb-5">
        <Chips
          label={t('nav.settings')}
          value={tab}
          onChange={(v) => setParams({ tab: v })}
          options={[
            { value: 'planning', label: t('settings.tabPlanning') },
            { value: 'calendars', label: t('settings.tabCalendars') },
            { value: 'sync', label: t('settings.tabSync') },
            { value: 'privacy', label: t('settings.tabPrivacy') },
          ]}
        />
      </div>
      {tab === 'planning' && <PlanningSettings />}
      {tab === 'calendars' && (
        <div>
          <div className="card mb-4">
            <h3 className="font-semibold">{t('integrations.builtin')}</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">{t('integrations.builtinIntro')}</p>
          </div>
          <p className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
            {t('integrations.privacyPromise')}
          </p>
          <MicrosoftCard />
          <GoogleCard />
          <IcsCard />
        </div>
      )}
      {tab === 'sync' && <SyncCard />}
      {tab === 'privacy' && <PrivacyCenter />}
      {tab !== 'privacy' && (
        <p className="mt-6 text-center text-sm">
          <button
            className="text-slate-500 underline hover:text-slate-700 dark:hover:text-slate-300"
            onClick={() => setParams({ tab: 'privacy' })}
          >
            {t('report.title')}
          </button>
        </p>
      )}
    </div>
  );
}
