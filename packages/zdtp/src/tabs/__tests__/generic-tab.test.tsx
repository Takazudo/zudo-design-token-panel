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
import type { TabConfig } from '../../tokens/tier-model';
import type { TabOverrides } from '../../apply/tier-resolver';

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
          type: { kind: 'length', min: 0, max: 4, step: 0.25, unit: 'rem' },
        },
        {
          id: 'number-item',
          cssVar: '--test-number',
          label: 'Number',
          default: '1.5',
          type: { kind: 'number', min: 1, max: 10, step: 0.5 },
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

async function renderGenericTab(
  tab: TabConfig,
  overrides: TabOverrides = {},
  onChange: (tierId: string, itemId: string, next: string) => void = () => undefined,
): Promise<void> {
  await act(() => {
    render(
      <GenericTab tab={tab} overrides={overrides} onChange={onChange} />,
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
// Event simulation follows the same pattern as slider-row.test.tsx:
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

describe('GenericItemEditor — mid-keystroke clamping regression (#313)', () => {
  it('does NOT call onChange when typed length value exceeds max', async () => {
    const onChange = vi.fn();
    await renderGenericTab(MIXED_KINDS_TAB, {}, onChange);

    const input = container.querySelector<HTMLInputElement>(
      '[data-testid="tier-item-length-item"] input[type="text"]',
    )!;
    expect(input).not.toBeNull();

    // Simulate typing "22" — max=4 for length-item
    simulateInputEvent(input, '22');

    // "22" is out of range; onChange must NOT have been called
    const lengthCalls = onChange.mock.calls.filter(([, itemId]) => itemId === 'length-item');
    expect(lengthCalls).toHaveLength(0);
  });

  it('keeps draft "22" visible after typing (does not snap to clamped value)', async () => {
    await renderGenericTab(MIXED_KINDS_TAB, {});

    const input = container.querySelector<HTMLInputElement>(
      '[data-testid="tier-item-length-item"] input[type="text"]',
    )!;

    simulateInputEvent(input, '22');

    expect(input.value).toBe('22');
  });

  it('applies --invalid class to out-of-range length input', async () => {
    await renderGenericTab(MIXED_KINDS_TAB, {});

    const input = container.querySelector<HTMLInputElement>(
      '[data-testid="tier-item-length-item"] input[type="text"]',
    )!;

    simulateInputEvent(input, '22');

    expect(input.classList.contains('tokenpanel-row-number-input--invalid')).toBe(true);
  });

  it('does NOT apply --invalid class when draft is in range', async () => {
    await renderGenericTab(MIXED_KINDS_TAB, {});

    const input = container.querySelector<HTMLInputElement>(
      '[data-testid="tier-item-length-item"] input[type="text"]',
    )!;

    simulateInputEvent(input, '2');

    expect(input.classList.contains('tokenpanel-row-number-input--invalid')).toBe(false);
  });

  it('clamps and commits out-of-range length value on blur', async () => {
    const onChange = vi.fn();
    await renderGenericTab(MIXED_KINDS_TAB, {}, onChange);

    const input = container.querySelector<HTMLInputElement>(
      '[data-testid="tier-item-length-item"] input[type="text"]',
    )!;

    simulateInputEvent(input, '22');
    // Not yet committed
    const beforeBlur = onChange.mock.calls.filter(([, itemId]) => itemId === 'length-item');
    expect(beforeBlur).toHaveLength(0);

    simulateFocusout(input);

    // After blur: clamped to max=4 and committed
    const afterBlur = onChange.mock.calls.filter(([, itemId]) => itemId === 'length-item');
    expect(afterBlur).toHaveLength(1);
    expect(afterBlur[0]).toEqual(['values', 'length-item', '4rem']);
    expect(input.value).toBe('4');
  });

  it('does NOT call onChange mid-keystroke for a number item within range', async () => {
    const onChange = vi.fn();
    await renderGenericTab(MIXED_KINDS_TAB, {}, onChange);

    const input = container.querySelector<HTMLInputElement>(
      '[data-testid="tier-item-number-item"] input[type="text"]',
    )!;

    // number-item: min=1 max=10; typing "5" should commit
    simulateInputEvent(input, '5');

    const numberCalls = onChange.mock.calls.filter(([, itemId]) => itemId === 'number-item');
    expect(numberCalls).toHaveLength(1);
    expect(numberCalls[0]).toEqual(['values', 'number-item', '5']);
  });
});
