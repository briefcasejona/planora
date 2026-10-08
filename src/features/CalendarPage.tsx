import { useMemo, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import nlLocale from '@fullcalendar/core/locales/nl';
import enLocale from '@fullcalendar/core/locales/en-gb';
import type { DateSelectArg, EventClickArg, EventDropArg, EventInput } from '@fullcalendar/core';
import type { EventResizeDoneArg } from '@fullcalendar/interaction';
import { addDays } from 'date-fns';
import { actions, useStore } from '../data/store';
import { expandBusy } from '../domain/busy';
import type { BusyBlock } from '../domain/types';
import { useFormat } from '../lib/format';
import { TYPE_HEX } from '../components/ui';
import { BusyDialog } from './BusyDialog';
import { SessionDialog } from './SessionDialog';
import { TaskDetail } from './TaskDetail';

type Dialog =
  | { kind: 'newBusy'; start: Date; end: Date }
  | { kind: 'busy'; block: BusyBlock }
  | { kind: 'session'; id: string }
  | { kind: 'task'; id: string }
  | null;

export function CalendarPage() {
  const { t, lang } = useFormat();
  const { tasks, sessions, busy } = useStore();
  const [dialog, setDialog] = useState<Dialog>(null);
  const narrow = typeof window !== 'undefined' && window.innerWidth < 640;

  const events = useMemo<EventInput[]>(() => {
    const byId = new Map(tasks.map((x) => [x.id, x]));
    const now = new Date();
    const out: EventInput[] = [];
    for (const s of sessions) {
      const task = byId.get(s.taskId);
      if (!task || s.status === 'skipped') continue;
      const step = task.steps?.find((x) => x.id === s.stepId);
      const color = TYPE_HEX[task.type];
      out.push({
        id: 's:' + s.id,
        title: task.title + (step ? ' · ' + step.title : '') + (s.kind === 'review' ? ' (' + t('kind.review') + ')' : ''),
        start: s.start,
        end: s.end,
        backgroundColor: s.status === 'missed' ? 'transparent' : color,
        borderColor: color,
        textColor: s.status === 'missed' ? color : '#fff',
        editable: s.status === 'planned' && new Date(s.start) > now,
        classNames: [s.locked ? 'planora-locked' : '', s.status === 'done' ? 'opacity-60' : '', s.status === 'missed' ? 'line-through' : ''],
      });
    }
    for (const x of expandBusy(busy, addDays(now, -90), addDays(now, 240))) {
      const local = x.block.source === 'local';
      out.push({
        id: 'b:' + x.block.id + ':' + x.start.getTime(),
        title: x.block.title ?? t('calendar.busy') + (local ? '' : ' (' + t('source.' + x.block.source) + ')'),
        start: x.start,
        end: x.end,
        allDay: x.block.allDay,
        backgroundColor: local ? '#94a3b8' : '#cbd5e1',
        borderColor: '#94a3b8',
        textColor: '#0f172a',
        editable: local && !x.block.repeatWeekdays?.length,
        extendedProps: { blockId: x.block.id },
      });
    }
    for (const task of tasks) {
      if (task.status !== 'open' && task.status !== 'overdue') continue;
      out.push({ id: 'd:' + task.id, title: '⏰ ' + task.title, start: task.deadline, allDay: true, backgroundColor: '#fee2e2', borderColor: '#f87171', textColor: '#991b1b', editable: false });
    }
    return out;
  }, [tasks, sessions, busy, t]);

  const findBlock = (id: string) => busy.find((b) => b.id === id);

  const onClick = (arg: EventClickArg) => {
    const [kind, id] = arg.event.id.split(':');
    if (kind === 's') setDialog({ kind: 'session', id });
    else if (kind === 'd') setDialog({ kind: 'task', id });
    else {
      const block = findBlock(arg.event.extendedProps.blockId as string);
      if (block?.source === 'local') setDialog({ kind: 'busy', block });
    }
  };

  const onMove = (arg: EventDropArg | EventResizeDoneArg) => {
    const [kind, id] = arg.event.id.split(':');
    const start = arg.event.start;
    const end = arg.event.end;
    if (!start || !end) return arg.revert();
    if (kind === 's') void actions.moveSession(id, start, end);
    else if (kind === 'b') {
      const block = findBlock(arg.event.extendedProps.blockId as string);
      if (!block) return arg.revert();
      void actions.saveBusy([{ ...block, start: start.toISOString(), end: end.toISOString() }]);
    } else arg.revert();
  };

  const onSelect = (arg: DateSelectArg) => {
    setDialog({ kind: 'newBusy', start: arg.start, end: arg.end });
    arg.view.calendar.unselect();
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{t('nav.calendar')}</h1>
        <button className="btn-secondary" onClick={() => setDialog({ kind: 'newBusy', start: new Date(), end: new Date(Date.now() + 3600000) })}>
          {t('calendar.addEvent')}
        </button>
      </div>
      <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">{t('calendar.hint')}</p>
      <div className="card p-2 sm:p-4">
        <FullCalendar
          plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
          initialView={narrow ? 'timeGridDay' : 'timeGridWeek'}
          headerToolbar={{ left: 'prev,next today', center: 'title', right: narrow ? 'timeGridDay,dayGridMonth' : 'timeGridDay,timeGridWeek,dayGridMonth' }}
          locales={[nlLocale, enLocale]}
          locale={lang === 'en' ? 'en-gb' : 'nl'}
          firstDay={1}
          nowIndicator
          selectable
          selectMirror
          editable
          eventDurationEditable
          snapDuration="00:15"
          slotMinTime="06:00"
          slotMaxTime="24:00"
          scrollTime="15:00"
          height="72vh"
          events={events}
          eventClick={onClick}
          eventDrop={onMove}
          eventResize={onMove}
          select={onSelect}
        />
      </div>
      {dialog?.kind === 'newBusy' && <BusyDialog start={dialog.start} end={dialog.end} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'busy' && <BusyDialog block={dialog.block} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'session' && <SessionDialog sessionId={dialog.id} onClose={() => setDialog(null)} onOpenTask={(id) => setDialog({ kind: 'task', id })} />}
      {dialog?.kind === 'task' && <TaskDetail taskId={dialog.id} onClose={() => setDialog(null)} />}
    </div>
  );
}
