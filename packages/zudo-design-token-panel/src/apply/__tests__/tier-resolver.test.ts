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

  it('falls back to matching itemId in target tier when it exists', () => {
    // 'ease-in' exists in raw tier, and tab has an item 'ease-in' in semantic
    // Let's test with a tab where the fallback-by-id succeeds
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
            // id matches an existing raw item — so fallback-by-id picks it up
            rawItem('ease-in', '--semantic-ease-in', 'ease-in'),
          ],
        },
      ],
    };
    const overrides: TabOverrides = { semantic: { 'ease-in': 'totally-unknown' } };
    const result = resolveTierItemValue(tabWithMatchingFallback, 'semantic', 'ease-in', overrides);
    // 'totally-unknown' not in raw; fallback to matching id 'ease-in' in raw → --raw-ease-in
    expect(result).toEqual({ kind: 'ref', targetCssVar: '--raw-ease-in' });
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
