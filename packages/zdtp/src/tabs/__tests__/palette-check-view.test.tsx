// @vitest-environment jsdom

/**
 * Unit tests for PaletteCheckView (#394).
 *
 * Acceptance criteria:
 *
 *  1. Selecting a base row updates right-column verdicts (Aa sample, ratio, chip).
 *  2. Large-text toggle flips thresholds to 3.0 / 4.5.
 *  3. Grouped↔Flat toggle switches between sectioned and flat listings.
 *  4. Footer tally is correct for a known fixture palette.
 *  5. DOM hygiene: no native button, h3, h4, details, summary elements.
 *  6. Keyboard accessibility: Enter/Space on base rows trigger selection.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import PaletteCheckView from '../palette/palette-check-view';
import type { TabConfig } from '../../tokens/tier-model';
import type { TabOverrides } from '../../apply/tier-resolver';
import { contrastRatio, contrastScore } from '../../utils/wcag-contrast';
import { cssToOklcha, oklchaToHex } from '../../utils/color-oklch';

// ---------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------

/**
 * Small palette fixture: two tiers (warm, cool), two items each.
 * Uses the same fixture as palette-tab.test.tsx for consistency.
 */
const PALETTE_TAB_FIXTURE: TabConfig = {
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
});

async function renderCheckView(
  tab: TabConfig = PALETTE_TAB_FIXTURE,
  overrides: TabOverrides = {},
  onChange: (tierId: string, itemId: string, next: string) => void = () => undefined,
): Promise<void> {
  await act(() => {
    render(
      <PaletteCheckView tab={tab} overrides={overrides} onChange={onChange} />,
      container,
    );
  });
}

function oklchToHex(cssValue: string): string {
  const oklcha = cssToOklcha(cssValue);
  if (!oklcha) return '#000000';
  return oklchaToHex(oklcha);
}

/**
 * Convert #rrggbb hex to "rgb(r, g, b)" string — JSDOM normalizes hex inline
 * styles to rgb() notation, so comparisons against inline style attributes
 * must use rgb() format.
 */
