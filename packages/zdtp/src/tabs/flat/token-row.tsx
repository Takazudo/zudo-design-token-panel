/** @jsxImportSource @takazudo/zfb/zudo-react */
import { computed, getScope, Show, signal, type Child, type ReadonlySignal } from '@takazudo/zfb/zudo-react';
import type { TabOverrides } from '../../apply/tier-resolver';
import { resolveTierItemValue } from '../../apply/tier-resolver';
import { ColorField } from '../../components/color-picker/color-field';
import { RoleButton } from '../../controls/role-button';
import TierRefSelector, { type TierRefSelectorValue } from '../../controls/tier-ref-selector';
import TokenLabel from '../../controls/token-label';
import { HighlightToggleButton } from '../../highlight/highlight-toggle-button';
import { deriveCyclableUnit, nextCyclableUnit } from '../../utils/unit-cycle';
import { Checkbox, ControlledSelect, TextInput } from '../../zr/form-controls';
import type { PanelServices } from '../../zr/panel-services';
import { ModesRow, resolveModeRowSides } from '../modes-row';
import type { FlatTabEntry, RowContribution, TokenAddress } from './types';
import { tokenAddressKey } from './types';

export interface TokenRowProps {
  entry: ReadonlySignal<FlatTabEntry>;
  overrides: ReadonlySignal<TabOverrides>;
  contributions?: readonly RowContribution[];
  onChange: (address: TokenAddress, next: string) => void;
  onDelete: (address: TokenAddress) => void;
  services: PanelServices;
}

