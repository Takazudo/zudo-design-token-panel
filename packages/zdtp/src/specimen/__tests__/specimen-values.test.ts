// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import type { TabConfig } from '../../tokens/tier-model';
import { findLineHeightBasePx, lengthToPx, resolvePreviewLength } from '../specimen-values';

const TAB: TabConfig = {
  id: 'font',
  label: 'Font',
  tiers: [
    {
      id: 'scale',
      label: 'Scale',
      preview: 'size',
      items: [
        { id: 'small', cssVar: '--small', label: 'Small', default: '0.75rem', type: { kind: 'length', step: 0.1, unit: 'rem' } },
        { id: 'base', cssVar: '--base', label: 'Base', default: '1rem', type: { kind: 'length', step: 0.1, unit: 'rem' } },
      ],
    },
    {
      id: 'role',
      label: 'Role',
      preview: 'size',
      referencesTier: 'scale',
      items: [
        { id: 'body', cssVar: '--body', label: 'Body', default: 'base', type: { kind: 'text' } },
      ],
    },
    {
      id: 'leading',
      label: 'Leading',
      preview: 'line-height',
      items: [
        { id: 'normal', cssVar: '--leading', label: 'Normal', default: '1.5', type: { kind: 'number', step: 0.05 } },
      ],
    },
  ],
};

describe('specimen values', () => {
  it('converts px/rem/em and leaves calc values unresolved', () => {
    document.documentElement.style.fontSize = '20px';
    expect(lengthToPx('12px')).toBe(12);
    expect(lengthToPx('1.5rem')).toBe(30);
    expect(lengthToPx('0.5em')).toBe(10);
    expect(lengthToPx('calc(1rem + 2px)')).toBeNull();
    document.documentElement.style.removeProperty('font-size');
  });

  it('resolves reference-tier values through the selected target item', () => {
    const tier = TAB.tiers[1];
    const values: Record<string, string> = { body: 'small', small: '10px' };
    expect(resolvePreviewLength(TAB, tier, tier.items[0], (item) => values[item.id] ?? item.default)).toEqual({
      value: '10px',
      px: 10,
    });
  });

  it('chooses the first size tier value closest to 16px as line-height base', () => {
    expect(findLineHeightBasePx(TAB, TAB.tiers[2], (item) => item.default)).toBe(16);
  });
});
