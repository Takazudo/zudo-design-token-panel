// @vitest-environment jsdom

/**
 * Regression tests for issue #370 — panel renders an empty body (no tabs /
 * editors) for a single-instance non-Astro (zfb/Preact) host that self-mounts
 * via `configurePanel(config)` + the historical `toggle-design-token-panel`
 * window event.
 *
 * Root cause (the 0.2.3 → 0.3.x regression)
 * -----------------------------------------
 * The multi-instance refactor (#353/#354) binds the DEFAULT instance's toggle-
 * event listener EAGERLY at module init (`src/index.tsx`), before the host
 * calls `configurePanel()`. The handler closed over `DEFAULT_PANEL_CONFIG`
 * (empty `tabs`). The later `configurePanel()` fires a `configured` hook that
 * re-runs `bindInstance`, but it no-ops because the prefix is already bound —
 * so the toggle window event kept mounting the panel against the stale, empty
 * config. The public console API (`showDesignTokenPanel`) reads the live config
 * and was unaffected, which is why ONLY the window-event path regressed (that is
 * exactly what non-Astro hosts dispatch).
 *
 * Two facets, both producing "toolbar mounts, body empty":
 *  1. Default-`storagePrefix` host (e.g. zudo-doc) dispatching the reserved
 *     `toggle-design-token-panel`.
 *  2. Custom-`storagePrefix` host (e.g. zudo-sg) dispatching the same reserved
 *     event — which used to mount the empty default instance instead of the
 *     host's configured panel.
 *
 * Harness note: each test resets the module registry (`vi.resetModules`) AND
 * actively drains any window-event listeners left by the previous test's module
 * instance, so the eager module-init bind re-runs from a clean slate every time
 * (the bug only reproduces when module init binds the default listener before
 * `configurePanel`).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'preact';
import type { PanelConfig } from '../config/panel-config';

const REGISTRY_SYMBOL = Symbol.for('@takazudo/zdtp:singleton');
const DEFAULT_PREFIX = 'zudo-design-token-panel';
/** Tier-section heading text is body-only — distinct from the tab BUTTON label. */
const PANEL_TOOLBAR_SENTINEL = 'Design Tokens';

interface InstanceBindingRecord {
  cleanups: Array<() => void>;
}

/**
 * Drain any real `addEventListener` registrations left on `window` by a prior
 * test's index module instance, then drop the bindings map. Dropping the map
 * alone would orphan live listeners that then leak across tests.
 */
function drainInstanceBindings(): void {
  const w = window as unknown as {
    __zudoDesignTokenPanelInstanceBindings?: Map<string, InstanceBindingRecord>;
  };
  const bindings = w.__zudoDesignTokenPanelInstanceBindings;
  if (bindings) {
    for (const record of bindings.values()) {
      for (const fn of record.cleanups) {
        try {
          fn();
        } catch {
          /* a listener-removal that throws must not abort the drain */
        }
      }
    }
    bindings.clear();
  }
  delete w.__zudoDesignTokenPanelInstanceBindings;
}

function clearGlobalThisSlot(): void {
  delete (globalThis as unknown as Record<symbol, unknown>)[REGISTRY_SYMBOL];
}

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

/** Minimal one-tier `size` tab. The tier label (`${label} tier`) renders in the
 * tab BODY (TierSection heading), so asserting on it proves the body — not just
 * a tab button — rendered. */
function sizeTab(label: string): PanelConfig['tabs'][number] {
  return {
    id: 'size',
    label,
    tiers: [
      {
        id: 'size-raw',
        label: `${label} tier`,
        items: [
          {
            id: 'size-item',
            cssVar: '--size-item',
            label: `${label} item`,
            default: '1rem',
            type: { kind: 'length', step: 0.0625, unit: 'rem' },
          },
        ],
      },
    ],
  };
}

async function waitForEffectFlush(): Promise<void> {
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
  await new Promise<void>((resolve) => setTimeout(resolve, 50));
}

beforeEach(() => {
  drainInstanceBindings();
  const w = window as unknown as Record<string, unknown>;
  delete w.__zudoDesignTokenPanelLifecycle;
  delete w.__zudoDesignTokenPanelAdapter;
  clearGlobalThisSlot();
  localStorage.clear();
  document.body.innerHTML = '';
  vi.resetModules();
});

afterEach(() => {
  drainInstanceBindings();
  clearGlobalThisSlot();
  localStorage.clear();
  document.body.innerHTML = '';
});

