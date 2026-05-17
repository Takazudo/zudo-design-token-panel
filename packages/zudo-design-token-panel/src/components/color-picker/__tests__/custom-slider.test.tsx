// @vitest-environment jsdom

/**
 * Unit tests for CustomSlider.
 *
 * Scope:
 *  1. Rendering — label, slider host, value span, gradient, thumb position
 *  2. Keyboard — ArrowRight/Left, Shift modifier, Home, End
 *  3. Pointer events — pointerdown → onDragStart; pointermove → onChange;
 *     pointerup → onDragEnd (event-sequencing only; no geometry assertions)
 *  4. Clamping — values stay within [min, max]
 *  5. ARIA — role=slider, aria-valuemin/max/now, aria-label
 */

// jsdom does not polyfill PointerEvent. Provide a minimal shim that extends
// MouseEvent so dispatchEvent can carry clientX and pointerId as needed.
if (typeof PointerEvent === 'undefined') {
  class PointerEventShim extends MouseEvent {
    pointerId: number;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 0;
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).PointerEvent = PointerEventShim;
}

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { CustomSlider } from '../custom-slider';
import type { SliderConfig } from '../custom-slider';

// ---------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------

const INTEGER_CONFIG: SliderConfig = {
  key: 'hue',
  label: 'H',
  ariaLabel: 'Hue',
  min: 0,
  max: 360,
  step: 1,
  format: (v) => `${Math.round(v)}°`,
};

const FRACTIONAL_CONFIG: SliderConfig = {
  key: 'lightness',
  label: 'L',
  ariaLabel: 'Lightness',
  min: 0,
  max: 1,
  step: 0.01,
  format: (v) => v.toFixed(2),
};

const GRADIENT = 'linear-gradient(to right, oklch(0 0 0), oklch(1 0 0))';

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
  container.remove();
});

function renderSlider(
  config: SliderConfig,
  value: number,
  callbacks: {
    onChange?: (v: number) => void;
    onDragStart?: () => void;
    onDragEnd?: () => void;
  } = {},
) {
  const onChange = callbacks.onChange ?? vi.fn();
  const onDragStart = callbacks.onDragStart ?? vi.fn();
  const onDragEnd = callbacks.onDragEnd ?? vi.fn();

  act(() => {
    render(
      <CustomSlider
        config={config}
        value={value}
        gradient={GRADIENT}
        onChange={onChange}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      />,
      container,
    );
  });

  return { onChange, onDragStart, onDragEnd };
}

function getSliderHost(): HTMLElement {
  const el = container.querySelector<HTMLElement>('[role="slider"]');
  if (!el) throw new Error('slider host not found');
  return el;
}

function fireKey(el: Element, key: string, shift = false) {
  act(() => {
    el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, shiftKey: shift }));
  });
}

function firePointerDown(el: Element, clientX = 0) {
  act(() => {
    el.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, clientX, pointerId: 1 }),
    );
  });
}

function firePointerMove(el: Element, clientX = 0) {
  act(() => {
    el.dispatchEvent(
      new PointerEvent('pointermove', { bubbles: true, clientX, pointerId: 1 }),
    );
  });
}

function firePointerUp(el: Element) {
  act(() => {
    el.dispatchEvent(
      new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }),
    );
  });
}

// ---------------------------------------------------------------------------
// 1. Rendering
// ---------------------------------------------------------------------------

