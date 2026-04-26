import { memo, useState, useEffect, useCallback } from 'preact/compat';
import { type TokenDef, formatValue, parseNumericValue } from '../tokens/manifest';

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
 * effective (PR #1440 review item Q3).
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
  // every keystroke. We only commit (call onChange) when the draft parses.
  const [draft, setDraft] = useState<string>(numeric !== null ? String(numeric) : value);

  // Sync the draft when the external value changes (reset, preset load, etc.)
  useEffect(() => {
    setDraft(numeric !== null ? String(numeric) : value);
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
      if (n === null) return; // wait for a parseable value before committing
      // Clamp into the token's legal range on commit to keep the slider sane.
      const clamped = Math.min(token.max, Math.max(token.min, n));
      onChange(token.id, formatValue(clamped, token.unit));
    },
    [onChange, token.id, token.min, token.max, token.unit],
  );

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
            disabled={token.readonly}
            className="tokenpanel-row-number-input"
            aria-label={`${token.cssVar} value`}
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

// memo'd so a stable parent `onChange` (PR #1440 review item Q3) plus
// stable `value`/`token` props skip re-renders of unaffected rows when one
// row changes.
export default memo(SliderRow);
