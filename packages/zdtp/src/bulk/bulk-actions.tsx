/** @jsxImportSource @takazudo/zfb/zudo-react */
import { computed, Show, type ReadonlySignal } from '@takazudo/zfb/zudo-react';
import { RoleButton } from '../controls/role-button';
import { Checkbox, TextInput } from '../zr/form-controls';
import { read, type MaybeSignal } from '../zr/live';
import { Rebuild } from '../zr/rebuild';
import type { TierConfig } from '../tokens/tier-model';
import {
  add,
  formatNumericTransformValue,
  multiply,
  parseNumericTransformValue,
  roundToStep,
  setTo,
  type NumericValue,
} from '../utils/numeric-transform';
import type { FlatTabEntry, RowContribution, TokenAddress } from '../tabs/flat/types';
import { tokenAddressKey } from '../tabs/flat/types';

export interface BulkOperations {
  multiply: string;
  add: string;
  roundToStep: string;
  setTo: string;
}

export const DEFAULT_BULK_OPERATIONS: BulkOperations = {
  multiply: '1',
  add: '0',
  // This is the smallest useful step for the panel's rem scales and mirrors
  // the prototype. A blank/zero value still disables rounding for callers
  // that want a pure multiply/add operation.
  roundToStep: '0.125',
  setTo: '',
};

export interface BulkPatchEntry {
  address: TokenAddress;
  value: string;
}

export interface BulkContributionOptions {
  entriesByTier: ReadonlySignal<ReadonlyMap<string, readonly FlatTabEntry[]>>;
  selectedKeys: ReadonlySignal<ReadonlySet<string>>;
  operations: ReadonlySignal<BulkOperations>;
  onToggle: (entry: FlatTabEntry, checked: boolean) => void;
  onSelectTier: (tier: TierConfig, checked: boolean) => void;
  onQuick: (tier: TierConfig, factor: number) => void;
}

