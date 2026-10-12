import { useRef, useState } from 'react';
import { Icon } from '../components/Icon';
import { useStore } from '../data/store';
import { deadlineKey, deadlineOf, deadlineSuggestions, guessSubject, timetableCourses } from '../domain/categories';
import { courseList } from '../domain/courses';
import { saveIntegrations, useIntegrations } from '../integrations/settings';
import { useFormat } from '../lib/format';
import { TaskForm, type TaskPrefill } from './TaskForm';

/**
 * "Set up my semester": import the timetable file, then add the deadlines found in it as tasks with one
 * tap each. Deadlines already added or hidden stay away when a newer export is imported.
 */
export function SemesterSetup() {
  const { t, date, time } = useFormat();
  const busy = useStore((s) => s.busy);
  const tasks = useStore((s) => s.tasks);
  const courses = useStore((s) => s.prefs.courses);
  const dismissed = useIntegrations((s) => s.dismissedTests);
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState('');
  const [prefill, setPrefill] = useState<TaskPrefill | null>(null);
  const found = deadlineSuggestions(busy, tasks, dismissed, new Date());
  const subjects = [...courseList(courses, tasks).map((c) => c.name), ...timetableCourses(busy)];

  const onFile = async (file: File) => {
    try {
      const { importCalendarFile } = await import('../integrations/calendarFiles');
      const count = await importCalendarFile(file.name, await file.text(), 'lecture');
      const s = useStore.getState();
      const deadlines = deadlineSuggestions(s.busy, s.tasks, useIntegrations.getState().dismissedTests, new Date());
      setMsg(t('semester.imported', { events: count, count: deadlines.length }));
    } catch {
      setMsg(t('ics.invalid'));
    }
  };

  return (
    <div className="card mb-4">
      <div className="flex flex-wrap items-center gap-2">
        <Icon name="calendar" className="h-5 w-5 text-brand-600" />
        <div className="min-w-0 flex-1">
          <p className="font-medium">{t('semester.title')}</p>
          <p className="text-sm text-slate-600 dark:text-slate-300">{t('semester.intro')}</p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".ics,text/calendar"
          className="hidden"
          aria-label={t('semester.choose')}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onFile(f);
            e.target.value = '';
          }}
        />
        <button className="btn-secondary" onClick={() => fileRef.current?.click()}>
          {t('semester.choose')}
        </button>
      </div>
      {msg && (
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300" role="status">
          {msg}
        </p>
      )}
      {found.length > 0 && (
        <>
          <p className="mt-3 text-sm font-medium">{t('semester.found', { count: found.length })}</p>
          <ul className="mt-2 space-y-2">
            {found.map((b) => {
              const due = deadlineOf(b);
              return (
                <li
                  key={deadlineKey(b)}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{b.title}</p>
                    <p className="text-xs text-slate-500">
                      {date(due)} {time(due)}
                    </p>
                  </div>
                  <button
                    className="btn-primary"
                    onClick={() =>
                      setPrefill({
                        title: b.title,
                        type: 'assignment',
                        deadline: due.toISOString(),
                        subject: b.title ? guessSubject(b.title, subjects) : undefined,
                        source: 'ics',
                        externalId: deadlineKey(b),
                      })
                    }
                  >
                    <Icon name="plus" className="h-4 w-4" />
                    {t('semester.add')}
                  </button>
                  <button
                    className="btn-ghost"
                    onClick={() =>
                      saveIntegrations({
                        dismissedTests: [...useIntegrations.getState().dismissedTests, deadlineKey(b)],
                      })
                    }
                  >
                    {t('semester.hide')}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
      {prefill && <TaskForm open initial={prefill} onClose={() => setPrefill(null)} />}
    </div>
  );
}