function TokenRowInner(props: TokenRowProps) {
  const { entry, overrides, onChange, onDelete, services } = props;
  const contributions = props.contributions ?? [];
  // The row's token is fixed for its lifetime (FlatTab keys rows by item id);
  // only the value moves.
  const { tab, tier, item, address } = entry.value;
  const value = computed(() => entry.value.value);
  const type = item.type;
  const isReadonly = item.readonly === true;
  const pill = item.pill;
  const pillValue = pill?.value ?? '';
  const customDefault = pill?.customDefault ?? '';
  const isPill = computed(() => (pill ? value.value === pillValue : false));

  const rowClass = (base: string) => computed(() => [
    base,
    ...contributions
      .map((contribution) => contribution.className?.(entry.value))
      .filter((className): className is string => Boolean(className)),
  ].join(' '));
  const region = (name: 'leading' | 'trailing' | 'tail'): Child =>
    contributions.map((contribution) => contribution[name]?.(entry) ?? null);
  const rowData = {
    'data-css-var': item.cssVar,
    'data-address': tokenAddressKey(address),
  };
  const label = () => <TokenLabel cssVar={item.cssVar} label={item.label} tooltip={services.tooltip} />;
  const actions = () => (
    <div class="tokenpanel-card-actions">
      {region('trailing')}
      <HighlightToggleButton cssVar={item.cssVar} highlight={services.highlight} />
    </div>
  );

  // Keep this branch ahead of reference-tier dispatch: an item's explicit
  // pair has precedence over whatever value its tier would otherwise select.
  if (item.modes !== undefined) {
    const sides = computed(() => {
      const override = overrides.value[tier.id]?.[item.id];
      return resolveModeRowSides(item, override, override !== undefined);
    });
    return (
      <ModesRow
        item={item}
        sides={sides}
        class={rowClass('')}
        dataTestId={`tier-item-${item.id}`}
        address={address}
        tooltip={services.tooltip}
        leading={region('leading')}
        trailing={
          <>
            {region('trailing')}
            <HighlightToggleButton cssVar={item.cssVar} highlight={services.highlight} />
          </>
        }
        tail={region('tail')}
        onChange={(next) => onChange(address, next)}
      />
    );
  }

  if (tier.referencesTier !== undefined) {
    const refTierId = tier.referencesTier;
    const handleTierRefChange = (_itemId: string, next: TierRefSelectorValue) => {
      if ('literal' in next) onDelete(address);
      else onChange(address, next.ref.item);
    };
    return (
      <div
        class={rowClass('tokenpanel-row')}
        data-testid={`tier-ref-row-${item.id}`}
        {...rowData}
      >
        <div class="tokenpanel-card-label">
          {region('leading')}
          {label()}
        </div>
        <div class="tokenpanel-card-editor">
          <TierRefSelector
            tab={tab}
            tierId={tier.id}
            itemId={item.id}
            value={computed(() => ({ ref: { tier: refTierId, item: value.value } }))}
            onChange={handleTierRefChange}
            previewValueFor={computed(() => {
              const current = overrides.value;
              return (ref: { item: string }) => {
                const result = resolveTierItemValue(tab, refTierId, ref.item, current);
                return result.kind === 'literal' ? result.value : result.targetCssVar;
              };
            })}
          />
        </div>
        {actions()}
        {region('tail')}
      </div>
    );
  }

  switch (type.kind) {
    case 'length':
    case 'number': {
      const unit = type.kind === 'length' ? type.unit : (type.unit ?? '');
      const units = type.kind === 'length' ? type.units : undefined;
      const cycle = computed(() => deriveCyclableUnit(unit, units, value.value));
      const numericForDraft = () => {
        const numeric = parseFloat(value.value);
        return Number.isFinite(numeric) ? numeric : 0;
      };
      const numDraft = signal(String(numericForDraft()));
      const lastCustom = { current: isPill.value ? customDefault : value.value };
      const scope = getScope();
      scope.effect(() => {
        const current = value.value;
        if (!isPill.value) lastCustom.current = current;
      });
      scope.effect(() => {
        void value.value;
        numDraft.value = String(numericForDraft());
      });
      const effectiveReadonly = computed(() => isReadonly || (pill !== undefined && isPill.value));
      const handleNumber = (raw: string) => {
        numDraft.value = raw;
        const next = parseFloat(raw);
        if (Number.isFinite(next)) {
          const effectiveUnit = cycle.value.effectiveUnit;
          onChange(address, effectiveUnit ? `${next}${effectiveUnit}` : String(next));
        }
      };
      const handleNumberBlur = () => {
        if (!Number.isFinite(parseFloat(numDraft.value))) numDraft.value = String(numericForDraft());
      };
      const handleCycleUnit = () => {
        const { cyclableUnits, effectiveUnit, parsedMagnitude } = cycle.value;
        if (!cyclableUnits || cyclableUnits.length < 2) return;
        const next = nextCyclableUnit(cyclableUnits, effectiveUnit);
        onChange(address, `${parsedMagnitude ?? numericForDraft()}${next}`);
      };
      const numberRow = (
        <div
          class={pill ? 'tokenpanel-row--stacked' : rowClass('tokenpanel-row--stacked')}
          {...(!pill ? { 'data-testid': `tier-item-${item.id}` } : {})}
          {...(!pill ? rowData : {})}
        >
          <div class="tokenpanel-row-head">
            <div class="tokenpanel-card-label">
              {region('leading')}
              {label()}
            </div>
            <div class="tokenpanel-card-editor">
              <div class="tokenpanel-row-input-group">
                <TextInput
                  value={numDraft}
                  onInput={handleNumber}
                  onBlur={handleNumberBlur}
                  disabled={effectiveReadonly}
                  class="tokenpanel-row-number-input"
                  attrs={{ inputmode: 'decimal', 'aria-label': `${item.cssVar} value` }}
                />
                <Show
                  when={computed(() => cycle.value.isCyclableUnit)}
                  fallback={() => (unit ? <span class="tokenpanel-row-unit">{unit}</span> : null)}
                >
                  {() => (
                    <RoleButton
                      onClick={handleCycleUnit}
                      class="tokenpanel-row-unit tokenpanel-row-unit--interactive"
                      aria-disabled={effectiveReadonly}
                      aria-label={`${item.cssVar} unit`}
                    >
                      {computed(() => cycle.value.effectiveUnit)}
                    </RoleButton>
                  )}
                </Show>
              </div>
            </div>
            {actions()}
            {region('tail')}
          </div>
        </div>
      );
      if (!pill) return numberRow;
      return (
        <div
          class={rowClass('tokenpanel-row--column')}
          data-testid={`tier-item-${item.id}`}
          {...rowData}
        >
          <label class="tokenpanel-pill-toggle">
            <Checkbox
              checked={isPill}
              onChange={(checked) => onChange(address, checked
                ? pillValue
                : lastCustom.current || customDefault)}
              class="tokenpanel-pill-toggle-checkbox"
              aria-label={`${item.cssVar} pill toggle`}
            />
            <span class="tokenpanel-pill-toggle-text">Pill ({pillValue})</span>
          </label>
          {numberRow}
        </div>
      );
    }

    case 'select': {
      return (
        <div class={rowClass('tokenpanel-row')} data-testid={`tier-item-${item.id}`} {...rowData}>
          <div class="tokenpanel-card-label">
            {region('leading')}
            {label()}
          </div>
          <div class="tokenpanel-card-editor">
            <ControlledSelect
              value={value}
              onChange={(next) => onChange(address, next)}
              disabled={isReadonly}
              class="tokenpanel-row-select"
              aria-label={`${item.cssVar} value`}
            >
              {type.options.map((option) => <option value={option}>{option}</option>)}
            </ControlledSelect>
          </div>
          {actions()}
          {region('tail')}
        </div>
      );
    }

    case 'text':
    case 'cursor':
    case 'content':
    case 'mask-image': {
      return (
        <div class={rowClass('tokenpanel-row')} data-testid={`tier-item-${item.id}`} {...rowData}>
          <div class="tokenpanel-card-label">
            {region('leading')}
            {label()}
          </div>
          <div class="tokenpanel-card-editor">
            <TextInput
              value={value}
              onInput={(next) => onChange(address, next)}
              disabled={isReadonly}
              class="tokenpanel-row-text-input"
              attrs={{
                'aria-label': `${item.cssVar} value`,
                spellcheck: 'false',
                autocapitalize: 'off',
                autocomplete: 'off',
              }}
              rawAttrs={{ autocorrect: 'off' }}
            />
          </div>
          {actions()}
          {region('tail')}
        </div>
      );
    }

    case 'color': {
      const editor = type.format === 'oklch' ? (
        <ColorField
          value={value}
          onChange={(next) => onChange(address, next)}
          valueFormat="oklch"
          label={item.label}
          cssVar={item.cssVar}
          readonly={isReadonly}
        />
      ) : (
        <TextInput
          type="color"
          value={value}
          onInput={(next) => onChange(address, next)}
          disabled={isReadonly}
          class="tokenpanel-row-color-input"
          attrs={{ 'aria-label': `${item.cssVar} value` }}
        />
      );
      return (
        <div class={rowClass('tokenpanel-row')} data-testid={`tier-item-${item.id}`} {...rowData}>
          <div class="tokenpanel-card-label">
            {region('leading')}
            {label()}
          </div>
          <div class="tokenpanel-card-editor">{editor}</div>
          {actions()}
          {region('tail')}
        </div>
      );
    }

    default:
      void (type as never);
      return null;
  }
}

/** The grid allocates this box; the row inside may query it without
 * containing an intrinsically sized editor or nesting pill containers. */
export function TokenRow(props: TokenRowProps) {
  return <div class="tokenpanel-card"><TokenRowInner {...props} /></div>;
}

export default TokenRow;
