// @vitest-environment jsdom

/**
 * Tests for S3 — owner-autoload wiring in index.tsx:
 *
 *   1. `reapplyFromStorage` mounts the Preact shell CLOSED when the autoload
 *      flag is set (Gate #2 per autoload-state.ts contract).
 *   2. Opening the panel via any path sets `:autoload = '1'` (auto-remember).
 *   3. Package-root `enableAutoload()` and `disableAutoload()` set/clear the
 *      correct localStorage keys and manage the Preact shell mount.
 *   4. `shouldAutoload()` reflects the persisted flag for the active config.
 *   5. Custom `storagePrefix`: autoload flag causes closed mount via the
 *      post-configure hook path (the hook fires `reapplyFromStorage` using
 *      the custom prefix's config).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getPanelConfig,
  panelRootId,
  storageKey_autoload,
  storageKey_visible,
} from '../config/panel-config';
import { getOpenKey } from '../state/tweak-state';

// ---------------------------------------------------------------------------
// Derived constants from the default config (evaluated once at file load).
// ---------------------------------------------------------------------------

const DEFAULT_CFG = getPanelConfig();
const PANEL_ROOT_ID = panelRootId(DEFAULT_CFG);
const STORAGE_KEY_VISIBLE = storageKey_visible(DEFAULT_CFG);
const AUTOLOAD_KEY = storageKey_autoload(DEFAULT_CFG);
const ELPATH_ENABLED_KEY = `${DEFAULT_CFG.storagePrefix}-elpath-enabled`;
const OPEN_KEY = getOpenKey(DEFAULT_CFG);

/** Text unique to the open-panel header in panel.tsx. */
const OPEN_PANEL_HEADER_TEXT = 'Design Tokens';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function waitForEffectFlush(): Promise<void> {
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
  // One macrotask tick after the rAFs to let any setTimeout(0) fallbacks run.
  await new Promise<void>((resolve) => setTimeout(resolve, 50));
}

/**
 * Reset module graph, clear the panel-config registry, and fresh-import the
 * adapter. This re-runs module-init (binding `astro:page-load` etc.) so each
 * test gets a clean slate.
 */
async function freshImport() {
  vi.resetModules();
  const { __resetPanelConfigForTests } = await import('../config/panel-config');
  __resetPanelConfigForTests();
  return await import('../index');
}

// ---------------------------------------------------------------------------
// Shared lifecycle reset between tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '';
  const w = window as unknown as Record<string, unknown>;
  delete w.__zudoDesignTokenPanelAdapter;
  delete w.__zudoDesignTokenPanelLifecycle;
  delete w.__zudoDesignTokenPanelInstanceBindings;
});

afterEach(() => {
  document.body.innerHTML = '';
  localStorage.clear();
  vi.resetModules();
});

// ---------------------------------------------------------------------------
// Gate #2 — reapplyFromStorage closed-mount when autoload is set
// ---------------------------------------------------------------------------

