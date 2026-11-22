import { expect, type Page, test } from '@playwright/test';

async function onboard(page: Page) {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Welkom bij Planora' })).toBeVisible();
  for (let i = 0; i < 2; i++) await page.getByRole('button', { name: 'Volgende' }).click();
  await page.getByRole('button', { name: 'Beginnen' }).click();
  await expect(page.getByRole('heading', { name: /Goede(morgen|middag|navond)/ })).toBeVisible();
}

const p = (n: number) => String(n).padStart(2, '0');
const dateInput = (d: Date) => `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;

test('a project shows its timeline and can save it as an image', async ({ page }) => {
  await onboard(page);

  await page.getByRole('button', { name: 'Nieuwe taak' }).last().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByPlaceholder('Bijv. Toets geschiedenis, essay Engels').fill('Groepsproject energie');
  await dialog.getByRole('radio', { name: 'Project' }).click();
  const deadline = new Date(Date.now() + 21 * 86400000);
  await dialog.locator('input[type="datetime-local"]').fill(`${dateInput(deadline)}T09:00`);

  await dialog.getByLabel('Stap 1').fill('Bronnen zoeken');
  await dialog.getByRole('button', { name: 'Stap toevoegen' }).click();
  await dialog.getByLabel('Stap 2').fill('Verslag schrijven');
  await dialog
    .locator('input[type="date"]')
    .first()
    .fill(dateInput(new Date(Date.now() + 10 * 86400000)));
  await dialog.getByLabel('Wie').first().fill('Sanne');
  await dialog.getByRole('button', { name: 'Toevoegen en plannen' }).click();
  await expect(dialog).toBeHidden();

  await page.getByRole('link', { name: 'Inbox' }).last().click();
  await page.getByText('Groepsproject energie').click();
  const detail = page.getByRole('dialog');
  await expect(detail.getByRole('heading', { name: 'Strokenplanning' })).toBeVisible();
  const timeline = detail.getByRole('img', { name: /Groepsproject energie/ });
  await expect(timeline.getByText('Bronnen zoeken')).toBeVisible();
  await expect(timeline.getByText('Verslag schrijven')).toBeVisible();
  await expect(timeline.getByText('Sanne')).toBeVisible();

  await detail.getByRole('button', { name: 'Opslaan als afbeelding' }).click();
  await expect(detail.getByText(/kon niet worden opgeslagen/)).toBeHidden();
});
