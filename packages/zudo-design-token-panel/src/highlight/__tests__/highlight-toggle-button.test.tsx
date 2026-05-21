// @vitest-environment jsdom

/**
 * Unit tests for HighlightToggleButton and HighlightContext.
 *
 * Tests cover:
 * - Renders nothing when HighlightContext is null (no provider).
 * - Renders the eye icon when context is provided.
 * - No <button> elements (hostile-host policy: use div role="button" instead).
 * - Clicking calls context.toggle(cssVar).
 * - Enter and Space keyboard events trigger toggle.
 * - tabIndex={0} for keyboard accessibility.
 * - Active state: icon colored with slot color via inline style.
 * - Inactive state: no inline color style.
 * - Title attribute content for active vs inactive.
 * - matchCounts included in title when provided.
 * - GenericTab rows expose the eye button.
 * - _generic-item-editor (used by spacing/font/size tabs) rows expose the button.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import {
  HighlightToggleButton,
  HighlightContext,
  type HighlightContextValue,
} from '../highlight-toggle-button';
import type { HighlightState } from '../highlight-state';
import { DEFAULT_HIGHLIGHT_SLOTS } from '../highlight-state';
import GenericTab from '../../tabs/generic-tab';
import type { TabConfig } from '../../tokens/tier-model';

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

let container: HTMLDivElement;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  act(() => render(null, container));
  document.body.removeChild(container);
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeState(overrides: Partial<HighlightState> = {}): HighlightState {
  return {
    slots: DEFAULT_HIGHLIGHT_SLOTS.map((s) => ({ ...s })),
    active: {},
    ...overrides,
  };
}

function makeCtx(
  state: HighlightState,
  toggle: (cssVar: string) => void,
  extra: Partial<HighlightContextValue> = {},
): HighlightContextValue {
  return { state, toggle, ...extra };
}

function renderWithCtx(
  cssVar: string,
  ctx: HighlightContextValue,
): void {
  act(() => {
    render(
      <HighlightContext.Provider value={ctx}>
        <HighlightToggleButton cssVar={cssVar} />
      </HighlightContext.Provider>,
      container,
    );
  });
}

// ---------------------------------------------------------------------------
// Null context — renders nothing
// ---------------------------------------------------------------------------

describe('HighlightToggleButton — null context', () => {
  it('renders nothing when HighlightContext is null (no provider)', () => {
    act(() => {
      render(<HighlightToggleButton cssVar="--my-token" />, container);
    });
    expect(container.innerHTML).toBe('');
  });
});

// ---------------------------------------------------------------------------
// With context — basic rendering
// ---------------------------------------------------------------------------

describe('HighlightToggleButton — with context', () => {
  it('renders a div with role="button" when context is provided', () => {
    const state = makeState();
    const toggle = vi.fn();
    renderWithCtx('--my-token', makeCtx(state, toggle));

    const btn = container.querySelector('[role="button"]');
    expect(btn).not.toBeNull();
  });

  it('does NOT render a <button> element (hostile-host policy)', () => {
    const state = makeState();
    const toggle = vi.fn();
    renderWithCtx('--my-token', makeCtx(state, toggle));

    expect(container.querySelector('button')).toBeNull();
  });

  it('the div has tabIndex 0 for keyboard accessibility', () => {
    const state = makeState();
    const toggle = vi.fn();
    renderWithCtx('--my-token', makeCtx(state, toggle));

    const btn = container.querySelector('[role="button"]') as HTMLElement;
    expect(btn.tabIndex).toBe(0);
  });

  it('renders an SVG inside the button', () => {
    const state = makeState();
    const toggle = vi.fn();
    renderWithCtx('--my-token', makeCtx(state, toggle));

    expect(container.querySelector('svg')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Inactive state
// ---------------------------------------------------------------------------

describe('HighlightToggleButton — inactive', () => {
  it('has class tokenpanel-highlight-toggle (no is-active) when inactive', () => {
    const state = makeState({ active: {} });
    const toggle = vi.fn();
    renderWithCtx('--my-token', makeCtx(state, toggle));

    const btn = container.querySelector('.tokenpanel-highlight-toggle') as HTMLElement;
    expect(btn).not.toBeNull();
    expect(btn.classList.contains('is-active')).toBe(false);
  });

  it('has no inline color style when inactive', () => {
    const state = makeState({ active: {} });
    const toggle = vi.fn();
    renderWithCtx('--my-token', makeCtx(state, toggle));

    const btn = container.querySelector('.tokenpanel-highlight-toggle') as HTMLElement;
    expect(btn.style.color).toBe('');
  });

  it('title says "Highlight elements using …" when inactive', () => {
    const state = makeState({ active: {} });
    const toggle = vi.fn();
    renderWithCtx('--my-token', makeCtx(state, toggle));

    const btn = container.querySelector('.tokenpanel-highlight-toggle') as HTMLElement;
    expect(btn.title).toBe('Highlight elements using --my-token');
  });
});

// ---------------------------------------------------------------------------
// Active state
// ---------------------------------------------------------------------------

describe('HighlightToggleButton — active', () => {
  it('has is-active class when the cssVar is in state.active', () => {
    const state = makeState({ active: { '--my-token': 0 } });
    const toggle = vi.fn();
    renderWithCtx('--my-token', makeCtx(state, toggle));

    const btn = container.querySelector('.tokenpanel-highlight-toggle') as HTMLElement;
    expect(btn.classList.contains('is-active')).toBe(true);
  });

  it('applies inline color equal to the slot color when active', () => {
    // slot index 0 color is '#ff2d2d'; jsdom normalizes hex to rgb
    const state = makeState({ active: { '--my-token': 0 } });
    const toggle = vi.fn();
    renderWithCtx('--my-token', makeCtx(state, toggle));

    const btn = container.querySelector('.tokenpanel-highlight-toggle') as HTMLElement;
    // inline style has color set (non-empty)
    expect(btn.style.color).not.toBe('');
    // jsdom normalizes hex to rgb — verify the value matches the slot color
    expect(btn.style.color).toBe('rgb(255, 45, 45)');
  });

  it('title says "Stop highlighting …" when active (no count)', () => {
    const state = makeState({ active: { '--my-token': 0 } });
    const toggle = vi.fn();
    renderWithCtx('--my-token', makeCtx(state, toggle));

    const btn = container.querySelector('.tokenpanel-highlight-toggle') as HTMLElement;
    expect(btn.title).toBe('Stop highlighting --my-token');
  });

  it('title includes count when matchCounts provided for active token', () => {
    const state = makeState({ active: { '--my-token': 0 } });
    const toggle = vi.fn();
    renderWithCtx(
      '--my-token',
      makeCtx(state, toggle, { matchCounts: { '--my-token': 7 } }),
    );

    const btn = container.querySelector('.tokenpanel-highlight-toggle') as HTMLElement;
    expect(btn.title).toBe('Stop highlighting --my-token (7 elements)');
  });
});

// ---------------------------------------------------------------------------
// Click / keyboard interaction
// ---------------------------------------------------------------------------

describe('HighlightToggleButton — interactions', () => {
  it('click calls context.toggle with cssVar', () => {
    const state = makeState();
    const toggle = vi.fn();
    renderWithCtx('--my-token', makeCtx(state, toggle));

    const btn = container.querySelector('[role="button"]') as HTMLElement;
    act(() => btn.click());

    expect(toggle).toHaveBeenCalledTimes(1);
    expect(toggle).toHaveBeenCalledWith('--my-token');
  });

  it('Enter keydown calls toggle', () => {
    const state = makeState();
    const toggle = vi.fn();
    renderWithCtx('--my-token', makeCtx(state, toggle));

    const btn = container.querySelector('[role="button"]') as HTMLElement;
    act(() => {
      btn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });

    expect(toggle).toHaveBeenCalledTimes(1);
    expect(toggle).toHaveBeenCalledWith('--my-token');
  });

  it('Space keydown calls toggle', () => {
    const state = makeState();
    const toggle = vi.fn();
    renderWithCtx('--my-token', makeCtx(state, toggle));

    const btn = container.querySelector('[role="button"]') as HTMLElement;
    act(() => {
      btn.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    });

    expect(toggle).toHaveBeenCalledTimes(1);
  });

  it('other keydown (e.g. Tab) does NOT call toggle', () => {
    const state = makeState();
    const toggle = vi.fn();
    renderWithCtx('--my-token', makeCtx(state, toggle));

    const btn = container.querySelector('[role="button"]') as HTMLElement;
    act(() => {
      btn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    });

    expect(toggle).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// GenericTab — eye button present on every row variant
// ---------------------------------------------------------------------------

const GENERIC_TAB_CONFIG: TabConfig = {
  id: 'my-tab',
  label: 'My Tab',
  tiers: [
    {
      id: 'lengths',
      label: 'Lengths',
      items: [
        {
          id: 'gap-md',
          cssVar: '--gap-md',
          label: 'gap-md',
          default: '16px',
          type: { kind: 'length', min: 0, max: 64, step: 1, unit: 'px' },
        },
      ],
    },
    {
      id: 'selects',
      label: 'Selects',
      items: [
        {
          id: 'display',
          cssVar: '--display',
          label: 'display',
          default: 'block',
          type: { kind: 'select', options: ['block', 'flex'] },
        },
      ],
    },
    {
      id: 'texts',
      label: 'Texts',
      items: [
        {
          id: 'font-family',
          cssVar: '--font-family',
          label: 'font-family',
          default: 'sans-serif',
          type: { kind: 'text' },
        },
      ],
    },
    {
      id: 'colors',
      label: 'Colors',
      items: [
        {
          id: 'brand-color',
          cssVar: '--brand-color',
          label: 'brand-color',
          default: '#ff0000',
          type: { kind: 'color' },
        },
      ],
    },
  ],
};

function noop() {}

describe('GenericTab — eye button present on all row types', () => {
  function renderGenericTab(ctx: HighlightContextValue): void {
    act(() => {
      render(
        <HighlightContext.Provider value={ctx}>
          <GenericTab
            tab={GENERIC_TAB_CONFIG}
            overrides={{}}
            onChange={noop}
          />
        </HighlightContext.Provider>,
        container,
      );
    });
  }

  it('length row has a tokenpanel-highlight-toggle button', () => {
    const ctx = makeCtx(makeState(), vi.fn());
    renderGenericTab(ctx);

    const row = container.querySelector('[data-testid="tier-item-gap-md"]') as HTMLElement;
    expect(row).not.toBeNull();
    expect(row.querySelector('.tokenpanel-highlight-toggle')).not.toBeNull();
  });

  it('select row has a tokenpanel-highlight-toggle button', () => {
    const ctx = makeCtx(makeState(), vi.fn());
    renderGenericTab(ctx);

    const row = container.querySelector('[data-testid="tier-item-display"]') as HTMLElement;
    expect(row).not.toBeNull();
    expect(row.querySelector('.tokenpanel-highlight-toggle')).not.toBeNull();
  });

  it('text row has a tokenpanel-highlight-toggle button', () => {
    const ctx = makeCtx(makeState(), vi.fn());
    renderGenericTab(ctx);

    const row = container.querySelector('[data-testid="tier-item-font-family"]') as HTMLElement;
    expect(row).not.toBeNull();
    expect(row.querySelector('.tokenpanel-highlight-toggle')).not.toBeNull();
  });

  it('color row has a tokenpanel-highlight-toggle button', () => {
    const ctx = makeCtx(makeState(), vi.fn());
    renderGenericTab(ctx);

    const row = container.querySelector('[data-testid="tier-item-brand-color"]') as HTMLElement;
    expect(row).not.toBeNull();
    expect(row.querySelector('.tokenpanel-highlight-toggle')).not.toBeNull();
  });

  it('no <button> elements in GenericTab render (hostile-host policy)', () => {
    const ctx = makeCtx(makeState(), vi.fn());
    renderGenericTab(ctx);

    expect(container.querySelector('button')).toBeNull();
  });

  it('clicking eye button on length row calls toggle with cssVar', () => {
    const toggle = vi.fn();
    const ctx = makeCtx(makeState(), toggle);
    renderGenericTab(ctx);

    const row = container.querySelector('[data-testid="tier-item-gap-md"]') as HTMLElement;
    const btn = row.querySelector('.tokenpanel-highlight-toggle') as HTMLElement;
    act(() => btn.click());

    expect(toggle).toHaveBeenCalledWith('--gap-md');
  });
});

// ---------------------------------------------------------------------------
// _generic-item-editor (spacing/font/size tabs delegate to this)
// ---------------------------------------------------------------------------

import GenericItemEditor from '../../tabs/_generic-item-editor';
import type { TierItem } from '../../tokens/tier-model';

const SPACING_ITEM: TierItem = {
  id: 'hsp-md',
  cssVar: '--zd-spacing-hgap-md',
  label: 'hsp-md',
  default: '40px',
  type: { kind: 'length', min: 0, max: 64, step: 1, unit: 'px' },
};

const FONT_ITEM: TierItem = {
  id: 'text-base',
  cssVar: '--zd-font-base-size',
  label: 'text-base',
  default: '1.4rem',
  type: { kind: 'length', min: 0.5, max: 4, step: 0.05, unit: 'rem' },
};

const SIZE_ITEM: TierItem = {
  id: 'radius-lg',
  cssVar: '--radius-lg',
  label: 'radius-lg',
  default: '8px',
  type: { kind: 'length', min: 0, max: 32, step: 1, unit: 'px' },
};

describe('_generic-item-editor — eye button present (spacing/font/size via this editor)', () => {
  function renderEditor(item: TierItem, ctx: HighlightContextValue): void {
    act(() => {
      render(
        <HighlightContext.Provider value={ctx}>
          <GenericItemEditor item={item} value={item.default} onChange={noop} />
        </HighlightContext.Provider>,
        container,
      );
    });
  }

  it('spacing first row (length) has the eye button', () => {
    const ctx = makeCtx(makeState(), vi.fn());
    renderEditor(SPACING_ITEM, ctx);

    expect(container.querySelector('.tokenpanel-highlight-toggle')).not.toBeNull();
  });

  it('font first row (length) has the eye button', () => {
    const ctx = makeCtx(makeState(), vi.fn());
    renderEditor(FONT_ITEM, ctx);

    expect(container.querySelector('.tokenpanel-highlight-toggle')).not.toBeNull();
  });

  it('size first row (length) has the eye button', () => {
    const ctx = makeCtx(makeState(), vi.fn());
    renderEditor(SIZE_ITEM, ctx);

    expect(container.querySelector('.tokenpanel-highlight-toggle')).not.toBeNull();
  });

  it('clicking the button in editor calls toggle with cssVar', () => {
    const toggle = vi.fn();
    const ctx = makeCtx(makeState(), toggle);
    renderEditor(SPACING_ITEM, ctx);

    const btn = container.querySelector('.tokenpanel-highlight-toggle') as HTMLElement;
    act(() => btn.click());

    expect(toggle).toHaveBeenCalledWith('--zd-spacing-hgap-md');
  });

  it('active state in editor: button has is-active + inline color', () => {
    // slot 0 color is '#ff2d2d'; jsdom normalizes hex to rgb
    const state = makeState({ active: { '--zd-spacing-hgap-md': 0 } });
    const ctx = makeCtx(state, vi.fn());
    renderEditor(SPACING_ITEM, ctx);

    const btn = container.querySelector('.tokenpanel-highlight-toggle') as HTMLElement;
    expect(btn.classList.contains('is-active')).toBe(true);
    expect(btn.style.color).toBe('rgb(255, 45, 45)');
  });
});