describe('CustomSlider — rendering', () => {
  it('renders the label span with the config label', () => {
    renderSlider(INTEGER_CONFIG, 180);
    const label = container.querySelector('.tokenpanel-color-picker-slider-label');
    expect(label).not.toBeNull();
    expect(label!.textContent).toBe('H');
  });

  it('renders the slider host with role=slider and tabindex=0', () => {
    renderSlider(INTEGER_CONFIG, 180);
    const host = getSliderHost();
    expect(host.getAttribute('role')).toBe('slider');
    expect(host.getAttribute('tabindex')).toBe('0');
  });

  it('renders the slider host with aria-valuemin/max/now', () => {
    renderSlider(INTEGER_CONFIG, 90);
    const host = getSliderHost();
    expect(host.getAttribute('aria-valuemin')).toBe('0');
    expect(host.getAttribute('aria-valuemax')).toBe('360');
    expect(host.getAttribute('aria-valuenow')).toBe('90');
  });

  it('renders the slider host with aria-label from config', () => {
    renderSlider(INTEGER_CONFIG, 90);
    const host = getSliderHost();
    expect(host.getAttribute('aria-label')).toBe('Hue');
  });

  it('renders the track div inside the slider host', () => {
    renderSlider(INTEGER_CONFIG, 180);
    const track = container.querySelector('.tokenpanel-color-picker-slider-track');
    expect(track).not.toBeNull();
  });

  it('sets the gradient on the track background style', () => {
    renderSlider(INTEGER_CONFIG, 180);
    const track = container.querySelector<HTMLElement>('.tokenpanel-color-picker-slider-track');
    expect(track).not.toBeNull();
    // The background style must contain the gradient value
    expect(track!.style.background).toBe(GRADIENT);
  });

  it('renders the thumb with left% proportional to the value fraction', () => {
    // value=90 of [0..360] → fraction=0.25 → left=25%
    renderSlider(INTEGER_CONFIG, 90);
    const thumb = container.querySelector<HTMLElement>('.tokenpanel-color-picker-slider-thumb');
    expect(thumb).not.toBeNull();
    expect(thumb!.style.left).toBe('25%');
  });

  it('renders the value span with the formatted value', () => {
    renderSlider(INTEGER_CONFIG, 180);
    const valueSpan = container.querySelector('.tokenpanel-color-picker-slider-value');
    expect(valueSpan).not.toBeNull();
    expect(valueSpan!.textContent).toBe('180°');
  });

  it('renders exactly 3 top-level children in the row: label, slider host, value', () => {
    renderSlider(INTEGER_CONFIG, 180);
    const row = container.querySelector('.tokenpanel-color-picker-slider-row');
    expect(row).not.toBeNull();
    // Children: label span, slider div, value span
    expect(row!.children.length).toBe(3);
    expect(row!.children[0].className).toContain('slider-label');
    expect(row!.children[1].getAttribute('role')).toBe('slider');
    expect(row!.children[2].className).toContain('slider-value');
  });
});

// ---------------------------------------------------------------------------
// 2. Keyboard navigation
// ---------------------------------------------------------------------------

