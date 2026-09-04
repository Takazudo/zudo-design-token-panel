import { Fragment } from 'preact';
import { memo, useCallback, useEffect, useRef, useState } from 'preact/compat';
import type { TabOverrides } from '../../apply/tier-resolver';
import { resolveTierItemValue } from '../../apply/tier-resolver';
import ColorField from '../../components/color-picker/color-field';
import { RoleButton } from '../../controls/role-button';
import TierRefSelector, { type TierRefSelectorValue } from '../../controls/tier-ref-selector';
import TokenLabel from '../../controls/token-label';
import { HighlightToggleButton } from '../../highlight/highlight-toggle-button';
import { deriveCyclableUnit, nextCyclableUnit } from '../../utils/unit-cycle';
import type { FlatTabEntry, RowContribution, TokenAddress } from './types';
import { tokenAddressKey } from './types';

export interface TokenRowProps {
  entry: FlatTabEntry;
  overrides: TabOverrides;
  contributions?: readonly RowContribution[];
  onChange: (address: TokenAddress, next: string) => void;
  onDelete: (address: TokenAddress) => void;
}

function TokenRow({
  entry,
  overrides,
  contributions = [],
  onChange,
  onDelete,
}: TokenRowProps) {
  const { tab, tier, item, value } = entry;
  const type = item.type;
  const isReadonly = item.readonly === true;
  const pill = item.pill;
  const pillValue = pill?.value ?? '';
  const customDefault = pill?.customDefault ?? '';
  const isPill = pill ? value === pillValue : false;
  const lastCustomRef = useRef(isPill ? customDefault : value);
  const numeric = parseFloat(value);
  const numericForDraft = Number.isFinite(numeric) ? numeric : 0;
  const [numDraft, setNumDraft] = useState(String(numericForDraft));
  const [selectDraft, setSelectDraft] = useState(value);

  useEffect(() => {
    if (!isPill) lastCustomRef.current = value;
  }, [isPill, value]);

  useEffect(() => {
    setNumDraft(String(Number.isFinite(parseFloat(value)) ? parseFloat(value) : 0));
  }, [value]);

  useEffect(() => {
    setSelectDraft(value);
  }, [value]);

  const handleTogglePill = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onChange(entry.address, event.currentTarget.checked
        ? pillValue
        : lastCustomRef.current || customDefault);
    },
    [customDefault, entry.address, onChange, pillValue],
  );

  const address = tokenAddressKey(entry.address);
  const contributionClassNames = contributions
    .map((contribution) => contribution.className?.(entry))
    .filter((className): className is string => Boolean(className));
  const rowClass = (base: string) => [base, ...contributionClassNames].join(' ');
  const region = (name: 'leading' | 'trailing' | 'tail') => (
    <Fragment>
      {contributions.map((contribution) => {
        const render = contribution[name];
        return render ? <Fragment key={contribution.id}>{render(entry)}</Fragment> : null;
      })}
    </Fragment>
  );
  const rowData = {
    'data-css-var': item.cssVar,
    'data-address': address,
  };

  if (tier.referencesTier !== undefined) {
    const refTierId = tier.referencesTier;
    const handleTierRefChange = (_itemId: string, next: TierRefSelectorValue) => {
      if ('literal' in next) onDelete(entry.address);
      else onChange(entry.address, next.ref.item);
    };
    return (
      <div
        className={rowClass('tokenpanel-row')}
        data-testid={`tier-ref-row-${item.id}`}
        {...rowData}
      >
        {region('leading')}
        <TokenLabel cssVar={item.cssVar} label={item.label} />
        <TierRefSelector
          tab={tab}
          tierId={tier.id}
          itemId={item.id}
          value={{ ref: { tier: refTierId, item: value } }}
          onChange={handleTierRefChange}
          previewValueFor={(ref) => {
            const result = resolveTierItemValue(tab, refTierId, ref.item, overrides);
            return result.kind === 'literal' ? result.value : result.targetCssVar;
          }}
        />
        {region('trailing')}
        <HighlightToggleButton cssVar={item.cssVar} />
        {region('tail')}
      </div>
    );
  }

  switch (type.kind) {
    case 'length':
    case 'number': {
      const unit = type.kind === 'length' ? type.unit : (type.unit ?? '');
      const { cyclableUnits, isCyclableUnit, effectiveUnit, parsedMagnitude } = deriveCyclableUnit(
        unit,
        type.kind === 'length' ? type.units : undefined,
        value,
      );
      const effectiveReadonly = isReadonly || (pill !== undefined && isPill);
      const handleNumber = (event: React.ChangeEvent<HTMLInputElement>) => {
        const raw = event.currentTarget.value;
        setNumDraft(raw);
        const next = parseFloat(raw);
        if (Number.isFinite(next)) {
          onChange(entry.address, effectiveUnit ? `${next}${effectiveUnit}` : String(next));
        }
      };
      const handleNumberBlur = () => {
        if (!Number.isFinite(parseFloat(numDraft))) setNumDraft(String(numericForDraft));
      };
      const handleCycleUnit = () => {
        if (!cyclableUnits || cyclableUnits.length < 2) return;
        const next = nextCyclableUnit(cyclableUnits, effectiveUnit);
        onChange(entry.address, `${parsedMagnitude ?? numericForDraft}${next}`);
      };
      const numberRow = (
        <div
          className={pill ? 'tokenpanel-row--stacked' : rowClass('tokenpanel-row--stacked')}
          {...(!pill ? { 'data-testid': `tier-item-${item.id}` } : {})}
          {...(!pill ? rowData : {})}
        >
          <div className="tokenpanel-row-head">
            {region('leading')}
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
            {region('trailing')}
            <HighlightToggleButton cssVar={item.cssVar} />
            {region('tail')}
          </div>
        </div>
      );
      if (!pill) return numberRow;
      return (
        <div
          className={rowClass('tokenpanel-row--column')}
          data-testid={`tier-item-${item.id}`}
          {...rowData}
        >
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
      return (
        <div className={rowClass('tokenpanel-row')} data-testid={`tier-item-${item.id}`} {...rowData}>
          {region('leading')}
          <TokenLabel cssVar={item.cssVar} label={item.label} />
          <select
            value={selectDraft}
            onChange={(event) => {
              setSelectDraft(event.currentTarget.value);
              onChange(entry.address, event.currentTarget.value);
            }}
            disabled={isReadonly}
            className="tokenpanel-row-select"
            aria-label={`${item.cssVar} value`}
          >
            {type.options.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          {region('trailing')}
          <HighlightToggleButton cssVar={item.cssVar} />
          {region('tail')}
        </div>
      );
    }

    case 'text':
    case 'cursor':
    case 'content':
    case 'mask-image': {
      return (
        <div className={rowClass('tokenpanel-row')} data-testid={`tier-item-${item.id}`} {...rowData}>
          {region('leading')}
          <TokenLabel cssVar={item.cssVar} label={item.label} />
          <input
            type="text"
            value={value}
            onChange={(event) => onChange(entry.address, event.currentTarget.value)}
            disabled={isReadonly}
            className="tokenpanel-row-text-input"
            aria-label={`${item.cssVar} value`}
            spellcheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
          />
          {region('trailing')}
          <HighlightToggleButton cssVar={item.cssVar} />
          {region('tail')}
        </div>
      );
    }

    case 'color': {
      const editor = type.format === 'oklch' ? (
        <ColorField
          value={value}
          onChange={(next) => onChange(entry.address, next)}
          valueFormat="oklch"
          label={item.label}
          cssVar={item.cssVar}
          readonly={isReadonly}
        />
      ) : (
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(entry.address, event.currentTarget.value)}
          disabled={isReadonly}
          className="tokenpanel-row-color-input"
          aria-label={`${item.cssVar} value`}
        />
      );
      return (
        <div className={rowClass('tokenpanel-row')} data-testid={`tier-item-${item.id}`} {...rowData}>
          {region('leading')}
          <TokenLabel cssVar={item.cssVar} label={item.label} />
          {editor}
          {region('trailing')}
          <HighlightToggleButton cssVar={item.cssVar} />
          {region('tail')}
        </div>
      );
    }

    default:
      void (type as never);
      return null;
  }
}

export default memo(TokenRow, (previous, next) => (
  previous.entry.item === next.entry.item
  && previous.entry.value === next.entry.value
  && previous.contributions === next.contributions
  && previous.onChange === next.onChange
  && previous.onDelete === next.onDelete
  && (previous.entry.tier.referencesTier === undefined || previous.overrides === next.overrides)
));
