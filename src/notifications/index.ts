import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { parseISO } from 'date-fns';
import { nextOccurrence } from '../data/moments';
import { blockMinutes, FIRST_REMINDER_ID, type Reminder } from '../domain/reminders';
import { parseHM } from '../domain/time';
import type { Preferences } from '../domain/types';
import { asset } from '../lib/platform';

export interface NotificationTexts {
  planTitle: string;
  planBody: string;
  reviewTitle: string;
  reviewBody: string;
}

let webTimers: ReturnType<typeof setTimeout>[] = [];

/**
 * Weekly reminders for the Sunday plan and Saturday review. On Android/iOS
 * these are local notifications scheduled on the device itself. In a browser
 * they can only fire while Planora is open; otherwise the app shows the new
 * overview the next time it is opened.
 */
export async function scheduleWeeklyReminders(prefs: Preferences, texts: NotificationTexts): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    const perm = await LocalNotifications.requestPermissions();
    if (perm.display !== 'granted') return;
    await LocalNotifications.cancel({ notifications: [{ id: 1 }, { id: 2 }] });
    const on = (m: Preferences['weeklyPlan']) => {
      const min = parseHM(m.time);
      // Capacitor weekdays run 1 (Sunday) to 7 (Saturday).
      return { weekday: m.weekday + 1, hour: Math.floor(min / 60), minute: min % 60 };
    };
    await LocalNotifications.schedule({
      notifications: [
        {
          id: 1,
          title: texts.planTitle,
          body: texts.planBody,
          schedule: { on: on(prefs.weeklyPlan), allowWhileIdle: true },
        },
        {
          id: 2,
          title: texts.reviewTitle,
          body: texts.reviewBody,
          schedule: { on: on(prefs.weeklyReview), allowWhileIdle: true },
        },
      ],
    });
    return;
  }
  webTimers.forEach(clearTimeout);
  webTimers = [];
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  const now = new Date();
  const plan = nextOccurrence(now, prefs.weeklyPlan, 'plan');
  const review = nextOccurrence(now, prefs.weeklyReview, 'review');
  const day = 24 * 3600 * 1000;
  for (const [when, title, body] of [
    [plan, texts.planTitle, texts.planBody],
    [review, texts.reviewTitle, texts.reviewBody],
  ] as const) {
    const delay = when.getTime() - now.getTime();
    if (delay > 0 && delay < day)
      webTimers.push(setTimeout(() => new Notification(title, { body, icon: asset('icon.svg') }), delay));
  }
}

export async function requestWebNotificationPermission(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) return (await LocalNotifications.requestPermissions()).display === 'granted';
  if (typeof Notification === 'undefined') return false;
  return (await Notification.requestPermission()) === 'granted';
}

/** The device's notification permission, without asking for it. */
export async function notificationPermission(): Promise<'granted' | 'denied' | 'default' | 'unsupported'> {
  if (Capacitor.isNativePlatform()) {
    const display = (await LocalNotifications.checkPermissions()).display;
    return display === 'granted' || display === 'denied' ? display : 'default';
  }
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission;
}

export function notificationsSupported(): boolean {
  return Capacitor.isNativePlatform() || typeof Notification !== 'undefined';
}

export interface ReminderTexts {
  /** Shown instead of task names when the user chose neutral titles. */
  neutralTitle?: string;
  block(minutes: number, start: Date): string;
  deadline(deadline: Date): string;
}

let reminderTimers: ReturnType<typeof setTimeout>[] = [];

function reminderContent(r: Reminder, texts: ReminderTexts) {
  const name = r.task.subject ? `${r.task.subject}: ${r.task.title}` : r.task.title;
  return {
    title: texts.neutralTitle ?? name,
    body: r.session
      ? texts.block(blockMinutes(r.session), parseISO(r.session.start))
      : texts.deadline(parseISO(r.task.deadline)),
  };
}

/**
 * Reminders before study blocks and deadlines (see planReminders). Every call replaces the previous
 * set, so a moved, finished or deleted block loses its reminder. On Android they are scheduled on the
 * phone and fire with Planora closed; in the desktop app and in a browser only while Planora runs.
 */
export function scheduleTaskReminders(reminders: Reminder[], texts: ReminderTexts): Promise<void> {
  // One at a time: two overlapping runs could each cancel only the older set and leave a stale reminder.
  reminderQueue = reminderQueue.catch(() => undefined).then(() => replaceReminders(reminders, texts));
  return reminderQueue;
}

let reminderQueue: Promise<void> = Promise.resolve();

async function replaceReminders(reminders: Reminder[], texts: ReminderTexts): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    if ((await LocalNotifications.checkPermissions()).display !== 'granted') return;
    const pending = (await LocalNotifications.getPending()).notifications.filter((n) => n.id >= FIRST_REMINDER_ID);
    if (pending.length) await LocalNotifications.cancel({ notifications: pending.map((n) => ({ id: n.id })) });
    if (!reminders.length) return;
    await LocalNotifications.schedule({
      notifications: reminders.map((r) => ({
        id: r.id,
        ...reminderContent(r, texts),
        schedule: { at: r.at, allowWhileIdle: true },
      })),
    });
    return;
  }
  reminderTimers.forEach(clearTimeout);
  reminderTimers = [];
  if (typeof Notification === 'undefined') return;
  const day = 24 * 3600 * 1000;
  for (const r of reminders) {
    const delay = r.at.getTime() - Date.now();
    if (delay <= 0 || delay >= day) continue;
    reminderTimers.push(
      setTimeout(() => {
        if (Notification.permission !== 'granted') return;
        const { title, body } = reminderContent(r, texts);
        try {
          new Notification(title, { body, icon: asset('icon.svg'), tag: String(r.id) });
        } catch {
          // Some browsers (iPhone) only show notifications through a service worker.
        }
      }, delay),
    );
  }
}

/** Android 12+: whether reminders may fire at the exact minute (otherwise Android may delay them). */
export async function exactRemindersAllowed(): Promise<boolean> {
  if (Capacitor.getPlatform() !== 'android') return true;
  return (await LocalNotifications.checkExactNotificationSetting()).exact_alarm === 'granted';
}

export async function allowExactReminders(): Promise<boolean> {
  return (await LocalNotifications.changeExactNotificationSetting()).exact_alarm === 'granted';
}
