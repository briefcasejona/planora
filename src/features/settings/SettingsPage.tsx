import { useSearchParams } from 'react-router-dom';
import { useFormat } from '../../lib/format';
import { Chips } from '../../components/ui';
import { PlanningSettings } from './PlanningSettings';
import { MicrosoftCard } from './MicrosoftCard';
import { GoogleCard, IcsCard } from './OtherCalendars';
import { PrivacyCenter } from './PrivacyCenter';

type Tab = 'planning' | 'calendars' | 'privacy';

export function SettingsPage() {
  const { t } = useFormat();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'planning';
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">{t('nav.settings')}</h1>
      <div className="mb-5">
        <Chips label={t('nav.settings')} value={tab} onChange={(v) => setParams({ tab: v })}
          options={[
            { value: 'planning', label: t('settings.tabPlanning') },
            { value: 'calendars', label: t('settings.tabCalendars') },
            { value: 'privacy', label: t('settings.tabPrivacy') },
          ]} />
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
      {tab === 'privacy' && <PrivacyCenter />}
    </div>
  );
}
