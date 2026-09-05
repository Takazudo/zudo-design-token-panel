/**
 * Container-query responsive header + tabs (#518).
 *
 * Real Chromium (vitest browser project) so `@container` queries actually
 * evaluate against the shell's real computed layout — jsdom has no layout
 * engine and cannot exercise this. The panel's bundled CSS is injected via
 * the `?inline` import (mirrors hostile-host-isolation.browser.test.tsx);
 * the real `DesignTokenTweakPanel` component is mounted with a seeded
 * `SIZE_KEY` (mirrors panel-shell-drag.browser.test.tsx) so the shell lays
 * out at a deterministic px width without a real resize-drag gesture.
 *
 * Covers:
 *   - >1135px content width: header action links visible, kebab hidden.
 *   - ≤1135px: header action links hidden, kebab visible; kebab opens a
 *     popover with all 4 actions; an action both fires (opens its modal)
 *     and closes the popover; Escape and outside-click also close it.
 *   - <480px: density, Ghost when idle, and Changed only move into the
 *     compact menu so the tab strip retains usable width.
 *   - 320px and 440px right docks: both chrome rows remain contained while
 *     the resize grip and compact popover remain functional.
 *   - 320px and 440px right docks: a long real token label stays fully visible
 *     in compact cards (and remains truncatable/tooltip-anchored in roomy
 *     cards) while the tab strip overflows and the private chrome color roles
 *     paint the shell, overflow trigger, and tooltip together.
 *   - Tabs strip: `.has-overflow` (right-edge fade hint) appears only while
 *     the strip actually has scrollable overflow, and clears once scrolled
 *     to the end.
 *
 * The `<300px` narrow-slider breakpoint is NOT exercised here: `loadSize`
 * clamps every stored width through `clampSize`, whose floor is
 * `MIN_PANEL_WIDTH` (320px) — a container width below 300px cannot occur via
 * any code path in this app today. The rule is defensive/forward-looking
 * (matches the fix4 prototype spec) rather than reachable, so there is
 * nothing to assert against.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import DesignTokenTweakPanel from '../panel';
import {
  getDockKey,
  getDockSizeKey,
  getDensityKey,
  getOpenKey,
  getPositionKey,
  getSizeKey,
} from '../state/tweak-state';
import { FIXTURE_PANEL_CONFIG, flushEffects } from './_test-helpers';
import type { TabConfig } from '../tokens/tier-model';
import { zudoDocConfigs } from '../../../../playground/config/zudo-doc-manifest.generated';
import { SCHEMA_V2 } from '../utils/design-token-serde';
import { DOM_TWEAKER_PORTAL_MOUNT_ID } from '../highlight/find-elements';

// ---------------------------------------------------------------------------
// Panel CSS — injected as a real <style> tag so `@container` rules and the
// `--tokentweak-*` custom properties actually resolve (mirrors
// hostile-host-isolation.browser.test.tsx's `?inline` pattern).
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — ?inline is a Vite-specific query not typed in tsconfig
const panelCssModule = import('../styles/panel.css?inline');

let injectedStyles: HTMLStyleElement[] = [];

async function injectPanelCss(): Promise<void> {
  const panelCss: string = ((await panelCssModule) as { default: string }).default;
  const el = document.createElement('style');
  el.textContent = panelCss;
  document.head.appendChild(el);
  injectedStyles.push(el);
}

// ---------------------------------------------------------------------------
// Fixture — many short tabs, used only by the tabs-overflow describe block
// below to force the strip past its container width. Non-reserved ids
// dispatch to GenericTab; tab BODY content is irrelevant to this file, only
// the tablist strip's own layout is under test.
// ---------------------------------------------------------------------------

const MANY_TABS: readonly TabConfig[] = Array.from({ length: 12 }, (_, i) => ({
  id: `extra-${i}`,
  label: `Category ${i + 1}`,
  tiers: [
    {
      id: 'raw',
      label: `Category ${i + 1}`,
      items: [
        {
          id: `item-${i}`,
          cssVar: `--fixture-extra-${i}`,
          label: `Item ${i}`,
          default: '4px',
          type: { kind: 'length' as const, step: 1, unit: 'px' as const },
        },
      ],
    },
  ],
}));

const CFG = FIXTURE_PANEL_CONFIG;

const CONFIRMATION_TOKEN = '--confirm-panel-token-with-a-long-visible-name';

/**
 * Real-panel fixture for the combined narrow-dock interaction. The first
 * spacing row is deliberately long enough to exercise compact-card wrapping
 * at 320px and roomy-card truncation at 440px; the extra tabs keep the
 * category strip in its overflow state at either width so the tooltip and
 * chrome colors are exercised in the same layout.
 */
const COMBINED_CFG: typeof FIXTURE_PANEL_CONFIG = {
  ...CFG,
  storagePrefix: 'zudo-design-token-panel-confirmation',
  tabs: [
    {
      ...CFG.tabs[0]!,
      tiers: CFG.tabs[0]!.tiers.map((tier, tierIndex) => tierIndex === 0
        ? {
            ...tier,
            items: tier.items.map((item, itemIndex) => itemIndex === 0
              ? { ...item, cssVar: CONFIRMATION_TOKEN, label: CONFIRMATION_TOKEN }
              : item),
          }
        : tier),
    },
    ...CFG.tabs.slice(1),
    ...MANY_TABS,
  ],
};

// Kept near the top-left so the shell (any of the widths under test) stays
// fully on-screen in a headless Chromium viewport.
const SEED_POSITION = { top: 20, left: 20 };

let container: HTMLDivElement;

/** Seed localStorage + mount the real panel open at `width`, then settle. */
async function mountPanelAtWidth(
  width: number,
  cfg: typeof FIXTURE_PANEL_CONFIG = CFG,
): Promise<void> {
  localStorage.setItem(getOpenKey(cfg), '1');
  localStorage.setItem(getPositionKey(cfg), JSON.stringify(SEED_POSITION));
  localStorage.setItem(getSizeKey(cfg), JSON.stringify({ width, height: 400 }));

  container = document.createElement('div');
  document.body.appendChild(container);

  act(() => {
    render(<DesignTokenTweakPanel instanceConfig={cfg} />, container);
  });
  await flushEffects();
}

