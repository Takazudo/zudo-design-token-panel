// @vitest-environment jsdom

/**
 * Unit tests for SliderRow — focuses on the input-clamping regression (#313).
 *
 * Core scenario: typing "22" into an input with max=6 must NOT snap the
 * displayed value to "6" mid-keystroke. The draft is preserved; clamping only
 * happens on blur.
 *
 * Event simulation notes:
 *  - Preact-compat maps `onChange` to the native `input` event.
 *  - jsdom does NOT propagate React/Preact synthetic events from raw
 *    `input.value =` assignments; use Object.defineProperty + `new Event`.
 *  - Blur uses a plain `FocusEvent('blur', { bubbles: true })`.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import SliderRow from '../slider-row';
import type { TokenDef } from '../../tokens/manifest';

// ---------------------------------------------------------------------------
// Fixture token: Header Height, min=0 max=6 step=0.25 unit=rem
// ---------------------------------------------------------------------------

const HEADER_HEIGHT_TOKEN: TokenDef = {
  id: 'header-height',
  cssVar: '--header-height',
  label: 'Header Height',
  group: 'dimensions',
  default: '2rem',
  min: 0,
  max: 6,
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
// Regression: 2 → 22 should not snap to 6 mid-keystroke (#313)
// ---------------------------------------------------------------------------

describe('SliderRow — mid-keystroke clamping regression', () => {
  it('does NOT call onChange when typed value exceeds max', () => {
    const onChange = vi.fn();
    renderSliderRow(HEADER_HEIGHT_TOKEN, '2rem', onChange);

    const input = getNumberInput();
    expect(input).not.toBeNull();

    // Simulate typing "22" (user had "2", types another "2")
    simulateInput(input, '22');

    // onChange must NOT have been called — "22" is outside [0, 6]
    expect(onChange).not.toHaveBeenCalled();
  });

  it('keeps draft as "22" after typing (does not snap to 6)', () => {
    renderSliderRow(HEADER_HEIGHT_TOKEN, '2rem');

    const input = getNumberInput();
    simulateInput(input, '22');

    // The input still shows what the user typed, not the clamped value
    expect(input.value).toBe('22');
  });

  it('applies --invalid class when draft is out of range', () => {
    renderSliderRow(HEADER_HEIGHT_TOKEN, '2rem');

    const input = getNumberInput();
    simulateInput(input, '22');

    expect(input.classList.contains('tokenpanel-row-number-input--invalid')).toBe(true);
  });

  it('does NOT apply --invalid class when draft is within range', () => {
    renderSliderRow(HEADER_HEIGHT_TOKEN, '2rem');

    const input = getNumberInput();
    simulateInput(input, '3');

    expect(input.classList.contains('tokenpanel-row-number-input--invalid')).toBe(false);
  });

  it('calls onChange for in-range values mid-keystroke', () => {
    const onChange = vi.fn();
    renderSliderRow(HEADER_HEIGHT_TOKEN, '2rem', onChange);

    const input = getNumberInput();
    simulateInput(input, '3');

    expect(onChange).toHaveBeenCalledWith('header-height', '3rem');
  });
});

// ---------------------------------------------------------------------------
// Blur handling: clamp + commit on blur when out of range
// ---------------------------------------------------------------------------

describe('SliderRow — blur handling', () => {
  it('clamps and commits out-of-range value on blur', () => {
    const onChange = vi.fn();
    renderSliderRow(HEADER_HEIGHT_TOKEN, '2rem', onChange);

    const input = getNumberInput();
    simulateInput(input, '22');
    // onChange not called yet
    expect(onChange).not.toHaveBeenCalled();

    simulateBlur(input);

    // On blur, the out-of-range "22" is clamped to max=6 and committed
    expect(onChange).toHaveBeenCalledWith('header-height', '6rem');
    expect(input.value).toBe('6');
  });

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
    // "abc" is fully unparseable (parseNumericValue returns null)
    simulateInput(input, 'abc');
    simulateBlur(input);

    // Unparseable draft should revert to last-known-good value
    expect(onChange).not.toHaveBeenCalled();
    expect(input.value).toBe('2');
  });

  it('does NOT call onChange on blur when draft is already in range', () => {
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

// ---------------------------------------------------------------------------
// Slider still commits live
// ---------------------------------------------------------------------------

describe('SliderRow — slider input', () => {
  it('calls onChange immediately when slider moves', () => {
    const onChange = vi.fn();
    renderSliderRow(HEADER_HEIGHT_TOKEN, '2rem', onChange);

    const slider = container.querySelector<HTMLInputElement>('input[type="range"]')!;
    expect(slider).not.toBeNull();

    act(() => {
      Object.defineProperty(slider, 'value', { value: '4', writable: true, configurable: true });
      slider.dispatchEvent(new Event('input', { bubbles: true }));
    });

    expect(onChange).toHaveBeenCalledWith('header-height', '4rem');
  });
});
