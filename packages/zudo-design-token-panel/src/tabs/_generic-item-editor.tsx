/**
 * GenericItemEditor — dispatches to the right control for a TierItem based on
 * `item.type.kind`. Used by SpacingTab, FontTab, and SizeTab to render
 * non-reference items with the appropriate editor.
 *
 * For pill items (item.pill is set), a pill toggle is rendered above the
 * slider — matching the PillSliderRow behaviour from the legacy size tab.
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
      const step = type.step;
      const numeric = parseFloat(value);
      const displayNumeric = Number.isFinite(numeric) ? numeric : min;

      const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
        const n = Number(e.currentTarget.value);
        if (!Number.isFinite(n)) return;
        onChange(item.id, unit ? `${n}${unit}` : String(n));
      };

      const handleNumber = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.currentTarget.value;
        const n = parseFloat(raw);
        if (!Number.isFinite(n)) return;
        const clamped = Math.min(max, Math.max(min, n));
        onChange(item.id, unit ? `${clamped}${unit}` : String(clamped));
      };

      // Effective readonly: either item is readonly OR pill is active
      const effectiveReadonly = isReadonly || (pill !== undefined && isPill);

      const sliderRow = (
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
                value={displayNumeric}
                onChange={handleNumber}
                disabled={effectiveReadonly}
                className="tokenpanel-row-number-input"
                aria-label={`${item.cssVar} value`}
              />
              {unit && <span className="tokenpanel-row-unit">{unit}</span>}
            </div>
            <HighlightToggleButton cssVar={item.cssVar} />
          </div>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={displayNumeric}
            onChange={handleSlider}
            disabled={effectiveReadonly}
            className="tokenpanel-row-slider"
            aria-label={`${item.cssVar} slider`}
          />
        </div>
      );

      if (!pill) return sliderRow;

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
          {sliderRow}
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
