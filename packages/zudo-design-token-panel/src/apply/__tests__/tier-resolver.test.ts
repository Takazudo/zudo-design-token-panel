import { describe, expect, it } from 'vitest';
import {
  resolveTierItemValue,
  emitTierItemCssValue,
  TierResolverError,
  type TabOverrides,
} from '../tier-resolver';
import type { TabConfig, TierItem } from '../../tokens/tier-model';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

const rawItem = (id: string, cssVar: string, defaultVal: string): TierItem => ({
  id,
  cssVar,
  label: id,
  default: defaultVal,
  type: { kind: 'text' },
});

const lengthItem = (id: string, cssVar: string, defaultVal: string): TierItem => ({
  id,
  cssVar,
  label: id,
  default: defaultVal,
  type: { kind: 'length', min: 0, max: 10, step: 0.25, unit: 'rem' },
});

const numberItem = (id: string, cssVar: string, defaultVal: string): TierItem => ({
  id,
  cssVar,
  label: id,
  default: defaultVal,
  type: { kind: 'number', min: 0, max: 100, step: 1 },
});

const selectItem = (id: string, cssVar: string, defaultVal: string, options: string[]): TierItem => ({
  id,
  cssVar,
  label: id,
  default: defaultVal,
  type: { kind: 'select', options },
});

const colorItem = (id: string, cssVar: string, defaultVal: string): TierItem => ({
  id,
  cssVar,
  label: id,
  default: defaultVal,
  type: { kind: 'color' },
});

/** A two-tier easing tab: tier "raw" (literal) → tier "semantic" (refs raw). */
const EASING_TAB: TabConfig = {
  id: 'easing',
  label: 'Easing',
  tiers: [
    {
      id: 'raw',
      label: 'Raw',
      items: [
        rawItem('ease-in', '--zfb-easing-ease-in', 'cubic-bezier(0.42,0,1,1)'),
        rawItem('ease-out', '--zfb-easing-ease-out', 'cubic-bezier(0,0,0.58,1)'),
        rawItem('ease-in-out', '--zfb-easing-ease-in-out', 'cubic-bezier(0.42,0,0.58,1)'),
      ],
    },
    {
      id: 'semantic',
      label: 'Semantic',
      referencesTier: 'raw',
      items: [
        rawItem('tab-open', '--zfb-easing-tab-open', 'ease-in'),
        rawItem('tab-close', '--zfb-easing-tab-close', 'ease-out'),
      ],
    },
  ],
};

/** A single-tier spacing tab. */
const SPACING_TAB: TabConfig = {
  id: 'spacing',
  label: 'Spacing',
  tiers: [
    {
      id: 'raw',
      label: 'Raw',
      items: [
        lengthItem('hsp-xs', '--zd-spacing-hgap-xs', '0.5rem'),
        lengthItem('hsp-sm', '--zd-spacing-hgap-sm', '1rem'),
      ],
    },
  ],
};

/** A size tab with a pill item (radius-full toggle). */
const SIZE_TAB_WITH_PILL: TabConfig = {
  id: 'size',
  label: 'Size',
  tiers: [
    {
      id: 'raw',
      label: 'Raw',
      items: [
        {
          id: 'radius-full',
          cssVar: '--zd-radius-full',
          label: 'Radius Full',
          default: '0.5rem',
          type: { kind: 'length', min: 0, max: 9999, step: 1, unit: 'px' },
          pill: {
            value: '9999px',
            customDefault: '0.5rem',
          },
        },
        lengthItem('radius-md', '--zd-radius-md', '0.375rem'),
      ],
    },
  ],
};

const EMPTY_OVERRIDES: TabOverrides = {};

// ---------------------------------------------------------------------------
// 1. Literal tier — no override (uses item default)
// ---------------------------------------------------------------------------

describe('resolveTierItemValue — literal, no override', () => {
  it('returns default when no override is present', () => {
    const result = resolveTierItemValue(SPACING_TAB, 'raw', 'hsp-xs', EMPTY_OVERRIDES);
    expect(result).toEqual({ kind: 'literal', value: '0.5rem' });
  });
});

// ---------------------------------------------------------------------------
// 2. Literal tier — with override
// ---------------------------------------------------------------------------

