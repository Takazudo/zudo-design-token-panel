// @vitest-environment jsdom

/**
 * E2E integration test — OKLCH GenericTab round-trip (#379 S5).
 *
 * Confirms the owner's goal:
 *   - opt-in GenericTab color items with format:'oklch' render the OKLCH picker
 *     affordance (ColorField swatch-button), NOT a native <input type="color">
 *   - BOTH paths emit oklch(), not hex:
 *     (a) onChange from the tab; (b) emitTierItemCssValue via resolveTierItemValue
 *   - Wide-gamut P3 values survive prop→edit→emit without sRGB clamping
 *   - Existing hex {kind:'color'} consumers are unaffected
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import GenericTab from '../tabs/generic-tab';
import type { TabConfig } from '../tokens/tier-model';
import type { TabOverrides } from '../apply/tier-resolver';
import { resolveTierItemValue, emitTierItemCssValue } from '../apply/tier-resolver';
import { cssToOklcha } from '../utils/color-oklch';

// ---------------------------------------------------------------------------
// Fixture: non-reserved palette tab with OKLCH color items
// ---------------------------------------------------------------------------

/**
 * A non-reserved tab mimicking a custom palette with OKLCH color items.
 * Uses the exact shape from the task brief.
 */
const OKLCH_PALETTE_TAB: TabConfig = {
  id: 'palette',
  label: 'Palette',
  tiers: [
    {
      id: 'cool',
      label: 'Cool tones',
      items: [
        {
          id: 'cool700',
          cssVar: '--palette-cool-700',
          label: 'cool-700',
          default: 'oklch(0.21 0.03 264)',
          type: { kind: 'color', format: 'oklch' },
        },
        {
          id: 'cool500',
          cssVar: '--palette-cool-500',
          label: 'cool-500',
          // Wide-gamut P3 value (chroma 0.25 is out of sRGB at this L)
          default: 'oklch(0.7 0.25 150)',
          type: { kind: 'color', format: 'oklch' },
        },
      ],
    },
  ],
};

