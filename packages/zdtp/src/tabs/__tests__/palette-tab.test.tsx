// @vitest-environment jsdom

/**
 * Unit tests for PaletteTab shell (#390).
 *
 * Acceptance criteria:
 *
 *  1. PaletteTab renders the mode toggle (Edit | Check) as div[role="button"].
 *  2. Clicking Edit shows PaletteEditView; clicking Check shows PaletteCheckView.
 *  3. Pressing Enter/Space on the toggle buttons also flips the mode.
 *  4. assertValidPanelConfig accepts the multi-group palette TabConfig (multiple
 *     color tiers; item ids unique across the tab, no colorExtras).
 *  5. DOM hygiene: no native button, h3, h4, details, or summary elements.
 *  6. flattenPaletteTiers / groupPaletteTiers helpers work correctly.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import PaletteTab from '../palette/palette-tab';
import { flattenPaletteTiers, groupPaletteTiers } from '../palette/palette-tab';
import { assertValidPanelConfig } from '../../config/panel-config';
import type { TabConfig } from '../../tokens/tier-model';
import type { TabOverrides } from '../../apply/tier-resolver';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/**
 * Example palette TabConfig: two groups (warm, cool), two steps each.
 * Omits colorExtras so multiple kind:'color' tiers are safe in one tab.
 */