describe('resolveTierItemValue — literal, with override', () => {
  it('returns the override value when present', () => {
    const overrides: TabOverrides = { raw: { 'hsp-xs': '0.75rem' } };
    const result = resolveTierItemValue(SPACING_TAB, 'raw', 'hsp-xs', overrides);
    expect(result).toEqual({ kind: 'literal', value: '0.75rem' });
  });
});

// ---------------------------------------------------------------------------
// 3. Valid reference
// ---------------------------------------------------------------------------

describe('resolveTierItemValue — valid ref', () => {
  it('returns kind:ref with the target cssVar when the override id exists in the ref tier', () => {
    const overrides: TabOverrides = { semantic: { 'tab-open': 'ease-out' } };
    const result = resolveTierItemValue(EASING_TAB, 'semantic', 'tab-open', overrides);
    expect(result).toEqual({ kind: 'ref', targetCssVar: '--zfb-easing-ease-out' });
  });

  it('returns kind:ref using the override id pointing at ease-in', () => {
    const overrides: TabOverrides = { semantic: { 'tab-close': 'ease-in' } };
    const result = resolveTierItemValue(EASING_TAB, 'semantic', 'tab-close', overrides);
    expect(result).toEqual({ kind: 'ref', targetCssVar: '--zfb-easing-ease-in' });
  });
});

// ---------------------------------------------------------------------------
// 4. Missing ref id → fallback to item default in target tier
// ---------------------------------------------------------------------------

describe('resolveTierItemValue — unknown ref id fallback', () => {
  it('falls back to the target tier item matching the source itemId when ref id is unknown', () => {
    // 'nonexistent' is not an id in the raw tier → fall back to item 'tab-open' in raw
    // But 'tab-open' is not in the raw tier either → falls back to first item (ease-in)
    const overrides: TabOverrides = { semantic: { 'tab-open': 'nonexistent-id' } };
    const result = resolveTierItemValue(EASING_TAB, 'semantic', 'tab-open', overrides);
    // tab-open doesn't exist in raw tier, so fallback to first item: ease-in
    expect(result).toEqual({ kind: 'ref', targetCssVar: '--zfb-easing-ease-in' });
  });

  it('falls back to matching itemId in target tier when it exists (item.default not in ref tier)', () => {
    // item.default is 'totally-unknown-default' (not in raw tier) so item.default path skips.
    // itemId is 'ease-in' which IS in the raw tier → itemId path picks it up.
    const tabWithMatchingFallback: TabConfig = {
      id: 'test',
      label: 'Test',
      tiers: [
        {
          id: 'raw',
          label: 'Raw',
          items: [
            rawItem('ease-in', '--raw-ease-in', 'cubic-bezier(0.42,0,1,1)'),
            rawItem('ease-out', '--raw-ease-out', 'cubic-bezier(0,0,0.58,1)'),
          ],
        },
        {
          id: 'semantic',
          label: 'Semantic',
          referencesTier: 'raw',
          items: [
            // id matches an existing raw item, but default does NOT → itemId fallback fires
            rawItem('ease-in', '--semantic-ease-in', 'totally-unknown-default'),
          ],
        },
      ],
    };
    const overrides: TabOverrides = { semantic: { 'ease-in': 'totally-unknown' } };
    const result = resolveTierItemValue(tabWithMatchingFallback, 'semantic', 'ease-in', overrides);
    // item.default 'totally-unknown-default' not in raw; itemId 'ease-in' IS in raw → --raw-ease-in
    expect(result).toEqual({ kind: 'ref', targetCssVar: '--raw-ease-in' });
  });
});

// ---------------------------------------------------------------------------
// 4b. item.default honored before itemId and items[0] in fallback chain
// ---------------------------------------------------------------------------

