// @vitest-environment jsdom

import { render } from 'preact';
import { act } from '../../../zr/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TabConfig } from '../../../tokens/tier-model';
import type { FlatTabEntry, TokenAddress } from '../types';
import { tokenAddressKey } from '../types';
import { TokenControllerProvider, useTokenController } from '../token-controller';

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

let container: HTMLDivElement;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  act(() => render(null, container));
  container.remove();
});

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

function ControllerProbe({ address }: { address: TokenAddress }) {
  const controller = useTokenController(address);
  return (
    <span
      data-controller-value={controller.value}
      data-controller-kind={controller.kind}
      data-controller-readonly={String(controller.readonly)}
      onClick={() => controller.setValue('changed')}
      onDblClick={() => controller.revert()}
      onMouseDown={() => controller.jumpTo?.()}
    />
  );
}

describe('useTokenController', () => {
  it('adapts flat and generic addresses to value, set, and revert operations', () => {
    const setValue = vi.fn();
    const deleteValue = vi.fn();
    act(() => {
      render(
        <TokenControllerProvider entries={entriesOf(TAB)} setValue={setValue} deleteValue={deleteValue}>
          <ControllerProbe address={{ tabId: 'custom', tierId: 'values', itemId: 'alpha' }} />
        </TokenControllerProvider>,
        container,
      );
    });
    const probe = container.querySelector<HTMLElement>('[data-controller-value="a"]')!;
    expect(probe.dataset.controllerKind).toBe('text');
    expect(probe.dataset.controllerReadonly).toBe('false');
    probe.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    probe.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
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
    act(() => {
      render(
        <TokenControllerProvider entries={entriesOf(colorTab)} setValue={setValue} deleteValue={deleteValue} jumpTo={jumpTo}>
          <ControllerProbe address={{ tabId: 'color', tierId: 'palette', itemId: 'brand' }} />
        </TokenControllerProvider>,
        container,
      );
    });
    const probe = container.querySelector<HTMLElement>('[data-controller-value="#ff0000"]')!;
    expect(probe.dataset.controllerReadonly).toBe('true');
    probe.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    probe.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    probe.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(setValue).not.toHaveBeenCalled();
    expect(deleteValue).not.toHaveBeenCalled();
    expect(jumpTo).toHaveBeenCalledWith(
      { tabId: 'color', tierId: 'palette', itemId: 'brand' },
    );
  });
});