export const PALETTE_TAB_FIXTURE: TabConfig = {
  id: 'palette',
  label: 'Palette',
  // colorExtras intentionally omitted — resolveColorClusterFromTab only runs
  // when colorExtras is present; omitting it keeps multiple kind:'color' tiers safe.
  tiers: [
    {
      id: 'warm',
      label: 'Warm',
      items: [
        {
          id: 'warm-1',
          cssVar: '--palette-warm-1',
          label: 'Warm 1',
          default: 'oklch(80% 0.12 50)',
          type: { kind: 'color', format: 'oklch' },
        },
        {
          id: 'warm-2',
          cssVar: '--palette-warm-2',
          label: 'Warm 2',
          default: 'oklch(60% 0.18 45)',
          type: { kind: 'color', format: 'oklch' },
        },
      ],
    },
    {
      id: 'cool',
      label: 'Cool',
      items: [
        {
          id: 'cool-1',
          cssVar: '--palette-cool-1',
          label: 'Cool 1',
          default: 'oklch(75% 0.14 240)',
          type: { kind: 'color', format: 'oklch' },
        },
        {
          id: 'cool-2',
          cssVar: '--palette-cool-2',
          label: 'Cool 2',
          default: 'oklch(55% 0.20 260)',
          type: { kind: 'color', format: 'oklch' },
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
  act(() => {
    render(null, container);
  });
  document.body.removeChild(container);
});

async function renderPaletteTab(
  tab: TabConfig = PALETTE_TAB_FIXTURE,
  overrides: TabOverrides = {},
  onChange: (tierId: string, itemId: string, next: string) => void = () => undefined,
): Promise<void> {
  await act(() => {
    render(<PaletteTab tab={tab} overrides={overrides} onChange={onChange} />, container);
  });
}

// ---------------------------------------------------------------------------
// Tests — mode toggle DOM structure
// ---------------------------------------------------------------------------

describe('PaletteTab — mode toggle', () => {
  it('renders Edit and Check toggle buttons as div[role="button"]', async () => {
    await renderPaletteTab();

    const editBtn = container.querySelector('[data-testid="palette-mode-edit"]');
    const checkBtn = container.querySelector('[data-testid="palette-mode-check"]');

    expect(editBtn).not.toBeNull();
    expect(checkBtn).not.toBeNull();

    expect(editBtn?.getAttribute('role')).toBe('button');
    expect(checkBtn?.getAttribute('role')).toBe('button');
  });

  it('toggle buttons have tabIndex=0', async () => {
    await renderPaletteTab();

    const editBtn = container.querySelector('[data-testid="palette-mode-edit"]');
    const checkBtn = container.querySelector('[data-testid="palette-mode-check"]');

    expect(editBtn?.getAttribute('tabindex')).toBe('0');
    expect(checkBtn?.getAttribute('tabindex')).toBe('0');
  });

  it('toggle buttons are div elements, not native buttons', async () => {
    await renderPaletteTab();

    const editBtn = container.querySelector('[data-testid="palette-mode-edit"]');
    const checkBtn = container.querySelector('[data-testid="palette-mode-check"]');

    expect(editBtn?.tagName.toLowerCase()).toBe('div');
    expect(checkBtn?.tagName.toLowerCase()).toBe('div');
  });

  it('Edit button text is "Edit" and Check button text is "Check"', async () => {
    await renderPaletteTab();

    const editBtn = container.querySelector('[data-testid="palette-mode-edit"]');
    const checkBtn = container.querySelector('[data-testid="palette-mode-check"]');

    expect(editBtn?.textContent?.trim()).toBe('Edit');
    expect(checkBtn?.textContent?.trim()).toBe('Check');
  });
});

// ---------------------------------------------------------------------------
// Tests — initial mode is 'edit'
// ---------------------------------------------------------------------------

describe('PaletteTab — initial mode', () => {
  it('shows PaletteEditView by default', async () => {
    await renderPaletteTab();

    const editView = container.querySelector('[data-testid="palette-edit-view"]');
    expect(editView).not.toBeNull();
  });

  it('does NOT show PaletteCheckView initially', async () => {
    await renderPaletteTab();

    const checkView = container.querySelector('[data-testid="palette-check-view"]');
    expect(checkView).toBeNull();
  });

  it('Edit button has aria-pressed=true initially', async () => {
    await renderPaletteTab();

    const editBtn = container.querySelector('[data-testid="palette-mode-edit"]');
    expect(editBtn?.getAttribute('aria-pressed')).toBe('true');
  });

  it('Check button has aria-pressed=false initially', async () => {
    await renderPaletteTab();

    const checkBtn = container.querySelector('[data-testid="palette-mode-check"]');
    expect(checkBtn?.getAttribute('aria-pressed')).toBe('false');
  });
});

// ---------------------------------------------------------------------------
// Tests — click switching
// ---------------------------------------------------------------------------

describe('PaletteTab — click mode switching', () => {
  it('clicking Check button switches to check mode', async () => {
    await renderPaletteTab();

    const checkBtn = container.querySelector<HTMLElement>('[data-testid="palette-mode-check"]');
    expect(checkBtn).not.toBeNull();

    await act(() => {
      checkBtn!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const checkView = container.querySelector('[data-testid="palette-check-view"]');
    expect(checkView).not.toBeNull();

    const editView = container.querySelector('[data-testid="palette-edit-view"]');
    expect(editView).toBeNull();
  });

  it('clicking Edit button after switching to check restores edit mode', async () => {
    await renderPaletteTab();

    const checkBtn = container.querySelector<HTMLElement>('[data-testid="palette-mode-check"]');
    await act(() => {
      checkBtn!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const editBtn = container.querySelector<HTMLElement>('[data-testid="palette-mode-edit"]');
    await act(() => {
      editBtn!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const editView = container.querySelector('[data-testid="palette-edit-view"]');
    expect(editView).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Tests — keyboard mode switching (Enter / Space)
// ---------------------------------------------------------------------------

describe('PaletteTab — keyboard mode switching', () => {
  it('pressing Enter on Check button switches to check mode', async () => {
    await renderPaletteTab();

    const checkBtn = container.querySelector<HTMLElement>('[data-testid="palette-mode-check"]');
    await act(() => {
      checkBtn!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });

    const checkView = container.querySelector('[data-testid="palette-check-view"]');
    expect(checkView).not.toBeNull();
  });

  it('pressing Space on Check button switches to check mode', async () => {
    await renderPaletteTab();

    const checkBtn = container.querySelector<HTMLElement>('[data-testid="palette-mode-check"]');
    await act(() => {
      checkBtn!.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    });

    const checkView = container.querySelector('[data-testid="palette-check-view"]');
    expect(checkView).not.toBeNull();
  });

  it('pressing Enter on Edit button while in check mode switches back to edit', async () => {
    await renderPaletteTab();

    const checkBtn = container.querySelector<HTMLElement>('[data-testid="palette-mode-check"]');
    await act(() => {
      checkBtn!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const editBtn = container.querySelector<HTMLElement>('[data-testid="palette-mode-edit"]');
    await act(() => {
      editBtn!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });

    const editView = container.querySelector('[data-testid="palette-edit-view"]');
    expect(editView).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Tests — DOM hygiene
// ---------------------------------------------------------------------------

describe('PaletteTab — DOM hygiene', () => {
  it('no native button elements in the palette tab', async () => {
    await renderPaletteTab();

    expect(container.querySelector('button')).toBeNull();
  });

  it('no h3 elements in the palette tab', async () => {
    await renderPaletteTab();

    expect(container.querySelector('h3')).toBeNull();
  });

  it('no h4 elements in the palette tab', async () => {
    await renderPaletteTab();

    expect(container.querySelector('h4')).toBeNull();
  });

  it('no details or summary elements in the palette tab', async () => {
    await renderPaletteTab();

    expect(container.querySelector('details')).toBeNull();
    expect(container.querySelector('summary')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Tests — assertValidPanelConfig accepts multi-group palette TabConfig
// ---------------------------------------------------------------------------

describe('PaletteTab — assertValidPanelConfig accepts palette TabConfig', () => {
  it('does not throw for the multi-group palette fixture', () => {
    expect(() =>
      assertValidPanelConfig({
        storagePrefix: 'test-palette',
        consoleNamespace: 'test',
        modalClassPrefix: 'test-palette-modal',
        schemaId: 'test/v1',
        exportFilenameBase: 'test-tokens',
        tabs: [PALETTE_TAB_FIXTURE],
      }),
    ).not.toThrow();
  });

  it('palette fixture has no colorExtras', () => {
    expect(PALETTE_TAB_FIXTURE.colorExtras).toBeUndefined();
  });

  it('all item ids in the palette fixture are unique across tiers', () => {
    const allIds = PALETTE_TAB_FIXTURE.tiers.flatMap((t) => t.items.map((i) => i.id));
    const uniqueIds = new Set(allIds);
    expect(uniqueIds.size).toBe(allIds.length);
  });

  it('palette fixture has multiple color tiers', () => {
    expect(PALETTE_TAB_FIXTURE.tiers.length).toBeGreaterThan(1);
    for (const tier of PALETTE_TAB_FIXTURE.tiers) {
      for (const item of tier.items) {
        expect(item.type.kind).toBe('color');
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Tests — flattenPaletteTiers / groupPaletteTiers helpers
// ---------------------------------------------------------------------------

describe('PaletteTab — shared helpers', () => {
  it('groupPaletteTiers returns tiers in declaration order', () => {
    const tiers = groupPaletteTiers(PALETTE_TAB_FIXTURE);
    expect(tiers.length).toBe(2);
    expect(tiers[0].id).toBe('warm');
    expect(tiers[1].id).toBe('cool');
  });

  it('flattenPaletteTiers returns all items across all tiers', () => {
    const items = flattenPaletteTiers(PALETTE_TAB_FIXTURE);
    expect(items.length).toBe(4);
    expect(items.map((i) => i.id)).toEqual(['warm-1', 'warm-2', 'cool-1', 'cool-2']);
  });

  it('flattenPaletteTiers items have correct cssVars', () => {
    const items = flattenPaletteTiers(PALETTE_TAB_FIXTURE);
    for (const item of items) {
      expect(item.cssVar).toMatch(/^--palette-/);
    }
  });
});