async function mountPanelDockedRight(
  width: number,
  cfg: typeof FIXTURE_PANEL_CONFIG = CFG,
): Promise<void> {
  localStorage.setItem(getOpenKey(cfg), '1');
  localStorage.setItem(getDockKey(cfg), 'right');
  localStorage.setItem(
    getDockSizeKey(cfg),
    JSON.stringify({ right: width, bottom: 340 }),
  );

  container = document.createElement('div');
  document.body.appendChild(container);

  act(() => {
    render(<DesignTokenTweakPanel instanceConfig={cfg} />, container);
  });
  await flushEffects();
}

function getVisibleTextExtent(label: HTMLElement): {
  left: number;
  right: number;
  rawRight: number;
} {
  const textNode = Array.from(label.childNodes).find(
    (node): node is Text => node.nodeType === 3,
  );
  if (!textNode) throw new Error('TokenLabel text node not found');

  const range = document.createRange();
  range.selectNodeContents(textNode);
  const textRect = range.getBoundingClientRect();
  const labelRect = label.getBoundingClientRect();
  const clientLeft = labelRect.left + label.clientLeft;
  const clientRight = clientLeft + label.clientWidth;
  return {
    left: Math.max(textRect.left, clientLeft),
    right: Math.min(textRect.right, clientRight),
    rawRight: textRect.right,
  };
}

/**
 * Compact card labels wrap after the #788 card-fit change instead of being
 * clipped and recovered by a tooltip. Measure every rendered text line so the
 * assertion proves that the complete expected label is inside the label's
 * content box, rather than merely checking the element's own dimensions.
 */
function getCompleteTextExtent(label: HTMLElement, expected: string): {
  left: number;
  right: number;
  rawRight: number;
} {
  expect(label.textContent).toBe(expected);

  const textNodes: Text[] = [];
  const walker = document.createTreeWalker(label, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    if (node.textContent?.trim()) textNodes.push(node as Text);
  }
  expect(textNodes.length).toBeGreaterThan(0);
  expect(textNodes.map((textNode) => textNode.textContent ?? '').join('')).toBe(expected);

  const labelRect = label.getBoundingClientRect();
  const style = getComputedStyle(label);
  const content = {
    left: labelRect.left + parseFloat(style.borderLeftWidth) + parseFloat(style.paddingLeft),
    right: labelRect.right - parseFloat(style.borderRightWidth) - parseFloat(style.paddingRight),
    top: labelRect.top + parseFloat(style.borderTopWidth) + parseFloat(style.paddingTop),
    bottom: labelRect.bottom - parseFloat(style.borderBottomWidth) - parseFloat(style.paddingBottom),
  };
  const rects = textNodes.flatMap((textNode) => {
    const range = document.createRange();
    range.selectNodeContents(textNode);
    return Array.from(range.getClientRects()).filter((rect) => rect.width > 0 && rect.height > 0);
  });
  expect(rects.length).toBeGreaterThan(0);
  for (const rect of rects) {
    expect(rect.left).toBeGreaterThanOrEqual(content.left - 0.6);
    expect(rect.right).toBeLessThanOrEqual(content.right + 0.6);
    expect(rect.top).toBeGreaterThanOrEqual(content.top - 0.6);
    expect(rect.bottom).toBeLessThanOrEqual(content.bottom + 0.6);
  }

  return {
    left: Math.min(...rects.map((rect) => rect.left)),
    right: Math.max(...rects.map((rect) => rect.right)),
    rawRight: Math.max(...rects.map((rect) => rect.right)),
  };
}

function getShell(): HTMLElement {
  const el = container.querySelector<HTMLElement>('.tokenpanel-shell');
  if (!el) throw new Error('.tokenpanel-shell not found — is the panel open?');
  return el;
}

function getKebabTrigger(): HTMLElement {
  const el = container.querySelector<HTMLElement>('.tokenpanel-actions-menu-btn');
  if (!el) throw new Error('.tokenpanel-actions-menu-btn not found');
  return el;
}

function getPopover(): HTMLElement | null {
  return container.querySelector<HTMLElement>('.tokenpanel-actions-popover');
}

function getHeaderActionLinks(): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>('.tokenpanel-header > .tokenpanel-action-link'));
}

function getPopoverActionByLabel(label: string): HTMLElement {
  const popover = getPopover();
  if (!popover) throw new Error('popover is not open');
  const match = Array.from(popover.querySelectorAll<HTMLElement>('.tokenpanel-action-link')).find(
    (el) => el.textContent === label,
  );
  if (!match) throw new Error(`popover action "${label}" not found`);
  return match;
}

function expectInlineDockGeometry(): void {
  const shellRect = getShell().getBoundingClientRect();
  const controls = Array.from(container.querySelectorAll<HTMLElement>(
    '.tokenpanel-header > .tokenpanel-dock-modes .tokenpanel-dock-mode',
  ));
  expect(controls).toHaveLength(4);
  const chrome = ['.tokenpanel-gear-btn', '.tokenpanel-close-btn'];
  if (getComputedStyle(getKebabTrigger()).display !== 'none') chrome.push('.tokenpanel-actions-menu-btn');
  const targets = [...controls, ...chrome.map((selector) => {
    const el = container.querySelector<HTMLElement>(selector);
    if (!el) throw new Error(`${selector} not found`);
    return el;
  })];
  for (const target of targets) {
    const rect = target.getBoundingClientRect();
    if (controls.includes(target)) {
      expect(rect.width).toBeGreaterThanOrEqual(24);
      expect(rect.height).toBeGreaterThanOrEqual(24);
    } else {
      expect(rect.width).toBeGreaterThan(0);
      expect(rect.height).toBeGreaterThan(0);
    }
    expect(rect.left).toBeGreaterThanOrEqual(shellRect.left);
    expect(rect.right).toBeLessThanOrEqual(shellRect.right);
    expect(rect.top).toBeGreaterThanOrEqual(shellRect.top);
    expect(rect.bottom).toBeLessThanOrEqual(shellRect.bottom);
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    expect(hit === target || (hit !== null && target.contains(hit)), target.className).toBe(true);
  }
  const sorted = targets.map((target) => target.getBoundingClientRect()).sort((a, b) => a.left - b.left);
  for (let i = 1; i < sorted.length; i++) expect(sorted[i]!.left).toBeGreaterThanOrEqual(sorted[i - 1]!.right);
  for (const control of controls) {
    expect(control.getAttribute('title')).toBe(control.getAttribute('aria-label'));
    expect(control.getAttribute('tabindex')).toBe('0');
  }
}

