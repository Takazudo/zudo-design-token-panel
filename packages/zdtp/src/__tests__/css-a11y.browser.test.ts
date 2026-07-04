// @vitest-environment browser
/**
 * CSS accessibility computed-style tests (F19, F22, #450).
 *
 * Tests that require a real browser (Playwright Chromium) for accurate CSS
 * computed-style resolution. Two areas:
 *
 *   F19: :focus-visible on native form controls — a hostile `*:focus { outline: none }`
 *        reset must not leave controls focus-invisible; the panel's class-level
 *        :focus-visible rule wins on specificity.
 *
 *   F22: ≥24×24 hit areas — icon controls and the resize grip must have an
 *        interactive area of at least 24×24px (WCAG 2.2 AA touch target floor).
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

// ---------------------------------------------------------------------------
// Test harness helpers (mirrors css-isolation.browser.test.ts)
// ---------------------------------------------------------------------------

let injectedStyles: HTMLStyleElement[] = [];
let injectedElements: Element[] = [];

function injectStyle(css: string): HTMLStyleElement {
  const el = document.createElement('style');
  el.textContent = css;
  document.head.appendChild(el);
  injectedStyles.push(el);
  return el;
}

function createElement(className: string, tag = 'div', parent?: Element): HTMLElement {
  const el = document.createElement(tag);
  el.className = className;
  (parent ?? document.body).appendChild(el);
  injectedElements.push(el);
  return el as HTMLElement;
}

// Import panel CSS as an inline string so computed styles resolve in the browser.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — ?inline is a Vite-specific query not typed in tsconfig
const panelCssModule = import('../styles/panel.css?inline');

async function injectPanelCss(): Promise<void> {
  const panelCss: string = ((await panelCssModule) as { default: string }).default;
  injectStyle(panelCss);
}

function cleanupAll(): void {
  for (const el of injectedStyles) el.remove();
  for (const el of injectedElements) el.remove();
  injectedStyles = [];
  injectedElements = [];
}

beforeEach(() => {
  injectedStyles = [];
  injectedElements = [];
  document.documentElement.style.cssText = '';
  document.body.style.cssText = '';
});

afterEach(() => {
  cleanupAll();
});

// ---------------------------------------------------------------------------
// F19 — :focus-visible on native form controls under hostile host reset
// ---------------------------------------------------------------------------

describe('F19 — native form controls keep focus indicator under hostile *:focus reset', () => {
  /**
   * Inject a hostile reset (`*:focus { outline: none }`) BEFORE the panel CSS.
   * In real deployment the panel CSS injects at runtime (AFTER host CSS), so
   * the class-level `:focus-visible` rule wins via cascade order (later wins
   * at equal specificity — class beats * in specificity, so it also wins when
   * both are present).
   */
  async function setupWithHostileReset(): Promise<void> {
    injectStyle('*:focus { outline: none; }');
    await injectPanelCss();
  }

  it('.tokenpanel-row-number-input has outline on :focus-visible despite hostile reset', async () => {
    await setupWithHostileReset();
    const shell = createElement('tokenpanel-shell');
    // Create a number input inside the shell so panel-tokens.css vars resolve
    const input = createElement('tokenpanel-row-number-input', 'input', shell) as HTMLInputElement;
    input.type = 'number';

    input.focus();
    const style = getComputedStyle(input);
    // With :focus-visible the outline-style should be 'solid' (not 'none')
    expect(style.outlineStyle).toBe('solid');
    expect(style.outlineWidth).toBe('2px');
  });

  it('.tokenpanel-row-text-input has outline on :focus-visible despite hostile reset', async () => {
    await setupWithHostileReset();
    const shell = createElement('tokenpanel-shell');
    const input = createElement('tokenpanel-row-text-input', 'input', shell) as HTMLInputElement;
    input.type = 'text';

    input.focus();
    const style = getComputedStyle(input);
    expect(style.outlineStyle).toBe('solid');
    expect(style.outlineWidth).toBe('2px');
  });

  it('.tokenpanel-row-select has outline on :focus-visible despite hostile reset', async () => {
    await setupWithHostileReset();
    const shell = createElement('tokenpanel-shell');
    const select = createElement('tokenpanel-row-select', 'select', shell);

    select.focus();
    const style = getComputedStyle(select);
    expect(style.outlineStyle).toBe('solid');
    expect(style.outlineWidth).toBe('2px');
  });

  it('.tokenpanel-color-preset-select has outline on :focus-visible despite hostile reset', async () => {
    await setupWithHostileReset();
    const shell = createElement('tokenpanel-shell');
    const select = createElement('tokenpanel-color-preset-select', 'select', shell);

    select.focus();
    const style = getComputedStyle(select);
    expect(style.outlineStyle).toBe('solid');
    expect(style.outlineWidth).toBe('2px');
  });

  it('.tokenpanel-density-slider has outline on :focus-visible despite hostile reset', async () => {
    await setupWithHostileReset();
    const shell = createElement('tokenpanel-shell');
    const input = createElement('tokenpanel-density-slider', 'input', shell) as HTMLInputElement;
    input.type = 'range';

    input.focus();
    const style = getComputedStyle(input);
    expect(style.outlineStyle).toBe('solid');
    expect(style.outlineWidth).toBe('2px');
  });

  it('.tokenpanel-highlight-settings-outline-input has outline on :focus-visible despite hostile reset', async () => {
    await setupWithHostileReset();
    const shell = createElement('tokenpanel-highlight-settings-popover');
    const input = createElement(
      'tokenpanel-highlight-settings-outline-input',
      'input',
      shell,
    ) as HTMLInputElement;
    input.type = 'number';

    input.focus();
    const style = getComputedStyle(input);
    expect(style.outlineStyle).toBe('solid');
    expect(style.outlineWidth).toBe('2px');
  });
});

