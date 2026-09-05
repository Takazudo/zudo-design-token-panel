import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
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
const SECOND_CFG: PanelConfig = {
  ...CFG,
  storagePrefix: 'dock-mode-browser-second',
  consoleNamespace: 'dockModeBrowserSecond',
  modalClassPrefix: 'dock-mode-browser-second-modal',
  schemaId: 'dock-mode-browser-second/v1',
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

function useModeShortcut(key: string): void {
  document.dispatchEvent(new KeyboardEvent('keydown', { key, altKey: true, bubbles: true }));
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

  function inlineMode(label: string): HTMLElement {
    const control = shell().querySelector<HTMLElement>(
      `.tokenpanel-header > .tokenpanel-dock-modes [aria-label^="${label} ("]`,
    );
    if (!control) throw new Error(`inline dock control not found: ${label}`);
    return control;
  }

  function expectMenuClosed(): void {
    expect(document.querySelector('.tokenpanel-actions-popover')).toBeNull();
    const trigger = document.querySelector('.tokenpanel-actions-menu-btn');
    if (trigger) expect(trigger.getAttribute('aria-expanded')).toBe('false');
  }

  async function pointerMode(label: string): Promise<void> {
    expectMenuClosed();
    await page.elementLocator(inlineMode(label)).click();
    await settle();
    expectMenuClosed();
  }

  async function mountFloating(): Promise<void> {
    localStorage.setItem(storageKey_visible(CFG), '1');
    localStorage.setItem(getOpenKey(CFG), '1');
    localStorage.setItem(getPositionKey(CFG), JSON.stringify({ top: 31, left: 47 }));
    localStorage.setItem(getSizeKey(CFG), JSON.stringify({ width: 700, height: 500 }));
    localStorage.setItem(getDockSizeKey(CFG), JSON.stringify({ right: 440, bottom: 340 }));
    document.dispatchEvent(new CustomEvent('astro:page-load'));
    await settle();
  }

  for (const [mode, label] of [
    ['float', 'Float panel'],
    ['bottom', 'Dock panel bottom'],
    ['mini', 'Mini panel'],
  ] as const) {
    it(`escapes right to ${mode} by real inline pointer input with the menu closed`, async () => {
      document.body.style.setProperty('margin-right', '11px', 'important');
      document.body.style.setProperty('margin-bottom', '13px', 'important');
      document.documentElement.style.setProperty('--zdtp-dock-inset-right', '17px', 'important');
      await mountFloating();
      await pointerMode('Dock panel right');
      expect(shell().classList.contains('is-docked-right')).toBe(true);
      expect(shell().getBoundingClientRect().width).toBe(440);
      expect(document.body.style.marginRight).toBe('440px');
      expect(localStorage.getItem(getDockKey(CFG))).toBe('right');

      // Exercise persisted right mode AND size through the actual lifecycle.
      // This is remount coverage; the manager separately verifies page.reload().
      document.dispatchEvent(new CustomEvent('astro:before-swap'));
      await settle();
      expect(document.getElementById(panelRootId(CFG))).toBeNull();
      document.dispatchEvent(new CustomEvent('astro:page-load'));
      await settle();
      expect(shell().classList.contains('is-docked-right')).toBe(true);
      expect(shell().getBoundingClientRect().width).toBe(440);
      expect(JSON.parse(localStorage.getItem(getDockSizeKey(CFG))!)).toEqual({ right: 440, bottom: 340 });
      expect(inlineMode('Dock panel right').getAttribute('aria-pressed')).toBe('true');

      await pointerMode(label);
      expect(localStorage.getItem(getDockKey(CFG))).toBe(mode);
      expect(document.body.style.marginRight).toBe('11px');
      expect(document.body.style.getPropertyPriority('margin-right')).toBe('important');
      expect(document.documentElement.style.getPropertyValue('--zdtp-dock-inset-right')).toBe('17px');
      expect(document.documentElement.style.getPropertyPriority('--zdtp-dock-inset-right')).toBe('important');
      expect(document.body.style.marginBottom).toBe(mode === 'bottom' ? '340px' : '13px');
      if (mode === 'mini') {
        expect(document.querySelector('.tokenpanel-shell')).toBeNull();
        expect(document.querySelector('.tokenpanel-mini-pill')).not.toBeNull();
      } else {
        expect(shell().classList.contains('is-docked-right')).toBe(false);
        expect(shell().classList.contains('is-docked-bottom')).toBe(mode === 'bottom');
        expect(inlineMode(label).getAttribute('aria-pressed')).toBe('true');
        if (mode === 'bottom') {
          expect(shell().getBoundingClientRect().height).toBe(340);
          expect(shell().getBoundingClientRect().bottom).toBe(window.innerHeight);
          await pointerMode('Float panel');
        } else {
          expect(shell().getBoundingClientRect().left).toBe(47);
          expect(shell().getBoundingClientRect().width).toBe(700);
        }
      }
      expect(document.body.style.marginBottom).toBe('13px');
      expect(document.body.style.getPropertyPriority('margin-bottom')).toBe('important');
    });
  }

  it('activates the visible inline switch with Enter and Space', async () => {
    await mountFloating();
    await pointerMode('Dock panel right');
    for (const key of ['{Enter}', ' ']) {
      const control = inlineMode('Float panel');
      expect(control.getBoundingClientRect().width).toBeGreaterThanOrEqual(24);
      control.focus();
      await userEvent.keyboard(key);
      await settle();
      expect(localStorage.getItem(getDockKey(CFG))).toBe('float');
      expectMenuClosed();
      await pointerMode('Dock panel right');
    }
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
    document.querySelector<HTMLElement>('.tokenpanel-actions-menu-btn')!.click();
    await settle();
    expect(document.querySelector('.tokenpanel-dock-modes.is-compact')).not.toBeNull();
    document.querySelector<HTMLElement>('.tokenpanel-actions-menu-btn')!.click();
    await settle();

    const rightResize = document.querySelector<HTMLElement>(
      '.tokenpanel-dock-resize-handle.is-right',
    )!;
    const resizeStart = rightResize.getBoundingClientRect().left;
    rightResize.dispatchEvent(
      new MouseEvent('mousedown', { clientX: resizeStart, bubbles: true, cancelable: true }),
    );
    document.dispatchEvent(
      new MouseEvent('mousemove', {
        clientX: resizeStart - 60,
        bubbles: true,
        cancelable: true,
      }),
    );
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    await settle();
    expect(shell().getBoundingClientRect().width).toBe(500);
    expect(document.body.style.marginRight).toBe('500px');
    expect(JSON.parse(localStorage.getItem(getDockSizeKey(CFG))!)).toEqual({
      right: 500,
      bottom: 340,
    });

    useModeShortcut('3');
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

    selectMode('Mini panel');
    await settle();
    expect(localStorage.getItem(getDockKey(CFG))).toBe('mini');
    expect(document.querySelector('.tokenpanel-shell')).toBeNull();
    expect(document.querySelector('.tokenpanel-mini-pill')).not.toBeNull();

    document.querySelector<HTMLElement>('[aria-label="Expand panel"]')!.click();
    await settle();
    expect(localStorage.getItem(getDockKey(CFG))).toBe('float');
    expect(shell().getBoundingClientRect().left).toBe(47);

    selectMode('Dock panel right');
    await settle();
    expect(document.body.style.marginRight).toBe('500px');

    document.querySelector<HTMLElement>('.tokenpanel-close-btn')!.click();
    await settle();
    expect(document.querySelector('.tokenpanel-shell')).toBeNull();
    expect(document.body.style.getPropertyValue('margin-right')).toBe('11px');
    expect(document.body.style.getPropertyPriority('margin-right')).toBe('important');

    handle.open();
    await settle();
    expect(shell().classList.contains('is-docked-right')).toBe(true);
    expect(document.body.style.marginRight).toBe('500px');

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

  it('routes mini-mode shortcuts only to the pill that most recently claimed ownership', async () => {
    const secondHandle = configurePanel(SECOND_CFG);
    localStorage.setItem(storageKey_visible(CFG), '1');
    localStorage.setItem(getOpenKey(CFG), '1');
    localStorage.setItem(getDockKey(CFG), 'mini');
    localStorage.setItem(storageKey_visible(SECOND_CFG), '1');
    localStorage.setItem(getOpenKey(SECOND_CFG), '1');
    localStorage.setItem(getDockKey(SECOND_CFG), 'mini');

    document.dispatchEvent(new CustomEvent('astro:page-load'));
    await settle();

    const firstPill = document.querySelector<HTMLElement>(
      `#${panelRootId(CFG)} .tokenpanel-mini-pill`,
    );
    const secondPill = document.querySelector<HTMLElement>(
      `#${panelRootId(SECOND_CFG)} .tokenpanel-mini-pill`,
    );
    if (!firstPill || !secondPill) throw new Error('both mini pills must be mounted');

    firstPill.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    useModeShortcut('1');
    await settle();
    expect(localStorage.getItem(getDockKey(CFG))).toBe('float');
    expect(localStorage.getItem(getDockKey(SECOND_CFG))).toBe('mini');

    secondPill.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    useModeShortcut('2');
    await settle();
    expect(localStorage.getItem(getDockKey(CFG))).toBe('float');
    expect(localStorage.getItem(getDockKey(SECOND_CFG))).toBe('right');

    secondHandle.destroy();
  });
});