function expectShellWidth(borderBox: number, borders: number): void {
  const shell = getShell();
  const style = getComputedStyle(shell);
  expect(shell.getBoundingClientRect().width).toBe(borderBox);
  const measuredBorders = parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth);
  expect(measuredBorders).toBe(borders);
  expect(shell.getBoundingClientRect().width - measuredBorders
    - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)).toBe(borderBox - borders);
}

beforeEach(async () => {
  localStorage.clear();
  await injectPanelCss();
});

function requiredElement(root: ParentNode, selector: string): HTMLElement {
  const element = root.querySelector<HTMLElement>(selector);
  if (!element) throw new Error(`Missing expected control: ${selector}`);
  return element;
}

function visible(element: HTMLElement): boolean {
  return element.getBoundingClientRect().width > 0 && element.getBoundingClientRect().height > 0;
}

/** Deliberately checks geometry before visibility expectations: reverting the
 * header CSS must reproduce the 700px containment failure here. */
function expectHeaderContainment(): void {
  const shell = getShell();
  const bounds = shell.getBoundingClientRect();
  const style = getComputedStyle(shell);
  const left = bounds.left + parseFloat(style.borderLeftWidth) + parseFloat(style.paddingLeft);
  const right = bounds.right - parseFloat(style.borderRightWidth) - parseFloat(style.paddingRight);
  const header = requiredElement(shell, '.tokenpanel-header');
  const controls = [...header.children] as HTMLElement[];
  expect(controls.length).toBeGreaterThan(10);
  const interactive = [...header.querySelectorAll<HTMLElement>('[role="button"], input')]
    .filter((element) => !element.closest('.tokenpanel-actions-popover') && visible(element));
  expect(interactive.length).toBeGreaterThanOrEqual(8);
  for (const control of [...controls, ...interactive].filter(visible)) {
    const rect = control.getBoundingClientRect();
    expect(rect.left, `${control.className} left`).toBeGreaterThanOrEqual(left - 0.01);
    expect(rect.right, `${control.className} right`).toBeLessThanOrEqual(right + 0.01);
  }
  for (const [index, target] of interactive.entries()) {
    const rect = target.getBoundingClientRect();
    expect(rect.width, `${target.className} actual width`).toBeGreaterThanOrEqual(24);
    expect(rect.height, `${target.className} actual height`).toBeGreaterThanOrEqual(24);
    if (target.getAttribute('aria-disabled') !== 'true') {
      for (const [x, y] of [
        [rect.left + rect.width / 2, rect.top + rect.height / 2],
        // Probe every edge inside the painted box. Rounded corners (history
        // uses a 4px radius) intentionally do not own their clipped corners.
        [rect.left + 1, rect.top + rect.height / 2],
        [rect.right - 1, rect.top + rect.height / 2],
        [rect.left + rect.width / 2, rect.top + 1],
        [rect.left + rect.width / 2, rect.bottom - 1],
      ]) {
        const hit = document.elementFromPoint(x!, y!);
        expect(hit === target || (hit !== null && target.contains(hit)), `${target.className} hit`).toBe(true);
      }
    }
    for (const other of interactive.slice(index + 1)) {
      if (target.contains(other) || other.contains(target)) continue;
      const next = other.getBoundingClientRect();
      const overlapX = Math.min(rect.right, next.right) - Math.max(rect.left, next.left);
      const overlapY = Math.min(rect.bottom, next.bottom) - Math.max(rect.top, next.top);
      expect(overlapX > 0.01 && overlapY > 0.01, `${target.className} overlaps ${other.className}`).toBe(false);
    }
  }
}

