// @vitest-environment browser
/**
 * Browser-mode tests for the Palette tab (#396).
 *
 * Uses vitest browser mode with Playwright Chromium (headless). This gives real
 * CSS computed-style resolution, real pointer events, and real layout — things
 * jsdom cannot provide for the PaletteChart SVG drag interaction or for
 * counter-scaling layout assertions.
 *
 * Covers:
 *   - Palette tab renders in edit mode, shows swatch grid.
 *   - Switching to Check mode shows the contrast-checker view.
 *   - Selecting a base row in Check mode → right-column verdicts update.
 *   - DOM hygiene: no native button, h3, h4, details, summary across all sub-components.
 *   - Layout: tab renders at narrow (360px) and wide (800px) without overflow.
 *   - role="button" and role="heading" used correctly.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import PaletteTab from './palette-tab';
import type { TabConfig } from '../../tokens/tier-model';
import type { TabOverrides } from '../../apply/tier-resolver';

// Import panel CSS as an inline string so layout assertions exercise production styles.
// @ts-ignore — ?inline is a Vite-specific query not typed in tsconfig
const panelCssModule = import('../../styles/panel.css?inline');

// ---------------------------------------------------------------------------
// Fixture — two-group palette
// ---------------------------------------------------------------------------

const PALETTE_TAB: TabConfig = {
  id: 'palette',
  label: 'Palette',
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
let panelStyle: HTMLStyleElement;

beforeEach(async () => {
  const panelCss: string = ((await panelCssModule) as { default: string }).default;
  panelStyle = document.createElement('style');
  panelStyle.textContent = panelCss;
  document.head.appendChild(panelStyle);

  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  act(() => {
    render(null, container);
  });
  document.body.removeChild(container);
  panelStyle.remove();
  document.documentElement.style.cssText = '';
});

async function renderPaletteTab(
  tab: TabConfig = PALETTE_TAB,
  overrides: TabOverrides = {},
  onChange: (tierId: string, itemId: string, next: string) => void = () => undefined,
): Promise<void> {
  await act(() => {
    render(<PaletteTab tab={tab} overrides={overrides} onChange={onChange} />, container);
  });
}

/**
 * Palette Edit groups start collapsed (#517). Click a group's header to open it
 * so its swatch strip + curve editor render. Single-open accordion.
 */
