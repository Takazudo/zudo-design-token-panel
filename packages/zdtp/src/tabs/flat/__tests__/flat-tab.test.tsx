// @vitest-environment jsdom

import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TabConfig } from '../../../tokens/tier-model';
import FlatTab from '../flat-tab';
import { scrollToTokenRow, TOKEN_ROW_FLASH_CLASS } from '../scroll-to-token-row';
import type { RowContribution, TokenAddress } from '../types';
import { tokenAddressKey } from '../types';
import { useTokenController } from '../token-controller';

const TAB: TabConfig = {
  id: 'custom',
  label: 'Custom',
  tiers: [{
    id: 'values',
    label: 'Values',
    items: [
      { id: 'alpha', cssVar: '--alpha', label: 'Alpha', default: 'a', type: { kind: 'text' } },
      { id: 'beta', cssVar: '--beta', label: 'Beta', default: 'b', type: { kind: 'text' } },
      { id: 'gamma', cssVar: '--gamma', label: 'Gamma', default: 'c', type: { kind: 'text' } },
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

function mount(contributions: readonly RowContribution[] = []) {
  act(() => {
    render(
      <FlatTab
        tab={TAB}
        getValue={(_address, item) => item.default}
        setValue={vi.fn()}
        deleteValue={vi.fn()}
        contributions={contributions}
      />,
      container,
    );
  });
}

describe('FlatTab contributions', () => {
  it('makes size and line-height preview tiers full-width without changing other grids', () => {
    const previewTab: TabConfig = {
      id: 'font',
      label: 'Font',
      tiers: [
        { ...TAB.tiers[0], id: 'sizes', label: 'Sizes', preview: 'size' },
        { ...TAB.tiers[0], id: 'leading', label: 'Leading', preview: 'line-height' },
        { ...TAB.tiers[0], id: 'families', label: 'Families', preview: 'family' },
        { ...TAB.tiers[0], id: 'plain', label: 'Plain' },
      ],
    };
    act(() => {
      render(
        <FlatTab
          tab={previewTab}
          getValue={(_address, item) => item.default}
          setValue={vi.fn()}
          deleteValue={vi.fn()}
        />,
        container,
      );
    });

    const grids = Array.from(container.querySelectorAll('.tokenpanel-tab-grid'));
    expect(grids.map((grid) => grid.classList.contains('tokenpanel-tab-grid--specimen'))).toEqual([
      true, true, false, false,
    ]);
  });

  it('renders every ordered region contribution and combines filters with AND', () => {
    mount([
      {
        id: 'first',
        filter: (entry) => entry.item.id !== 'alpha',
        leading: () => <span data-contribution="first-leading" />,
        trailing: () => <span data-contribution="first-trailing" />,
        className: () => 'from-first',
      },
      {
        id: 'second',
        filter: (entry) => entry.item.id !== 'beta',
        leading: () => <span data-contribution="second-leading" />,
        trailing: () => <span data-contribution="second-trailing" />,
        className: () => 'from-second',
      },
    ]);

    const rows = container.querySelectorAll<HTMLElement>('[data-address]');
    expect(rows).toHaveLength(1);
    expect(rows[0].dataset.cssVar).toBe('--gamma');
    expect(rows[0].classList.contains('from-first')).toBe(true);
    expect(rows[0].classList.contains('from-second')).toBe(true);
    expect(Array.from(rows[0].querySelectorAll('[data-contribution]')).map((node) =>
      node.getAttribute('data-contribution'))).toEqual([
      'first-leading', 'second-leading', 'first-trailing', 'second-trailing',
    ]);
  });

  it('puts stable address and CSS-variable metadata on every rendered row', () => {
    mount();
    const rows = container.querySelectorAll<HTMLElement>('[data-address]');
    expect(rows).toHaveLength(3);
    expect(rows[0].dataset.address).toBe(tokenAddressKey({
      tabId: 'custom', tierId: 'values', itemId: 'alpha',
    }));
    expect(Array.from(rows).map((row) => row.dataset.cssVar)).toEqual([
      '--alpha', '--beta', '--gamma',
    ]);
  });

  it('gives a tier-body override the contribution-aware shared row renderer', () => {
    const contribution: RowContribution = {
      id: 'marker',
      leading: (entry) => <span data-marker={entry.item.id} />,
    };
    act(() => {
      render(
        <FlatTab
          tab={TAB}
          getValue={(_address, item) => item.default}
          setValue={vi.fn()}
          deleteValue={vi.fn()}
          contributions={[contribution]}
          renderTierBody={(tier, renderRow) => [...tier.items].reverse().map(renderRow)}
        />,
        container,
      );
    });

    expect(Array.from(container.querySelectorAll<HTMLElement>('[data-address]')).map(
      (row) => row.dataset.cssVar,
    )).toEqual(['--gamma', '--beta', '--alpha']);
    expect(container.querySelectorAll('[data-marker]')).toHaveLength(3);
  });
});

describe('scrollToTokenRow', () => {
  it('scrolls the exact address and applies the transient flash class', () => {
    mount();
    const address: TokenAddress = { tabId: 'custom', tierId: 'values', itemId: 'beta' };
    const row = container.querySelector<HTMLElement>(`[data-address="${tokenAddressKey(address)}"]`)!;
    row.scrollIntoView = vi.fn();

    expect(scrollToTokenRow(container, address)).toBe(row);
    expect(row.scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' });
    expect(row.classList.contains(TOKEN_ROW_FLASH_CLASS)).toBe(true);
    row.dispatchEvent(new Event('animationend'));
    expect(row.classList.contains(TOKEN_ROW_FLASH_CLASS)).toBe(false);
  });
});

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
    const contributions: RowContribution[] = [{
      id: 'controller',
      trailing: (entry) => <ControllerProbe address={entry.address} />,
    }];
    act(() => {
      render(<FlatTab tab={TAB} getValue={(_address, item) => item.default}
        setValue={setValue} deleteValue={deleteValue} contributions={contributions} />, container);
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
    const contributions: RowContribution[] = [{
      id: 'controller',
      trailing: (entry) => <ControllerProbe address={entry.address} />,
    }];
    act(() => {
      render(<FlatTab tab={colorTab} getValue={(_address, item) => item.default}
        setValue={setValue} deleteValue={deleteValue} jumpTo={jumpTo}
        contributions={contributions} />, container);
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
