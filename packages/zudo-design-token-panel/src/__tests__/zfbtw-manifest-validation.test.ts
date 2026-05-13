/**
 * Validation test for the zfb-tailwind default manifest's Spacing tab.
 *
 * Exercises the tier-model pipeline with a TabConfig that mirrors the three
 * spacing tiers declared in examples/zfb-tailwind/config/default-manifest.ts:
 *   - spacing-scale: 4 items (xs/sm/md/lg)
 *   - hsp-scale:     5 items (xs..xl)
 *   - vsp-scale:     7 items (2xs..2xl)
 *
 * Does NOT import from examples/zfb-tailwind to avoid inverting the
 * dependency graph. The TabConfig literal is kept in sync with the manifest
 * by convention — tests assert structural invariants, not specific values.
 */

import { describe, expect, it } from 'vitest';

import {
  emitTierItemCssValue,
  resolveTierItemValue,
} from '../apply/tier-resolver';
import type { TabConfig } from '../tokens/tier-model';

// ---------------------------------------------------------------------------
// Mirror of the spacing tab from examples/zfb-tailwind/config/default-manifest.ts
// ---------------------------------------------------------------------------

const ZFBTW_SPACING_TAB: TabConfig = {
  id: 'spacing',
  label: 'Spacing',
  tiers: [
    {
      id: 'spacing-scale',
      label: 'Spacing scale',
      items: [
        {
          id: 'zfbtw-spacing-xs',
          cssVar: '--zfbtw-spacing-xs',
          label: 'Spacing XS',
          default: '0.25rem',
          type: { kind: 'length', min: 0, max: 1, step: 0.0625, unit: 'rem' },
        },
        {
          id: 'zfbtw-spacing-sm',
          cssVar: '--zfbtw-spacing-sm',
          label: 'Spacing S',
          default: '0.5rem',
          type: { kind: 'length', min: 0, max: 1.5, step: 0.0625, unit: 'rem' },
        },
        {
          id: 'zfbtw-spacing-md',
          cssVar: '--zfbtw-spacing-md',
          label: 'Spacing M',
          default: '1rem',
          type: { kind: 'length', min: 0, max: 4, step: 0.0625, unit: 'rem' },
        },
        {
          id: 'zfbtw-spacing-lg',
          cssVar: '--zfbtw-spacing-lg',
          label: 'Spacing L',
          default: '2rem',
          type: { kind: 'length', min: 0, max: 6, step: 0.0625, unit: 'rem' },
        },
      ],
    },
    {
      id: 'hsp-scale',
      label: 'Horizontal spacing',
      items: [
        {
          id: 'zfbtw-hsp-xs',
          cssVar: '--zfbtw-hsp-xs',
          label: 'H-Spacing XS',
          default: '0.25rem',
          type: { kind: 'length', min: 0, max: 1, step: 0.0625, unit: 'rem' },
        },
        {
          id: 'zfbtw-hsp-sm',
          cssVar: '--zfbtw-hsp-sm',
          label: 'H-Spacing S',
          default: '0.5rem',
          type: { kind: 'length', min: 0, max: 2, step: 0.0625, unit: 'rem' },
        },
        {
          id: 'zfbtw-hsp-md',
          cssVar: '--zfbtw-hsp-md',
          label: 'H-Spacing M',
          default: '1rem',
          type: { kind: 'length', min: 0, max: 4, step: 0.0625, unit: 'rem' },
        },
        {
          id: 'zfbtw-hsp-lg',
          cssVar: '--zfbtw-hsp-lg',
          label: 'H-Spacing L',
          default: '1.5rem',
          type: { kind: 'length', min: 0, max: 6, step: 0.0625, unit: 'rem' },
        },
        {
          id: 'zfbtw-hsp-xl',
          cssVar: '--zfbtw-hsp-xl',
          label: 'H-Spacing XL',
          default: '2rem',
          type: { kind: 'length', min: 0, max: 8, step: 0.125, unit: 'rem' },
        },
      ],
    },
    {
      id: 'vsp-scale',
      label: 'Vertical spacing',
      items: [
        {
          id: 'zfbtw-vsp-2xs',
          cssVar: '--zfbtw-vsp-2xs',
          label: 'V-Spacing 2XS',
          default: '0.25rem',
          type: { kind: 'length', min: 0, max: 1, step: 0.0625, unit: 'rem' },
        },
        {
          id: 'zfbtw-vsp-xs',
          cssVar: '--zfbtw-vsp-xs',
          label: 'V-Spacing XS',
          default: '0.5rem',
          type: { kind: 'length', min: 0, max: 2, step: 0.0625, unit: 'rem' },
        },
        {
          id: 'zfbtw-vsp-sm',
          cssVar: '--zfbtw-vsp-sm',
          label: 'V-Spacing S',
          default: '0.75rem',
          type: { kind: 'length', min: 0, max: 2, step: 0.0625, unit: 'rem' },
        },
        {
          id: 'zfbtw-vsp-md',
          cssVar: '--zfbtw-vsp-md',
          label: 'V-Spacing M',
          default: '1rem',
          type: { kind: 'length', min: 0, max: 4, step: 0.0625, unit: 'rem' },
        },
        {
          id: 'zfbtw-vsp-lg',
          cssVar: '--zfbtw-vsp-lg',
          label: 'V-Spacing L',
          default: '1.75rem',
          type: { kind: 'length', min: 0, max: 6, step: 0.0625, unit: 'rem' },
        },
        {
          id: 'zfbtw-vsp-xl',
          cssVar: '--zfbtw-vsp-xl',
          label: 'V-Spacing XL',
          default: '2.5rem',
          type: { kind: 'length', min: 0, max: 8, step: 0.125, unit: 'rem' },
        },
        {
          id: 'zfbtw-vsp-2xl',
          cssVar: '--zfbtw-vsp-2xl',
          label: 'V-Spacing 2XL',
          default: '3.5rem',
          type: { kind: 'length', min: 0, max: 10, step: 0.25, unit: 'rem' },
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function emit(tab: TabConfig, tierId: string, itemId: string): string {
  return emitTierItemCssValue(resolveTierItemValue(tab, tierId, itemId, {}));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('zfb-tailwind manifest — Spacing tab: 3-tier structure', () => {
  it('has exactly 3 tiers', () => {
    expect(ZFBTW_SPACING_TAB.tiers.length).toBe(3);
  });

  it('spacing-scale tier has 4 items', () => {
    const tier = ZFBTW_SPACING_TAB.tiers.find((t) => t.id === 'spacing-scale');
    expect(tier).toBeDefined();
    expect(tier!.items.length).toBe(4);
  });

  it('hsp-scale tier has 5 items', () => {
    const tier = ZFBTW_SPACING_TAB.tiers.find((t) => t.id === 'hsp-scale');
    expect(tier).toBeDefined();
    expect(tier!.items.length).toBe(5);
  });

  it('vsp-scale tier has 7 items', () => {
    const tier = ZFBTW_SPACING_TAB.tiers.find((t) => t.id === 'vsp-scale');
    expect(tier).toBeDefined();
    expect(tier!.items.length).toBe(7);
  });

  it('total items across all tiers is 16', () => {
    const total = ZFBTW_SPACING_TAB.tiers.reduce((sum, t) => sum + t.items.length, 0);
    expect(total).toBe(16);
  });

  it('no tier uses referencesTier (all three are primitive tiers)', () => {
    for (const tier of ZFBTW_SPACING_TAB.tiers) {
      expect(tier.referencesTier).toBeUndefined();
    }
  });

  it('emits literal default for spacing-scale items', () => {
    expect(emit(ZFBTW_SPACING_TAB, 'spacing-scale', 'zfbtw-spacing-xs')).toBe('0.25rem');
    expect(emit(ZFBTW_SPACING_TAB, 'spacing-scale', 'zfbtw-spacing-md')).toBe('1rem');
    expect(emit(ZFBTW_SPACING_TAB, 'spacing-scale', 'zfbtw-spacing-lg')).toBe('2rem');
  });

  it('emits literal default for hsp-scale items', () => {
    expect(emit(ZFBTW_SPACING_TAB, 'hsp-scale', 'zfbtw-hsp-xs')).toBe('0.25rem');
    expect(emit(ZFBTW_SPACING_TAB, 'hsp-scale', 'zfbtw-hsp-md')).toBe('1rem');
    expect(emit(ZFBTW_SPACING_TAB, 'hsp-scale', 'zfbtw-hsp-xl')).toBe('2rem');
  });

  it('emits literal default for vsp-scale items', () => {
    expect(emit(ZFBTW_SPACING_TAB, 'vsp-scale', 'zfbtw-vsp-2xs')).toBe('0.25rem');
    expect(emit(ZFBTW_SPACING_TAB, 'vsp-scale', 'zfbtw-vsp-md')).toBe('1rem');
    expect(emit(ZFBTW_SPACING_TAB, 'vsp-scale', 'zfbtw-vsp-2xl')).toBe('3.5rem');
  });

  it('emits override value when provided for an hsp item', () => {
    const overrides = { 'hsp-scale': { 'zfbtw-hsp-md': '1.25rem' } };
    const value = emitTierItemCssValue(
      resolveTierItemValue(ZFBTW_SPACING_TAB, 'hsp-scale', 'zfbtw-hsp-md', overrides),
    );
    expect(value).toBe('1.25rem');
  });

  it('emits override value when provided for a vsp item', () => {
    const overrides = { 'vsp-scale': { 'zfbtw-vsp-lg': '2rem' } };
    const value = emitTierItemCssValue(
      resolveTierItemValue(ZFBTW_SPACING_TAB, 'vsp-scale', 'zfbtw-vsp-lg', overrides),
    );
    expect(value).toBe('2rem');
  });

  it('each hsp-scale item cssVar follows the --zfbtw-hsp-* pattern', () => {
    const tier = ZFBTW_SPACING_TAB.tiers.find((t) => t.id === 'hsp-scale')!;
    for (const item of tier.items) {
      expect(item.cssVar).toMatch(/^--zfbtw-hsp-/);
    }
  });

  it('each vsp-scale item cssVar follows the --zfbtw-vsp-* pattern', () => {
    const tier = ZFBTW_SPACING_TAB.tiers.find((t) => t.id === 'vsp-scale')!;
    for (const item of tier.items) {
      expect(item.cssVar).toMatch(/^--zfbtw-vsp-/);
    }
  });
});
