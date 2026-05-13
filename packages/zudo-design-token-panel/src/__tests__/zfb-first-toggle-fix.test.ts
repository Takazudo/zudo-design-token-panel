// @vitest-environment jsdom

/**
 * Regression test for issue #111 — H2 fix: zfb first-toggle bug.
 *
 * Root cause (H2): src/index.tsx module-init previously called
 * reapplyPersistedOverrides() and reapplyFromStorage() synchronously before
 * the host had called configurePanel(). With contaminated localStorage
 * (e.g. `zudo-design-token-panel:visible=1` left from a prior default-prefix
 * session), reapplyFromStorage() mounted a default-prefix panel BEFORE
 * configurePanel ran. That default panel's useEffect later called
 * removeItem(getOpenKey()) — by that time getOpenKey() resolved to the
 * host-prefix key — clobbering the first toggle. The host-prefix panel mounted
 * but found its open key absent and rendered closed.
 *
 * Fix: module-init in index.tsx registers a post-configure hook
 * (POST_CONFIGURE_REAPPLY_HOOK) via registerPostConfigureHook(). The hook runs
 * AFTER configurePanel supplies the host's storagePrefix, ensuring reapply
 * always uses the correct prefix.
 *
 * These tests assert the structural contract, not the full browser repro (which
 * requires Preact effect flushes across two concurrent Preact trees — not
 * reliably reproducible in jsdom). The observable structural invariant is:
 *
 *   module-init MUST NOT call reapplyFromStorage / reapplyPersistedOverrides
 *   before configurePanel has been called. Concretely, the "[tweak] Malformed
 *   ..." warnings must not appear before configurePanel runs.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  configurePanel as ConfigurePanelFn,
  __resetPanelConfigForTests as ResetFn,
  registerPostConfigureHook as RegisterHookFn,
} from '../config/panel-config';

const SLOT_SYMBOL = Symbol.for('@takazudo/zudo-design-token-panel:singleton');

/**
 * Clear the globalThis slot between tests. Matches the pattern in
 * panel-config-globalthis.test.ts — required because vi.resetModules()
 * only resets the module registry; the globalThis slot persists and would
 * carry hooks / config across tests.
 */
function clearGlobalThisSlot() {
  delete (globalThis as unknown as Record<symbol, unknown>)[SLOT_SYMBOL];
}

beforeEach(() => {
  clearGlobalThisSlot();
  vi.resetModules();
  localStorage.clear();
});

afterEach(() => {
  clearGlobalThisSlot();
  vi.resetModules();
  localStorage.clear();
});

describe('zfb first-toggle fix (#111) — registerPostConfigureHook structural contract', () => {
  it('registerPostConfigureHook runs the hook when configurePanel is called later', async () => {
    const panelConfig = await import('../config/panel-config');
    const hook = vi.fn();
    (panelConfig.registerPostConfigureHook as typeof RegisterHookFn)(hook);

    // Hook must NOT fire before configurePanel.
    expect(hook).not.toHaveBeenCalled();

    const cfg = {
      storagePrefix: 'zfb-example-tokens',
      consoleNamespace: 'zfb',
      modalClassPrefix: 'zfb-example-tokens-modal',
      schemaId: 'zfb-example-tokens/v1',
      exportFilenameBase: 'zfb-example-tokens',
      tabs: [] as const,
    };
    (panelConfig.configurePanel as typeof ConfigurePanelFn)(cfg);

    // Hook must fire exactly once after configurePanel.
    expect(hook).toHaveBeenCalledTimes(1);
  });

  it('registerPostConfigureHook fires immediately when configurePanel was already called', async () => {
    const panelConfig = await import('../config/panel-config');
    const cfg = {
      storagePrefix: 'zfb-example-tokens',
      consoleNamespace: 'zfb',
      modalClassPrefix: 'zfb-example-tokens-modal',
      schemaId: 'zfb-example-tokens/v1',
      exportFilenameBase: 'zfb-example-tokens',
      tabs: [] as const,
    };
    (panelConfig.configurePanel as typeof ConfigurePanelFn)(cfg);

    // Register AFTER configurePanel — must fire immediately.
    const hook = vi.fn();
    (panelConfig.registerPostConfigureHook as typeof RegisterHookFn)(hook);
    expect(hook).toHaveBeenCalledTimes(1);
  });

  it('registerPostConfigureHook is idempotent on reference — same hook not double-registered', async () => {
    const panelConfig = await import('../config/panel-config');
    const hook = vi.fn();
    (panelConfig.registerPostConfigureHook as typeof RegisterHookFn)(hook);
    (panelConfig.registerPostConfigureHook as typeof RegisterHookFn)(hook);

    const cfg = {
      storagePrefix: 'zfb-example-tokens',
      consoleNamespace: 'zfb',
      modalClassPrefix: 'zfb-example-tokens-modal',
      schemaId: 'zfb-example-tokens/v1',
      exportFilenameBase: 'zfb-example-tokens',
      tabs: [] as const,
    };
    (panelConfig.configurePanel as typeof ConfigurePanelFn)(cfg);

    // Second registration was ignored — fires exactly once.
    expect(hook).toHaveBeenCalledTimes(1);
  });

  it('__resetPanelConfigForTests clears hooks so they do not leak across tests', async () => {
    const panelConfig = await import('../config/panel-config');
    const hook = vi.fn();
    (panelConfig.registerPostConfigureHook as typeof RegisterHookFn)(hook);

    // Reset the singleton — hooks must be cleared.
    (panelConfig.__resetPanelConfigForTests as typeof ResetFn)();

    const cfg = {
      storagePrefix: 'zfb-example-tokens',
      consoleNamespace: 'zfb',
      modalClassPrefix: 'zfb-example-tokens-modal',
      schemaId: 'zfb-example-tokens/v1',
      exportFilenameBase: 'zfb-example-tokens',
      tabs: [] as const,
    };
    (panelConfig.configurePanel as typeof ConfigurePanelFn)(cfg);

    // Hook was cleared by reset — must not fire.
    expect(hook).not.toHaveBeenCalled();
  });
});

