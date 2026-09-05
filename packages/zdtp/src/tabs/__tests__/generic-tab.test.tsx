// @vitest-environment jsdom

/**
 * Unit tests for GenericTab.
 *
 * Acceptance criteria:
 *
 *  1. Tier section headings are rendered.
 *  2. Items render the appropriate editor by kind (length/number → number input
 *     only (NO range slider), select → <select>, text → text input, color →
 *     color input).
 *  3. onChange fires with the correct (tierId, itemId, value) triple for each
 *     editor type.
 *  4. Items in a tier with referencesTier render the TierRefSelector placeholder
 *     (not a direct editor) — will be updated to assert the real TierRefSelector
 *     after W3-S2 merges.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import GenericTab from '../generic-tab';
import GenericItemEditor from '../_generic-item-editor';
import type { TabConfig, TierItem } from '../../tokens/tier-model';
import {
  emitTierItemCssValue,
  resolveTierItemValue,
  type TabOverrides,
} from '../../apply/tier-resolver';
import { TooltipProvider } from '../../controls/tooltip';

// ---------------------------------------------------------------------------
// Synthetic TabConfig fixtures
// ---------------------------------------------------------------------------

/** A two-tier easing tab: tier 1 literal (text), tier 2 references tier 1. */
const EASING_TAB: TabConfig = {
  id: 'easing',
  label: 'Easing',
  tiers: [
    {
      id: 'raw',
      label: 'Raw curves',
      items: [
        {
          id: 'ease-in',
          cssVar: '--test-easing-ease-in',
          label: 'Ease in',
          default: 'cubic-bezier(0.42, 0, 1, 1)',
          type: { kind: 'text' },
        },
        {
          id: 'ease-out',
          cssVar: '--test-easing-ease-out',
          label: 'Ease out',
          default: 'cubic-bezier(0, 0, 0.58, 1)',
          type: { kind: 'text' },
        },
      ],
    },
    {
      id: 'semantic',
      label: 'Semantic roles',
      referencesTier: 'raw',
      items: [
        {
          id: 'tab-open',
          cssVar: '--test-easing-tab-open',
          label: 'Tab open',
          default: 'ease-out',
          type: { kind: 'text' },
        },
      ],
    },
  ],
};

/** A tab with one tier containing diverse item kinds. */
const MIXED_KINDS_TAB: TabConfig = {
  id: 'mixed',
  label: 'Mixed',
  tiers: [
    {
      id: 'values',
      label: 'Values',
      items: [
        {
          id: 'length-item',
          cssVar: '--test-length',
          label: 'Length',
          default: '1rem',
          type: { kind: 'length', step: 0.25, unit: 'rem' },
        },
        {
          id: 'number-item',
          cssVar: '--test-number',
          label: 'Number',
          default: '1.5',
          type: { kind: 'number', step: 0.5 },
        },
        {
          id: 'select-item',
          cssVar: '--test-select',
          label: 'Weight',
          default: '400',
          type: { kind: 'select', options: ['300', '400', '600', '700'] as const },
        },
        {
          id: 'text-item',
          cssVar: '--test-text',
          label: 'Family',
          default: 'system-ui, sans-serif',
          type: { kind: 'text' },
        },
        {
          id: 'color-item',
          cssVar: '--test-color',
          label: 'Color',
          default: '#ff0000',
          type: { kind: 'color' },
        },
        {
          id: 'cursor-item',
          cssVar: '--test-cursor',
          label: 'Cursor',
          default: 'pointer',
          type: { kind: 'cursor' },
        },
        {
          id: 'content-item',
          cssVar: '--test-content',
          label: 'Content',
          default: '""',
          type: { kind: 'content' },
        },
        {
          id: 'mask-image-item',
          cssVar: '--test-mask-image',
          label: 'Mask Image',
          default: 'none',
          type: { kind: 'mask-image' },
        },
      ],
    },
  ],
};

