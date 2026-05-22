// @vitest-environment browser
/**
 * Smoke test for vitest browser mode (Playwright Chromium).
 *
 * Verifies that getComputedStyle resolves var() correctly in the real browser
 * environment — something jsdom cannot do. Wave 2 (#269) will replace this
 * smoke test with the full findElementsUsingToken test suite migrated from
 * find-elements.legacy.test.ts.txt.
 */

import { expect, it } from 'vitest';

it('vitest browser mode resolves var() in computed style', () => {
  const style = document.createElement('style');
  style.textContent =
    ':root { --probe-smoke-color: red; } .probe-smoke { color: var(--probe-smoke-color); }';
  document.head.appendChild(style);
  const el = document.createElement('div');
  el.className = 'probe-smoke';
  document.body.appendChild(el);
  try {
    expect(getComputedStyle(el).color).toBe('rgb(255, 0, 0)');
  } finally {
    style.remove();
    el.remove();
  }
});