// ---------------------------------------------------------------------------
// F22 — ≥24×24 hit areas for icon controls and resize grip
// ---------------------------------------------------------------------------

describe('F22 — icon controls and resize grip have ≥24×24 hit area', () => {
  /**
   * Compute the total interactive bounding size of an element including its
   * ::after pseudo-element expansion (inset: -N px). We measure the element's
   * own offsetWidth/offsetHeight and add the pseudo-element's inset expansion.
   *
   * Because pseudo-element computed sizes aren't directly exposed by
   * getComputedStyle (without a complex workaround), we check that the
   * element has position: relative and that its ::after `inset` value is set,
   * then compute the effective target size.
   */
  function effectiveHitSize(el: HTMLElement): { width: number; height: number } {
    const afterCs = getComputedStyle(el, '::after');
    const ownWidth = el.offsetWidth;
    const ownHeight = el.offsetHeight;

    // ::after inset expands all four sides by the same amount.
    // inset shorthand computed value is the top value (all sides equal).
    const insetStr = afterCs.inset ?? afterCs.top;
    // inset may be "auto" if ::after has no content; fall back to 0.
    const insetPx = insetStr && insetStr !== 'auto' ? Math.abs(parseFloat(insetStr)) : 0;

    return {
      width: ownWidth + insetPx * 2,
      height: ownHeight + insetPx * 2,
    };
  }

  it('.tokenpanel-close-btn has ≥24px effective hit width', async () => {
    await injectPanelCss();
    const shell = createElement('tokenpanel-shell');
    const btn = createElement('tokenpanel-close-btn', 'div', shell);
    // Simulate a 16×16 SVG payload
    btn.style.width = '16px';
    btn.style.height = '16px';

    const { width } = effectiveHitSize(btn);
    expect(width).toBeGreaterThanOrEqual(24);
  });

  it('.tokenpanel-close-btn has ≥24px effective hit height', async () => {
    await injectPanelCss();
    const shell = createElement('tokenpanel-shell');
    const btn = createElement('tokenpanel-close-btn', 'div', shell);
    btn.style.width = '16px';
    btn.style.height = '16px';

    const { height } = effectiveHitSize(btn);
    expect(height).toBeGreaterThanOrEqual(24);
  });

  it('.tokenpanel-gear-btn has ≥24px effective hit width', async () => {
    await injectPanelCss();
    const shell = createElement('tokenpanel-shell');
    const btn = createElement('tokenpanel-gear-btn', 'div', shell);
    btn.style.width = '14px';
    btn.style.height = '14px';

    const { width } = effectiveHitSize(btn);
    expect(width).toBeGreaterThanOrEqual(24);
  });

  it('.tokenpanel-highlight-toggle has ≥24px effective hit width', async () => {
    await injectPanelCss();
    const shell = createElement('tokenpanel-shell');
    const btn = createElement('tokenpanel-highlight-toggle', 'div', shell);

    const { width } = effectiveHitSize(btn);
    expect(width).toBeGreaterThanOrEqual(24);
  });

  it('.tokenpanel-highlight-toggle has ≥24px effective hit height', async () => {
    await injectPanelCss();
    const shell = createElement('tokenpanel-shell');
    const btn = createElement('tokenpanel-highlight-toggle', 'div', shell);

    const { height } = effectiveHitSize(btn);
    expect(height).toBeGreaterThanOrEqual(24);
  });

  it('.tokenpanel-resize-handle ::after expands to ≥24px total hit area', async () => {
    await injectPanelCss();
    // Resize handle is position:absolute in the shell; put shell in DOM
    const shell = createElement('tokenpanel-shell');
    shell.style.position = 'relative';
    shell.style.width = '300px';
    shell.style.height = '200px';
    const grip = createElement('tokenpanel-resize-handle', 'div', shell);

    const { width, height } = effectiveHitSize(grip);
    expect(width).toBeGreaterThanOrEqual(24);
    expect(height).toBeGreaterThanOrEqual(24);
  });
});
