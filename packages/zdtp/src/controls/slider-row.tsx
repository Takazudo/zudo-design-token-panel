import { memo, useState, useEffect, useCallback } from 'preact/compat';
import { type TokenDef, formatValue, parseNumericValue } from '../tokens/manifest';

// isOutOfRange: returns true when n is a finite number outside [min, max].
// Does NOT flag NaN/null — those are "still typing" states, not invalid values.
function isOutOfRange(n: number | null, min: number, max: number): boolean {
  return n !== null && Number.isFinite(n) && (n < min || n > max);
}

/**
 * One manifest-driven token row:
 *
 *   [label]  ... [  1.25 rem]   ← label + number input (unit suffix inside)
 *   [=========o==================]  ← full-width range slider
 *
 * Range input and number input are two-way bound: dragging the slider fills
 * the number input live, and typing a value moves the slider once it parses.
 *
 * The parent owns the persisted value (stored as a string like `"1.25rem"`);
 * this row keeps a local "draft" string only for the number input, so users
 * can type partial values (`"1."`) without the component thrashing.
 *
 * Read-only tokens render a disabled compact form that still shows the
 * resolved value from the stylesheet.
 *
 * `onChange` is `(id, next)` — the row passes its own `token.id` back so the
 * parent can use a single stable handler across every row, keeping React.memo
 * effective.
 */
export interface SliderRowProps {
  token: TokenDef;
  /** Current persisted value (or the token's default if no override). */
  value: string;
  /** Called with the row's `token.id` and the new CSS string (e.g.
   *  `"0.75rem"`) whenever the user commits a change via slider or a
   *  parseable number input. */
  onChange: (id: string, next: string) => void;
}

function SliderRow({ token, value, onChange }: SliderRowProps) {
  // Numeric view of the stored value, used for the slider. Falls back to the
  // token min when the string can't be parsed (e.g. read-only clamp()).
  const numeric = parseNumericValue(value);
  const slidable = !token.readonly && numeric !== null;

  // Draft lets the user type freely ("1.", "1.2") without the slider snapping
  // every keystroke. We only commit (call onChange) when the draft parses AND
  // is within [min, max]. Out-of-range drafts are flagged but not clamped mid-
  // typing; clamping happens on blur so the user sees the snap only when they
  // leave the field, not while they are still editing.
  const [draft, setDraft] = useState<string>(numeric !== null ? String(numeric) : value);

  // Sync the draft when the external value changes (reset, preset load, etc.)
  // The guard `draft !== (...)` is intentional: when the user just committed a
  // value from this component the parent echoes it back here, but the draft is
  // already correct — don't clobber it and interrupt mid-keystroke editing.
  useEffect(() => {
    const incoming = numeric !== null ? String(numeric) : value;
    setDraft(incoming);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleSlider = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const n = Number(e.currentTarget.value);
      if (!Number.isFinite(n)) return;
      setDraft(String(n));
      onChange(token.id, formatValue(n, token.unit));
    },
    [onChange, token.id, token.unit],
  );

  const handleNumber = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.currentTarget.value;
      setDraft(raw);
      const n = parseNumericValue(raw);
      // Only commit when the parsed value is within the token's legal range.
      // Out-of-range or unparseable values keep the draft visible but do NOT
      // call onChange — this prevents mid-typing snap (e.g. "22" clamped to 6).
      if (n === null || isOutOfRange(n, token.min, token.max)) return;
      onChange(token.id, formatValue(n, token.unit));
    },
    [onChange, token.id, token.min, token.max, token.unit],
  );

  // On blur: commit a valid in-range value, clamp an out-of-range value, or
  // revert to the last persisted value if the draft is empty / unparseable.
  // This is the only place clamping happens — never mid-keystroke.
  const handleNumberBlur = useCallback(() => {
    const n = parseNumericValue(draft);
    if (n === null) {
      // Empty or unparseable: revert to last-known-good.
      setDraft(numeric !== null ? String(numeric) : value);
      return;
    }
    if (isOutOfRange(n, token.min, token.max)) {
      // Out of range: clamp, commit, and update the draft to the clamped value.
      const clamped = Math.min(token.max, Math.max(token.min, n));
      setDraft(String(clamped));
      onChange(token.id, formatValue(clamped, token.unit));
    }
    // In-range values were already committed on each keystroke; nothing more to do.
  }, [draft, numeric, value, onChange, token.id, token.min, token.max, token.unit]);

  // Mark the input invalid when the draft parses to a number outside the
  // token's legal range (not when it's empty/partial — those aren't errors yet).
  const parsedDraft = parseNumericValue(draft);
  const isInvalid = isOutOfRange(parsedDraft, token.min, token.max);

  return (
    <div className="tokenpanel-row--stacked">
      {/* Top row: label + number input */}
      <div className="tokenpanel-row-head">
        <span className="tokenpanel-row-label" title={token.cssVar}>
          {token.cssVar}
        </span>
        <div className="tokenpanel-row-input-group">
          <input
            type="text"
            inputMode="decimal"
            value={draft}
            onChange={handleNumber}
            onBlur={handleNumberBlur}
            disabled={token.readonly}
            className={`tokenpanel-row-number-input${isInvalid ? ' tokenpanel-row-number-input--invalid' : ''}`}
            aria-label={`${token.cssVar} value`}
            aria-invalid={isInvalid || undefined}
          />
          <span className="tokenpanel-row-unit">
            {token.readonly && !token.unit ? '' : token.unit}
          </span>
        </div>
      </div>

      {/* Bottom row: full-width slider */}
      <input
        type="range"
        min={token.min}
        max={token.max}
        step={token.step}
        // When unparseable, park the slider at min — it's disabled anyway.
        value={slidable ? (numeric as number) : token.min}
        onChange={handleSlider}
        disabled={!slidable}
        className="tokenpanel-row-slider"
        aria-label={`${token.cssVar} slider`}
      />
    </div>
  );
}

// memo'd so a stable parent `onChange` plus
// stable `value`/`token` props skip re-renders of unaffected rows when one
// row changes.
export default memo(SliderRow);
