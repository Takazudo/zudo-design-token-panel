import { memo, useCallback } from 'preact/compat';
import type { TokenDef } from '../tokens/manifest';

/**
 * One manifest-driven token row backed by a native `<select>`.
 *
 *   [label]                                     [  400 ▾]
 *
 * Used for tokens whose value is one of a small, enumerated set — e.g.
 * `--font-weight-*` (100..900). The selected option string is stored verbatim
 * in persisted state (no numeric round-tripping; font-weight values are
 * conventionally written as bare numbers in CSS).
 *
 * `onChange` is `(id, next)` — the row passes its own `token.id` back so the
 * parent can use a single stable handler across every row, keeping React.memo
 * effective (PR #1440 review item Q3).
 */
export interface SelectRowProps {
  token: TokenDef;
  /** Current persisted value (or the token's default if no override). */
  value: string;
  /** Called with the row's `token.id` and the newly selected option value. */
  onChange: (id: string, next: string) => void;
}

function SelectRow({ token, value, onChange }: SelectRowProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChange(token.id, e.currentTarget.value);
    },
    [onChange, token.id],
  );

  const options = token.options ?? [];
  // Make sure the current value renders even if it isn't in `options` (e.g. a
  // legacy persisted value from an older manifest). Appending it keeps the
  // select from silently losing the user's state.
  const includesValue = options.includes(value);

  return (
    <div className="tokenpanel-row">
      <span className="tokenpanel-row-label" title={token.cssVar}>
        {token.cssVar}
      </span>
      <select
        value={value}
        onChange={handleChange}
        disabled={token.readonly}
        className="tokenpanel-row-select"
        aria-label={`${token.cssVar} value`}
      >
        {!includesValue && (
          <option key={`__fallback:${value}`} value={value}>
            {value}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

// memo'd to skip re-renders of unaffected rows; relies on the parent passing
// a stable `onChange` (PR #1440 review item Q3).
export default memo(SelectRow);
