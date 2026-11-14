import { expect, test } from '@playwright/test';

test('the demo plays from the landing to the final card, without leaving the device', async ({
  page,
}) => {
  const problems: string[] = [];
  const foreignRequests: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(message.text());
  });
  page.on('pageerror', (error) => problems.push(error.message));
  page.on('request', (request) => {
    const url = request.url();
    if (!url.startsWith('http://localhost:4173') && !/^(data|blob):/.test(url)) {
      foreignRequests.push(url);
    }
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('El Wrapped');
  await expect(page.getByText('Tus mensajes no salen de tu dispositivo.')).toBeVisible();
  // The interface uses icons, never emojis.
  expect(await page.locator('main').innerText()).not.toMatch(/\p{Extended_Pictographic}/u);

  await page.getByRole('button', { name: 'Ver demo' }).click();

  const progress = page.getByRole('progressbar');
  await expect(progress).toBeVisible({ timeout: 20_000 });
  await expect(progress).toHaveAttribute('aria-valuenow', '1');
  // The intro title is drawn letter by letter: look it up by its accessible name.
  await expect(page.getByRole('heading', { level: 2, name: /Los del Insti/ })).toBeVisible();

  // Keyboard navigation, forwards and back.
  await page.keyboard.press('ArrowRight');
  await expect(progress).toHaveAttribute('aria-valuenow', '2');
  await page.keyboard.press('ArrowLeft');
  await expect(progress).toHaveAttribute('aria-valuenow', '1');

  // Walk to the last slide.
  const total = Number(await progress.getAttribute('aria-valuemax'));
  expect(total).toBeGreaterThanOrEqual(15);
  expect(total).toBeLessThanOrEqual(20);
  for (let i = 1; i < total; i++) await page.keyboard.press('ArrowRight');
  await expect(progress).toHaveAttribute('aria-valuenow', String(total));
  // Skipping fast never leaves old slides behind: only the last one stays on screen.
  await expect(page.locator('section')).toHaveCount(1);
  await expect(page.locator('section[aria-roledescription]')).toHaveAttribute(
    'aria-label',
    `Diapositiva ${total} de ${total}`,
  );

  await expect(page.getByRole('button', { name: '¿Cuál eres tú?' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Enviar al grupo' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Descargar imagen' })).toBeVisible();

  // The full report opens from the final card and comes back to it.
  await page.getByRole('button', { name: 'Ver todos los datos' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Todos los datos' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Ranking completo' })).toBeVisible();
  await page.getByRole('button', { name: 'Volver al resumen' }).first().click();
  await expect(progress).toHaveAttribute('aria-valuenow', String(total));

  // Replay, then leave: back on the landing with the chat gone.
  await page.getByRole('button', { name: 'Ver otra vez' }).click();
  await expect(progress).toHaveAttribute('aria-valuenow', '1');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Haz tu Wrapped' })).toBeVisible();

  expect(foreignRequests, 'no request may leave this origin').toEqual([]);
  expect(problems, 'no console errors or CSP violations').toEqual([]);
});

test('a file that is not a chat gets a friendly explanation', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Haz tu Wrapped' }).click();
  await page.locator('input[type=file]').setInputFiles({
    name: 'compra.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('Lista de la compra\n- Huevos\n- Leche\n'),
  });
  await expect(page.getByRole('alert')).toContainText('No hemos reconocido este archivo', {
    timeout: 15_000,
  });
});

test('a quiz can be answered and never holds the story', async ({ page }) => {
  const problems: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(message.text());
  });
  page.on('pageerror', (error) => problems.push(error.message));

  await page.goto('/');
  await page.getByRole('button', { name: 'Ver demo' }).click();
  const progress = page.getByRole('progressbar');
  await expect(progress).toBeVisible({ timeout: 20_000 });

  // Walk forward until the first quiz (its options are toggle buttons).
  const options = page.locator('section button[aria-pressed]');
  for (let i = 0; i < 20 && (await options.count()) === 0; i++) {
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(150);
  }
  expect(await options.count()).toBeGreaterThanOrEqual(2);
  const quizAt = Number(await progress.getAttribute('aria-valuenow'));

  // Answer with a tap, as on a phone.
  await options.first().tap();
  await expect(page.locator('section [role=status]')).not.toBeEmpty();
  await expect(progress).toHaveAttribute('aria-valuenow', String(quizAt));

  // The result stays a few seconds and the story moves on by itself…
  await expect(progress).toHaveAttribute('aria-valuenow', String(quizAt + 1), { timeout: 8_000 });

  // …and going back, a tap anywhere (even over the options) continues.
  await page.keyboard.press('ArrowLeft');
  await expect(progress).toHaveAttribute('aria-valuenow', String(quizAt));
  const size = page.viewportSize();
  if (!size) throw new Error('no viewport');
  await page.touchscreen.tap(size.width * 0.6, size.height * 0.55);
  await expect(progress).toHaveAttribute('aria-valuenow', String(quizAt + 1));

  expect(problems, 'no console errors').toEqual([]);
});
