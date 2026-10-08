import { _electron as electron, expect, test } from '@playwright/test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('desktop app starts, serves the app locally with CSP, and plans a task', async () => {
  const app = await electron.launch({ args: ['.'], env: { ...process.env, PLANORA_USER_DATA: mkdtempSync(join(tmpdir(), 'planora-')) } });
  const page = await app.firstWindow();
  expect(page.url()).toBe('http://localhost:47823/');

  const headers = await page.evaluate(async () => {
    const r = await fetch('/');
    return { csp: r.headers.get('content-security-policy'), nosniff: r.headers.get('x-content-type-options') };
  });
  expect(headers.csp).toContain("frame-ancestors 'none'");
  expect(headers.nosniff).toBe('nosniff');
  expect(await page.evaluate(() => typeof window.planoraDesktop?.saveFile)).toBe('function');
  // The page has no Node.js access.
  expect(await page.evaluate(() => typeof (window as unknown as { require?: unknown }).require)).toBe('undefined');

  await expect(page.getByRole('heading', { name: 'Welkom bij Planora' })).toBeVisible();
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Volgende' }).click();
  await page.getByRole('button', { name: 'Beginnen' }).click();

  await page.getByRole('button', { name: 'Nieuwe taak' }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByPlaceholder('Bijv. Toets geschiedenis, essay Engels').fill('Werkstuk aardrijkskunde');
  await dialog.getByRole('radio', { name: 'Opdracht' }).click();
  await dialog.getByRole('button', { name: '4u' }).click();
  await dialog.getByRole('button', { name: 'Toevoegen en plannen' }).click();
  await page.getByRole('link', { name: 'Inbox' }).first().click();
  await expect(page.getByRole('heading', { name: 'Inbox' })).toBeVisible();
  await expect(page.getByRole('main').getByText('Werkstuk aardrijkskunde').first()).toBeVisible();
  await expect(page.getByText(/blokken gepland/)).toBeVisible();

  await page.getByRole('link', { name: 'Instellingen' }).first().click();
  await expect(page.getByText('Desktop-app')).toBeVisible();
  await expect(page.getByText('Planora op andere apparaten / delen')).toBeVisible();
  await app.close();
});