function finiteInput(raw: string, fallback: number): number {
  // Inputs are edited one character at a time. Treat an empty intermediate
  // value as the neutral operation instead of Number('') === 0 (which would
  // unexpectedly collapse every selected value while the user types).
  if (raw.trim() === '') return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** Return the declared unit for a numeric token kind. */
export function numericEntryUnit(entry: FlatTabEntry): string {
  return entry.item.type.kind === 'length'
    ? entry.item.type.unit
    : entry.item.type.kind === 'number'
      ? entry.item.type.unit ?? ''
      : '';
}

/**
 * Bulk selection is deliberately narrower than numeric row rendering. A row
 * must be a writable literal length/number with a parseable current value.
 * Reference tiers, readonly rows, and active pill sentinels cannot safely
 * participate in a numeric transform.
 */
export function isBulkSelectable(entry: FlatTabEntry): boolean {
  if (entry.kind !== 'length' && entry.kind !== 'number') return false;
  if (entry.item.readonly === true || entry.tier.referencesTier !== undefined) return false;
  if (entry.item.pill !== undefined && entry.value === entry.item.pill.value) return false;
  return parseNumericTransformValue(entry.value, numericEntryUnit(entry)) !== null;
}

// A short alias is useful to consumers/tests that describe the rule as
// "selectable" rather than referring to the feature name.
export const isSelectable = isBulkSelectable;

export function numericValueForEntry(entry: FlatTabEntry): NumericValue | null {
  if (!isBulkSelectable(entry)) return null;
  return parseNumericTransformValue(entry.value, numericEntryUnit(entry));
}

/** Compute one preview value from the action-bar operation fields. */
export function transformBulkEntry(
  entry: FlatTabEntry,
  operations: BulkOperations,
): string | null {
  const current = numericValueForEntry(entry);
  if (current === null) return null;

  const setMagnitude = parseNumericTransformValue(operations.setTo, current.unit);
  let next = setMagnitude === null
    ? multiply(current, finiteInput(operations.multiply, 1))
    : setTo(current, setMagnitude.magnitude);

  if (setMagnitude === null) {
    next = add(next, finiteInput(operations.add, 0));
    const step = finiteInput(operations.roundToStep, 0);
    if (step > 0) next = roundToStep(next, step);
  }

  // Keep the applied token value in the non-negative range used by the
  // prototype's ramp controls. The low-level transforms remain signed and
  // pure; this guard belongs only to the CSS-token action boundary.
  if (next.magnitude < 0) {
    next = { ...next, magnitude: 0 };
  }
  return formatNumericTransformValue(next);
}

interface BulkTierControlsProps {
  tier: TierConfig;
  entries: ReadonlySignal<readonly FlatTabEntry[]>;
  selectedKeys: ReadonlySignal<ReadonlySet<string>>;
  onSelectTier: (tier: TierConfig, checked: boolean) => void;
  onQuick: (tier: TierConfig, factor: number) => void;
}

function BulkTierControls({
  tier,
  entries,
  selectedKeys,
  onSelectTier,
  onQuick,
}: BulkTierControlsProps) {
  const selectable = computed(() => entries.value.filter(isBulkSelectable));
  const selectedCount = computed(() => selectable.value.reduce(
    (count, entry) => count + (selectedKeys.value.has(tokenAddressKey(entry.address)) ? 1 : 0),
    0,
  ));
  const allSelected = computed(() => selectable.value.length > 0 && selectedCount.value === selectable.value.length);

  return (
    <span class="tokenpanel-bulk-tier-controls">
      <Checkbox
        class="tokenpanel-bulk-checkbox tokenpanel-bulk-tier-checkbox"
        checked={allSelected}
        indeterminate={computed(() => selectedCount.value > 0 && !allSelected.value)}
        disabled={computed(() => selectable.value.length === 0)}
        aria-label={`Select all ${tier.label}`}
        data-testid={`bulk-select-tier-${tier.id}`}
        onChange={(checked) => onSelectTier(tier, checked)}
      />
      <span class="tokenpanel-bulk-tier-quick">
        <RoleButton
          class="tokenpanel-bulk-quick-btn"
          aria-label={`Select ${tier.label} and multiply by 0.9`}
          title="Select tier and multiply by 0.9"
          data-testid={`bulk-quick-${tier.id}-0.9`}
          onClick={() => onQuick(tier, 0.9)}
        >
          ×0.9
        </RoleButton>
        <RoleButton
          class="tokenpanel-bulk-quick-btn"
          aria-label={`Select ${tier.label} and multiply by 1.1`}
          title="Select tier and multiply by 1.1"
          data-testid={`bulk-quick-${tier.id}-1.1`}
          onClick={() => onQuick(tier, 1.1)}
        >
          ×1.1
        </RoleButton>
      </span>
    </span>
  );
}

export function createBulkContribution(options: BulkContributionOptions): RowContribution {
  const {
    entriesByTier,
    selectedKeys,
    operations,
    onToggle,
    onSelectTier,
    onQuick,
  } = options;
  const isSelected = (entry: FlatTabEntry) => selectedKeys.value.has(tokenAddressKey(entry.address));
  return {
    id: 'bulk',
    leading: (entry) => (
      <Show when={computed(() => isBulkSelectable(entry.value))}>
        {() => (
          <Checkbox
            class="tokenpanel-bulk-checkbox tokenpanel-bulk-row-checkbox"
            checked={computed(() => isSelected(entry.value))}
            aria-label={`Select ${entry.value.item.label}`}
            data-testid={`bulk-select-${tokenAddressKey(entry.value.address)}`}
            onChange={(checked) => onToggle(entry.value, checked)}
          />
        )}
      </Show>
    ),
    className: (entry) => (
      isSelected(entry) && isBulkSelectable(entry)
        ? 'tokenpanel-row--bulk-selected'
        : undefined
    ),
    tail: (entry) => {
      const preview = computed(() => {
        const current = entry.value;
        if (!isSelected(current) || !isBulkSelectable(current)) return null;
        const next = transformBulkEntry(current, operations.value);
        return next === null || next === current.value ? null : { old: current.value, next };
      });
      return (
        <Show when={computed(() => preview.value !== null)}>
          {() => (
            <span class="tokenpanel-bulk-preview" data-testid={`bulk-preview-${tokenAddressKey(entry.value.address)}`}>
              <span class="tokenpanel-bulk-preview-old">{computed(() => preview.value?.old ?? '')}</span>
              <span class="tokenpanel-bulk-preview-arrow" aria-hidden="true">→</span>
              <span class="tokenpanel-bulk-preview-new">{computed(() => preview.value?.next ?? '')}</span>
            </span>
          )}
        </Show>
      );
    },
    tierHeadingExtra: (tier) => (
      <BulkTierControls
        tier={tier}
        entries={computed(() => entriesByTier.value.get(tier.id) ?? [])}
        selectedKeys={selectedKeys}
        onSelectTier={onSelectTier}
        onQuick={onQuick}
      />
    ),
  };
}

interface RampBar {
  current: number;
  next: number;
}

function rampBars(entries: readonly FlatTabEntry[], operations: BulkOperations): RampBar[] {
  return entries.map((entry) => {
    const current = numericValueForEntry(entry);
    const next = transformBulkEntry(entry, operations);
    const parsedNext = next === null ? null : parseNumericTransformValue(next, current?.unit ?? '');
    return { current: current?.magnitude ?? 0, next: parsedNext?.magnitude ?? current?.magnitude ?? 0 };
  });
}

function BulkRampSilhouette({ bars }: { bars: ReadonlySignal<RampBar[]> }) {
  const max = computed(() => Math.max(...bars.value.flatMap((value) => [value.current, value.next]), 0.01));
  const width = computed(() => Math.max(40, bars.value.length * 9));
  const height = 28;
  return (
    <svg
      class="tokenpanel-bulk-ramp"
      width={width}
      height={height}
      viewBox={computed(() => `0 0 ${width.value} ${height}`)}
      role="img"
      aria-label="Selected value ramp preview"
      data-testid="bulk-ramp-preview"
    >
      <Rebuild value={computed(() => ({ bars: bars.value, max: max.value }))}>
        {({ bars: list, max: top }) => list.map((value, index) => {
          const barHeight = (Math.max(0, value.current) / top) * height;
          const nextHeight = (Math.max(0, value.next) / top) * height;
          const x = index * 9;
          return (
            <g>
              <rect class="tokenpanel-bulk-ramp-old" x={x} y={height - barHeight} width="7" height={barHeight} />
              <rect class="tokenpanel-bulk-ramp-new" x={x} y={height - nextHeight} width="7" height={nextHeight} />
            </g>
          );
        })}
      </Rebuild>
    </svg>
  );
}

export interface BulkActionBarProps {
  entries: MaybeSignal<readonly FlatTabEntry[]>;
  operations: MaybeSignal<BulkOperations>;
  onOperationsChange: (operations: BulkOperations) => void;
  onClear: () => void;
  onApply: (patch: readonly BulkPatchEntry[]) => void;
}

function isOperationActive(operations: BulkOperations, key: keyof BulkOperations): boolean {
  const setMode = operations.setTo.trim() !== '';
  return setMode
    ? key === 'setTo'
    : key === 'multiply'
      ? operations.multiply.trim() !== '' && operations.multiply !== '1'
      : key === 'add'
        ? operations.add.trim() !== '' && operations.add !== '0'
        : key === 'roundToStep'
          ? operations.roundToStep.trim() !== ''
            && operations.roundToStep !== '0'
            && operations.roundToStep !== '0.125'
          : false;
}

export function BulkActionBar(props: BulkActionBarProps) {
  const { onOperationsChange, onClear, onApply } = props;
  const entries = computed(() => read(props.entries));
  const operations = computed(() => read(props.operations));
  const patch = computed(() => entries.value.flatMap((entry): BulkPatchEntry[] => {
    const value = transformBulkEntry(entry, operations.value);
    return value === null || value === entry.value ? [] : [{ address: entry.address, value }];
  }));

  const field = (key: keyof BulkOperations, label: string, attrs: Record<string, string>) => (
    <TextInput
      value={computed(() => operations.value[key])}
      class={computed(() => `tokenpanel-bulk-number-input${isOperationActive(operations.value, key) ? ' is-active' : ''}`)}
      attrs={{ inputmode: 'decimal', 'aria-label': label, ...attrs }}
      onInput={(value) => onOperationsChange({ ...operations.value, [key]: value })}
    />
  );

  return (
    <div class="tokenpanel-bulk-action-bar" data-testid="bulk-action-bar">
      <div class="tokenpanel-bulk-selection-count" role="status" aria-live="polite" data-testid="bulk-selection-count">
        {computed(() => `${entries.value.length} selected`)}
      </div>
      <label class="tokenpanel-bulk-operation">
        <span aria-hidden="true">×</span>
        {field('multiply', 'Multiply by', { 'data-testid': 'bulk-multiply' })}
      </label>
      <label class="tokenpanel-bulk-operation">
        <span aria-hidden="true">+</span>
        {field('add', 'Add', { 'data-testid': 'bulk-add' })}
      </label>
      <label class="tokenpanel-bulk-operation">
        <span>round to</span>
        {field('roundToStep', 'Round to step', { 'data-testid': 'bulk-round' })}
      </label>
      <label class="tokenpanel-bulk-operation">
        <span>set all</span>
        {field('setTo', 'Set all to', { 'data-testid': 'bulk-set', placeholder: '—' })}
      </label>
      <BulkRampSilhouette bars={computed(() => rampBars(entries.value, operations.value))} />
      <span class="tokenpanel-spacer" />
      <RoleButton
        class="tokenpanel-bulk-clear tokenpanel-action-link"
        onClick={onClear}
        data-testid="bulk-clear"
      >
        Clear
      </RoleButton>
      <RoleButton
        class="tokenpanel-bulk-apply"
        aria-disabled={computed(() => patch.value.length === 0)}
        onClick={() => { if (patch.value.length > 0) onApply(patch.value); }}
        data-testid="bulk-apply"
      >
        Apply to selection
      </RoleButton>
    </div>
  );
}
