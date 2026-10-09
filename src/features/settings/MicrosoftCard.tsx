import { useState } from 'react';
import { Modal } from '../../components/ui';
import { repo } from '../../data/repo';
import { actions } from '../../data/store';
import { MS_REVOKE_URL, MS_SCOPES, msConfigured, msSignIn, msSignOut } from '../../integrations/microsoft/auth';
import {
  claimOutlookWriter,
  forgetMicrosoftEvents,
  microsoftToken,
  pullMicrosoftBusy,
  pushMicrosoftSessions,
  removeMicrosoftEvents,
} from '../../integrations/microsoft/sync';
import { type MicrosoftSettings, patchMicrosoft, useIntegrations } from '../../integrations/settings';
import { useFormat } from '../../lib/format';
import { Toggle } from './Toggle';

export function MicrosoftCard() {
  const { t, date } = useFormat();
  const ms = useIntegrations((s) => s.microsoft);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [removeEvents, setRemoveEvents] = useState(true);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (e) {
      setError(t('integrations.error', { msg: String((e as Error).message ?? e) }));
    } finally {
      setBusy(false);
    }
  };

  const connect = () =>
    run(async () => {
      const account = await msSignIn(MS_SCOPES.readBusy, ms.staySignedIn);
      await patchMicrosoft({ connected: true, accountLabel: account.username });
      await repo.addLog({ provider: 'microsoft', action: 'connect', count: 0, ok: true });
      await pullMicrosoftBusy(true);
    });

  /** Turning a feature on asks Microsoft for exactly that permission, nothing more. */
  const toggle = (key: keyof MicrosoftSettings, value: boolean, scopes?: readonly string[]) =>
    run(async () => {
      if (value && scopes) await microsoftToken(true, scopes, { kind: 'feature', key });
      if (key === 'writeSessions' && !value) await removeMicrosoftEvents();
      await patchMicrosoft({ [key]: value });
      if (key === 'readBusy' && !value) await actions.replaceBusySource('microsoft', []);
      if (key === 'writeSessions' && value) {
        await claimOutlookWriter();
        await pushMicrosoftSessions(true);
      }
      if (key === 'genericTitles') await pushMicrosoftSessions(true);
      const affectsBusy = key === 'showTitles' || key === 'includeTentative' || (key === 'readBusy' && value);
      if (affectsBusy) await pullMicrosoftBusy(true);
    });

  const syncNow = () =>
    run(async () => {
      await pullMicrosoftBusy(true);
      await pushMicrosoftSessions(true);
    });

  const disconnect = () =>
    run(async () => {
      if (removeEvents) await removeMicrosoftEvents().catch(() => 0);
      await forgetMicrosoftEvents();
      await msSignOut('calendar');
      await actions.replaceBusySource('microsoft', []);
      await repo.clearLog('microsoft');
      await patchMicrosoft({
        connected: false,
        accountLabel: undefined,
        lastSync: undefined,
        writeSessions: false,
        importTodo: false,
        importTeams: false,
      });
      setConfirm(false);
    });

  const confirmFooter = (
    <>
      <button className="btn-secondary" onClick={() => setConfirm(false)}>
        {t('common.cancel')}
      </button>
      <button className="btn-danger" disabled={busy} onClick={disconnect}>
        {t('integrations.disconnect')}
      </button>
    </>
  );

  return (
    <div className="card mb-4">
      <h3 className="font-semibold">{t('integrations.microsoft')}</h3>
      <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">{t('integrations.microsoftIntro')}</p>
      {!msConfigured ? (
        <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
          {t('integrations.notConfigured')}
        </p>
      ) : !ms.connected ? (
        <>
          <Toggle
            checked={ms.staySignedIn}
            onChange={(v) => patchMicrosoft({ staySignedIn: v })}
            label={t('integrations.staySignedIn')}
            description={t('integrations.staySignedInHint')}
          />
          <button className="btn-primary mt-2" onClick={connect} disabled={busy}>
            {t('integrations.connectMicrosoft')}
          </button>
          <p className="mt-2 text-xs text-slate-500">{t('integrations.connectHint')}</p>
        </>
      ) : (
        <>
          <p className="mb-2 text-sm">
            {t('integrations.connectedAs', { who: ms.accountLabel ?? '' })}
            {ms.lastSync && (
              <span className="text-slate-500">
                {' '}
                · {t('integrations.lastSync', { when: date(ms.lastSync, 'd MMM HH:mm') })}
              </span>
            )}
          </p>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            <Toggle
              checked={ms.readBusy}
              disabled={busy}
              onChange={(v) => toggle('readBusy', v, MS_SCOPES.readBusy)}
              label={t('integrations.readBusy')}
              description={t('integrations.readBusyHint')}
              scope="Calendars.Read"
            />
            <Toggle
              checked={ms.showTitles}
              disabled={busy || !ms.readBusy}
              onChange={(v) => toggle('showTitles', v)}
              label={t('integrations.showTitles')}
              description={t('integrations.showTitlesHint')}
            />
            <Toggle
              checked={ms.includeTentative}
              disabled={busy || !ms.readBusy}
              onChange={(v) => toggle('includeTentative', v)}
              label={t('integrations.tentative')}
            />
            <Toggle
              checked={ms.writeSessions}
              disabled={busy}
              onChange={(v) => toggle('writeSessions', v, MS_SCOPES.writeSessions)}
              label={t('integrations.writeSessions')}
              description={t('integrations.writeSessionsHint')}
              scope="Calendars.ReadWrite"
            />
            <Toggle
              checked={ms.genericTitles}
              disabled={busy || !ms.writeSessions}
              onChange={(v) => toggle('genericTitles', v)}
              label={t('integrations.genericTitles')}
              description={t('integrations.genericTitlesHint')}
            />
            <Toggle
              checked={ms.importTodo}
              disabled={busy}
              onChange={(v) => toggle('importTodo', v, MS_SCOPES.importTodo)}
              label={t('integrations.importTodo')}
              description={t('integrations.importHint')}
              scope="Tasks.Read"
            />
            <Toggle
              checked={ms.importTeams}
              disabled={busy}
              onChange={(v) => toggle('importTeams', v, MS_SCOPES.importTeams)}
              label={t('integrations.importTeams')}
              description={t('integrations.importTeamsHint')}
              scope="EduAssignments.ReadBasic"
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="btn-secondary" disabled={busy} onClick={syncNow}>
              {t('integrations.syncNow')}
            </button>
            <button className="btn-ghost text-rose-600" onClick={() => setConfirm(true)}>
              {t('integrations.disconnect')}
            </button>
          </div>
        </>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-rose-600">
          {error}
        </p>
      )}
      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title={t('integrations.disconnectTitle')}
        footer={confirmFooter}
      >
        <p className="mb-3 text-sm">{t('integrations.disconnectBody')}</p>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={removeEvents} onChange={(e) => setRemoveEvents(e.target.checked)} />
          {t('integrations.removeEvents')}
        </label>
        <p className="mt-3 text-xs text-slate-500">
          {t('integrations.revokeHint')}{' '}
          <a className="underline" href={MS_REVOKE_URL} target="_blank" rel="noreferrer noopener">
            {MS_REVOKE_URL}
          </a>
        </p>
      </Modal>
    </div>
  );
}
