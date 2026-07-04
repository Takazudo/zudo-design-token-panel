// @vitest-environment jsdom

/**
 * Regression test: the Element Path Copy inspector must work even while the
 * panel is CLOSED.
 *
 * The Alt+click "copy selector" gesture lives in the InspectorOverlay, which
 * is mounted by the ElementPathOrchestrator — and that orchestrator only runs
 * while the Preact shell is mounted. The shell mounts lazily (first open). So
 * on a page load where the user had previously enabled inspect mode but left
 * the panel closed (and has no token overrides), nothing mounted the shell and
 * the inspector silently did not work.
 *
 * Fix (`reapplyFromStorage` in index.tsx): when the persisted elpath-enabled
 * flag is set, mount the shell CLOSED (via `hideInstance`) so the inspector
 * overlay activates without opening the panel.
 *
 * This drives the real soft-nav trigger: `reapplyFromStorage` is bound to
 * `astro:page-load` (the adapter's default lifecycle channel), so dispatching
 * that event exercises the exact mount decision the fix changed.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  panelRootId,
  storageKey_visible,
  getPanelConfig,
} from '../config/panel-config';
import { flushEffects } from './_test-helpers';

const PANEL_ROOT_ID = panelRootId(getPanelConfig());
const STORAGE_KEY_VISIBLE = storageKey_visible(getPanelConfig());
const ELPATH_ENABLED_KEY = `${getPanelConfig().storagePrefix}-elpath-enabled`;
const OPEN_PANEL_HEADER_TEXT = 'Design Tokens';

/** Re-import the adapter fresh so its module-init binds the astro lifecycle. */
async function freshAdapterImport(): Promise<void> {
  vi.resetModules();
  const { __resetPanelConfigForTests } = await import('../config/panel-config');
  __resetPanelConfigForTests();
  await import('../index');
}

describe('adapter — Element Path Copy mounts the shell while closed', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
    const adapterWin = window as unknown as Record<string, unknown>;
    delete adapterWin.__zudoDesignTokenPanelAdapter;
    delete adapterWin.__zudoDesignTokenPanelLifecycle;
  });

  afterEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
    vi.resetModules();
  });

  it('mounts the shell CLOSED when elpath is enabled (no overrides, not visible)', async () => {
    // Persisted inspect-mode ON; panel was never made visible; no overrides.
    localStorage.setItem(ELPATH_ENABLED_KEY, '1');
    expect(localStorage.getItem(STORAGE_KEY_VISIBLE)).toBeNull();

    await freshAdapterImport();
    // No mount yet — the shell is lazy.
    expect(document.getElementById(PANEL_ROOT_ID)).toBeNull();

    // A page load re-evaluates storage and decides what to mount.
    document.dispatchEvent(new Event('astro:page-load'));
    await flushEffects();

    // The shell is mounted...
    const root = document.getElementById(PANEL_ROOT_ID);
    expect(root).not.toBeNull();
    // ...but the panel itself stays CLOSED (no open header rendered).
    expect(root!.textContent ?? '').not.toContain(OPEN_PANEL_HEADER_TEXT);
  });

  it('does NOT mount the shell when elpath is disabled (no overrides, not visible)', async () => {
    localStorage.setItem(ELPATH_ENABLED_KEY, '0');

    await freshAdapterImport();
    document.dispatchEvent(new Event('astro:page-load'));
    await flushEffects();

    expect(document.getElementById(PANEL_ROOT_ID)).toBeNull();
  });
});
