// @vitest-environment browser
/**
 * CSS isolation computed-style tests.
 *
 * Tests that require a real browser (Playwright Chromium) for accurate
 * CSS cascade resolution. Three areas:
 *
 *   F17: box-sizing reset — panel elements stay border-box even when the
 *        host CSS sets box-sizing: content-box on everything. In real
 *        deployment the panel CSS injects at runtime (AFTER host CSS), so
 *        tests inject host CSS first, then panel CSS.
 *
 *   F18: px-based geometry — panel spacing tokens are pixel-stable even when
 *        the host root font-size differs from 16px.
 *
 *   F21: color-scheme — panel elements report color-scheme: dark.
 *   F34: color ramp — neutral semantic roles resolve to exact painted colors.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

// ---------------------------------------------------------------------------
// Test harness helpers
// ---------------------------------------------------------------------------

let injectedStyles: HTMLStyleElement[] = [];
let injectedElements: HTMLElement[] = [];

function injectStyle(css: string): HTMLStyleElement {
  const el = document.createElement('style');
  el.textContent = css;
  document.head.appendChild(el);
  injectedStyles.push(el);
  return el;
}

function createElement(className: string, parent?: HTMLElement): HTMLDivElement {
  const el = document.createElement('div');
  el.className = className;
  (parent ?? document.body).appendChild(el);
  injectedElements.push(el);
  return el;
}

// Import the bundled panel CSS text so computed styles are resolvable.
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
  document.documentElement.style.removeProperty('font-size');
});

// ---------------------------------------------------------------------------
// F17: box-sizing reset
// ---------------------------------------------------------------------------

describe('F17 — box-sizing reset survives hostile content-box host', () => {
  it('.tokenpanel-shell itself computes border-box when host uses content-box inherit', async () => {
    // Real deployment order: host CSS first, panel CSS injected at runtime after.
    // The panel's :where() at specificity 0 beats the host's * at specificity 0
    // when the panel CSS comes LATER in the cascade.
    injectStyle('html { box-sizing: content-box; } *, *::before, *::after { box-sizing: inherit; }');
    await injectPanelCss();
    const shell = createElement('tokenpanel-shell');
    expect(getComputedStyle(shell).boxSizing).toBe('border-box');
  });

  it('.tokenpanel-shell descendant computes border-box when host uses inherit chain', async () => {
    injectStyle('html { box-sizing: content-box; } *, *::before, *::after { box-sizing: inherit; }');
    await injectPanelCss();
    const shell = createElement('tokenpanel-shell');
    const inner = createElement('tokenpanel-body', shell);
    expect(getComputedStyle(inner).boxSizing).toBe('border-box');
  });

  it('[data-design-token-panel-modal] computes border-box', async () => {
    injectStyle('html { box-sizing: content-box; } *, *::before, *::after { box-sizing: inherit; }');
    await injectPanelCss();
    const modal = document.createElement('dialog');
    modal.setAttribute('data-design-token-panel-modal', '');
    document.body.appendChild(modal);
    injectedElements.push(modal);
    expect(getComputedStyle(modal).boxSizing).toBe('border-box');
  });
});

// ---------------------------------------------------------------------------
// F18: px-based geometry — invariant across different root font-sizes
// ---------------------------------------------------------------------------

describe('F18 — px tokens are stable across host root font-sizes', () => {
  it('--tokentweak-pad-md is 12px at 16px root', async () => {
    await injectPanelCss();
    document.documentElement.style.fontSize = '16px';
    const el = createElement('tokenpanel-shell');
    const val = getComputedStyle(el).getPropertyValue('--tokentweak-pad-md').trim();
    expect(val).toBe('12px');
  });

  it('--tokentweak-pad-md is still 12px at 20px root', async () => {
    cleanupAll();
    document.documentElement.style.removeProperty('font-size');

    await injectPanelCss();
    document.documentElement.style.fontSize = '20px';
    const el = createElement('tokenpanel-shell');
    const val = getComputedStyle(el).getPropertyValue('--tokentweak-pad-md').trim();
    expect(val).toBe('12px');
  });

  it('--tokentweak-pad-md is still 12px at 62.5% root (10px base)', async () => {
    cleanupAll();
    document.documentElement.style.removeProperty('font-size');

    await injectPanelCss();
    document.documentElement.style.fontSize = '62.5%';
    const el = createElement('tokenpanel-shell');
    const val = getComputedStyle(el).getPropertyValue('--tokentweak-pad-md').trim();
    expect(val).toBe('12px');
  });
});

// ---------------------------------------------------------------------------
// F21: color-scheme declaration
// ---------------------------------------------------------------------------

describe('F21 — color-scheme: dark on panel surfaces', () => {
  it('.tokenpanel-shell computes color-scheme: dark', async () => {
    await injectPanelCss();
    const shell = createElement('tokenpanel-shell');
    expect(getComputedStyle(shell).colorScheme).toBe('dark');
  });

  it('.tokenpanel-tooltip computes color-scheme: dark', async () => {
    cleanupAll();
    await injectPanelCss();
    const tooltip = createElement('tokenpanel-tooltip');
    expect(getComputedStyle(tooltip).colorScheme).toBe('dark');
  });

  it('.tokenpanel-elpath-toast computes color-scheme: dark', async () => {
    cleanupAll();
    await injectPanelCss();
    const toast = createElement('tokenpanel-elpath-toast');
    expect(getComputedStyle(toast).colorScheme).toBe('dark');
  });
});

// ---------------------------------------------------------------------------
// F34: private neutral ramp resolution and host override precedence
// ---------------------------------------------------------------------------

describe('F34 — panel neutral color ramp', () => {
  const roleStops = {
    bg: 0,
    surface: 1,
    'code-bg': 2,
    border: 3,
    muted: 4,
    fg: 5,
    'code-fg': 6,
  } as const;

  function paintedRgba(color: string): number[] {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('2D canvas context unavailable');
    context.fillStyle = color;
    context.fillRect(0, 0, 1, 1);
    return [...context.getImageData(0, 0, 1, 1).data];
  }

  it('resolves every neutral role to its declared palette stop', async () => {
    await injectPanelCss();
    const shell = createElement('tokenpanel-shell');

    for (const [role, stop] of Object.entries(roleStops)) {
      const semanticSample = createElement('tokenpanel-color-test-sample', shell);
      semanticSample.style.color = `var(--tokentweak-color-${role})`;
      const paletteSample = createElement('tokenpanel-color-test-sample', shell);
      paletteSample.style.color = `var(--tokentweak-palette-base-${stop})`;
      expect(paintedRgba(getComputedStyle(semanticSample).color), role).toEqual(
        paintedRgba(getComputedStyle(paletteSample).color),
      );
    }
  });

  it('lets a host semantic-role assignment override the ramp alias', async () => {
    await injectPanelCss();
    injectStyle('.tokenpanel-shell { --tokentweak-color-muted: rgb(1 2 3); }');
    const shell = createElement('tokenpanel-shell');
    const sample = createElement('tokenpanel-color-test-sample', shell);
    sample.style.color = 'var(--tokentweak-color-muted)';
    expect(getComputedStyle(sample).color).toBe('rgb(1, 2, 3)');
  });
});
