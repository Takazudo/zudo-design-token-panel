import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  __resetPanelConfigForTests,
  configurePanel,
  panelRootId,
  storageKey_visible,
  type PanelConfig,
  type PanelInstanceHandle,
} from '../config/panel-config';
import {
  getDockKey,
  getDockSizeKey,
  getOpenKey,
  getPositionKey,
  getSizeKey,
} from '../state/tweak-state';
import { __resetHostMutationsForTests } from '../host/host-mutations';
import { FIXTURE_TABS } from './_test-helpers';

const CFG: PanelConfig = {
  storagePrefix: 'dock-mode-browser',
  consoleNamespace: 'dockModeBrowser',
  modalClassPrefix: 'dock-mode-browser-modal',
  schemaId: 'dock-mode-browser/v1',
  exportFilenameBase: 'dock-mode-browser',
  tabs: FIXTURE_TABS,
};

async function settle(): Promise<void> {
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
  await new Promise<void>((resolve) => setTimeout(resolve, 50));
}

function shell(): HTMLElement {
  const value = document.querySelector<HTMLElement>(`#${panelRootId(CFG)} .tokenpanel-shell`);
  if (!value) throw new Error('panel shell not mounted');
  return value;
}

function selectMode(label: string): void {
  const control = document.querySelector<HTMLElement>(`[aria-label^="${label} "]`);
  if (!control) throw new Error(`dock control not found: ${label}`);
  control.click();
}

describe('dock modes', () => {
  let handle: PanelInstanceHandle;

  beforeEach(async () => {
    __resetPanelConfigForTests();
    localStorage.clear();
    document.body.innerHTML = '';
    document.body.removeAttribute('style');
    document.documentElement.removeAttribute('style');
    const adapterWindow = window as unknown as Record<string, unknown>;
    delete adapterWindow.__zudoDesignTokenPanelAdapter;
    delete adapterWindow.__zudoDesignTokenPanelLifecycle;
    delete adapterWindow.__zudoDesignTokenPanelInstanceBindings;
    const index = await import('../index');
    index.__resetInstanceBindingsForTests();
    handle = configurePanel(CFG);
  });

  afterEach(async () => {
    document.dispatchEvent(new CustomEvent('astro:before-swap'));
    await settle();
    __resetHostMutationsForTests();
    __resetPanelConfigForTests();
    localStorage.clear();
    document.body.innerHTML = '';
  });

  it('renders and persists float/right/bottom geometry, reflows the host, and releases on Astro swap', async () => {
    document.body.style.setProperty('margin-right', '11px', 'important');
    document.documentElement.style.setProperty(
      '--zdtp-dock-inset-right',
      '17px',
      'important',
    );
    localStorage.setItem(storageKey_visible(CFG), '1');
    localStorage.setItem(getOpenKey(CFG), '1');
    localStorage.setItem(getPositionKey(CFG), JSON.stringify({ top: 31, left: 47 }));
    localStorage.setItem(getSizeKey(CFG), JSON.stringify({ width: 700, height: 500 }));
    localStorage.setItem(getDockKey(CFG), 'right');
    localStorage.setItem(getDockSizeKey(CFG), JSON.stringify({ right: 440, bottom: 340 }));

    document.dispatchEvent(new CustomEvent('astro:page-load'));
    await settle();

    expect(shell().classList.contains('is-docked-right')).toBe(true);
    expect(shell().getBoundingClientRect().width).toBe(440);
    expect(shell().getBoundingClientRect().right).toBe(window.innerWidth);
    expect(document.body.style.marginRight).toBe('440px');
    expect(document.documentElement.style.getPropertyValue('--zdtp-dock-inset-right')).toBe(
      '440px',
    );
    // 440px exercises the shell container query, independent of viewport width.
    expect(
      getComputedStyle(document.querySelector<HTMLElement>('.tokenpanel-action-link')!).display,
    ).toBe('none');

    selectMode('Dock panel bottom');
    await settle();
    expect(localStorage.getItem(getDockKey(CFG))).toBe('bottom');
    expect(shell().classList.contains('is-docked-bottom')).toBe(true);
    expect(shell().getBoundingClientRect().height).toBe(340);
    expect(shell().getBoundingClientRect().bottom).toBe(window.innerHeight);
    expect(document.body.style.getPropertyValue('margin-right')).toBe('11px');
    expect(document.body.style.getPropertyPriority('margin-right')).toBe('important');
    expect(document.body.style.marginBottom).toBe('340px');

    selectMode('Float panel');
    await settle();
    expect(shell().classList.contains('is-docked-bottom')).toBe(false);
    expect(shell().getBoundingClientRect().left).toBe(47);
    expect(shell().getBoundingClientRect().top).toBe(31);
    expect(shell().getBoundingClientRect().width).toBe(700);
    expect(document.body.style.marginBottom).toBe('');

    selectMode('Dock panel right');
    await settle();
    expect(document.body.style.marginRight).toBe('440px');

    document.querySelector<HTMLElement>('.tokenpanel-close-btn')!.click();
    await settle();
    expect(document.querySelector('.tokenpanel-shell')).toBeNull();
    expect(document.body.style.getPropertyValue('margin-right')).toBe('11px');
    expect(document.body.style.getPropertyPriority('margin-right')).toBe('important');

    handle.open();
    await settle();
    expect(shell().classList.contains('is-docked-right')).toBe(true);
    expect(document.body.style.marginRight).toBe('440px');

    document.dispatchEvent(new CustomEvent('astro:before-swap'));
    await settle();
    expect(document.getElementById(panelRootId(CFG))).toBeNull();
    expect(document.body.style.getPropertyValue('margin-right')).toBe('11px');
    expect(document.body.style.getPropertyPriority('margin-right')).toBe('important');
    expect(document.documentElement.style.getPropertyValue('--zdtp-dock-inset-right')).toBe('17px');
    expect(document.documentElement.style.getPropertyPriority('--zdtp-dock-inset-right')).toBe(
      'important',
    );
  });
});
