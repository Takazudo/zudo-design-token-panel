/**
 * Browser-level bulk transaction coverage. Chromium is needed here because
 * the assertion observes the real document-element inline style after the
 * transaction applies its complete patch.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import type { PanelConfig } from '../config/panel-config';
import type { TabConfig } from '../tokens/tier-model';
import DesignTokenTweakPanel from '../panel';
import { TweakHistory } from '../state/history';
import { getOpenKey, getPositionKey, getSizeKey } from '../state/tweak-state';
import { FIXTURE_PANEL_CONFIG, flushEffects } from '../__tests__/_test-helpers';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore Vite's inline CSS query is only available to the browser test.
const panelCssModule = import('../styles/panel.css?inline');

const BULK_TAB: TabConfig = {
  id: 'spacing',
  label: 'Spacing',
  tiers: [{
    id: 'bulk-scale',
    label: 'Bulk scale',
    items: Array.from({ length: 7 }, (_, index) => ({
      id: `bulk-${index}`,
      cssVar: `--bulk-${index}`,
      label: `Bulk ${index}`,
      default: `${index + 1}rem`,
      type: { kind: 'length' as const, step: 0.125, unit: 'rem' as const },
    })),
  }],
};

const CONFIG: PanelConfig = {
  ...FIXTURE_PANEL_CONFIG,
  tabs: FIXTURE_PANEL_CONFIG.tabs.map((tab) => tab.id === 'spacing' ? BULK_TAB : tab),
};

let container: HTMLDivElement;
let injectedStyle: HTMLStyleElement | undefined;

async function injectPanelCss(): Promise<void> {
  const css = ((await panelCssModule) as { default: string }).default;
  injectedStyle = document.createElement('style');
  injectedStyle.textContent = css;
  document.head.appendChild(injectedStyle);
}

describe('bulk action bar transaction', () => {
  beforeEach(async () => {
    localStorage.clear();
    document.documentElement.removeAttribute('style');
    await injectPanelCss();
    localStorage.setItem(getOpenKey(CONFIG), '1');
    localStorage.setItem(getPositionKey(CONFIG), JSON.stringify({ top: 20, left: 20 }));
    localStorage.setItem(getSizeKey(CONFIG), JSON.stringify({ width: 900, height: 560 }));
    container = document.createElement('div');
    document.body.appendChild(container);
    act(() => render(<DesignTokenTweakPanel instanceConfig={CONFIG} />, container));
    await flushEffects();
  });

  afterEach(async () => {
    await flushEffects();
    act(() => render(null, container));
    container.remove();
    injectedStyle?.remove();
    injectedStyle = undefined;
    document.documentElement.removeAttribute('style');
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('applies seven selected rows with one persisted write and updates every inline var', async () => {
    const selectAll = container.querySelector<HTMLInputElement>('[data-testid="bulk-select-tier-bulk-scale"]');
    expect(selectAll).not.toBeNull();
    act(() => selectAll?.click());
    await flushEffects();

    expect(container.querySelector('[data-testid="bulk-action-bar"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="bulk-selection-count"]')?.textContent).toBe('7 selected');

    const multiply = container.querySelector<HTMLInputElement>('[data-testid="bulk-multiply"]');
    expect(multiply).not.toBeNull();
    act(() => {
      multiply!.value = '1.1';
      multiply!.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await flushEffects();

    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const historyRecord = vi.spyOn(TweakHistory.prototype, 'record');
    const apply = container.querySelector<HTMLElement>('[data-testid="bulk-apply"]');
    expect(apply).not.toBeNull();
    act(() => apply?.click());
    await flushEffects();

    expect(setItem).toHaveBeenCalledTimes(1);
    expect(historyRecord).toHaveBeenCalledTimes(1);
    expect(historyRecord.mock.calls[0][0].reason).toBe('bulk');
    for (const item of BULK_TAB.tiers[0].items) {
      expect(document.documentElement.style.getPropertyValue(item.cssVar)).not.toBe('');
    }
  });
});
