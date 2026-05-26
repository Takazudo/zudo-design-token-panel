import { memo, useState, useEffect, useCallback } from 'preact/compat';
import { type TokenDef, formatValue, parseNumericValue } from '../tokens/manifest';

/**
 * One manifest-driven token row:
 *
 *   [label]  ... [  1.25 rem]   ← label + number input (unit suffix inside)
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
   *  `"0.75rem"`) whenever the user commits a change via a parseable
   *  number input. */
  onChange: (id: string, next: string) => void;
}

function SliderRow({ token, value, onChange }: SliderRowProps) {
  // Numeric view of the stored value. Falls back to null for unparseable
  // values (e.g. read-only clamp()).
  const numeric = parseNumericValue(value);

  // Draft lets the user type freely ("1.", "1.2") without committing on every
  // keystroke. We only commit (call onChange) when the draft parses to a valid
  // number. Mid-typing partial drafts ("1.", "") do NOT commit.
  const [draft, setDraft] = useState<string>(numeric !== null ? String(numeric) : value);

  // Sync the draft when the external value changes (reset, preset load, etc.)
  // The guard is intentional: when the user just committed a value from this
  // component the parent echoes it back here, but the draft is already correct
  // — don't clobber it and interrupt mid-keystroke editing.
  useEffect(() => {
    const incoming = numeric !== null ? String(numeric) : value;
    setDraft(incoming);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleNumber = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.currentTarget.value;
      setDraft(raw);
      const n = parseNumericValue(raw);
      // Commit every parseable value immediately. Mid-typing partial drafts
      // (null from parseNumericValue) do NOT commit.
      if (n === null) return;
      onChange(token.id, formatValue(n, token.unit));
    },
    [onChange, token.id, token.unit],
  );

  // On blur: revert to last-known-good when the draft is empty or unparseable.
  // Parseable values were already committed on each keystroke — no clamping.
  const handleNumberBlur = useCallback(() => {
    const n = parseNumericValue(draft);
    if (n === null) {
      // Empty or unparseable: revert to last-known-good.
      setDraft(numeric !== null ? String(numeric) : value);
    }
    // Parseable values were already committed on each keystroke; nothing more to do.
  }, [draft, numeric, value]);

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
            className="tokenpanel-row-number-input"
            aria-label={`${token.cssVar} value`}
          />
          <span className="tokenpanel-row-unit">
            {token.readonly && !token.unit ? '' : token.unit}
          </span>
        </div>
      </div>
    </div>
  );
}

// memo'd so a stable parent `onChange` plus
// stable `value`/`token` props skip re-renders of unaffected rows when one
// row changes.
export default memo(SliderRow);
