// @vitest-environment jsdom

/**
 * Two-tier end-to-end smoke test — validates the 2-tier font shape (raw scale
 * + semantic reference) against the full persist + serde + apply pipeline.
 *
 * Mirrors the zfb example-app's font manifest:
 *   - font tab: tier 'raw' (6 length scale items) + tier 'semantic' (2 reference items)
 *   - spacing tab: 1 item (sanity cross-tab check)
 *
 * Steps covered:
 *   1. Config construction — PanelConfig with font + spacing tabs accepted.
 *   2. Spacing slider change → document.documentElement inline style updated.
 *   3. Raw-tier scale-base change → inline style + semantic var() ref cascade.
 *   4. Serialize (export) → v2 JSON shape assertions.
 *   5. Deserialize (import) round-trip → state matches overrides.
 *   6. Apply-pipeline fixture rewrite (apply-token-overrides pure module).
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act } from 'preact/test-utils';

import {
  __resetPanelConfigForTests,
  configurePanel,
  type PanelConfig,
} from '../config/panel-config';
import type { TabConfig } from '../tokens/tier-model';
import { applyFullState, type TweakState } from '../state/tweak-state';
import { serialize, deserialize, SCHEMA_V2 } from '../utils/design-token-serde';
import { applyTokenOverrides } from '../apply/apply-token-overrides';
import { FIXTURE_CLUSTER } from './_test-helpers';

// ---------------------------------------------------------------------------
// 2-tier font fixture — mirrors the zfb manifest shape
// ---------------------------------------------------------------------------

/**
 * Six raw scale items (kind: length). The cssVar prefix --zfbtest- is used
 * throughout so these tests never collide with other test suites' inline styles.
 */
const FONT_TAB: TabConfig = {
  id: 'font',
  label: 'Font',
  tiers: [
    {
      id: 'raw',
      label: 'Scale',
      // advancedTier: this tier is marked advanced in real zfb, but the test
      // does not exercise the advanced-collapse UI — just the data model.
      items: [
        {
          id: 'scale-xs',
          cssVar: '--zfbtest-scale-xs',
          label: 'Scale XS',
          group: 'scale',
          default: '0.75rem',
          type: { kind: 'length', min: 0.5, max: 4, step: 0.05, unit: 'rem' },
        },
        {
          id: 'scale-sm',
          cssVar: '--zfbtest-scale-sm',
          label: 'Scale SM',
          group: 'scale',
          default: '0.875rem',
          type: { kind: 'length', min: 0.5, max: 4, step: 0.05, unit: 'rem' },
        },
        {
          id: 'scale-base',
          cssVar: '--zfbtest-scale-base',
          label: 'Scale Base',
          group: 'scale',
          default: '1rem',
          type: { kind: 'length', min: 0.5, max: 4, step: 0.05, unit: 'rem' },
        },
        {
          id: 'scale-lg',
          cssVar: '--zfbtest-scale-lg',
          label: 'Scale LG',
          group: 'scale',
          default: '1.125rem',
          type: { kind: 'length', min: 0.5, max: 4, step: 0.05, unit: 'rem' },
        },
        {
          id: 'scale-xl',
          cssVar: '--zfbtest-scale-xl',
          label: 'Scale XL',
          group: 'scale',
          default: '1.25rem',
          type: { kind: 'length', min: 0.5, max: 4, step: 0.05, unit: 'rem' },
        },
        {
          id: 'scale-2xl',
          cssVar: '--zfbtest-scale-2xl',
          label: 'Scale 2XL',
          group: 'scale',
          default: '1.5rem',
          type: { kind: 'length', min: 0.5, max: 4, step: 0.05, unit: 'rem' },
        },
      ],
    },
    {
      id: 'semantic',
      label: 'Semantic',
      // This tier references raw items via item ids stored in state.typography.
      referencesTier: 'raw',
      items: [
        {
          // Default: points at 'scale-base' in the raw tier.
          id: 'text-base',
          cssVar: '--zfbtest-text-base',
          label: 'Text Base',
          group: 'semantic',
          default: 'scale-base',
          type: { kind: 'text' },
        },
        {
          // Default: points at 'scale-xl' in the raw tier.
          id: 'text-heading',
          cssVar: '--zfbtest-text-heading',
          label: 'Text Heading',
          group: 'semantic',
          default: 'scale-xl',
          type: { kind: 'text' },
        },
      ],
    },
  ],
};

