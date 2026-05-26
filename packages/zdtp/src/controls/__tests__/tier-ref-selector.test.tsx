// @vitest-environment jsdom

/**
 * Unit tests for TierRefSelector (native <select> implementation).
 *
 * Test structure:
 *  1. Rendering — renders a <select> with correct options
 *  2. Option labels — each option shows cssVar (resolved-value preview)
 *  3. Literal option — last option is "Literal…" with TIER_REF_LITERAL_SIGNAL value
 *  4. Selection change — fireEvent.change calls onChange with (itemId, refItemId)
 *  5. Literal selection — fireEvent.change with sentinel calls onChange correctly
 *  6. Value sync — overriding a tier-1 value via previewValueFor updates option labels
 *  7. TIER_REF_LITERAL_SIGNAL sentinel value is "__literal__"
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import TierRefSelector, { TIER_REF_LITERAL_SIGNAL } from '../tier-ref-selector';
import type { TabConfig } from '../../tokens/tier-model';

// ---------------------------------------------------------------------------
// Fixture tab config — 2-tier easing example
// ---------------------------------------------------------------------------

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
          cssVar: '--easing-ease-in',
          label: 'Ease in',
          default: 'cubic-bezier(0.42, 0, 1, 1)',
          type: { kind: 'text' },
        },
        {
          id: 'ease-out',
          cssVar: '--easing-ease-out',
          label: 'Ease out',
          default: 'cubic-bezier(0, 0, 0.58, 1)',
          type: { kind: 'text' },
        },
        {
          id: 'linear',
          cssVar: '--easing-linear',
          label: 'Linear',
          default: 'linear',
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
          cssVar: '--easing-tab-open',
          label: 'Tab open',
          default: 'ease-out',
          type: { kind: 'text' },
        },
        {
          id: 'tab-close',
          cssVar: '--easing-tab-close',
          label: 'Tab close',
          default: 'ease-in',
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
  act(() => {
    render(null, container);
  });
  container.remove();
});

/** Default previewValueFor — returns the item's manifest default. */
function defaultPreviewValueFor(refItemId: string): string {
  const rawTier = EASING_TAB.tiers[0];
  const item = rawTier.items.find((i) => i.id === refItemId);
  return item?.default ?? refItemId;
}

function renderSelector(
  value: string,
  onChange: (itemId: string, next: string) => void,
  previewValueFor: (refItemId: string) => string = defaultPreviewValueFor,
) {
  act(() => {
    render(
      <TierRefSelector
        tab={EASING_TAB}
        tierId="semantic"
        itemId="tab-open"
        value={value}
        onChange={onChange}
        previewValueFor={previewValueFor}
      />,
      container,
    );
  });
}

function getSelect(): HTMLSelectElement {
  const el = container.querySelector<HTMLSelectElement>('select.tokenpanel-tier-ref-select');
  if (!el) throw new Error('select.tokenpanel-tier-ref-select not found');
  return el;
}

function getOptions(): HTMLOptionElement[] {
  return Array.from(getSelect().querySelectorAll('option'));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TierRefSelector — rendering', () => {
  it('renders a native <select> element', () => {
    renderSelector('ease-out', vi.fn());
    expect(getSelect()).not.toBeNull();
  });

  it('renders one option per raw tier item plus the Literal option', () => {
    renderSelector('ease-out', vi.fn());
    // 3 raw items + 1 Literal sentinel = 4 options
    expect(getOptions().length).toBe(4);
  });

  it('does NOT use role=listbox markup', () => {
    renderSelector('ease-out', vi.fn());
    expect(container.querySelector('[role="listbox"]')).toBeNull();
  });

  it('does NOT use role=option markup', () => {
    renderSelector('ease-out', vi.fn());
    expect(container.querySelector('[role="option"]')).toBeNull();
  });

  it('selected value matches the current ref item id', () => {
    renderSelector('ease-out', vi.fn());
    expect(getSelect().value).toBe('ease-out');
  });

  it('falls back to first item when value is unrecognised', () => {
    renderSelector('unknown-id', vi.fn());
    expect(getSelect().value).toBe('ease-in');
  });
});

