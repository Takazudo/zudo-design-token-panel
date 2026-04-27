// @vitest-environment jsdom

/**
 * Empty-state UI for tabs with zero registered tokens.
 *
 * Acceptance criteria:
 *
 *  - Active tab with zero tokens shows the empty-state copy.
 *  - Active tab with non-empty tokens shows the existing UI (no regression).
 *
 * The empty-state lives inside `panel.tsx` and only fires for the spacing,
 * font, and size tabs — color is driven by `colorCluster`, not
 * `tokens.color`, so the empty-state would trigger spuriously on every
 * cluster-driven host that ships `color: []` (which is the default).
 *
 * The two scenarios below exercise both branches via the actual mount path
 * (the visibility-flag bootstrap that `auto-mount-on-visibility.test.tsx`
 * already proves end-to-end). Both tabpanels render concurrently — only the
 * `hidden` attribute differs — so we can read all four tab bodies straight
 * out of the panel root without simulating tab clicks.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  __resetPanelConfigForTests,
  configurePanel,
  DEFAULT_PANEL_CONFIG,
  panelRootId,
  storageKey_visible,
} from '../config/panel-config';
import type { TokenDef } from '../tokens/manifest';

const STORAGE_KEY_VISIBLE = storageKey_visible(DEFAULT_PANEL_CONFIG);
const PANEL_ROOT_ID = panelRootId(DEFAULT_PANEL_CONFIG);

const EMPTY_STATE_COPY = 'No tokens are registered for this tab';

/**
 * Wait for Preact to flush effects. Preact uses `requestAnimationFrame`
 * (with a `setTimeout(35)` polyfill in `w`) so we burn two rAFs and a
 * macrotask to be safe.
 */
async function waitForEffectFlush(): Promise<void> {
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
  await new Promise<void>((resolve) => setTimeout(resolve, 50));
}

const DEMO_SPACING_TOKEN: TokenDef = {
  id: 'demo-sm',
  cssVar: '--demo-sm',
  label: 'demo-sm',
  group: 'hsp',
  default: '4px',
  min: 0,
  max: 32,
  step: 1,
  unit: 'px',
};

describe('design-token-panel empty-state', () => {
  beforeEach(() => {
    __resetPanelConfigForTests();
    localStorage.clear();
    document.body.innerHTML = '';
    // Drop adapter / lifecycle slots so the dynamic import re-bootstraps for
    // each test.
    const adapterWin = window as unknown as Record<string, unknown>;
    delete adapterWin.__zudoDesignTokenPanelAdapter;
    delete adapterWin.__zudoDesignTokenPanelLifecycle;
  });

  afterEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
    __resetPanelConfigForTests();
  });

  it('renders empty-state copy when spacing/font/size manifests are empty', async () => {
    // Configure with a fully-empty token manifest. The empty-state should
    // surface for spacing / font / size; the color tab is driven by the
    // cluster, not `tokens.color`.
    configurePanel({
      ...DEFAULT_PANEL_CONFIG,
      tokens: { spacing: [], typography: [], size: [], color: [] },
    });

    // Bootstrap path mirrors auto-mount-on-visibility — set the visibility
    // flag, then call `showDesignTokenPanel` to mount the panel synchronously.
    localStorage.setItem(STORAGE_KEY_VISIBLE, '1');
    const { showDesignTokenPanel } = await import('../index');
    showDesignTokenPanel();
    await waitForEffectFlush();

    const root = document.getElementById(PANEL_ROOT_ID);
    expect(root).not.toBeNull();

    // The empty-state copy MUST appear in the rendered DOM. Three tabpanels
    // (spacing / font / size) render it concurrently — `hidden` only controls
    // visibility, not whether the subtree exists — so a single substring
    // check suffices to prove at least one fired.
    expect(root!.textContent ?? '').toContain(EMPTY_STATE_COPY);

    // The empty-state ships an anchor pointing at the package's GitHub
    // README — guarding the anchor presence keeps the actionable
    // affordance from regressing into a plain text-only message in a
    // future refactor.
    const anchor = root!.querySelector('a.tokenpanel-empty-state-link');
    expect(anchor).not.toBeNull();
    expect(anchor?.getAttribute('href') ?? '').toContain(
      'github.com/Takazudo/zudo-design-token-panel',
    );
  });

  it('renders the populated tab UI (no empty-state) when the host configures a non-empty manifest', async () => {
    // Configure with a non-empty spacing manifest so the empty-state must
    // NOT fire on the spacing tab. Other tabs may still show the
    // empty-state, so we assert specifically against the spacing tabpanel.
    configurePanel({
      ...DEFAULT_PANEL_CONFIG,
      tokens: {
        spacing: [DEMO_SPACING_TOKEN],
        typography: [],
        size: [],
        color: [],
      },
    });

    localStorage.setItem(STORAGE_KEY_VISIBLE, '1');
    const { showDesignTokenPanel } = await import('../index');
    showDesignTokenPanel();
    await waitForEffectFlush();

    const root = document.getElementById(PANEL_ROOT_ID);
    expect(root).not.toBeNull();

    // The spacing tabpanel must NOT contain the empty-state copy when the
    // spacing manifest is non-empty — this is the regression guard.
    // Use an attribute prefix selector because the panel scopes IDs with a
    // useId() suffix (e.g. dtp-panel-:r0:-spacing) to support multi-instance.
    const spacingPanel = root!.querySelector('[role="tabpanel"][id*="-spacing"]');
    expect(spacingPanel).not.toBeNull();
    expect(spacingPanel!.textContent ?? '').not.toContain(EMPTY_STATE_COPY);
  });
});
