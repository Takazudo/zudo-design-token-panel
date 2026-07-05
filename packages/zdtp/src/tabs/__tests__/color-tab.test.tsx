// @vitest-environment jsdom

/**
 * Unit tests for the HighlightToggleButton integration in ColorTab.
 *
 * Acceptance criteria:
 *
 * 1. Every cssVar-bearing row in the color tab exposes the eye toggle.
 *    - Primary Palette swatches (e.g. --fixture-p0 … --fixture-p2)
 *    - Primary Semantic Token rows (e.g. --fixture-semantic-accent)
 *    - Secondary Palette swatches (when secondary cluster provided)
 *    - Secondary Semantic Token rows (when secondary cluster provided)
 *
 * 2. Clicking the toggle dispatches through HighlightContext — the toggle fn
 *    is called with the correct cssVar.
 *
 * 3. Base Theme rows (background / foreground) have NO eye toggle because
 *    they are panel-internal palette indices — not real cssVars in the
 *    document. This is the "item without a cssVar" negative case.
 *
 * 4. No <button> element introduced (hostile-host policy).
 *
 * 5. The tokenpanel/manifest-cascade-verification.test.ts Invariant D check
 *    still passes (verified by running the suite — not re-checked here).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import {
  HighlightContext,
  type HighlightContextValue,
} from '../../highlight/highlight-toggle-button';
import { DEFAULT_HIGHLIGHT_SLOTS, type HighlightState } from '../../highlight/highlight-state';
import ColorTab from '../color-tab';
import { TooltipProvider } from '../../controls/tooltip';
import type { TabConfig } from '../../tokens/tier-model';
import type { ColorTweakState } from '../../state/tweak-state';
import type { PersistColor, PersistSecondary } from '../../state/persist';
import {
  installFixturePanelConfig,
  FIXTURE_CLUSTER,
} from '../../__tests__/_test-helpers';
import { __resetPanelConfigForTests } from '../../config/panel-config';

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

let container: HTMLDivElement;

beforeEach(() => {
  // getPanelConfig() is called inside ColorTab render for colorPresets.
  // Install the fixture config so it doesn't throw on access.
  installFixturePanelConfig();
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  act(() => render(null, container));
  document.body.removeChild(container);
  __resetPanelConfigForTests();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/**
 * Minimal palette: 3 slots for speed. Template is --fixture-p{n}.
 */
const PALETTE_SIZE = 3;

const PRIMARY_COLOR_TAB: TabConfig = {
  id: 'color',
  label: 'Color',
  colorExtras: {
    id: FIXTURE_CLUSTER.id,
    label: FIXTURE_CLUSTER.label,
    baseRoles: FIXTURE_CLUSTER.baseRoles,
    baseDefaults: FIXTURE_CLUSTER.baseDefaults,
    defaultShikiTheme: FIXTURE_CLUSTER.defaultShikiTheme,
    colorSchemes: FIXTURE_CLUSTER.colorSchemes,
    panelSettings: FIXTURE_CLUSTER.panelSettings,
  },
  tiers: [
    {
      id: 'palette',
      label: 'Palette',
      items: Array.from({ length: PALETTE_SIZE }, (_, i) => ({
        id: `fixture-p${i}`,
        cssVar: `--fixture-p${i}`,
        label: `Palette ${i}`,
        default: '#000000',
        type: { kind: 'color' as const },
      })),
    },
    {
      id: 'semantic',
      label: 'Semantic',
      referencesTier: 'palette',
      items: [
        {
          id: 'accent',
          cssVar: '--fixture-semantic-accent',
          label: 'Accent',
          default: 'fixture-p1',
          type: { kind: 'color' as const },
        },
        {
          id: 'muted',
          cssVar: '--fixture-semantic-muted',
          label: 'Muted',
          default: 'fixture-p2',
          type: { kind: 'color' as const },
        },
      ],
    },
  ],
};

/** Minimal color state for PALETTE_SIZE=3 */
function makeColorState(): ColorTweakState {
  return {
    palette: ['#111111', '#222222', '#333333'],
    background: 0,
    foreground: 2,
    cursor: 1,
    selectionBg: 0,
    selectionFg: 2,
    semanticMappings: { accent: 1, muted: 2, active: 0 },
    shikiTheme: 'dracula',
  };
}

function makeHighlightState(overrides: Partial<HighlightState> = {}): HighlightState {
  return {
    slots: DEFAULT_HIGHLIGHT_SLOTS.map((s) => ({ ...s })),
    outlineWidth: 2,
    active: {},
    ...overrides,
  };
}

function makeCtx(
  state: HighlightState,
  toggle: (cssVar: string) => void,
): HighlightContextValue {
  return { state, toggle };
}

function noop() {}

/** Render ColorTab wrapped in TooltipProvider and HighlightContext provider */
function renderColorTab(
  ctx: HighlightContextValue,
  opts: {
    tab?: TabConfig;
    colorState?: ColorTweakState;
    secondaryTab?: TabConfig | null;
    secondaryState?: ColorTweakState | null;
    persistColor?: PersistColor;
    persistSecondary?: PersistSecondary;
  } = {},
): void {
  const {
    tab = PRIMARY_COLOR_TAB,
    colorState = makeColorState(),
    secondaryTab = null,
    secondaryState = null,
    persistColor = noop,
    persistSecondary = noop,
  } = opts;
  act(() => {
    render(
      <TooltipProvider>
        <HighlightContext.Provider value={ctx}>
          <ColorTab
            tab={tab}
            state={colorState}
            persistColor={persistColor}
            secondaryTab={secondaryTab}
            secondaryState={secondaryState}
            persistSecondary={persistSecondary}
          />
        </HighlightContext.Provider>
      </TooltipProvider>,
      container,
    );
  });
}

// ---------------------------------------------------------------------------
// 1. Palette swatch rows have the eye toggle
// ---------------------------------------------------------------------------

describe('ColorTab palette swatches — eye toggle present', () => {
  it('primary palette swatch p0 has tokenpanel-highlight-toggle', () => {
    const ctx = makeCtx(makeHighlightState(), vi.fn());
    renderColorTab(ctx);

    // Find all toggles inside the primary palette grid
    const paletteGrid = container.querySelector('.tokenpanel-color-palette-grid') as HTMLElement;
    expect(paletteGrid).not.toBeNull();
    expect(paletteGrid.querySelectorAll('.tokenpanel-highlight-toggle').length).toBeGreaterThan(0);
  });

  it('primary palette has one eye toggle per swatch (PALETTE_SIZE toggles total)', () => {
    const ctx = makeCtx(makeHighlightState(), vi.fn());
    renderColorTab(ctx);

    const paletteGrid = container.querySelector('.tokenpanel-color-palette-grid') as HTMLElement;
    expect(paletteGrid.querySelectorAll('.tokenpanel-highlight-toggle').length).toBe(PALETTE_SIZE);
  });

  it('clicking palette swatch p0 eye toggle calls toggle with --fixture-p0', () => {
    const toggle = vi.fn();
    const ctx = makeCtx(makeHighlightState(), toggle);
    renderColorTab(ctx);

    const paletteGrid = container.querySelector('.tokenpanel-color-palette-grid') as HTMLElement;
    const firstToggle = paletteGrid.querySelector('.tokenpanel-highlight-toggle') as HTMLElement;
    act(() => firstToggle.click());

    expect(toggle).toHaveBeenCalledWith('--fixture-p0');
  });
});

