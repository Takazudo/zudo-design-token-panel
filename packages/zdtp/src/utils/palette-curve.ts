/**
 * OKLCH channel-curve math for the palette generator chart.
 *
 * Coordinate conventions:
 *   X axis — normalized band position in [0, 1]; a node at index i is centered
 *             at (i + 0.5) / count via `stepX`.
 *   Y axis — normalized [0, 1] where 0 = top (maximum channel value) and
 *             1 = bottom (minimum channel value = 0); consistent with SVG/canvas
 *             coordinate systems where Y increases downward.
 */

import { MAX_OKLCH_CHROMA } from './color-oklch';

/** Maximum value for each OKLCH channel (defines the Y=0 ceiling). */
export const CHANNEL_MAX = {
  l: 100,
  c: MAX_OKLCH_CHROMA,
  h: 360,
} as const;

export type Channel = 'l' | 'c' | 'h';

/**
 * Return the centered X coordinate for node at index `i` across `count` bands.
 * X is in [0, 1]; each band has width 1/count and is centered at (i+0.5)/count.
 */
export function stepX(i: number, count: number): number {
  return (i + 0.5) / count;
}

/**
 * Map a channel value to a normalized Y coordinate in [0, 1].
 *
 * Y=0 corresponds to the channel maximum (top of axis).
 * Y=1 corresponds to zero (bottom of axis).
 *
 * H note: 0° and 360° are the same hue, but we clamp (not wrap) to keep the
 * polyline continuous — matching the pgen chart convention.
 */
export function valueToY(value: number, channel: Channel): number {
  const max = CHANNEL_MAX[channel];
  const clamped = Math.max(0, Math.min(max, value));
  return 1 - clamped / max;
}

/**
 * Map a normalized Y coordinate in [0, 1] back to a channel value.
 *
 * Inverse of `valueToY`. Y is clamped to [0, 1] before conversion.
 *
 * H note: 0° ≡ 360° (top and bottom of the Y axis are the same hue) — this is
 * a deliberate clamp-not-wrap decision to avoid polyline discontinuity,
 * matching pgen.
 */
export function yToValue(y: number, channel: Channel): number {
  const max = CHANNEL_MAX[channel];
  const clampedY = Math.max(0, Math.min(1, y));
  return (1 - clampedY) * max;
}

/**
 * Largest hue (degrees) that survives a CSS `oklch()` round-trip.
 *
 * The chart axis spans the full [0, 360] (CHANNEL_MAX.h), so a node dragged to
 * the very top of the hue axis (or the End key) yields h=360. But CSS hue angles
 * normalize into [0, 360) when an `oklch(… 360)` string is parsed back
 * (`cssToOklcha` → `((deg % 360) + 360) % 360`), so a persisted 360 reads back as
 * 0 and the node teleports to the bottom on reload. Committed hues are therefore
 * capped at this value: just below 360, and chosen so `oklchaToCss`'s 2-decimal
 * formatting (`toFixed(2)`) preserves it rather than rounding back up to 360.00.
 */
export const HUE_PERSIST_MAX = 359.99;

/**
 * Cap a hue for persistence so an `oklch()` round-trip stays stable.
 * Hues at/above 360° collapse to {@link HUE_PERSIST_MAX}; everything else is
 * returned unchanged. Apply this only at the commit boundary — the live axis
 * math (`valueToY`/`yToValue`) intentionally keeps the full [0, 360] range.
 */
export function clampHueForPersist(h: number): number {
  return h >= 360 ? HUE_PERSIST_MAX : h;
}