describe('CustomSlider — keyboard navigation (integer step)', () => {
  it('ArrowRight increases value by step', () => {
    const { onChange } = renderSlider(INTEGER_CONFIG, 180);
    fireKey(getSliderHost(), 'ArrowRight');
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith(181);
  });

  it('ArrowLeft decreases value by step', () => {
    const { onChange } = renderSlider(INTEGER_CONFIG, 180);
    fireKey(getSliderHost(), 'ArrowLeft');
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith(179);
  });

  it('ArrowUp increases value by step', () => {
    const { onChange } = renderSlider(INTEGER_CONFIG, 180);
    fireKey(getSliderHost(), 'ArrowUp');
    expect(onChange).toHaveBeenCalledWith(181);
  });

  it('ArrowDown decreases value by step', () => {
    const { onChange } = renderSlider(INTEGER_CONFIG, 180);
    fireKey(getSliderHost(), 'ArrowDown');
    expect(onChange).toHaveBeenCalledWith(179);
  });

  it('Shift+ArrowRight increases value by 10× step', () => {
    const { onChange } = renderSlider(INTEGER_CONFIG, 180);
    fireKey(getSliderHost(), 'ArrowRight', true);
    expect(onChange).toHaveBeenCalledWith(190);
  });

  it('Shift+ArrowLeft decreases value by 10× step', () => {
    const { onChange } = renderSlider(INTEGER_CONFIG, 180);
    fireKey(getSliderHost(), 'ArrowLeft', true);
    expect(onChange).toHaveBeenCalledWith(170);
  });

  it('Home sets value to min', () => {
    const { onChange } = renderSlider(INTEGER_CONFIG, 180);
    fireKey(getSliderHost(), 'Home');
    expect(onChange).toHaveBeenCalledWith(0);
  });

  it('End sets value to max', () => {
    const { onChange } = renderSlider(INTEGER_CONFIG, 180);
    fireKey(getSliderHost(), 'End');
    expect(onChange).toHaveBeenCalledWith(360);
  });

  it('clamps ArrowRight at max', () => {
    const { onChange } = renderSlider(INTEGER_CONFIG, 360);
    fireKey(getSliderHost(), 'ArrowRight');
    expect(onChange).toHaveBeenCalledWith(360);
  });

  it('clamps ArrowLeft at min', () => {
    const { onChange } = renderSlider(INTEGER_CONFIG, 0);
    fireKey(getSliderHost(), 'ArrowLeft');
    expect(onChange).toHaveBeenCalledWith(0);
  });

  it('ignores unrelated keys', () => {
    const { onChange } = renderSlider(INTEGER_CONFIG, 180);
    fireKey(getSliderHost(), 'Tab');
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('CustomSlider — keyboard navigation (fractional step)', () => {
  it('ArrowRight increases value by fractional step', () => {
    const { onChange } = renderSlider(FRACTIONAL_CONFIG, 0.5);
    fireKey(getSliderHost(), 'ArrowRight');
    expect(onChange).toHaveBeenCalledOnce();
    // 0.5 + 0.01 = 0.51 — no rounding applied (sub-1 step passes through)
    expect(onChange).toHaveBeenCalledWith(expect.closeTo(0.51, 10));
  });

  it('Shift+ArrowRight increases by 10× step for fractional config', () => {
    const { onChange } = renderSlider(FRACTIONAL_CONFIG, 0.5);
    fireKey(getSliderHost(), 'ArrowRight', true);
    // coarse = 0.01 * 10 = 0.1 → 0.5 + 0.1 = 0.6
    expect(onChange).toHaveBeenCalledWith(expect.closeTo(0.6, 10));
  });
});

// ---------------------------------------------------------------------------
// 3. Pointer events (event sequencing — no geometry)
// ---------------------------------------------------------------------------

describe('CustomSlider — pointer event sequencing', () => {
  it('pointerdown fires onDragStart', () => {
    const { onDragStart } = renderSlider(INTEGER_CONFIG, 180);
    firePointerDown(getSliderHost());
    expect(onDragStart).toHaveBeenCalledOnce();
  });

  it('pointermove after pointerdown fires onChange with geometry-based value', () => {
    // jsdom returns zero-width rects by default, so mock getBoundingClientRect
    // to give the slider host a known non-zero width. This lets valueFromPointerX
    // compute a real value so we can assert onChange is called correctly.
    const { onChange } = renderSlider(INTEGER_CONFIG, 180);
    const host = getSliderHost();
    host.getBoundingClientRect = () =>
      ({
        left: 0,
        width: 100,
        top: 0,
        height: 10,
        right: 100,
        bottom: 10,
        x: 0,
        y: 0,
        toJSON() {
          return this;
        },
      }) as DOMRect;

    // pointerdown at x=0 → value = min (0)
    firePointerDown(host, 0);
    // pointermove at x=75 → fraction=0.75 → value = 0 + 0.75*360 = 270
    firePointerMove(host, 75);
    expect(onChange).toHaveBeenCalledWith(270);
  });

  it('pointerup after pointerdown fires onDragEnd', () => {
    const { onDragEnd } = renderSlider(INTEGER_CONFIG, 180);
    firePointerDown(getSliderHost());
    firePointerUp(getSliderHost());
    expect(onDragEnd).toHaveBeenCalledOnce();
  });

  it('pointermove without prior pointerdown does not fire onChange', () => {
    const { onChange } = renderSlider(INTEGER_CONFIG, 180);
    firePointerMove(getSliderHost(), 50);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('pointerup without prior pointerdown does not fire onDragEnd', () => {
    const { onDragEnd } = renderSlider(INTEGER_CONFIG, 180);
    firePointerUp(getSliderHost());
    expect(onDragEnd).not.toHaveBeenCalled();
  });

  it('onDragStart fires before onDragEnd in a drag sequence', () => {
    const order: string[] = [];
    renderSlider(INTEGER_CONFIG, 180, {
      onDragStart: () => order.push('start'),
      onDragEnd: () => order.push('end'),
    });
    firePointerDown(getSliderHost());
    firePointerMove(getSliderHost(), 100);
    firePointerUp(getSliderHost());
    expect(order).toEqual(['start', 'end']);
  });
});

// ---------------------------------------------------------------------------
// 4. Value clamping
// ---------------------------------------------------------------------------

describe('CustomSlider — value clamping in keyboard handler', () => {
  it('value above max is clamped to max on ArrowRight', () => {
    // Simulate value=355 with step=10 → 355+10=365 clamped to 360
    const config: SliderConfig = { ...INTEGER_CONFIG, step: 10 };
    const { onChange } = renderSlider(config, 355);
    fireKey(getSliderHost(), 'ArrowRight');
    expect(onChange).toHaveBeenCalledWith(360);
  });

  it('value below min is clamped to min on ArrowLeft', () => {
    const config: SliderConfig = { ...INTEGER_CONFIG, step: 10 };
    const { onChange } = renderSlider(config, 5);
    fireKey(getSliderHost(), 'ArrowLeft');
    expect(onChange).toHaveBeenCalledWith(0);
  });
});

// ---------------------------------------------------------------------------
// 5. DOM hygiene
// ---------------------------------------------------------------------------

describe('CustomSlider — DOM hygiene', () => {
  it('renders no <button> elements', () => {
    renderSlider(INTEGER_CONFIG, 180);
    expect(container.querySelectorAll('button').length).toBe(0);
  });

  it('renders no <input> elements', () => {
    renderSlider(INTEGER_CONFIG, 180);
    expect(container.querySelectorAll('input').length).toBe(0);
  });

  it('renders the outer wrapper as a div', () => {
    renderSlider(INTEGER_CONFIG, 180);
    const row = container.querySelector('.tokenpanel-color-picker-slider-row');
    expect(row?.tagName.toLowerCase()).toBe('div');
  });
});

// ---------------------------------------------------------------------------
// 6. Pointer step-snap (review fix: pointer must honor config.step)
// ---------------------------------------------------------------------------

describe('CustomSlider — pointer step snapping', () => {
  // Mount with a known geometry so valueFromPointerX can compute a real value.
  function mountWithGeom(config: SliderConfig, value: number) {
    const result = renderSlider(config, value);
    const host = getSliderHost();
    host.getBoundingClientRect = () =>
      ({
        left: 0,
        width: 100,
        top: 0,
        height: 10,
        right: 100,
        bottom: 10,
        x: 0,
        y: 0,
        toJSON() {
          return this;
        },
      }) as DOMRect;
    return { ...result, host };
  }

  it('snaps pointer x to integer step on a step:1 slider', () => {
    // x=37.4 of width=100 → raw fraction=0.374 → raw value=134.64
    // step=1 → snapped to 135
    const { onChange, host } = mountWithGeom(INTEGER_CONFIG, 0);
    firePointerDown(host, 37.4);
    expect(onChange).toHaveBeenCalledWith(135);
  });

  it('snaps pointer x to fractional step on a step:0.01 slider', () => {
    // x=33 of width=100 → raw fraction=0.33 → raw value=0.33
    // step=0.01 → snapped to 0.33 (exact)
    const { onChange, host } = mountWithGeom(FRACTIONAL_CONFIG, 0);
    firePointerDown(host, 33.4);
    // 33.4/100 = 0.334; snapped to 0.33
    expect(onChange).toHaveBeenCalledWith(expect.closeTo(0.33, 10));
  });
});

// ---------------------------------------------------------------------------
// 7. ARIA valuetext (review fix: screen readers get formatted display)
// ---------------------------------------------------------------------------

describe('CustomSlider — aria-valuetext', () => {
  it('sets aria-valuetext to the formatted value', () => {
    renderSlider(INTEGER_CONFIG, 180);
    const host = getSliderHost();
    expect(host.getAttribute('aria-valuetext')).toBe('180°');
  });

  it('updates aria-valuetext when value changes', () => {
    renderSlider(FRACTIONAL_CONFIG, 0.42);
    const host = getSliderHost();
    expect(host.getAttribute('aria-valuetext')).toBe('0.42');
  });
});
