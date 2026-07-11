/**
 * GenericItemEditor — dispatches to the right control for a TierItem based on
 * `item.type.kind`. Used by SpacingTab, FontTab, and SizeTab to render
 * non-reference items with the appropriate editor.
 *
 * For pill items (item.pill is set), a pill toggle is rendered above the
 * number input row.
 *
 * For color items: native <input type="color"> by default; with format:'oklch' →
 * OKLCH picker emitting oklch() (rendering wired in later sub-tasks).
 *
 * This is an internal helper; not exported from the package index.
 */

import { memo, useCallback, useEffect, useRef, useState } from 'preact/compat';
import type { TierItem, TierValueKind } from '../tokens/tier-model';
import { HighlightToggleButton } from '../highlight/highlight-toggle-button';
import TokenLabel from '../controls/token-label';
import ColorField from '../components/color-picker/color-field';
import { RoleButton } from '../controls/role-button';
import { deriveCyclableUnit, nextCyclableUnit } from '../utils/unit-cycle';

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
      // Opt-in click-to-cycle unit suffix (#519) — single source of the
      // opt-in/divergence policy, shared with generic-tab.tsx's parallel
      // editor.
      const { cyclableUnits, isCyclableUnit, effectiveUnit, parsedMagnitude } = deriveCyclableUnit(
        unit,
        type.kind === 'length' ? type.units : undefined,
        value,
      );

      const numeric = parseFloat(value);
      const numericForDraft = Number.isFinite(numeric) ? numeric : 0;

      // Draft lets the user type freely ("1.", "1.2") without committing on every
      // keystroke. Commit every parseable value immediately; revert on blur only
      // when the draft is empty or unparseable (no clamping).
      const [numDraft, setNumDraft] = useState<string>(String(numericForDraft));

      // Sync the draft when an external value update arrives (reset, preset).
      useEffect(() => {
        setNumDraft(String(Number.isFinite(parseFloat(value)) ? parseFloat(value) : 0));
      // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [value]);

      const handleNumber = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.currentTarget.value;
        setNumDraft(raw);
        const n = parseFloat(raw);
        // Commit every parseable value; skip unparseable mid-typing drafts.
        if (!Number.isFinite(n)) return;
        // Preserve the currently displayed/cycled suffix rather than always
        // reverting to `type.unit` — otherwise editing the number after
        // cycling to a non-default unit would silently snap the unit back.
        onChange(item.id, effectiveUnit ? `${n}${effectiveUnit}` : String(n));
      };

      // On blur: revert unparseable drafts to last-known-good. No clamping.
      const handleNumberBlur = () => {
        const n = parseFloat(numDraft);
        if (!Number.isFinite(n)) {
          // Revert to last-known-good persisted value.
          setNumDraft(String(numericForDraft));
        }
        // Parseable values were already committed on each keystroke; nothing more to do.
      };

      // Effective readonly: either item is readonly OR pill is active
      const effectiveReadonly = isReadonly || (pill !== undefined && isPill);

      const handleCycleUnit = () => {
        if (cyclableUnits === undefined || cyclableUnits.length < 2) return;
        const next = nextCyclableUnit(cyclableUnits, effectiveUnit);
        // Reuse the SAME parse that produced `effectiveUnit` for the emitted
        // magnitude (falling back to the number input's own last-known-good
        // draft only when the stored value didn't parse as a length at all)
        // so the suffix-detection parse and the emitted magnitude agree.
        const magnitude = parsedMagnitude ?? numericForDraft;
        onChange(item.id, `${magnitude}${next}`);
      };

      const numberRow = (
        <div className="tokenpanel-row--stacked" data-testid={`tier-item-${item.id}`}>
          <div className="tokenpanel-row-head">
            <TokenLabel cssVar={item.cssVar} label={item.label} />
            <div className="tokenpanel-row-input-group">
              <input
                type="text"
                inputMode="decimal"
                value={numDraft}
                onChange={handleNumber}
                onBlur={handleNumberBlur}
                disabled={effectiveReadonly}
                className="tokenpanel-row-number-input"
                aria-label={`${item.cssVar} value`}
              />
              {isCyclableUnit ? (
                <RoleButton
                  onClick={handleCycleUnit}
                  className="tokenpanel-row-unit tokenpanel-row-unit--interactive"
                  aria-disabled={effectiveReadonly}
                  aria-label={`${item.cssVar} unit`}
                >
                  {effectiveUnit}
                </RoleButton>
              ) : (
                unit && <span className="tokenpanel-row-unit">{unit}</span>
              )}
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
          <TokenLabel cssVar={item.cssVar} label={item.label} />
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
          <TokenLabel cssVar={item.cssVar} label={item.label} />
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
      if (type.format === 'oklch') {
        const handleColorFieldChange = (next: string) => {
          onChange(item.id, next);
        };
        return (
          <div className="tokenpanel-row" data-testid={`tier-item-${item.id}`}>
            <TokenLabel cssVar={item.cssVar} label={item.label} />
            <ColorField
              value={value}
              onChange={handleColorFieldChange}
              valueFormat="oklch"
              label={item.label}
              cssVar={item.cssVar}
              readonly={isReadonly}
            />
            <HighlightToggleButton cssVar={item.cssVar} />
          </div>
        );
      }
      const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(item.id, e.currentTarget.value);
      };
      return (
        <div className="tokenpanel-row" data-testid={`tier-item-${item.id}`}>
          <TokenLabel cssVar={item.cssVar} label={item.label} />
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
