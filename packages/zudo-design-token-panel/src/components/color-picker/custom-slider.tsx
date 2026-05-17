import { useCallback, useEffect, useRef } from 'preact/compat';
import type { JSX } from 'preact';

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
  config: SliderConfig;
  value: number;
  /** CSS gradient string applied to the track div's background. */
  gradient: string;
  onChange: (next: number) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}

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

export function CustomSlider({
  config,
  value,
  gradient,
  onChange,
  onDragStart,
  onDragEnd,
}: CustomSliderProps): JSX.Element {
  const { label, ariaLabel, min, max, step, format } = config;
  const stepRef = useRef(step);
  stepRef.current = step;

  const isDragging = useRef(false);
  const trackRef = useRef<HTMLDivElement>(null);

  const fraction = clamp((value - min) / (max - min), 0, 1);

  // Keep stable refs for callbacks so the useEffect below does not need to
  // re-register listeners on every render when the parent re-renders.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onDragStartRef = useRef(onDragStart);
  onDragStartRef.current = onDragStart;
  const onDragEndRef = useRef(onDragEnd);
  onDragEndRef.current = onDragEnd;

  // Keep min/max in refs as well so pointer handlers close over stable refs.
  const minRef = useRef(min);
  minRef.current = min;
  const maxRef = useRef(max);
  maxRef.current = max;

  // Compute value from pointer x position relative to the track.
  // Returns null when the rect has zero width (jsdom in tests).
  function valueFromPointerX(clientX: number): number | null {
    const el = trackRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0) return null;
    const f = clamp((clientX - rect.left) / rect.width, 0, 1);
    const raw = minRef.current + f * (maxRef.current - minRef.current);
    // Snap to step so pointer and keyboard interaction emit the same grid.
    const snapped = snapToStep(raw, minRef.current, stepRef.current);
    return clamp(snapped, minRef.current, maxRef.current);
  }

  // ---- Pointer handlers via addEventListener --------------------------------
  //
  // Preact's JSX event delegation checks `lowerCaseName in dom` to decide
  // whether to use the lowercase event name. jsdom does NOT expose
  // `onpointerdown` / `onpointermove` / `onpointerup` on elements, so Preact
  // falls through and registers "PointerDown" (wrong case) — tests dispatching
  // "pointerdown" never fire the handler. Using addEventListener directly
  // bypasses this heuristic and works correctly in both jsdom and browsers.

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    function handlePointerDown(e: PointerEvent) {
      isDragging.current = true;
      onDragStartRef.current();

      // Pointer capture keeps events flowing even if pointer leaves the element.
      try {
        el!.setPointerCapture(e.pointerId);
      } catch {
        // jsdom does not implement setPointerCapture; ignore.
      }

      // Click-to-jump on pointerdown so the thumb snaps immediately.
      const next = valueFromPointerX(e.clientX);
      if (next !== null) onChangeRef.current(next);
    }

    function handlePointerMove(e: PointerEvent) {
      if (!isDragging.current) return;
      const next = valueFromPointerX(e.clientX);
      if (next !== null) onChangeRef.current(next);
    }

    function handlePointerUp(e: PointerEvent) {
      if (!isDragging.current) return;
      isDragging.current = false;

      try {
        el!.releasePointerCapture(e.pointerId);
      } catch {
        // jsdom does not implement releasePointerCapture; ignore.
      }

      onDragEndRef.current();
    }

    function handlePointerCancel(e: PointerEvent) {
      if (!isDragging.current) return;
      isDragging.current = false;

      try {
        el!.releasePointerCapture(e.pointerId);
      } catch {
        // jsdom does not implement releasePointerCapture; ignore.
      }

      onDragEndRef.current();
    }

    el.addEventListener('pointerdown', handlePointerDown);
    el.addEventListener('pointermove', handlePointerMove);
    el.addEventListener('pointerup', handlePointerUp);
    el.addEventListener('pointercancel', handlePointerCancel);

    return () => {
      el.removeEventListener('pointerdown', handlePointerDown);
      el.removeEventListener('pointermove', handlePointerMove);
      el.removeEventListener('pointerup', handlePointerUp);
      el.removeEventListener('pointercancel', handlePointerCancel);
    };
    // Empty dependency array: handlers are stable (use refs for callbacks).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Keyboard handler -------------------------------------------------------
  // ArrowRight / ArrowUp  → +step (or +coarse with Shift)
  // ArrowLeft  / ArrowDown → -step (or -coarse with Shift)
  // Home → min; End → max
  // Coarse multiplier: step * 10 (handles both integer and sub-1 steps uniformly)

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
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
      onChange(clamp(value + delta, min, max));
    },
    [value, min, max, step, onChange],
  );

  // ---- Render ---------------------------------------------------------------

  return (
    <div className="tokenpanel-color-picker-slider-row">
      <span className="tokenpanel-color-picker-slider-label">{label}</span>

      {/* Slider host: role=slider carries ARIA semantics; pointer events wired
          via addEventListener in useEffect (jsdom compatibility); keyboard here */}
      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        className="tokenpanel-color-picker-slider"
        aria-label={ariaLabel}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        // Screen readers announce aria-valuetext (with units, e.g. "180°")
        // in preference to the raw aria-valuenow when both are present.
        aria-valuetext={format(value)}
        onKeyDown={handleKeyDown}
      >
        {/* Gradient track — background set to the OKLCH-interpolated gradient string */}
        <div
          className="tokenpanel-color-picker-slider-track"
          style={{ background: gradient }}
        />

        {/* Thumb — absolutely positioned at the current fraction */}
        <div
          className="tokenpanel-color-picker-slider-thumb"
          style={{ left: `${fraction * 100}%` }}
        />
      </div>

      <span className="tokenpanel-color-picker-slider-value">{format(value)}</span>
    </div>
  );
}

export default CustomSlider;