describe('issue #370 — toggle window event mounts the configured tabs (default prefix)', () => {
  it('default-prefix host: configurePanel AFTER import, then toggle-design-token-panel renders the real tab body', async () => {
    // Import triggers module init → binds the default-prefix toggle listener
    // with the EMPTY DEFAULT_PANEL_CONFIG, before any configurePanel call.
    await import('../index');
    const { configurePanel, panelRootId } = await import('../config/panel-config');

    const cfg = makeConfig(DEFAULT_PREFIX, { tabs: [sizeTab('Tokens Size')] });
    configurePanel(cfg);

    window.dispatchEvent(new CustomEvent('toggle-design-token-panel'));
    await waitForEffectFlush();

    const root = document.getElementById(panelRootId(cfg));
    expect(root, 'panel mounted on the reserved window event').not.toBeNull();
    expect(root!.textContent ?? '', 'toolbar shell mounted').toContain(PANEL_TOOLBAR_SENTINEL);
    expect(
      root!.textContent ?? '',
      'the configured tab body renders (regression: it was empty)',
    ).toContain('Tokens Size tier');
  });

  it('also opens via the deprecated toggle-color-tweak-panel alias with the real config', async () => {
    await import('../index');
    const { configurePanel, panelRootId } = await import('../config/panel-config');

    const cfg = makeConfig(DEFAULT_PREFIX, { tabs: [sizeTab('Tokens Size')] });
    configurePanel(cfg);

    window.dispatchEvent(new CustomEvent('toggle-color-tweak-panel'));
    await waitForEffectFlush();

    const root = document.getElementById(panelRootId(cfg));
    expect(root, 'panel mounted on the legacy alias event').not.toBeNull();
    expect(root!.textContent ?? '').toContain('Tokens Size tier');
  });
});

describe('issue #370 — reserved event opens the configured panel for a custom-prefix host', () => {
  it('custom-prefix-only host dispatching toggle-design-token-panel opens its panel, not an empty default', async () => {
    await import('../index');
    const { configurePanel, panelRootId, DEFAULT_PANEL_CONFIG } = await import(
      '../config/panel-config'
    );

    const cfg = makeConfig('zudo-sg-tweak', { tabs: [sizeTab('SG Size')] });
    configurePanel(cfg);

    // The host dispatches the historical reserved event (not toggle-${prefix}).
    window.dispatchEvent(new CustomEvent('toggle-design-token-panel'));
    await waitForEffectFlush();

    // The configured (custom-prefix) panel opens with its real body...
    const customRoot = document.getElementById(panelRootId(cfg));
    expect(customRoot, 'configured custom-prefix panel mounted').not.toBeNull();
    expect(customRoot!.textContent ?? '').toContain('SG Size tier');

    // ...and no empty default-prefix panel is mounted alongside it.
    const defaultRoot = document.getElementById(panelRootId(DEFAULT_PANEL_CONFIG));
    expect(defaultRoot, 'no empty default-prefix panel mounted').toBeNull();
  });

  it('custom-prefix host that opts into the reserved event name opens (and STAYS open) on one dispatch', async () => {
    // A host following the older host-side mitigation sets
    // `toggleEvent: 'toggle-design-token-panel'` on a custom-prefix config. That
    // binds a second listener on the reserved event; with the dispatch-time
    // fallback BOTH the eager default listener and the custom listener resolve
    // to this same instance. The handler must dedupe per dispatch so the panel
    // is toggled exactly once (regression: it opened then immediately closed).
    await import('../index');
    const { configurePanel, panelRootId, DEFAULT_PANEL_CONFIG } = await import(
      '../config/panel-config'
    );

    const cfg = makeConfig('zudo-sg-tweak', {
      toggleEvent: 'toggle-design-token-panel',
      tabs: [sizeTab('SG Size')],
    });
    configurePanel(cfg);

    window.dispatchEvent(new CustomEvent('toggle-design-token-panel'));
    await waitForEffectFlush();

    const customRoot = document.getElementById(panelRootId(cfg));
    expect(customRoot, 'configured panel mounted').not.toBeNull();
    // Body present ⇒ still open after the single dispatch (a double-toggle would
    // have closed it, leaving the root present but rendering null).
    expect(customRoot!.textContent ?? '', 'panel stays open after one dispatch').toContain(
      'SG Size tier',
    );
    const defaultRoot = document.getElementById(panelRootId(DEFAULT_PANEL_CONFIG));
    expect(defaultRoot, 'no empty default-prefix panel mounted').toBeNull();
  });
});

describe('issue #370 — panel tabConfigById tracks instanceConfig (no stale useMemo)', () => {
  it('re-rendering the panel with a changed instanceConfig updates the tab BODY, not just the tab strip', async () => {
    const { configurePanel } = await import('../config/panel-config');
    const { getOpenKey } = await import('../state/tweak-state');
    const { default: DesignTokenTweakPanel } = await import('../panel');

    const cfgA = makeConfig('iss370-a', { tabs: [sizeTab('Alpha Size')] });
    const cfgB = makeConfig('iss370-b', { tabs: [sizeTab('Beta Size')] });
    configurePanel(cfgA);
    configurePanel(cfgB);

    // Seed both instances open so the panel body renders on mount.
    localStorage.setItem(getOpenKey(cfgA), '1');
    localStorage.setItem(getOpenKey(cfgB), '1');

    const root = document.createElement('div');
    document.body.appendChild(root);

    render(<DesignTokenTweakPanel instanceConfig={cfgA} />, root);
    await waitForEffectFlush();
    expect(root.textContent ?? '', 'A body rendered').toContain('Alpha Size tier');

    // Re-render the SAME component instance with a different config (a prop
    // change, NOT a remount). The body's id→TabConfig dispatch map must follow
    // the new config — a stale useMemo([]) would update the tab strip but leave
    // the body dispatching against the old config.
    render(<DesignTokenTweakPanel instanceConfig={cfgB} />, root);
    await waitForEffectFlush();
    const text = root.textContent ?? '';
    expect(text, 'B body now rendered').toContain('Beta Size tier');
    expect(text, 'stale A body gone').not.toContain('Alpha Size tier');
  });
});
