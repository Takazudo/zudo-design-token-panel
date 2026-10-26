// @vitest-environment jsdom
/** @jsxImportSource @takazudo/zfb/zudo-react */

import { act, cleanupZr, renderZr } from '../../../zr/test-utils';
import { createPanelServices } from '../../../zr/panel-services';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TabConfig } from '../../../tokens/tier-model';
import FlatTab from '../flat-tab';
import { RoleButton } from '../../../controls/role-button';
import { scrollToTokenRow, TOKEN_ROW_FLASH_CLASS } from '../scroll-to-token-row';
import type { RowContribution, TokenAddress } from '../types';
import { tokenAddressKey } from '../types';

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
  act(() => cleanupZr());
  container.remove();
});

function mount(contributions: readonly RowContribution[] = []) {
  act(() => {
    renderZr(() => (
      <FlatTab
        tab={TAB}
        getValue={(_address, item) => item.default}
        setValue={vi.fn()}
        deleteValue={vi.fn()}
        contributions={contributions}
        services={createPanelServices()}
      />
    ), container);
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
      renderZr(() => (
        <FlatTab
          tab={previewTab}
          getValue={(_address, item) => item.default}
          setValue={vi.fn()}
          deleteValue={vi.fn()}
          services={createPanelServices()}
        />
      ), container);
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

  it('renders contribution-aware rows in a tier-order override', () => {
    const contribution: RowContribution = {
      id: 'marker',
      leading: (entry) => <span data-marker={entry.value.item.id} />,
    };
    act(() => {
      renderZr(() => (
        <FlatTab
          tab={TAB}
          getValue={(_address, item) => item.default}
          setValue={vi.fn()}
          deleteValue={vi.fn()}
          contributions={[contribution]}
          orderItems={(tier) => [...tier.items].reverse()}
          services={createPanelServices()}
        />
      ), container);
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

describe('FlatTab — manifest mode row revert', () => {
  const MODES_TAB: TabConfig = {
    id: 'modes',
    label: 'Modes',
    tiers: [{
      id: 'values',
      label: 'Mode values',
      items: [{
        id: 'mode-color',
        cssVar: '--test-mode-color',
        label: 'Mode color',
        default: '#222222',
        type: { kind: 'color' },
        modes: { light: '#ffffff', dark: '#111111' },
      }],
    }],
  };

  it('deletes the override key from a stub trailing revert instead of writing light-dark(manifest)', () => {
    const current: Record<string, Record<string, string>> = {
      values: { 'mode-color': 'light-dark(#abcdef, #123456)' },
    };
    const onChange = vi.fn((tierId: string, itemId: string, next: string | undefined) => {
      const nextTier = { ...current[tierId] };
      if (next === undefined) delete nextTier[itemId];
      else nextTier[itemId] = next;
      current[tierId] = nextTier;
    });
    const stubRevert: RowContribution = {
      id: 'stub-revert',
      trailing: (entry) => (
        <RoleButton
          data-testid={`stub-revert-${entry.value.item.id}`}
          aria-label={`Revert ${entry.value.item.label}`}
          onClick={() => onChange(entry.value.address.tierId, entry.value.address.itemId, undefined)}
        >
          Revert
        </RoleButton>
      ),
    };

    // Same setValue/deleteValue wiring GenericTab gives its FlatTab.
    act(() => {
      renderZr(() => (
        <FlatTab
          tab={MODES_TAB}
          getValue={(address, item) => current[address.tierId]?.[address.itemId] ?? item.default}
          setValue={(address, next) => onChange(address.tierId, address.itemId, next)}
          deleteValue={(address) => onChange(address.tierId, address.itemId, undefined)}
          overrides={current}
          contributions={[stubRevert]}
          services={createPanelServices()}
        />
      ), container);
    });

    const revert = container.querySelector<HTMLElement>('[data-testid="stub-revert-mode-color"]');
    expect(revert).not.toBeNull();
    act(() => {
      revert!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onChange).toHaveBeenCalledWith('values', 'mode-color', undefined);
    expect(onChange).not.toHaveBeenCalledWith(
      'values',
      'mode-color',
      'light-dark(#ffffff, #111111)',
    );
    expect(current.values?.['mode-color']).toBeUndefined();
  });
});
