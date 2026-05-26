// @vitest-environment jsdom

/**
 * Regression test for zdtp#266 — guards the post-#262 semantic-tier
 * mount-time cascade behavior under the vite-react font-tab shape.
 *
 * Diagnosis recap (issue #266)
 * ----------------------------
 * The reported "fill scale-md=1.5 → consumer renders 12px (0.75rem)" was
 * NOT a panel-side bug. The panel resolver is correct; #262's fallback chain
 * (findItem(refTier, item.default) ?? findItem(refTier, itemId) ?? items[0])
 * resolves cleanly under the vite-react manifest.
 *
 * Empirical reproduction in a real browser showed the bug only when Vite's
 * optimizeDeps pre-bundle cache (.vite/deps/) holds a pre-#262 version of
 * the panel package. file:-protocol panel updates do not bump package.json
 * version, so Vite's content-hashed cache invalidation misses the dist
 * change. After clearing .vite/deps and restarting, the cascade resolves
 * to 24px as expected.
 *
 * What this test guards
 * ---------------------
 * The PANEL resolver path. It exercises three scenarios:
 *
 *   (a) Fresh state with empty typography → applyFullState must write
 *       --vr-text-subsection-title as var(--vr-scale-md) (the #262 fix).
 *
 *   (b) User tweaks raw scale-md to 1.5rem (typography flat map) →
 *       --vr-scale-md is set to 1.5rem AND --vr-text-subsection-title
 *       remains var(--vr-scale-md).
 *
 *   (c) Stale semantic override scenario: typography has
 *       'vr-text-subsection-title': 'vr-scale-xs' (legitimate user pick or
 *       prior-session state). The resolver MUST emit var(--vr-scale-xs)
 *       because the override takes precedence — documents the correct
 *       precedence rule even when state shape is non-default.
 *
 * What this test does NOT guard
 * -----------------------------
 * Vite's optimizeDeps stale-cache hazard. That is a downstream build-tool
 * caching concern; example apps consuming the panel via file: protocol
 * should configure optimizeDeps.exclude to skip pre-bundling, or run with
 * vite --force during local panel iteration.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  __resetPanelConfigForTests,
  configurePanel,
  type PanelConfig,
} from '../config/panel-config';
import type { TabConfig } from '../tokens/tier-model';
import { applyFullState, type TweakState } from '../state/tweak-state';
import { FIXTURE_CLUSTER } from './_test-helpers';

// ---------------------------------------------------------------------------
// vite-react-shaped font tab fixture
// ---------------------------------------------------------------------------

const FONT_TAB: TabConfig = {
  id: 'font',
  label: 'Font',
  tiers: [
    {
      id: 'raw',
      label: 'Font scale',
      items: [
        {
          id: 'vr-scale-xs',
          cssVar: '--vr-scale-xs',
          label: 'Scale XS',
          default: '0.75rem',
          type: { kind: 'length', step: 0.0625, unit: 'rem' },
        },
        {
          id: 'vr-scale-sm',
          cssVar: '--vr-scale-sm',
          label: 'Scale SM',
          default: '0.875rem',
          type: { kind: 'length', step: 0.0625, unit: 'rem' },
        },
        {
          id: 'vr-scale-base',
          cssVar: '--vr-scale-base',
          label: 'Scale Base',
          default: '1rem',
          type: { kind: 'length', step: 0.0625, unit: 'rem' },
        },
        {
          id: 'vr-scale-md',
          cssVar: '--vr-scale-md',
          label: 'Scale MD',
          default: '1.125rem',
          type: { kind: 'length', step: 0.0625, unit: 'rem' },
        },
        {
          id: 'vr-scale-lg',
          cssVar: '--vr-scale-lg',
          label: 'Scale LG',
          default: '1.25rem',
          type: { kind: 'length', step: 0.0625, unit: 'rem' },
        },
        {
          id: 'vr-scale-xl',
          cssVar: '--vr-scale-xl',
          label: 'Scale XL',
          default: '1.75rem',
          type: { kind: 'length', step: 0.0625, unit: 'rem' },
        },
      ],
    },
    {
      id: 'semantic',
      label: 'Font role',
      referencesTier: 'raw',
      items: [
        {
          id: 'vr-text-section-title',
          cssVar: '--vr-text-section-title',
          label: 'Section Title',
          default: 'vr-scale-lg',
          type: { kind: 'text' },
        },
        {
          id: 'vr-text-subsection-title',
          cssVar: '--vr-text-subsection-title',
          label: 'Sub-section / Table Header',
          default: 'vr-scale-md',
          type: { kind: 'text' },
        },
        {
          id: 'vr-text-body',
          cssVar: '--vr-text-body',
          label: 'Body',
          default: 'vr-scale-base',
          type: { kind: 'text' },
        },
      ],
    },
  ],
};

const VR_PANEL_CONFIG: PanelConfig = {
  storagePrefix: 'vrtest',
  consoleNamespace: 'vrtest',
  modalClassPrefix: 'vrtest-modal',
  schemaId: 'zudo-design-tokens/v1',
  exportFilenameBase: 'vrtest-tokens',
  tabs: [FONT_TAB],
  colorPresets: {},
};

function makeFreshState(): TweakState {
  const paletteSize = FIXTURE_CLUSTER.paletteSize;
  const palette = Array.from({ length: paletteSize }, (_, i) =>
    i === 0 ? '#000000' : i === paletteSize - 1 ? '#ffffff' : '#808080',
  );
  return {
    color: {
      palette,
      background: 0,
      foreground: 15,
      cursor: 6,
      selectionBg: 0,
      selectionFg: 15,
      semanticMappings: { accent: 6, muted: 8, active: 14 },
      shikiTheme: 'dracula',
    },
    spacing: {},
    typography: {},
    size: {},
  };
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  __resetPanelConfigForTests();
  configurePanel(VR_PANEL_CONFIG);
  document.documentElement.removeAttribute('style');
});

afterEach(() => {
  document.documentElement.removeAttribute('style');
  __resetPanelConfigForTests();
});

// ---------------------------------------------------------------------------
// Scenario (a) — fresh mount with empty typography
// ---------------------------------------------------------------------------

describe('zdtp#266 — mount with empty typography (vite-react shape)', () => {
  it('writes var(--vr-scale-md) for --vr-text-subsection-title (#262 fix verifies)', () => {
    const state = makeFreshState();
    applyFullState(state);
    const written = document.documentElement.style.getPropertyValue(
      '--vr-text-subsection-title',
    );
    expect(written).toBe('var(--vr-scale-md)');
  });

  it('does NOT write inline --vr-scale-md when no raw-tier override exists', () => {
    const state = makeFreshState();
    applyFullState(state);
    const written = document.documentElement.style.getPropertyValue('--vr-scale-md');
    expect(written).toBe('');
  });
});

// ---------------------------------------------------------------------------
// Scenario (b) — user tweaks raw scale-md to 1.5rem
// ---------------------------------------------------------------------------

describe('zdtp#266 — raw scale-md tweak cascades correctly', () => {
  it('writes --vr-scale-md: 1.5rem AND keeps --vr-text-subsection-title pointing at var(--vr-scale-md)', () => {
    const state: TweakState = {
      ...makeFreshState(),
      typography: { 'vr-scale-md': '1.5rem' },
    };
    applyFullState(state);

    const scaleMd = document.documentElement.style.getPropertyValue('--vr-scale-md');
    const subsectionTitle = document.documentElement.style.getPropertyValue(
      '--vr-text-subsection-title',
    );

    expect(scaleMd).toBe('1.5rem');
    expect(subsectionTitle).toBe('var(--vr-scale-md)');
  });
});

// ---------------------------------------------------------------------------
// Scenario (c) — stale semantic override
// ---------------------------------------------------------------------------

describe('zdtp#266 — stale semantic override poisons the cascade', () => {
  it('writes var(--vr-scale-xs) for --vr-text-subsection-title when typography has stale override scale-xs', () => {
    const state: TweakState = {
      ...makeFreshState(),
      typography: {
        // Stale override from a prior session — semantic tier item pointing
        // at a different raw scale.
        'vr-text-subsection-title': 'vr-scale-xs',
      },
    };
    applyFullState(state);

    const subsectionTitle = document.documentElement.style.getPropertyValue(
      '--vr-text-subsection-title',
    );
    expect(subsectionTitle).toBe('var(--vr-scale-xs)');
  });

  it('stale semantic override DOES NOT update when user tweaks raw scale-md (poisoned cascade reproduction)', () => {
    const state: TweakState = {
      ...makeFreshState(),
      typography: {
        // Stale semantic override pointing at scale-xs (from prior session).
        'vr-text-subsection-title': 'vr-scale-xs',
        // User tweaks raw scale-md to 1.5rem in current session.
        'vr-scale-md': '1.5rem',
      },
    };
    applyFullState(state);

    const scaleMd = document.documentElement.style.getPropertyValue('--vr-scale-md');
    const subsectionTitle = document.documentElement.style.getPropertyValue(
      '--vr-text-subsection-title',
    );

    expect(scaleMd).toBe('1.5rem');
    // The stale semantic override wins — consumer sees scale-xs's default
    // (0.75rem) via var() resolution, not the tweaked scale-md (1.5rem).
    expect(subsectionTitle).toBe('var(--vr-scale-xs)');
  });
});
