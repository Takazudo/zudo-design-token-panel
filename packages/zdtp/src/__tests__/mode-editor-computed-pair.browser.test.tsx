// @vitest-environment browser
/**
 * UI confirm for #975: after a ColorField edit on a mounted
 * DesignTokenTweakPanel, getComputedStyle under light and dark matches the
 * preserved `light-dark()` pair. Apply-path coverage stays in
 * mode-aware-runtime.browser.test.ts — mixing the two setups would tangle
 * that file's document-target lifecycle.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import DesignTokenTweakPanel from '../panel';
import {
  __resetPanelConfigForTests,
  configurePanel,
  ownsColorScheme,
  type PanelConfig,
} from '../config/panel-config';
import { getOpenKey, getPositionKey, getSizeKey } from '../state/tweak-state';
import type { TabConfig } from '../tokens/tier-model';
import { FIXTURE_PANEL_CONFIG, flushEffects } from './_test-helpers';

// @ts-ignore — ?inline is a Vite-specific query not typed in tsconfig
const panelCssModule = import('../styles/panel.css?inline');

const TOKEN = '--mode-confirm-surface';
const LIGHT = '#0c2238';
const DARK = '#d2dce6';
const LIGHT_RGB = 'rgb(12, 34, 56)';
const DARK_RGB = 'rgb(210, 220, 230)';
const EDITED = '#123456';
const EDITED_RGB = 'rgb(18, 52, 86)';

const GENERIC_TAB: TabConfig = {
  id: 'theme',
  label: 'Theme',
  tiers: [{
    id: 'raw',
    label: 'Raw',
    items: [{
      id: 'surface',
      cssVar: TOKEN,
      label: 'Surface',
      default: '#abcdef',
      type: { kind: 'color' },
      modes: { light: LIGHT, dark: DARK },
    }],
  }],
};

const CFG: PanelConfig = {
  ...FIXTURE_PANEL_CONFIG,
  storagePrefix: 'mode-editor-confirm',
  consoleNamespace: 'modeEditorConfirm',
  modalClassPrefix: 'mode-editor-confirm-modal',
  schemaId: 'mode-editor-confirm/v1',
  exportFilenameBase: 'mode-editor-confirm',
  tabs: [GENERIC_TAB],
};

let container: HTMLDivElement;
let sample: HTMLDivElement;
let panelStyle: HTMLStyleElement;
let restoreSetProperty: (() => void) | undefined;

function computedFor(scheme: 'light' | 'dark'): string {
  sample.style.colorScheme = scheme;
  return getComputedStyle(sample).backgroundColor;
}

function expectPair(light: string, dark: string): void {
  expect(computedFor('light')).toBe(light);
  expect(computedFor('dark')).toBe(dark);
}

function setHex(input: HTMLInputElement, value: string): void {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
  descriptor?.set?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function watchRootColorScheme(): string[] {
  const rootStyle = document.documentElement.style;
  const original = rootStyle.setProperty.bind(rootStyle);
  const writes: string[] = [];
  rootStyle.setProperty = ((name: string, value: string | null, priority?: string) => {
    if (name === 'color-scheme') writes.push(String(value ?? ''));
    original(name, value, priority);
  }) as typeof rootStyle.setProperty;
  restoreSetProperty = () => {
    rootStyle.setProperty = original;
    restoreSetProperty = undefined;
  };
  return writes;
}

beforeEach(async () => {
  __resetPanelConfigForTests();
  localStorage.clear();
  document.documentElement.removeAttribute('style');
  panelStyle = document.createElement('style');
  panelStyle.textContent = ((await panelCssModule) as { default: string }).default;
  document.head.appendChild(panelStyle);

  sample = document.createElement('div');
  sample.style.backgroundColor = `var(${TOKEN})`;
  document.body.append(sample);

  configurePanel(CFG);
  localStorage.setItem(getOpenKey(CFG), '1');
  localStorage.setItem(getPositionKey(CFG), JSON.stringify({ top: 20, left: 20 }));
  localStorage.setItem(getSizeKey(CFG), JSON.stringify({ width: 760, height: 560 }));
  container = document.createElement('div');
  document.body.appendChild(container);
  act(() => {
    render(<DesignTokenTweakPanel instanceConfig={CFG} />, container);
  });
  await flushEffects();
});

afterEach(async () => {
  restoreSetProperty?.();
  await flushEffects();
  act(() => render(null, container));
  container.remove();
  sample.remove();
  panelStyle.remove();
  document.documentElement.removeAttribute('style');
  localStorage.clear();
  __resetPanelConfigForTests();
});

describe('#975 — computed pair after a UI edit', () => {
  it('edits one ColorField side, keeps the other, and Reset restores the manifest pair', async () => {
    expectPair(LIGHT_RGB, DARK_RGB);
    const ownedBefore = ownsColorScheme(CFG.storagePrefix);

    const lightSwatch = container.querySelector<HTMLElement>(
      '[data-mode="light"] [data-testid="color-field-swatch"]',
    );
    if (!lightSwatch) throw new Error('light ColorField swatch not found');
    act(() => {
      lightSwatch.click();
    });
    await flushEffects();

    const hexInput = container.querySelector<HTMLInputElement>(
      '.tokenpanel-color-picker-hex-input',
    );
    if (!hexInput) throw new Error('color picker hex input not found');

    const colorSchemeWrites = watchRootColorScheme();
    act(() => {
      setHex(hexInput, EDITED);
    });
    await flushEffects();

    expect(colorSchemeWrites).toEqual([]);
    expect(ownsColorScheme(CFG.storagePrefix)).toBe(ownedBefore);
    expectPair(EDITED_RGB, DARK_RGB);
    restoreSetProperty?.();

    const close = container.querySelector<HTMLElement>('.tokenpanel-color-picker-close-btn');
    if (close) {
      act(() => {
        close.click();
      });
      await flushEffects();
    }

    const reset = Array.from(container.querySelectorAll<HTMLElement>('[data-zdtp-action="reset"]'))
      .find((el) => el.textContent === 'Reset');
    if (!reset) throw new Error('Reset action not found');
    act(() => {
      reset.click();
    });
    await flushEffects();

    expectPair(LIGHT_RGB, DARK_RGB);
    expect(ownsColorScheme(CFG.storagePrefix)).toBe(ownedBefore);
  });
});