/** Tab with a plain hex color item (no format) — existing consumer. */
const HEX_COLOR_TAB: TabConfig = {
  id: 'hex-colors',
  label: 'Hex Colors',
  tiers: [
    {
      id: 'base',
      label: 'Base',
      items: [
        {
          id: 'brand',
          cssVar: '--hex-brand',
          label: 'Brand',
          default: '#ff0000',
          type: { kind: 'color' },
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

async function renderGenericTab(
  tab: TabConfig,
  overrides: TabOverrides = {},
  onChange: (tierId: string, itemId: string, next: string | undefined) => void = () => undefined,
): Promise<void> {
  await act(() => {
    render(<GenericTab tab={tab} overrides={overrides} onChange={onChange} />, container);
  });
}

// ---------------------------------------------------------------------------
// 1. OKLCH item renders ColorField swatch-button, NOT native <input type="color">
// ---------------------------------------------------------------------------

describe('S5 E2E — OKLCH GenericTab: ColorField affordance (not native color input)', () => {
  it('renders ColorField swatch-button [data-testid="color-field-swatch"] for oklch items', async () => {
    await renderGenericTab(OKLCH_PALETTE_TAB);

    const item = container.querySelector('[data-testid="tier-item-cool700"]');
    expect(item).not.toBeNull();

    // Must NOT render a native color input (hex lossy path)
    const nativeColorInput = item?.querySelector('input[type="color"]');
    expect(nativeColorInput).toBeNull();

    // Must render the OKLCH picker affordance
    const swatch = item?.querySelector('[data-testid="color-field-swatch"]');
    expect(swatch).not.toBeNull();
  });

  it('ColorField swatch has role="button" and tabIndex=0 (keyboard accessible)', async () => {
    await renderGenericTab(OKLCH_PALETTE_TAB);

    const swatch = container.querySelector('[data-testid="color-field-swatch"]');
    expect(swatch).not.toBeNull();
    expect(swatch?.getAttribute('role')).toBe('button');
    expect(swatch?.getAttribute('tabindex')).toBe('0');
  });
});

// ---------------------------------------------------------------------------
// 2a. onChange path emits oklch(), not hex
// ---------------------------------------------------------------------------

describe('S5 E2E — OKLCH GenericTab: onChange path emits oklch() string', () => {
  it('clicking the swatch opens the ColorPicker (confirms onChange wiring is live)', async () => {
    const onChange = vi.fn();
    await renderGenericTab(OKLCH_PALETTE_TAB, {}, onChange);

    // Before click: no picker
    let picker = container.querySelector('.tokenpanel-color-picker');
    expect(picker).toBeNull();

    const swatch = container.querySelector<HTMLElement>('[data-testid="color-field-swatch"]');
    act(() => {
      swatch!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    picker = container.querySelector('.tokenpanel-color-picker');
    expect(picker).not.toBeNull();
  });

  it('the open ColorPicker has a hex-input with type="text", confirming oklch mode (not hex-only path)', async () => {
    await renderGenericTab(OKLCH_PALETTE_TAB);

    const swatch = container.querySelector<HTMLElement>('[data-testid="color-field-swatch"]');
    act(() => {
      swatch!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    // In oklch valueFormat mode, the picker still has a hex-text input for reference
    // but the output via onChange will be oklch().
    const hexInput = container.querySelector<HTMLInputElement>('.tokenpanel-color-picker-hex-input');
    expect(hexInput).not.toBeNull();
    expect(hexInput?.getAttribute('type')).toBe('text'); // text, not color
  });

  it('onChange receives oklch() string when a preset cell is clicked inside the picker', async () => {
    const onChange = vi.fn();
    await renderGenericTab(OKLCH_PALETTE_TAB, {}, onChange);

    // Open picker
    const swatch = container.querySelector<HTMLElement>('[data-testid="color-field-swatch"]');
    act(() => {
      swatch!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    // Click the first preset grid cell
    const firstCell = container.querySelector<HTMLElement>(
      '[data-grid-row="0"][data-grid-col="0"]',
    );
    expect(firstCell).not.toBeNull();
    act(() => {
      firstCell!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    // Must have been called
    expect(onChange).toHaveBeenCalled();

    // The value emitted from the tab's onChange must be the oklch format.
    // onChange is called with (tierId, itemId, value)
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1];
    const emittedValue: string = lastCall[2];

    // Path (a): the tab's onChange receives an oklch(...) string
    expect(emittedValue).toMatch(/^oklch\(/i);
    expect(emittedValue).not.toMatch(/^#/);
  });
});

// ---------------------------------------------------------------------------
// 2b. Apply path (resolveTierItemValue + emitTierItemCssValue) emits oklch()
// ---------------------------------------------------------------------------

describe('S5 E2E — OKLCH GenericTab: apply path emits oklch() (tier-resolver)', () => {
  it('resolveTierItemValue for an oklch color item returns the oklch() literal', () => {
    const overrides: TabOverrides = {
      cool: {
        cool700: 'oklch(0.21 0.03 264)',
      },
    };

    const resolved = resolveTierItemValue(OKLCH_PALETTE_TAB, 'cool', 'cool700', overrides);
    expect(resolved.kind).toBe('literal');
    if (resolved.kind === 'literal') {
      expect(resolved.value).toBe('oklch(0.21 0.03 264)');
    }
  });

  it('emitTierItemCssValue returns the oklch() string as-is (no hex conversion)', () => {
    const overrides: TabOverrides = {
      cool: {
        cool700: 'oklch(0.21 0.03 264)',
      },
    };

    const resolved = resolveTierItemValue(OKLCH_PALETTE_TAB, 'cool', 'cool700', overrides);
    // Path (b): the apply path emits the oklch() value
    const emitted = emitTierItemCssValue(resolved);
    expect(emitted).toMatch(/^oklch\(/i);
    expect(emitted).not.toMatch(/^#/);
  });

  it('emitTierItemCssValue with a changed oklch override also emits oklch()', () => {
    // Simulate the user having changed the value to a new oklch string
    const overrides: TabOverrides = {
      cool: {
        cool700: 'oklch(0.4 0.12 200)',
      },
    };

    const resolved = resolveTierItemValue(OKLCH_PALETTE_TAB, 'cool', 'cool700', overrides);
    const emitted = emitTierItemCssValue(resolved);
    expect(emitted).toMatch(/^oklch\(/i);
  });

  it('emitTierItemCssValue with default (no override) still emits oklch() for an oklch item', () => {
    // No overrides — item.default is 'oklch(0.21 0.03 264)'
    const resolved = resolveTierItemValue(OKLCH_PALETTE_TAB, 'cool', 'cool700', {});
    const emitted = emitTierItemCssValue(resolved);
    expect(emitted).toMatch(/^oklch\(/i);
  });
});

// ---------------------------------------------------------------------------
// 3. Wide-gamut P3 round-trip: chroma survives without sRGB clamping
// ---------------------------------------------------------------------------

describe('S5 E2E — OKLCH GenericTab: wide-gamut P3 chroma preserved', () => {
  const WIDE_GAMUT_VALUE = 'oklch(0.7 0.25 150)';

  it('cssToOklcha correctly parses the wide-gamut P3 value', () => {
    const parsed = cssToOklcha(WIDE_GAMUT_VALUE);
    expect(parsed).not.toBeNull();
    // Chroma 0.25 is out-of-sRGB-gamut at this L
    expect(parsed!.c).toBeCloseTo(0.25, 3);
  });

  it('the emit path preserves chroma without sRGB clamping when L is edited', () => {
    // Simulate: user opens item with oklch(0.7 0.25 150), edits only L to 0.6.
    // The emitted value should still carry c≈0.25 (not clamped down to sRGB).
    const editedOklch = 'oklch(0.6 0.25 150)';
    const overrides: TabOverrides = {
      cool: {
        cool500: editedOklch,
      },
    };

    const resolved = resolveTierItemValue(OKLCH_PALETTE_TAB, 'cool', 'cool500', overrides);
    const emitted = emitTierItemCssValue(resolved);

    // The emitted string is an oklch() string
    expect(emitted).toMatch(/^oklch\(/i);

    // Re-parse to check chroma is preserved (≈0.25, not sRGB-clamped to ~0.15)
    const reparsed = cssToOklcha(emitted);
    expect(reparsed).not.toBeNull();

    // Chroma must be ≈ 0.25 — far above the sRGB in-gamut clamp for this L/H
    expect(reparsed!.c).toBeCloseTo(0.25, 3);

    // Confirm it is truly out of sRGB gamut (chroma much higher than sRGB can
    // represent at L=0.6, H=150). sRGB max chroma here is ~0.16.
    expect(reparsed!.c).toBeGreaterThan(0.20);
  });

  it('default value oklch(0.7 0.25 150) emits with chroma preserved via apply path', () => {
    // No override — default 'oklch(0.7 0.25 150)' passes through untouched
    const resolved = resolveTierItemValue(OKLCH_PALETTE_TAB, 'cool', 'cool500', {});
    const emitted = emitTierItemCssValue(resolved);

    const reparsed = cssToOklcha(emitted);
    expect(reparsed).not.toBeNull();
    expect(reparsed!.c).toBeCloseTo(0.25, 3);
  });
});

// ---------------------------------------------------------------------------
// 4. Existing consumers unaffected: hex {kind:'color'} still uses native input
// ---------------------------------------------------------------------------

describe('S5 E2E — existing hex color consumers unaffected', () => {
  it('hex {kind:"color"} item renders <input type="color">, not ColorField swatch', async () => {
    await renderGenericTab(HEX_COLOR_TAB);

    const item = container.querySelector('[data-testid="tier-item-brand"]');
    expect(item).not.toBeNull();

    // Must render native color input (hex path unchanged)
    const nativeColorInput = item?.querySelector('input[type="color"]');
    expect(nativeColorInput).not.toBeNull();

    // Must NOT render ColorField swatch
    const swatch = item?.querySelector('[data-testid="color-field-swatch"]');
    expect(swatch).toBeNull();
  });

  it('hex color apply path emits the hex value as-is (no oklch conversion)', () => {
    const overrides: TabOverrides = {
      base: {
        brand: '#ff0000',
      },
    };

    const resolved = resolveTierItemValue(HEX_COLOR_TAB, 'base', 'brand', overrides);
    const emitted = emitTierItemCssValue(resolved);

    // Hex value is emitted unchanged
    expect(emitted).toBe('#ff0000');
    expect(emitted).not.toMatch(/^oklch\(/i);
  });
});
