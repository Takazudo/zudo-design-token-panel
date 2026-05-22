import { describe, expect, it } from 'vitest';

import {
  emitTierItemCssValue,
  resolveTierItemValue,
  TierResolverError,
  type TabOverrides,
} from '../apply/tier-resolver';
import type { TabConfig } from '../tokens/tier-model';

const easingTab: TabConfig = {
  id: 'easing',
  label: 'Easing',
  tiers: [
    {
      id: 'raw',
      label: 'Raw curves',
      items: [
        {
          id: 'ease-in',
          cssVar: '--zfb-easing-ease-in',
          label: 'Ease in',
          default: 'cubic-bezier(0.42, 0, 1, 1)',
          type: { kind: 'text' },
        },
        {
          id: 'ease-out',
          cssVar: '--zfb-easing-ease-out',
          label: 'Ease out',
          default: 'cubic-bezier(0, 0, 0.58, 1)',
          type: { kind: 'text' },
        },
        {
          id: 'linear',
          cssVar: '--zfb-easing-linear',
          label: 'Linear',
          default: 'linear',
          type: { kind: 'text' },
        },
        {
          id: 'cursor-default',
          cssVar: '--zfb-easing-cursor-default',
          label: 'Cursor Default',
          default: 'default',
          type: { kind: 'cursor' },
        },
      ],
    },
    {
      id: 'semantic',
      label: 'Semantic roles',
      referencesTier: 'raw',
      items: [
        {
          id: 'tab-open',
          cssVar: '--zfb-easing-tab-open',
          label: 'Tab open',
          default: 'ease-out',
          type: { kind: 'text' },
        },
        {
          id: 'tab-close',
          cssVar: '--zfb-easing-tab-close',
          label: 'Tab close',
          default: 'ease-in',
          type: { kind: 'text' },
        },
      ],
    },
  ],
};

function emit(tab: TabConfig, tierId: string, itemId: string, overrides: TabOverrides): string {
  return emitTierItemCssValue(resolveTierItemValue(tab, tierId, itemId, overrides));
}

describe('tier-model integration (easing tab, 2-tier mode)', () => {
  it('emits the raw default literal when no override is set', () => {
    expect(emit(easingTab, 'raw', 'ease-in', {})).toBe('cubic-bezier(0.42, 0, 1, 1)');
    expect(emit(easingTab, 'raw', 'linear', {})).toBe('linear');
  });

  it('emits the cursor-kind item default literal when no override is set', () => {
    expect(emit(easingTab, 'raw', 'cursor-default', {})).toBe('default');
  });

  it('emits the raw override literal when one is set', () => {
    const overrides: TabOverrides = {
      raw: { 'ease-in': 'cubic-bezier(0.4, 0, 0.2, 1)' },
    };
    expect(emit(easingTab, 'raw', 'ease-in', overrides)).toBe('cubic-bezier(0.4, 0, 0.2, 1)');
  });

  it('emits var(--target) for a semantic item whose override names a raw item', () => {
    const overrides: TabOverrides = {
      semantic: { 'tab-open': 'linear' },
    };
    expect(emit(easingTab, 'semantic', 'tab-open', overrides)).toBe(
      'var(--zfb-easing-linear)',
    );
  });

  it('emits var(--item-default) for a semantic item whose override names an unknown raw item', () => {
    // tab-open.default = 'ease-out' → fallback resolves via item.default, not items[0]
    const overrides: TabOverrides = {
      semantic: { 'tab-open': 'does-not-exist' },
    };
    expect(emit(easingTab, 'semantic', 'tab-open', overrides)).toBe(
      'var(--zfb-easing-ease-out)',
    );
  });

  it('emits var(--item-default) for a semantic item with no override (fallback path)', () => {
    // tab-open.default = 'ease-out' → fallback resolves via item.default, not items[0]
    expect(emit(easingTab, 'semantic', 'tab-open', {})).toBe('var(--zfb-easing-ease-out)');
  });

  it('combines raw and semantic resolution in a single overrides bag', () => {
    const overrides: TabOverrides = {
      raw: { 'ease-out': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' },
      semantic: { 'tab-open': 'ease-out', 'tab-close': 'linear' },
    };
    expect(emit(easingTab, 'raw', 'ease-out', overrides)).toBe(
      'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    );
    expect(emit(easingTab, 'semantic', 'tab-open', overrides)).toBe(
      'var(--zfb-easing-ease-out)',
    );
    expect(emit(easingTab, 'semantic', 'tab-close', overrides)).toBe(
      'var(--zfb-easing-linear)',
    );
  });

  it('throws TierResolverError for an unknown tier id', () => {
    expect(() => emit(easingTab, 'nope', 'ease-in', {})).toThrow(TierResolverError);
  });

  it('throws TierResolverError for an unknown item id within an existing tier', () => {
    expect(() => emit(easingTab, 'raw', 'cubic-blah', {})).toThrow(TierResolverError);
  });
});

describe('tier-model integration: misconfigured tabs fail loud', () => {
  it('throws when referencesTier names a non-existent tier', () => {
    const brokenTab: TabConfig = {
      id: 'broken',
      label: 'Broken',
      tiers: [
        {
          id: 'semantic',
          label: 'Semantic',
          referencesTier: 'palette',
          items: [
            {
              id: 'role-a',
              cssVar: '--broken-role-a',
              label: 'Role A',
              default: 'palette-item',
              type: { kind: 'color' },
            },
          ],
        },
      ],
    };
    expect(() => emit(brokenTab, 'semantic', 'role-a', {})).toThrow(TierResolverError);
  });

  it('throws when a reference tier ends up empty (no fallback target)', () => {
    const emptyRefTab: TabConfig = {
      id: 'empty-ref',
      label: 'Empty ref',
      tiers: [
        { id: 'raw', label: 'Raw', items: [] },
        {
          id: 'semantic',
          label: 'Semantic',
          referencesTier: 'raw',
          items: [
            {
              id: 'role-a',
              cssVar: '--empty-role-a',
              label: 'Role A',
              default: 'fallback',
              type: { kind: 'color' },
            },
          ],
        },
      ],
    };
    expect(() => emit(emptyRefTab, 'semantic', 'role-a', {})).toThrow(TierResolverError);
  });
});
