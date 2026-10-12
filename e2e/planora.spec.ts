import { expect, type Page, test } from '@playwright/test';

async function onboard(page: Page) {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Welkom bij Planora' })).toBeVisible();
  for (let i = 0; i < 2; i++) await page.getByRole('button', { name: 'Volgende' }).click();
  await page.getByRole('button', { name: 'Beginnen' }).click();
  await expect(page.getByRole('heading', { name: /Goede(morgen|middag|navond)/ })).toBeVisible();
}

test('plan a test, complete it, give feedback, switch language, and never call third parties', async ({ page }) => {
  const external: string[] = [];
  page.on('request', (r) => {
    const url = new URL(r.url());
    if (!['localhost', '127.0.0.1'].includes(url.hostname) && url.protocol.startsWith('http')) external.push(r.url());
  });

  await onboard(page);

  await page.getByRole('button', { name: 'Nieuwe taak' }).last().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByPlaceholder('Bijv. Toets geschiedenis, essay Engels').fill('Toets biologie H4');
  await dialog.getByPlaceholder('Bijv. Wiskunde').fill('Biologie');
  const deadline = new Date(Date.now() + 14 * 86400000);
  const p = (n: number) => String(n).padStart(2, '0');
  await dialog
    .locator('input[type="datetime-local"]')
    .fill(`${deadline.getFullYear()}-${p(deadline.getMonth() + 1)}-${p(deadline.getDate())}T09:00`);
  await dialog.getByRole('button', { name: '4u' }).click();
  await dialog.getByRole('button', { name: 'Toevoegen en plannen' }).click();
  await expect(dialog).toBeHidden();

  await page.getByRole('link', { name: 'Inbox' }).last().click();
  await expect(page.getByText('Toets biologie H4')).toBeVisible();
  await expect(page.getByText(/blokken gepland/)).toBeVisible();

  await page.getByText('Toets biologie H4').click();
  await expect(page.getByRole('dialog').getByText(/Blokken \(\d+\)/)).toBeVisible();
  await page.getByRole('button', { name: 'Afronden' }).click();
  await expect(page.getByRole('heading', { name: /Hoe ging het/ })).toBeVisible();
  await page.getByRole('radio', { name: 'Te weinig' }).click();
  await page.getByRole('button', { name: 'Opslaan' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();

  await page.getByRole('link', { name: 'Overzicht' }).last().click();
  await page.getByRole('radio', { name: 'Terugblik' }).click();
  await expect(page.getByText('Afgerond: Toets biologie H4')).toBeVisible();

  await page.getByRole('link', { name: 'Instellingen' }).last().click();
  await page.getByRole('radio', { name: 'English' }).click();
  await page.getByRole('button', { name: 'Opslaan en opnieuw plannen' }).click();
  await expect(page.getByRole('link', { name: 'Settings' }).last()).toBeVisible();

  await page.getByRole('link', { name: 'Calendar' }).last().click();
  await expect(page.locator('.fc')).toBeVisible();

  expect(external).toEqual([]);
});

test('calendar: day, week and month can be chosen on every screen size', async ({ page }) => {
  await onboard(page);
  await page.getByRole('link', { name: 'Agenda' }).last().click();
  for (const name of ['Dag', 'Week', 'Maand']) await expect(page.getByRole('button', { name })).toBeVisible();

  await page.getByRole('button', { name: 'Week' }).click();
  const headers = page.locator('.fc-timeGridWeek-view .fc-col-header-cell');
  await expect(headers).toHaveCount(7);
  await expect(headers.first()).toHaveText(/^ma\b/);
  // The week fits on the screen: no sideways scrolling, also on a phone.
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('timetable import:lessons, tests and excursions are kept apart from study work', async ({ page }) => {
  await onboard(page);

  const p = (n: number) => String(n).padStart(2, '0');
  const stamp = (d: Date, h: number) => `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}T${p(h)}0000`;
  const day = (offset: number) => new Date(Date.now() + offset * 86400000);
  const event = (uid: string, d: Date, h: number, title: string) => [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    'DTSTAMP:20261001T000000Z',
    `DTSTART:${stamp(d, h)}`,
    `DTEND:${stamp(d, h + 1)}`,
    `SUMMARY:${title}`,
    'END:VEVENT',
  ];
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:e2e',
    ...event('les', day(0), 10, 'Wiskunde'),
    ...event('toets', day(5), 10, 'Toets Biologie'),
    ...event('excursie', day(6), 10, 'Excursie Rijksmuseum'),
    'END:VCALENDAR',
  ].join('\r\n');

  await page.getByRole('link', { name: 'Instellingen' }).last().click();
  await page.getByRole('radio', { name: "Agenda's en koppelingen" }).click();
  await page
    .locator('input[type="file"][accept*=".ics"]')
    .setInputFiles({ name: 'rooster.ics', mimeType: 'text/calendar', buffer: Buffer.from(ics) });
  await expect(page.getByText('3 afspraken geïmporteerd.')).toBeVisible();

  await page.getByRole('link', { name: 'Vandaag' }).last().click();
  await expect(page.getByRole('heading', { name: 'Rooster vandaag' })).toBeVisible();
  await expect(page.getByText('Wiskunde')).toBeVisible();
  await expect(page.getByRole('heading', { name: '1 toets in je agenda' })).toBeVisible();

  await page.getByRole('button', { name: 'Leertaak toevoegen' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByPlaceholder('Bijv. Toets geschiedenis, essay Engels')).toHaveValue('Toets Biologie');
  await expect(dialog.getByRole('radio', { name: 'Toets' })).toBeChecked();
  await expect(dialog.getByPlaceholder('Bijv. Wiskunde')).toHaveValue('Biologie');
  await dialog.getByRole('button', { name: 'Toevoegen en plannen' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('heading', { name: '1 toets in je agenda' })).toBeHidden();

  await page.getByRole('link', { name: 'Agenda' }).last().click();
  const filters = page.getByRole('group', { name: 'Tonen in agenda' });
  for (const name of ['Les', 'Toets', 'Excursie', 'Studieblokken', 'Deadlines'])
    await expect(filters.getByRole('button', { name })).toBeVisible();
  // Today's lesson is in both the phone (day) and desktop (week) view.
  const lessons = page.locator('.fc-event.planora-cat-lesson');
  await expect(lessons).not.toHaveCount(0);
  await filters.getByRole('button', { name: 'Les' }).click();
  await expect(lessons).toHaveCount(0);
});

test('download page shows the right download for each device', async ({ browser }) => {
  const cases = [
    {
      ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0 Safari/537.36',
      name: 'Windows',
      file: 'Planora-Setup.exe',
    },
    {
      ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15',
      name: 'Mac',
      file: 'Planora-Mac-AppleSilicon.dmg',
    },
    {
      ua: 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/140.0 Mobile Safari/537.36',
      name: 'Android',
      file: 'Planora.apk',
    },
    {
      ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1',
      name: 'iPhone en iPad',
      file: null,
    },
  ];
  for (const c of cases) {
    const context = await browser.newContext({ userAgent: c.ua, locale: 'nl-NL' });
    const page = await context.newPage();
    await page.goto('download.html');
    const main = page.locator('section[data-device]');
    await expect(main.getByRole('heading', { level: 2 })).toHaveText(c.name);
    if (c.file)
      await expect(main.getByRole('link').first()).toHaveAttribute(
        'href',
        new RegExp('releases/latest/download/' + c.file.replace('.', '\\.') + '$'),
      );
    else await expect(main.getByText('Zet op beginscherm')).toBeVisible();
    await expect(page.locator('details[data-device]')).toHaveCount(4);
    await context.close();
  }
});

test('about page works in Dutch and English and links to the legal pages', async ({ browser }) => {
  for (const locale of ['nl-NL', 'en-US']) {
    const nl = locale === 'nl-NL';
    const context = await browser.newContext({ locale });
    const page = await context.newPage();
    await page.goto('about.html');
    await expect(page.locator('html')).toHaveAttribute('lang', nl ? 'nl' : 'en');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      nl ? 'Zeg wat je moet doen. Planora zegt wanneer.' : "Tell Planora what's due. It tells you when to do it.",
    );
    await expect(page.getByRole('link', { name: nl ? 'Planora openen' : 'Open Planora' }).first()).toHaveAttribute(
      'href',
      './',
    );
    await page
      .locator('footer')
      .getByRole('link', { name: nl ? 'Privacyverklaring' : 'Privacy policy' })
      .click();
    await expect(page).toHaveURL(nl ? /legal\/privacy\.nl\.html$/ : /legal\/privacy\.html$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      nl ? 'Privacyverklaring — Planora' : 'Privacy policy — Planora',
    );
    await context.close();
  }
  // ?lang= overrides the browser language, so a link can be shared in one language.
  const context = await browser.newContext({ locale: 'nl-NL' });
  const page = await context.newPage();
  await page.goto('about.html?lang=en');
  await expect(page.getByRole('heading', { level: 2, name: 'How it works' })).toBeVisible();
  // The privacy link in the questions leads to the real privacy policy.
  await page.getByText('Where is my data?').click();
  await page.getByRole('link', { name: 'privacy policy', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Privacy policy — Planora');
  // Every link in the footer of the download page leads to a page that exists.
  await page.goto('download.html');
  const footerLinks = page.locator('footer a');
  await expect(footerLinks).toHaveCount(6);
  for (const href of await footerLinks.evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).href))) {
    expect((await page.request.get(href)).status(), href).toBe(200);
  }
  await expect(page.locator('footer').getByRole('link', { name: 'Privacyverklaring' })).toHaveAttribute(
    'href',
    'legal/privacy.nl.html',
  );
  await context.close();
});

test('sync is optional: the Sync tab explains it and contacts nobody until you start it', async ({ page }) => {
  const external: string[] = [];
  page.on('request', (r) => {
    const url = new URL(r.url());
    if (!['localhost', '127.0.0.1'].includes(url.hostname) && url.protocol.startsWith('http')) external.push(r.url());
  });
  await onboard(page);
  await page.getByRole('link', { name: 'Instellingen' }).last().click();
  await page.getByRole('radio', { name: 'Synchroniseren' }).click();
  await expect(page.getByRole('heading', { name: 'Synchroniseren tussen je apparaten (optioneel)' })).toBeVisible();
  await page.getByRole('link', { name: 'Vandaag' }).last().click();
  expect(external).toEqual([]);
});

test('Google Calendar: connect in a popup and show busy times (fake Google)', async ({ page, context }) => {
  // Stand-in for Google: the sign-in page sends straight back with a token, the calendar answers with one busy hour.
  await context.route('https://accounts.google.com/**', (route) => {
    const url = new URL(route.request().url());
    const back = `${url.searchParams.get('redirect_uri')}#access_token=fake-token&expires_in=3600&token_type=Bearer&state=${url.searchParams.get('state')}`;
    return route.fulfill({ status: 302, headers: { location: back } });
  });
  const start = new Date();
  start.setHours(12, 0, 0, 0);
  await context.route('https://www.googleapis.com/calendar/v3/freeBusy', (route) => {
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' };
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    const q = route.request().postDataJSON() as { timeMin: string; timeMax: string };
    // Like the real Google: long ranges in one request are refused.
    if (Date.parse(q.timeMax) - Date.parse(q.timeMin) > 60 * 86400000) {
      return route.fulfill({
        status: 400,
        contentType: 'application/json',
        headers: cors,
        body: JSON.stringify({
          error: {
            code: 400,
            message: 'The requested time range is too long.',
            errors: [{ reason: 'timeRangeTooLong' }],
          },
        }),
      });
    }
    const inRange = start >= new Date(q.timeMin) && start < new Date(q.timeMax);
    const busy = inRange
      ? [{ start: start.toISOString(), end: new Date(start.getTime() + 3600000).toISOString() }]
      : [];
    return route.fulfill({
      contentType: 'application/json',
      headers: cors,
      body: JSON.stringify({ calendars: { primary: { busy } } }),
    });
  });
  await onboard(page);
  await page.getByRole('link', { name: 'Instellingen' }).last().click();
  await page.getByRole('radio', { name: "Agenda's en koppelingen" }).click();
  await page.getByRole('button', { name: 'Koppelen met Google' }).click();
  await expect(page.getByRole('button', { name: 'Ontkoppelen' }).last()).toBeVisible();
  await expect(page.getByText(/laatst bijgewerkt/).first()).toBeVisible();
  await expect(page.getByText(/Dat lukte niet/)).toHaveCount(0);
  await page.getByRole('link', { name: 'Agenda' }).last().click();
  await expect(page.locator('.fc-event', { hasText: 'Google Agenda' }).first()).toBeAttached();
});

test('installed app: an update that is ready shows a banner and installs on click (stand-in desktop app)', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const w = window as unknown as Record<string, unknown>;
    w.planoraDesktop = {
      saveFile: async () => true,
      onOpenFile: () => undefined,
      getSettings: async () => ({ closeToTray: true, openAtLogin: false, autoUpdate: true, platform: 'win32' }),
      setSettings: async () => undefined,
      onUpdateStatus: () => undefined,
      getUpdateStatus: async () => ({ state: 'ready', kind: 'install', current: '0.3.3', version: '0.3.4' }),
      checkForUpdate: async () => ({ state: 'ready', kind: 'install', current: '0.3.3', version: '0.3.4' }),
      installUpdate: async () => {
        w.__installed = true;
        return true;
      },
    };
  });
  await onboard(page);
  await expect(page.getByText('Planora 0.3.4 is beschikbaar')).toBeVisible();
  await page.getByRole('button', { name: 'Herstarten en bijwerken' }).first().click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __installed?: boolean }).__installed)).toBe(true);
  await page.getByRole('link', { name: 'Instellingen' }).last().click();
  await expect(page.getByRole('heading', { name: 'Updates' })).toBeVisible();
  await expect(page.getByText('Automatisch op updates controleren')).toBeVisible();
});

