// @vitest-environment jsdom

/**
 * Tests for the Astro host-adapter's install of the fixed-name global open
 * API (`window.zdtp = { show, hide, toggle }`, issue #523).
 *
 * Coverage:
 *   1. `window.zdtp` is installed by the adapter's bootstrap script BEFORE
 *      the panel bundle has loaded (`loadPanelModule`'s modulePromise stays
 *      null until a call fires).
 *   2. `zdtp.show()` / `hide()` / `toggle()` lazily load the panel module
 *      then drive THIS instance's handle, mirroring `installConsoleApi`.
 *   3. `zdtp.show()` arms autoload (routes through `showInstance`, same as
 *      the console API's `showDesignPanel()`).
 *   4. Adapter-wins double-install guard: once the adapter has installed
 *      `window.zdtp`, loading the panel module (whose own package-root
 *      bootstrap also calls `installZdtpGlobalAlias`) does not replace it.
 *   5. A pre-existing host-defined `window.zdtp` is not clobbered.
 *
 * Bootstrap strategy mirrors `host-adapter-autoload.test.ts`: each test calls
 * `bootstrapAdapter()`, which resets the module graph + panel-config registry
 * and re-imports the adapter so its IIFE re-runs against the current
 * window/localStorage state.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { __resetPanelConfigForTests, type PanelConfig } from '../config/panel-config';
import { getOpenKey } from '../state/tweak-state';
import { flushEffects } from './_test-helpers';

const CFG: PanelConfig = {
  storagePrefix: 'test-zg',
  consoleNamespace: 'testZg',
  modalClassPrefix: 'test-zg-modal',
  schemaId: 'test-zg/v1',
  exportFilenameBase: 'test-zg-tokens',
  tabs: [],
  colorPresets: {},
  applyEndpoint: undefined,
  applyRouting: undefined,
};

const AUTOLOAD_KEY = `${CFG.storagePrefix}:autoload`;
const OPEN_KEY = getOpenKey(CFG);

interface ZdtpGlobalApi {
  show: () => Promise<void>;
  hide: () => Promise<void>;
  toggle: () => Promise<void>;
}

function zdtpGlobal(): ZdtpGlobalApi | undefined {
  return (window as unknown as Record<string, unknown>).zdtp as ZdtpGlobalApi | undefined;
}

/** Set up the inline-config script element the adapter reads on bootstrap. */
function setupConfigScript(): void {
  let el = document.getElementById('tokenpanel-config');
  if (!el) {
    const script = document.createElement('script');
    script.id = 'tokenpanel-config';
    (script as HTMLScriptElement).type = 'application/json';
    document.head.appendChild(script);
    el = script;
  }
  el.textContent = JSON.stringify(CFG);
}

/** Read the adapter's per-prefix runtime state from the window slot. */
function adapterState(): { bound: boolean; modulePromise: unknown } | null {
  const map = (window as unknown as Record<string, unknown>).__zudoDesignTokenPanelAdapter as
    | Record<string, unknown>
    | undefined;
  return (map?.[CFG.storagePrefix] ?? null) as { bound: boolean; modulePromise: unknown } | null;
}

async function bootstrapAdapter(): Promise<void> {
  vi.resetModules();
  const { __resetPanelConfigForTests: reset } = await import('../config/panel-config');
  reset();
  await import('../astro/host-adapter');
}

describe('host-adapter window.zdtp global alias (#523)', () => {
  beforeEach(() => {
    setupConfigScript();
    localStorage.clear();
    document.body.innerHTML = '';
    const w = window as unknown as Record<string, unknown>;
    delete w.__zudoDesignTokenPanelAdapter;
    delete w.__zudoDesignTokenPanelLifecycle;
    delete w[CFG.consoleNamespace];
    delete w.zdtp;
    __resetPanelConfigForTests();
  });

  afterEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
    document.head.innerHTML = '';
    const w = window as unknown as Record<string, unknown>;
    delete w.zdtp;
    vi.restoreAllMocks();
  });

  it('installs window.zdtp before the panel bundle has loaded', async () => {
    await bootstrapAdapter();
    const api = zdtpGlobal();
    expect(typeof api?.show).toBe('function');
    expect(typeof api?.hide).toBe('function');
    expect(typeof api?.toggle).toBe('function');
    // The install itself must not have triggered the lazy panel-module load.
    expect(adapterState()?.modulePromise).toBeNull();
  });

  it('zdtp.show() lazily loads the panel module then opens the panel', async () => {
    await bootstrapAdapter();
    expect(adapterState()?.modulePromise).toBeNull();

    await zdtpGlobal()!.show();

    expect(adapterState()?.modulePromise).not.toBeNull();
    expect(localStorage.getItem(OPEN_KEY)).toBe('1');
  });

  it('zdtp.hide() closes an open panel', async () => {
    await bootstrapAdapter();
    await zdtpGlobal()!.show();
    await flushEffects();

    await zdtpGlobal()!.hide();

    expect(localStorage.getItem(OPEN_KEY)).toBeNull();
  });

  it('zdtp.toggle() opens a closed panel, then closes it on the next call', async () => {
    await bootstrapAdapter();

    await zdtpGlobal()!.toggle();
    expect(localStorage.getItem(OPEN_KEY)).toBe('1');

    await zdtpGlobal()!.toggle();
    expect(localStorage.getItem(OPEN_KEY)).toBeNull();
  });

  it('zdtp.show() arms the autoload flag exactly like showDesignPanel()', async () => {
    await bootstrapAdapter();
    expect(localStorage.getItem(AUTOLOAD_KEY)).toBeNull();

    await zdtpGlobal()!.show();

    expect(localStorage.getItem(AUTOLOAD_KEY)).toBe('auto');
  });

  it('adapter-wins: loading the panel module after adapter bootstrap does not replace window.zdtp', async () => {
    await bootstrapAdapter();
    const adapterInstalled = zdtpGlobal();
    expect(adapterInstalled).toBeDefined();

    // Trigger the lazy panel-module load, whose own package-root bootstrap
    // (index.tsx) also calls installZdtpGlobalAlias. The adapter installed
    // first (synchronously, at script-bootstrap time), so its alias must win.
    await zdtpGlobal()!.show();

    expect(zdtpGlobal()).toBe(adapterInstalled);
  });

  it('does not clobber a pre-existing host-defined window.zdtp', async () => {
    const hostDefined = { custom: 'host-value' };
    (window as unknown as Record<string, unknown>).zdtp = hostDefined;
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await bootstrapAdapter();

    expect((window as unknown as Record<string, unknown>).zdtp).toBe(hostDefined);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('window.zdtp already exists and was not installed by this package'),
    );
  });

  it('keeps the same window.zdtp object across a view-transition rerun (idempotent)', async () => {
    await bootstrapAdapter();
    const first = zdtpGlobal();
    expect(first).toBeDefined();

    // Simulate a view-transition rerun: the adapter <script> re-executes but
    // window.zdtp is NOT cleared (it persists across soft-nav), same as the
    // idempotent-installation suite in host-adapter-autoload.test.ts.
    vi.resetModules();
    await import('../astro/host-adapter');

    expect(zdtpGlobal()).toBe(first);
  });
});
