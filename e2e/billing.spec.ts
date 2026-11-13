import { expect, test } from '@playwright/test';

const chat = (n: number) =>
  Array.from(
    { length: 40 },
    (_, i) =>
      `${1 + (i % 20)}/2/26, 10:${String(i).padStart(2, '0')} - ${['Ana', 'Beto', 'Carla'][i % 3]}: chat ${n} mensaje ${i} jajaja`,
  ).join('\n');

test('two different chats are free, then the paywall opens', async ({ page }) => {
  await page.goto('/');
  const badge = page.getByRole('button', { name: /usados/ });
  await expect(badge).toBeVisible();

  // The local server keeps counts in memory for the whole run, so start from whatever is left.
  let created = 0;
  for (let n = 1; n <= 3; n++) {
    await page.getByRole('button', { name: 'Haz tu Wrapped' }).click();
    const dialog = page.getByRole('dialog');
    // Either the upload screen or (uses exhausted) the paywall: wait for whichever appears.
    const upload = page.getByRole('heading', { name: 'Sube tu chat' });
    await expect(upload.or(dialog)).toBeVisible();
    if (await dialog.isVisible()) break;
    await page.locator('input[type=file]').setInputFiles({
      name: `chat-${Date.now()}-${n}.txt`,
      mimeType: 'text/plain',
      buffer: Buffer.from(chat(Date.now() + n)),
    });
    await page.getByRole('button', { name: 'Empezar' }).click();
    const story = page.getByRole('progressbar');
    await expect(story.or(dialog)).toBeVisible({ timeout: 20_000 });
    if (await dialog.isVisible()) break;
    created++;
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Haz tu Wrapped' })).toBeVisible();
  }

  expect(created).toBeLessThanOrEqual(2);
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading')).toContainText('Has agotado tus Wrapped gratis');
  await expect(badge).toHaveText('2 de 2 usados');

  // The payment button only works after accepting the conditions.
  const pay = dialog.getByRole('button', { name: /Ir al pago seguro/ });
  await expect(pay).toBeDisabled();
  await dialog.getByRole('checkbox').check();
  await expect(pay).toBeEnabled();

  // The demo is always free.
  await dialog.getByRole('button', { name: 'Cerrar' }).first().click();
  await page.getByRole('button', { name: 'Ver demo' }).click();
  await expect(page.getByRole('progressbar')).toBeVisible({ timeout: 20_000 });
});
