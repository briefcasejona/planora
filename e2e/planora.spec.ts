import { expect, test, type Page } from '@playwright/test';

async function onboard(page: Page) {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Welkom bij Planora' })).toBeVisible();
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Volgende' }).click();
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
  await dialog.locator('input[type="datetime-local"]').fill(`${deadline.getFullYear()}-${p(deadline.getMonth() + 1)}-${p(deadline.getDate())}T09:00`);
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

test('timetable import: lessons, tests and excursions are kept apart from study work', async ({ page }) => {
  await onboard(page);

  const p = (n: number) => String(n).padStart(2, '0');
  const stamp = (d: Date, h: number) => `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}T${p(h)}0000`;
  const day = (offset: number) => new Date(Date.now() + offset * 86400000);
  const event = (uid: string, d: Date, h: number, title: string) =>
    ['BEGIN:VEVENT', `UID:${uid}`, 'DTSTAMP:20261001T000000Z', `DTSTART:${stamp(d, h)}`, `DTEND:${stamp(d, h + 1)}`, `SUMMARY:${title}`, 'END:VEVENT'];
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:e2e',
    ...event('les', day(0), 10, 'Wiskunde'),
    ...event('toets', day(5), 10, 'Toets Biologie'),
    ...event('excursie', day(6), 10, 'Excursie Rijksmuseum'),
    'END:VCALENDAR',
  ].join('\r\n');

  await page.getByRole('link', { name: 'Instellingen' }).last().click();
  await page.getByRole('radio', { name: "Agenda's en koppelingen" }).click();
  await page.locator('input[type="file"][accept*=".ics"]').setInputFiles({ name: 'rooster.ics', mimeType: 'text/calendar', buffer: Buffer.from(ics) });
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
  for (const name of ['Les', 'Toets', 'Excursie', 'Studieblokken', 'Deadlines']) await expect(filters.getByRole('button', { name })).toBeVisible();
  // Today's lesson is in both the phone (day) and desktop (week) view.
  const lessons = page.locator('.fc-event.planora-cat-lesson');
  await expect(lessons).not.toHaveCount(0);
  await filters.getByRole('button', { name: 'Les' }).click();
  await expect(lessons).toHaveCount(0);
});

test('download page shows the right download for each device', async ({ browser }) => {
  const cases = [
    { ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0 Safari/537.36', name: 'Windows', file: 'Planora-Setup.exe' },
    { ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15', name: 'Mac', file: 'Planora-Mac-AppleSilicon.dmg' },
    { ua: 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/140.0 Mobile Safari/537.36', name: 'Android', file: 'Planora.apk' },
    { ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1', name: 'iPhone en iPad', file: null },
  ];
  for (const c of cases) {
    const context = await browser.newContext({ userAgent: c.ua, locale: 'nl-NL' });
    const page = await context.newPage();
    await page.goto('download.html');
    const main = page.locator('section[data-device]');
    await expect(main.getByRole('heading', { level: 2 })).toHaveText(c.name);
    if (c.file) await expect(main.getByRole('link').first()).toHaveAttribute('href', new RegExp('releases/latest/download/' + c.file.replace('.', '\\.') + '$'));
    else await expect(main.getByText('Zet op beginscherm')).toBeVisible();
    await expect(page.locator('details[data-device]')).toHaveCount(4);
    await context.close();
  }
});