describe('locked yielded-header geometry with the full vendored manifest', () => {
  for (const width of [700, 1152]) {
    it(`preserves configured Tweaker and diff affordances at ${width}px`, async () => {
      await mountPanelAtWidth(width, {
        ...zudoDocConfigs.dark,
        domTweaker: { themeCss: '@theme { --color-brand: #7c3aed; }' },
      });
      expectHeaderContainment();
      const inlineDiff = requiredElement(getShell(), '.tokenpanel-header > .tokenpanel-domtweaker-diff-button');
      expect(visible(inlineDiff)).toBe(width === 1152);
      if (width === 1152) {
        expect(inlineDiff.getBoundingClientRect().width).toBeGreaterThanOrEqual(24);
      } else {
        await page.elementLocator(getKebabTrigger()).click();
        await flushEffects();
        const popover = getPopover()!;
        expect(popover.querySelector('.tokenpanel-domtweaker-diff-button')).toBeNull();
        const diffActions = [...popover.querySelectorAll<HTMLElement>('.tokenpanel-action-link')]
          .filter((element) => element.textContent === 'DOM Tweaker diff');
        expect(diffActions).toHaveLength(1);
        const toggle = requiredElement(popover, '.tokenpanel-tweaker-toggle');
        expect(toggle.textContent).toContain('DOM Tweaker');
        await page.elementLocator(toggle).click();
        await flushEffects();
        expect(toggle.getAttribute('aria-pressed')).toBe('true');
        toggle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
        await flushEffects();
        expect(toggle.getAttribute('aria-pressed')).toBe('false');
        await page.elementLocator(diffActions[0]!).click();
        // The lazy orchestrator portals this dialog into document.body,
        // outside the panel mount. Wait for both lazy mount and showModal().
        await expect.poll(() => document.querySelector<HTMLDialogElement>(
          `#${DOM_TWEAKER_PORTAL_MOUNT_ID} [data-design-token-panel-modal-variant="dom-tweaker-diff"]`,
        )?.open, { timeout: 5000 }).toBe(true);
        expect(requiredElement(document, `#${DOM_TWEAKER_PORTAL_MOUNT_ID} [aria-label="DOM Tweaker session diff"]`)).toBeInstanceOf(HTMLTextAreaElement);
        expect(getPopover()).toBeNull();
      }
    });
  }

  it('loads JSON, updates history and sync, undoes/redoes, resets, and opens Apply from the 700px menu', async () => {
    await mountPanelAtWidth(700, {
      ...CFG,
      applyEndpoint: '/api/dev/apply',
      applyRouting: { zd: 'styles/tokens.css' },
    });
    const openMenu = async () => {
      await page.elementLocator(getKebabTrigger()).click();
      await flushEffects();
      expect(getPopover()).not.toBeNull();
    };
    await openMenu();
    getPopoverActionByLabel('Load from JSON…').click();
    await flushEffects();
    expect(getPopover()).toBeNull();
    const dialog = requiredElement(container, '[data-design-token-panel-modal-variant="import"]') as HTMLDialogElement;
    const input = requiredElement(dialog, 'textarea') as HTMLTextAreaElement;
    await page.elementLocator(input).fill(JSON.stringify({ $schema: SCHEMA_V2, tabs: { spacing: { raw: { '--zd-spacing-hgap-md': '53px' } } } }));
    await flushEffects();
    const load = [...dialog.querySelectorAll<HTMLElement>('[role="button"]')].find((element) => element.textContent === 'Load');
    expect(load).toBeDefined();
    load!.click();
    await flushEffects();
    expect(dialog.textContent).toContain('Loaded.');
    expect(document.documentElement.style.getPropertyValue('--zd-spacing-hgap-md')).toBe('53px');
    dialog.close();
    await flushEffects();
    await openMenu();
    expect(requiredElement(getPopover()!, '.tokenpanel-apply-sync').textContent).toContain('unsaved');
    const undo = requiredElement(getPopover()!, '[aria-label="Undo"]');
    expect(undo.getAttribute('aria-disabled')).not.toBe('true');
    undo.click();
    await flushEffects();
    expect(getPopover()).toBeNull();
    expect(document.documentElement.style.getPropertyValue('--zd-spacing-hgap-md')).not.toBe('53px');
    await openMenu();
    const redo = requiredElement(getPopover()!, '[aria-label="Redo"]');
    expect(redo.getAttribute('aria-disabled')).not.toBe('true');
    redo.click();
    await flushEffects();
    expect(document.documentElement.style.getPropertyValue('--zd-spacing-hgap-md')).toBe('53px');
    await openMenu();
    const history = requiredElement(getPopover()!, '[aria-label="History rail"]');
    history.click();
    await flushEffects();
    expect(getPopover()).toBeNull();
    await openMenu();
    expect(requiredElement(getPopover()!, '[aria-label="History rail"]').getAttribute('aria-expanded')).toBe('true');
    getPopoverActionByLabel('Reset').click();
    await flushEffects();
    expect(getPopover()).toBeNull();
    expect(document.documentElement.style.getPropertyValue('--zd-spacing-hgap-md')).toBe('');
    await openMenu();
    const apply = getPopoverActionByLabel('Apply');
    expect(apply.getAttribute('aria-disabled')).not.toBe('true');
    apply.click();
    await flushEffects();
    expect(getPopover()).toBeNull();
    expect(container.querySelector('[data-design-token-panel-modal-variant="apply"]')).not.toBeNull();
  });

  for (const width of [320, 380, 440, 700, 1152]) {
    it(`contains every direct and nested header control at ${width}px`, async () => {
      await mountPanelAtWidth(width, zudoDocConfigs.dark);
      expectHeaderContainment();
      expectInlineDockGeometry();
      const shell = getShell();
      const header = requiredElement(shell, '.tokenpanel-header');
      const compact = width < 482;
      const yielded = width < 1138;
      expect(getComputedStyle(header).paddingLeft).toBe(compact ? '16px' : '24px');
      expect(getComputedStyle(header).columnGap).toBe(compact ? '8px' : '12px');
      const title = requiredElement(header, '.tokenpanel-title');
      expect(visible(title)).toBe(true);
      expect(getComputedStyle(title).flexShrink).toBe('0');
      expect(visible(getKebabTrigger())).toBe(yielded);
      expect(getHeaderActionLinks()).toHaveLength(4);
      for (const selector of ['.tokenpanel-action-link', '.tokenpanel-history-controls', '.tokenpanel-apply-sync', '.tokenpanel-elpath-toggle', '.tokenpanel-element-inspect-toggle']) {
        expect(visible(requiredElement(header, `:scope > ${selector}`)), selector).toBe(!yielded);
      }
      const search = requiredElement(header, '.tokenpanel-search-control');
      const searchWidth = search.getBoundingClientRect().width;
      if (compact) expect(searchWidth).toBe(24);
      else {
        expect(searchWidth).toBeGreaterThanOrEqual(120);
        expect(searchWidth).toBeLessThanOrEqual(260);
      }
      expect(visible(requiredElement(search, '.tokenpanel-search-input'))).toBe(!compact);
      expect(visible(requiredElement(search, '.tokenpanel-search-compact-btn'))).toBe(compact);
      expect(visible(requiredElement(shell, '.tokenpanel-tabbar > .tokenpanel-density'))).toBe(!compact);
      if (yielded) {
        await page.elementLocator(getKebabTrigger()).click();
        await flushEffects();
        const popover = getPopover()!;
        const menuBounds = popover.getBoundingClientRect();
        const headerBounds = header.getBoundingClientRect();
        expect(menuBounds.left).toBeCloseTo(headerBounds.left + (compact ? 16 : 24), 1);
        expect(menuBounds.right).toBeLessThanOrEqual(headerBounds.right - (compact ? 16 : 24));
        for (const selector of ['.tokenpanel-elpath-toggle', '.tokenpanel-element-inspect-toggle']) {
          const control = requiredElement(popover, selector);
          expect(control.textContent?.trim().length).toBeGreaterThan(0);
          expect(control.getBoundingClientRect().height).toBeGreaterThanOrEqual(24);
          await page.elementLocator(control).click();
          await flushEffects();
          expect(control.getAttribute('aria-pressed')).toBe('true');
          control.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
          await flushEffects();
          expect(control.getAttribute('aria-pressed')).toBe('false');
        }
        expect(requiredElement(popover, '.tokenpanel-apply-sync').textContent).toContain('in sync');
        for (const name of ['Undo', 'Redo', 'History rail']) {
          expect(requiredElement(popover, `[aria-label="${name}"]`).getBoundingClientRect().width).toBeGreaterThanOrEqual(24);
        }
        expect(requiredElement(popover, '.tokenpanel-history-count').textContent).toBe('0/0');
      }
    });
  }

  for (const width of [320, 700]) {
    it(`keeps all three density stops reachable at ${width}px`, async () => {
      await mountPanelAtWidth(width, zudoDocConfigs.dark);
      if (width === 320) {
        await page.elementLocator(getKebabTrigger()).click();
        await flushEffects();
      }
      const root = width === 320 ? getPopover()! : getShell();
      const slider = requiredElement(root, width === 320 ? '.tokenpanel-density-slider' : '.tokenpanel-tabbar .tokenpanel-density-slider') as HTMLInputElement;
      expect(visible(slider)).toBe(true);
      slider.focus();
      await userEvent.keyboard('{Home}');
      for (const [index, value] of ['192px', '288px', '100%'].entries()) {
        if (index) await userEvent.keyboard('{ArrowRight}');
        await flushEffects();
        expect(slider.value).toBe(String(index));
        expect(getShell().style.getPropertyValue('--tokenpanel-grid-min')).toBe(value);
      }
      for (const [index, value] of ['192px', '288px', '100%'].entries()) {
        const rect = slider.getBoundingClientRect();
        await page.elementLocator(slider).click({ position: { x: 8 + (rect.width - 16) * index / 2, y: rect.height / 2 } });
        await flushEffects();
        expect(getShell().style.getPropertyValue('--tokenpanel-grid-min')).toBe(value);
      }
    });
  }

  for (const contentWidth of [478.5, 479, 479.5, 480, 1134.5, 1135, 1135.5, 1136]) {
    it(`honors fractional float content width ${contentWidth}px`, async () => {
      await mountPanelAtWidth(contentWidth + 2);
      getShell().style.width = `${contentWidth + 2}px`;
      expectShellWidth(contentWidth + 2, 2);
      expect(visible(getKebabTrigger())).toBe(contentWidth <= 1135);
      expect(visible(requiredElement(getShell(), '.tokenpanel-search-input'))).toBe(contentWidth > 479);
    });
  }
});

