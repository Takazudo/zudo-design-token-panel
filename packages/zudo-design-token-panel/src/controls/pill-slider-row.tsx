import { memo, useCallback, useEffect, useRef } from 'preact/compat';
import SliderRow from './slider-row';
import type { TokenDef } from '../tokens/manifest';

/**
 * Slider row variant with a "Pill" checkbox on top.
 *
 *   [x] Pill (9999px)
 *   [label]  ... [9999 px]   ← inputs disabled while pill is on
 *   [=========o==================]
 *
 * When the checkbox is ON the token value is pinned to `token.pill.value`
 * (e.g. `"9999px"` for the full-radius sentinel) and the underlying slider /
 * number input go read-only so the user can't accidentally de-pill via typing.
 *
 * When the checkbox is OFF the row behaves as a normal `SliderRow` — the user
 * can drag or type any value in the manifest's min/max range.
 *
 * Toggling between modes preserves the last custom value (kept in a ref so we
 * don't round-trip it through state / persistence) — this is the "without data
 * loss" requirement from the Size sub-issue: you can flip Pill off to tweak
 * 16px, flip back on for the sentinel, flip off again and land on 16px.
 *
 * `onChange` is `(id, next)` — the row passes its own `token.id` back so the
 * parent can use a single stable handler across every row, keeping React.memo
 * effective.
 */
export interface PillSliderRowProps {
  /** Token must carry `token.pill` metadata. */
  token: TokenDef;
  /** Current persisted value (the manifest default if no override yet). */
  value: string;
  /** Called with the row's `token.id` and the new CSS string whenever pill
   *  toggles or slider commits. */
  onChange: (id: string, next: string) => void;
}

function PillSliderRow({ token, value, onChange }: PillSliderRowProps) {
  // hooks must be called unconditionally — read pill metadata via optional
  // chaining so the early-return path below stays a non-hook branch.
  const pill = token.pill;
  const pillValue = pill?.value ?? '';
  const customDefault = pill?.customDefault ?? '';
  const isPill = pill ? value === pillValue : false;

  // Remember the last custom (non-pill) value so re-checking + un-checking
  // the pill doesn't wipe the user's tweak. Initialise from the incoming
  // value when the row first mounts while un-pilled.
  const lastCustomRef = useRef<string>(isPill ? customDefault : value);

  // Keep the ref in sync whenever the user changes the slider while un-pilled.
  useEffect(() => {
    if (!isPill) lastCustomRef.current = value;
  }, [isPill, value]);

  const handleTogglePill = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.currentTarget.checked) {
        onChange(token.id, pillValue);
      } else {
        onChange(token.id, lastCustomRef.current || customDefault);
      }
    },
    [onChange, token.id, pillValue, customDefault],
  );

  if (!pill) {
    // Defensive: fall back to a normal row if the caller forgot to gate.
    return <SliderRow token={token} value={value} onChange={onChange} />;
  }

  // While pilled, disable the inner SliderRow inputs by handing it a readonly
  // clone of the token. The row already knows how to render a readonly state
  // (disabled inputs, greyed slider), so we reuse that instead of inventing
  // a new disabled variant here.
  const effectiveToken: TokenDef = isPill ? { ...token, readonly: true } : token;

  return (
    <div className="tokenpanel-row--column">
      <label className="tokenpanel-pill-toggle">
        <input
          type="checkbox"
          checked={isPill}
          onChange={handleTogglePill}
          className="tokenpanel-pill-toggle-checkbox"
          aria-label={`${token.cssVar} pill toggle`}
        />
        <span className="tokenpanel-pill-toggle-text">Pill ({pillValue})</span>
      </label>
      <SliderRow token={effectiveToken} value={value} onChange={onChange} />
    </div>
  );
}

// memo'd to skip re-renders of unaffected rows; relies on the parent passing
// a stable `onChange`.
export default memo(PillSliderRow);
