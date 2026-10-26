// @vitest-environment browser

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, renderZr, unmountZrIn } from '../zr/test-utils';
import DesignTokenTweakPanel from '../panel';
import { __resetPanelConfigForTests, configurePanel, type PanelConfig } from '../config/panel-config';
import { getOpenKey, getPositionKey, getSizeKey } from '../state/tweak-state';
import type { TabConfig } from '../tokens/tier-model';
import { FIXTURE_PANEL_CONFIG, flushEffects } from '../__tests__/_test-helpers';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — ?inline is a Vite-specific query not typed in tsconfig
const panelCssModule = import('../styles/panel.css?inline');

const GAP = '--undo-browser-gap';
const SURFACE = '--undo-browser-surface';

const THEME_TAB: TabConfig = {
  id: 'theme',
  label: 'Theme',
  tiers: [
    {
      id: 'raw',
      label: 'Raw',
      items: [
        { id: 'gap', cssVar: GAP, label: 'Gap', default: '20px', type: { kind: 'length', step: 1, unit: 'px' } },
        {
          id: 'surface',
          cssVar: SURFACE,
          label: 'Surface',
          default: '#abcdef',
          type: { kind: 'color' },
          modes: { light: '#ffffff', dark: '#111111' },
        },
      ],
    },
  ],
};

const CFG: PanelConfig = {
  ...FIXTURE_PANEL_CONFIG,
  storagePrefix: 'generic-tab-undo-browser',
  consoleNamespace: 'genericTabUndoBrowser',
  modalClassPrefix: 'generic-tab-undo-browser-modal',
  schemaId: 'generic-tab-undo-browser/v1',
  exportFilenameBase: 'generic-tab-undo-browser',
  tabs: [THEME_TAB],
};

let container: HTMLDivElement;
let panelStyle: HTMLStyleElement;

const inline = (name: string) => document.documentElement.style.getPropertyValue(name);

function pressUndo(shiftKey = false): void {
  document.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'z', metaKey: true, shiftKey, bubbles: true, cancelable: true }),
  );
}

beforeEach(async () => {
  __resetPanelConfigForTests();
  localStorage.clear();
  document.documentElement.removeAttribute('style');
  panelStyle = document.createElement('style');
  panelStyle.textContent = ((await panelCssModule) as { default: string }).default;
  document.head.appendChild(panelStyle);

  configurePanel(CFG);
  localStorage.setItem(getOpenKey(CFG), '1');
  localStorage.setItem(getPositionKey(CFG), JSON.stringify({ top: 20, left: 20 }));
  localStorage.setItem(getSizeKey(CFG), JSON.stringify({ width: 760, height: 560 }));
  container = document.createElement('div');
  document.body.appendChild(container);
  act(() => renderZr(() => <DesignTokenTweakPanel instanceConfig={CFG} />, container));
  await flushEffects();
});

afterEach(async () => {
  await flushEffects();
  act(() => unmountZrIn(container));
  container.remove();
  panelStyle.remove();
  document.documentElement.removeAttribute('style');
  localStorage.clear();
  __resetPanelConfigForTests();
});

describe('undo of a generic (manifest) tab edit', () => {
  it('removes the undone inline value so the stylesheet default applies again', async () => {
    const input = container.querySelector<HTMLInputElement>(`[aria-label="${GAP} value"]`);
    if (!input) throw new Error('generic tab input not mounted');
    const surfaceBefore = inline(SURFACE);
    const schemeBefore = inline('color-scheme');

    act(() => {
      input.value = '3';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await flushEffects();
    expect(inline(GAP)).toBe('3px');
    expect(container.querySelector('.tokenpanel-history-count')?.textContent).toBe('1/1');

    pressUndo();
    await flushEffects();
    expect(container.querySelector('.tokenpanel-history-count')?.textContent).toBe('0/1');
    expect(input.value).toBe('20');
    expect(inline(GAP)).toBe('');
    expect(inline(SURFACE)).toBe(surfaceBefore);
    expect(inline('color-scheme')).toBe(schemeBefore);

    pressUndo(true);
    await flushEffects();
    expect(inline(GAP)).toBe('3px');
  });
});
