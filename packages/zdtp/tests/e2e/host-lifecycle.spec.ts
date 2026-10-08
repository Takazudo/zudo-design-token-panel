import { expect, test } from '@playwright/test';

for (const width of [390, 1280]) {
  for (const manifest of ['playground', 'zudo-doc']) {
    test(`${manifest} host survives repeated navigation and keyboard theme changes at ${width}px`, async ({ page }) => {
      test.setTimeout(90_000);
      await page.setViewportSize({ width, height: 900 });
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => {
        if (message.type() === 'error' && (/\[zfb\]|\[zudo-react\]|Unable to initialize the token panel/).test(message.text())) errors.push(message.text());
      });
      for (let round = 0; round < 2; round += 1) {
        for (const route of ['/', '/prose/en/', '/prose/ja-sample/']) {
          await page.goto(`${route}?manifest=${manifest}`);
          const trigger = page.getByRole('button', { name: 'Open token panel', exact: true });
          await expect(trigger).toBeVisible();
          await trigger.focus();
          await expect(trigger).toBeFocused();
          await page.keyboard.press('Enter');
          await expect(page.locator('.tokenpanel-shell')).toBeVisible();
          await expect(page.locator('.tokenpanel-shell')).toHaveCount(1);
          const theme = page.locator('.zfb-controls button').first();
          const nextTheme = (await theme.textContent())?.trim() === 'Dark mode' ? 'dark' : 'light';
          await theme.focus();
          await page.keyboard.press('Space');
          await expect(page.locator('html')).toHaveAttribute('data-theme', nextTheme);
          await expect(theme).toHaveText(nextTheme === 'dark' ? 'Light mode' : 'Dark mode');
          await expect(theme).toBeFocused();
          await expect(page.locator('.tokenpanel-shell')).toHaveCount(1);
          await expect(page.locator('.tokenpanel-shell')).toBeVisible();
          await expect(page.locator('.zfb-meta')).toContainText(manifest === 'zudo-doc' ? 'zudo-doc' : 'playground manifest');
          await trigger.focus();
          await page.keyboard.press('Space');
          await expect(page.locator('.tokenpanel-shell')).not.toBeVisible();
          expect(errors).toEqual([]);
        }
      }
    });
  }
}
