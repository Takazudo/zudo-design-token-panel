import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import DesignTokenTweakPanel from '../panel';
import { getOpenKey, getPositionKey, getSizeKey } from '../state/tweak-state';
import type { TabConfig } from '../tokens/tier-model';
import { FIXTURE_PANEL_CONFIG, flushEffects } from './_test-helpers';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore -- ?inline is provided by Vite in the browser project.
const panelCssModule = import('../styles/panel.css?inline');

const MANY_TABS: readonly TabConfig[] = Array.from({ length: 12 }, (_, index) => ({
  id: `overflow-${index}`,
  label: `Category ${index + 1}`,
  tiers: [{
    id: 'raw',
    label: `Category ${index + 1}`,
    items: [{
      id: `item-${index}`,
      cssVar: `--overflow-${index}`,
      label: `Item ${index}`,
      default: '4px',
      type: { kind: 'length' as const, step: 1, unit: 'px' as const },
    }],
  }],
}));

const CONFIG = { ...FIXTURE_PANEL_CONFIG, tabs: MANY_TABS };
const FEW_TABS_CONFIG = { ...FIXTURE_PANEL_CONFIG, tabs: MANY_TABS.slice(0, 2) };
const RESIZE_CONFIG = { ...FIXTURE_PANEL_CONFIG, tabs: MANY_TABS.slice(0, 6) };
let container: HTMLDivElement;
let style: HTMLStyleElement;

async function mount(width = 400, config = CONFIG): Promise<void> {
  localStorage.setItem(getOpenKey(config), '1');
  localStorage.setItem(getPositionKey(config), JSON.stringify({ top: 20, left: 20 }));
  localStorage.setItem(getSizeKey(config), JSON.stringify({ width, height: 400 }));
  container = document.createElement('div');
  document.body.appendChild(container);
  act(() => render(<DesignTokenTweakPanel instanceConfig={config} />, container));
  await flushEffects();
}

function strip(): HTMLElement {
  const element = container.querySelector<HTMLElement>('.tokenpanel-tabbar-tabs');
  if (!element) throw new Error('tab strip missing');
  return element;
}

function trigger(): HTMLElement | null {
  return container.querySelector<HTMLElement>('.tokenpanel-tab-overflow-trigger');
}

function hiddenLabels(): string[] {
  const stripRect = strip().getBoundingClientRect();
  return Array.from(strip().querySelectorAll<HTMLElement>('[role="tab"]'))
    .filter((tab) => {
      const rect = tab.getBoundingClientRect();
      return rect.left < stripRect.left - 1 || rect.right > stripRect.right + 1;
    })
    .map((tab) => tab.textContent ?? '');
}

function optionLabels(): string[] {
  return Array.from(container.querySelectorAll<HTMLElement>('[role="option"]'))
    .map((option) => option.textContent ?? '');
}

beforeEach(async () => {
  localStorage.clear();
  style = document.createElement('style');
  style.textContent = ((await panelCssModule) as { default: string }).default;
  document.head.appendChild(style);
});

afterEach(async () => {
  await flushEffects();
  if (container) {
    act(() => render(null, container));
    container.remove();
  }
  style.remove();
});

describe('tab overflow chooser', () => {
  it('lists exactly the clipped tabs at both scroll edges and hides when tabs fit', async () => {
    await mount();
    expect(trigger()).not.toBeNull();
    const triggerRect = trigger()!.getBoundingClientRect();
    expect(triggerRect.width).toBeGreaterThanOrEqual(24);
    expect(triggerRect.height).toBeGreaterThanOrEqual(24);
    trigger()!.click();
    await flushEffects();
    expect(optionLabels()).toEqual(hiddenLabels());

    trigger()!.click();
    strip().scrollLeft = strip().scrollWidth;
    strip().dispatchEvent(new Event('scroll'));
    await flushEffects();
    trigger()!.click();
    await flushEffects();
    expect(optionLabels()).toEqual(hiddenLabels());
    expect(optionLabels()).toContain('Category 1');

    act(() => render(null, container));
    container.remove();
    await mount(800, FEW_TABS_CONFIG);
    expect(trigger()).toBeNull();
  });

  it('marks a hidden active tab and selects, reveals, and focuses a hidden tab', async () => {
    await mount();
    strip().scrollLeft = strip().scrollWidth;
    strip().dispatchEvent(new Event('scroll'));
    await flushEffects();
    trigger()!.click();
    await flushEffects();

    const selected = container.querySelector<HTMLElement>('[role="option"][aria-selected="true"]');
    expect(selected?.textContent).toBe('Category 1');
    const target = Array.from(container.querySelectorAll<HTMLElement>('[role="option"]')).at(-1)!;
    const label = target.textContent;
    target.click();
    await flushEffects();

    expect(container.querySelector('[role="listbox"]')).toBeNull();
    const active = strip().querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
    expect(active?.textContent).toBe(label);
    expect(document.activeElement).toBe(active);
    const stripRect = strip().getBoundingClientRect();
    const activeRect = active!.getBoundingClientRect();
    expect(activeRect.left).toBeGreaterThanOrEqual(stripRect.left - 1);
    expect(activeRect.right).toBeLessThanOrEqual(stripRect.right + 1);
  });

  it('owns listbox keyboard navigation and dismisses one layer on Escape or outside pointerdown', async () => {
    await mount();
    trigger()!.click();
    await flushEffects();
    const listbox = container.querySelector<HTMLElement>('[role="listbox"]')!;
    expect(document.activeElement).toBe(listbox);
    const initial = listbox.getAttribute('aria-activedescendant');
    listbox.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await flushEffects();
    expect(listbox.getAttribute('aria-activedescendant')).not.toBe(initial);
    listbox.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    await flushEffects();
    const focusedOption = document.getElementById(listbox.getAttribute('aria-activedescendant')!);
    expect(focusedOption!.getBoundingClientRect().bottom)
      .toBeLessThanOrEqual(listbox.getBoundingClientRect().bottom + 1);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await flushEffects();
    expect(container.querySelector('[role="listbox"]')).toBeNull();
    expect(container.querySelector('.tokenpanel-shell')).not.toBeNull();

    trigger()!.click();
    await flushEffects();
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    await flushEffects();
    expect(container.querySelector('[role="listbox"]')).toBeNull();
  });

  it('removes an unnecessary chooser on resize and restores focus from its listbox', async () => {
    await mount(400, RESIZE_CONFIG);
    trigger()!.click();
    await flushEffects();
    expect(document.activeElement?.getAttribute('role')).toBe('listbox');

    const shell = container.querySelector<HTMLElement>('.tokenpanel-shell')!;
    // Widen by exactly the current overflow plus one pixel. All tabs fit only
    // after reclaiming the mounted trigger and its flex gap, exercising the
    // narrow hysteresis band where a current-clientWidth check gets stuck.
    const reclaimWidth = strip().scrollWidth - strip().clientWidth + 1;
    shell.style.width = `${shell.getBoundingClientRect().width + reclaimWidth}px`;
    await flushEffects();

    expect(trigger()).toBeNull();
    expect(document.activeElement?.getAttribute('role')).toBe('tab');
    expect(document.activeElement?.getAttribute('aria-selected')).toBe('true');
  });

  it('recomputes total overflow when tab content grows without changing the strip width', async () => {
    await mount(800, FEW_TABS_CONFIG);
    expect(trigger()).toBeNull();
    const firstTab = strip().querySelector<HTMLElement>('[role="tab"]')!;
    firstTab.append(' — a label that became much wider after fonts or badge content loaded'.repeat(4));
    await flushEffects();
    expect(trigger()).not.toBeNull();
  });
});
