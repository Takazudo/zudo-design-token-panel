/** @jsxImportSource @takazudo/zfb/zudo-react */
import { computed, getScope, type Ref } from '@takazudo/zfb/zudo-react';
import type { Live } from '../../zr/live';

// ---------------------------------------------------------------------------
// SliderConfig / CustomSliderProps
//
// Used by OklchPicker for L/C/H and alpha sliders. The track div accepts a
// CSS gradient string so the consumer can pass an OKLCH-interpolated gradient
// as the track background — something an <input type="range"> cannot do with
// a custom gradient without extra wrapper markup.
// ---------------------------------------------------------------------------

export interface SliderConfig {
  key: string;
  /** Single-character label, e.g. 'L', 'H'. */
  label: string;
  /** Full accessible label, e.g. 'Lightness', 'Hue'. */
  ariaLabel: string;
  min: number;
  max: number;
  step: number;
  /** Format the numeric value for display in the value span. */
  format: (v: number) => string;
}

export interface CustomSliderProps {
  disabled?: boolean;
  config: SliderConfig;
  value: number;
  /** CSS gradient string applied to the track div's background. */
  gradient: string;
  onChange: (next: number) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}

export type CustomSliderLiveProps = Live<CustomSliderProps, 'onChange' | 'onDragStart' | 'onDragEnd'>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// Snap a continuous value to the nearest step boundary relative to min.
// Without this, pointer interaction emits off-grid floats (e.g. 0.317 on a
// step:1 slider) while keyboard input stays snapped — the same control
// would round-trip differently depending on input method.
function snapToStep(value: number, min: number, step: number): number {
  if (step <= 0) return value;
  const steps = Math.round((value - min) / step);
  return min + steps * step;
}

// ---------------------------------------------------------------------------
// CustomSlider
//
// Implements pointer-capture drag, click-to-jump, and keyboard navigation.
// A zudo-react component: data props arrive as live signals (see `Live`).
// Rendered as a <div role="slider"> — NOT <input type="range"> — so the track
// div can carry an arbitrary OKLCH-interpolated CSS gradient.
//
// BEM class names (locked external contract):
//   tokenpanel-color-picker-slider-row    — outer wrapper
//   tokenpanel-color-picker-slider-label  — left label span
//   tokenpanel-color-picker-slider        — track host; role="slider"
//   tokenpanel-color-picker-slider-track  — gradient background div
//   tokenpanel-color-picker-slider-thumb  — draggable thumb div
//   tokenpanel-color-picker-slider-value  — right value span
// ---------------------------------------------------------------------------

export function CustomSlider(props: CustomSliderLiveProps) {
  const { config, value, gradient, onChange, onDragStart, onDragEnd } = props;
  const disabled = computed(() => props.disabled.value ?? false);
  const track: Ref<HTMLDivElement> = { current: null };
  let isDragging = false;

  const fraction = computed(() => {
    const { min, max } = config.value;
    return clamp((value.value - min) / (max - min), 0, 1);
  });
  const valueText = computed(() => config.value.format(value.value));

  getScope().effect(() => {
    if (disabled.value && isDragging) {
      isDragging = false;
      onDragEnd();
    }
  });

  // Compute value from pointer x position relative to the track.
  // Returns null when the rect has zero width (jsdom in tests).
  function valueFromPointerX(clientX: number): number | null {
    const el = track.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0) return null;
    const { min, max, step } = config.value;
    const f = clamp((clientX - rect.left) / rect.width, 0, 1);
    // Snap to step so pointer and keyboard interaction emit the same grid.
    return clamp(snapToStep(min + f * (max - min), min, step), min, max);
  }

  function handlePointerDown(e: PointerEvent) {
    if (disabled.value) return;
    isDragging = true;
    onDragStart();
    // Pointer capture keeps events flowing even if pointer leaves the element.
    try {
      track.current!.setPointerCapture(e.pointerId);
    } catch {
      // jsdom does not implement setPointerCapture; ignore.
    }
    // Click-to-jump on pointerdown so the thumb snaps immediately.
    const next = valueFromPointerX(e.clientX);
    if (next !== null) onChange(next);
  }

  function handlePointerMove(e: PointerEvent) {
    if (disabled.value || !isDragging) return;
    const next = valueFromPointerX(e.clientX);
    if (next !== null) onChange(next);
  }

  function endDrag(e: PointerEvent) {
    if (!isDragging) return;
    isDragging = false;
    try {
      track.current!.releasePointerCapture(e.pointerId);
    } catch {
      // jsdom does not implement releasePointerCapture; ignore.
    }
    onDragEnd();
  }

  // ArrowRight / ArrowUp  → +step (or +coarse with Shift)
  // ArrowLeft  / ArrowDown → -step (or -coarse with Shift)
  // Home → min; End → max
  // Coarse multiplier: step * 10 (handles both integer and sub-1 steps uniformly)
  function handleKeyDown(e: KeyboardEvent) {
    if (disabled.value) return;
    const { min, max, step } = config.value;
    const coarse = step * 10;
    let delta = 0;

    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        delta = e.shiftKey ? coarse : step;
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        delta = e.shiftKey ? -coarse : -step;
        break;
      case 'Home':
        onChange(min);
        e.preventDefault();
        return;
      case 'End':
        onChange(max);
        e.preventDefault();
        return;
      default:
        return;
    }

    e.preventDefault();
    onChange(clamp(value.value + delta, min, max));
  }

  return (
    <div class="tokenpanel-color-picker-slider-row">
      <span class="tokenpanel-color-picker-slider-label">{computed(() => config.value.label)}</span>

      {/* Slider host: role=slider carries ARIA semantics. */}
      <div
        ref={track}
        role="slider"
        tabindex={computed(() => (disabled.value ? -1 : 0))}
        aria-disabled={computed(() => (disabled.value ? true : null))}
        class="tokenpanel-color-picker-slider"
        aria-label={computed(() => config.value.ariaLabel)}
        aria-valuemin={computed(() => config.value.min)}
        aria-valuemax={computed(() => config.value.max)}
        aria-valuenow={value}
        // Screen readers announce aria-valuetext (with units, e.g. "180°")
        // in preference to the raw aria-valuenow when both are present.
        aria-valuetext={valueText}
        on:keydown={handleKeyDown}
        on:pointerdown={handlePointerDown}
        on:pointermove={handlePointerMove}
        on:pointerup={endDrag}
        on:pointercancel={endDrag}
      >
        {/* Gradient track — background set to the OKLCH-interpolated gradient string */}
        <div
          class="tokenpanel-color-picker-slider-track"
          style={computed(() => ({ background: gradient.value }))}
        />

        {/* Thumb — absolutely positioned at the current fraction */}
        <div
          class="tokenpanel-color-picker-slider-thumb"
          style={computed(() => ({ left: `${fraction.value * 100}%` }))}
        />
      </div>

      <span class="tokenpanel-color-picker-slider-value">{valueText}</span>
    </div>
  );
}

export default CustomSlider;