describe('reapplyFromStorage — autoload flag causes closed mount', () => {
  it('mounts the shell CLOSED when autoload=1 (no overrides, not visible)', async () => {
    localStorage.setItem(AUTOLOAD_KEY, '1');

    await freshImport();
    // Shell is lazy — not yet mounted.
    expect(document.getElementById(PANEL_ROOT_ID)).toBeNull();

    // astro:page-load fires reapplyFromStorage, which should trigger hideInstance.
    document.dispatchEvent(new Event('astro:page-load'));
    await waitForEffectFlush();

    const root = document.getElementById(PANEL_ROOT_ID);
    expect(root).not.toBeNull();
    // Panel must be CLOSED (renders null → no header text).
    expect(root!.textContent ?? '').not.toContain(OPEN_PANEL_HEADER_TEXT);
  });

  it('does NOT mount the shell when autoload=0 (no overrides, not visible)', async () => {
    localStorage.setItem(AUTOLOAD_KEY, '0');

    await freshImport();
    document.dispatchEvent(new Event('astro:page-load'));
    await waitForEffectFlush();

    expect(document.getElementById(PANEL_ROOT_ID)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Auto-remember — opening the panel arms the autoload flag
// ---------------------------------------------------------------------------

describe('auto-remember — opening panel writes :autoload=1', () => {
  it('showDesignTokenPanel() sets :autoload=1', async () => {
    const { showDesignTokenPanel } = await freshImport();

    expect(localStorage.getItem(AUTOLOAD_KEY)).toBeNull();
    showDesignTokenPanel();
    expect(localStorage.getItem(AUTOLOAD_KEY)).toBe('1');
  });

  it('toggleDesignPanel() sets :autoload=1 when the panel opens', async () => {
    const { toggleDesignPanel } = await freshImport();

    expect(localStorage.getItem(AUTOLOAD_KEY)).toBeNull();
    // First toggle → opens the panel.
    toggleDesignPanel();
    expect(localStorage.getItem(AUTOLOAD_KEY)).toBe('1');
  });

  it('window toggle-event handler sets :autoload=1 on open', async () => {
    await freshImport();

    expect(localStorage.getItem(AUTOLOAD_KEY)).toBeNull();
    window.dispatchEvent(new CustomEvent('toggle-design-token-panel'));
    expect(localStorage.getItem(AUTOLOAD_KEY)).toBe('1');
  });
});

// ---------------------------------------------------------------------------
// Package-root exports: enableAutoload / disableAutoload / shouldAutoload
// ---------------------------------------------------------------------------

describe('enableAutoload()', () => {
  it('sets :autoload=1 and -elpath-enabled=1', async () => {
    const { enableAutoload } = await freshImport();

    enableAutoload();

    expect(localStorage.getItem(AUTOLOAD_KEY)).toBe('1');
    expect(localStorage.getItem(ELPATH_ENABLED_KEY)).toBe('1');
  });

  it('mounts the Preact shell in the CLOSED state', async () => {
    const { enableAutoload } = await freshImport();

    enableAutoload();

    const root = document.getElementById(PANEL_ROOT_ID);
    expect(root).not.toBeNull();

    await waitForEffectFlush();
    expect(root!.textContent ?? '').not.toContain(OPEN_PANEL_HEADER_TEXT);
  });
});

describe('disableAutoload()', () => {
  it('clears :autoload, :visible, open key, and unmounts the shell', async () => {
    const { enableAutoload, disableAutoload } = await freshImport();

    // Arm first so there is something to tear down.
    enableAutoload();
    expect(document.getElementById(PANEL_ROOT_ID)).not.toBeNull();

    disableAutoload();

    // Autoload flag is fully removed.
    expect(localStorage.getItem(AUTOLOAD_KEY)).toBeNull();
    // Visibility intent is cleared.
    expect(localStorage.getItem(STORAGE_KEY_VISIBLE)).toBe('0');
    // Open-state key is removed so the next mount starts closed.
    expect(localStorage.getItem(OPEN_KEY)).toBeNull();
    // Preact shell is unmounted and root element removed.
    expect(document.getElementById(PANEL_ROOT_ID)).toBeNull();
  });
});

describe('shouldAutoload()', () => {
  it('returns false when flag is absent', async () => {
    const { shouldAutoload } = await freshImport();
    expect(shouldAutoload()).toBe(false);
  });

  it('returns true when :autoload=1', async () => {
    const { shouldAutoload } = await freshImport();
    localStorage.setItem(AUTOLOAD_KEY, '1');
    expect(shouldAutoload()).toBe(true);
  });

  it('returns false when :autoload=0', async () => {
    const { shouldAutoload } = await freshImport();
    localStorage.setItem(AUTOLOAD_KEY, '0');
    expect(shouldAutoload()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Custom storagePrefix — reads / writes the intended keys
// ---------------------------------------------------------------------------

describe('custom storagePrefix — autoload flag causes closed mount', () => {
  it('configurePanel with custom prefix: reapply (via post-configure hook) mounts closed', async () => {
    const customPrefix = 'zdtp-s3-test-custom';
    const customAutoloadKey = `${customPrefix}:autoload`;
    const customRootId = `${customPrefix}-root`;

    localStorage.setItem(customAutoloadKey, '1');

    const { configurePanel } = await freshImport();

    // configurePanel fires the post-configure hook which calls reapplyFromStorage
    // with the custom prefix now the active default → _shouldAutoload(cfg) reads
    // customAutoloadKey → true → hideInstance → shell mounts closed.
    configurePanel({
      storagePrefix: customPrefix,
      consoleNamespace: 'zdtp-s3-test-ns',
      modalClassPrefix: 'zdtp-s3-test-modal',
      schemaId: 'zdtp-s3-test/v1',
      exportFilenameBase: 'zdtp-s3-test',
      tabs: [],
    });

    const root = document.getElementById(customRootId);
    expect(root).not.toBeNull();

    await waitForEffectFlush();
    expect(root!.textContent ?? '').not.toContain(OPEN_PANEL_HEADER_TEXT);
  });
});
