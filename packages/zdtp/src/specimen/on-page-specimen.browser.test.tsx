// @vitest-environment browser

import { act } from 'preact/test-utils';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { __resetInstanceBindingsForTests } from '../index';
import {
  __resetPanelConfigForTests,
  configurePanel,
  panelRootId,
  storageKey_visible,
  type PanelConfig,
} from '../config/panel-config';
import { findElementsUsingToken, PANEL_EXCLUSION_SELECTOR } from '../highlight/find-elements';
import { __resetHostMutationsForTests } from '../host/host-mutations';
import { getDockKey, getDockSizeKey } from '../state/tweak-state';
import type { TabConfig } from '../tokens/tier-model';
import { flushEffects } from '../__tests__/_test-helpers';

const FONT_TAB: TabConfig = {
  id: 'font',
  label: 'Font',
  tiers: [
    {
      id: 'family',
      label: 'Family',
      items: [{
        id: 'body',
        cssVar: '--on-page-font-family',
        label: 'Body',
        default: 'inherit',
        type: { kind: 'text' },
      }],
    },
    {
      id: 'size',
      label: 'Scale',
      preview: 'size',
      items: [{
        id: 'body-md',
        cssVar: '--on-page-font-size',
        label: 'Body',
        default: '18px',
        type: { kind: 'length', step: 1, unit: 'px' },
      }],
    },
    {
      id: 'leading',
      label: 'Leading',
      preview: 'line-height',
      items: [{
        id: 'body-normal',
        cssVar: '--on-page-line-height',
        label: 'Body',
        default: '1.5',
        type: { kind: 'number', step: 0.1 },
      }],
    },
  ],
};

const CFG: PanelConfig = {
  storagePrefix: 'on-page-specimen-browser',
  consoleNamespace: 'onPageSpecimenBrowser',
  modalClassPrefix: 'on-page-specimen-browser-modal',
  schemaId: 'on-page-specimen-browser/v1',
  exportFilenameBase: 'on-page-specimen-browser',
  tabs: [FONT_TAB],
};

