// @vitest-environment browser

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import DesignTokenTweakPanel from '../panel';
import { getOpenKey, getPositionKey, getSizeKey, MIN_PANEL_WIDTH } from '../state/tweak-state';
import { FIXTURE_PANEL_CONFIG, flushEffects } from './_test-helpers';

// @ts-ignore — ?inline is a Vite-specific query not typed in tsconfig
const panelCssModule = import('../styles/panel.css?inline');

const TOKEN = '--spacing-hsp-lg';
const PREFIX = '--spacin';
const BEFORE_AFTER = 'default 40px → 1234.5678px';
const CFG: typeof FIXTURE_PANEL_CONFIG = {
  ...FIXTURE_PANEL_CONFIG,
  storagePrefix: 'changed-row-label-regression',
  tabs: [{
    ...FIXTURE_PANEL_CONFIG.tabs[0]!,
    tiers: [{
      id: 'raw',
      label: 'Spacing',
      // Populate enough cells for the default density to form three columns
      // at the normal first-open size on a 1440px desktop.
      items: Array.from({ length: 4 }, (_, i) => ({
        id: `spacing-${i}`,
        cssVar: i === 0 ? TOKEN : `--spacing-hsp-${i}`,
        label: i === 0 ? TOKEN : `--spacing-hsp-${i}`,
        default: '40px',
        type: { kind: 'length' as const, step: 1, unit: 'px' as const },
      })),
    }],
  }],
};

let container: HTMLDivElement;
let panelStyle: HTMLStyleElement;

function required<T extends HTMLElement>(selector: string, parent: ParentNode = container): T {
  const element = parent.querySelector<T>(selector);
  if (!element) throw new Error(`Missing ${selector}`);
  return element;
}

/** Use the rendered font, including spacing, rather than counting DOM text. */
function textWidth(element: HTMLElement, text: string): number {
  const style = getComputedStyle(element);
  const probe = document.createElement('span');
  Object.assign(probe.style, {
    position: 'fixed',
    visibility: 'hidden',
    whiteSpace: 'pre',
    font: style.font,
    letterSpacing: style.letterSpacing,
  });
  probe.textContent = text;
  document.body.appendChild(probe);
  const width = probe.getBoundingClientRect().width;
  probe.remove();
  return width;
}

function contentWidth(element: HTMLElement): number {
  const style = getComputedStyle(element);
  return element.getBoundingClientRect().width
    - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
    - parseFloat(style.borderLeftWidth) - parseFloat(style.borderRightWidth);
}

