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
 *   - ≥480px: header action links visible, kebab hidden.
 *   - <480px: header action links hidden, kebab visible; kebab opens a
 *     popover with all 4 actions; an action both fires (opens its modal)
 *     and closes the popover; Escape and outside-click also close it.
 *   - <380px: the DENSITY label hides (slider stays functional).
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
import { render } from 'preact';
import { act } from 'preact/test-utils';
import DesignTokenTweakPanel from '../panel';
import { getOpenKey, getPositionKey, getSizeKey } from '../state/tweak-state';
import { FIXTURE_PANEL_CONFIG, flushEffects } from './_test-helpers';
import type { TabConfig } from '../tokens/tier-model';

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

beforeEach(async () => {
  localStorage.clear();
  await injectPanelCss();
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
// Wide layout (≥480px) — unchanged from today
// ---------------------------------------------------------------------------

describe('wide panel (≥480px container width)', () => {
  it('shows the four header action links and hides the kebab', async () => {
    await mountPanelAtWidth(700);

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
    await mountPanelAtWidth(700);

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
    await mountPanelAtWidth(700, configured);

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
    await mountPanelAtWidth(400);
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
// Density label breakpoint (<380px)
// ---------------------------------------------------------------------------

describe('very narrow panel (<380px container width)', () => {
  it('hides the DENSITY label but keeps the slider', async () => {
    await mountPanelAtWidth(340);

    const label = container.querySelector<HTMLElement>('.tokenpanel-density-label');
    const slider = container.querySelector<HTMLInputElement>('.tokenpanel-density-slider');
    expect(label).not.toBeNull();
    expect(getComputedStyle(label!).display).toBe('none');
    expect(slider).not.toBeNull();
    expect(getComputedStyle(slider!).display).not.toBe('none');
  });
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
