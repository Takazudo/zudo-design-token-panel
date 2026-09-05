// @vitest-environment browser
/**
 * Mini dock + ghost-when-idle browser coverage.
 *
 * The real Chromium project is required here for fixed positioning, CSS
 * opacity, and the panel's layer/pointer event wiring. The test stays focused
 * on the S4b surface; changed-state and history controls are intentionally
 * represented by MiniPill's extension slots in later features.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import DesignTokenTweakPanel from '../panel';
import {
  getDockKey,
  getDockSizeKey,
  getOpenKey,
  getPositionKey,
  getSizeKey,
} from '../state/tweak-state';
import {
  FIXTURE_PANEL_CONFIG,
  flushEffects,
} from './_test-helpers';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — ?inline is a Vite-specific query not typed in tsconfig
const panelCssModule = import('../styles/panel.css?inline');

const CFG = FIXTURE_PANEL_CONFIG;
const GHOST_KEY = `${CFG.storagePrefix}-ghost`;

let container: HTMLDivElement;
let injectedStyle: HTMLStyleElement | null = null;

async function injectPanelCss(): Promise<void> {
  const panelCss: string = ((await panelCssModule) as { default: string }).default;
  injectedStyle = document.createElement('style');
  injectedStyle.textContent = panelCss;
  document.head.appendChild(injectedStyle);
}

async function mountPanel(options: { width?: number; dock?: string } = {}): Promise<void> {
  localStorage.setItem(getOpenKey(CFG), '1');
  localStorage.setItem(getPositionKey(CFG), JSON.stringify({ top: 20, left: 20 }));
  localStorage.setItem(getSizeKey(CFG), JSON.stringify({ width: options.width ?? 700, height: 400 }));
  if (options.dock) localStorage.setItem(getDockKey(CFG), options.dock);
  localStorage.setItem(getDockSizeKey(CFG), JSON.stringify({ right: 440, bottom: 340 }));

  container = document.createElement('div');
  document.body.appendChild(container);
  act(() => {
    render(<DesignTokenTweakPanel instanceConfig={CFG} />, container);
  });
  await flushEffects();
}

function shell(): HTMLElement {
  const value = container.querySelector<HTMLElement>('.tokenpanel-shell');
  if (!value) throw new Error('panel shell not mounted');
  return value;
}

function dispatchPointerMoveOutside(): void {
  document.body.dispatchEvent(new PointerEvent('pointermove', { bubbles: true }));
}

function useModeShortcut(key: string): void {
  document.dispatchEvent(
    new KeyboardEvent('keydown', { key, altKey: true, bubbles: true, cancelable: true }),
  );
}

async function waitForGhost(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 725));
}

beforeEach(async () => {
  localStorage.clear();
  document.body.innerHTML = '';
  await injectPanelCss();
});

afterEach(async () => {
  vi.restoreAllMocks();
  await flushEffects();
  if (container) {
    act(() => render(null, container));
    container.remove();
  }
  injectedStyle?.remove();
  injectedStyle = null;
  localStorage.clear();
});

describe('mini pill', () => {
  it('replaces the full shell and expands back to the previous full dock mode', async () => {
    await mountPanel({ dock: 'right' });

    expect(shell().classList.contains('is-docked-right')).toBe(true);
    const miniMode = container.querySelector<HTMLElement>('[aria-label^="Mini panel "]');
    if (!miniMode) throw new Error('mini mode control not found');
    miniMode.click();
    await flushEffects();

    expect(container.querySelector('.tokenpanel-shell')).toBeNull();
    const pill = container.querySelector<HTMLElement>('.tokenpanel-mini-pill');
    expect(pill).not.toBeNull();
    expect(pill?.textContent).toContain('zdtp');
    expect(pill?.textContent).toContain('changes');
    expect(pill?.querySelector('[data-mini-pill-slot="changed-count"]')).not.toBeNull();
    expect(pill?.querySelector('[data-mini-pill-slot="undo"]')).not.toBeNull();
    expect(pill?.querySelector('[aria-label="Apply changes"]')).not.toBeNull();

    const expand = pill?.querySelector<HTMLElement>('[aria-label="Expand panel"]');
    if (!expand) throw new Error('mini-pill expand control not found');
    expand.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await flushEffects();

    expect(localStorage.getItem(getDockKey(CFG))).toBe('right');
    expect(shell().classList.contains('is-docked-right')).toBe(true);
  });

  it('uses Alt+1 through Alt+3 to leave mini and persists each mode once', async () => {
    await mountPanel({ dock: 'mini' });
    const setItem = vi.spyOn(Storage.prototype, 'setItem');

    for (const [key, mode] of [
      ['1', 'float'],
      ['2', 'right'],
      ['3', 'bottom'],
    ] as const) {
      setItem.mockClear();
      useModeShortcut(key);
      await flushEffects();

      expect(localStorage.getItem(getDockKey(CFG))).toBe(mode);
      expect(container.querySelector('.tokenpanel-mini-pill')).toBeNull();
      expect(container.querySelector('.tokenpanel-shell')).not.toBeNull();
      expect(
        setItem.mock.calls.filter(([storageKey]) => storageKey === getDockKey(CFG)),
      ).toHaveLength(1);

      useModeShortcut('4');
      await flushEffects();
      expect(container.querySelector('.tokenpanel-mini-pill')).not.toBeNull();
    }

    setItem.mockClear();
    useModeShortcut('4');
    await flushEffects();
    expect(
      setItem.mock.calls.filter(([storageKey]) => storageKey === getDockKey(CFG)),
    ).toHaveLength(0);
  });

  it('persists the ghost toggle in the tabbar and exposes it in the narrow kebab', async () => {
    await mountPanel({ width: 700 });

    const tabbarToggle = container.querySelector<HTMLInputElement>('.tokenpanel-ghost-idle-checkbox');
    if (!tabbarToggle) throw new Error('tabbar ghost toggle not found');
    expect(tabbarToggle.checked).toBe(false);
    tabbarToggle.click();
    expect(localStorage.getItem(GHOST_KEY)).toBe('1');
    expect(tabbarToggle.checked).toBe(true);

    act(() => render(null, container));
    container.remove();
    await mountPanel({ width: 400 });
    expect(container.querySelector<HTMLInputElement>('.tokenpanel-ghost-idle-checkbox')?.checked).toBe(
      true,
    );
    const kebab = container.querySelector<HTMLElement>('.tokenpanel-actions-menu-btn');
    if (!kebab) throw new Error('kebab control not found');
    kebab.click();
    await flushEffects();
    expect(
      container.querySelector('.tokenpanel-actions-popover .tokenpanel-ghost-idle-toggle'),
    ).not.toBeNull();
  });
});

describe('ghost when idle', () => {
  it('fades after 700ms outside the shell and restores on pointerenter', async () => {
    localStorage.setItem(GHOST_KEY, '1');
    await mountPanel();
    const currentShell = shell();
    dispatchPointerMoveOutside();

    await new Promise<void>((resolve) => setTimeout(resolve, 650));
    expect(currentShell.classList.contains('is-ghosted')).toBe(false);
    await waitForGhost();
    expect(currentShell.classList.contains('is-ghosted')).toBe(true);
    expect(getComputedStyle(currentShell).opacity).toBe('0.35');

    currentShell.dispatchEvent(new Event('pointerenter', { bubbles: false }));
    expect(currentShell.classList.contains('is-ghosted')).toBe(false);
  });

  it('suppresses ghosting while a compact actions layer is open', async () => {
    localStorage.setItem(GHOST_KEY, '1');
    await mountPanel({ width: 400 });
    const currentShell = shell();
    const kebab = container.querySelector<HTMLElement>('.tokenpanel-actions-menu-btn');
    if (!kebab) throw new Error('kebab control not found');
    kebab.click();
    await flushEffects();
    expect(container.querySelector('.tokenpanel-actions-popover')).not.toBeNull();

    dispatchPointerMoveOutside();
    await waitForGhost();
    expect(currentShell.classList.contains('is-ghosted')).toBe(false);
  });

  it('does not ghost while focus is within the shell and resumes after blur', async () => {
    localStorage.setItem(GHOST_KEY, '1');
    await mountPanel();
    const currentShell = shell();
    const density = currentShell.querySelector<HTMLInputElement>('.tokenpanel-density-slider');
    if (!density) throw new Error('density control not found');

    density.focus();
    dispatchPointerMoveOutside();
    await waitForGhost();
    expect(currentShell.classList.contains('is-ghosted')).toBe(false);

    density.blur();
    await waitForGhost();
    expect(currentShell.classList.contains('is-ghosted')).toBe(true);
  });
});