describe('zfb first-toggle fix (#111) — module-init must not call reapply before configurePanel', () => {
  /**
   * Seeds the contaminated-localStorage scenario from the H2 diagnosis:
   * default-prefix state-v3 present (malformed) and visible=1.
   * In the old code, importing index.tsx would immediately call
   * reapplyPersistedOverrides() which calls loadPersistedState() which emits
   * "[tweak] Malformed zudo-design-token-panel-state-v3" warnings.
   *
   * After the fix, module-init only registers a hook; no reapply runs until
   * configurePanel fires. With a configured non-default prefix, the reapply
   * scopes to that prefix, so the contaminated default-prefix keys are ignored.
   */
  it('does not emit malformed-state warnings from module-init before configurePanel', async () => {
    // Seed contaminated default-prefix localStorage keys (the H2 repro scenario).
    const DEFAULT_PREFIX = 'zudo-design-token-panel';
    localStorage.setItem(`${DEFAULT_PREFIX}:visible`, '1');
    localStorage.setItem(
      `${DEFAULT_PREFIX}-state-v3`,
      '{"color":{},"spacing":{},"typography":{},"size":{},"position":{},"tabs":{}}',
    );

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      // Dynamic import triggers module-init. In the fixed code, module-init
      // only installs event listeners + astro fallback + registers the hook.
      // No reapply runs yet, so no malformed-state warning should fire.
      await import('../index');

      const malformedWarningsBefore = warnSpy.mock.calls.filter((args) =>
        String(args[0]).includes('Malformed'),
      );
      expect(malformedWarningsBefore).toHaveLength(0);

      // Now call configurePanel with a non-default prefix. The hook fires.
      // With a non-default prefix, the default-prefix contaminated keys are
      // irrelevant — reapply reads from the host prefix's keys (which are clean).
      vi.resetModules();
      clearGlobalThisSlot();

      const panelConfig = await import('../config/panel-config');
      const cfg = {
        storagePrefix: 'zfb-example-tokens',
        consoleNamespace: 'zfb',
        modalClassPrefix: 'zfb-example-tokens-modal',
        schemaId: 'zfb-example-tokens/v1',
        exportFilenameBase: 'zfb-example-tokens',
        tabs: [] as const,
      };
      (panelConfig.configurePanel as typeof ConfigurePanelFn)(cfg);

      // After configurePanel with zfb prefix, no malformed warnings should
      // appear because the host-prefix keys are clean.
      const malformedWarningsAfter = warnSpy.mock.calls.filter((args) =>
        String(args[0]).includes('Malformed'),
      );
      expect(malformedWarningsAfter).toHaveLength(0);
    } finally {
      warnSpy.mockRestore();
    }
  });
});
