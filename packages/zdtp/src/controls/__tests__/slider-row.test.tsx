// @vitest-environment jsdom

/**
 * Unit tests for SliderRow — focuses on free numeric input behavior.
 *
 * Previously (pre-#326) this file tested clamping behavior: typing "22" into
 * an input with max=6 would clamp to "6" on blur. That contract is gone.
 *
 * New contract:
 *  - Every parseable value commits immediately (no range check).
 *  - Mid-typing partial drafts ("1.", "") do NOT commit.
 *  - On blur: empty/unparseable reverts to last-known-good; parseable values
 *    were already committed and nothing more happens (no clamping).
 *  - No aria-invalid, no tokenpanel-row-number-input--invalid class (ever).
 *  - No <input type="range"> slider element.
 *
 * These tests guard against any future re-introduction of clamping logic.
 *
 * Event simulation notes:
 *  - Preact-compat maps `onChange` to the native `input` event.
 *  - jsdom does NOT propagate React/Preact synthetic events from raw
 *    `input.value =` assignments; use Object.defineProperty + `new Event`.
 *  - Blur uses a plain `FocusEvent('focusout', { bubbles: true })`.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import SliderRow from '../slider-row';
import type { TokenDef } from '../../tokens/manifest';

// ---------------------------------------------------------------------------
// Fixture token: Header Height, step=0.25 unit=rem (no min/max)
// ---------------------------------------------------------------------------

const HEADER_HEIGHT_TOKEN: TokenDef = {
  id: 'header-height',
  cssVar: '--header-height',
  label: 'Header Height',
  group: 'dimensions',
  default: '2rem',
  step: 0.25,
  unit: 'rem',
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
  act(() => render(null, container));
  document.body.removeChild(container);
});

function renderSliderRow(
  token: TokenDef,
  value: string,
  onChange: (id: string, next: string) => void = vi.fn(),
): void {
  act(() => {
    render(<SliderRow token={token} value={value} onChange={onChange} />, container);
  });
}

/** Simulates typing into a text input and triggering Preact's onChange. */
function simulateInput(input: HTMLInputElement, newValue: string): void {
  act(() => {
    Object.defineProperty(input, 'value', { value: newValue, writable: true, configurable: true });
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

/** Simulates blur on an input.
 *
 * Preact-compat maps `onBlur` to the native `focusout` event (not `blur`).
 * See preact/compat/src/render.js: `onblur` → `onfocusout`.
 */
function simulateBlur(input: HTMLInputElement): void {
  act(() => {
    input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
  });
}

function getNumberInput(): HTMLInputElement {
  return container.querySelector<HTMLInputElement>('.tokenpanel-row-number-input')!;
}

// ---------------------------------------------------------------------------
// Guard: no slider element (#326 — range slider removed)
// ---------------------------------------------------------------------------

describe('SliderRow — no range slider', () => {
  it('does NOT render an <input type="range"> element', () => {
    renderSliderRow(HEADER_HEIGHT_TOKEN, '2rem');

    const slider = container.querySelector('input[type="range"]');
    expect(slider).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Free numeric input: every parseable value commits immediately
// ---------------------------------------------------------------------------

describe('SliderRow — free numeric input (no clamping)', () => {
  it('calls onChange immediately when typing any parseable value', () => {
    const onChange = vi.fn();
    renderSliderRow(HEADER_HEIGHT_TOKEN, '2rem', onChange);

    const input = getNumberInput();
    simulateInput(input, '22');

    // "22" is parseable — must commit even though it exceeds the old max=6
    expect(onChange).toHaveBeenCalledWith('header-height', '22rem');
  });

  it('keeps draft as typed value without snapping', () => {
    renderSliderRow(HEADER_HEIGHT_TOKEN, '2rem');

    const input = getNumberInput();
    simulateInput(input, '22');

    expect(input.value).toBe('22');
  });

  it('calls onChange for any parseable value mid-keystroke', () => {
    const onChange = vi.fn();
    renderSliderRow(HEADER_HEIGHT_TOKEN, '2rem', onChange);

    const input = getNumberInput();
    simulateInput(input, '3');

    expect(onChange).toHaveBeenCalledWith('header-height', '3rem');
  });

  it('does NOT call onChange for unparseable drafts (letters only)', () => {
    const onChange = vi.fn();
    renderSliderRow(HEADER_HEIGHT_TOKEN, '2rem', onChange);

    const input = getNumberInput();
    // "abc" cannot be parsed by parseNumericValue — returns null
    simulateInput(input, 'abc');

    expect(onChange).not.toHaveBeenCalled();
    expect(input.value).toBe('abc');
  });

  it('does NOT call onChange for empty draft', () => {
    const onChange = vi.fn();
    renderSliderRow(HEADER_HEIGHT_TOKEN, '2rem', onChange);

    const input = getNumberInput();
    simulateInput(input, '');

    expect(onChange).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// No invalid state — inputs are never marked invalid
// ---------------------------------------------------------------------------

describe('SliderRow — no aria-invalid / --invalid class', () => {
  it('does NOT apply --invalid class for any numeric input', () => {
    renderSliderRow(HEADER_HEIGHT_TOKEN, '2rem');

    const input = getNumberInput();
    simulateInput(input, '22');

    expect(input.classList.contains('tokenpanel-row-number-input--invalid')).toBe(false);
  });

  it('does NOT set aria-invalid for any numeric input', () => {
    renderSliderRow(HEADER_HEIGHT_TOKEN, '2rem');

    const input = getNumberInput();
    simulateInput(input, '22');

    expect(input.getAttribute('aria-invalid')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Blur handling: revert on empty/unparseable only — no clamping
// ---------------------------------------------------------------------------

describe('SliderRow — blur handling', () => {
  it('reverts to last-known-good on blur when input is empty', () => {
    const onChange = vi.fn();
    renderSliderRow(HEADER_HEIGHT_TOKEN, '2rem', onChange);

    const input = getNumberInput();
    simulateInput(input, '');
    simulateBlur(input);

    // Empty draft should revert; onChange not called for empty
    expect(onChange).not.toHaveBeenCalled();
    expect(input.value).toBe('2');
  });

  it('reverts to last-known-good on blur when draft contains only non-numeric chars', () => {
    const onChange = vi.fn();
    renderSliderRow(HEADER_HEIGHT_TOKEN, '2rem', onChange);

    const input = getNumberInput();
    simulateInput(input, 'abc');
    simulateBlur(input);

    // Unparseable draft should revert to last-known-good value
    expect(onChange).not.toHaveBeenCalled();
    expect(input.value).toBe('2');
  });

  it('does NOT clamp a large value on blur — commits as typed', () => {
    const onChange = vi.fn();
    renderSliderRow(HEADER_HEIGHT_TOKEN, '2rem', onChange);

    const input = getNumberInput();
    simulateInput(input, '22');
    onChange.mockClear(); // clear the keystroke commit

    simulateBlur(input);

    // On blur, parseable value was already committed on keystroke — no additional
    // commit (especially not a clamped one)
    expect(onChange).not.toHaveBeenCalled();
    expect(input.value).toBe('22');
  });

  it('does NOT call onChange on blur when draft is already committed', () => {
    const onChange = vi.fn();
    renderSliderRow(HEADER_HEIGHT_TOKEN, '2rem', onChange);

    const input = getNumberInput();
    simulateInput(input, '3');
    onChange.mockClear(); // clear the in-range keystroke call

    simulateBlur(input);

    // In-range value was already committed on keystroke; blur does nothing extra
    expect(onChange).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// External value sync (reset / preset load)
// ---------------------------------------------------------------------------

describe('SliderRow — external value sync', () => {
  it('updates the draft when the external value prop changes', () => {
    renderSliderRow(HEADER_HEIGHT_TOKEN, '2rem');
    const input = getNumberInput();
    expect(input.value).toBe('2');

    // Simulate parent updating the value (e.g. reset)
    act(() => {
      render(
        <SliderRow token={HEADER_HEIGHT_TOKEN} value="4rem" onChange={vi.fn()} />,
        container,
      );
    });

    expect(input.value).toBe('4');
  });
});
