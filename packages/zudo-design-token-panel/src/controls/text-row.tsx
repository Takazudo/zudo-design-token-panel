import { memo, useCallback, useEffect, useState } from 'preact/compat';
import type { TokenDef } from '../tokens/manifest';
import { sanitizeCssValue } from './sanitize-css-value';

/**
 * One manifest-driven token row backed by a free-form text input.
 *
 *   [label]              [ "Inter", system-ui, sans-serif        ]
 *
 * Used for tokens whose value is a CSS string the user types directly — e.g.
 * `--font-sans` / `--font-mono`. The stored value is sanitised (see
 * `sanitize-css-value.ts`) before it leaves this component so newlines,
 * backslashes, and semicolons never reach stored state or the exported CSS
 * snippet. `style.setProperty` is already injection-safe on its own.
 *
 * `onChange` is `(id, next)` — the row passes its own `token.id` back so the
 * parent can use a single stable handler across every row, keeping React.memo
 * effective (PR #1440 review item Q3).
 */
export interface TextRowProps {
  token: TokenDef;
  /** Current persisted value (or the token's default if no override). */
  value: string;
  /** Called with the row's `token.id` and the sanitised new value on every
   *  edit. */
  onChange: (id: string, next: string) => void;
}

function TextRow({ token, value, onChange }: TextRowProps) {
  // Local draft so the user can type freely without us round-tripping the
  // external value on every keystroke. We commit (sanitised) to the parent
  // immediately so live-preview stays responsive.
  const [draft, setDraft] = useState<string>(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.currentTarget.value;
      const sanitized = sanitizeCssValue(raw);
      setDraft(sanitized);
      onChange(token.id, sanitized);
    },
    [onChange, token.id],
  );

  return (
    <div className="tokenpanel-row">
      <span className="tokenpanel-row-label tokenpanel-row-label--narrow" title={token.cssVar}>
        {token.cssVar}
      </span>
      <input
        type="text"
        value={draft}
        onChange={handleChange}
        disabled={token.readonly}
        className="tokenpanel-row-text-input"
        aria-label={`${token.cssVar} value`}
        spellcheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        autoComplete="off"
      />
    </div>
  );
}

// memo'd to skip re-renders of unaffected rows; relies on the parent passing
// a stable `onChange` (PR #1440 review item Q3).
export default memo(TextRow);