/** A tab exercising the click-to-cycle unit suffix (#519). */
const CYCLABLE_UNIT_TAB: TabConfig = {
  id: 'cyclable',
  label: 'Cyclable',
  tiers: [
    {
      id: 'values',
      label: 'Values',
      items: [
        {
          id: 'cyclable-item',
          cssVar: '--test-cyclable',
          label: 'Cyclable',
          default: '1rem',
          type: { kind: 'length', step: 0.25, unit: 'rem', units: ['rem', 'em', 'px'] },
        },
        {
          id: 'diverged-item',
          cssVar: '--test-diverged',
          label: 'Diverged',
          // Stored suffix ("vw") diverges from the declared `units` list —
          // e.g. imported data or a manifest change (#519 divergence case).
          default: '2vw',
          type: { kind: 'length', step: 0.25, unit: 'rem', units: ['rem', 'em', 'px'] },
        },
        {
          id: 'readonly-cyclable-item',
          cssVar: '--test-readonly-cyclable',
          label: 'Readonly Cyclable',
          default: '1rem',
          type: { kind: 'length', step: 0.25, unit: 'rem', units: ['rem', 'em', 'px'] },
          readonly: true,
        },
        {
          id: 'duration-item',
          cssVar: '--test-duration',
          label: 'Duration',
          default: '150ms',
          // Reuses the shared `length` kind for a ms duration — NOT opted
          // into unit cycling (`units` omitted): cycling ms into rem/em/px
          // would emit invalid CSS.
          type: { kind: 'length', step: 10, unit: 'ms' },
        },
        {
          id: 'unitless-item',
          cssVar: '--test-unitless',
          label: 'Unitless',
          default: '1.5',
          type: { kind: 'length', step: 0.05, unit: '' },
        },
        {
          id: 'unitless-cyclable-item',
          cssVar: '--test-unitless-cyclable',
          label: 'Unitless Cyclable',
          // No suffix at all — a degenerate case for an opted-in row (#519
          // review finding #3): must fall back to units[0] for display
          // rather than rendering an empty, zero-width interactive button.
          default: '1.5',
          type: { kind: 'length', step: 0.05, unit: 'rem', units: ['rem', 'em', 'px'] },
        },
        {
          id: 'leading-dot-item',
          cssVar: '--test-leading-dot',
          label: 'Leading Dot',
          // Leading-dot decimal ("valid CSS, .5px" style) whose suffix
          // diverges from the declared unit — regression case for #519
          // review finding #2 (parse/emit must agree on this shape).
          default: '.5px',
          type: { kind: 'length', step: 0.05, unit: 'rem', units: ['rem', 'em', 'px'] },
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
  // Unmount the Preact tree to clean up portals (e.g. TooltipProvider's
  // .tokenpanel-tooltip div rendered into document.body).
  act(() => {
    render(null, container);
  });
  document.body.removeChild(container);
});

async function renderGenericTab(
  tab: TabConfig,
  overrides: TabOverrides = {},
  onChange: (tierId: string, itemId: string, next: string | undefined) => void = () => undefined,
  withTooltipProvider = false,
): Promise<void> {
  await act(() => {
    const content = <GenericTab tab={tab} overrides={overrides} onChange={onChange} />;
    render(
      withTooltipProvider ? <TooltipProvider>{content}</TooltipProvider> : content,
      container,
    );
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GenericTab — tier headings', () => {
  it('renders a section heading for each tier', async () => {
    await renderGenericTab(EASING_TAB);

    const headings = container.querySelectorAll('.tokenpanel-tab-section-heading');
    const texts = Array.from(headings).map((h) => h.textContent?.trim());
    expect(texts).toContain('Raw curves');
    expect(texts).toContain('Semantic roles');
  });

  it('renders the correct number of tier sections', async () => {
    await renderGenericTab(EASING_TAB);

    const sections = container.querySelectorAll('[data-testid^="tier-section-"]');
    expect(sections.length).toBe(2);
  });
});

describe('GenericTab — item editors by kind', () => {
  it('renders a number input (NO slider) for length items', async () => {
    await renderGenericTab(MIXED_KINDS_TAB);

    const item = container.querySelector('[data-testid="tier-item-length-item"]');
    expect(item).not.toBeNull();
    // Slider removed — S2: range slider not useful without meaningful min/max
    const slider = item?.querySelector('input[type="range"]');
    expect(slider).toBeNull();
    const numInput = item?.querySelector('input[type="text"]');
    expect(numInput).not.toBeNull();
  });

  it('renders a number input (NO slider) for number items', async () => {
    await renderGenericTab(MIXED_KINDS_TAB);

    const item = container.querySelector('[data-testid="tier-item-number-item"]');
    expect(item).not.toBeNull();
    // Slider removed — S2: range slider not useful without meaningful min/max
    const slider = item?.querySelector('input[type="range"]');
    expect(slider).toBeNull();
    const numInput = item?.querySelector('input[type="text"]');
    expect(numInput).not.toBeNull();
  });

  it('renders a <select> for select items', async () => {
    await renderGenericTab(MIXED_KINDS_TAB);

    const item = container.querySelector('[data-testid="tier-item-select-item"]');
    expect(item).not.toBeNull();
    const select = item?.querySelector('select');
    expect(select).not.toBeNull();
  });

  it('renders the correct options for a select item', async () => {
    await renderGenericTab(MIXED_KINDS_TAB);

    const select = container.querySelector<HTMLSelectElement>(
      '[data-testid="tier-item-select-item"] select',
    );
    expect(select).not.toBeNull();
    const optionValues = Array.from(select!.options).map((o) => o.value);
    expect(optionValues).toEqual(['300', '400', '600', '700']);
  });

  it('renders a text input for text items', async () => {
    await renderGenericTab(MIXED_KINDS_TAB);

    const item = container.querySelector('[data-testid="tier-item-text-item"]');
    expect(item).not.toBeNull();
    const input = item?.querySelector('input[type="text"]');
    expect(input).not.toBeNull();
  });

  it('renders a color input for color items', async () => {
    await renderGenericTab(MIXED_KINDS_TAB);

    const item = container.querySelector('[data-testid="tier-item-color-item"]');
    expect(item).not.toBeNull();
    const colorInput = item?.querySelector('input[type="color"]');
    expect(colorInput).not.toBeNull();
  });

  it('renders a text input for cursor items', async () => {
    await renderGenericTab(MIXED_KINDS_TAB);

    const item = container.querySelector('[data-testid="tier-item-cursor-item"]');
    expect(item).not.toBeNull();
    const input = item?.querySelector('input[type="text"]');
    expect(input).not.toBeNull();
    expect(input?.getAttribute('aria-label')).toBe('--test-cursor value');
  });

  it('renders a text input for content items', async () => {
    await renderGenericTab(MIXED_KINDS_TAB);

    const item = container.querySelector('[data-testid="tier-item-content-item"]');
    expect(item).not.toBeNull();
    const input = item?.querySelector('input[type="text"]');
    expect(input).not.toBeNull();
    expect(input?.getAttribute('aria-label')).toBe('--test-content value');
  });

  it('renders a text input for mask-image items', async () => {
    await renderGenericTab(MIXED_KINDS_TAB);

    const item = container.querySelector('[data-testid="tier-item-mask-image-item"]');
    expect(item).not.toBeNull();
    const input = item?.querySelector('input[type="text"]');
    expect(input).not.toBeNull();
    expect(input?.getAttribute('aria-label')).toBe('--test-mask-image value');
  });
});

describe('GenericTab — default values', () => {
  it('shows TierItem.default when no override is present', async () => {
    await renderGenericTab(EASING_TAB, {});

    // Text input for "ease-in" should start at the default value
    const item = container.querySelector<HTMLInputElement>(
      '[data-testid="tier-item-ease-in"] input[type="text"]',
    );
    expect(item).not.toBeNull();
    expect(item!.value).toBe('cubic-bezier(0.42, 0, 1, 1)');
  });

  it('shows override value when one is present', async () => {
    const overrides: TabOverrides = {
      raw: { 'ease-in': 'linear' },
    };
    await renderGenericTab(EASING_TAB, overrides);

    const item = container.querySelector<HTMLInputElement>(
      '[data-testid="tier-item-ease-in"] input[type="text"]',
    );
    expect(item).not.toBeNull();
    expect(item!.value).toBe('linear');
  });
});

describe('GenericTab — onChange callbacks', () => {
  it('renders text input for text items — aria-label matches item cssVar', async () => {
    // Verifies the input is present and correctly labeled for accessibility.
    // Full onChange wiring is verified at the integration level (panel.tsx test).
    // jsdom's native event dispatch does not trigger Preact's synthetic onChange,
    // so we assert element presence + attributes rather than event simulation.
    const onChange = vi.fn();
    await renderGenericTab(EASING_TAB, {}, onChange);

    const input = container.querySelector<HTMLInputElement>(
      '[data-testid="tier-item-ease-in"] input[type="text"]',
    );
    expect(input).not.toBeNull();
    expect(input!.getAttribute('aria-label')).toBe('--test-easing-ease-in value');
  });

  it('fires onChange through handleItemChange for a select', async () => {
    // This test verifies the component renders without throwing for the
    // select kind and that aria-label is correct for accessibility.
    const onChange = vi.fn();
    await renderGenericTab(MIXED_KINDS_TAB, {}, onChange);

    const select = container.querySelector<HTMLSelectElement>(
      '[data-testid="tier-item-select-item"] select',
    );
    expect(select).not.toBeNull();
    expect(select!.getAttribute('aria-label')).toBe('--test-select value');
  });

  it('fires onChange for color input — correct aria-label', async () => {
    const onChange = vi.fn();
    await renderGenericTab(MIXED_KINDS_TAB, {}, onChange);

    const colorInput = container.querySelector<HTMLInputElement>(
      '[data-testid="tier-item-color-item"] input[type="color"]',
    );
    expect(colorInput).not.toBeNull();
    expect(colorInput!.getAttribute('aria-label')).toBe('--test-color value');
  });
});

describe('GenericTab — reference tier renders TierRefSelector placeholder', () => {
  it('renders tier-ref-row for items in a tier with referencesTier', async () => {
    await renderGenericTab(EASING_TAB);

    // The semantic tier has referencesTier: 'raw' — items should render the
    // placeholder TierRefSelector (data-testid="tier-ref-row-{id}").
    const refRow = container.querySelector('[data-testid="tier-ref-row-tab-open"]');
    expect(refRow).not.toBeNull();
  });

  it('does NOT render a direct editor for a reference-tier item', async () => {
    await renderGenericTab(EASING_TAB);

    // The semantic tier items should NOT have data-testid="tier-item-{id}"
    // (which is the literal-tier editor marker) since they use the ref selector.
    const directEditor = container.querySelector('[data-testid="tier-item-tab-open"]');
    expect(directEditor).toBeNull();
  });
});

describe('GenericTab — data-testid wrapper', () => {
  it('renders with the correct wrapper data-testid', async () => {
    await renderGenericTab(EASING_TAB);

    const wrapper = container.querySelector('[data-testid="generic-tab-easing"]');
    expect(wrapper).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Regression: mid-keystroke clamping in _generic-item-editor (#313)
//
// The same "2 → 22 snaps to 6" bug existed in _generic-item-editor's
// length/number branch. These tests confirm the fix is in place.
//
// Event simulation uses native input/focusout events through Preact compat:
//  - Object.defineProperty + `new Event('input', { bubbles: true })` for onChange
//  - `new FocusEvent('focusout', { bubbles: true })` for onBlur
//    (Preact-compat maps `onBlur` → `onfocusout`)
// ---------------------------------------------------------------------------

/** Simulates a native input event on an HTMLInputElement (Preact onChange trigger). */
function simulateInputEvent(input: HTMLInputElement, newValue: string): void {
  act(() => {
    Object.defineProperty(input, 'value', { value: newValue, writable: true, configurable: true });
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

/** Simulates blur via focusout (Preact maps onBlur → onfocusout). */
function simulateFocusout(input: HTMLInputElement): void {
  act(() => {
    input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
  });
}

describe('GenericItemEditor — free numeric input, no clamping (#326)', () => {
  it('calls onChange immediately when typing any parseable length value', async () => {
    const onChange = vi.fn();
    await renderGenericTab(MIXED_KINDS_TAB, {}, onChange);

    const input = container.querySelector<HTMLInputElement>(
      '[data-testid="tier-item-length-item"] input[type="text"]',
    )!;
    expect(input).not.toBeNull();

    // "22" is parseable — must commit even if it would have exceeded the old max
    simulateInputEvent(input, '22');

    const lengthCalls = onChange.mock.calls.filter(([, itemId]) => itemId === 'length-item');
    expect(lengthCalls).toHaveLength(1);
    expect(lengthCalls[0]).toEqual(['values', 'length-item', '22rem']);
  });

  it('keeps draft "22" visible after typing (no snapping)', async () => {
    await renderGenericTab(MIXED_KINDS_TAB, {});

    const input = container.querySelector<HTMLInputElement>(
      '[data-testid="tier-item-length-item"] input[type="text"]',
    )!;

    simulateInputEvent(input, '22');

    expect(input.value).toBe('22');
  });

  it('does NOT apply --invalid class for any numeric input', async () => {
    await renderGenericTab(MIXED_KINDS_TAB, {});

    const input = container.querySelector<HTMLInputElement>(
      '[data-testid="tier-item-length-item"] input[type="text"]',
    )!;

    simulateInputEvent(input, '22');

    expect(input.classList.contains('tokenpanel-row-number-input--invalid')).toBe(false);
  });

  it('does NOT set aria-invalid for any numeric input', async () => {
    await renderGenericTab(MIXED_KINDS_TAB, {});

    const input = container.querySelector<HTMLInputElement>(
      '[data-testid="tier-item-length-item"] input[type="text"]',
    )!;

    simulateInputEvent(input, '22');

    expect(input.getAttribute('aria-invalid')).toBeNull();
  });

  it('does NOT clamp on blur — large value was already committed on keystroke', async () => {
    const onChange = vi.fn();
    await renderGenericTab(MIXED_KINDS_TAB, {}, onChange);

    const input = container.querySelector<HTMLInputElement>(
      '[data-testid="tier-item-length-item"] input[type="text"]',
    )!;

    simulateInputEvent(input, '22');
    onChange.mockClear(); // clear the keystroke commit

    simulateFocusout(input);

    // On blur, parseable value was already committed — no additional (clamped) commit
    const afterBlur = onChange.mock.calls.filter(([, itemId]) => itemId === 'length-item');
    expect(afterBlur).toHaveLength(0);
    expect(input.value).toBe('22');
  });

  it('calls onChange immediately for parseable number item values', async () => {
    const onChange = vi.fn();
    await renderGenericTab(MIXED_KINDS_TAB, {}, onChange);

    const input = container.querySelector<HTMLInputElement>(
      '[data-testid="tier-item-number-item"] input[type="text"]',
    )!;

    simulateInputEvent(input, '5');

    const numberCalls = onChange.mock.calls.filter(([, itemId]) => itemId === 'number-item');
    expect(numberCalls).toHaveLength(1);
    expect(numberCalls[0]).toEqual(['values', 'number-item', '5']);
  });
});

// ---------------------------------------------------------------------------
// Rich tooltip on token-name labels
// ---------------------------------------------------------------------------

describe('GenericTab — rich tooltip on token-name labels', () => {
  it('renders a tokenpanel-tooltip element when wrapped in TooltipProvider', async () => {
    await renderGenericTab(EASING_TAB, {}, () => undefined, true);

    const tooltip = document.querySelector('.tokenpanel-tooltip');
    expect(tooltip).not.toBeNull();
  });

  it('tooltip starts hidden (data-show=false)', async () => {
    await renderGenericTab(EASING_TAB, {}, () => undefined, true);

    const tooltip = document.querySelector('.tokenpanel-tooltip');
    expect(tooltip?.getAttribute('data-show')).toBe('false');
  });

  it('mouseenter on label shows tooltip with the full cssVar text', async () => {
    await renderGenericTab(EASING_TAB, {}, () => undefined, true);

    // Get the label for the first item in the literal tier (raw → ease-in)
    const label = container.querySelector('.tokenpanel-row-label') as HTMLElement;
    expect(label).not.toBeNull();

    act(() => {
      label.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    });

    const tooltip = document.querySelector('.tokenpanel-tooltip');
    expect(tooltip?.getAttribute('data-show')).toBe('true');
    // Tooltip text should be the full cssVar, not truncated
    expect(tooltip?.textContent).toBe('--test-easing-ease-in');
  });

  it('mouseleave on label hides the tooltip', async () => {
    await renderGenericTab(EASING_TAB, {}, () => undefined, true);

    const label = container.querySelector('.tokenpanel-row-label') as HTMLElement;
    act(() => {
      label.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    });
    act(() => {
      label.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
    });

    const tooltip = document.querySelector('.tokenpanel-tooltip');
    expect(tooltip?.getAttribute('data-show')).toBe('false');
  });

  it('label has no native title attribute', async () => {
    await renderGenericTab(EASING_TAB, {}, () => undefined, true);

    const label = container.querySelector('.tokenpanel-row-label') as HTMLElement;
    expect(label.hasAttribute('title')).toBe(false);
  });

  it('ref-tier row label also has rich tooltip with correct cssVar', async () => {
    await renderGenericTab(EASING_TAB, {}, () => undefined, true);

    // The semantic tier has referencesTier — its label should also use TokenLabel
    const refRow = container.querySelector('[data-testid="tier-ref-row-tab-open"]') as HTMLElement;
    expect(refRow).not.toBeNull();
    const label = refRow.querySelector('.tokenpanel-row-label') as HTMLElement;
    expect(label).not.toBeNull();

    act(() => {
      label.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    });

    const tooltip = document.querySelector('.tokenpanel-tooltip');
    expect(tooltip?.getAttribute('data-show')).toBe('true');
    expect(tooltip?.textContent).toBe('--test-easing-tab-open');
  });
});

// ---------------------------------------------------------------------------
// S4 acceptance criteria: oklch color items route through ColorField (#378)
// ---------------------------------------------------------------------------

/** Tab with an oklch color item. */
const OKLCH_COLOR_TAB: TabConfig = {
  id: 'theme',
  label: 'Theme',
  tiers: [
    {
      id: 'base',
      label: 'Base colors',
      items: [
        {
          id: 'brand',
          cssVar: '--test-brand',
          label: 'Brand',
          default: 'oklch(60% 0.2 240)',
          type: { kind: 'color', format: 'oklch' },
        },
      ],
    },
  ],
};

/** Tab with a readonly oklch color item. */
const READONLY_OKLCH_COLOR_TAB: TabConfig = {
  id: 'theme-ro',
  label: 'Theme RO',
  tiers: [
    {
      id: 'base',
      label: 'Base colors',
      items: [
        {
          id: 'brand-ro',
          cssVar: '--test-brand-ro',
          label: 'Brand RO',
          default: 'oklch(60% 0.2 240)',
          type: { kind: 'color', format: 'oklch' },
          readonly: true,
        },
      ],
    },
  ],
};

describe('GenericTab — oklch color items use ColorField (S4 #378)', () => {
  it('renders ColorField swatch-button (not native <input type="color">) for oklch color items', async () => {
    await renderGenericTab(OKLCH_COLOR_TAB);

    const item = container.querySelector('[data-testid="tier-item-brand"]');
    expect(item).not.toBeNull();

    // Must NOT render a native color input
    const nativeColorInput = item?.querySelector('input[type="color"]');
    expect(nativeColorInput).toBeNull();

    // Must render a ColorField swatch-button
    const swatch = item?.querySelector('[data-testid="color-field-swatch"]');
    expect(swatch).not.toBeNull();
  });

  it('oklch color swatch has role="button" and is keyboard accessible', async () => {
    await renderGenericTab(OKLCH_COLOR_TAB);

    const swatch = container.querySelector('[data-testid="color-field-swatch"]');
    expect(swatch).not.toBeNull();
    expect(swatch?.getAttribute('role')).toBe('button');
    expect(swatch?.getAttribute('tabindex')).toBe('0');
  });

  it('clicking the swatch opens the ColorPicker for an oklch item', async () => {
    await renderGenericTab(OKLCH_COLOR_TAB);

    // Before click: no picker present
    let picker = container.querySelector('.tokenpanel-color-picker');
    expect(picker).toBeNull();

    const swatch = container.querySelector<HTMLElement>('[data-testid="color-field-swatch"]');
    expect(swatch).not.toBeNull();

    act(() => {
      swatch!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    picker = container.querySelector('.tokenpanel-color-picker');
    expect(picker).not.toBeNull();
  });

  it('pressing Enter on the swatch opens the ColorPicker for an oklch item', async () => {
    await renderGenericTab(OKLCH_COLOR_TAB);

    let picker = container.querySelector('.tokenpanel-color-picker');
    expect(picker).toBeNull();

    const swatch = container.querySelector<HTMLElement>('[data-testid="color-field-swatch"]');
    expect(swatch).not.toBeNull();

    act(() => {
      swatch!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });

    picker = container.querySelector('.tokenpanel-color-picker');
    expect(picker).not.toBeNull();
  });

  it('pressing Space on the swatch opens the ColorPicker for an oklch item', async () => {
    await renderGenericTab(OKLCH_COLOR_TAB);

    let picker = container.querySelector('.tokenpanel-color-picker');
    expect(picker).toBeNull();

    const swatch = container.querySelector<HTMLElement>('[data-testid="color-field-swatch"]');
    expect(swatch).not.toBeNull();

    act(() => {
      swatch!.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    });

    picker = container.querySelector('.tokenpanel-color-picker');
    expect(picker).not.toBeNull();
  });

  it('plain hex color item still renders <input type="color">, not ColorField', async () => {
    await renderGenericTab(MIXED_KINDS_TAB);

    const item = container.querySelector('[data-testid="tier-item-color-item"]');
    expect(item).not.toBeNull();

    const nativeColorInput = item?.querySelector('input[type="color"]');
    expect(nativeColorInput).not.toBeNull();

    const swatch = item?.querySelector('[data-testid="color-field-swatch"]');
    expect(swatch).toBeNull();
  });

  it('readonly oklch color item does NOT open the picker on click', async () => {
    await renderGenericTab(READONLY_OKLCH_COLOR_TAB);

    const swatch = container.querySelector<HTMLElement>('[data-testid="color-field-swatch"]');
    expect(swatch).not.toBeNull();

    act(() => {
      swatch!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const picker = container.querySelector('.tokenpanel-color-picker');
    expect(picker).toBeNull();
  });

  it('readonly oklch color item does NOT open the picker on Enter', async () => {
    await renderGenericTab(READONLY_OKLCH_COLOR_TAB);

    const swatch = container.querySelector<HTMLElement>('[data-testid="color-field-swatch"]');
    expect(swatch).not.toBeNull();

    act(() => {
      swatch!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });

    const picker = container.querySelector('.tokenpanel-color-picker');
    expect(picker).toBeNull();
  });

  it('readonly oklch color item does NOT open the picker on Space', async () => {
    await renderGenericTab(READONLY_OKLCH_COLOR_TAB);

    const swatch = container.querySelector<HTMLElement>('[data-testid="color-field-swatch"]');
    expect(swatch).not.toBeNull();

    act(() => {
      swatch!.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    });

    const picker = container.querySelector('.tokenpanel-color-picker');
    expect(picker).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Click-to-cycle unit suffix on value inputs (#519)
// ---------------------------------------------------------------------------

describe('GenericTab — click-to-cycle unit suffix (#519)', () => {
  it('non-opted length item (no `units`) renders a plain, non-interactive span', async () => {
    await renderGenericTab(MIXED_KINDS_TAB);

    const unitEl = container.querySelector('[data-testid="tier-item-length-item"] .tokenpanel-row-unit');
    expect(unitEl).not.toBeNull();
    expect(unitEl!.tagName).toBe('SPAN');
    expect(unitEl!.getAttribute('role')).toBeNull();
    expect(unitEl!.className).toBe('tokenpanel-row-unit');
  });

  it('ms-duration length item (no `units`) stays a static span', async () => {
    await renderGenericTab(CYCLABLE_UNIT_TAB);

    const unitEl = container.querySelector('[data-testid="tier-item-duration-item"] .tokenpanel-row-unit');
    expect(unitEl!.tagName).toBe('SPAN');
    expect(unitEl!.getAttribute('role')).toBeNull();
    expect(unitEl!.textContent).toBe('ms');
  });

  it('unitless length item (no `units`) renders no unit element at all — unchanged', async () => {
    await renderGenericTab(CYCLABLE_UNIT_TAB);

    const item = container.querySelector('[data-testid="tier-item-unitless-item"]');
    const unitEl = item?.querySelector('.tokenpanel-row-unit');
    expect(unitEl).toBeNull();
  });

  it('opted-in length item renders an interactive role=button unit suffix with a distinct aria-label', async () => {
    await renderGenericTab(CYCLABLE_UNIT_TAB);

    const unitEl = container.querySelector(
      '[data-testid="tier-item-cyclable-item"] .tokenpanel-row-unit',
    );
    expect(unitEl).not.toBeNull();
    expect(unitEl!.getAttribute('role')).toBe('button');
    expect(unitEl!.getAttribute('tabindex')).toBe('0');
    expect(unitEl!.textContent).toBe('rem');
    // Distinct from the number input's aria-label ("--test-cyclable value")
    // so it doesn't collide with the input's accessible name.
    expect(unitEl!.getAttribute('aria-label')).toBe('--test-cyclable unit');
  });

  it('clicking the unit cycles rem -> em -> px -> rem, keeping the magnitude unchanged', async () => {
    let onChange = vi.fn();
    const clickUnit = () => {
      const unitEl = container.querySelector<HTMLElement>(
        '[data-testid="tier-item-cyclable-item"] .tokenpanel-row-unit',
      )!;
      act(() => {
        unitEl.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
    };

    await renderGenericTab(CYCLABLE_UNIT_TAB, {}, onChange);
    clickUnit();
    expect(onChange).toHaveBeenCalledWith('values', 'cyclable-item', '1em');

    onChange = vi.fn();
    await renderGenericTab(CYCLABLE_UNIT_TAB, { values: { 'cyclable-item': '1em' } }, onChange);
    clickUnit();
    expect(onChange).toHaveBeenCalledWith('values', 'cyclable-item', '1px');

    onChange = vi.fn();
    await renderGenericTab(CYCLABLE_UNIT_TAB, { values: { 'cyclable-item': '1px' } }, onChange);
    clickUnit();
    expect(onChange).toHaveBeenCalledWith('values', 'cyclable-item', '1rem');
  });

  it('Enter key on the unit cycles the unit', async () => {
    const onChange = vi.fn();
    await renderGenericTab(CYCLABLE_UNIT_TAB, {}, onChange);

    const unitEl = container.querySelector<HTMLElement>(
      '[data-testid="tier-item-cyclable-item"] .tokenpanel-row-unit',
    )!;
    act(() => {
      unitEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });
    expect(onChange).toHaveBeenCalledWith('values', 'cyclable-item', '1em');
  });

  it('Space key on the unit cycles the unit', async () => {
    const onChange = vi.fn();
    await renderGenericTab(CYCLABLE_UNIT_TAB, {}, onChange);

    const unitEl = container.querySelector<HTMLElement>(
      '[data-testid="tier-item-cyclable-item"] .tokenpanel-row-unit',
    )!;
    act(() => {
      unitEl.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    });
    expect(onChange).toHaveBeenCalledWith('values', 'cyclable-item', '1em');
  });

  it('shows the ACTUAL stored suffix when it diverges from the declared units list', async () => {
    await renderGenericTab(CYCLABLE_UNIT_TAB);

    const unitEl = container.querySelector(
      '[data-testid="tier-item-diverged-item"] .tokenpanel-row-unit',
    );
    expect(unitEl!.textContent).toBe('vw');
  });

  it('first activation on a diverged suffix cycles to units[0]', async () => {
    const onChange = vi.fn();
    await renderGenericTab(CYCLABLE_UNIT_TAB, {}, onChange);

    const unitEl = container.querySelector<HTMLElement>(
      '[data-testid="tier-item-diverged-item"] .tokenpanel-row-unit',
    )!;
    act(() => {
      unitEl.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(onChange).toHaveBeenCalledWith('values', 'diverged-item', '2rem');
  });

  it('typing a new number after cycling preserves the cycled unit (not type.unit)', async () => {
    const onChange = vi.fn();
    await renderGenericTab(CYCLABLE_UNIT_TAB, { values: { 'cyclable-item': '1px' } }, onChange);

    const input = container.querySelector<HTMLInputElement>(
      '[data-testid="tier-item-cyclable-item"] input[type="text"]',
    )!;
    simulateInputEvent(input, '5');

    const calls = onChange.mock.calls.filter(([, itemId]) => itemId === 'cyclable-item');
    expect(calls.at(-1)).toEqual(['values', 'cyclable-item', '5px']);
  });

  it('readonly opted-in item is aria-disabled and ignores click', async () => {
    const onChange = vi.fn();
    await renderGenericTab(CYCLABLE_UNIT_TAB, {}, onChange);

    const unitEl = container.querySelector<HTMLElement>(
      '[data-testid="tier-item-readonly-cyclable-item"] .tokenpanel-row-unit',
    )!;
    expect(unitEl.getAttribute('aria-disabled')).toBe('true');

    act(() => {
      unitEl.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    const calls = onChange.mock.calls.filter(([, itemId]) => itemId === 'readonly-cyclable-item');
    expect(calls).toHaveLength(0);
  });

  it('falls back to units[0] for display when the stored value has no unit suffix at all (degenerate case)', async () => {
    await renderGenericTab(CYCLABLE_UNIT_TAB);

    const unitEl = container.querySelector<HTMLElement>(
      '[data-testid="tier-item-unitless-cyclable-item"] .tokenpanel-row-unit',
    )!;
    // Must never render an empty, zero-width interactive button.
    expect(unitEl.textContent).toBe('rem');
  });

  it('detects the actual suffix of a leading-dot decimal value ("valid CSS, .5px" style) instead of falling back to the declared unit', async () => {
    await renderGenericTab(CYCLABLE_UNIT_TAB);

    const unitEl = container.querySelector<HTMLElement>(
      '[data-testid="tier-item-leading-dot-item"] .tokenpanel-row-unit',
    )!;
    expect(unitEl.textContent).toBe('px');
  });

  it('cycling a leading-dot decimal value emits a magnitude consistent with the detected suffix (parse/emit agreement)', async () => {
    const onChange = vi.fn();
    await renderGenericTab(CYCLABLE_UNIT_TAB, {}, onChange);

    const unitEl = container.querySelector<HTMLElement>(
      '[data-testid="tier-item-leading-dot-item"] .tokenpanel-row-unit',
    )!;
    act(() => {
      unitEl.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    // px -> rem (wraps); magnitude 0.5 parsed the same way for both the
    // displayed suffix ("px") and the emitted value.
    expect(onChange).toHaveBeenCalledWith('values', 'leading-dot-item', '0.5rem');
  });
});

describe('GenericTab — click-to-cycle unit round-trips through persistence + apply pipeline (#519)', () => {
  it('a post-cycle value committed via onChange resolves and emits unchanged through the tier resolver', async () => {
    const onChange = vi.fn();
    await renderGenericTab(CYCLABLE_UNIT_TAB, {}, onChange);

    const unitEl = container.querySelector<HTMLElement>(
      '[data-testid="tier-item-cyclable-item"] .tokenpanel-row-unit',
    )!;
    act(() => {
      unitEl.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    const [, , postCycleValue] = onChange.mock.calls[0];
    expect(postCycleValue).toBe('1em');

    // Persistence (localStorage state-v4 and export/import JSON) is a plain
    // JSON.stringify/parse of TabOverrides — no apply-pipeline change was
    // needed for #519, so a round-trip through JSON must leave the value
    // byte-identical.
    const overrides: TabOverrides = JSON.parse(
      JSON.stringify({ values: { 'cyclable-item': postCycleValue } }),
    );

    const resolved = resolveTierItemValue(CYCLABLE_UNIT_TAB, 'values', 'cyclable-item', overrides);
    expect(emitTierItemCssValue(resolved)).toBe('1em');
  });
});

// ---------------------------------------------------------------------------
// GenericItemEditor — direct render (the production call site shared by
// FontTab / SpacingTab / SizeTab, distinct from GenericTab's duplicated
// editor above) (#519)
// ---------------------------------------------------------------------------

describe('GenericItemEditor — click-to-cycle unit suffix (#519, direct render)', () => {
  const CYCLABLE_ITEM: TierItem = {
    id: 'editor-cyclable-item',
    cssVar: '--test-editor-cyclable',
    label: 'Cyclable',
    default: '1rem',
    type: { kind: 'length', step: 0.25, unit: 'rem', units: ['rem', 'em', 'px'] },
  };

  const STATIC_ITEM: TierItem = {
    id: 'editor-static-item',
    cssVar: '--test-editor-static',
    label: 'Static',
    default: '1rem',
    type: { kind: 'length', step: 0.25, unit: 'rem' },
  };

  async function renderEditor(
    item: TierItem,
    value: string,
    onChange: (itemId: string, next: string) => void = () => undefined,
  ): Promise<void> {
    await act(() => {
      render(<GenericItemEditor item={item} value={value} onChange={onChange} />, container);
    });
  }

  it('renders an interactive role=button unit suffix for an opted-in item', async () => {
    await renderEditor(CYCLABLE_ITEM, '1rem');

    const unitEl = container.querySelector(
      `[data-testid="tier-item-${CYCLABLE_ITEM.id}"] .tokenpanel-row-unit`,
    );
    expect(unitEl).not.toBeNull();
    expect(unitEl!.getAttribute('role')).toBe('button');
    expect(unitEl!.textContent).toBe('rem');
  });

  it('clicking cycles the unit while keeping the magnitude unchanged', async () => {
    const onChange = vi.fn();
    await renderEditor(CYCLABLE_ITEM, '1rem', onChange);

    const unitEl = container.querySelector<HTMLElement>(
      `[data-testid="tier-item-${CYCLABLE_ITEM.id}"] .tokenpanel-row-unit`,
    )!;
    act(() => {
      unitEl.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(onChange).toHaveBeenCalledWith('editor-cyclable-item', '1em');
  });

  it('non-opted length item (no `units`) stays a plain static span — DOM-identical to today', async () => {
    await renderEditor(STATIC_ITEM, '1rem');

    const unitEl = container.querySelector(
      `[data-testid="tier-item-${STATIC_ITEM.id}"] .tokenpanel-row-unit`,
    );
    expect(unitEl!.tagName).toBe('SPAN');
    expect(unitEl!.getAttribute('role')).toBeNull();
    expect(unitEl!.className).toBe('tokenpanel-row-unit');
  });
});
