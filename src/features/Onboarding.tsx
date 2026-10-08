import { useState } from 'react';
import { actions, useStore } from '../data/store';
import type { Language, Role } from '../domain/types';
import { useFormat } from '../lib/format';
import { Chips } from '../components/ui';
import { Icon } from '../components/Icon';
import i18n from '../i18n';
import { asset } from '../lib/platform';

export function Onboarding() {
  const { t } = useFormat();
  const prefs = useStore((s) => s.prefs);
  const [step, setStep] = useState(0);
  const [role, setRole] = useState<Role>(prefs.role);
  const [lang, setLang] = useState<Language>(prefs.language);
  const [start, setStart] = useState('16:00');
  const [end, setEnd] = useState('21:00');

  const chooseLang = (l: Language) => {
    setLang(l);
    void i18n.changeLanguage(l);
  };
  const finish = async () => {
    const availability = prefs.availability.map((a, d) => (d >= 1 && d <= 5 ? { ...a, enabled: true, start, end } : a));
    await actions.savePrefs({ ...prefs, role, language: lang, availability, onboarded: true });
  };

  const steps = [
    <div key="0">
      <h1 className="mb-2 text-2xl font-bold">{t('onboarding.welcome')}</h1>
      <p className="mb-6 text-slate-600 dark:text-slate-300">{t('onboarding.intro')}</p>
      <span className="label">{t('settings.language')}</span>
      <Chips label={t('settings.language')} value={lang} onChange={chooseLang} options={[{ value: 'nl', label: 'Nederlands' }, { value: 'en', label: 'English' }]} />
    </div>,
    <div key="1">
      <h2 className="mb-2 text-xl font-bold">{t('onboarding.roleTitle')}</h2>
      <p className="mb-4 text-slate-600 dark:text-slate-300">{t('onboarding.roleIntro')}</p>
      <Chips label={t('settings.role')} value={role} onChange={setRole} options={[{ value: 'student', label: t('role.student') }, { value: 'teacher', label: t('role.teacher') }]} />
    </div>,
    <div key="2">
      <h2 className="mb-2 text-xl font-bold">{t('onboarding.timeTitle')}</h2>
      <p className="mb-4 text-slate-600 dark:text-slate-300">{t('onboarding.timeIntro')}</p>
      <div className="flex items-center gap-2">
        <input className="input w-32" type="time" value={start} onChange={(e) => setStart(e.target.value)} aria-label={t('onboarding.from')} />
        <span>-</span>
        <input className="input w-32" type="time" value={end} onChange={(e) => setEnd(e.target.value)} aria-label={t('onboarding.to')} />
      </div>
      <p className="mt-2 text-xs text-slate-500">{t('onboarding.timeHint')}</p>
    </div>,
    <div key="3">
      <div className="mb-3 flex items-center gap-2 text-emerald-600"><Icon name="shield" className="h-7 w-7" /><h2 className="text-xl font-bold">{t('onboarding.privacyTitle')}</h2></div>
      <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700 dark:text-slate-300">
        <li>{t('privacy.local')}</li>
        <li>{t('privacy.noServer')}</li>
        <li>{t('privacy.noTracking')}</li>
        <li>{t('onboarding.privacyIntegrations')}</li>
      </ul>
    </div>,
  ];

  return (
    <div className="flex min-h-full items-center justify-center p-4">
      <div className="card w-full max-w-md p-6">
        <div className="mb-6 flex items-center gap-2">
          <img src={asset('icon.svg')} alt="" className="h-9 w-9" />
          <span className="text-lg font-bold">Planora</span>
          <span className="ml-auto text-xs text-slate-500">{step + 1} / {steps.length}</span>
        </div>
        {steps[step]}
        <div className="mt-8 flex justify-between">
          <button className="btn-ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>{t('common.back')}</button>
          {step < steps.length - 1 ? (
            <button className="btn-primary" onClick={() => setStep(step + 1)}>{t('common.next')}</button>
          ) : (
            <button className="btn-primary" onClick={finish}>{t('onboarding.start')}</button>
          )}
        </div>
      </div>
    </div>
  );
}
