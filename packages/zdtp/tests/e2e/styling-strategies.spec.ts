import { expect, test } from '@playwright/test';

test('wind utilities follow authored tokens', async ({ page }) => {
  await page.goto('/');
  const card = page.locator('[data-token-card]').first();
  await expect(card).toHaveCSS('padding-top', '20px');
  await expect(card).toHaveCSS('border-top-left-radius', '12px');
  const linkage = await page.evaluate(() => {
    const probe = document.createElement('div');
    probe.className = 'p-card rounded-card bg-surface text-ink';
    document.body.append(probe);
    const style = getComputedStyle(probe);
    const root = getComputedStyle(document.documentElement);
    const ruleText = [...document.styleSheets].flatMap((sheet) => {
      try { return [...sheet.cssRules].map((rule) => rule.cssText); }
      catch { return []; }
    }).find((text) => text.includes('--zw-spacing-card')) ?? '';
    const windSpace = root.getPropertyValue('--zw-spacing-card').trim();
    const authored = root.getPropertyValue('--demo-space-card').trim();
    const padding = style.paddingTop;
    probe.remove();
    return { ruleText, windSpace, authored, padding };
  });
  expect(linkage.ruleText).toContain('var(--demo-space-card)');
  expect(linkage.windSpace).toBe(linkage.authored);
  expect(linkage.padding).toBe('20px');
  await page.evaluate(() => document.documentElement.style.setProperty('--demo-space-card', '40px'));
  await expect(card).toHaveCSS('padding-top', '40px');
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await page.reload();
  expect(requests.some((url) => url.includes('/api/dev/apply') || url.includes('127.0.0.1:246'))).toBe(false);
});

test('css modules scope component classes and follow authored tokens', async ({ page }) => {
  await page.goto('http://127.0.0.1:44341/');
  const card = page.locator('[data-token-card]').first();
  const cardTitle = card.locator('h1');
  const noteTitle = page.locator('[data-note] h2');
  const cardClass = await cardTitle.getAttribute('class');
  const noteClass = await noteTitle.getAttribute('class');
  expect(cardClass).toBeTruthy();
  expect(noteClass).toBeTruthy();
  expect(cardClass).not.toBe('title');
  expect(noteClass).not.toBe('title');
  expect(cardClass).not.toBe(noteClass);
  await expect(card).toHaveCSS('padding-top', '20px');
  const colors = await page.evaluate(() => ({
    card: getComputedStyle(document.querySelector('[data-token-card] h1')!).color,
    note: getComputedStyle(document.querySelector('[data-note] h2')!).color,
  }));
  expect(colors.card).not.toBe(colors.note);
  await page.evaluate(() => document.documentElement.style.setProperty('--demo-space-card', '40px'));
  await expect(card).toHaveCSS('padding-top', '40px');
});
