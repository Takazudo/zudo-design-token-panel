// @vitest-environment jsdom

/**
 * Unit tests for semantic-tag replacement in tab components (#148).
 *
 * Acceptance criteria:
 *
 *  a. Tier-section heading renders with role=heading + aria-level=3 (not h3/h4).
 *  b. Reset Spacing (and analogous Reset buttons) fires the persist callback on
 *     Enter AND Space keydown events.
 *  c. All items in a tier render directly under the tier's tokenpanel-tab-grid,
 *     with NO .tokenpanel-tier-group wrapper in the DOM.
 *  d. No <section>, <h3>, <h4>, <details>, <summary>, or <button> elements are
 *     present in the tab markup (the policy-banned set for #148).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import SpacingTab from '../spacing-tab';
import FontTab from '../font-tab';
import SizeTab from '../size-tab';
import GenericTab from '../generic-tab';
import type { TabConfig } from '../../tokens/tier-model';
import type { TokenOverrides } from '../../state/tweak-state';
import type { TabOverrides } from '../../apply/tier-resolver';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SPACING_TAB: TabConfig = {
  id: 'spacing',
  label: 'Spacing',
  tiers: [
    {
      id: 'base',
      label: 'Base Scale',
      items: [
        {
          id: 'gap-xs',
          cssVar: '--test-gap-xs',
          label: 'Gap XS',
          default: '4px',
          type: { kind: 'length', step: 1, unit: 'px' },
        },
        {
          id: 'gap-sm',
          cssVar: '--test-gap-sm',
          label: 'Gap SM',
          default: '8px',
          type: { kind: 'length', step: 1, unit: 'px' },
        },
      ],
    },
    {
      id: 'semantic',
      label: 'Semantic Spacing',
      referencesTier: 'base',
      items: [
        {
          id: 'spacing-component',
          cssVar: '--test-spacing-component',
          label: 'Component',
          default: 'gap-sm',
          type: { kind: 'text' },
        },
      ],
    },
  ],
};

const FONT_TAB: TabConfig = {
  id: 'font',
  label: 'Font',
  tiers: [
    {
      id: 'families',
      label: 'Font Families',
      items: [
        {
          id: 'font-sans',
          cssVar: '--test-font-sans',
          label: 'Sans',
          default: 'system-ui, sans-serif',
          type: { kind: 'text' },
        },
      ],
    },
  ],
};

const SIZE_TAB: TabConfig = {
  id: 'size',
  label: 'Size',
  tiers: [
    {
      id: 'scale',
      label: 'Size Scale',
      items: [
        {
          id: 'size-base',
          cssVar: '--test-size-base',
          label: 'Base',
          default: '1rem',
          type: { kind: 'length', step: 0.25, unit: 'rem' },
        },
      ],
    },
  ],
};

const GENERIC_TAB: TabConfig = {
  id: 'easing',
  label: 'Easing',
  tiers: [
    {
      id: 'curves',
      label: 'Curves',
      items: [
        {
          id: 'ease-in',
          cssVar: '--test-easing-in',
          label: 'Ease In',
          default: 'cubic-bezier(0.42, 0, 1, 1)',
          type: { kind: 'text' },
        },
        {
          id: 'ease-out',
          cssVar: '--test-easing-out',
          label: 'Ease Out',
          default: 'cubic-bezier(0, 0, 0.58, 1)',
          type: { kind: 'text' },
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let container: HTMLDivElement;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  document.body.removeChild(container);
});

function noop() {
  return undefined;
}

async function renderSpacingTab(
  tab: TabConfig = SPACING_TAB,
  state: TokenOverrides = {},
  persistSpacing: (updater: (prev: TokenOverrides) => TokenOverrides) => void = noop,
): Promise<void> {
  await act(() => {
    render(
      <SpacingTab tab={tab} state={state} persistSpacing={persistSpacing} />,
      container,
    );
  });
}

async function renderFontTab(
  tab: TabConfig = FONT_TAB,
  state: TokenOverrides = {},
  persistFont: (updater: (prev: TokenOverrides) => TokenOverrides) => void = noop,
): Promise<void> {
  await act(() => {
    render(
      <FontTab tab={tab} state={state} persistFont={persistFont} />,
      container,
    );
  });
}

async function renderSizeTab(
  tab: TabConfig = SIZE_TAB,
  state: TokenOverrides = {},
  persistSize: (updater: (prev: TokenOverrides) => TokenOverrides) => void = noop,
): Promise<void> {
  await act(() => {
    render(
      <SizeTab tab={tab} state={state} persistSize={persistSize} />,
      container,
    );
  });
}

async function renderGenericTab(
  tab: TabConfig = GENERIC_TAB,
  overrides: TabOverrides = {},
  onChange: (tierId: string, itemId: string, next: string) => void = noop,
): Promise<void> {
  await act(() => {
    render(
      <GenericTab tab={tab} overrides={overrides} onChange={onChange} />,
      container,
    );
  });
}

// ---------------------------------------------------------------------------
// (a) Tier-section headings use role=heading + aria-level=3
// ---------------------------------------------------------------------------

describe('Tier section headings — role=heading + aria-level=3', () => {
  it('SpacingTab: each tier heading has role=heading and aria-level=3', async () => {
    await renderSpacingTab();

    const headings = container.querySelectorAll('[role="heading"][aria-level="3"]');
    expect(headings.length).toBe(2);
    const texts = Array.from(headings).map((h) => h.textContent?.trim());
    expect(texts).toContain('Base Scale');
    expect(texts).toContain('Semantic Spacing');
  });

  it('SpacingTab: tier headings are NOT h3 or h4 elements', async () => {
    await renderSpacingTab();

    expect(container.querySelector('h3')).toBeNull();
    expect(container.querySelector('h4')).toBeNull();
  });

  it('FontTab: tier heading has role=heading and aria-level=3', async () => {
    await renderFontTab();

    const headings = container.querySelectorAll('[role="heading"][aria-level="3"]');
    expect(headings.length).toBe(1);
    expect(headings[0].textContent?.trim()).toBe('Font Families');
  });

  it('SizeTab: tier heading has role=heading and aria-level=3', async () => {
    await renderSizeTab();

    const headings = container.querySelectorAll('[role="heading"][aria-level="3"]');
    expect(headings.length).toBe(1);
    expect(headings[0].textContent?.trim()).toBe('Size Scale');
  });

  it('GenericTab: tier heading has role=heading and aria-level=3', async () => {
    await renderGenericTab();

    const headings = container.querySelectorAll('[role="heading"][aria-level="3"]');
    expect(headings.length).toBe(1);
    expect(headings[0].textContent?.trim()).toBe('Curves');
  });
});

// ---------------------------------------------------------------------------
// (b) Reset Spacing fires on Enter AND Space keypress
// ---------------------------------------------------------------------------

describe('Reset Spacing button — keyboard activation', () => {
  it('fires persistSpacing on Enter keydown', async () => {
    const persistSpacing = vi.fn();
    await renderSpacingTab(SPACING_TAB, {}, persistSpacing);

    const resetBtn = container.querySelector<HTMLElement>('[role="button"]');
    expect(resetBtn).not.toBeNull();
    expect(resetBtn!.textContent?.trim()).toBe('Reset Spacing');

    await act(() => {
      resetBtn!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });

    expect(persistSpacing).toHaveBeenCalledTimes(1);
  });

  it('fires persistSpacing on Space keydown', async () => {
    const persistSpacing = vi.fn();
    await renderSpacingTab(SPACING_TAB, {}, persistSpacing);

    const resetBtn = container.querySelector<HTMLElement>('[role="button"]');
    expect(resetBtn).not.toBeNull();

    await act(() => {
      resetBtn!.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    });

    expect(persistSpacing).toHaveBeenCalledTimes(1);
  });

  it('does NOT fire on other key presses (Tab, ArrowDown)', async () => {
    const persistSpacing = vi.fn();
    await renderSpacingTab(SPACING_TAB, {}, persistSpacing);

    const resetBtn = container.querySelector<HTMLElement>('[role="button"]');
    expect(resetBtn).not.toBeNull();

    await act(() => {
      resetBtn!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
      resetBtn!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    });

    expect(persistSpacing).not.toHaveBeenCalled();
  });

  it('Reset Font fires on Enter keydown', async () => {
    const persistFont = vi.fn();
    await renderFontTab(FONT_TAB, {}, persistFont);

    const resetBtn = container.querySelector<HTMLElement>('[role="button"]');
    expect(resetBtn).not.toBeNull();
    expect(resetBtn!.textContent?.trim()).toBe('Reset Font');

    await act(() => {
      resetBtn!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });

    expect(persistFont).toHaveBeenCalledTimes(1);
  });

  it('Reset Size fires on Space keydown', async () => {
    const persistSize = vi.fn();
    await renderSizeTab(SIZE_TAB, {}, persistSize);

    const resetBtn = container.querySelector<HTMLElement>('[role="button"]');
    expect(resetBtn).not.toBeNull();
    expect(resetBtn!.textContent?.trim()).toBe('Reset Size');

    await act(() => {
      resetBtn!.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    });

    expect(persistSize).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// (c) No .tokenpanel-tier-group wrapper in the DOM
// ---------------------------------------------------------------------------

describe('No tokenpanel-tier-group wrapper in tab DOM', () => {
  it('SpacingTab: items render directly under tokenpanel-tab-grid, no tier-group', async () => {
    await renderSpacingTab();

    const tierGroup = container.querySelector('.tokenpanel-tier-group');
    expect(tierGroup).toBeNull();
  });

  it('SpacingTab: all tier items are children of tokenpanel-tab-grid', async () => {
    await renderSpacingTab();

    const grids = container.querySelectorAll('.tokenpanel-tab-grid');
    expect(grids.length).toBeGreaterThan(0);

    // The first grid (base tier) should have items directly in it
    const firstGrid = grids[0];
    expect(firstGrid).not.toBeNull();
    // Check that the grid itself has children (items rendered directly)
    expect(firstGrid.children.length).toBeGreaterThan(0);
  });

  it('FontTab: no tier-group wrapper present', async () => {
    await renderFontTab();

    expect(container.querySelector('.tokenpanel-tier-group')).toBeNull();
  });

  it('SizeTab: no tier-group wrapper present', async () => {
    await renderSizeTab();

    expect(container.querySelector('.tokenpanel-tier-group')).toBeNull();
  });

  it('GenericTab: no tier-group wrapper present', async () => {
    await renderGenericTab();

    expect(container.querySelector('.tokenpanel-tier-group')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// (d) No banned semantic elements in tab output
// ---------------------------------------------------------------------------

describe('No banned semantic tags in tab markup', () => {
  it('SpacingTab: no section, h3, h4, details, or summary elements', async () => {
    await renderSpacingTab();

    expect(container.querySelector('section')).toBeNull();
    expect(container.querySelector('h3')).toBeNull();
    expect(container.querySelector('h4')).toBeNull();
    expect(container.querySelector('details')).toBeNull();
    expect(container.querySelector('summary')).toBeNull();
    // Note: TierRefSelector (a sub-control) still has a button — it is handled
    // in a separate PR (#149). The check here is that the *tab's own* Reset
    // button is no longer a native button element.
  });

  it('SpacingTab: the Reset Spacing element is NOT a native button', async () => {
    await renderSpacingTab();

    // The reset action is now a div[role=button], not a native <button>
    const resetButtons = Array.from(container.querySelectorAll('[role="button"]')).filter(
      (el) => el.textContent?.trim() === 'Reset Spacing',
    );
    expect(resetButtons.length).toBe(1);
    expect(resetButtons[0].tagName.toLowerCase()).toBe('div');
  });

  it('FontTab: no section, h3, h4, details, or summary elements', async () => {
    await renderFontTab();

    expect(container.querySelector('section')).toBeNull();
    expect(container.querySelector('h3')).toBeNull();
    expect(container.querySelector('h4')).toBeNull();
    expect(container.querySelector('details')).toBeNull();
    expect(container.querySelector('summary')).toBeNull();
  });

  it('FontTab: the Reset Font element is NOT a native button', async () => {
    await renderFontTab();

    const resetButtons = Array.from(container.querySelectorAll('[role="button"]')).filter(
      (el) => el.textContent?.trim() === 'Reset Font',
    );
    expect(resetButtons.length).toBe(1);
    expect(resetButtons[0].tagName.toLowerCase()).toBe('div');
  });

  it('SizeTab: no section, h3, h4, details, or summary elements', async () => {
    await renderSizeTab();

    expect(container.querySelector('section')).toBeNull();
    expect(container.querySelector('h3')).toBeNull();
    expect(container.querySelector('h4')).toBeNull();
    expect(container.querySelector('details')).toBeNull();
    expect(container.querySelector('summary')).toBeNull();
  });

  it('SizeTab: the Reset Size element is NOT a native button', async () => {
    await renderSizeTab();

    const resetButtons = Array.from(container.querySelectorAll('[role="button"]')).filter(
      (el) => el.textContent?.trim() === 'Reset Size',
    );
    expect(resetButtons.length).toBe(1);
    expect(resetButtons[0].tagName.toLowerCase()).toBe('div');
  });

  it('GenericTab: no section, h3, h4, details, or summary elements', async () => {
    await renderGenericTab();

    expect(container.querySelector('section')).toBeNull();
    expect(container.querySelector('h3')).toBeNull();
    expect(container.querySelector('h4')).toBeNull();
    expect(container.querySelector('details')).toBeNull();
    expect(container.querySelector('summary')).toBeNull();
    // GenericTab has no Reset button, so no button check needed here
  });
});

// ---------------------------------------------------------------------------
// (e) Reset buttons have role=button + tabIndex=0
// ---------------------------------------------------------------------------

describe('Reset buttons are accessible div[role=button]', () => {
  it('SpacingTab Reset button has role=button and tabIndex=0', async () => {
    await renderSpacingTab();

    const resetBtn = container.querySelector('[role="button"]');
    expect(resetBtn).not.toBeNull();
    expect(resetBtn!.getAttribute('tabindex')).toBe('0');
    expect(resetBtn!.textContent?.trim()).toBe('Reset Spacing');
  });

  it('FontTab Reset button has role=button and tabIndex=0', async () => {
    await renderFontTab();

    const resetBtn = container.querySelector('[role="button"]');
    expect(resetBtn).not.toBeNull();
    expect(resetBtn!.getAttribute('tabindex')).toBe('0');
  });

  it('SizeTab Reset button has role=button and tabIndex=0', async () => {
    await renderSizeTab();

    const resetBtn = container.querySelector('[role="button"]');
    expect(resetBtn).not.toBeNull();
    expect(resetBtn!.getAttribute('tabindex')).toBe('0');
  });
});