test('report a problem: a pre-filled GitHub report with technical details, never personal data', async ({ page }) => {
  await onboard(page);
  // Reachable from Settings on every screen size (the sidebar link only exists on wide screens).
  await page.getByRole('link', { name: 'Instellingen' }).last().click();
  await page.getByRole('button', { name: 'Een probleem melden' }).click();
  await expect(page.getByRole('heading', { name: 'Een probleem melden' })).toBeVisible();
  await page.getByLabel('Wat gebeurde er?').fill('De knop Google vernieuwen doet niets');
  await page.getByLabel('Wat verwachtte je?').fill('Nieuwe bezette tijden');
  const link = page.getByRole('link', { name: 'Melden via GitHub' });
  const href = (await link.getAttribute('href'))!;
  const url = new URL(href);
  expect(url.origin + url.pathname).toBe('https://github.com/briefcasejona/planora/issues/new');
  expect(url.searchParams.get('template')).toBe('bug_report.yml');
  expect(url.searchParams.get('what')).toBe('De knop Google vernieuwen doet niets');
  expect(url.searchParams.get('platform')).toBe('Website');
  expect(url.searchParams.get('details')).toContain('Planora ');
  await page.getByLabel(/Technische details meesturen/).uncheck();
  expect(new URL((await link.getAttribute('href'))!).searchParams.has('details')).toBe(false);
});

