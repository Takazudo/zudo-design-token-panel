/**
 * Routes-smoke spec for the Next.js example.
 *
 * Visits each primary route and asserts:
 *   1. The page-level heading (.nx-page-title) is visible.
 *   2. (widgets only) Each of the three tabs can be clicked and the active
 *      tab class moves to the clicked tab.
 *   3. (data only) All 5 data-component class selectors are present on the page.
 *
 * Prerequisites
 * -------------
 *  - Next dev server on port 44326 (started by the Playwright `webServer`
 *    config OR by an upstream `pnpm dev` invocation).
 *
 * Route inventory (6 routes tested):
 *   /                   → Home
 *   /prose              → Prose typography demo
 *   /components/forms   → Form controls demo
 *   /components/status  → Status badges / indicators
 *   /components/widgets → Interactive widgets (tabs assertion)
 *   /components/data    → Data components (data-component assertion)
 *
 * About (/about) is excluded per sub-issue scope — it is a view-transition
 * parity check handled separately.
 *
 * IMPORTANT: the Next.js example is served under a basePath of
 * /pj/zudo-design-token-panel/examples/next  (see next.config.ts).
 * All page.goto() calls use relative paths so Playwright prepends the
 * configured baseURL (http://localhost:44326) without the basePath;
 * instead we construct full URLs manually using the basePath constant so
 * both local runs (port 44326) and CI (BASE_URL env) work correctly.
 *
 * The Playwright baseURL for Next is the origin only; basePath is NOT
 * embedded in it (the apply-roundtrip spec already demonstrates this by
 * going to '/pj/zudo-design-token-panel/examples/next/' explicitly).
 */

import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Next.js basePath — must match next.config.ts
// reason: deploy path imposed by the monorepo host config; not discoverable from code alone
const BASE_PATH = '/pj/zudo-design-token-panel/examples/next';

/** Full URL helper: prepends the Next basePath to a local route path. */
function url(path: string): string {
  // Normalise double-slash: path may start with '/' and BASE_PATH ends without one.
  return `${BASE_PATH}${path.startsWith('/') ? path : `/${path}`}`;
}

// ---------------------------------------------------------------------------
// Route table
// ---------------------------------------------------------------------------

/**
 * Routes with a standard .nx-page-title heading.
 * Prose is handled separately because the prose route is an MDX page that
 * renders a semantic <h1> (from the '# Prose Demo' markdown heading) inside
 * the prose layout, not a .nx-page-title div.
 */
const PAGE_TITLE_ROUTES = [
  { label: 'Home',    path: '/',                      heading: /live token tweaking/i        },
  { label: 'Forms',   path: '/components/forms',      heading: /form controls/i              },
  { label: 'Status',  path: '/components/status',     heading: /status/i                     },
  { label: 'Widgets', path: '/components/widgets',    heading: /interactive widgets/i        },
  { label: 'Data',    path: '/components/data',       heading: /data.*demo|data components/i },
] as const;

// ---------------------------------------------------------------------------
// Route navigation + heading assertions
// ---------------------------------------------------------------------------

test.describe('Next.js example — routes smoke', () => {
  for (const route of PAGE_TITLE_ROUTES) {
    test(`${route.label} route: page heading is visible`, async ({ page }) => {
      await page.goto(url(route.path));
      await page.waitForLoadState('domcontentloaded');

      // .nx-page-title is the framework-prefixed heading class used across
      // all Next.js example pages (div role=heading aria-level=1).
      const heading = page.locator('.nx-page-title').first();
      await expect(heading).toBeVisible({ timeout: 10_000 });
      await expect(heading).toHaveText(route.heading);
    });
  }

  // Prose route is an MDX page with a semantic <h1> heading ('# Prose Demo')
  // inside the nx-prose layout wrapper.  No .nx-page-title div is rendered.
  test('Prose route: page h1 heading is visible', async ({ page }) => {
    await page.goto(url('/prose'));
    await page.waitForLoadState('domcontentloaded');
    // MDX '# Prose Demo' renders as an <h1> element.
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible({ timeout: 10_000 });
    await expect(heading).toHaveText(/prose/i);
  });

  // -------------------------------------------------------------------------
  // Widgets page — tab-switching assertion
  //
  // The Next.js Tabs component uses ARIA roles: role="tablist" / role="tab".
  // Each tab is a <button> with aria-selected and an .is-active modifier.
  // -------------------------------------------------------------------------

  test('Widgets route: clicking each tab moves the active class', async ({ page }) => {
    await page.goto(url('/components/widgets'));
    await page.waitForLoadState('domcontentloaded');

    // Wait for the tab list (client component — may need hydration time).
    const tablist = page.locator('[role="tablist"]').first();
    await tablist.waitFor({ state: 'visible', timeout: 10_000 });

    const tabs = tablist.locator('[role="tab"]');
    await expect(tabs).toHaveCount(3, { timeout: 5_000 });

    // Tab 0 (Overview) is active by default.
    await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true');

    // Click tab 1 (Details) and assert aria-selected moves.
    await tabs.nth(1).click();
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
    await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'false');

    // Click tab 2 (Settings) and assert aria-selected moves.
    await tabs.nth(2).click();
    await expect(tabs.nth(2)).toHaveAttribute('aria-selected', 'true');
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'false');
  });

  // -------------------------------------------------------------------------
  // Data page — 5-component presence assertion
  //
  // Each Next.js data component has a unique BEM root class:
  //   StatCard    → .nx-stat-card
  //   ProfileCard → .nx-profile-card
  //   MediaCard   → .nx-media-card
  //   AvatarRow   → .nx-avatar-row
  //   DataTable   → .nx-table
  // -------------------------------------------------------------------------

  test('Data route: all 5 data-component selectors are present', async ({ page }) => {
    await page.goto(url('/components/data'));
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('.nx-stat-card').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('.nx-profile-card').first()).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('.nx-media-card').first()).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('.nx-avatar-row').first()).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('.nx-table').first()).toBeVisible({ timeout: 5_000 });
  });
});
