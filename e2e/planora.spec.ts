import { expect, test, type Page } from '@playwright/test';

async function onboard(page: Page) {
  await page.goto('/');
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
