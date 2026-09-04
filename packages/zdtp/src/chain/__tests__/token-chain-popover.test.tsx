// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import { LayerActivityProvider } from '../../shell/layer-activity';
import { HighlightContext, type HighlightContextValue } from '../../highlight/highlight-toggle-button';
import { DEFAULT_HIGHLIGHT_SLOTS, type HighlightState } from '../../highlight/highlight-state';
import { EXAMPLE_PANEL_CONFIG } from '../../__tests__/_example-ramp-native-tier2';
import type { TweakState } from '../../state/tweak-state';
import { tokenAddressKey } from '../../tabs/flat/types';
import { TokenChainButton } from '../token-chain-popover';
import { TokenChainProvider } from '../token-chain-context';

function makeState(): TweakState {
  return {
    color: {
      palette: [],
      background: 0,
      foreground: 0,
      cursor: 0,
      selectionBg: 0,
      selectionFg: 0,
      semanticMappings: {
        surface: { ref: { tab: 'palette', tier: 'base', item: 'base-2' } },
        brand: { ref: { tab: 'palette', tier: 'accent', item: 'accent-1' } },
        info: { literal: 'oklch(0.6 0.1 230)' },
        danger: { literal: 'oklch(0.55 0.22 25)' },
      },
      shikiTheme: 'github-dark',
    },
    spacing: {},
    typography: {},
    size: {},
    tabs: {
      palette: {
        base: { 'base-2': 'oklch(0.72 0.08 220)' },
        accent: { 'accent-1': 'oklch(0.55 0.2 250)' },
      },
    },
  };
}

function makeHighlightState(): HighlightState {
  return {
    slots: DEFAULT_HIGHLIGHT_SLOTS.map((slot) => ({ ...slot })),
    outlineWidth: 2,
    active: {},
  };
}

function renderChain(
  container: HTMLDivElement,
  address: { tabId: string; tierId: string; itemId: string },
  requestMatchCount: HighlightContextValue['requestMatchCount'],
) {
  const ctx: HighlightContextValue = {
    state: makeHighlightState(),
    toggle: vi.fn(),
    matchCounts: {},
    requestMatchCount,
  };
  act(() => {
    render(
      h(LayerActivityProvider, null,
        h(HighlightContext.Provider, { value: ctx },
          h(TokenChainProvider, { instanceConfig: EXAMPLE_PANEL_CONFIG, state: makeState() },
            h(TokenChainButton, { address }),
          ),
        ),
      ),
      container,
    );
  });
  return ctx;
}

function setAnchorRect(anchor: HTMLElement | null): void {
  if (!anchor) return;
  anchor.getBoundingClientRect = () => ({
    top: 10,
    left: 20,
    width: 16,
    height: 16,
    right: 36,
    bottom: 26,
    x: 20,
    y: 10,
    toJSON: () => ({}),
  }) as DOMRect;
}

let container: HTMLDivElement;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  act(() => render(null, container));
  container.remove();
  document.querySelector('.tokenpanel-chain-popover')?.remove();
  vi.restoreAllMocks();
});

describe('TokenChainButton', () => {
  it('defers the count probe until opened and renders a ref resolution chain', () => {
    const requestMatchCount = vi.fn(() => 6);
    const address = { tabId: 'color', tierId: 'semantic', itemId: 'surface' };
    renderChain(container, address, requestMatchCount);

    expect(requestMatchCount).not.toHaveBeenCalled();
    const trigger = container.querySelector<HTMLElement>('.tokenpanel-chain-button');
    expect(trigger).not.toBeNull();
    setAnchorRect(trigger);

    act(() => {
      trigger!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const popover = document.querySelector<HTMLElement>('.tokenpanel-chain-popover');
    expect(popover).not.toBeNull();
    expect(popover?.textContent).toContain('--zd-surface');
    expect(popover?.textContent).toContain('--palette-base-2');
    expect(popover?.textContent).toContain('oklch(0.72 0.08 220)');
    expect(popover?.textContent).toContain('#68b1c7');
    expect(requestMatchCount).toHaveBeenCalledWith(address);
    expect(popover?.textContent).toContain('6 elements');
  });

  it('renders a literal chain and shows dependents, ramp siblings, and blast radius', () => {
    const counts: Record<string, number> = {
      'color/semantic/info': 2,
      'palette/base/base-2': 3,
      'color/semantic/surface': 4,
    };
    const requestMatchCount = vi.fn((address: { tabId: string; tierId: string; itemId: string }) =>
      counts[tokenAddressKey(address)] ?? 0,
    );
    const literalAddress = { tabId: 'color', tierId: 'semantic', itemId: 'info' };
    renderChain(container, literalAddress, requestMatchCount);

    setAnchorRect(container.querySelector<HTMLElement>('.tokenpanel-chain-button'));
    act(() => {
      container.querySelector<HTMLElement>('.tokenpanel-chain-button')!
        .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    let popover = document.querySelector<HTMLElement>('.tokenpanel-chain-popover');
    expect(popover?.textContent).toContain('--zd-info');
    expect(popover?.textContent).toContain('oklch(0.6 0.1 230)');
    expect(popover?.textContent).toContain('#');
    expect(popover?.textContent).toContain('depended on by');
    expect(popover?.textContent).toContain('—');

    act(() => {
      container.querySelector<HTMLElement>('.tokenpanel-chain-button')!
        .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const paletteAddress = { tabId: 'palette', tierId: 'base', itemId: 'base-2' };
    // Re-render the same trigger as a palette slot so the second half checks
    // the palette-only sections while keeping the provider and count cache
    // instance-local to this test.
    act(() => {
      renderChain(container, paletteAddress, requestMatchCount);
      setAnchorRect(container.querySelector<HTMLElement>('.tokenpanel-chain-button'));
      container.querySelector<HTMLElement>('.tokenpanel-chain-button')!
        .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    popover = document.querySelector<HTMLElement>('.tokenpanel-chain-popover');
    expect(popover?.textContent).toContain('depended on by');
    expect(popover?.textContent).toContain('--zd-surface');
    expect(popover?.textContent).toContain('ramp siblings');
    expect(popover?.textContent).toContain('--palette-base-0');
    expect(popover?.textContent).toContain('blast radius');
    expect(popover?.textContent).toContain('4 elements change');
  });

  it('jumps to a dependent row by its stable address', () => {
    const requestMatchCount = vi.fn(() => 1);
    const address = { tabId: 'palette', tierId: 'base', itemId: 'base-2' };
    const dependentAddress = { tabId: 'color', tierId: 'semantic', itemId: 'surface' };
    const row = document.createElement('div');
    row.dataset.address = tokenAddressKey(dependentAddress);
    row.scrollIntoView = vi.fn();
    renderChain(container, address, requestMatchCount);
    container.appendChild(row);

    setAnchorRect(container.querySelector<HTMLElement>('.tokenpanel-chain-button'));
    act(() => {
      container.querySelector<HTMLElement>('.tokenpanel-chain-button')!
        .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    const chip = document.querySelector<HTMLElement>('.tokenpanel-chain-chip');
    expect(chip?.textContent).toContain('--zd-surface');
    act(() => {
      chip!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(row.scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' });
  });
});
