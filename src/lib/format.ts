import { differenceInCalendarDays, format } from 'date-fns';
import { enGB, nl } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { formatDuration } from '../domain/time';
import type { Message, TaskType } from '../domain/types';

const TASK_TYPES: TaskType[] = ['test', 'assignment', 'project', 'task', 'grading', 'lessonprep'];

export function useFormat() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'en' ? enGB : nl;

  const date = (iso: string | Date, pattern = 'EEE d MMM') => format(new Date(iso), pattern, { locale });
  const time = (iso: string | Date) => format(new Date(iso), 'HH:mm', { locale });
  const duration = (min: number) => formatDuration(Math.round(min), t('units.hour'));

  const relativeDay = (iso: string | Date) => {
    const diff = differenceInCalendarDays(new Date(iso), new Date());
    if (diff === 0) return t('rel.today');
    if (diff === 1) return t('rel.tomorrow');
    if (diff === -1) return t('rel.yesterday');
    if (diff > 1 && diff < 7) return date(iso, 'EEEE');
    if (diff < 0) return t('rel.daysAgo', { count: -diff });
    return t('rel.inDays', { count: diff });
  };

  const label = (raw: string) => {
    if (raw.startsWith('type:')) return t('type.' + raw.slice(5));
    if ((TASK_TYPES as string[]).includes(raw)) return t('type.' + raw);
    return raw;
  };

  /** Translate a domain Message, localising known parameter kinds. */
  const msg = (m: Message) => {
    const params: Record<string, string | number> = { ...(m.params ?? {}) };
    if (typeof params.daypart === 'string') params.daypart = t('daypart.' + params.daypart);
    if (typeof params.basis === 'string') params.basis = t('basis.' + params.basis);
    if (typeof params.date === 'string') params.date = date(params.date, 'EEEE d MMMM');
    if (typeof params.label === 'string') params.label = label(params.label);
    return t(m.key, params);
  };

  return { t, locale, date, time, duration, relativeDay, msg, label, lang: i18n.language };
}