describe('TierRefSelector — option labels', () => {
  it('each raw item option label includes cssVar and preview value', () => {
    renderSelector('ease-out', vi.fn());
    const options = getOptions();
    const easeInOpt = options.find((o) => o.value === 'ease-in');
    expect(easeInOpt).not.toBeUndefined();
    // Label format: "--easing-ease-in (cubic-bezier(0.42, 0, 1, 1))"
    expect(easeInOpt!.textContent).toContain('--easing-ease-in');
    expect(easeInOpt!.textContent).toContain('cubic-bezier(0.42, 0, 1, 1)');
  });

  it('truncates long preview values in option labels', () => {
    // Provide a preview value that exceeds 28 chars.
    const longValue = 'a'.repeat(40);
    const previewValueFor = (refItemId: string) => (refItemId === 'ease-in' ? longValue : refItemId);
    renderSelector('ease-out', vi.fn(), previewValueFor);

    const options = getOptions();
    const easeInOpt = options.find((o) => o.value === 'ease-in');
    expect(easeInOpt).not.toBeUndefined();
    // Truncated to 28 chars: 27 + '…'
    const label = easeInOpt!.textContent ?? '';
    expect(label).toContain('…');
    // Original long value should not appear verbatim
    expect(label).not.toContain(longValue);
  });

  it('Literal option is last with value TIER_REF_LITERAL_SIGNAL', () => {
    renderSelector('ease-out', vi.fn());
    const options = getOptions();
    const last = options[options.length - 1];
    expect(last.value).toBe(TIER_REF_LITERAL_SIGNAL);
    expect(last.textContent).toContain('Literal');
  });
});

describe('TierRefSelector — value sync (override-aware preview)', () => {
  it('reflects overridden tier-1 value in option label', () => {
    // Simulate a tier-1 override: ease-in now resolves to "custom-value".
    const previewValueFor = (refItemId: string) =>
      refItemId === 'ease-in' ? 'custom-value' : defaultPreviewValueFor(refItemId);

    renderSelector('ease-out', vi.fn(), previewValueFor);

    const options = getOptions();
    const easeInOpt = options.find((o) => o.value === 'ease-in');
    expect(easeInOpt).not.toBeUndefined();
    expect(easeInOpt!.textContent).toContain('custom-value');
    // Original manifest default should NOT appear when overridden
    expect(easeInOpt!.textContent).not.toContain('cubic-bezier(0.42, 0, 1, 1)');
  });

  it('re-renders with updated option labels when previewValueFor changes', () => {
    const onChange = vi.fn();

    // First render: default previews.
    renderSelector('ease-out', onChange, defaultPreviewValueFor);
    let easeInOpt = getOptions().find((o) => o.value === 'ease-in')!;
    expect(easeInOpt.textContent).toContain('cubic-bezier(0.42, 0, 1, 1)');

    // Second render: override ease-in to a new value.
    const overriddenPreview = (refItemId: string) =>
      refItemId === 'ease-in' ? '0.5s ease' : defaultPreviewValueFor(refItemId);
    act(() => {
      render(
        <TierRefSelector
          tab={EASING_TAB}
          tierId="semantic"
          itemId="tab-open"
          value="ease-out"
          onChange={onChange}
          previewValueFor={overriddenPreview}
        />,
        container,
      );
    });

    easeInOpt = getOptions().find((o) => o.value === 'ease-in')!;
    expect(easeInOpt.textContent).toContain('0.5s ease');
    expect(easeInOpt.textContent).not.toContain('cubic-bezier(0.42, 0, 1, 1)');
  });
});

/** Fire a native change event on a select element, setting its value first. */
function fireSelectChange(select: HTMLSelectElement, newValue: string) {
  act(() => {
    // Directly mutate the select's value so the event handler sees it.
    Object.defineProperty(select, 'value', { value: newValue, writable: true, configurable: true });
    select.value = newValue;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

describe('TierRefSelector — selection via change event', () => {
  it('calls onChange with (itemId, refItemId) when user changes selection', () => {
    const onChange = vi.fn();
    renderSelector('ease-in', onChange);

    const select = getSelect();
    fireSelectChange(select, 'ease-out');

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('tab-open', 'ease-out');
  });

  it('calls onChange with (itemId, linear) when linear is selected', () => {
    const onChange = vi.fn();
    renderSelector('ease-in', onChange);

    const select = getSelect();
    fireSelectChange(select, 'linear');

    expect(onChange).toHaveBeenCalledWith('tab-open', 'linear');
  });

  it('calls onChange with TIER_REF_LITERAL_SIGNAL when Literal is selected', () => {
    const onChange = vi.fn();
    renderSelector('ease-in', onChange);

    const select = getSelect();
    fireSelectChange(select, TIER_REF_LITERAL_SIGNAL);

    expect(onChange).toHaveBeenCalledWith('tab-open', TIER_REF_LITERAL_SIGNAL);
  });
});

describe('TierRefSelector — TIER_REF_LITERAL_SIGNAL', () => {
  it('TIER_REF_LITERAL_SIGNAL value is "__literal__"', () => {
    expect(TIER_REF_LITERAL_SIGNAL).toBe('__literal__');
  });
});