describe('resolveTierItemValue — item.default fallback precedence', () => {
  it('resolves to item.default ref-tier match before itemId match and items[0] (all three candidates differ)', () => {
    // Fixture layout:
    //   ref-tier items (scale): nx-scale-xs (A), nx-scale-sm (B), nx-scale-md (C)  ← 3 distinct entries
    //   semantic item id: nx-scale-sm (B would match via itemId fallback)
    //   semantic item.default: nx-scale-md (C — the declared scale)
    //   override: an unknown id → triggers the fallback chain
    //
    // Expected: fallback resolves to C (nx-scale-md) via item.default,
    //           NOT B (itemId match) and NOT A (items[0]).
    const tab: TabConfig = {
      id: 'spacing',
      label: 'Spacing',
      tiers: [
        {
          id: 'scale',
          label: 'Scale',
          items: [
            rawItem('nx-scale-xs', '--nx-scale-xs', '0.25rem'),  // items[0] — should NOT win
            rawItem('nx-scale-sm', '--nx-scale-sm', '0.5rem'),   // itemId match — should NOT win
            rawItem('nx-scale-md', '--nx-scale-md', '1rem'),     // item.default — SHOULD win
          ],
        },
        {
          id: 'semantic',
          label: 'Semantic',
          referencesTier: 'scale',
          items: [
            // id='nx-scale-sm' → itemId match would find nx-scale-sm (B)
            // default='nx-scale-md' → item.default match should find nx-scale-md (C) first
            rawItem('nx-scale-sm', '--nx-semantic-gap', 'nx-scale-md'),
          ],
        },
      ],
    };

    // Override points at a non-existent id to trigger the fallback chain
    const overrides: TabOverrides = { semantic: { 'nx-scale-sm': 'nonexistent-override' } };
    const result = resolveTierItemValue(tab, 'semantic', 'nx-scale-sm', overrides);

    // item.default='nx-scale-md' exists in scale tier → resolves to --nx-scale-md (C)
    // Must NOT resolve to --nx-scale-xs (A / items[0]) or --nx-scale-sm (B / itemId match)
    expect(result).toEqual({ kind: 'ref', targetCssVar: '--nx-scale-md' });
  });

  it('item.default is honored even when no override is provided (no-override path also triggers fallback)', () => {
    // When there is no override, refItemId = itemId ('nx-scale-sm' is not in scale tier? No it is).
    // This test verifies the no-override path: refItemId = itemId directly, refItem found → no fallback needed.
    // So use an item whose id does NOT exist in the ref tier, making the fallback always fire.
    const tab: TabConfig = {
      id: 'spacing',
      label: 'Spacing',
      tiers: [
        {
          id: 'scale',
          label: 'Scale',
          items: [
            rawItem('nx-scale-xs', '--nx-scale-xs', '0.25rem'),  // items[0]
            rawItem('nx-scale-md', '--nx-scale-md', '1rem'),     // item.default target
          ],
        },
        {
          id: 'semantic',
          label: 'Semantic',
          referencesTier: 'scale',
          items: [
            // id='gap-base' — does NOT exist in scale tier (no itemId match possible)
            // default='nx-scale-md' → item.default must pick up nx-scale-md
            rawItem('gap-base', '--nx-semantic-gap-base', 'nx-scale-md'),
          ],
        },
      ],
    };

    const result = resolveTierItemValue(tab, 'semantic', 'gap-base', {});

    // refItemId = 'gap-base' (no override), not in scale tier → fallback fires
    // item.default='nx-scale-md' IS in scale tier → resolves to --nx-scale-md
    // NOT --nx-scale-xs (items[0])
    expect(result).toEqual({ kind: 'ref', targetCssVar: '--nx-scale-md' });
  });
});

// ---------------------------------------------------------------------------
// 5. Reference to unknown tier id → error
// ---------------------------------------------------------------------------

describe('resolveTierItemValue — unknown tier id error', () => {
  it('throws TierResolverError when the tierId does not exist in the tab', () => {
    expect(() =>
      resolveTierItemValue(EASING_TAB, 'does-not-exist', 'tab-open', EMPTY_OVERRIDES),
    ).toThrowError(TierResolverError);
  });

  it('error message names the missing tier', () => {
    expect(() =>
      resolveTierItemValue(EASING_TAB, 'phantom-tier', 'tab-open', EMPTY_OVERRIDES),
    ).toThrow(/phantom-tier/);
  });
});

// ---------------------------------------------------------------------------
// 6. Ref pointing at wrong tier (referencesTier mismatch) → error
// ---------------------------------------------------------------------------