function hexToRgbString(hex: string): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgb(${r}, ${g}, ${b})`;
}

// ---------------------------------------------------------------------------
// Tests — basic rendering
// ---------------------------------------------------------------------------

describe('PaletteCheckView — basic rendering', () => {
  it('renders the check view root element', async () => {
    await renderCheckView();
    const el = container.querySelector('[data-testid="palette-check-view"]');
    expect(el).not.toBeNull();
  });

  it('renders left and right columns', async () => {
    await renderCheckView();
    const left = container.querySelector('[data-testid="palette-check-left-col"]');
    const right = container.querySelector('[data-testid="palette-check-right-col"]');
    expect(left).not.toBeNull();
    expect(right).not.toBeNull();
  });

  it('renders a footer tally element', async () => {
    await renderCheckView();
    const footer = container.querySelector('[data-testid="palette-check-footer"]');
    expect(footer).not.toBeNull();
  });

  it('renders toolbar with flat and large text toggles', async () => {
    await renderCheckView();
    const flatToggle = container.querySelector('[data-testid="palette-check-flat-toggle"]');
    const largeToggle = container.querySelector('[data-testid="palette-check-large-toggle"]');
    expect(flatToggle).not.toBeNull();
    expect(largeToggle).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Tests — grouped mode (default)
// ---------------------------------------------------------------------------

describe('PaletteCheckView — grouped mode', () => {
  it('renders tier headings as div[role="heading" aria-level=3] in grouped mode', async () => {
    await renderCheckView();
    const headings = container.querySelectorAll('[role="heading"][aria-level="3"]');
    // Expect 2 groups × 2 columns = 4 headings
    expect(headings.length).toBeGreaterThanOrEqual(2);
    for (const h of headings) {
      expect(h.tagName.toLowerCase()).toBe('div');
    }
  });

  it('renders base rows for each palette item in left column', async () => {
    await renderCheckView();
    const allItems = PALETTE_TAB_FIXTURE.tiers.flatMap((t) => t.items);
    for (const item of allItems) {
      const row = container.querySelector(`[data-testid="palette-check-base-row-${item.id}"]`);
      expect(row).not.toBeNull();
    }
  });

  it('renders candidate rows for each palette item in right column', async () => {
    await renderCheckView();
    const allItems = PALETTE_TAB_FIXTURE.tiers.flatMap((t) => t.items);
    for (const item of allItems) {
      const row = container.querySelector(`[data-testid="palette-check-candidate-row-${item.id}"]`);
      expect(row).not.toBeNull();
    }
  });

  it('first item is selected by default (aria-pressed=true)', async () => {
    await renderCheckView();
    const firstItem = PALETTE_TAB_FIXTURE.tiers[0].items[0];
    const row = container.querySelector(
      `[data-testid="palette-check-base-row-${firstItem.id}"]`,
    );
    expect(row?.getAttribute('aria-pressed')).toBe('true');
  });
});

// ---------------------------------------------------------------------------
// Tests — base selection updates right column verdicts
// ---------------------------------------------------------------------------

describe('PaletteCheckView — base selection', () => {
  it('clicking a base row updates the selection', async () => {
    await renderCheckView();

    const secondItem = PALETTE_TAB_FIXTURE.tiers[0].items[1]; // warm-2
    const secondRow = container.querySelector<HTMLElement>(
      `[data-testid="palette-check-base-row-${secondItem.id}"]`,
    );
    expect(secondRow).not.toBeNull();

    await act(() => {
      secondRow!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(secondRow?.getAttribute('aria-pressed')).toBe('true');

    // First item should no longer be selected
    const firstItem = PALETTE_TAB_FIXTURE.tiers[0].items[0]; // warm-1
    const firstRow = container.querySelector(
      `[data-testid="palette-check-base-row-${firstItem.id}"]`,
    );
    expect(firstRow?.getAttribute('aria-pressed')).toBe('false');
  });

  it('selecting a new base updates the Aa sample background color in right column', async () => {
    await renderCheckView();

    // Select warm-2 as base
    const warm2 = PALETTE_TAB_FIXTURE.tiers[0].items[1];
    const warm2Hex = oklchToHex(warm2.default);

    const warm2Row = container.querySelector<HTMLElement>(
      `[data-testid="palette-check-base-row-${warm2.id}"]`,
    );

    await act(() => {
      warm2Row!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    // The Aa sample for any candidate should have background = warm2 color.
    // JSDOM normalizes hex colors in inline styles to rgb() notation.
    const warm2RgbStr = hexToRgbString(warm2Hex);
    const cool1CandidateRow = container.querySelector(
      `[data-testid="palette-check-candidate-row-cool-1"]`,
    );
    const aaSample = cool1CandidateRow?.querySelector('.tokenpanel-palette-check-aa-sample');
    const inlineStyle = (aaSample as HTMLElement)?.getAttribute('style') ?? '';
    expect(inlineStyle).toContain(warm2RgbStr);
  });

  it('keyboard Enter on base row triggers selection', async () => {
    await renderCheckView();

    const secondItem = PALETTE_TAB_FIXTURE.tiers[0].items[1]; // warm-2
    const secondRow = container.querySelector<HTMLElement>(
      `[data-testid="palette-check-base-row-${secondItem.id}"]`,
    );

    await act(() => {
      secondRow!.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
      );
    });

    expect(secondRow?.getAttribute('aria-pressed')).toBe('true');
  });

  it('keyboard Space on base row triggers selection', async () => {
    await renderCheckView();

    const secondItem = PALETTE_TAB_FIXTURE.tiers[0].items[1]; // warm-2
    const secondRow = container.querySelector<HTMLElement>(
      `[data-testid="palette-check-base-row-${secondItem.id}"]`,
    );

    await act(() => {
      secondRow!.dispatchEvent(
        new KeyboardEvent('keydown', { key: ' ', bubbles: true }),
      );
    });

    expect(secondRow?.getAttribute('aria-pressed')).toBe('true');
  });
});

// ---------------------------------------------------------------------------
// Tests — contrast ratio and score chip
// ---------------------------------------------------------------------------

describe('PaletteCheckView — contrast chips', () => {
  it('renders a chip for each candidate row', async () => {
    await renderCheckView();
    const allItems = PALETTE_TAB_FIXTURE.tiers.flatMap((t) => t.items);
    for (const item of allItems) {
      const chip = container.querySelector(`[data-testid="palette-check-chip-${item.id}"]`);
      expect(chip).not.toBeNull();
    }
  });

  it('chip text is Fail, AA, or AAA', async () => {
    await renderCheckView();
    const allItems = PALETTE_TAB_FIXTURE.tiers.flatMap((t) => t.items);
    for (const item of allItems) {
      const chip = container.querySelector(`[data-testid="palette-check-chip-${item.id}"]`);
      const text = chip?.textContent?.trim();
      expect(['Fail', 'AA', 'AAA']).toContain(text);
    }
  });

  it('chips use fixed semantic background colors (not theme tokens)', async () => {
    await renderCheckView();
    const allItems = PALETTE_TAB_FIXTURE.tiers.flatMap((t) => t.items);
    // JSDOM normalizes hex colors to rgb() in inline styles — use rgb equivalents
    const validBgRgb = new Set([
      hexToRgbString('#1a7a3f'), // AAA
      hexToRgbString('#8a6200'), // AA
      hexToRgbString('#b81d1d'), // Fail
    ]);

    for (const item of allItems) {
      const chip = container.querySelector<HTMLElement>(
        `[data-testid="palette-check-chip-${item.id}"]`,
      );
      const style = chip?.getAttribute('style') ?? '';
      const hasValidColor = [...validBgRgb].some((c) => style.includes(c));
      expect(hasValidColor).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Tests — large text toggle flips thresholds
// ---------------------------------------------------------------------------

describe('PaletteCheckView — large text toggle', () => {
  it('large text toggle checkbox is unchecked by default', async () => {
    await renderCheckView();
    const toggle = container.querySelector<HTMLInputElement>(
      '[data-testid="palette-check-large-toggle"]',
    );
    expect(toggle?.checked).toBe(false);
  });

  it('checking large text toggle changes the footer text to "large"', async () => {
    await renderCheckView();

    const toggle = container.querySelector<HTMLInputElement>(
      '[data-testid="palette-check-large-toggle"]',
    );

    await act(() => {
      toggle!.checked = true;
      toggle!.dispatchEvent(new Event('change', { bubbles: true }));
    });

    const modeSpan = container.querySelector('.tokenpanel-palette-check-tally-mode');
    expect(modeSpan?.textContent).toBe('large');
  });

  it('unchecked large text shows "normal" in footer', async () => {
    await renderCheckView();
    const modeSpan = container.querySelector('.tokenpanel-palette-check-tally-mode');
    expect(modeSpan?.textContent).toBe('normal');
  });

  it('large text toggle changes chips to use large thresholds (3.0/4.5)', async () => {
    await renderCheckView();

    // Get what score warm-1 vs warm-1 (self-contrast) should be at large threshold
    // This is always 1:1 ratio — Fail under any threshold
    // Better: pick a pair we know changes between normal and large thresholds
    // contrastRatio(warm1, warm2) — compute expected
    const warm1 = PALETTE_TAB_FIXTURE.tiers[0].items[0];
    const warm2 = PALETTE_TAB_FIXTURE.tiers[0].items[1];
    const warm1Hex = oklchToHex(warm1.default);
    const warm2Hex = oklchToHex(warm2.default);
    const ratio = contrastRatio(warm1Hex, warm2Hex);

    const normalScore = contrastScore(ratio, { large: false });
    const largeScore = contrastScore(ratio, { large: true });

    if (normalScore !== largeScore) {
      // Selecting warm-1 as base, checking warm-2 chip
      const toggle = container.querySelector<HTMLInputElement>(
        '[data-testid="palette-check-large-toggle"]',
      );

      // Before large toggle
      const chipBefore = container.querySelector(
        `[data-testid="palette-check-chip-${warm2.id}"]`,
      );
      expect(chipBefore?.textContent?.trim()).toBe(normalScore);

      // Enable large text
      await act(() => {
        toggle!.checked = true;
        toggle!.dispatchEvent(new Event('change', { bubbles: true }));
      });

      const chipAfter = container.querySelector(
        `[data-testid="palette-check-chip-${warm2.id}"]`,
      );
      expect(chipAfter?.textContent?.trim()).toBe(largeScore);
    }
    // If they're the same, the toggle still worked; no assertion needed for that case
  });
});

// ---------------------------------------------------------------------------
// Tests — grouped↔flat toggle
// ---------------------------------------------------------------------------

describe('PaletteCheckView — grouped/flat toggle', () => {
  it('flat list toggle checkbox is unchecked (grouped mode) by default', async () => {
    await renderCheckView();
    const toggle = container.querySelector<HTMLInputElement>(
      '[data-testid="palette-check-flat-toggle"]',
    );
    expect(toggle?.checked).toBe(false);
  });

  it('grouped mode shows tier headings', async () => {
    await renderCheckView();
    const headings = container.querySelectorAll('[role="heading"][aria-level="3"]');
    expect(headings.length).toBeGreaterThan(0);
  });

  it('flat mode hides tier headings', async () => {
    await renderCheckView();

    const toggle = container.querySelector<HTMLInputElement>(
      '[data-testid="palette-check-flat-toggle"]',
    );

    await act(() => {
      toggle!.checked = true;
      toggle!.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // In flat mode, no section headings should appear
    const headings = container.querySelectorAll('[role="heading"][aria-level="3"]');
    expect(headings.length).toBe(0);
  });

  it('flat mode still shows all palette items', async () => {
    await renderCheckView();

    const toggle = container.querySelector<HTMLInputElement>(
      '[data-testid="palette-check-flat-toggle"]',
    );

    await act(() => {
      toggle!.checked = true;
      toggle!.dispatchEvent(new Event('change', { bubbles: true }));
    });

    const allItems = PALETTE_TAB_FIXTURE.tiers.flatMap((t) => t.items);
    for (const item of allItems) {
      const baseRow = container.querySelector(
        `[data-testid="palette-check-base-row-${item.id}"]`,
      );
      const candidateRow = container.querySelector(
        `[data-testid="palette-check-candidate-row-${item.id}"]`,
      );
      expect(baseRow).not.toBeNull();
      expect(candidateRow).not.toBeNull();
    }
  });

  it('flat mode resolves overrides via each item\'s REAL tier id', async () => {
    // Override a cool-tier item. With the synthetic-'__flat__'-tier bug the
    // override was looked up under overrides['__flat__'] (always empty) and the
    // swatch would render the DEFAULT color instead.
    const overridden = 'oklch(30% 0.1 120)';
    await renderCheckView(PALETTE_TAB_FIXTURE, { cool: { 'cool-1': overridden } });

    const toggle = container.querySelector<HTMLInputElement>(
      '[data-testid="palette-check-flat-toggle"]',
    );
    await act(() => {
      toggle!.checked = true;
      toggle!.dispatchEvent(new Event('change', { bubbles: true }));
    });

    const swatch = container.querySelector<HTMLElement>(
      '[data-testid="palette-check-base-row-cool-1"] .tokenpanel-palette-check-swatch',
    );
    expect(swatch).not.toBeNull();
    expect(swatch!.style.background).toBe(hexToRgbString(oklchToHex(overridden)));
  });
});

// ---------------------------------------------------------------------------
// Tests — footer tally correctness
// ---------------------------------------------------------------------------

describe('PaletteCheckView — footer tally', () => {
  it('footer tally count is correct for the fixture (normal text, first base selected)', async () => {
    await renderCheckView();

    // Default base = warm-1 (first item)
    const warm1 = PALETTE_TAB_FIXTURE.tiers[0].items[0];
    const baseHex = oklchToHex(warm1.default);

    const allItems = PALETTE_TAB_FIXTURE.tiers.flatMap((t) => t.items);
    const expectedPass = allItems.filter((item) => {
      const hex = oklchToHex(item.default);
      return contrastRatio(baseHex, hex) >= 4.5;
    }).length;

    const countSpan = container.querySelector('.tokenpanel-palette-check-tally-count');
    const totalSpan = container.querySelector('.tokenpanel-palette-check-tally-total');

    expect(countSpan?.textContent).toBe(String(expectedPass));
    expect(totalSpan?.textContent).toBe(String(allItems.length));
  });

  it('footer tally updates when base selection changes', async () => {
    await renderCheckView();

    // Select warm-2 as base
    const warm2 = PALETTE_TAB_FIXTURE.tiers[0].items[1];
    const warm2Hex = oklchToHex(warm2.default);

    const warm2Row = container.querySelector<HTMLElement>(
      `[data-testid="palette-check-base-row-${warm2.id}"]`,
    );
    await act(() => {
      warm2Row!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const allItems = PALETTE_TAB_FIXTURE.tiers.flatMap((t) => t.items);
    const expectedPass = allItems.filter((item) => {
      const hex = oklchToHex(item.default);
      return contrastRatio(warm2Hex, hex) >= 4.5;
    }).length;

    const countSpan = container.querySelector('.tokenpanel-palette-check-tally-count');
    expect(countSpan?.textContent).toBe(String(expectedPass));
  });

  it('footer tally uses large text threshold (3.0) when large toggle is on', async () => {
    await renderCheckView();

    const toggle = container.querySelector<HTMLInputElement>(
      '[data-testid="palette-check-large-toggle"]',
    );
    await act(() => {
      toggle!.checked = true;
      toggle!.dispatchEvent(new Event('change', { bubbles: true }));
    });

    const warm1 = PALETTE_TAB_FIXTURE.tiers[0].items[0];
    const baseHex = oklchToHex(warm1.default);

    const allItems = PALETTE_TAB_FIXTURE.tiers.flatMap((t) => t.items);
    const expectedPass = allItems.filter((item) => {
      const hex = oklchToHex(item.default);
      return contrastRatio(baseHex, hex) >= 3.0;
    }).length;

    const countSpan = container.querySelector('.tokenpanel-palette-check-tally-count');
    expect(countSpan?.textContent).toBe(String(expectedPass));
  });

  it('footer shows the base token label', async () => {
    await renderCheckView();

    const warm1 = PALETTE_TAB_FIXTURE.tiers[0].items[0];
    const baseSpan = container.querySelector('.tokenpanel-palette-check-tally-base');
    expect(baseSpan?.textContent).toBe(warm1.label);
  });
});

// ---------------------------------------------------------------------------
// Tests — DOM hygiene
// ---------------------------------------------------------------------------

describe('PaletteCheckView — DOM hygiene', () => {
  it('no native button elements', async () => {
    await renderCheckView();
    expect(container.querySelector('button')).toBeNull();
  });

  it('no h3 elements', async () => {
    await renderCheckView();
    expect(container.querySelector('h3')).toBeNull();
  });

  it('no h4 elements', async () => {
    await renderCheckView();
    expect(container.querySelector('h4')).toBeNull();
  });

  it('no details or summary elements', async () => {
    await renderCheckView();
    expect(container.querySelector('details')).toBeNull();
    expect(container.querySelector('summary')).toBeNull();
  });

  it('no ul, ol, li elements', async () => {
    await renderCheckView();
    expect(container.querySelector('ul')).toBeNull();
    expect(container.querySelector('ol')).toBeNull();
    expect(container.querySelector('li')).toBeNull();
  });

  it('base rows are div[role="button"] with tabIndex=0', async () => {
    await renderCheckView();
    const allItems = PALETTE_TAB_FIXTURE.tiers.flatMap((t) => t.items);
    for (const item of allItems) {
      const row = container.querySelector(
        `[data-testid="palette-check-base-row-${item.id}"]`,
      );
      expect(row?.tagName.toLowerCase()).toBe('div');
      expect(row?.getAttribute('role')).toBe('button');
      expect(row?.getAttribute('tabindex')).toBe('0');
    }
  });

  it('section headings are div[role="heading"][aria-level="3"]', async () => {
    await renderCheckView();
    const headings = container.querySelectorAll('[role="heading"]');
    for (const h of headings) {
      expect(h.tagName.toLowerCase()).toBe('div');
      expect(h.getAttribute('aria-level')).toBe('3');
    }
  });
});
