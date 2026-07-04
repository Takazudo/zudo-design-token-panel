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

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  act(() => {
    render(null, container);
  });
  document.body.removeChild(container);
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

  it('renders swatches for the warm group', async () => {
    await renderPaletteTab();
    const swatches = container.querySelectorAll('[data-testid^="palette-edit-swatch-warm"]');
    expect(swatches.length).toBe(2);
  });

  it('swatches have a background color set (hex fill from oklch)', async () => {
    await renderPaletteTab();
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

  it('swatch buttons are div[role="button"] not native button', async () => {
    await renderPaletteTab();
    const swatches = container.querySelectorAll('[data-testid^="palette-edit-swatch-"]');
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

  it('no host-leaking color var in inline styles (no var() on swatch backgrounds)', async () => {
    // Swatch fills are hardcoded hex (oklchaToHex), NOT CSS vars that could be
    // overridden by host stylesheets. This guards against accidental CSS var
    // leakage through the swatch fill path.
    await renderPaletteTab();
    const swatches = container.querySelectorAll<HTMLElement>('[data-testid^="palette-edit-swatch-"]');
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
  it('renders without horizontal overflow at 360px panel width', async () => {
    container.style.width = '360px';
    container.style.overflow = 'hidden';
    await renderPaletteTab();

    const root = container.querySelector<HTMLElement>('[data-testid="palette-tab"]');
    expect(root).not.toBeNull();

    // The rendered content width should not exceed the container width.
    // scrollWidth > clientWidth would indicate overflow.
    const hasOverflow = container.scrollWidth > container.clientWidth;
    expect(hasOverflow).toBe(false);
  });

  it('renders without horizontal overflow at 800px panel width', async () => {
    container.style.width = '800px';
    container.style.overflow = 'hidden';
    await renderPaletteTab();

    const root = container.querySelector<HTMLElement>('[data-testid="palette-tab"]');
    expect(root).not.toBeNull();
    const hasOverflow = container.scrollWidth > container.clientWidth;
    expect(hasOverflow).toBe(false);
  });

  it('swatch grid adapts to narrow container (all swatches visible)', async () => {
    container.style.width = '360px';
    await renderPaletteTab();

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
    // is emitted as an oklch() CSS string.
    expect(changes.length).toBeGreaterThan(0);
    const [tierId, , newValue] = changes[changes.length - 1];
    expect(tierId).toBe('warm'); // first active tier
    expect(newValue).toMatch(/^oklch\(/); // emitted as oklch() string via oklchaToCss
    // The drag moved the node, so the committed value differs from the initial default.
    expect(newValue).not.toBe(PALETTE_TAB.tiers[0].items[0].default);

    // The component must still be mounted after the gesture.
    expect(container.querySelector('[data-testid="palette-tab"]')).not.toBeNull();
  });
});