describe('resolveTierItemValue — broken referencesTier config', () => {
  it('throws TierResolverError when referencesTier points at a tier that does not exist', () => {
    const brokenTab: TabConfig = {
      id: 'broken',
      label: 'Broken',
      tiers: [
        {
          id: 'semantic',
          label: 'Semantic',
          referencesTier: 'nonexistent-raw-tier',
          items: [rawItem('my-item', '--broken-my-item', 'fallback')],
        },
      ],
    };
    expect(() =>
      resolveTierItemValue(brokenTab, 'semantic', 'my-item', EMPTY_OVERRIDES),
    ).toThrowError(TierResolverError);
  });

  it('error message names the missing referencesTier id', () => {
    const brokenTab: TabConfig = {
      id: 'broken',
      label: 'Broken',
      tiers: [
        {
          id: 'semantic',
          label: 'Semantic',
          referencesTier: 'missing-tier-xyz',
          items: [rawItem('item-a', '--broken-a', 'default-a')],
        },
      ],
    };
    expect(() =>
      resolveTierItemValue(brokenTab, 'semantic', 'item-a', EMPTY_OVERRIDES),
    ).toThrow(/missing-tier-xyz/);
  });
});

// ---------------------------------------------------------------------------
// 7. Pill toggle emission
// ---------------------------------------------------------------------------

describe('resolveTierItemValue — pill toggle', () => {
  it('emits pill.value when the override equals pill.value (pill ON)', () => {
    const overrides: TabOverrides = { raw: { 'radius-full': '9999px' } };
    const result = resolveTierItemValue(SIZE_TAB_WITH_PILL, 'raw', 'radius-full', overrides);
    expect(result).toEqual({ kind: 'literal', value: '9999px' });
  });

  it('emits the override as-is when it does NOT equal pill.value (custom slider value)', () => {
    const overrides: TabOverrides = { raw: { 'radius-full': '1.5rem' } };
    const result = resolveTierItemValue(SIZE_TAB_WITH_PILL, 'raw', 'radius-full', overrides);
    expect(result).toEqual({ kind: 'literal', value: '1.5rem' });
  });

  it('emits pill.customDefault when there is no override (pill OFF, no prior value)', () => {
    const result = resolveTierItemValue(SIZE_TAB_WITH_PILL, 'raw', 'radius-full', EMPTY_OVERRIDES);
    expect(result).toEqual({ kind: 'literal', value: '0.5rem' });
  });

  it('emits item default for non-pill item with no override', () => {
    const result = resolveTierItemValue(SIZE_TAB_WITH_PILL, 'raw', 'radius-md', EMPTY_OVERRIDES);
    expect(result).toEqual({ kind: 'literal', value: '0.375rem' });
  });
});

// ---------------------------------------------------------------------------
// 8. emitTierItemCssValue
// ---------------------------------------------------------------------------

describe('emitTierItemCssValue', () => {
  it('returns the value string for a literal result', () => {
    expect(emitTierItemCssValue({ kind: 'literal', value: '1.25rem' })).toBe('1.25rem');
  });

  it('wraps the cssVar in var() for a ref result', () => {
    expect(emitTierItemCssValue({ kind: 'ref', targetCssVar: '--zfb-easing-ease-in' })).toBe(
      'var(--zfb-easing-ease-in)',
    );
  });
});

// ---------------------------------------------------------------------------
// 9. Every TierValueKind snapshotted — resolve without error
// ---------------------------------------------------------------------------