test('first start: the app opens in the device language and says where your data lives', async ({ browser }) => {
  for (const locale of ['en-GB', 'nl-NL']) {
    const nl = locale === 'nl-NL';
    const context = await browser.newContext({ locale });
    const page = await context.newPage();
    await page.goto('./');
    await expect(page.getByRole('heading', { name: nl ? 'Welkom bij Planora' : 'Welcome to Planora' })).toBeVisible();
    for (let i = 0; i < 2; i++) await page.getByRole('button', { name: nl ? 'Volgende' : 'Next' }).click();
    await expect(page.getByText(nl ? /Raak je het kwijt/ : /If you lose it/)).toBeVisible();
    await context.close();
  }
});

test.describe(() => {
  // Let the test stand in for the server; otherwise the offline copy answers first.
  test.use({ serviceWorkers: 'block' });

  test('a page whose code was replaced by an update reloads instead of showing an empty screen', async ({ page }) => {
    await onboard(page);
    // After a new version is published, the old file for a page is gone from the server.
    let gone = 1;
    await page.route(/\/assets\/ReviewPage-[^/]*\.js$/, (route) =>
      gone-- > 0 ? route.fulfill({ status: 404, contentType: 'text/html', body: '<!doctype html>' }) : route.continue(),
    );
    await page.getByRole('link', { name: 'Overzicht' }).last().click();
    await expect(page.getByRole('radio', { name: 'Weekplanning' })).toBeVisible();

    // If it stays unavailable (e.g. offline), the menu remains and a message explains what to do.
    await page.getByRole('link', { name: 'Vandaag' }).last().click();
    await page.route(/\/assets\/CalendarPage-[^/]*\.js$/, (route) => route.abort());
    await page.evaluate(() => sessionStorage.setItem('planora-page-reload', String(Date.now())));
    await page.getByRole('link', { name: 'Agenda' }).last().click();
    await expect(page.getByText('Deze pagina kon niet worden getoond')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Vandaag' }).last()).toBeVisible();
  });
});

test('courses: a weekly reading becomes one task per week, and the exam period shows in the calendar', async ({
  page,
}) => {
  await onboard(page);
  const p = (n: number) => String(n).padStart(2, '0');
  const day = (d: Date) => `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  const first = new Date(Date.now() + 2 * 86400000);

  await page.getByRole('button', { name: 'Nieuwe taak' }).last().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByPlaceholder('Bijv. Toets geschiedenis, essay Engels').fill('Leesopdracht');
  await dialog.getByPlaceholder('Bijv. Wiskunde').fill('Statistiek');
  await dialog.locator('input[type="datetime-local"]').fill(`${day(first)}T09:00`);
  await dialog.getByLabel('Elke week herhalen').check();
  await dialog.getByLabel('Tot en met').fill(day(new Date(first.getTime() + 21 * 86400000)));
  await expect(dialog.getByText('4 weken')).toBeVisible();
  await dialog.getByRole('button', { name: 'Toevoegen en plannen' }).click();
  await expect(dialog).toBeHidden();

  await page.getByRole('link', { name: 'Inbox' }).last().click();
  await expect(page.getByText('Leesopdracht')).toHaveCount(4);
  await page.getByText('Leesopdracht').nth(1).click();
  await page.getByRole('button', { name: 'Verwijderen' }).click();
  await page.getByRole('button', { name: 'Deze en latere weken' }).click();
  await expect(page.getByText('Leesopdracht')).toHaveCount(1);

  await page.getByRole('link', { name: 'Instellingen' }).last().click();
  await page.getByLabel('Statistiek: Tentamens vanaf').fill(day(new Date()));
  await page.getByLabel('Statistiek: Tentamens tot en met').fill(day(new Date(Date.now() + 86400000)));
  await page.getByRole('link', { name: 'Agenda' }).last().click();
  await page.getByRole('button', { name: 'Maand' }).click();
  await expect(page.locator('.planora-exam-period').first()).toBeAttached();
});

test('reminders: a deadline reminder comes at 18:00 the day before, and Settings explains the browser limit', async ({
  browser,
}) => {
  const context = await browser.newContext({ locale: 'nl-NL', timezoneId: 'Europe/Amsterdam' });
  const page = await context.newPage();
  // Record notifications instead of showing them.
  await page.addInitScript(() => {
    const shown: { title: string; body?: string }[] = [];
    (window as unknown as { shown: typeof shown }).shown = shown;
    class FakeNotification {
      static permission = 'granted';
      static requestPermission = async () => 'granted';
      constructor(title: string, options?: { body?: string }) {
        shown.push({ title, body: options?.body });
      }
    }
    (window as unknown as { Notification: unknown }).Notification = FakeNotification;
  });
  await page.clock.install({ time: new Date('2026-10-13T17:00:00+02:00') });
  await onboard(page);

  await page.getByRole('button', { name: 'Nieuwe taak' }).last().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByPlaceholder('Bijv. Toets geschiedenis, essay Engels').fill('Essay inleveren');
  await dialog.getByPlaceholder('Bijv. Wiskunde').fill('Filosofie');
  await dialog.locator('input[type="datetime-local"]').fill('2026-10-14T09:00');
  await dialog.getByRole('button', { name: 'Toevoegen en plannen' }).click();
  await expect(dialog).toBeHidden();

  await page.clock.runFor('01:05:00');
  const shown = await page.evaluate(() => (window as unknown as { shown: { title: string; body?: string }[] }).shown);
  expect(shown).toContainEqual({ title: 'Filosofie: Essay inleveren', body: 'Deadline morgen om 09:00' });

  await page.getByRole('link', { name: 'Instellingen' }).last().click();
  await expect(page.getByRole('switch', { name: /Herinneringen/ })).toBeChecked();
  await expect(
    page.getByText('In een browser en op iPhone komen herinneringen alleen als Planora open is.'),
  ).toBeVisible();
  await page.getByRole('switch', { name: /Herinneringen/ }).click();
  await expect(page.getByRole('switch', { name: /Herinneringen/ })).not.toBeChecked();
  await context.close();
});

test('semester setup: deadlines in a timetable become tasks, and importing it again adds nothing new', async ({
  page,
}) => {
  await onboard(page);

  const p = (n: number) => String(n).padStart(2, '0');
  const ymd = (d: Date) => `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
  const day = (offset: number) => new Date(Date.now() + offset * 86400000);
  const timed = (uid: string, offset: number, hm: string, title: string) => [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    'DTSTAMP:20261001T000000Z',
    `DTSTART:${ymd(day(offset))}T${hm}00`,
    `DTEND:${ymd(day(offset))}T${hm}00`,
    `SUMMARY:${title}`,
    'END:VEVENT',
  ];
  const allDay = (uid: string, offset: number, title: string) => [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    'DTSTAMP:20261001T000000Z',
    `DTSTART;VALUE=DATE:${ymd(day(offset))}`,
    `DTEND;VALUE=DATE:${ymd(day(offset + 1))}`,
    `SUMMARY:${title}`,
    'END:VEVENT',
  ];
  const lecture = (uid: string, offset: number, title: string) => [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    'DTSTAMP:20261001T000000Z',
    `DTSTART:${ymd(day(offset))}T110000`,
    `DTEND:${ymd(day(offset))}T130000`,
    `SUMMARY:${title}`,
    'END:VEVENT',
  ];
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:e2e',
    ...lecture('hc1', 2, 'Hoorcollege Statistiek'),
    ...lecture('wc1', 3, 'Werkcollege Filosofie'),
    ...lecture('pr1', 4, 'Practicum Biologie'),
    ...timed('d1', 9, '2359', 'Deadline essay Filosofie'),
    ...timed('d2', 12, '1700', 'Inleveren verslag Biologie'),
    ...allDay('d3', 15, 'Statistiek opdracht 2 due'),
    ...allDay('vak', 20, 'Herfstvakantie'),
    'END:VCALENDAR',
  ].join('\r\n');
  const importFile = () =>
    page
      .getByLabel('Roosterbestand kiezen')
      .setInputFiles({ name: 'mytimetable.ics', mimeType: 'text/calendar', buffer: Buffer.from(ics) });

  await page.getByRole('link', { name: 'Inbox' }).last().click();
  await expect(page.getByText('Mijn semester instellen')).toBeVisible();
  await importFile();
  await expect(page.getByText('7 afspraken geïmporteerd, 3 deadlines om toe te voegen.')).toBeVisible();
  await expect(page.getByText('3 deadlines gevonden')).toBeVisible();
  for (const title of ['Deadline essay Filosofie', 'Inleveren verslag Biologie', 'Statistiek opdracht 2 due'])
    await expect(page.getByText(title)).toBeVisible();
  await expect(page.getByText('Herfstvakantie')).toBeHidden();

  await page.getByRole('button', { name: 'Als taak toevoegen' }).first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByPlaceholder('Bijv. Toets geschiedenis, essay Engels')).toHaveValue(
    'Deadline essay Filosofie',
  );
  await expect(dialog.getByPlaceholder('Bijv. Wiskunde')).toHaveValue('Filosofie');
  await expect(dialog.getByRole('radio', { name: 'Opdracht' })).toBeChecked();
  await dialog.getByRole('button', { name: 'Toevoegen en plannen' }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole('button', { name: 'Verbergen' }).first().click();
  await expect(page.getByText('1 deadline gevonden')).toBeVisible();

  await importFile();
  await expect(page.getByText('7 afspraken geïmporteerd, 1 deadline om toe te voegen.')).toBeVisible();
  await expect(page.getByText('1 deadline gevonden')).toBeVisible();
  await expect(page.getByText('Statistiek opdracht 2 due')).toBeVisible();
});
