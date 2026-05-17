/**
 * Routes-smoke spec for the Vite + React example.
 *
 * Visits each primary route and asserts:
 *   1. The page-level heading (.vr-page-title) is visible.
 *   2. (widgets only) Each of the three tabs can be clicked and the active
 *      tab class moves to the clicked tab.
 *   3. (data only) All 5 data-component class selectors are present on the page.
 *
 * Prerequisites
 * -------------
 *  - Vite dev server on port 44325 (started by the Playwright `webServer`
 *    config OR by an upstream `pnpm dev` invocation).
 *
 * Route inventory (7 routes tested):
 *   /                   → Home          (index.html, hash route /)
 *   /#/about            → About
 *   /#/forms            → Form controls demo
 *   /#/status           → Status badges / indicators
 *   /#/widgets          → Interactive widgets (tabs assertion)
 *   /#/data             → Data components (data-component assertion)
 *   /prose.html         → Prose typography demo (separate MPA entry)
 *
 * HashRouter routing
 * ------------------
 * The Vite + React example uses HashRouter so all React routes live under
 * `index.html` as URL fragments (#/about, #/forms, etc.).  The only exception
 * is the Prose page, which is a separate MPA entry at prose.html — NOT a
 * hash route.  Playwright's goto() with a full URL (origin + fragment) works
 * correctly; relative paths starting with '#' would fail because Playwright
 * treats them as page-relative anchors, not navigation destinations.
 *
 * We therefore build absolute URLs from the baseURL config constant.
 */

import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Vite dev server origin — matches playwright.config.ts baseURL default.
// reason: Playwright config may supply BASE_URL via env; we read it here
// so the spec works in both local and CI contexts.
const ORIGIN = process.env.BASE_URL?.replace(/\/$/, '') ?? 'http://localhost:44325';

/** Absolute URL for a hash route (e.g. '#/forms' → 'http://localhost:44325/#/forms'). */
function hashUrl(fragment: string): string {
  const frag = fragment.startsWith('#') ? fragment : `#${fragment}`;
  return `${ORIGIN}/${frag}`;
}

/** Absolute URL for the prose MPA page. */
const PROSE_URL = `${ORIGIN}/prose.html`;

// ---------------------------------------------------------------------------
// Route table
// ---------------------------------------------------------------------------

/** Hash-router routes plus the separate MPA prose page. */
const HASH_ROUTES = [
  { label: 'Home',    fragment: '#/',        heading: /live token tweaking/i        },
  { label: 'About',   fragment: '#/about',   heading: /about/i                      },
  { label: 'Forms',   fragment: '#/forms',   heading: /form controls/i              },
  { label: 'Status',  fragment: '#/status',  heading: /status/i                     },
  { label: 'Widgets', fragment: '#/widgets', heading: /interactive widgets/i        },
  { label: 'Data',    fragment: '#/data',    heading: /data.*demo|data.*media/i     },
] as const;

// ---------------------------------------------------------------------------
// Route navigation + heading assertions
// ---------------------------------------------------------------------------

test.describe('Vite + React example — routes smoke', () => {
  for (const route of HASH_ROUTES) {
    test(`${route.label} route: page heading is visible`, async ({ page }) => {
      await page.goto(hashUrl(route.fragment));
      await page.waitForLoadState('domcontentloaded');

      // .vr-page-title is the framework-prefixed heading class used across
      // all Vite + React example pages (div role=heading aria-level=1).
      const heading = page.locator('.vr-page-title').first();
      await expect(heading).toBeVisible({ timeout: 10_000 });
      await expect(heading).toHaveText(route.heading);
    });
  }

  test('Prose route (MPA page): page heading is visible', async ({ page }) => {
    // Prose is a separate HTML entry — NOT a hash route.  It has its own
    // heading class specific to the prose layout.  We look for any h1 or
    // role=heading/aria-level=1 since the prose page may use semantic markup
    // or a custom component depending on the MDX/layout setup.
    await page.goto(PROSE_URL);
    await page.waitForLoadState('domcontentloaded');

    // The prose page uses either .vr-page-title (if the shared layout applies)
    // or a semantic h1.  Accept either.
    const heading = page
      .locator('.vr-page-title, [role="heading"][aria-level="1"], h1')
      .first();
    await expect(heading).toBeVisible({ timeout: 10_000 });
  });

  // -------------------------------------------------------------------------
  // Widgets page — tab-switching assertion
  //
  // The Vite + React Tabs component uses plain <button> elements with an
  // .is-active CSS modifier.  There is no ARIA tablist because the chrome-button
  // policy was not applied to this legacy component; we locate by class only.
  // -------------------------------------------------------------------------

  test('Widgets route: clicking each tab moves the active class', async ({ page }) => {
    await page.goto(hashUrl('#/widgets'));
    await page.waitForLoadState('domcontentloaded');

    // Wait for the tabs container.
    const tabsContainer = page.locator('.vr-tabs').first();
    await tabsContainer.waitFor({ state: 'visible', timeout: 10_000 });

    const tabs = tabsContainer.locator('.vr-tabs__tab');
    await expect(tabs).toHaveCount(3, { timeout: 5_000 });

    // Tab 0 (Overview) is active by default.
    await expect(tabs.nth(0)).toHaveClass(/is-active/);

    // Click tab 1 (Details) and assert active class moves.
    await tabs.nth(1).click();
    await expect(tabs.nth(1)).toHaveClass(/is-active/);
    await expect(tabs.nth(0)).not.toHaveClass(/is-active/);

    // Click tab 2 (Settings) and assert active class moves.
    await tabs.nth(2).click();
    await expect(tabs.nth(2)).toHaveClass(/is-active/);
    await expect(tabs.nth(1)).not.toHaveClass(/is-active/);
  });

  // -------------------------------------------------------------------------
  // Data page — 5-component presence assertion
  //
  // Each Vite + React data component has a unique BEM root class:
  //   StatCard    → .vr-stat-card
  //   ProfileCard → .vr-profile-card
  //   MediaCard   → .vr-media-card
  //   AvatarRow   → .vr-avatar-row
  //   DataTable   → .vr-table
  // -------------------------------------------------------------------------

  test('Data route: all 5 data-component selectors are present', async ({ page }) => {
    await page.goto(hashUrl('#/data'));
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('.vr-stat-card').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('.vr-profile-card').first()).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('.vr-media-card').first()).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('.vr-avatar-row').first()).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('.vr-table').first()).toBeVisible({ timeout: 5_000 });
  });
});
