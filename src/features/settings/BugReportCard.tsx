import { useEffect, useState } from 'react';
import { Icon } from '../../components/Icon';
import { Field } from '../../components/ui';
import { repo } from '../../data/repo';
import { useSync } from '../../data/sync/engine';
import { useIntegrations } from '../../integrations/settings';
import { buildBugReportText, buildBugReportUrl, REPORT_EMAIL, type ReportPlatform } from '../../lib/bugReport';
import { useFormat } from '../../lib/format';
import { APP_VERSION, isIos, platform } from '../../lib/platform';

async function reportPlatform(): Promise<ReportPlatform> {
  const p = platform();
  if (p === 'android') return 'Android';
  if (p === 'ios' || isIos()) return 'iPhone / iPad';
  if (p === 'desktop') {
    const os = (await window.planoraDesktop?.getSettings())?.platform;
    return os === 'darwin' ? 'Mac' : os === 'linux' ? 'Linux' : 'Windows';
  }
  return 'Website';
}

/**
 * "Report a problem": builds a GitHub issue with what the user typed plus
 * technical facts they can see and switch off. Never tasks or calendar data.
 */
export function BugReportCard() {
  const { t, lang } = useFormat();
  const integ = useIntegrations();
  const syncOn = useSync((s) => s.enabled);
  const [what, setWhat] = useState('');
  const [expected, setExpected] = useState('');
  const [steps, setSteps] = useState('');
  const [attach, setAttach] = useState(true);
  const [plat, setPlat] = useState<ReportPlatform>('Website');
  const [errors, setErrors] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void reportPlatform().then(setPlat);
    void repo.listLog().then((log) =>
      setErrors(
        log
          .filter((l) => !l.ok)
          .slice(0, 10)
          .map((l) => `${l.at.slice(0, 16)} ${l.provider} ${l.action}: ${String(l.detail ?? '').slice(0, 80)}`),
      ),
    );
  }, []);

  const details = attach
    ? [
        `Planora ${APP_VERSION} · ${plat}`,
        `${navigator.userAgent}`,
        `Taal/lang: ${lang} · scherm/screen: ${window.innerWidth}×${window.innerHeight}`,
        `Microsoft: ${integ.microsoft.connected ? 'on' : 'off'} · Google: ${integ.google.connected ? 'on' : 'off'} · .ics: ${integ.icsImports.length} · sync: ${syncOn ? 'on' : 'off'}`,
        ...(errors.length ? ['Fouten/errors:', ...errors] : []),
      ]
    : [];
  const input = { what, expected, steps, version: APP_VERSION, platform: plat, details };
  const ready = what.trim().length >= 5;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${REPORT_EMAIL}\n\n${buildBugReportText(input)}`);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div id="report" className="card mb-4">
      <h3 className="mb-1 flex items-center gap-2 font-semibold">
        <Icon name="alert" className="h-5 w-5" />
        {t('report.title')}
      </h3>
      <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">{t('report.intro')}</p>
      <Field label={t('report.what')}>
        <textarea className="input min-h-20" value={what} onChange={(e) => setWhat(e.target.value)} maxLength={4000} />
      </Field>
      <Field label={t('report.expected')}>
        <textarea
          className="input min-h-14"
          value={expected}
          onChange={(e) => setExpected(e.target.value)}
          maxLength={2000}
        />
      </Field>
      <Field label={t('report.steps')}>
        <textarea
          className="input min-h-14"
          value={steps}
          onChange={(e) => setSteps(e.target.value)}
          maxLength={2000}
          placeholder={t('report.stepsPlaceholder')}
        />
      </Field>
      <label className="mb-2 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={attach} onChange={(e) => setAttach(e.target.checked)} />
        {t('report.attach')}
      </label>
      {attach && (
        <details className="mb-3 text-xs">
          <summary className="cursor-pointer text-slate-500">{t('report.preview')}</summary>
          <pre className="mt-1 overflow-x-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-2 text-[11px] dark:bg-slate-800/60">
            {details.join('\n')}
          </pre>
        </details>
      )}
      <p className="mb-3 rounded-xl bg-amber-50 p-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
        {t('report.public')}
      </p>
      <div className="flex flex-wrap gap-2">
        <a
          className={`btn-primary ${ready ? '' : 'pointer-events-none opacity-50'}`}
          aria-disabled={!ready}
          href={ready ? buildBugReportUrl(input) : undefined}
          target="_blank"
          rel="noreferrer noopener"
        >
          {t('report.send')}
        </a>
        <button className="btn-secondary" disabled={!ready} onClick={copy}>
          {copied ? t('report.copied') : t('report.copy')}
        </button>
      </div>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{t('report.noGithub', { email: REPORT_EMAIL })}</p>
    </div>
  );
}