beforeEach(async () => {
  localStorage.clear();
  await page.viewport(1440, 900);
  panelStyle = document.createElement('style');
  panelStyle.textContent = ((await panelCssModule) as { default: string }).default;
  document.head.appendChild(panelStyle);
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(async () => {
  act(() => render(null, container));
  container.remove();
  panelStyle.remove();
  localStorage.clear();
  await page.viewport(1280, 800);
});

describe('changed row label allocation', () => {
  it.each([
    { name: '1440px desktop / default size and density', width: undefined, truncated: true },
    { name: '320px minimum panel', width: MIN_PANEL_WIDTH, truncated: true },
    { name: 'narrow columns in a wider panel', width: 680, truncated: true },
    { name: 'roomy single column', width: 560, truncated: false },
  ])('keeps a readable prefix, values and controls at $name', async ({ width, truncated }) => {
    localStorage.setItem(getOpenKey(CFG), '1');
    localStorage.setItem(getPositionKey(CFG), JSON.stringify({ top: 20, left: 20 }));
    if (width !== undefined) {
      localStorage.setItem(getSizeKey(CFG), JSON.stringify({ width, height: 560 }));
    }
    act(() => render(<DesignTokenTweakPanel instanceConfig={CFG} />, container));
    await flushEffects();
    await document.fonts.ready;

    const row = required('[data-testid="tier-item-spacing-0"]');
    const label = required('.tokenpanel-row-label', row);
    const originalHeight = row.getBoundingClientRect().height;
    expect(getComputedStyle(label).minWidth).toBe('0px');

    const input = required<HTMLInputElement>('.tokenpanel-row-number-input', row);
    input.value = '1234.5678';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await flushEffects();

    expect(row.classList.contains('is-changed')).toBe(true);
    // Eight prefix characters PLUS the ellipsis must fit in the actual font.
    // textContent/innerText contain clipped characters and cannot prove this.
    expect(contentWidth(label) + 0.1).toBeGreaterThanOrEqual(textWidth(label, `${PREFIX}…`));
    expect(row.getBoundingClientRect().height).toBeCloseTo(originalHeight, 1);
    expect(getComputedStyle(required('.tokenpanel-row-label', required('[data-testid="tier-item-spacing-1"]'))).minWidth)
      .toBe('0px');

    const tail = required('.tokenpanel-changed-tail', row);
    expect(tail.title).toBe(BEFORE_AFTER);
    expect(tail.textContent).toBe(BEFORE_AFTER);
    // Ellipsis must operate on inline text, not on flex children. Together
    // with real overflow and a glyph-width budget, this verifies a visible
    // truncation affordance rather than merely finding a CSS declaration.
    expect(getComputedStyle(tail).display).toBe('block');
    expect(getComputedStyle(tail).textOverflow).toBe('ellipsis');
    expect(getComputedStyle(tail).overflowX).toBe('hidden');
    expect(getComputedStyle(tail).whiteSpace).toBe('nowrap');
    for (const child of tail.children) expect(getComputedStyle(child).display).toBe('inline');
    expect(contentWidth(tail)).toBeGreaterThanOrEqual(textWidth(tail, '…'));
    if (truncated) expect(tail.scrollWidth).toBeGreaterThan(tail.clientWidth);
    else expect(contentWidth(tail) + 0.1).toBeGreaterThanOrEqual(textWidth(tail, BEFORE_AFTER));

    const head = required('.tokenpanel-row-head', row);
    const headRect = head.getBoundingClientRect();
    // Include every in-flow child: label, number/unit group, revert,
    // highlight, tail, and the flex gaps between them.
    for (const child of head.children) {
      const rect = child.getBoundingClientRect();
      expect(rect.left).toBeGreaterThanOrEqual(headRect.left - 0.5);
      expect(rect.right).toBeLessThanOrEqual(headRect.right + 0.5);
    }
    expect(required('.tokenpanel-changed-revert', row).getBoundingClientRect().width).toBe(20);
    expect(input.getBoundingClientRect().width).toBe(headRect.width <= 319 ? 56 : 80);
    expect(head.scrollWidth).toBeLessThanOrEqual(head.clientWidth + 1);
    const body = required('.tokenpanel-body');
    expect(body.scrollWidth).toBeLessThanOrEqual(body.clientWidth + 1);
    const grid = row.parentElement!;
    const firstColumnWidth = parseFloat(getComputedStyle(grid).gridTemplateColumns);
    expect(row.getBoundingClientRect().right)
      .toBeLessThanOrEqual(grid.getBoundingClientRect().left + firstColumnWidth + 0.5);
    // Unchanged siblings end with a highlight control whose ::after hit
    // area extends 4px into the section padding. It is intentional and must
    // not be confused with a row overflowing its grid track or tab body.
    const hitArea = getComputedStyle(required('.tokenpanel-highlight-toggle'), '::after');
    const hitSlop = Math.max(0, -parseFloat(hitArea.right));
    expect(grid.scrollWidth).toBeLessThanOrEqual(grid.clientWidth + Math.ceil(hitSlop));
    if (width !== undefined) {
      expect(required('.tokenpanel-shell').getBoundingClientRect().width).toBeCloseTo(width, 1);
    }
  });
});