/** 1-tier spacing tab — used for step 2 cross-tab sanity. */
const SPACING_TAB: TabConfig = {
  id: 'spacing',
  label: 'Spacing',
  tiers: [
    {
      id: 'raw',
      label: 'Spacing',
      items: [
        {
          id: 'spacing-md',
          cssVar: '--zfbtest-spacing-md',
          label: 'Spacing M',
          group: 'gap',
          default: '1rem',
          type: { kind: 'length', min: 0, max: 4, step: 0.05, unit: 'rem' },
        },
      ],
    },
  ],
};

/** Minimal PanelConfig wired for the font + spacing tabs. */
const ZFB_PANEL_CONFIG: PanelConfig = {
  storagePrefix: 'zfbtest',
  consoleNamespace: 'zfbtest',
  modalClassPrefix: 'zfbtest-modal',
  // schemaId is v1 legacy key; serialize() always emits SCHEMA_V2 regardless.
  schemaId: 'zudo-design-tokens/v1',
  exportFilenameBase: 'zfbtest-tokens',
  tabs: [SPACING_TAB, FONT_TAB],
  colorCluster: FIXTURE_CLUSTER,
  secondaryColorCluster: null,
  colorPresets: {},
};

// ---------------------------------------------------------------------------
// State helpers
// ---------------------------------------------------------------------------

/** Minimal TweakState seeded with a neutral color state and empty overrides. */
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
    // Seed the semantic tier items with their default ref targets so the tier
    // resolver emits the correct var() reference. The resolver uses the stored
    // override value (or falls back to itemId) as the ref lookup key; without
    // an explicit value the fallback is itemId → first raw item. Setting the
    // semantic items' defaults as overrides here matches how the panel
    // initialises state: item.default for semantic items IS the initial ref
    // target id, and the panel seeds typography with those defaults on first boot.
    typography: {
      'text-base': 'scale-base',
      'text-heading': 'scale-xl',
    },
    size: {},
  };
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

let container: HTMLDivElement;

beforeEach(() => {
  __resetPanelConfigForTests();
  configurePanel(ZFB_PANEL_CONFIG);

  container = document.createElement('div');
  document.body.appendChild(container);

  // Clear any inline styles from a previous test so assertions are clean.
  document.documentElement.removeAttribute('style');
});

afterEach(() => {
  document.body.removeChild(container);
  document.documentElement.removeAttribute('style');
  __resetPanelConfigForTests();
});

// ---------------------------------------------------------------------------
// Step 1 — Config construction
// ---------------------------------------------------------------------------

describe('step 1 — PanelConfig with 2-tier font tab accepted', () => {
  it('configures a font tab with two tiers (raw + semantic)', () => {
    const tabs = ZFB_PANEL_CONFIG.tabs;
    const fontTab = tabs.find((t) => t.id === 'font');
    expect(fontTab).toBeDefined();
    expect(fontTab!.tiers).toHaveLength(2);

    const rawTier = fontTab!.tiers.find((t) => t.id === 'raw');
    const semanticTier = fontTab!.tiers.find((t) => t.id === 'semantic');
    expect(rawTier).toBeDefined();
    expect(semanticTier).toBeDefined();

    // raw has 6 scale items
    expect(rawTier!.items).toHaveLength(6);
    // semantic has 2 reference items
    expect(semanticTier!.items).toHaveLength(2);
    expect(semanticTier!.referencesTier).toBe('raw');
  });

  it('configures a spacing tab with one item', () => {
    const tabs = ZFB_PANEL_CONFIG.tabs;
    const spacingTab = tabs.find((t) => t.id === 'spacing');
    expect(spacingTab).toBeDefined();
    expect(spacingTab!.tiers[0].items).toHaveLength(1);
    expect(spacingTab!.tiers[0].items[0].cssVar).toBe('--zfbtest-spacing-md');
  });
});

// ---------------------------------------------------------------------------
// Step 2 — Spacing slider change updates document.documentElement inline style
// ---------------------------------------------------------------------------

