import { actions, useStore } from '../../data/store';
import { courseList, upsertCourse } from '../../domain/courses';
import type { Course } from '../../domain/types';
import { useFormat } from '../../lib/format';

/** Term and exam dates per course. Every subject used on a task is listed as a course. */
export function CoursesCard() {
  const { t } = useFormat();
  const prefs = useStore((s) => s.prefs);
  const tasks = useStore((s) => s.tasks);
  const courses = courseList(prefs.courses, tasks);

  const change = (course: Course, patch: Partial<Course>) => {
    const next = { ...course, ...patch };
    for (const k of ['termEnd', 'examStart', 'examEnd'] as const) if (!next[k]) delete next[k];
    const latest = useStore.getState().prefs;
    void actions.savePrefs({ ...latest, courses: upsertCourse(latest.courses, next) });
  };
  const date = (course: Course, key: 'termEnd' | 'examStart' | 'examEnd', label: string) => (
    <label className="flex flex-col gap-1 text-xs text-slate-600 dark:text-slate-300">
      {label}
      <input
        className="input"
        type="date"
        value={course[key] ?? ''}
        onChange={(e) => change(course, { [key]: e.target.value })}
        aria-label={`${course.name}: ${label}`}
      />
    </label>
  );

  return (
    <div className="card mb-4">
      <h3 className="mb-1 font-semibold">{t('courses.title')}</h3>
      <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">{t('courses.intro')}</p>
      {courses.length === 0 ? (
        <p className="text-sm text-slate-500">{t('courses.empty')}</p>
      ) : (
        <ul className="space-y-3">
          {courses.map((c) => (
            <li key={c.name} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <p className="mb-2 font-medium">{c.name}</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {date(c, 'termEnd', t('courses.termEnd'))}
                {date(c, 'examStart', t('courses.examStart'))}
                {date(c, 'examEnd', t('courses.examEnd'))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
