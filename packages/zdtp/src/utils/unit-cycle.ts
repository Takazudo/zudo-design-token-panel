/**
 * Helpers for the opt-in click-to-cycle unit suffix on `length`-kind value
 * rows (#519). Pure, DOM-free — safe to import from any editor component.
 *
 * `deriveCyclableUnit` is the single source of the opt-in/divergence policy;
 * both editor call sites (`tabs/_generic-item-editor.tsx` and
 * `tabs/generic-tab.tsx`) call it instead of re-deriving the same state.
 */

/**
 * Split a stored length value (e.g. `"1.5rem"`, `".5rem"`) into its numeric
 * magnitude and unit suffix. Accepts the same leading-number shapes as the
 * platform's own `parseFloat` (leading-dot decimals included, e.g. `.5`) so
 * this parser and `parseFloat(value)` never disagree on the same input.
 * Mirrors (and slightly widens) the leading-number regex in
 * `tokens/manifest.ts#parseNumericValue`; also returns the trailing suffix
 * text so the interactive unit control can display the value's ACTUAL
 * stored suffix rather than assuming the item's declared `type.unit` (a
 * stored value can diverge from the declared unit — imported data, a
 * manifest change, etc.).
 *
 * Returns `null` when the value has no leading number (e.g. a `clamp()`
 * expression on a readonly row).
 */
export function splitLengthValue(value: string): { magnitude: number; suffix: string } | null {
  const match = value.trim().match(/^(-?(?:\d+\.\d*|\.\d+|\d+))(.*)$/);
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

export interface CyclableUnitState {
  /** Declared cyclable unit list — defined only when 2+ entries were declared. */
  cyclableUnits: readonly string[] | undefined;
  /** True iff `cyclableUnits` is defined (2+ entries) — the row is interactive.
   *  A present-but-single-entry (or omitted) `units` list is a DELIBERATE
   *  "not opted in yet" signal, not a config error — it keeps today's static,
   *  non-interactive unit span pixel-identical. */
  isCyclableUnit: boolean;
  /** Unit suffix to display, and to cycle FROM on the next activation. */
  effectiveUnit: string;
  /**
   * Magnitude parsed by the SAME pass that produced `effectiveUnit` — reuse
   * this (not a separately-computed `parseFloat(value)`) when emitting a
   * post-cycle value, so the suffix-detection parse and the magnitude the
   * cycle emits can never disagree. `null` when the stored value did not
   * parse as a length at all; callers should fall back to their own
   * last-known-good numeric state (e.g. the number input's draft) in that
   * case.
   */
  parsedMagnitude: number | null;
}

/**
 * Derive the full opt-in/display/divergence state for a `length`-kind row's
 * unit suffix from its declared `unit`/`units` and its current stored
 * `value`. Single source of truth for both editor call sites.
 */
export function deriveCyclableUnit(
  unit: string,
  units: readonly string[] | undefined,
  value: string,
): CyclableUnitState {
  const isCyclableUnit = units !== undefined && units.length >= 2;
  if (!isCyclableUnit) {
    return { cyclableUnits: undefined, isCyclableUnit: false, effectiveUnit: unit, parsedMagnitude: null };
  }
  const parsed = splitLengthValue(value);
  // A non-empty parsed suffix is shown verbatim, even when it diverges from
  // `units` (imported data, a manifest change) — the first cycle click lands
  // on units[0] via `nextCyclableUnit`'s not-found branch. An UNPARSEABLE
  // value or a parsed-but-EMPTY suffix are degenerate cases, not meaningful
  // divergence: falling back to `unit` could still be empty (a length row
  // can be misconfigured with `unit: ''`), so fall all the way to `units[0]`
  // — the interactive suffix must never render an empty, zero-width button.
  const effectiveUnit = parsed !== null && parsed.suffix !== '' ? parsed.suffix : units[0];
  return {
    cyclableUnits: units,
    isCyclableUnit: true,
    effectiveUnit,
    parsedMagnitude: parsed !== null ? parsed.magnitude : null,
  };
}
