/**
 * GenericItemEditor — dispatches to the right control for a TierItem based on
 * `item.type.kind`. Used by SpacingTab, FontTab, and SizeTab to render
 * non-reference items with the appropriate editor.
 *
 * For pill items (item.pill is set), a pill toggle is rendered above the
 * number input row — matching the PillSliderRow behaviour from the legacy
 * size tab, but without a range slider (sliders need meaningful min/max which
 * token manifests may not always define well).
 *
 * This is an internal helper; not exported from the package index.
 */

import { memo, useCallback, useEffect, useRef, useState } from 'preact/compat';
import type { TierItem, TierValueKind } from '../tokens/tier-model';
import { HighlightToggleButton } from '../highlight/highlight-toggle-button';

export interface GenericItemEditorProps {
  item: TierItem;
  value: string;
  /** Called with (itemId, newValue). */
  onChange: (itemId: string, next: string) => void;
}

function GenericItemEditorInner({ item, value, onChange }: GenericItemEditorProps) {
  const type: TierValueKind = item.type;
  const isReadonly = item.readonly === true;
  const pill = item.pill;

  // Pill toggle state — local to this render
  const pillValue = pill?.value ?? '';
  const customDefault = pill?.customDefault ?? '';
  const isPill = pill ? value === pillValue : false;
  const lastCustomRef = useRef<string>(isPill ? customDefault : value);

  useEffect(() => {
    if (!isPill) lastCustomRef.current = value;
  }, [isPill, value]);

  const handleTogglePill = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.currentTarget.checked) {
        onChange(item.id, pillValue);
      } else {
        onChange(item.id, lastCustomRef.current || customDefault);
      }
    },
    [onChange, item.id, pillValue, customDefault],
  );

  switch (type.kind) {
    case 'length':
    case 'number': {
      const unit = type.kind === 'length' ? type.unit : '';
      const min = type.min;
      const max = type.max;
      const numeric = parseFloat(value);
      const numericForDraft = Number.isFinite(numeric) ? numeric : min;

      // Draft mirrors the slider-row pattern: keep the user's in-progress text
      // locally and only call onChange for valid, in-range keystrokes.
      const [numDraft, setNumDraft] = useState<string>(String(numericForDraft));

      // Sync the draft when an external value update arrives (reset, preset).
      useEffect(() => {
        setNumDraft(String(Number.isFinite(parseFloat(value)) ? parseFloat(value) : min));
      // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [value]);

      const isNumOutOfRange = (n: number) => n < min || n > max;

      const handleNumber = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.currentTarget.value;
        setNumDraft(raw);
        const n = parseFloat(raw);
        // Only commit when parsed and in range — never clamp mid-keystroke.
        if (!Number.isFinite(n) || isNumOutOfRange(n)) return;
        onChange(item.id, unit ? `${n}${unit}` : String(n));
      };

      // On blur: clamp out-of-range values and commit, or revert unparseable ones.
      const handleNumberBlur = () => {
        const n = parseFloat(numDraft);
        if (!Number.isFinite(n)) {
          // Revert to last-known-good persisted value.
          setNumDraft(String(numericForDraft));
          return;
        }
        if (isNumOutOfRange(n)) {
          const clamped = Math.min(max, Math.max(min, n));
          setNumDraft(String(clamped));
          onChange(item.id, unit ? `${clamped}${unit}` : String(clamped));
        }
      };

      const numIsInvalid = (() => {
        const n = parseFloat(numDraft);
        return Number.isFinite(n) && isNumOutOfRange(n);
      })();

      // Effective readonly: either item is readonly OR pill is active
      const effectiveReadonly = isReadonly || (pill !== undefined && isPill);

      const numberRow = (
        <div className="tokenpanel-row--stacked" data-testid={`tier-item-${item.id}`}>
          <div className="tokenpanel-row-head">
            <span className="tokenpanel-row-label" title={item.cssVar}>
              {item.cssVar}
              {item.label !== item.cssVar && (
                <span className="tokenpanel-row-label-sub">{item.label}</span>
              )}
            </span>
            <div className="tokenpanel-row-input-group">
              <input
                type="text"
                inputMode="decimal"
                value={numDraft}
                onChange={handleNumber}
                onBlur={handleNumberBlur}
                disabled={effectiveReadonly}
                className={`tokenpanel-row-number-input${numIsInvalid ? ' tokenpanel-row-number-input--invalid' : ''}`}
                aria-label={`${item.cssVar} value`}
                aria-invalid={numIsInvalid || undefined}
              />
              {unit && <span className="tokenpanel-row-unit">{unit}</span>}
            </div>
            <HighlightToggleButton cssVar={item.cssVar} />
          </div>
        </div>
      );

      if (!pill) return numberRow;

      return (
        <div className="tokenpanel-row--column">
          <label className="tokenpanel-pill-toggle">
            <input
              type="checkbox"
              checked={isPill}
              onChange={handleTogglePill}
              className="tokenpanel-pill-toggle-checkbox"
              aria-label={`${item.cssVar} pill toggle`}
            />
            <span className="tokenpanel-pill-toggle-text">Pill ({pillValue})</span>
          </label>
          {numberRow}
        </div>
      );
    }

    case 'select': {
      const options = type.options;
      const [selectDraft, setSelectDraft] = useState(value);
      // keep in sync with external value (e.g. reset)
      useEffect(() => { setSelectDraft(value); }, [value]);
      const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        onChange(item.id, e.currentTarget.value);
        setSelectDraft(e.currentTarget.value);
      };
      return (
        <div className="tokenpanel-row" data-testid={`tier-item-${item.id}`}>
          <span className="tokenpanel-row-label" title={item.cssVar}>
            {item.cssVar}
            {item.label !== item.cssVar && (
              <span className="tokenpanel-row-label-sub">{item.label}</span>
            )}
          </span>
          <select
            value={selectDraft}
            onChange={handleChange}
            disabled={isReadonly}
            className="tokenpanel-row-select"
            aria-label={`${item.cssVar} value`}
          >
            {options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <HighlightToggleButton cssVar={item.cssVar} />
        </div>
      );
    }

    case 'text':
    case 'cursor':
    case 'content':
    case 'mask-image': {
      const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(item.id, e.currentTarget.value);
      };
      return (
        <div className="tokenpanel-row" data-testid={`tier-item-${item.id}`}>
          <span className="tokenpanel-row-label" title={item.cssVar}>
            {item.cssVar}
            {item.label !== item.cssVar && (
              <span className="tokenpanel-row-label-sub">{item.label}</span>
            )}
          </span>
          <input
            type="text"
            value={value}
            onChange={handleChange}
            disabled={isReadonly}
            className="tokenpanel-row-text-input"
            aria-label={`${item.cssVar} value`}
            spellcheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
          />
          <HighlightToggleButton cssVar={item.cssVar} />
        </div>
      );
    }

    case 'color': {
      const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(item.id, e.currentTarget.value);
      };
      return (
        <div className="tokenpanel-row" data-testid={`tier-item-${item.id}`}>
          <span className="tokenpanel-row-label" title={item.cssVar}>
            {item.cssVar}
            {item.label !== item.cssVar && (
              <span className="tokenpanel-row-label-sub">{item.label}</span>
            )}
          </span>
          <input
            type="color"
            value={value}
            onChange={handleChange}
            disabled={isReadonly}
            className="tokenpanel-row-color-input"
            aria-label={`${item.cssVar} value`}
          />
          <HighlightToggleButton cssVar={item.cssVar} />
        </div>
      );
    }

    default: {
      void (type as never);
      return null;
    }
  }
}

export default memo(GenericItemEditorInner);
