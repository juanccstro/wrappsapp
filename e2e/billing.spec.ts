import { expect, test } from '@playwright/test';

const chat = (n: number) =>
  Array.from(
    { length: 40 },
    (_, i) =>
      `${1 + (i % 20)}/2/26, 10:${String(i).padStart(2, '0')} - ${['Ana', 'Beto', 'Carla'][i % 3]}: chat ${n} mensaje ${i} jajaja`,
  ).join('\n');

test('the first chat is complete; the next one has locks that open the plans', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: /desbloqueados/ })).toBeVisible();
  const lock = page.getByRole('button', { name: /Desbloquear desde/ });
  const dialog = page.getByRole('dialog');

  // The local server keeps counts for the whole run: try chats until one plays locked.
  let lockedFound = false;
  for (let n = 1; n <= 2 && !lockedFound; n++) {
    await page.getByRole('button', { name: 'Haz tu Wrapped' }).click();
    await page.locator('input[type=file]').setInputFiles({
      name: `chat-${Date.now()}-${n}.txt`,
      mimeType: 'text/plain',
      buffer: Buffer.from(chat(Date.now() + n)),
    });
    await page.getByRole('button', { name: 'Empezar' }).click();
    await expect(page.getByRole('progressbar')).toBeVisible({ timeout: 20_000 });
    for (let i = 0; i < 30 && !(await lock.isVisible()); i++) {
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(150);
    }
    lockedFound = await lock.isVisible();
    if (!lockedFound) {
      await page.keyboard.press('Escape');
      await expect(page.getByRole('button', { name: 'Haz tu Wrapped' })).toBeVisible();
    }
  }
  expect(lockedFound).toBe(true);

  // A locked slide waits instead of moving on.
  await page.waitForTimeout(1500);
  await expect(lock).toBeVisible();

  await lock.click();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading')).toContainText('Desbloquea tu Wrapped completo');
  await expect(dialog.getByRole('radio')).toHaveCount(3);
  await dialog.getByRole('radio', { name: /Este chat/ }).click();

  // The payment button only works after accepting the conditions.
  const pay = dialog.getByRole('button', { name: /Ir al pago seguro · 0,99/ });
  await expect(pay).toBeDisabled();
  await dialog.getByRole('checkbox').check();
  await expect(pay).toBeEnabled();
  await dialog.getByRole('button', { name: 'Cerrar' }).first().click();

  // The demo is always free and complete.
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Ver demo' }).click();
  await expect(page.getByRole('progressbar')).toBeVisible({ timeout: 20_000 });
});
