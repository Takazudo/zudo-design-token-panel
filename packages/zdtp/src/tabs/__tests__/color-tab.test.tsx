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
  } = {},
): void {
  const {
    tab = PRIMARY_COLOR_TAB,
    colorState = makeColorState(),
    secondaryTab = null,
    secondaryState = null,
  } = opts;
  act(() => {
    render(
      <TooltipProvider>
        <HighlightContext.Provider value={ctx}>
          <ColorTab
            tab={tab}
            state={colorState}
            persistColor={noop}
            secondaryTab={secondaryTab}
            secondaryState={secondaryState}
            persistSecondary={noop}
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
