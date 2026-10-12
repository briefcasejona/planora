import { describe, expect, it } from 'vitest';
import { FIRST_REMINDER_ID, MAX_REMINDERS, planReminders, reminderId } from './reminders';
import { makeTask, seqId } from './testUtils';
import type { WorkSession } from './types';

const now = new Date(2026, 9, 12, 12, 0);

function block(taskId: string, start: Date, minutes = 45, overrides: Partial<WorkSession> = {}): WorkSession {
  return {
    id: seqId(),
    taskId,
    start: start.toISOString(),
    end: new Date(start.getTime() + minutes * 60_000).toISOString(),
    status: 'planned',
    kind: 'study',
    locked: false,
    ...overrides,
  };
}

describe('reminders', () => {
  it('reminds 10 minutes before a block and at 18:00 the day before the deadline', () => {
    const task = makeTask({ deadline: new Date(2026, 9, 15, 9, 0).toISOString() });
    const list = planReminders(now, [task], [block(task.id, new Date(2026, 9, 13, 14, 0))]);
    expect(list.map((r) => [r.kind, r.at.getDate(), r.at.getHours(), r.at.getMinutes()])).toEqual([
      ['block', 13, 13, 50],
      ['deadline', 14, 18, 0],
    ]);
  });

  it('skips blocks that are done or past, tasks that are done, and anything beyond 7 days', () => {
    const open = makeTask({ deadline: new Date(2026, 10, 30).toISOString() });
    const done = makeTask({ status: 'done', deadline: new Date(2026, 9, 14).toISOString() });
    const list = planReminders(
      now,
      [open, done],
      [
        block(open.id, new Date(2026, 9, 13, 14, 0), 45, { status: 'done' }),
        block(open.id, new Date(2026, 9, 12, 12, 5)),
        block(open.id, new Date(2026, 9, 20, 14, 0)),
        block(done.id, new Date(2026, 9, 13, 16, 0)),
      ],
    );
    expect(list).toEqual([]);
  });

  it('gives a moved block the same id, so its old reminder is replaced', () => {
    const task = makeTask();
    const b = block(task.id, new Date(2026, 9, 13, 14, 0));
    const moved = { ...b, start: new Date(2026, 9, 13, 16, 0).toISOString() };
    const [before] = planReminders(now, [task], [b]);
    const [after] = planReminders(now, [task], [moved]);
    expect(after.id).toBe(before.id);
    expect(after.at.getHours()).toBe(15);
  });

  it('uses ids that never clash with the weekly notifications', () => {
    for (const key of ['block:a', 'deadline:b', '', 'x'.repeat(500)])
      expect(reminderId(key)).toBeGreaterThanOrEqual(FIRST_REMINDER_ID);
    expect(reminderId('block:a')).not.toBe(reminderId('deadline:a'));
  });

  it('keeps at most the first 60 reminders', () => {
    const task = makeTask({ deadline: new Date(2026, 11, 1).toISOString() });
    const blocks = Array.from({ length: 80 }, (_, i) => block(task.id, new Date(2026, 9, 13, 0, i * 30)));
    const list = planReminders(now, [task], blocks);
    expect(list).toHaveLength(MAX_REMINDERS);
    expect(list[0].at < list[1].at).toBe(true);
  });
});
