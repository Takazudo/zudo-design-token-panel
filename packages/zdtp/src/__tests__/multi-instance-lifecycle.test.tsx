// @vitest-environment jsdom

/**
 * Per-instance lifecycle / event / mount tests for issue #354 (Z2).
 *
 * Z1 lifted the global singleton to a per-`storagePrefix` registry; Z2 wires
 * events / lifecycle / mount to that model. These tests assert the new
 * user-observable guarantees:
 *
 *   1. Two configured panels (distinct `storagePrefix`es) each mount into their
 *      OWN root and open/close via their OWN toggle event — no cross-talk.
 *   2. `handle.destroy()` removes ONLY that instance's root + listeners (and
 *      unmounts its Preact tree); the other panel keeps working.
 *   3. The default (un-configured) instance keeps the historical
 *      `toggle-design-token-panel` event; a configured non-default instance
 *      uses `toggle-${storagePrefix}` (or `config.toggleEvent`).
 *
 * The probes mirror the single-panel regression tests
 * (`toggle-event-after-close.test.tsx`): mount + open ⇒ the "Design Tokens"
 * header sentinel appears inside the instance's root; close ⇒ it disappears.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getOpenKey } from '../state/tweak-state';
import { __resetInstanceBindingsForTests } from '../index';
import {
  __resetPanelConfigForTests,
  configurePanel,
  panelRootId,
  toggleEventName,
  type PanelConfig,
} from '../config/panel-config';

const OPEN_PANEL_HEADER_TEXT = 'Design Tokens';
const DEFAULT_TOGGLE_EVENT = 'toggle-design-token-panel';

function makeConfig(prefix: string, overrides: Partial<PanelConfig> = {}): PanelConfig {
  return {
    storagePrefix: prefix,
    consoleNamespace: prefix,
    modalClassPrefix: `${prefix}-modal`,
    schemaId: `${prefix}/v1`,
    exportFilenameBase: prefix,
    tabs: [],
    ...overrides,
  };
}

async function waitForEffectFlush(): Promise<void> {
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
  await new Promise<void>((resolve) => setTimeout(resolve, 50));
}

function rootFor(cfg: PanelConfig): HTMLElement | null {
  return document.getElementById(panelRootId(cfg));
}

function isOpen(cfg: PanelConfig): boolean {
  const root = rootFor(cfg);
  return !!root && (root.textContent ?? '').includes(OPEN_PANEL_HEADER_TEXT);
}

describe('multi-instance lifecycle (#354)', () => {
  beforeEach(() => {
    // Drain real window-event listeners BEFORE clearing the registry so no
    // stale per-instance listener survives into the next test (deleting the
    // bindings map alone would orphan live listeners — see
    // `__resetInstanceBindingsForTests`).
    __resetInstanceBindingsForTests();
    __resetPanelConfigForTests();
    localStorage.clear();
    document.body.innerHTML = '';
    const w = window as unknown as Record<string, unknown>;
    delete w.__zudoDesignTokenPanelAdapter;
    delete w.__zudoDesignTokenPanelLifecycle;
  });

  afterEach(() => {
    __resetInstanceBindingsForTests();
    document.body.innerHTML = '';
    localStorage.clear();
  });

  it('derives a per-instance toggle event for non-default prefixes and keeps the legacy name for the default', () => {
    const def = makeConfig('zudo-design-token-panel'); // === DEFAULT prefix
    expect(toggleEventName(def)).toBe(DEFAULT_TOGGLE_EVENT);

    const a = makeConfig('alpha');
    expect(toggleEventName(a)).toBe('toggle-alpha');

    const custom = makeConfig('beta', { toggleEvent: 'beta:flip' });
    expect(toggleEventName(custom)).toBe('beta:flip');
  });

  it('two panels open/close independently via their own toggle events with no cross-talk', async () => {
    await import('../index');

    const cfgA = makeConfig('alpha');
    const cfgB = makeConfig('beta');
    configurePanel(cfgA);
    configurePanel(cfgB);

    // Open A via its own event — B must stay closed/unmounted.
    window.dispatchEvent(new CustomEvent(toggleEventName(cfgA)));
    await waitForEffectFlush();
    expect(isOpen(cfgA), 'A opens on its own event').toBe(true);
    expect(rootFor(cfgB), 'B did not mount from A event').toBeNull();
    expect(localStorage.getItem(getOpenKey(cfgA))).toBe('1');
    expect(localStorage.getItem(getOpenKey(cfgB))).toBeNull();

    // Open B via its own event — A stays open, independent.
    window.dispatchEvent(new CustomEvent(toggleEventName(cfgB)));
    await waitForEffectFlush();
    expect(isOpen(cfgB), 'B opens on its own event').toBe(true);
    expect(isOpen(cfgA), 'A still open — B event did not touch it').toBe(true);

    // Close A via its event — B unaffected.
    window.dispatchEvent(new CustomEvent(toggleEventName(cfgA)));
    await waitForEffectFlush();
    expect(isOpen(cfgA), 'A closed by its event').toBe(false);
    expect(isOpen(cfgB), 'B still open after A close').toBe(true);
    expect(localStorage.getItem(getOpenKey(cfgA))).toBeNull();
    expect(localStorage.getItem(getOpenKey(cfgB))).toBe('1');
  });

  it('two panels open/close independently via their handle methods', async () => {
    await import('../index');

    const cfgA = makeConfig('alpha');
    const cfgB = makeConfig('beta');
    const handleA = configurePanel(cfgA);
    const handleB = configurePanel(cfgB);

    handleA.open();
    handleB.open();
    await waitForEffectFlush();
    expect(isOpen(cfgA)).toBe(true);
    expect(isOpen(cfgB)).toBe(true);

    handleA.close();
    await waitForEffectFlush();
    expect(isOpen(cfgA)).toBe(false);
    expect(isOpen(cfgB), 'B unaffected by A.close()').toBe(true);

    handleB.toggle();
    await waitForEffectFlush();
    expect(isOpen(cfgB), 'B toggled closed').toBe(false);
    expect(isOpen(cfgA), 'A unaffected by B.toggle()').toBe(false);
  });

  it('destroy() tears down only its own instance and leaves the other panel working', async () => {
    await import('../index');

    const cfgA = makeConfig('alpha');
    const cfgB = makeConfig('beta');
    const handleA = configurePanel(cfgA);
    configurePanel(cfgB);

    // Mount + open both.
    window.dispatchEvent(new CustomEvent(toggleEventName(cfgA)));
    window.dispatchEvent(new CustomEvent(toggleEventName(cfgB)));
    await waitForEffectFlush();
    expect(rootFor(cfgA)).not.toBeNull();
    expect(rootFor(cfgB)).not.toBeNull();

    // Destroy A — its root is removed; B untouched.
    handleA.destroy();
    await waitForEffectFlush();
    expect(rootFor(cfgA), 'A root removed by destroy()').toBeNull();
    expect(isOpen(cfgB), 'B still open after A destroyed').toBe(true);

    // A's toggle event is now inert (listener removed) — it must NOT remount.
    window.dispatchEvent(new CustomEvent(toggleEventName(cfgA)));
    await waitForEffectFlush();
    expect(rootFor(cfgA), 'A toggle event inert after destroy').toBeNull();

    // B still responds to its own event.
    window.dispatchEvent(new CustomEvent(toggleEventName(cfgB)));
    await waitForEffectFlush();
    expect(isOpen(cfgB), 'B closes on its own event after A destroyed').toBe(false);
  });

  it('a destroyed prefix can be re-configured and re-bound', async () => {
    await import('../index');

    const cfgA = makeConfig('alpha');
    const handleA = configurePanel(cfgA);
    window.dispatchEvent(new CustomEvent(toggleEventName(cfgA)));
    await waitForEffectFlush();
    expect(isOpen(cfgA)).toBe(true);

    handleA.destroy();
    await waitForEffectFlush();
    expect(rootFor(cfgA)).toBeNull();

    // Re-configure the same prefix (now free) and toggle again.
    configurePanel(cfgA);
    window.dispatchEvent(new CustomEvent(toggleEventName(cfgA)));
    await waitForEffectFlush();
    expect(isOpen(cfgA), 'A works again after re-configure').toBe(true);
  });
});