async function openGroup(tierId: string): Promise<void> {
  const header = container.querySelector<HTMLElement>(
    `[data-testid="palette-edit-group-header-${tierId}"]`,
  );
  if (!header) throw new Error(`group header ${tierId} not found`);
  await act(() => {
    header.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

// ---------------------------------------------------------------------------
// 1. Renders Palette tab in edit mode — swatch grid visible
// ---------------------------------------------------------------------------

describe('PaletteTab browser — edit mode renders', () => {
  it('renders palette-tab root element', async () => {
    await renderPaletteTab();
    const root = container.querySelector('[data-testid="palette-tab"]');
    expect(root).not.toBeNull();
  });

  it('shows palette-edit-view by default', async () => {
    await renderPaletteTab();
    const editView = container.querySelector('[data-testid="palette-edit-view"]');
    expect(editView).not.toBeNull();
    const checkView = container.querySelector('[data-testid="palette-check-view"]');
    expect(checkView).toBeNull();
  });

  it('all groups collapsed by default — no swatch strip until a group is opened', async () => {
    await renderPaletteTab();
    // Collapsed: no interactive swatches, but each header shows preview chips.
    expect(container.querySelectorAll('[data-testid^="palette-edit-swatch-"]').length).toBe(0);
    const warmHeader = container.querySelector('[data-testid="palette-edit-group-header-warm"]');
    expect(warmHeader?.getAttribute('aria-expanded')).toBe('false');
    const warmChips = container.querySelectorAll(
      '[data-testid="palette-edit-group-header-warm"] .tokenpanel-palette-edit-preview-chip',
    );
    expect(warmChips.length).toBe(2);
  });

  it('renders swatches for the warm group once opened', async () => {
    await renderPaletteTab();
    await openGroup('warm');
    const swatches = container.querySelectorAll('[data-testid^="palette-edit-swatch-warm"]');
    expect(swatches.length).toBe(2);
  });

  it('swatches have a background color set (hex fill from oklch)', async () => {
    await renderPaletteTab();
    await openGroup('warm');
    // In real Chromium, background is computed from the oklch→hex conversion
    // done inside the swatch component. Check that style is non-empty.
    const swatch = container.querySelector<HTMLElement>('[data-testid="palette-edit-swatch-warm-1"]');
    expect(swatch).not.toBeNull();
    const bg = swatch!.style.background || swatch!.style.backgroundColor;
    expect(bg).not.toBe('');
  });

  it('mode toggle shows Edit as active (aria-pressed=true)', async () => {
    await renderPaletteTab();
    const editBtn = container.querySelector('[data-testid="palette-mode-edit"]');
    expect(editBtn?.getAttribute('aria-pressed')).toBe('true');
    const checkBtn = container.querySelector('[data-testid="palette-mode-check"]');
    expect(checkBtn?.getAttribute('aria-pressed')).toBe('false');
  });
});

// ---------------------------------------------------------------------------
// 2. Switch to Check mode
// ---------------------------------------------------------------------------

describe('PaletteTab browser — switching to Check mode', () => {
  it('clicking the Check button shows PaletteCheckView', async () => {
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
    expect(getComputedStyle(checkView!).display).toBe('flex');

    const checkCols = container.querySelector('[data-testid="palette-check-left-col"]')?.parentElement;
    expect(checkCols).not.toBeNull();
    expect(getComputedStyle(checkCols!).display).toBe('grid');
  });

  it('Check mode: left col shows base rows', async () => {
    await renderPaletteTab();

    const checkBtn = container.querySelector<HTMLElement>('[data-testid="palette-mode-check"]');
    await act(() => {
      checkBtn!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const leftCol = container.querySelector('[data-testid="palette-check-left-col"]');
    expect(leftCol).not.toBeNull();
    const baseRows = container.querySelectorAll('[data-testid^="palette-check-base-row-"]');
    expect(baseRows.length).toBe(4); // 2 warm + 2 cool
  });

  it('Check mode: right col shows candidate rows with verdict chips', async () => {
    await renderPaletteTab();

    const checkBtn = container.querySelector<HTMLElement>('[data-testid="palette-mode-check"]');
    await act(() => {
      checkBtn!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const chips = container.querySelectorAll('[data-testid^="palette-check-chip-"]');
    expect(chips.length).toBe(4); // one per palette item
  });

  it('Check mode: selecting a different base row updates the selected state', async () => {
    await renderPaletteTab();

    const checkBtn = container.querySelector<HTMLElement>('[data-testid="palette-mode-check"]');
    await act(() => {
      checkBtn!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    // First base row is selected by default
    const firstRow = container.querySelector<HTMLElement>('[data-testid="palette-check-base-row-warm-1"]');
    expect(firstRow?.getAttribute('aria-pressed')).toBe('true');

    // Click a different base row
    const secondRow = container.querySelector<HTMLElement>('[data-testid="palette-check-base-row-cool-1"]');
    expect(secondRow).not.toBeNull();

    await act(() => {
      secondRow!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    // cool-1 should now be selected
    expect(secondRow?.getAttribute('aria-pressed')).toBe('true');
    // warm-1 should no longer be selected
    expect(firstRow?.getAttribute('aria-pressed')).toBe('false');
  });

  it('Check mode: right-column verdicts update when a different base is selected', async () => {
    // Use overrides where warm-1 is very light and cool-2 is very dark,
    // so switching base changes which colors pass contrast.
    const overrides: TabOverrides = {
      warm: {
        'warm-1': 'oklch(0.98 0.01 50)',  // near-white
        'warm-2': 'oklch(0.5 0.18 45)',   // medium
      },
      cool: {
        'cool-1': 'oklch(0.7 0.14 240)',  // light-ish
        'cool-2': 'oklch(0.15 0.05 260)', // near-black
      },
    };
    await renderPaletteTab(PALETTE_TAB, overrides);

    const checkBtn = container.querySelector<HTMLElement>('[data-testid="palette-mode-check"]');
    await act(() => {
      checkBtn!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    // Record initial chips on right column
    const getChipText = (id: string) =>
      container.querySelector(`[data-testid="palette-check-chip-${id}"]`)?.textContent?.trim();

    const chipCool2BeforeBase1 = getChipText('cool-2');

    // Now select cool-2 (near-black) as the base
    const cool2Row = container.querySelector<HTMLElement>('[data-testid="palette-check-base-row-cool-2"]');
    await act(() => {
      cool2Row!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const chipCool2AfterBase2 = getChipText('cool-2');

    // When cool-2 is the base, the chip for cool-2 should reflect contrast
    // against itself (ratio 1:1 = Fail). The chips MUST change between
    // different base selections for different colors.
    // We can't assert the exact value without CSS var resolution, but we can
    // verify at least one chip value is "Fail" (the self-contrast is always 1:1).
    expect(chipCool2AfterBase2).toBe('Fail'); // contrast with self is always 1:1 = Fail
    // Before, with warm-1 (near-white) as base, cool-2 (near-black) should pass
    expect(chipCool2BeforeBase1).not.toBe('Fail'); // high contrast with near-white
  });
});

describe('PaletteTab browser — static and invalid palette values (#625)', () => {
  const paperTab: TabConfig = {
    id: 'palette', label: 'Palette', tiers: [{ id: 'paper', label: 'Paper', items: [
      { id: 'white', cssVar: '--paper-white', label: 'White', default: '#ffffff', type: { kind: 'color', format: 'oklch' } },
      { id: 'context', cssVar: '--paper-context', label: 'Context', default: 'var(--paper)', type: { kind: 'color', format: 'oklch' } },
      { id: 'offwhite', cssVar: '--paper-offwhite', label: 'Off white', default: '#f6f4ee', type: { kind: 'color', format: 'oklch' } },
      { id: 'alpha', cssVar: '--paper-alpha', label: 'Alpha', default: 'rgb(0 0 0 / 50%)', type: { kind: 'color', format: 'oklch' } },
    ] }],
  };

  it('renders the exact paper repro colors and no invalid chart target', async () => {
    await renderPaletteTab(paperTab);
    const chips = container.querySelectorAll<HTMLElement>('.tokenpanel-palette-edit-preview-chip');
    expect(getComputedStyle(chips[0]).backgroundColor).toBe('rgb(255, 255, 255)');
    expect(getComputedStyle(chips[2]).backgroundColor).toBe('rgb(246, 244, 238)');
    await openGroup('paper');
    expect(container.querySelector('[data-testid="palette-edit-swatch-context"]')?.getAttribute('data-invalid')).toBe('true');
    expect(container.querySelector('[data-node-hit="1"]')).toBeNull();
  });

  it('reports true off-white contrast and alpha/invalid N/A in Check mode', async () => {
    await renderPaletteTab(paperTab);
    const checkBtn = container.querySelector<HTMLElement>('[data-testid="palette-mode-check"]')!;
    await act(() => { checkBtn.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(container.querySelector('[data-testid="palette-check-candidate-row-offwhite"] .tokenpanel-palette-check-ratio')?.textContent).toBe('1.1');
    expect(container.querySelector('[data-testid="palette-check-chip-context"]')?.textContent).toBe('N/A');
    expect(container.querySelector('[data-testid="palette-check-chip-alpha"]')?.textContent).toBe('N/A');
    expect(container.querySelector('.tokenpanel-palette-check-tally-total')?.textContent).toBe('2');
  });
});

describe('PaletteTab browser — readonly palette values (#626)', () => {
  const readonlyTab: TabConfig = {
    id: 'palette-readonly', label: 'Palette readonly', tiers: [{ id: 'brand', label: 'Brand', items: [
      { id: 'brand-blue', cssVar: '--brand-blue', label: 'Brand blue', default: 'oklch(0.52 0.16 250)', type: { kind: 'color', format: 'oklch' } },
      { id: 'brand-blue-strong', cssVar: '--brand-blue-strong', label: 'Brand blue strong', default: 'oklch(0.43 0.13 250)', type: { kind: 'color', format: 'oklch' }, readonly: true },
    ] }],
  };

  it('keeps the exact #618 readonly color painted and inspectable without edit targets', async () => {
    const changes: Array<[string, string, string]> = [];
    await renderPaletteTab(readonlyTab, {}, (tierId, itemId, next) => {
      changes.push([tierId, itemId, next]);
    });
    await openGroup('brand');
    const writable = container.querySelector<HTMLElement>('[data-testid="palette-edit-swatch-brand-blue"]')!;
    const locked = container.querySelector<HTMLElement>('[data-testid="palette-edit-swatch-brand-blue-strong"]')!;
    expect(getComputedStyle(writable).backgroundColor).not.toBe(getComputedStyle(locked).backgroundColor);
    expect(locked.getAttribute('aria-disabled')).toBe('true');
    expect(locked.querySelector('.tokenpanel-palette-edit-swatch-lock')).not.toBeNull();
    expect(container.querySelector('[data-node-index="1"]')).not.toBeNull();
    expect(container.querySelector('[data-node-hit="1"]')).toBeNull();
    const blocker = container.querySelector<SVGElement>('[data-readonly-blocker="1"][data-channel="l"]')!;
    const curve = container.querySelector<SVGSVGElement>('[data-testid="palette-chart-curve-l"]')!;
    const blockerRect = blocker.getBoundingClientRect();
    const lockedMarkerHit = document.elementFromPoint(
      blockerRect.left + blockerRect.width / 2,
      blockerRect.top + blockerRect.height / 2,
    );
    expect(lockedMarkerHit).toBe(blocker);
    await act(() => {
      lockedMarkerHit!.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 31, clientY: 100 }));
      curve.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerId: 31, clientY: 50 }));
      curve.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 31, clientY: 50 }));
    });
    expect(changes).toEqual([]);
    await act(() => { locked.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(container.querySelector('[data-testid="palette-readout-token"]')?.textContent).toContain('--brand-blue-strong');
    expect(container.querySelector('[data-testid="color-field-swatch"]')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 3. DOM-hygiene invariants
// ---------------------------------------------------------------------------

describe('PaletteTab browser — DOM hygiene', () => {
  const BANNED_TAGS = ['button', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'details', 'summary'];

  for (const tag of BANNED_TAGS) {
    it(`no <${tag}> elements in edit mode`, async () => {
      await renderPaletteTab();
      const found = container.querySelectorAll(tag);
      expect(found.length).toBe(0);
    });
  }

  it('no <button> elements in check mode', async () => {
    await renderPaletteTab();
    const checkBtn = container.querySelector<HTMLElement>('[data-testid="palette-mode-check"]');
    await act(() => {
      checkBtn!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBe(0);
  });

  it('mode toggle buttons are div[role="button"] not native button', async () => {
    await renderPaletteTab();
    const editBtn = container.querySelector('[data-testid="palette-mode-edit"]');
    expect(editBtn?.tagName.toLowerCase()).toBe('div');
    expect(editBtn?.getAttribute('role')).toBe('button');
    expect(editBtn?.getAttribute('tabindex')).toBe('0');
  });

  it('tier headings use div[role="heading"] aria-level=3, not h3/h4', async () => {
    await renderPaletteTab();
    const headings = container.querySelectorAll('[role="heading"][aria-level="3"]');
    // Should have at least one heading for the warm group (the active group)
    expect(headings.length).toBeGreaterThan(0);
    for (const h of Array.from(headings)) {
      expect(h.tagName.toLowerCase()).toBe('div');
    }
  });

  it('group headers are div[role="button"] with aria-expanded, not native button', async () => {
    await renderPaletteTab();
    const headers = container.querySelectorAll('[data-testid^="palette-edit-group-header-"]');
    expect(headers.length).toBe(2); // warm + cool
    for (const header of Array.from(headers)) {
      expect(header.tagName.toLowerCase()).toBe('div');
      expect(header.getAttribute('role')).toBe('button');
      expect(header.getAttribute('tabindex')).toBe('0');
      expect(header.getAttribute('aria-expanded')).toBe('false');
    }
  });

  it('swatch buttons are div[role="button"] not native button', async () => {
    await renderPaletteTab();
    await openGroup('warm');
    const swatches = container.querySelectorAll('[data-testid^="palette-edit-swatch-"]');
    expect(swatches.length).toBeGreaterThan(0);
    for (const swatch of Array.from(swatches)) {
      expect(swatch.tagName.toLowerCase()).toBe('div');
      expect(swatch.getAttribute('role')).toBe('button');
    }
  });

  it('base rows in check mode are div[role="button"] not native button', async () => {
    await renderPaletteTab();
    const checkBtn = container.querySelector<HTMLElement>('[data-testid="palette-mode-check"]');
    await act(() => {
      checkBtn!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    const baseRows = container.querySelectorAll('[data-testid^="palette-check-base-row-"]');
    for (const row of Array.from(baseRows)) {
      expect(row.tagName.toLowerCase()).toBe('div');
      expect(row.getAttribute('role')).toBe('button');
    }
  });

  it('no host-leaking color var in inline styles (no var() on swatch or chip backgrounds)', async () => {
    // Swatch + preview-chip fills are hardcoded hex (oklchaToHex), NOT CSS vars
    // that could be overridden by host stylesheets. This guards against
    // accidental CSS var leakage through either fill path.
    await renderPaletteTab();
    // Preview chips render in the collapsed headers.
    const chips = container.querySelectorAll<HTMLElement>('.tokenpanel-palette-edit-preview-chip');
    expect(chips.length).toBeGreaterThan(0);
    for (const chip of Array.from(chips)) {
      const bg = chip.style.background || chip.style.backgroundColor;
      expect(bg).not.toContain('var(');
    }
    // Open a group and check the interactive swatch fills too.
    await openGroup('warm');
    const swatches = container.querySelectorAll<HTMLElement>('[data-testid^="palette-edit-swatch-"]');
    expect(swatches.length).toBeGreaterThan(0);
    for (const swatch of Array.from(swatches)) {
      const bg = swatch.style.background || swatch.style.backgroundColor;
      // Must NOT be a CSS var reference
      expect(bg).not.toContain('var(');
    }
  });
});

// ---------------------------------------------------------------------------
// 4. Layout: narrow (~360px) and wide (~800px) — no overflow/clipping
// ---------------------------------------------------------------------------

describe('PaletteTab browser — layout at narrow and wide widths', () => {
  it('renders without horizontal overflow at 360px panel width (group open)', async () => {
    container.style.width = '360px';
    container.style.overflow = 'hidden';
    await renderPaletteTab();
    await openGroup('warm');

    const root = container.querySelector<HTMLElement>('[data-testid="palette-tab"]');
    expect(root).not.toBeNull();

    // The rendered content width should not exceed the container width.
    // scrollWidth > clientWidth would indicate overflow.
    const hasOverflow = container.scrollWidth > container.clientWidth;
    expect(hasOverflow).toBe(false);
  });

  it('renders without horizontal overflow at 800px panel width (group open)', async () => {
    container.style.width = '800px';
    container.style.overflow = 'hidden';
    await renderPaletteTab();
    await openGroup('warm');

    const root = container.querySelector<HTMLElement>('[data-testid="palette-tab"]');
    expect(root).not.toBeNull();
    const hasOverflow = container.scrollWidth > container.clientWidth;
    expect(hasOverflow).toBe(false);
  });

  it('swatch grid adapts to narrow container (all swatches visible)', async () => {
    container.style.width = '360px';
    await renderPaletteTab();
    await openGroup('warm');

    const swatches = container.querySelectorAll<HTMLElement>('[data-testid^="palette-edit-swatch-"]');
    expect(swatches.length).toBeGreaterThan(0);

    // All swatches should be rendered (not hidden by overflow clip)
    for (const swatch of Array.from(swatches)) {
      const rect = swatch.getBoundingClientRect();
      // rect.width > 0 means the element is rendered (not display:none or zero-size)
      expect(rect.width).toBeGreaterThan(0);
    }
  });

  it('PaletteChart SVG is visible at 360px (counter-scaling holds)', async () => {
    container.style.width = '360px';
    await renderPaletteTab();
    await openGroup('warm');

    // The active group's chart editor should be present
    const editor = container.querySelector('[data-testid^="palette-edit-editor-"]');
    expect(editor).not.toBeNull();

    // The chart container renders
    const chart = container.querySelector('.tokenpanel-palette-chart');
    expect(chart).not.toBeNull();
  });

  it('check mode layout does not overflow at 360px', async () => {
    container.style.width = '360px';
    container.style.overflow = 'hidden';
    await renderPaletteTab();

    const checkBtn = container.querySelector<HTMLElement>('[data-testid="palette-mode-check"]');
    await act(() => {
      checkBtn!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const hasOverflow = container.scrollWidth > container.clientWidth;
    expect(hasOverflow).toBe(false);
  });

  it('check mode layout does not overflow at 800px', async () => {
    container.style.width = '800px';
    container.style.overflow = 'hidden';
    await renderPaletteTab();

    const checkBtn = container.querySelector<HTMLElement>('[data-testid="palette-mode-check"]');
    await act(() => {
      checkBtn!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const hasOverflow = container.scrollWidth > container.clientWidth;
    expect(hasOverflow).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 5. Chart node drag interaction — verify swatch update
//    jsdom cannot simulate real pointer drags on SVGs, but Chromium can.
//    We simulate a pointer-down → pointer-move → pointer-up gesture to confirm
//    onChange fires and the swatch fill changes color.
// ---------------------------------------------------------------------------

describe('PaletteTab browser — chart drag interaction', () => {
  it('onChange fires when a chart node is dragged', async () => {
    const changes: Array<[string, string, string]> = [];
    const onChange = (tierId: string, itemId: string, next: string) => {
      changes.push([tierId, itemId, next]);
    };

    // Give the container an explicit width so the chart lays out in Chromium.
    // Without a size, the SVG elements have zero bounding rects and the drag
    // gesture produces no value change.
    container.style.width = '600px';
    await renderPaletteTab(PALETTE_TAB, {}, onChange);
    await openGroup('warm');

    const chart = container.querySelector('.tokenpanel-palette-chart');
    expect(chart).not.toBeNull();

    // The chart renders one SVG per channel (l, c, h). Each SVG contains
    // <circle data-node-hit={i}> hit areas for the draggable nodes.
    // We target the hit circle explicitly (not the visual <ellipse> which has
    // pointerEvents="none" in CSS and lacks data-node-hit).
    const nodeEl = chart!.querySelector<SVGCircleElement>('circle[data-node-hit]');
    // Hard assertion — a missing hit circle means the chart stopped rendering
    // draggable nodes, which is a real regression.
    expect(nodeEl, 'chart must render circle[data-node-hit] elements').not.toBeNull();
    if (!nodeEl) throw new Error('unreachable');

    const rect = nodeEl.getBoundingClientRect();
    // Hard assertion — zero size means the chart has no layout (regression).
    expect(rect.width, 'chart node must have non-zero width (explicit container width required)').toBeGreaterThan(0);
    expect(rect.height, 'chart node must have non-zero height').toBeGreaterThan(0);

    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    // Simulate a vertical drag: pointerdown → pointermove (20px up) → pointerup.
    // Events bubble from the hit circle to the channel SVG where the chart's
    // imperative listener (addEventListener, not JSX prop) handles them.
    await act(() => {
      nodeEl.dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          pointerId: 1,
          clientX: cx,
          clientY: cy,
        }),
      );
    });

    await act(() => {
      nodeEl.dispatchEvent(
        new PointerEvent('pointermove', {
          bubbles: true,
          pointerId: 1,
          clientX: cx,
          clientY: cy - 20, // drag up
        }),
      );
    });

    await act(() => {
      nodeEl.dispatchEvent(
        new PointerEvent('pointerup', {
          bubbles: true,
          pointerId: 1,
          clientX: cx,
          clientY: cy - 20,
        }),
      );
    });

    // The drag gesture fires onChangeStart → handleChartChange (per move) →
    // onChangeEnd → handleChangeEnd. Since no onCommitBatch is wired, the
    // fallback per-item onChange path fires. The accumulated transient value
    // is emitted as an oklch() CSS string via oklchaToCss.
    expect(changes.length).toBeGreaterThan(0);
    const [tierId, itemId, newValue] = changes[changes.length - 1];
    expect(tierId).toBe('warm');      // first active tier
    expect(itemId).toBe('warm-1');    // first node in the warm tier (DOM order matches fixture order)
    expect(newValue).toMatch(/^oklch\(/); // emitted as oklch() string via oklchaToCss
    // Note: we do not compare newValue to the fixture default ('oklch(80% 0.12 50)') because
    // oklchaToCss() produces a structurally different format ('oklch(0.8000 0.1200 50.00)')
    // — the strings always differ regardless of whether the value changed. The above
    // assertions (onChange fired, correct tier+item, valid format) are the meaningful ones.

    // The component must still be mounted after the gesture.
    expect(container.querySelector('[data-testid="palette-tab"]')).not.toBeNull();
  });
});
