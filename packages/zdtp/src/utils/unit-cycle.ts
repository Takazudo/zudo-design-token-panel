/**
 * Helpers for the opt-in click-to-cycle unit suffix on `length`-kind value
 * rows (#519). Pure, DOM-free — safe to import from any editor component.
 */

/**
 * Split a stored length value (e.g. `"1.5rem"`) into its numeric magnitude
 * and unit suffix. Mirrors the leading-number regex in
 * `tokens/manifest.ts#parseNumericValue`, but also returns the trailing
 * suffix text so the interactive unit control can display the value's
 * ACTUAL stored suffix rather than assuming the item's declared `type.unit`
 * (a stored value can diverge from the declared unit — imported data, a
 * manifest change, etc.).
 *
 * Returns `null` when the value has no leading number (e.g. a `clamp()`
 * expression on a readonly row).
 */
export function splitLengthValue(value: string): { magnitude: number; suffix: string } | null {
  const match = value.trim().match(/^(-?\d+(?:\.\d+)?)(.*)$/);
  if (!match) return null;
  const magnitude = Number(match[1]);
  if (!Number.isFinite(magnitude)) return null;
  return { magnitude, suffix: match[2].trim() };
}

/**
 * Resolve the next unit when cycling through a declared `units` list
 * (wrapping). When `currentUnit` is not present in `units` — a stored value
 * whose suffix diverged from the declared list — the first activation lands
 * on `units[0]` rather than guessing or throwing.
 */
export function nextCyclableUnit(units: readonly string[], currentUnit: string): string {
  const idx = units.indexOf(currentUnit);
  if (idx === -1) return units[0];
  return units[(idx + 1) % units.length];
}