describe('Render on page specimen', () => {
  beforeEach(async () => {
    __resetInstanceBindingsForTests();
    __resetPanelConfigForTests();
    __resetHostMutationsForTests();
    localStorage.clear();
    document.body.innerHTML = '<main id="host-content">Host content</main>';
    const w = window as unknown as Record<string, unknown>;
    delete w.__zudoDesignTokenPanelLifecycle;
    delete w.__zudoDesignTokenPanelInstanceBindings;
    await import('../index');
    configurePanel(CFG);
  });

  afterEach(async () => {
    document.dispatchEvent(new CustomEvent('astro:before-swap'));
    await flushEffects();
    __resetHostMutationsForTests();
    __resetInstanceBindingsForTests();
    __resetPanelConfigForTests();
    localStorage.clear();
    document.body.innerHTML = '';
  });

  it('portals an inherited, read-only specimen before the host body and excludes it from probes', async () => {
    document.body.style.fontFamily = 'Arial';
    document.body.style.color = 'rgb(12, 34, 56)';
    document.documentElement.style.setProperty('--on-page-font-size', '18px');
    const host = document.getElementById('host-content')!;
    host.style.setProperty('--on-page-probe', 'red');

    const handle = configurePanel(CFG);
    handle.open();
    await flushEffects();

    const checkbox = document.querySelector<HTMLInputElement>('[aria-label="Render on page"]');
    expect(checkbox).not.toBeNull();
    await act(() => {
      checkbox!.click();
    });
    await flushEffects();

    const mount = document.querySelector<HTMLElement>('[data-zdtp-specimen]');
    expect(mount).not.toBeNull();
    expect(document.body.firstElementChild).toBe(mount);
    expect(mount!.classList.contains('tokenpanel-on-page-specimen')).toBe(true);
    expect(getComputedStyle(mount!).fontFamily).toBe(getComputedStyle(document.body).fontFamily);
    expect(getComputedStyle(mount!).color).toBe(getComputedStyle(document.body).color);
    expect(mount!.querySelector<HTMLInputElement>('input')).toBeNull();
    expect(mount!.querySelector('[data-testid="on-page-specimen-size-body-md"]')).not.toBeNull();

    const compactRow = document.querySelector('.tokenpanel-row--specimen-compact');
    expect(compactRow).not.toBeNull();
    expect(getComputedStyle(compactRow!.querySelector('.tokenpanel-specimen-size-text')!).display).toBe('none');

    const probeStyle = document.createElement('style');
    probeStyle.textContent = '.on-page-probe { color: var(--on-page-probe); }';
    document.head.appendChild(probeStyle);
    const probe = document.createElement('div');
    probe.className = 'on-page-probe';
    mount!.appendChild(probe);
    const result = findElementsUsingToken('--on-page-probe', { kind: 'color' });
    expect(result.elements).not.toContain(probe);
    expect(probe.closest(PANEL_EXCLUSION_SELECTOR)).toBe(mount);
    probe.remove();
    probeStyle.remove();
  });

  it('restores the prior dock mode on toggle-off and Astro navigation', async () => {
    localStorage.setItem(storageKey_visible(CFG), '1');
    localStorage.setItem(getDockKey(CFG), 'bottom');
    localStorage.setItem(getDockSizeKey(CFG), JSON.stringify({ right: 440, bottom: 300 }));
    const handle = configurePanel(CFG);
    handle.open();
    await flushEffects();

    const checkbox = document.querySelector<HTMLInputElement>('[aria-label="Render on page"]')!;
    expect(localStorage.getItem(getDockKey(CFG))).toBe('bottom');
    await act(() => checkbox.click());
    await flushEffects();
    expect(localStorage.getItem(getDockKey(CFG))).toBe('right');
    expect(document.querySelector('[data-zdtp-specimen]')).not.toBeNull();

    document.querySelector<HTMLElement>('.tokenpanel-close-btn')!.click();
    await flushEffects();
    expect(localStorage.getItem(getDockKey(CFG))).toBe('bottom');
    expect(document.querySelector('[data-zdtp-specimen]')).toBeNull();

    handle.open();
    await flushEffects();
    const reopenedCheckbox = document.querySelector<HTMLInputElement>('[aria-label="Render on page"]')!;
    expect(localStorage.getItem(getDockKey(CFG))).toBe('bottom');

    await act(() => reopenedCheckbox.click());
    await flushEffects();
    expect(localStorage.getItem(getDockKey(CFG))).toBe('right');
    expect(document.querySelector('[data-zdtp-specimen]')).not.toBeNull();

    await act(() => reopenedCheckbox.click());
    await flushEffects();
    expect(localStorage.getItem(getDockKey(CFG))).toBe('bottom');
    expect(document.querySelector('[data-zdtp-specimen]')).toBeNull();

    await act(() => reopenedCheckbox.click());
    await flushEffects();
    expect(localStorage.getItem(getDockKey(CFG))).toBe('right');
    document.dispatchEvent(new CustomEvent('astro:before-swap'));
    await flushEffects();
    expect(document.querySelector('[data-zdtp-specimen]')).toBeNull();
    expect(localStorage.getItem(getDockKey(CFG))).toBe('bottom');
    expect(document.getElementById(panelRootId(CFG))).toBeNull();

    document.dispatchEvent(new CustomEvent('astro:page-load'));
    await flushEffects();
    expect(localStorage.getItem(getDockKey(CFG))).toBe('bottom');
    expect(document.querySelector('[data-zdtp-specimen]')).toBeNull();
  });

  it('restores the prior dock mode and removes the portal when destroyed', async () => {
    localStorage.setItem(storageKey_visible(CFG), '1');
    localStorage.setItem(getDockKey(CFG), 'float');
    const handle = configurePanel(CFG);
    handle.open();
    await flushEffects();

    const checkbox = document.querySelector<HTMLInputElement>('[aria-label="Render on page"]')!;
    await act(() => checkbox.click());
    await flushEffects();
    expect(localStorage.getItem(getDockKey(CFG))).toBe('right');
    expect(document.querySelector('[data-zdtp-specimen]')).not.toBeNull();

    handle.destroy();
    await flushEffects();
    expect(localStorage.getItem(getDockKey(CFG))).toBe('float');
    expect(document.querySelector('[data-zdtp-specimen]')).toBeNull();
    expect(document.getElementById(panelRootId(CFG))).toBeNull();
  });
});
