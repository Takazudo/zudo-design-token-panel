import { describe, expect, it, vi } from 'vitest';
import type { TabConfig } from '../../../tokens/tier-model';
import type { FlatTabEntry } from '../types';
import { tokenAddressKey } from '../types';
import { getTokenController } from '../token-controller';

const TAB: TabConfig = {
  id: 'custom',
  label: 'Custom',
  tiers: [{
    id: 'values',
    label: 'Values',
    items: [
      { id: 'alpha', cssVar: '--alpha', label: 'Alpha', default: 'a', type: { kind: 'text' } },
    ],
  }],
};

function entriesOf(tab: TabConfig): Map<string, FlatTabEntry> {
  const entries = new Map<string, FlatTabEntry>();
  for (const tier of tab.tiers) {
    for (const item of tier.items) {
      const address = { tabId: tab.id, tierId: tier.id, itemId: item.id };
      entries.set(tokenAddressKey(address), { address, tab, tier, item, value: item.default, kind: item.type.kind });
    }
  }
  return entries;
}

describe('getTokenController', () => {
  it('adapts flat and generic addresses to value, set, and revert operations', () => {
    const setValue = vi.fn();
    const deleteValue = vi.fn();
    const controller = getTokenController(
      { entries: entriesOf(TAB), setValue, deleteValue },
      { tabId: 'custom', tierId: 'values', itemId: 'alpha' },
    );
    expect(controller.value).toBe('a');
    expect(controller.kind).toBe('text');
    expect(controller.readonly).toBe(false);
    controller.setValue('changed');
    controller.revert();
    expect(setValue).toHaveBeenCalledWith(
      { tabId: 'custom', tierId: 'values', itemId: 'alpha' },
      'changed',
    );
    expect(deleteValue).toHaveBeenCalledWith(
      { tabId: 'custom', tierId: 'values', itemId: 'alpha' },
    );
  });

  it('keeps Color addresses read-only and exposes jumpTo', () => {
    const colorTab: TabConfig = {
      id: 'color',
      label: 'Color',
      tiers: [{ id: 'palette', label: 'Palette', items: [{
        id: 'brand', cssVar: '--brand', label: 'Brand', default: '#ff0000', type: { kind: 'color' },
      }] }],
    };
    const setValue = vi.fn();
    const deleteValue = vi.fn();
    const jumpTo = vi.fn();
    const controller = getTokenController(
      { entries: entriesOf(colorTab), setValue, deleteValue, jumpTo },
      { tabId: 'color', tierId: 'palette', itemId: 'brand' },
    );
    expect(controller.value).toBe('#ff0000');
    expect(controller.readonly).toBe(true);
    controller.setValue('changed');
    controller.revert();
    controller.jumpTo?.();
    expect(setValue).not.toHaveBeenCalled();
    expect(deleteValue).not.toHaveBeenCalled();
    expect(jumpTo).toHaveBeenCalledWith(
      { tabId: 'color', tierId: 'palette', itemId: 'brand' },
    );
  });

  it('throws for an unknown address', () => {
    expect(() => getTokenController(
      { entries: entriesOf(TAB), setValue: vi.fn(), deleteValue: vi.fn() },
      { tabId: 'custom', tierId: 'values', itemId: 'missing' },
    )).toThrow('Unknown token address');
  });
});