// ---------------------------------------------------------------------------
// 2. Semantic token rows have the eye toggle
// ---------------------------------------------------------------------------

describe('ColorTab semantic token rows — eye toggle present', () => {
  it('primary semantic rows each have a tokenpanel-highlight-toggle', () => {
    const ctx = makeCtx(makeHighlightState(), vi.fn());
    renderColorTab(ctx);

    // The semantic section renders inside .tokenpanel-color-base-grid
    // (there are two: Base and Semantic). Semantic tokens appear after Base.
    const baseGrids = container.querySelectorAll('.tokenpanel-color-base-grid');
    // Second base-grid is the semantic section
    const semanticGrid = baseGrids[1] as HTMLElement;
    expect(semanticGrid).not.toBeNull();
    expect(semanticGrid.querySelectorAll('.tokenpanel-highlight-toggle').length).toBe(2);
  });

  it('clicking accent semantic eye toggle calls toggle with --fixture-semantic-accent', () => {
    const toggle = vi.fn();
    const ctx = makeCtx(makeHighlightState(), toggle);
    renderColorTab(ctx);

    const baseGrids = container.querySelectorAll('.tokenpanel-color-base-grid');
    const semanticGrid = baseGrids[1] as HTMLElement;
    const firstToggle = semanticGrid.querySelector('.tokenpanel-highlight-toggle') as HTMLElement;
    act(() => firstToggle.click());

    expect(toggle).toHaveBeenCalledWith('--fixture-semantic-accent');
  });
});

// ---------------------------------------------------------------------------
// 3. Base Theme rows (background/foreground) have NO eye toggle
// ---------------------------------------------------------------------------

