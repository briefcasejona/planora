import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { nextOccurrence } from '../data/moments';
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

export function notificationsSupported(): boolean {
  return Capacitor.isNativePlatform() || typeof Notification !== 'undefined';
}