describe('resolveTierItemValue — every TierValueKind', () => {
  it('resolves a length item (snapshot)', () => {
    const result = resolveTierItemValue(SPACING_TAB, 'raw', 'hsp-sm', EMPTY_OVERRIDES);
    expect(result).toMatchInlineSnapshot(`
      {
        "kind": "literal",
        "value": "1rem",
      }
    `);
  });

  it('resolves a number item (snapshot)', () => {
    const tab: TabConfig = {
      id: 'test',
      label: 'Test',
      tiers: [{ id: 'raw', label: 'Raw', items: [numberItem('opacity-hover', '--zd-opacity-hover', '0.8')] }],
    };
    const result = resolveTierItemValue(tab, 'raw', 'opacity-hover', EMPTY_OVERRIDES);
    expect(result).toMatchInlineSnapshot(`
      {
        "kind": "literal",
        "value": "0.8",
      }
    `);
  });

  it('resolves a select item (snapshot)', () => {
    const tab: TabConfig = {
      id: 'test',
      label: 'Test',
      tiers: [
        {
          id: 'raw',
          label: 'Raw',
          items: [selectItem('fw-bold', '--zd-font-weight-bold', '700', ['400', '500', '700', '900'])],
        },
      ],
    };
    const result = resolveTierItemValue(tab, 'raw', 'fw-bold', EMPTY_OVERRIDES);
    expect(result).toMatchInlineSnapshot(`
      {
        "kind": "literal",
        "value": "700",
      }
    `);
  });

  it('resolves a text item (snapshot)', () => {
    const result = resolveTierItemValue(EASING_TAB, 'raw', 'ease-in', EMPTY_OVERRIDES);
    expect(result).toMatchInlineSnapshot(`
      {
        "kind": "literal",
        "value": "cubic-bezier(0.42,0,1,1)",
      }
    `);
  });

  it('resolves a color item (snapshot)', () => {
    const tab: TabConfig = {
      id: 'test',
      label: 'Test',
      tiers: [
        {
          id: 'palette',
          label: 'Palette',
          items: [colorItem('primary', '--zd-color-primary', '#3b82f6')],
        },
      ],
    };
    const result = resolveTierItemValue(tab, 'palette', 'primary', EMPTY_OVERRIDES);
    expect(result).toMatchInlineSnapshot(`
      {
        "kind": "literal",
        "value": "#3b82f6",
      }
    `);
  });

  it('resolves a ref kind item (snapshot)', () => {
    const result = resolveTierItemValue(EASING_TAB, 'semantic', 'tab-open', EMPTY_OVERRIDES);
    // No override → uses itemId 'tab-open' as ref id → finds ease-in? No: tab-open is not in raw tier.
    // Falls back to first item in raw tier (ease-in)
    expect(result).toMatchInlineSnapshot(`
      {
        "kind": "ref",
        "targetCssVar": "--zfb-easing-ease-in",
      }
    `);
  });
});

// ---------------------------------------------------------------------------
// 10. Ref tier with no overrides — item id not in target tier → first item
// ---------------------------------------------------------------------------

describe('resolveTierItemValue — ref with no overrides', () => {
  it('falls back to first raw item when the semantic item id does not exist in raw tier', () => {
    // tab-open is not an id in the raw tier, so it falls to first item (ease-in)
    const result = resolveTierItemValue(EASING_TAB, 'semantic', 'tab-open', EMPTY_OVERRIDES);
    expect(result).toEqual({ kind: 'ref', targetCssVar: '--zfb-easing-ease-in' });
  });
});

// ---------------------------------------------------------------------------
// 11. Empty referenced tier → error
// ---------------------------------------------------------------------------

describe('resolveTierItemValue — empty referenced tier', () => {
  it('throws TierResolverError when the referenced tier has zero items', () => {
    const tabWithEmptyRefTier: TabConfig = {
      id: 'test',
      label: 'Test',
      tiers: [
        {
          id: 'raw',
          label: 'Raw',
          items: [],
        },
        {
          id: 'semantic',
          label: 'Semantic',
          referencesTier: 'raw',
          items: [rawItem('my-token', '--test-my-token', 'fallback')],
        },
      ],
    };
    expect(() =>
      resolveTierItemValue(tabWithEmptyRefTier, 'semantic', 'my-token', EMPTY_OVERRIDES),
    ).toThrowError(TierResolverError);
  });

  it('error message identifies the empty referenced tier', () => {
    const tabWithEmptyRefTier: TabConfig = {
      id: 'test',
      label: 'Test',
      tiers: [
        {
          id: 'raw',
          label: 'Raw',
          items: [],
        },
        {
          id: 'semantic',
          label: 'Semantic',
          referencesTier: 'raw',
          items: [rawItem('my-token', '--test-my-token', 'fallback')],
        },
      ],
    };
    expect(() =>
      resolveTierItemValue(tabWithEmptyRefTier, 'semantic', 'my-token', EMPTY_OVERRIDES),
    ).toThrow(/raw/);
  });
});
