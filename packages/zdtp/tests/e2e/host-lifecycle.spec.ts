import { expect, test, type Page } from '@playwright/test';

async function exerciseHost(page: Page, options: {
  origin: string;
  routes: string[];
  manifestQuery: string;
  meta: string;
  api: 'zdtpZudowind' | 'zdtpCssmodules';
}) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' && (/\[zfb\]|\[zudo-react\]|Unable to initialize the token panel/).test(message.text())) {
      errors.push(message.text());
    }
  });
  const openPanel = async (url: string) => {
    await page.goto(url);
    const trigger = page.getByRole('button', { name: 'Open token panel', exact: true });
    await expect(trigger).toBeVisible();
    await trigger.focus();
    await expect(trigger).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('.tokenpanel-shell')).toHaveCount(1);
    await expect(page.locator('.tokenpanel-shell')).toBeVisible();
    return trigger;
  };

  for (let round = 0; round < 2; round += 1) {
    for (const route of options.routes) {
      const trigger = await openPanel(`${options.origin}${route}${options.manifestQuery}`);
      const theme = page.locator('button', { hasText: /mode/i }).first();
      const nextTheme = (await theme.textContent())?.trim() === 'Dark mode' ? 'dark' : 'light';
      await theme.focus();
      await page.keyboard.press('Space');
      await expect(page.locator('html')).toHaveAttribute('data-theme', nextTheme);
      await expect(theme).toHaveText(nextTheme === 'dark' ? 'Light mode' : 'Dark mode');
      await expect(page.locator('.tokenpanel-shell')).toHaveCount(1);
      await expect(page.locator('[data-build-meta]')).toContainText(options.meta);
      await trigger.focus();
      await page.keyboard.press('Space');
      await expect(page.locator('.tokenpanel-shell')).toHaveCount(0);
      expect(errors).toEqual([]);
    }
  }

  await page.goto(`${options.origin}${options.routes[0]}${options.manifestQuery}`);
  await page.locator('a[href="' + options.routes[1] + '"]').first().click();
  await expect(page).toHaveURL(new RegExp(`${options.routes[1].replaceAll('/', '\\/')}`));
  await page.goBack();
  await page.goForward();
  await expect(page.locator('.tokenpanel-shell')).toHaveCount(0);
  await page.getByRole('button', { name: 'Open token panel', exact: true }).click();
  await expect(page.locator('.tokenpanel-shell')).toHaveCount(1);
  await page.goto(`${options.origin}${options.routes[0]}?panelImportDelay=1200${options.manifestQuery.replace('?', '&')}`);
  await page.locator('a[href="' + options.routes[1] + '"]').first().click();
  await page.waitForTimeout(1400);
  await page.getByRole('button', { name: 'Open token panel', exact: true }).click();
  await expect(page.locator('.tokenpanel-shell')).toHaveCount(1);
  const apiCount = await page.evaluate((name) => {
    const api = (window as unknown as Record<string, { version?: string } | undefined>)[name];
    return api && typeof api.version === 'string' ? 1 : 0;
  }, options.api);
  expect(apiCount).toBe(1);
  expect(errors).toEqual([]);
}

for (const width of [390, 1280]) {
  for (const manifest of ['wind', 'zudo-doc'] as const) {
    test(`wind ${manifest} survives navigation at ${width}px`, async ({ page, baseURL }) => {
      test.setTimeout(120_000);
      await page.setViewportSize({ width, height: 900 });
      await exerciseHost(page, {
        origin: baseURL ?? 'http://127.0.0.1:44331',
        routes: ['/', '/prose/en/', '/prose/ja-sample/'],
        manifestQuery: manifest === 'zudo-doc' ? '?manifest=zudo-doc' : '',
        meta: manifest === 'zudo-doc' ? 'zudo-doc' : 'wind manifest',
        api: 'zdtpZudowind',
      });
    });
  }

  test(`css modules host survives navigation at ${width}px`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: 900 });
    await exerciseHost(page, {
      origin: 'http://127.0.0.1:44341',
      routes: ['/', '/notes/'],
      manifestQuery: '',
      meta: 'css modules manifest',
      api: 'zdtpCssmodules',
    });
  });
}
