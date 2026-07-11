// @vitest-environment jsdom

/**
 * Tests for the fixed-name global open API (issue #523):
 * `window.zdtp = { show, hide, toggle }`, installed from the package-root
 * bootstrap block in `../index` (`index.tsx`) for hosts that import the
 * panel directly — no Astro host-adapter in the picture.
 *
 * The Astro-adapter-side install (eager, before the panel bundle loads, plus
 * the adapter-wins double-install guard) is covered separately in
 * `host-adapter-zdtp-global-alias.test.ts`.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getPanelConfig, panelRootId, storageKey_autoload } from '../config/panel-config';
import { getOpenKey } from '../state/tweak-state';
import { flushEffects } from './_test-helpers';

const DEFAULT_CFG = getPanelConfig();
const PANEL_ROOT_ID = panelRootId(DEFAULT_CFG);
const AUTOLOAD_KEY = storageKey_autoload(DEFAULT_CFG);

/** Text unique to the open-panel header in panel.tsx. */
const OPEN_PANEL_HEADER_TEXT = 'Design Tokens';

interface ZdtpGlobalApi {
  show: () => void;
  hide: () => void;
  toggle: () => void;
}

function zdtpGlobal(): ZdtpGlobalApi | undefined {
  return (window as unknown as Record<string, unknown>).zdtp as ZdtpGlobalApi | undefined;
}

/**
 * Reset the module graph, clear the panel-config registry, and fresh-import
 * `../index` so its top-level bootstrap block (which installs `window.zdtp`)
 * re-runs against the current window/localStorage state.
 */
async function freshImport() {
  vi.resetModules();
  const { __resetPanelConfigForTests } = await import('../config/panel-config');
  __resetPanelConfigForTests();
  return await import('../index');
}

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '';
  const w = window as unknown as Record<string, unknown>;
  delete w.__zudoDesignTokenPanelAdapter;
  delete w.__zudoDesignTokenPanelLifecycle;
  delete w.__zudoDesignTokenPanelInstanceBindings;
  delete w.zdtp;
});

afterEach(() => {
  document.body.innerHTML = '';
  localStorage.clear();
  const w = window as unknown as Record<string, unknown>;
  delete w.zdtp;
  vi.restoreAllMocks();
});

describe('window.zdtp fixed-name global alias — package-root install (#523)', () => {
  it('installs show/hide/toggle functions on window.zdtp', async () => {
    await freshImport();
    const api = zdtpGlobal();
    expect(typeof api?.show).toBe('function');
    expect(typeof api?.hide).toBe('function');
    expect(typeof api?.toggle).toBe('function');
  });

  it('zdtp.show() opens the panel', async () => {
    await freshImport();
    zdtpGlobal()!.show();
    await flushEffects();

    const root = document.getElementById(PANEL_ROOT_ID);
    expect(root).not.toBeNull();
    expect(root!.textContent ?? '').toContain(OPEN_PANEL_HEADER_TEXT);
    expect(localStorage.getItem(getOpenKey())).toBe('1');
  });

  it('zdtp.hide() closes an open panel', async () => {
    await freshImport();
    zdtpGlobal()!.show();
    await flushEffects();

    zdtpGlobal()!.hide();
    await flushEffects();

    expect(localStorage.getItem(getOpenKey())).toBeNull();
    const root = document.getElementById(PANEL_ROOT_ID);
    expect(root!.textContent ?? '').not.toContain(OPEN_PANEL_HEADER_TEXT);
  });

  it('zdtp.toggle() opens a closed panel, then closes it on the next call', async () => {
    await freshImport();

    zdtpGlobal()!.toggle();
    await flushEffects();
    expect(localStorage.getItem(getOpenKey())).toBe('1');

    zdtpGlobal()!.toggle();
    await flushEffects();
    expect(localStorage.getItem(getOpenKey())).toBeNull();
  });

  it('zdtp.show() arms the autoload flag exactly like showDesignTokenPanel()', async () => {
    await freshImport();
    expect(localStorage.getItem(AUTOLOAD_KEY)).toBeNull();

    zdtpGlobal()!.show();
    await flushEffects();

    expect(localStorage.getItem(AUTOLOAD_KEY)).toBe('1');
  });

  it('does not clobber a pre-existing host-defined window.zdtp', async () => {
    const hostDefined = { custom: 'host-value' };
    (window as unknown as Record<string, unknown>).zdtp = hostDefined;
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await freshImport();

    expect((window as unknown as Record<string, unknown>).zdtp).toBe(hostDefined);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('window.zdtp already exists and was not installed by this package'),
    );
  });

  it('does not clobber (and does not crash on) a host-defined window.zdtp = null', async () => {
    (window as unknown as Record<string, unknown>).zdtp = null;
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(freshImport()).resolves.toBeDefined();

    expect((window as unknown as Record<string, unknown>).zdtp).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('window.zdtp already exists and was not installed by this package'),
    );
  });

  it('does not reinstall a fresh alias object across repeated module re-imports (idempotent)', async () => {
    await freshImport();
    const first = zdtpGlobal();
    expect(first).toBeDefined();

    // Re-run the module-init block WITHOUT clearing window.zdtp first — this
    // mirrors a scenario where index.tsx's bootstrap runs more than once
    // (e.g. a duplicated module chunk) against an already-installed global.
    vi.resetModules();
    const { __resetPanelConfigForTests } = await import('../config/panel-config');
    __resetPanelConfigForTests();
    await import('../index');

    expect(zdtpGlobal()).toBe(first);
  });
});