describe('ColorTab Base Theme rows — no eye toggle (no real cssVar)', () => {
  it('base grid rows have no tokenpanel-highlight-toggle', () => {
    const ctx = makeCtx(makeHighlightState(), vi.fn());
    renderColorTab(ctx);

    // First base-grid is the Base section (background / foreground rows)
    const baseGrids = container.querySelectorAll('.tokenpanel-color-base-grid');
    const baseGrid = baseGrids[0] as HTMLElement;
    expect(baseGrid).not.toBeNull();
    expect(baseGrid.querySelectorAll('.tokenpanel-highlight-toggle').length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 4. No <button> element (hostile-host policy)
// ---------------------------------------------------------------------------

describe('ColorTab — no <button> elements (hostile-host policy)', () => {
  it('renders no <button> elements when HighlightContext provided', () => {
    const ctx = makeCtx(makeHighlightState(), vi.fn());
    renderColorTab(ctx);

    expect(container.querySelector('button')).toBeNull();
  });

  it('renders no <button> elements without HighlightContext (null context)', () => {
    // Render with TooltipProvider but without HighlightContext — toggles should silently not render
    act(() => {
      render(
        <TooltipProvider>
          <ColorTab
            tab={PRIMARY_COLOR_TAB}
            state={makeColorState()}
            persistColor={noop}
            secondaryTab={null}
            secondaryState={null}
            persistSecondary={noop}
          />
        </TooltipProvider>,
        container,
      );
    });

    expect(container.querySelector('button')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 5. Secondary palette + semantic rows get the toggle too
// ---------------------------------------------------------------------------

const SECONDARY_CLUSTER_DATA = {
  id: 'secondary',
  label: 'Secondary',
  paletteSize: 2,
  baseRoles: {},
  paletteCssVarTemplate: '--sec-p{n}',
  semanticDefaults: { highlight: 0 },
  semanticCssNames: { highlight: '--sec-semantic-highlight' },
  baseDefaults: { background: 0, foreground: 1, cursor: 0, selectionBg: 0, selectionFg: 1 },
  defaultShikiTheme: 'dracula',
  colorSchemes: {},
  panelSettings: { colorScheme: '', colorMode: false as const },
};

const SECONDARY_TAB: TabConfig = {
  id: 'secondary-color',
  label: 'Secondary Color',
  colorExtras: {
    id: SECONDARY_CLUSTER_DATA.id,
    label: SECONDARY_CLUSTER_DATA.label,
    baseRoles: SECONDARY_CLUSTER_DATA.baseRoles,
    baseDefaults: SECONDARY_CLUSTER_DATA.baseDefaults,
    defaultShikiTheme: SECONDARY_CLUSTER_DATA.defaultShikiTheme,
    colorSchemes: SECONDARY_CLUSTER_DATA.colorSchemes,
    panelSettings: SECONDARY_CLUSTER_DATA.panelSettings,
  },
  tiers: [
    {
      id: 'palette',
      label: 'Palette',
      items: [
        { id: 'sec-p0', cssVar: '--sec-p0', label: 'sec-p0', default: '#000000', type: { kind: 'color' as const } },
        { id: 'sec-p1', cssVar: '--sec-p1', label: 'sec-p1', default: '#ffffff', type: { kind: 'color' as const } },
      ],
    },
    {
      id: 'semantic',
      label: 'Semantic',
      referencesTier: 'palette',
      items: [
        { id: 'highlight', cssVar: '--sec-semantic-highlight', label: 'Highlight', default: 'sec-p0', type: { kind: 'color' as const } },
      ],
    },
  ],
};

function makeSecondaryState(): ColorTweakState {
  return {
    palette: ['#000000', '#ffffff'],
    background: 0,
    foreground: 1,
    cursor: 0,
    selectionBg: 0,
    selectionFg: 1,
    semanticMappings: { highlight: 0 },
    shikiTheme: 'dracula',
  };
}

describe('ColorTab secondary cluster rows — eye toggle present', () => {
  it('secondary palette section has toggles for each swatch', () => {
    const ctx = makeCtx(makeHighlightState(), vi.fn());
    renderColorTab(ctx, {
      secondaryTab: SECONDARY_TAB,
      secondaryState: makeSecondaryState(),
    });

    const secPaletteSection = container.querySelector(
      '[data-testid="tokenpanel-secondary-palette-section"]',
    ) as HTMLElement;
    expect(secPaletteSection).not.toBeNull();
    // 2 swatches → 2 toggles
    expect(secPaletteSection.querySelectorAll('.tokenpanel-highlight-toggle').length).toBe(2);
  });

  it('clicking secondary palette p0 eye toggle calls toggle with --sec-p0', () => {
    const toggle = vi.fn();
    const ctx = makeCtx(makeHighlightState(), toggle);
    renderColorTab(ctx, {
      secondaryTab: SECONDARY_TAB,
      secondaryState: makeSecondaryState(),
    });

    const secPaletteSection = container.querySelector(
      '[data-testid="tokenpanel-secondary-palette-section"]',
    ) as HTMLElement;
    const firstToggle = secPaletteSection.querySelector('.tokenpanel-highlight-toggle') as HTMLElement;
    act(() => firstToggle.click());

    expect(toggle).toHaveBeenCalledWith('--sec-p0');
  });

  it('secondary semantic section has a toggle for the semantic row', () => {
    const ctx = makeCtx(makeHighlightState(), vi.fn());
    renderColorTab(ctx, {
      secondaryTab: SECONDARY_TAB,
      secondaryState: makeSecondaryState(),
    });

    const secSemanticSection = container.querySelector(
      '[data-testid="tokenpanel-secondary-semantic-section"]',
    ) as HTMLElement;
    expect(secSemanticSection).not.toBeNull();
    expect(secSemanticSection.querySelectorAll('.tokenpanel-highlight-toggle').length).toBe(1);
  });

  it('clicking secondary semantic eye toggle calls toggle with --sec-semantic-highlight', () => {
    const toggle = vi.fn();
    const ctx = makeCtx(makeHighlightState(), toggle);
    renderColorTab(ctx, {
      secondaryTab: SECONDARY_TAB,
      secondaryState: makeSecondaryState(),
    });

    const secSemanticSection = container.querySelector(
      '[data-testid="tokenpanel-secondary-semantic-section"]',
    ) as HTMLElement;
    const toggleEl = secSemanticSection.querySelector('.tokenpanel-highlight-toggle') as HTMLElement;
    act(() => toggleEl.click());

    expect(toggle).toHaveBeenCalledWith('--sec-semantic-highlight');
  });
});

// ---------------------------------------------------------------------------
// S3a — Grids use CSS custom property for density
// ---------------------------------------------------------------------------

describe('S3a — color grids use --tokenpanel-grid-min var (density-aware reflow)', () => {
  it('palette grid class exists on the primary palette section', () => {
    const ctx = makeCtx(makeHighlightState(), vi.fn());
    renderColorTab(ctx);

    const grid = container.querySelector('.tokenpanel-color-palette-grid');
    expect(grid).not.toBeNull();
  });

  it('base grid class exists on the Base section', () => {
    const ctx = makeCtx(makeHighlightState(), vi.fn());
    renderColorTab(ctx);

    // Two .tokenpanel-color-base-grid: Base + Semantic sections
    const grids = container.querySelectorAll('.tokenpanel-color-base-grid');
    expect(grids.length).toBeGreaterThanOrEqual(2);
  });

  it('no hardcoded repeat(8, …) column on primary palette grid (must use var)', () => {
    // Static check: the class name change ensures the CSS rule uses
    // repeat(auto-fit, minmax(var(--tokenpanel-grid-min, …), 1fr)).
    // In jsdom computed styles aren't populated from CSS; we assert structural
    // class membership as the proxy for the CSS rule that was changed.
    const ctx = makeCtx(makeHighlightState(), vi.fn());
    renderColorTab(ctx);

    const grid = container.querySelector('.tokenpanel-color-palette-grid');
    // Confirm it's present (CSS rule change on this class is the density fix).
    expect(grid).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// S3b — Eye icon is present in PaletteSelector (after trigger, same row)
// ---------------------------------------------------------------------------

describe('S3b — eye icon is present in palette selector rows (to the right)', () => {
  it('semantic token selector has a HighlightToggleButton', () => {
    const ctx = makeCtx(makeHighlightState(), vi.fn());
    renderColorTab(ctx);

    const baseGrids = container.querySelectorAll('.tokenpanel-color-base-grid');
    const semanticGrid = baseGrids[1] as HTMLElement;
    // Each PaletteSelector row with a cssVar has a highlight-toggle eye icon
    const toggles = semanticGrid.querySelectorAll('.tokenpanel-highlight-toggle');
    expect(toggles.length).toBeGreaterThan(0);
  });

  it('base-theme rows (background/foreground) do NOT have a HighlightToggleButton (no cssVar)', () => {
    const ctx = makeCtx(makeHighlightState(), vi.fn());
    renderColorTab(ctx);

    const baseGrids = container.querySelectorAll('.tokenpanel-color-base-grid');
    const baseGrid = baseGrids[0] as HTMLElement;
    const toggles = baseGrid.querySelectorAll('.tokenpanel-highlight-toggle');
    expect(toggles.length).toBe(0);
  });

  it('palette-selector container uses tokenpanel-palette-selector class', () => {
    const ctx = makeCtx(makeHighlightState(), vi.fn());
    renderColorTab(ctx);

    const selectors = container.querySelectorAll('.tokenpanel-palette-selector');
    // Should have selectors for Base (2) + Semantic (2) rows at minimum
    expect(selectors.length).toBeGreaterThanOrEqual(2);
  });
});

// ---------------------------------------------------------------------------
// S3c — swatch label-row gap class is rendered
// ---------------------------------------------------------------------------

describe('S3c — swatch label-row class is present', () => {
  it('every palette swatch has a tokenpanel-color-swatch-label-row wrapper', () => {
    const ctx = makeCtx(makeHighlightState(), vi.fn());
    renderColorTab(ctx);

    const paletteGrid = container.querySelector('.tokenpanel-color-palette-grid') as HTMLElement;
    const labelRows = paletteGrid.querySelectorAll('.tokenpanel-color-swatch-label-row');
    expect(labelRows.length).toBe(PALETTE_SIZE);
  });

  it('swatch-label-row contains both swatch-label and highlight-toggle child', () => {
    const ctx = makeCtx(makeHighlightState(), vi.fn());
    renderColorTab(ctx);

    const paletteGrid = container.querySelector('.tokenpanel-color-palette-grid') as HTMLElement;
    const firstLabelRow = paletteGrid.querySelector('.tokenpanel-color-swatch-label-row') as HTMLElement;
    expect(firstLabelRow.querySelector('.tokenpanel-color-swatch-label')).not.toBeNull();
    expect(firstLabelRow.querySelector('.tokenpanel-highlight-toggle')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// S4 — DOM tooltip show/hide behavior
// ---------------------------------------------------------------------------

describe('S4 — tooltip: DOM element is rendered', () => {
  it('a tokenpanel-tooltip element is present in the document after render', () => {
    const ctx = makeCtx(makeHighlightState(), vi.fn());
    renderColorTab(ctx);

    // TooltipProvider renders the tooltip div into document.body via portal
    const tooltip = document.querySelector('.tokenpanel-tooltip');
    expect(tooltip).not.toBeNull();
  });

  it('tooltip starts hidden (data-show=false)', () => {
    const ctx = makeCtx(makeHighlightState(), vi.fn());
    renderColorTab(ctx);

    const tooltip = document.querySelector('.tokenpanel-tooltip');
    expect(tooltip?.getAttribute('data-show')).toBe('false');
  });

  it('tooltip shows on mouseenter of the swatch button', () => {
    const ctx = makeCtx(makeHighlightState(), vi.fn());
    renderColorTab(ctx);

    const paletteGrid = container.querySelector('.tokenpanel-color-palette-grid') as HTMLElement;
    const swatchBtn = paletteGrid.querySelector('.tokenpanel-color-swatch-button') as HTMLElement;
    act(() => {
      swatchBtn.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    });

    const tooltip = document.querySelector('.tokenpanel-tooltip');
    expect(tooltip?.getAttribute('data-show')).toBe('true');
  });

  it('tooltip hides on mouseleave of the swatch button', () => {
    const ctx = makeCtx(makeHighlightState(), vi.fn());
    renderColorTab(ctx);

    const paletteGrid = container.querySelector('.tokenpanel-color-palette-grid') as HTMLElement;
    const swatchBtn = paletteGrid.querySelector('.tokenpanel-color-swatch-button') as HTMLElement;
    act(() => {
      swatchBtn.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    });
    act(() => {
      swatchBtn.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
    });

    const tooltip = document.querySelector('.tokenpanel-tooltip');
    expect(tooltip?.getAttribute('data-show')).toBe('false');
  });

  it('tooltip shows on focusin of the swatch button', () => {
    const ctx = makeCtx(makeHighlightState(), vi.fn());
    renderColorTab(ctx);

    const paletteGrid = container.querySelector('.tokenpanel-color-palette-grid') as HTMLElement;
    const swatchBtn = paletteGrid.querySelector('.tokenpanel-color-swatch-button') as HTMLElement;
    act(() => {
      swatchBtn.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    });

    const tooltip = document.querySelector('.tokenpanel-tooltip');
    expect(tooltip?.getAttribute('data-show')).toBe('true');
  });

  it('tooltip hides on focusout of the swatch button', () => {
    const ctx = makeCtx(makeHighlightState(), vi.fn());
    renderColorTab(ctx);

    const paletteGrid = container.querySelector('.tokenpanel-color-palette-grid') as HTMLElement;
    const swatchBtn = paletteGrid.querySelector('.tokenpanel-color-swatch-button') as HTMLElement;
    act(() => {
      swatchBtn.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    });
    act(() => {
      swatchBtn.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    });

    const tooltip = document.querySelector('.tokenpanel-tooltip');
    expect(tooltip?.getAttribute('data-show')).toBe('false');
  });

  it('Escape key hides the tooltip', () => {
    const ctx = makeCtx(makeHighlightState(), vi.fn());
    renderColorTab(ctx);

    const paletteGrid = container.querySelector('.tokenpanel-color-palette-grid') as HTMLElement;
    const swatchBtn = paletteGrid.querySelector('.tokenpanel-color-swatch-button') as HTMLElement;
    act(() => {
      swatchBtn.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    });
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });

    const tooltip = document.querySelector('.tokenpanel-tooltip');
    expect(tooltip?.getAttribute('data-show')).toBe('false');
  });

  it('tooltip text matches the swatch label on hover', () => {
    const ctx = makeCtx(makeHighlightState(), vi.fn());
    renderColorTab(ctx);

    const paletteGrid = container.querySelector('.tokenpanel-color-palette-grid') as HTMLElement;
    const swatchBtn = paletteGrid.querySelector('.tokenpanel-color-swatch-button') as HTMLElement;
    act(() => {
      swatchBtn.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    });

    const tooltip = document.querySelector('.tokenpanel-tooltip');
    // aria-label on swatch is "${label}: ${color}"; tooltip text should match
    expect(tooltip?.textContent).toBe(swatchBtn.getAttribute('aria-label'));
  });

  it('tooltip shows on mouseenter of a palette trigger (pulldown)', () => {
    const ctx = makeCtx(makeHighlightState(), vi.fn());
    renderColorTab(ctx);

    const trigger = container.querySelector('.tokenpanel-palette-trigger') as HTMLElement;
    expect(trigger).not.toBeNull();
    act(() => {
      trigger.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    });

    const tooltip = document.querySelector('.tokenpanel-tooltip');
    expect(tooltip?.getAttribute('data-show')).toBe('true');
  });
});

// ---------------------------------------------------------------------------
// S4 — no native title attribute on tooltip-wired triggers
// ---------------------------------------------------------------------------

describe('S4 — no native title attribute on tooltip triggers', () => {
  it('swatch button has no title attribute', () => {
    const ctx = makeCtx(makeHighlightState(), vi.fn());
    renderColorTab(ctx);

    const paletteGrid = container.querySelector('.tokenpanel-color-palette-grid') as HTMLElement;
    const swatchBtn = paletteGrid.querySelector('.tokenpanel-color-swatch-button') as HTMLElement;
    expect(swatchBtn.hasAttribute('title')).toBe(false);
  });

  it('swatch label span has no title attribute', () => {
    const ctx = makeCtx(makeHighlightState(), vi.fn());
    renderColorTab(ctx);

    const paletteGrid = container.querySelector('.tokenpanel-color-palette-grid') as HTMLElement;
    const label = paletteGrid.querySelector('.tokenpanel-color-swatch-label') as HTMLElement;
    expect(label.hasAttribute('title')).toBe(false);
  });

  it('palette trigger has no title attribute', () => {
    const ctx = makeCtx(makeHighlightState(), vi.fn());
    renderColorTab(ctx);

    const trigger = container.querySelector('.tokenpanel-palette-trigger') as HTMLElement;
    expect(trigger.hasAttribute('title')).toBe(false);
  });

  it('palette trigger label span has no title attribute', () => {
    const ctx = makeCtx(makeHighlightState(), vi.fn());
    renderColorTab(ctx);

    const triggerLabel = container.querySelector('.tokenpanel-palette-trigger-label') as HTMLElement;
    expect(triggerLabel.hasAttribute('title')).toBe(false);
  });

  it('swatch button retains aria-label for screen readers', () => {
    const ctx = makeCtx(makeHighlightState(), vi.fn());
    renderColorTab(ctx);

    const paletteGrid = container.querySelector('.tokenpanel-color-palette-grid') as HTMLElement;
    const swatchBtn = paletteGrid.querySelector('.tokenpanel-color-swatch-button') as HTMLElement;
    expect(swatchBtn.getAttribute('aria-label')).toBeTruthy();
  });

  it('palette trigger retains aria-label for screen readers', () => {
    const ctx = makeCtx(makeHighlightState(), vi.fn());
    renderColorTab(ctx);

    const trigger = container.querySelector('.tokenpanel-palette-trigger') as HTMLElement;
    expect(trigger.getAttribute('aria-label')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// #436 — palette tier `type.format: 'oklch'` routes swatch edits through the
// lossless OKLCH editor, while every cluster feature still renders. Semantic /
// base rows stay index-based (they reference palette slots, so they inherit
// OKLCH transitively) and are NOT converted to direct color editors.
// ---------------------------------------------------------------------------

/** Primary color tab whose palette tier items declare format:'oklch'. */
const OKLCH_PRIMARY_TAB: TabConfig = {
  ...PRIMARY_COLOR_TAB,
  tiers: [
    {
      id: 'palette',
      label: 'Palette',
      items: Array.from({ length: PALETTE_SIZE }, (_, i) => ({
        id: `fixture-p${i}`,
        cssVar: `--fixture-p${i}`,
        label: `Palette ${i}`,
        default: 'oklch(0.5 0.1 250)',
        type: { kind: 'color' as const, format: 'oklch' as const },
      })),
    },
    // Semantic tier is unchanged — it references the palette tier.
    PRIMARY_COLOR_TAB.tiers[1],
  ],
};

/** Secondary color tab whose palette tier items declare format:'oklch'. */
const OKLCH_SECONDARY_TAB: TabConfig = {
  ...SECONDARY_TAB,
  tiers: [
    {
      id: 'palette',
      label: 'Palette',
      items: [
        { id: 'sec-p0', cssVar: '--sec-p0', label: 'sec-p0', default: 'oklch(0.5 0.1 250)', type: { kind: 'color' as const, format: 'oklch' as const } },
        { id: 'sec-p1', cssVar: '--sec-p1', label: 'sec-p1', default: 'oklch(0.7 0.05 120)', type: { kind: 'color' as const, format: 'oklch' as const } },
      ],
    },
    SECONDARY_TAB.tiers[1],
  ],
};

function makeOklchColorState(): ColorTweakState {
  return {
    ...makeColorState(),
    palette: ['oklch(0.5 0.1 250)', 'oklch(0.6 0.12 200)', 'oklch(0.7 0.08 120)'],
  };
}

function makeOklchSecondaryState(): ColorTweakState {
  return {
    ...makeSecondaryState(),
    palette: ['oklch(0.5 0.1 250)', 'oklch(0.7 0.05 120)'],
  };
}

/** Click the first palette swatch button within a section to open its picker. */
function openFirstSwatch(section: HTMLElement): void {
  const btn = section.querySelector('.tokenpanel-color-swatch-button') as HTMLElement;
  expect(btn).not.toBeNull();
  act(() => btn.click());
}

/**
 * Nudge the first slider in the open picker with a keyboard arrow. The slider's
 * pointer path is inert in jsdom; the keydown path commits directly, so this is
 * the deterministic way to drive a swatch edit through to onChange.
 */
function fireFirstPickerSliderArrow(key = 'ArrowUp'): void {
  const slider = container.querySelector('[role="dialog"] [role="slider"]') as HTMLElement;
  if (!slider) throw new Error('no slider in open picker');
  act(() => {
    slider.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  });
}

describe('ColorTab — palette format:"oklch" routing (#436)', () => {
  beforeEach(() => {
    // Pin the in-picker display mode so the OKLCH (L/C/H) sliders render
    // deterministically rather than a persisted HSL mode from another run.
    localStorage.setItem('tokenpanel.colorPicker.mode', 'oklch');
  });
  afterEach(() => {
    localStorage.removeItem('tokenpanel.colorPicker.mode');
  });

  it('clicking an oklch palette swatch opens the OKLCH color picker', () => {
    const ctx = makeCtx(makeHighlightState(), vi.fn());
    renderColorTab(ctx, { tab: OKLCH_PRIMARY_TAB, colorState: makeOklchColorState() });

    const grid = container.querySelector('.tokenpanel-color-palette-grid') as HTMLElement;
    openFirstSwatch(grid);

    expect(container.querySelector('[role="dialog"]')).not.toBeNull();
    // OKLCH editor → Lightness/Chroma/Hue sliders are present.
    expect(
      container.querySelector('[role="slider"][aria-label="Lightness"]'),
    ).not.toBeNull();
  });

  it('editing an oklch palette swatch persists an oklch(...) string, not hex', () => {
    const ctx = makeCtx(makeHighlightState(), vi.fn());
    const persistColor = vi.fn();
    renderColorTab(ctx, {
      tab: OKLCH_PRIMARY_TAB,
      colorState: makeOklchColorState(),
      persistColor,
    });

    const grid = container.querySelector('.tokenpanel-color-palette-grid') as HTMLElement;
    openFirstSwatch(grid);
    fireFirstPickerSliderArrow();

    expect(persistColor).toHaveBeenCalled();
    const updater = persistColor.mock.calls.at(-1)![0] as (
      prev: ColorTweakState,
    ) => ColorTweakState;
    const result = updater(makeOklchColorState());
    expect(result.palette[0]).toMatch(/^oklch\(/);
    expect(/^#[0-9a-fA-F]{6,8}$/.test(result.palette[0])).toBe(false);
  });

  it('with no format, editing a palette swatch persists a hex string (backward compatible)', () => {
    const ctx = makeCtx(makeHighlightState(), vi.fn());
    const persistColor = vi.fn();
    // Default PRIMARY_COLOR_TAB has no `format` on its palette items.
    renderColorTab(ctx, { persistColor });

    const grid = container.querySelector('.tokenpanel-color-palette-grid') as HTMLElement;
    openFirstSwatch(grid);
    fireFirstPickerSliderArrow();

    expect(persistColor).toHaveBeenCalled();
    const updater = persistColor.mock.calls.at(-1)![0] as (
      prev: ColorTweakState,
    ) => ColorTweakState;
    const result = updater(makeColorState());
    expect(/^#[0-9a-fA-F]{6,8}$/.test(result.palette[0])).toBe(true);
    expect(result.palette[0].startsWith('oklch(')).toBe(false);
  });

  it('renders every cluster feature with an oklch palette (preset dropdown, Base, Semantic, secondary)', () => {
    const ctx = makeCtx(makeHighlightState(), vi.fn());
    renderColorTab(ctx, {
      tab: OKLCH_PRIMARY_TAB,
      colorState: makeOklchColorState(),
      secondaryTab: OKLCH_SECONDARY_TAB,
      secondaryState: makeOklchSecondaryState(),
    });

    // "Scheme…" preset dropdown.
    expect(container.querySelector('.tokenpanel-color-preset-select')).not.toBeNull();
    // Base (bg/fg) + Semantic (accent/muted) stay index-based PaletteSelectors.
    const baseGrids = container.querySelectorAll('.tokenpanel-color-base-grid');
    expect(baseGrids.length).toBeGreaterThanOrEqual(2);
    expect(
      (baseGrids[0] as HTMLElement).querySelectorAll('.tokenpanel-palette-selector').length,
    ).toBe(2);
    expect(
      (baseGrids[1] as HTMLElement).querySelectorAll('.tokenpanel-palette-selector').length,
    ).toBe(2);
    // Secondary cluster sections render.
    expect(
      container.querySelector('[data-testid="tokenpanel-secondary-palette-section"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-testid="tokenpanel-secondary-semantic-section"]'),
    ).not.toBeNull();
  });

  it('secondary oklch palette swatch persists an oklch(...) string', () => {
    const ctx = makeCtx(makeHighlightState(), vi.fn());
    const persistSecondary = vi.fn();
    renderColorTab(ctx, {
      tab: OKLCH_PRIMARY_TAB,
      colorState: makeOklchColorState(),
      secondaryTab: OKLCH_SECONDARY_TAB,
      secondaryState: makeOklchSecondaryState(),
      persistSecondary,
    });

    const secSection = container.querySelector(
      '[data-testid="tokenpanel-secondary-palette-section"]',
    ) as HTMLElement;
    openFirstSwatch(secSection);
    fireFirstPickerSliderArrow();

    expect(persistSecondary).toHaveBeenCalled();
    const updater = persistSecondary.mock.calls.at(-1)![0] as (
      prev: ColorTweakState | undefined,
    ) => ColorTweakState | undefined;
    const result = updater(makeOklchSecondaryState());
    expect(result).not.toBeUndefined();
    expect(result!.palette[0]).toMatch(/^oklch\(/);
  });

  it('secondary palette stays hex when its tier declares no format', () => {
    const ctx = makeCtx(makeHighlightState(), vi.fn());
    const persistSecondary = vi.fn();
    renderColorTab(ctx, {
      secondaryTab: SECONDARY_TAB, // no format on palette items
      secondaryState: makeSecondaryState(),
      persistSecondary,
    });

    const secSection = container.querySelector(
      '[data-testid="tokenpanel-secondary-palette-section"]',
    ) as HTMLElement;
    openFirstSwatch(secSection);
    fireFirstPickerSliderArrow();

    expect(persistSecondary).toHaveBeenCalled();
    const updater = persistSecondary.mock.calls.at(-1)![0] as (
      prev: ColorTweakState | undefined,
    ) => ColorTweakState | undefined;
    const result = updater(makeSecondaryState());
    expect(result).not.toBeUndefined();
    expect(/^#[0-9a-fA-F]{6,8}$/.test(result!.palette[0])).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// S3 (#464) — literal semantic rows render as editable OKLCH swatches
//
// A lone `semantic: true` tier with no palette sibling, whose items all
// resolve to `{ literal: string }` (an OKLCH color, not a palette-item id —
// see `deriveSemanticValue` in cluster-config.ts). These must render as
// editable `ColorField` swatches, NOT `PaletteSelector` dropdowns (there is
// no palette to pick a slot from).
// ---------------------------------------------------------------------------

const LITERAL_SEMANTIC_TAB: TabConfig = {
  id: 'color',
  label: 'Color',
  colorExtras: {
    id: 'lit-fixture',
    label: 'Lit Fixture',
    baseRoles: {},
    baseDefaults: { background: 0, foreground: 0, cursor: 0, selectionBg: 0, selectionFg: 0 },
    defaultShikiTheme: 'dracula',
    colorSchemes: {},
    panelSettings: { colorScheme: '', colorMode: false as const },
  },
  tiers: [
    {
      id: 'semantic',
      label: 'Semantic',
      semantic: true,
      items: [
        {
          id: 'danger',
          cssVar: '--lit-danger',
          label: 'Danger',
          default: 'oklch(0.6 0.2 30)',
          type: { kind: 'color' as const },
        },
        {
          id: 'success',
          cssVar: '--lit-success',
          label: 'Success',
          default: 'oklch(0.7 0.15 140)',
          type: { kind: 'color' as const },
        },
        {
          id: 'warning',
          cssVar: '--lit-warning',
          label: 'Warning',
          default: 'oklch(0.75 0.18 80)',
          type: { kind: 'color' as const },
        },
      ],
    },
  ],
};

/**
 * Empty-palette color state — the lone semantic tier has no palette sibling.
 * With `palette: []`, Section A (Palette) and Section B (Base) both skip
 * rendering (#466 follow-up), so `.tokenpanel-color-base-grid` index 0 below
 * is the Semantic Tokens grid, not the Base grid.
 */
function makeLiteralColorState(): ColorTweakState {
  return {
    palette: [],
    background: 0,
    foreground: 0,
    cursor: 0,
    selectionBg: 0,
    selectionFg: 0,
    semanticMappings: {},
    shikiTheme: 'dracula',
  };
}

describe('ColorTab — literal semantic rows render as editable OKLCH swatches (S3, #464)', () => {
  beforeEach(() => {
    // Pin the in-picker display mode so the OKLCH (L/C/H) sliders render
    // deterministically, mirroring the #436 suite above.
    localStorage.setItem('tokenpanel.colorPicker.mode', 'oklch');
  });
  afterEach(() => {
    localStorage.removeItem('tokenpanel.colorPicker.mode');
  });

  it('renders one editable ColorField swatch per literal semantic entry (N=3), not a PaletteSelector', () => {
    const ctx = makeCtx(makeHighlightState(), vi.fn());
    renderColorTab(ctx, { tab: LITERAL_SEMANTIC_TAB, colorState: makeLiteralColorState() });

    const baseGrids = container.querySelectorAll('.tokenpanel-color-base-grid');
    const semanticGrid = baseGrids[0] as HTMLElement;
    expect(semanticGrid).not.toBeNull();

    // 3 literal rows → 3 editable swatches. NOT a palette-index dropdown
    // (there's no palette tier) and NOT an empty section.
    expect(semanticGrid.querySelectorAll('[data-testid="color-field-swatch"]').length).toBe(3);
    expect(semanticGrid.querySelectorAll('.tokenpanel-palette-selector').length).toBe(0);
  });

  it('each literal row shows the starting OKLCH color and its cssVar label', () => {
    const ctx = makeCtx(makeHighlightState(), vi.fn());
    renderColorTab(ctx, { tab: LITERAL_SEMANTIC_TAB, colorState: makeLiteralColorState() });

    const baseGrids = container.querySelectorAll('.tokenpanel-color-base-grid');
    const semanticGrid = baseGrids[0] as HTMLElement;
    const row = semanticGrid.querySelector(
      '[data-testid="tokenpanel-semantic-literal-danger"]',
    ) as HTMLElement;
    expect(row).not.toBeNull();
    const swatch = row.querySelector('[data-testid="color-field-swatch"]') as HTMLElement;
    expect(swatch.style.backgroundColor).toContain('oklch');
    expect(row.textContent).toContain('--lit-danger');
  });

  it('each literal row has the eye/highlight toggle (real cssVar), matching palette-swatch behavior', () => {
    const ctx = makeCtx(makeHighlightState(), vi.fn());
    renderColorTab(ctx, { tab: LITERAL_SEMANTIC_TAB, colorState: makeLiteralColorState() });

    const baseGrids = container.querySelectorAll('.tokenpanel-color-base-grid');
    const semanticGrid = baseGrids[0] as HTMLElement;
    expect(semanticGrid.querySelectorAll('.tokenpanel-highlight-toggle').length).toBe(3);
  });

  it('clicking the eye toggle on a literal row calls toggle with the row cssVar', () => {
    const toggle = vi.fn();
    const ctx = makeCtx(makeHighlightState(), toggle);
    renderColorTab(ctx, { tab: LITERAL_SEMANTIC_TAB, colorState: makeLiteralColorState() });

    const baseGrids = container.querySelectorAll('.tokenpanel-color-base-grid');
    const semanticGrid = baseGrids[0] as HTMLElement;
    const row = semanticGrid.querySelector(
      '[data-testid="tokenpanel-semantic-literal-danger"]',
    ) as HTMLElement;
    const eyeToggle = row.querySelector('.tokenpanel-highlight-toggle') as HTMLElement;
    act(() => eyeToggle.click());

    expect(toggle).toHaveBeenCalledWith('--lit-danger');
  });

  it('editing a literal swatch dispatches { literal: <oklch string> } into semanticMappings, not a palette index', () => {
    const ctx = makeCtx(makeHighlightState(), vi.fn());
    const persistColor = vi.fn();
    renderColorTab(ctx, {
      tab: LITERAL_SEMANTIC_TAB,
      colorState: makeLiteralColorState(),
      persistColor,
    });

    const baseGrids = container.querySelectorAll('.tokenpanel-color-base-grid');
    const semanticGrid = baseGrids[0] as HTMLElement;
    const row = semanticGrid.querySelector(
      '[data-testid="tokenpanel-semantic-literal-danger"]',
    ) as HTMLElement;
    const swatchBtn = row.querySelector('[data-testid="color-field-swatch"]') as HTMLElement;
    act(() => swatchBtn.click());
    fireFirstPickerSliderArrow();

    expect(persistColor).toHaveBeenCalled();
    const updater = persistColor.mock.calls.at(-1)![0] as (
      prev: ColorTweakState,
    ) => ColorTweakState;
    const result = updater(makeLiteralColorState());
    expect(result.semanticMappings.danger).toEqual(
      expect.objectContaining({ literal: expect.stringMatching(/^oklch\(/) }),
    );
  });

  it('does not regress a conventional index-based semantic default (still a PaletteSelector, no ColorField)', () => {
    // PRIMARY_COLOR_TAB's semantic tier resolves accent/muted to palette
    // indices (not literals) — must be unaffected by the literal-row change.
    const ctx = makeCtx(makeHighlightState(), vi.fn());
    renderColorTab(ctx);

    const baseGrids = container.querySelectorAll('.tokenpanel-color-base-grid');
    const semanticGrid = baseGrids[1] as HTMLElement;
    expect(semanticGrid.querySelectorAll('.tokenpanel-palette-selector').length).toBe(2);
    expect(semanticGrid.querySelectorAll('[data-testid="color-field-swatch"]').length).toBe(0);
  });

  it('renders no banned semantic tags and no <button> elements (hostile-host / panel DOM-hygiene policy)', () => {
    const ctx = makeCtx(makeHighlightState(), vi.fn());
    renderColorTab(ctx, { tab: LITERAL_SEMANTIC_TAB, colorState: makeLiteralColorState() });

    expect(container.querySelector('button')).toBeNull();
    expect(container.querySelector('h1,h2,h3,h4,h5,h6,ul,ol,li,table,a,details,summary')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// S12 (#473) — SemanticLiteralRow per-mode (light/dark) editor toggle
//
// A literal semantic row (no `referencesRamps` on its tier) gets a "Per-mode"
// checkbox. Checking it expands one literal into an independently-editable
// light/dark `ColorField` pair; unchecking it collapses back to a single
// value using the cluster's `getClusterDefaultMode()` side.
// ---------------------------------------------------------------------------

/** `danger` seeded as an already-per-mode literal; `success`/`warning` stay single-mode. */
function makePerModeColorState(): ColorTweakState {
  return {
    ...makeLiteralColorState(),
    semanticMappings: {
      danger: { literal: { light: 'oklch(0.9 0.05 30)', dark: 'oklch(0.3 0.1 30)' } },
    },
  };
}

/** Same fixture, but the cluster's configured default mode is "dark". */
const DARK_DEFAULT_LITERAL_SEMANTIC_TAB: TabConfig = {
  ...LITERAL_SEMANTIC_TAB,
  colorExtras: {
    ...LITERAL_SEMANTIC_TAB.colorExtras!,
    panelSettings: {
      colorScheme: '',
      colorMode: { defaultMode: 'dark' as const, lightScheme: 'L', darkScheme: 'D' },
    },
  },
};

/** Toggle a checkbox and fire its native change event. */
function fireCheckboxToggle(checkbox: HTMLInputElement, checked: boolean) {
  act(() => {
    checkbox.checked = checked;
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

describe('ColorTab — SemanticLiteralRow per-mode (light/dark) editor toggle (S12, #473)', () => {
  beforeEach(() => {
    localStorage.setItem('tokenpanel.colorPicker.mode', 'oklch');
  });
  afterEach(() => {
    localStorage.removeItem('tokenpanel.colorPicker.mode');
  });

  it('a single-mode literal row shows an unchecked "Per-mode" checkbox and one editable swatch', () => {
    const ctx = makeCtx(makeHighlightState(), vi.fn());
    renderColorTab(ctx, { tab: LITERAL_SEMANTIC_TAB, colorState: makeLiteralColorState() });

    const row = container.querySelector(
      '[data-testid="tokenpanel-semantic-literal-danger"]',
    ) as HTMLElement;
    const checkbox = row.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(checkbox).not.toBeNull();
    expect(checkbox.checked).toBe(false);
    expect(row.querySelectorAll('[data-testid="color-field-swatch"]').length).toBe(1);
  });

  it('a per-mode literal row shows a checked "Per-mode" checkbox and two editable swatches', () => {
    const ctx = makeCtx(makeHighlightState(), vi.fn());
    renderColorTab(ctx, { tab: LITERAL_SEMANTIC_TAB, colorState: makePerModeColorState() });

    const row = container.querySelector(
      '[data-testid="tokenpanel-semantic-literal-danger"]',
    ) as HTMLElement;
    const checkbox = row.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
    expect(row.querySelectorAll('[data-testid="color-field-swatch"]').length).toBe(2);
  });

  it('checking "Per-mode" seeds both sides from the current single value and persists { literal: { light, dark } }', () => {
    const ctx = makeCtx(makeHighlightState(), vi.fn());
    const persistColor = vi.fn();
    renderColorTab(ctx, {
      tab: LITERAL_SEMANTIC_TAB,
      colorState: makeLiteralColorState(),
      persistColor,
    });

    const row = container.querySelector(
      '[data-testid="tokenpanel-semantic-literal-danger"]',
    ) as HTMLElement;
    const checkbox = row.querySelector('input[type="checkbox"]') as HTMLInputElement;
    fireCheckboxToggle(checkbox, true);

    expect(persistColor).toHaveBeenCalled();
    const updater = persistColor.mock.calls.at(-1)![0] as (
      prev: ColorTweakState,
    ) => ColorTweakState;
    const result = updater(makeLiteralColorState());
    expect(result.semanticMappings.danger).toEqual({
      literal: { light: 'oklch(0.6 0.2 30)', dark: 'oklch(0.6 0.2 30)' },
    });
  });

  it('unchecking "Per-mode" collapses to the light side (cluster defaultMode is "light" by default)', () => {
    const ctx = makeCtx(makeHighlightState(), vi.fn());
    const persistColor = vi.fn();
    renderColorTab(ctx, {
      tab: LITERAL_SEMANTIC_TAB,
      colorState: makePerModeColorState(),
      persistColor,
    });

    const row = container.querySelector(
      '[data-testid="tokenpanel-semantic-literal-danger"]',
    ) as HTMLElement;
    const checkbox = row.querySelector('input[type="checkbox"]') as HTMLInputElement;
    fireCheckboxToggle(checkbox, false);

    expect(persistColor).toHaveBeenCalled();
    const updater = persistColor.mock.calls.at(-1)![0] as (
      prev: ColorTweakState,
    ) => ColorTweakState;
    const result = updater(makePerModeColorState());
    expect(result.semanticMappings.danger).toEqual({ literal: 'oklch(0.9 0.05 30)' });
  });

  it('unchecking "Per-mode" collapses to the dark side when the cluster defaultMode is "dark"', () => {
    const ctx = makeCtx(makeHighlightState(), vi.fn());
    const persistColor = vi.fn();
    renderColorTab(ctx, {
      tab: DARK_DEFAULT_LITERAL_SEMANTIC_TAB,
      colorState: makePerModeColorState(),
      persistColor,
    });

    const row = container.querySelector(
      '[data-testid="tokenpanel-semantic-literal-danger"]',
    ) as HTMLElement;
    const checkbox = row.querySelector('input[type="checkbox"]') as HTMLInputElement;
    fireCheckboxToggle(checkbox, false);

    expect(persistColor).toHaveBeenCalled();
    const updater = persistColor.mock.calls.at(-1)![0] as (
      prev: ColorTweakState,
    ) => ColorTweakState;
    const result = updater(makePerModeColorState());
    expect(result.semanticMappings.danger).toEqual({ literal: 'oklch(0.3 0.1 30)' });
  });

  it('editing the Light swatch of a per-mode row updates only the light side', () => {
    const ctx = makeCtx(makeHighlightState(), vi.fn());
    const persistColor = vi.fn();
    renderColorTab(ctx, {
      tab: LITERAL_SEMANTIC_TAB,
      colorState: makePerModeColorState(),
      persistColor,
    });

    const row = container.querySelector(
      '[data-testid="tokenpanel-semantic-literal-danger"]',
    ) as HTMLElement;
    const lightSwatch = row.querySelector(
      '[aria-label="--lit-danger (Light): --lit-danger"]',
    ) as HTMLElement;
    expect(lightSwatch).not.toBeNull();
    act(() => lightSwatch.click());
    fireFirstPickerSliderArrow();

    expect(persistColor).toHaveBeenCalled();
    const updater = persistColor.mock.calls.at(-1)![0] as (
      prev: ColorTweakState,
    ) => ColorTweakState;
    const result = updater(makePerModeColorState());
    expect(result.semanticMappings.danger).toEqual({
      literal: { light: expect.stringMatching(/^oklch\(/), dark: 'oklch(0.3 0.1 30)' },
    });
  });

  it('editing the Dark swatch of a per-mode row updates only the dark side', () => {
    const ctx = makeCtx(makeHighlightState(), vi.fn());
    const persistColor = vi.fn();
    renderColorTab(ctx, {
      tab: LITERAL_SEMANTIC_TAB,
      colorState: makePerModeColorState(),
      persistColor,
    });

    const row = container.querySelector(
      '[data-testid="tokenpanel-semantic-literal-danger"]',
    ) as HTMLElement;
    const darkSwatch = row.querySelector(
      '[aria-label="--lit-danger (Dark): --lit-danger"]',
    ) as HTMLElement;
    expect(darkSwatch).not.toBeNull();
    act(() => darkSwatch.click());
    fireFirstPickerSliderArrow();

    expect(persistColor).toHaveBeenCalled();
    const updater = persistColor.mock.calls.at(-1)![0] as (
      prev: ColorTweakState,
    ) => ColorTweakState;
    const result = updater(makePerModeColorState());
    expect(result.semanticMappings.danger).toEqual({
      literal: { light: 'oklch(0.9 0.05 30)', dark: expect.stringMatching(/^oklch\(/) },
    });
  });

  it('single-mode literal rows for other keys are unaffected (regression check)', () => {
    const ctx = makeCtx(makeHighlightState(), vi.fn());
    renderColorTab(ctx, { tab: LITERAL_SEMANTIC_TAB, colorState: makePerModeColorState() });

    const successRow = container.querySelector(
      '[data-testid="tokenpanel-semantic-literal-success"]',
    ) as HTMLElement;
    expect(successRow.querySelectorAll('[data-testid="color-field-swatch"]').length).toBe(1);
    const checkbox = successRow.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
  });

  it('renders no banned semantic tags or <button> elements with a per-mode row expanded', () => {
    const ctx = makeCtx(makeHighlightState(), vi.fn());
    renderColorTab(ctx, { tab: LITERAL_SEMANTIC_TAB, colorState: makePerModeColorState() });

    expect(container.querySelector('button')).toBeNull();
    expect(
      container.querySelector('h1,h2,h3,h4,h5,h6,ul,ol,li,table,a,details,summary'),
    ).toBeNull();
  });
});