afterEach(async () => {
  await flushEffects();
  if (container) {
    act(() => {
      render(null, container);
    });
    container.remove();
  }
  for (const el of injectedStyles) el.remove();
  injectedStyles = [];
  localStorage.clear();
});

// ---------------------------------------------------------------------------
// Full inline layout (>1135px content width)
// ---------------------------------------------------------------------------

describe('wide panel (>1135px container width)', () => {
  it('shows the four header action links and hides the kebab', async () => {
    // Leave room for the complete existing wide header control set.
    await mountPanelAtWidth(1152);
    expectInlineDockGeometry();

    const links = getHeaderActionLinks();
    expect(links.map((el) => el.textContent)).toEqual([
      'Export',
      'Load from JSON…',
      'Apply',
      'Reset',
    ]);
    for (const link of links) {
      expect(getComputedStyle(link).display).not.toBe('none');
    }

    expect(getComputedStyle(getKebabTrigger()).display).toBe('none');
  });

  it('disables Apply when disk-rewrite wiring is absent and enables it when configured', async () => {
    await mountPanelAtWidth(1152);

    const disabledApply = getHeaderActionLinks().find((el) => el.textContent === 'Apply');
    expect(disabledApply?.getAttribute('aria-disabled')).toBe('true');
    expect(disabledApply?.title).toContain('configure an apply endpoint');
    disabledApply?.click();
    expect(container.querySelector('[data-design-token-panel-modal-variant="apply"]')).toBeNull();

    act(() => render(null, container));
    container.remove();
    const configured = {
      ...CFG,
      applyEndpoint: '/api/dev/apply',
      applyRouting: { fixture: 'styles/tokens.css' },
    };
    await mountPanelAtWidth(1152, configured);

    const enabledApply = getHeaderActionLinks().find((el) => el.textContent === 'Apply');
    expect(enabledApply?.getAttribute('aria-disabled')).not.toBe('true');
    expect(enabledApply?.title).toBe('');
    enabledApply?.click();
    await flushEffects();
    expect(container.querySelector('[data-design-token-panel-modal-variant="apply"]')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Narrow layout (<480px) — kebab + popover
// ---------------------------------------------------------------------------

describe('narrow panel (<480px container width)', () => {
  it('hides the header action links and shows the kebab', async () => {
    await mountPanelAtWidth(400);

    for (const link of getHeaderActionLinks()) {
      expect(getComputedStyle(link).display).toBe('none');
    }
    expect(getComputedStyle(getKebabTrigger()).display).not.toBe('none');
  });

  it('clicking the kebab opens a popover listing all four actions', async () => {
    await mountPanelAtWidth(400);
    const trigger = getKebabTrigger();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');

    trigger.click();
    await flushEffects();

    const popover = getPopover();
    expect(popover).not.toBeNull();
    expect(popover!.getAttribute('role')).toBe('dialog');
    expect(trigger.getAttribute('aria-expanded')).toBe('true');

    const labels = Array.from(
      popover!.querySelectorAll<HTMLElement>('.tokenpanel-action-link'),
    ).map((el) => el.textContent);
    expect(labels).toEqual(['Export', 'Load from JSON…', 'Apply', 'Reset']);
  });

  it('clicking an action closes the popover and fires the action (Export modal opens)', async () => {
    await mountPanelAtWidth(700);
    getKebabTrigger().click();
    await flushEffects();

    getPopoverActionByLabel('Export').click();
    await flushEffects();

    expect(getPopover()).toBeNull();
    expect(getKebabTrigger().getAttribute('aria-expanded')).toBe('false');
    expect(
      container.querySelector('[data-design-token-panel-modal-variant="export"]'),
    ).not.toBeNull();
  });

  it('keeps unconfigured Apply disabled and inert in the compact menu', async () => {
    await mountPanelAtWidth(400);
    getKebabTrigger().click();
    await flushEffects();

    const apply = getPopoverActionByLabel('Apply');
    expect(apply.getAttribute('aria-disabled')).toBe('true');
    expect(apply.title).toContain('configure an apply endpoint');
    apply.click();
    await flushEffects();

    expect(getPopover()).not.toBeNull();
    expect(container.querySelector('[data-design-token-panel-modal-variant="apply"]')).toBeNull();
  });

  it('Escape closes the popover without closing the panel', async () => {
    await mountPanelAtWidth(400);
    getKebabTrigger().click();
    await flushEffects();
    expect(getPopover()).not.toBeNull();

    // cancelable:true is required — the dismiss-layer arbiter calls
    // preventDefault() to signal "handled"; on a non-cancelable synthetic event
    // that is a no-op and the panel's bubble-phase listener would still fire.
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    await flushEffects();

    expect(getPopover()).toBeNull();
    // The panel itself must still be open — the dismiss-layer stack marks
    // the Escape as handled so the panel's own ESC listener stands down.
    expect(getShell()).toBeTruthy();
  });

  it('an outside pointerdown closes the popover', async () => {
    await mountPanelAtWidth(400);
    getKebabTrigger().click();
    await flushEffects();
    expect(getPopover()).not.toBeNull();

    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    await flushEffects();

    expect(getPopover()).toBeNull();
  });

  it('keyboard Enter on the kebab trigger opens the popover', async () => {
    await mountPanelAtWidth(400);
    const trigger = getKebabTrigger();

    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await flushEffects();

    expect(getPopover()).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Demoted tabbar controls (<480px)
// ---------------------------------------------------------------------------

describe('very narrow panel (<380px container width)', () => {
  it('demotes density from the tabbar and keeps it in the compact menu', async () => {
    await mountPanelAtWidth(340);

    const density = container.querySelector<HTMLElement>('.tokenpanel-tabbar > .tokenpanel-density');
    expect(density).not.toBeNull();
    expect(getComputedStyle(density!).display).toBe('none');

    getKebabTrigger().click();
    await flushEffects();
    const compactDensityLabel = getPopover()?.querySelector<HTMLElement>(
      '.tokenpanel-density.is-compact .tokenpanel-density-label',
    );
    expect(compactDensityLabel).not.toBeNull();
    expect(getComputedStyle(compactDensityLabel!).display).not.toBe('none');
    expect(
      getPopover()?.querySelector<HTMLInputElement>('.tokenpanel-density-slider'),
    ).not.toBeNull();
  });
});

describe('320px right-docked panel', () => {
  it('contains both chrome rows while preserving the resize grip and compact controls', async () => {
    await mountPanelDockedRight(320);
    expectInlineDockGeometry();

    const shell = getShell();
    expect(shell.classList.contains('is-docked-right')).toBe(true);
    expect(shell.getBoundingClientRect().width).toBe(320);

    const shellRect = shell.getBoundingClientRect();
    for (const rowSelector of ['.tokenpanel-header', '.tokenpanel-tabbar']) {
      const row = container.querySelector<HTMLElement>(rowSelector);
      if (!row) throw new Error(`${rowSelector} not found`);
      for (const child of Array.from(row.children)) {
        const rect = child.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) continue;
        expect(rect.left, `${rowSelector} child ${child.className} left`).toBeGreaterThanOrEqual(
          shellRect.left,
        );
        expect(rect.right, `${rowSelector} child ${child.className} right`).toBeLessThanOrEqual(
          shellRect.right,
        );
      }
    }

    const strip = container.querySelector<HTMLElement>('.tokenpanel-tabbar-tabs');
    if (!strip) throw new Error('.tokenpanel-tabbar-tabs not found');
    expect(strip.clientWidth).toBeGreaterThanOrEqual(160);

    const resizeHandle = container.querySelector<HTMLElement>(
      '.tokenpanel-dock-resize-handle.is-right',
    );
    if (!resizeHandle) throw new Error('right dock resize handle not found');
    expect(resizeHandle.getBoundingClientRect().width).toBe(6);
    const resizeStart = resizeHandle.getBoundingClientRect().left;
    resizeHandle.dispatchEvent(
      new MouseEvent('mousedown', { clientX: resizeStart, bubbles: true, cancelable: true }),
    );
    document.dispatchEvent(
      new MouseEvent('mousemove', {
        clientX: resizeStart - 40,
        bubbles: true,
        cancelable: true,
      }),
    );
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    await flushEffects();
    expect(shell.getBoundingClientRect().width).toBe(360);

    getKebabTrigger().click();
    await flushEffects();
    const popover = getPopover();
    if (!popover) throw new Error('compact actions popover did not open');
    const popoverRect = popover.getBoundingClientRect();
    const resizedShellRect = shell.getBoundingClientRect();
    expect(popoverRect.left).toBeGreaterThanOrEqual(resizedShellRect.left);
    expect(popoverRect.right).toBeLessThanOrEqual(resizedShellRect.right);
    expect(popover.querySelector('.tokenpanel-history-controls')).not.toBeNull();
    expect(popover.querySelector('.tokenpanel-apply-sync')).not.toBeNull();
    expect(popover.querySelector('.tokenpanel-dock-modes.is-compact')).not.toBeNull();
    expect(popover.querySelector('.tokenpanel-density.is-compact')).not.toBeNull();
    expect(popover.querySelector('.tokenpanel-ghost-idle-toggle.is-compact')).not.toBeNull();
    expect(popover.querySelector('.tokenpanel-changed-only-toggle')).not.toBeNull();
    expect(popover.querySelector('.tokenpanel-elpath-toggle')).not.toBeNull();
    expect(popover.querySelector('.tokenpanel-element-inspect-toggle')).not.toBeNull();

    const compactDensity = popover.querySelector<HTMLInputElement>(
      '.tokenpanel-density.is-compact .tokenpanel-density-slider',
    );
    if (!compactDensity) throw new Error('compact density slider not found');
    compactDensity.value = '2';
    compactDensity.dispatchEvent(new Event('input', { bubbles: true }));
    await flushEffects();
    expect(localStorage.getItem(getDensityKey(CFG))).toBe('2');
  });
});

describe('440px right-docked panel', () => {
  it('keeps the header and tab strip contained at the default dock width', async () => {
    await mountPanelDockedRight(440);
    expectInlineDockGeometry();

    const shellRect = getShell().getBoundingClientRect();
    for (const selector of ['.tokenpanel-header', '.tokenpanel-tabbar']) {
      const row = container.querySelector<HTMLElement>(selector);
      if (!row) throw new Error(`${selector} not found`);
      const visibleChildren = Array.from(row.children).filter((child) => {
        const rect = child.getBoundingClientRect();
        return rect.width > 0 || rect.height > 0;
      });
      expect(visibleChildren.length).toBeGreaterThan(0);
      expect(
        Math.min(...visibleChildren.map((child) => child.getBoundingClientRect().left)),
      ).toBeGreaterThanOrEqual(shellRect.left);
      expect(
        Math.max(...visibleChildren.map((child) => child.getBoundingClientRect().right)),
      ).toBeLessThanOrEqual(shellRect.right);
    }

    const strip = container.querySelector<HTMLElement>('.tokenpanel-tabbar-tabs');
    if (!strip) throw new Error('.tokenpanel-tabbar-tabs not found');
    expect(strip.clientWidth).toBeGreaterThanOrEqual(160);
  });
});

describe('rendered CSS actions-menu boundary', () => {
  for (const width of [1135, 1136, 1136.5, 1137]) {
    it(`uses actual right-dock content width at mounted ${width}px`, async () => {
      await mountPanelDockedRight(width);
      expectShellWidth(width, 1);
      expect(getComputedStyle(getKebabTrigger()).display === 'none').toBe(width > 1136);
      expect(getKebabTrigger().getAttribute('aria-expanded')).toBe('false');
    });
  }

  for (const mode of ['right', 'float'] as const) {
    it(`closes on a style-only ${mode} boundary change and never reopens itself`, async () => {
      const compactWidth = mode === 'right' ? 1136 : 1137;
      const borders = mode === 'right' ? 1 : 2;
      if (mode === 'right') await mountPanelDockedRight(compactWidth);
      else await mountPanelAtWidth(compactWidth);
      const storedSize = localStorage.getItem(mode === 'right' ? getDockSizeKey(CFG) : getSizeKey(CFG));
      const trigger = getKebabTrigger();
      expectShellWidth(compactWidth, borders);
      await page.elementLocator(trigger).click();
      await expect.poll(() => getPopover() !== null).toBe(true);
      expect(trigger.getAttribute('aria-expanded')).toBe('true');

      // No pointer event and no Preact width update: only ResizeObserver can
      // reconcile the still-open menu with this actual CSS layout change.
      getShell().style.width = `${compactWidth + 1}px`;
      expectShellWidth(compactWidth + 1, borders);
      expect(getComputedStyle(trigger).display).toBe('none');
      await expect.poll(() => getPopover()).toBeNull();
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
      trigger.click();
      await flushEffects();
      expect(getPopover()).toBeNull();
      expect(localStorage.getItem(mode === 'right' ? getDockSizeKey(CFG) : getSizeKey(CFG))).toBe(storedSize);

      getShell().style.width = `${compactWidth}px`;
      expectShellWidth(compactWidth, borders);
      await flushEffects();
      expect(getComputedStyle(trigger).display).not.toBe('none');
      expect(getPopover()).toBeNull();
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
      await page.elementLocator(trigger).click();
      await expect.poll(() => getPopover() !== null).toBe(true);
      const labeledFloat = getPopover()!.querySelector<HTMLElement>(
        '.tokenpanel-dock-modes.is-compact [aria-label^="Float panel ("]',
      );
      expect(labeledFloat?.textContent).toBe('Float panel');
      await page.elementLocator(labeledFloat!).click();
      await flushEffects();
      expect(getPopover()).toBeNull();
      expect(localStorage.getItem(getDockKey(CFG))).toBe('float');
    });
  }
});

describe('right-docked panel integration (overflow, tooltip, and chrome colors)', () => {
  for (const width of [320, 440]) {
    it(`keeps the real token label contained through overflow at ${width}px`, async () => {
      await mountPanelDockedRight(width, COMBINED_CFG);

      const shell = getShell();
      const strip = container.querySelector<HTMLElement>('.tokenpanel-tabbar-tabs');
      if (!strip) throw new Error('.tokenpanel-tabbar-tabs not found');
      expect(strip.scrollWidth).toBeGreaterThan(strip.clientWidth);
      expect(strip.classList.contains('has-overflow')).toBe(true);

      const overflowTrigger = container.querySelector<HTMLElement>(
        '.tokenpanel-tab-overflow-trigger',
      );
      expect(overflowTrigger).not.toBeNull();

      const label = Array.from(
        container.querySelectorAll<HTMLElement>('.tokenpanel-row-label'),
      ).find((element) => element.textContent === CONFIRMATION_TOKEN);
      if (!label) throw new Error('confirmation token label not found');

      const labelRect = label.getBoundingClientRect();
      const card = label.closest<HTMLElement>('.tokenpanel-card');
      if (!card) throw new Error('confirmation token card not found');
      const cardRect = card.getBoundingClientRect();
      const cardStyle = getComputedStyle(card);
      const cardContent = {
        left: cardRect.left + parseFloat(cardStyle.borderLeftWidth) + parseFloat(cardStyle.paddingLeft),
        right: cardRect.right - parseFloat(cardStyle.borderRightWidth) - parseFloat(cardStyle.paddingRight),
        top: cardRect.top + parseFloat(cardStyle.borderTopWidth) + parseFloat(cardStyle.paddingTop),
        bottom: cardRect.bottom - parseFloat(cardStyle.borderBottomWidth) - parseFloat(cardStyle.paddingBottom),
      };
      expect(labelRect.left).toBeGreaterThanOrEqual(cardContent.left - 0.6);
      expect(labelRect.right).toBeLessThanOrEqual(cardContent.right + 0.6);
      expect(labelRect.top).toBeGreaterThanOrEqual(cardContent.top - 0.6);
      expect(labelRect.bottom).toBeLessThanOrEqual(cardContent.bottom + 0.6);
      const compactCard = card.getBoundingClientRect().width <= 319.6;
      const textExtent = compactCard
        ? getCompleteTextExtent(label, CONFIRMATION_TOKEN)
        : getVisibleTextExtent(label);
      if (compactCard) {
        // #788 intentionally changes the 320px card from truncation to
        // complete wrapped text. Keep the old truncation assertion only for
        // the roomy 440px card where that behavior remains applicable.
        expect(textExtent.rawRight).toBeLessThanOrEqual(labelRect.right + 0.6);
      } else {
        expect(textExtent.rawRight).toBeGreaterThan(labelRect.left + label.clientWidth);
      }
      expect(textExtent.right).toBeGreaterThan(textExtent.left);

      act(() => {
        label.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      });
      await flushEffects();

      const tooltip = document.querySelector<HTMLElement>(
        '.tokenpanel-tooltip[data-show="true"]',
      );
      if (!tooltip) throw new Error('visible token tooltip not found');
      expect(tooltip.textContent).toBe(CONFIRMATION_TOKEN);
      const tooltipRect = tooltip.getBoundingClientRect();
      const textCenter = (textExtent.left + textExtent.right) / 2;
      const tooltipCenter = (tooltipRect.left + tooltipRect.right) / 2;
      expect(tooltipRect.left).toBeLessThan(textExtent.right);
      expect(tooltipRect.right).toBeGreaterThan(textExtent.left);
      expect(Math.abs(tooltipCenter - textCenter)).toBeLessThanOrEqual(24);

      const shellStyle = getComputedStyle(shell);
      const surface = shellStyle.getPropertyValue('--tokentweak-color-surface').trim();
      const border = shellStyle.getPropertyValue('--tokentweak-color-border').trim();
      expect(surface).not.toBe('');
      expect(border).not.toBe('');
      expect(surface).not.toBe(border);
      expect(shellStyle.backgroundColor).toBe(surface);
      expect(shellStyle.borderLeftColor).toBe(border);

      const overflowStyle = getComputedStyle(overflowTrigger!);
      expect(overflowStyle.borderLeftColor).toBe(border);
      expect(overflowStyle.color).toBe(
        shellStyle.getPropertyValue('--tokentweak-color-muted').trim(),
      );

      const tooltipStyle = getComputedStyle(tooltip);
      expect(tooltipStyle.backgroundColor).toBe(
        tooltipStyle.getPropertyValue('--tokentweak-color-surface').trim(),
      );
      expect(tooltipStyle.backgroundColor).toBe(surface);
    });
  }
});

// ---------------------------------------------------------------------------
// Tabs strip overflow fade hint
// ---------------------------------------------------------------------------

describe('tabs strip overflow (.has-overflow fade hint)', () => {
  it('adds has-overflow when the strip actually overflows, clears once scrolled to the end', async () => {
    await mountPanelAtWidth(400, { ...CFG, tabs: MANY_TABS });

    const strip = container.querySelector<HTMLElement>('.tokenpanel-tabbar-tabs');
    if (!strip) throw new Error('.tokenpanel-tabbar-tabs not found');

    expect(strip.scrollWidth).toBeGreaterThan(strip.clientWidth);
    expect(strip.classList.contains('has-overflow')).toBe(true);

    strip.scrollLeft = strip.scrollWidth;
    strip.dispatchEvent(new Event('scroll', { bubbles: true }));
    await flushEffects();

    expect(strip.classList.contains('has-overflow')).toBe(false);
  });

  it('does not add has-overflow when the strip fits (few tabs, wide panel)', async () => {
    // Wave 3 adds the Inspect tab plus Changed-only controls to this real-shell
    // fixture. At 700px those controls correctly leave the tab strip scrollable;
    // 800px is the first comfortably-wide state where the four short tabs fit.
    await mountPanelAtWidth(800);

    const strip = container.querySelector<HTMLElement>('.tokenpanel-tabbar-tabs');
    if (!strip) throw new Error('.tokenpanel-tabbar-tabs not found');

    expect(strip.scrollWidth).toBeLessThanOrEqual(strip.clientWidth);
    expect(strip.classList.contains('has-overflow')).toBe(false);
  });
});