describe('step 2 — spacing slider change updates :root inline style', () => {
  it('applies --zfbtest-spacing-md override to document.documentElement', () => {
    const state = makeFreshState();
    const newState: TweakState = {
      ...state,
      spacing: { 'spacing-md': '1.5rem' },
    };

    act(() => {
      applyFullState(newState);
    });

    const val = document.documentElement.style.getPropertyValue('--zfbtest-spacing-md');
    expect(val).toBe('1.5rem');
  });

  it('does not set raw font scale vars inline when only spacing is overridden', () => {
    // Fresh state seeds semantic refs but no raw scale overrides.
    // --zfbtest-scale-base (raw tier) should stay unset inline so the
    // stylesheet default takes effect for the raw scale value.
    const state = makeFreshState();
    const newState: TweakState = {
      ...state,
      spacing: { 'spacing-md': '2rem' },
    };

    act(() => {
      applyFullState(newState);
    });

    // Raw scale items have no override → inline property should be empty.
    const scaleVal = document.documentElement.style.getPropertyValue('--zfbtest-scale-base');
    expect(scaleVal).toBe('');
  });
});

// ---------------------------------------------------------------------------
// Step 3 — Raw tier change cascades to semantic var() ref
// ---------------------------------------------------------------------------

describe('step 3 — raw-tier scale-base change and semantic var() cascade', () => {
  it('3a: sets --zfbtest-scale-base inline when typography override is applied', () => {
    const state = makeFreshState();
    const newState: TweakState = {
      ...state,
      // Merge raw override on top of semantic defaults so both are present.
      typography: { ...state.typography, 'scale-base': '1.2rem' },
    };

    act(() => {
      applyFullState(newState);
    });

    const val = document.documentElement.style.getPropertyValue('--zfbtest-scale-base');
    expect(val).toBe('1.2rem');
  });

  it('3b: --zfbtest-text-base resolves to var(--zfbtest-scale-base) in the inline style', () => {
    // The semantic tier item 'text-base' has its initial ref stored in
    // typography as 'scale-base' (seeded by makeFreshState). The tier resolver
    // uses that stored value as the ref lookup key → finds scale-base in the
    // raw tier → emits var(--zfbtest-scale-base) on :root.
    const state = makeFreshState();
    // Merge raw scale-base override with the existing semantic defaults.
    const newState: TweakState = {
      ...state,
      typography: { ...state.typography, 'scale-base': '1.2rem' },
    };

    act(() => {
      applyFullState(newState);
    });

    // The inline value for the semantic cssVar should be var(--zfbtest-scale-base).
    // jsdom doesn't resolve CSS variables, but the stored inline property value
    // is the var() string itself — that's what we assert here.
    const textBaseVal = document.documentElement.style.getPropertyValue('--zfbtest-text-base');
    expect(textBaseVal).toBe('var(--zfbtest-scale-base)');
  });

  it('3b-heading: --zfbtest-text-heading resolves to var(--zfbtest-scale-xl)', () => {
    const state = makeFreshState();
    // Merge scale-xl override with semantic defaults; text-heading's stored
    // ref is 'scale-xl' so it should emit var(--zfbtest-scale-xl).
    const newState: TweakState = {
      ...state,
      typography: { ...state.typography, 'scale-xl': '1.4rem' },
    };

    act(() => {
      applyFullState(newState);
    });

    const textHeadingVal = document.documentElement.style.getPropertyValue('--zfbtest-text-heading');
    // text-heading stored ref is 'scale-xl' → var(--zfbtest-scale-xl)
    expect(textHeadingVal).toBe('var(--zfbtest-scale-xl)');
  });
});

// ---------------------------------------------------------------------------
// Step 4 — Export (serialize) produces correct v2 JSON shape
// ---------------------------------------------------------------------------

