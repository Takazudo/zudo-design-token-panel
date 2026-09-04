// @vitest-environment jsdom

import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { TabConfig } from '../../tokens/tier-model';
import FlatTab from '../../tabs/flat/flat-tab';
import type { FlatTabEntry } from '../../tabs/flat/types';
import {
  isBulkSelectable,
  transformBulkEntry,
  type BulkPatchEntry,
} from '../bulk-actions';

const TAB: TabConfig = {
  id: 'spacing',
  label: 'Spacing',
  tiers: [{
    id: 'scale',
    label: 'Scale',
    items: [
      { id: 'one', cssVar: '--one', label: 'One', default: '1rem', type: { kind: 'length', step: 0.125, unit: 'rem' } },
      { id: 'two', cssVar: '--two', label: 'Two', default: '2rem', type: { kind: 'length', step: 0.125, unit: 'rem' } },
      { id: 'readonly', cssVar: '--readonly', label: 'Readonly', default: '3rem', readonly: true, type: { kind: 'length', step: 0.125, unit: 'rem' } },
      { id: 'pill', cssVar: '--pill', label: 'Pill', default: '4px', pill: { value: '9999px', customDefault: '4px' }, type: { kind: 'length', step: 1, unit: 'px' } },
    ],
  }, {
    id: 'reference',
    label: 'Reference',
    referencesTier: 'scale',
    items: [{ id: 'reference-item', cssVar: '--reference', label: 'Reference', default: 'one', type: { kind: 'length', step: 1, unit: 'rem' } }],
  }, {
    id: 'invalid',
    label: 'Invalid',
    items: [{ id: 'invalid-item', cssVar: '--invalid', label: 'Invalid', default: 'var(--other)', type: { kind: 'length', step: 1, unit: 'rem' } }],
  }, {
    id: 'other',
    label: 'Other',
    items: [{ id: 'number', cssVar: '--number', label: 'Number', default: '3', type: { kind: 'number', step: 1 } }],
  }],
};

function entry(overrides: Partial<FlatTabEntry> = {}): FlatTabEntry {
  const item = TAB.tiers[0].items[0];
  return {
    address: { tabId: TAB.id, tierId: 'scale', itemId: item.id },
    tab: TAB,
    tier: TAB.tiers[0],
    item,
    value: item.default,
    kind: item.type.kind,
    ...overrides,
  };
}

describe('bulk selection rule', () => {
  it('accepts writable parseable numeric rows and rejects protected rows', () => {
    expect(isBulkSelectable(entry())).toBe(true);
    expect(isBulkSelectable(entry({ item: { ...entry().item, readonly: true } }))).toBe(false);
    expect(isBulkSelectable(entry({ value: '9999px', item: { ...entry().item, pill: { value: '9999px', customDefault: '4px' } } }))).toBe(false);
    expect(isBulkSelectable(entry({ tier: { ...entry().tier, referencesTier: 'other' } }))).toBe(false);
    expect(isBulkSelectable(entry({ value: 'var(--other)' }))).toBe(false);
  });

  it('applies set before multiply/add/round and preserves the unit', () => {
    expect(transformBulkEntry(entry(), {
      multiply: '1.1', add: '0.1', roundToStep: '0.25', setTo: '',
    })).toBe('1.25rem');
    expect(transformBulkEntry(entry(), {
      multiply: '1.1', add: '0', roundToStep: '0.125', setTo: '2',
    })).toBe('2rem');
    expect(transformBulkEntry(entry(), {
      multiply: '', add: '', roundToStep: '', setTo: '',
    })).toBe('1rem');
    expect(transformBulkEntry(entry({
      address: { tabId: TAB.id, tierId: 'other', itemId: 'number' },
      tier: TAB.tiers[3],
      item: TAB.tiers[3].items[0],
      value: '3',
      kind: 'number',
    }), {
      multiply: '-1', add: '0', roundToStep: '0', setTo: '',
    })).toBe('0');
  });
});

describe('FlatTab bulk contribution', () => {
  let container: HTMLDivElement;

  afterEach(() => {
    if (!container) return;
    act(() => render(null, container));
    container.remove();
  });

  it('selects only selectable rows and emits one whole patch on apply', () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    const onBulkApply = vi.fn<(patch: readonly BulkPatchEntry[]) => void>();
    act(() => {
      render(
        <FlatTab
          tab={TAB}
          getValue={(_address, item) => item.default}
          setValue={vi.fn()}
          deleteValue={vi.fn()}
          onBulkApply={onBulkApply}
        />,
        container,
      );
    });

    const selectAll = container.querySelector<HTMLInputElement>('[data-testid="bulk-select-tier-other"]');
    expect(selectAll).not.toBeNull();
    act(() => selectAll?.click());
    expect(container.querySelectorAll<HTMLInputElement>('.tokenpanel-bulk-row-checkbox:checked')).toHaveLength(1);
    const multiply = container.querySelector<HTMLInputElement>('[data-testid="bulk-multiply"]')!;
    act(() => {
      multiply.value = '2';
      multiply.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const apply = container.querySelector<HTMLElement>('[data-testid="bulk-apply"]')!;
    act(() => apply.click());
    expect(onBulkApply).toHaveBeenCalledTimes(1);
    expect(onBulkApply.mock.calls[0][0]).toEqual([{
      address: { tabId: 'spacing', tierId: 'other', itemId: 'number' },
      value: '6',
    }]);

    // Applying is one-shot: the controlled operation fields reset, so a
    // second click cannot repeat the previous transform.
    act(() => apply.click());
    expect(onBulkApply).toHaveBeenCalledTimes(1);
  });
});
