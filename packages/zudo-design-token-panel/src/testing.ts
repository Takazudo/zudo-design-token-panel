/**
 * /testing sub-export — test-utility symbols for storage-key continuity tests
 * and Playwright panel-interaction helpers.
 *
 * Re-exports symbols that consumers need to write storage-key continuity and
 * manifest-ordering tests without reaching into the package's internal source
 * paths. Also exports `setPanelInputValue` for Playwright-based e2e tests that
 * need to drive the panel's numeric text inputs reliably.
 *
 * Intended for use in test files only — not for production code.
 *
 * Consumer usage:
 *   import { configurePanel, storageKey_open, ... } from '@takazudo/zudo-design-token-panel/testing';
 *   import { setPanelInputValue } from '@takazudo/zudo-design-token-panel/testing';
 */

// ---------------------------------------------------------------------------
// From src/config/panel-config.ts
// ---------------------------------------------------------------------------
export {
  configurePanel,
  storageKey_open,
  storageKey_position,
  storageKey_stateV1,
  storageKey_stateV2,
  storageKey_visible,
  __resetPanelConfigForTests,
} from './config/panel-config';
export type { PanelConfig } from './config/panel-config';

// ---------------------------------------------------------------------------
// From src/state/tweak-state.ts
// ---------------------------------------------------------------------------
export { getStorageKeyV1, getStorageKeyV2, loadPersistedState } from './state/tweak-state';
export type { ColorTweakState, StorageLike } from './state/tweak-state';

// ---------------------------------------------------------------------------
// From src/tokens/manifest.ts
// ---------------------------------------------------------------------------
export { GROUP_ORDER, FONT_GROUP_ORDER, SIZE_GROUP_ORDER, GROUP_TITLES } from './tokens/manifest';

// ---------------------------------------------------------------------------
// Playwright panel-interaction helper
// ---------------------------------------------------------------------------

/**
 * Minimal duck-type for a Playwright `Locator` — only the methods this helper calls.
 * Using an interface avoids a hard import of `@playwright/test` so the `./testing`
 * sub-export does not add Playwright as a required dependency for non-Playwright consumers.
 */
export interface PlaywrightLocatorLike {
  fill(value: string): Promise<void>;
  dispatchEvent(type: string): Promise<void>;
}

/**
 * Set a value on a panel numeric text input (`type="text"`) and trigger the
 * commit in Preact's event pipeline.
 *
 * ## Why this helper exists
 *
 * The panel's spacing/font/size tabs render their numeric editor via
 * `_generic-item-editor.tsx`, which attaches a Preact `onChange` handler to the
 * text input. Preact-compat re-maps `onChange` to the **native `input` event**
 * (not `change`) for `<input type="text">`.
 *
 * `locator.fill(value)` dispatches a native `input` event, so it **does** fire
 * Preact's `onChange` handler — including in headless Chromium. You do NOT need
 * `dispatchEvent('change')` or the native-setter trick for text inputs.
 *
 * This helper calls `fill()` and then dispatches an additional `input` event as
 * a defensive measure in case the Playwright version or the Chromium headless
 * build does not synthesize an `input` event with the expected `isTrusted=false`
 * flag that older Preact builds relied on. In practice both steps work; the
 * double-dispatch is harmless.
 *
 * ## Range sliders (`type="range"`)
 *
 * Playwright's `fill()` does NOT reliably drive `type="range"` inputs in headless
 * Chromium, because range inputs require mouse drag events to change value. To
 * test the CSS cascade effect of a slider change without interacting with the
 * slider widget, use `page.evaluate`:
 *
 * ```ts
 * await page.evaluate((cssVar, value) => {
 *   document.documentElement.style.setProperty(cssVar, value);
 * }, '--my-token', '1.5rem');
 * ```
 *
 * ## Correct usage (text input)
 *
 * ```ts
 * import { setPanelInputValue } from '@takazudo/zudo-design-token-panel/testing';
 *
 * const input = page.getByLabel('--my-token value');
 * await setPanelInputValue(input, '1.5');
 * // → commits '1.5rem' (or '1.5px' etc. depending on token unit) to the parent onChange
 * ```
 *
 * @param locator - A Playwright `Locator` pointing at the panel's `type="text"` number input.
 *   Identify it by `page.getByLabel('--my-css-var value')` (the panel renders
 *   `aria-label="{cssVar} value"` on each numeric text input).
 * @param value - The numeric string to type (e.g. `'1.5'`, `'40'`). Do NOT
 *   include the unit suffix — the panel appends the configured unit itself.
 */
export async function setPanelInputValue(
  locator: PlaywrightLocatorLike,
  value: string,
): Promise<void> {
  // fill() clears the input and types the value, dispatching a native 'input'
  // event that Preact-compat routes to the onChange handler.
  await locator.fill(value);
  // Defensive second dispatch: ensures the handler fires even if the Playwright
  // version or browser build omits the 'input' event during fill().
  // Preact-compat maps onChange → 'input'; the 'change' event is intentionally
  // NOT dispatched here because the handler only listens to 'input'.
  await locator.dispatchEvent('input');
}