describe('step 4 — serialize exports correct v2 JSON structure', () => {
  it('produces $schema: zudo-design-tokens/v2', () => {
    const base = makeFreshState();
    const state: TweakState = {
      ...base,
      typography: { ...base.typography, 'scale-base': '1.2rem' },
    };
    const json = serialize(state);
    expect(json.$schema).toBe(SCHEMA_V2);
  });

  it('tabs.font.raw contains --zfbtest-scale-base with the override value', () => {
    const base = makeFreshState();
    // Merge raw override on top of semantic defaults.
    const state: TweakState = {
      ...base,
      typography: { ...base.typography, 'scale-base': '1.2rem' },
    };
    const json = serialize(state);
    // serialize() emits the font tab overrides under { font: { raw: { cssVar: value } } }
    expect(json.tabs).toBeDefined();
    expect(json.tabs!['font']).toBeDefined();
    expect(json.tabs!['font']['raw']).toBeDefined();
    expect(json.tabs!['font']['raw']['--zfbtest-scale-base']).toBe('1.2rem');
  });

  it('tabs.font does NOT contain --zfbtest-text-base when semantic ref matches default', () => {
    // Only the raw scale-base was changed; the semantic text-base still points
    // at 'scale-base' (its item.default). The serde skips diff-only items whose
    // value matches their manifest default, so --zfbtest-text-base is absent.
    const base = makeFreshState();
    // state.typography: { 'text-base': 'scale-base', 'text-heading': 'scale-xl', 'scale-base': '1.2rem' }
    // 'text-base' value = 'scale-base' which equals text-base.default → not emitted
    const state: TweakState = {
      ...base,
      typography: { ...base.typography, 'scale-base': '1.2rem' },
    };
    const json = serialize(state);
    const fontTab = json.tabs?.['font'];
    // The semantic cssVar --zfbtest-text-base is not overridden (stored value
    // equals item.default) → absent from the diff-only export.
    expect(fontTab?.['raw']?.['--zfbtest-text-base']).toBeUndefined();
    // The serde always groups all font items under 'raw' (no separate 'semantic' key).
    expect(fontTab?.['semantic']).toBeUndefined();
  });

  it('tabs.spacing.raw contains --zfbtest-spacing-md when overridden', () => {
    const state: TweakState = { ...makeFreshState(), spacing: { 'spacing-md': '2rem' } };
    const json = serialize(state);
    expect(json.tabs?.['spacing']?.['raw']?.['--zfbtest-spacing-md']).toBe('2rem');
  });

  it('omits spacing/font/size tabs when state matches defaults (diff-only)', () => {
    // makeFreshState() seeds semantic typography with values equal to their
    // item.default, so nothing differs → no font tab emitted.
    const json = serialize(makeFreshState());
    expect(json.tabs?.['spacing']).toBeUndefined();
    expect(json.tabs?.['font']).toBeUndefined();
    expect(json.tabs?.['size']).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Step 5 — Deserialize (import) round-trip restores state
// ---------------------------------------------------------------------------

describe('step 5 — deserialize round-trip restores overrides', () => {
  it('round-trips a scale-base override through serialize → deserialize', () => {
    const base = makeFreshState();
    const original: TweakState = {
      ...base,
      typography: { ...base.typography, 'scale-base': '1.2rem' },
    };
    const json = serialize(original);
    const { state: restored, unknownTokens, warnings } = deserialize(json);

    expect(unknownTokens).toHaveLength(0);
    expect(warnings).toHaveLength(0);
    // The typography slice should contain the scale-base override
    expect(restored.typography['scale-base']).toBe('1.2rem');
  });

  it('round-trips spacing override alongside font override', () => {
    const base = makeFreshState();
    const original: TweakState = {
      ...base,
      spacing: { 'spacing-md': '1.75rem' },
      typography: { ...base.typography, 'scale-base': '1.1rem', 'scale-xl': '1.3rem' },
    };
    const json = serialize(original);
    const { state: restored } = deserialize(json);

    expect(restored.spacing['spacing-md']).toBe('1.75rem');
    expect(restored.typography['scale-base']).toBe('1.1rem');
    expect(restored.typography['scale-xl']).toBe('1.3rem');
  });

  it('applying the round-tripped state restores the same inline style values', () => {
    const base = makeFreshState();
    const original: TweakState = {
      ...base,
      typography: { ...base.typography, 'scale-base': '1.2rem' },
    };
    const json = serialize(original);
    const { state: restored } = deserialize(json);

    // Merge the round-tripped state with the fresh state's semantic defaults
    // so the tier resolver can emit the correct var() reference for text-base.
    const mergedTypography = { ...base.typography, ...restored.typography };
    act(() => {
      applyFullState({ ...base, ...restored, typography: mergedTypography });
    });

    expect(document.documentElement.style.getPropertyValue('--zfbtest-scale-base')).toBe('1.2rem');
    // Semantic var should still cascade as var(--zfbtest-scale-base) because
    // text-base's stored ref (from base.typography) is 'scale-base'.
    expect(document.documentElement.style.getPropertyValue('--zfbtest-text-base')).toBe(
      'var(--zfbtest-scale-base)',
    );
  });

  it('unknown cssVar in imported JSON lands in unknownTokens (no crash)', () => {
    const payload = {
      $schema: SCHEMA_V2,
      exportedAt: new Date().toISOString(),
      tabs: {
        font: {
          raw: {
            '--zfbtest-scale-base': '1.2rem',
            '--zfbtest-unknown-mystery-var': '99px',
          },
        },
      },
    };
    const { state: restored, unknownTokens } = deserialize(payload);
    expect(unknownTokens).toContain('--zfbtest-unknown-mystery-var');
    // The known override should still be present
    expect(restored.typography['scale-base']).toBe('1.2rem');
  });
});

// ---------------------------------------------------------------------------
// Step 6 — Apply-pipeline fixture rewrite (pure module, no disk IO)
// ---------------------------------------------------------------------------

describe('step 6 — apply-pipeline rewrites CSS fixture in-memory', () => {
  /**
   * In-memory CSS fixture that mirrors a real global.css declaration block for
   * the zfb example. The test verifies that applyTokenOverrides (the pure
   * rewriter) correctly rewrites an existing --zfbtest-scale-base declaration.
   */
  const FIXTURE_CSS = `:root {
  --zfbtest-scale-xs: 0.75rem;
  --zfbtest-scale-sm: 0.875rem;
  --zfbtest-scale-base: 1rem;
  --zfbtest-scale-lg: 1.125rem;
  --zfbtest-scale-xl: 1.25rem;
  --zfbtest-scale-2xl: 1.5rem;
}
`;

  it('rewrites --zfbtest-scale-base declaration to the override value', () => {
    const { updated, changed, unchanged, unknown } = applyTokenOverrides(FIXTURE_CSS, {
      '--zfbtest-scale-base': '1.2rem',
    });

    expect(changed).toContain('--zfbtest-scale-base');
    expect(unchanged).toHaveLength(0);
    expect(unknown).toHaveLength(0);
    expect(updated).toContain('--zfbtest-scale-base: 1.2rem;');
    // Other declarations must not be touched
    expect(updated).toContain('--zfbtest-scale-xs: 0.75rem;');
    expect(updated).toContain('--zfbtest-scale-xl: 1.25rem;');
  });

  it('is idempotent — second apply with same value reports unchanged', () => {
    const firstPass = applyTokenOverrides(FIXTURE_CSS, {
      '--zfbtest-scale-base': '1.2rem',
    });
    const secondPass = applyTokenOverrides(firstPass.updated, {
      '--zfbtest-scale-base': '1.2rem',
    });

    expect(secondPass.changed).toHaveLength(0);
    expect(secondPass.unchanged).toContain('--zfbtest-scale-base');
    expect(secondPass.updated).toBe(firstPass.updated);
  });

  it('reports unknown when the cssVar is not declared in the :root block', () => {
    const { unknown } = applyTokenOverrides(FIXTURE_CSS, {
      '--zfbtest-not-in-file': '5px',
    });

    expect(unknown).toContain('--zfbtest-not-in-file');
  });

  it('rewrites multiple cssVars in a single pass', () => {
    const { updated, changed } = applyTokenOverrides(FIXTURE_CSS, {
      '--zfbtest-scale-base': '1.15rem',
      '--zfbtest-scale-xl': '1.35rem',
    });

    expect(changed).toContain('--zfbtest-scale-base');
    expect(changed).toContain('--zfbtest-scale-xl');
    expect(updated).toContain('--zfbtest-scale-base: 1.15rem;');
    expect(updated).toContain('--zfbtest-scale-xl: 1.35rem;');
    // Unchanged items stay intact
    expect(updated).toContain('--zfbtest-scale-sm: 0.875rem;');
  });
});
