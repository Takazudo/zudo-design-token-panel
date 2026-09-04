import { useEffect, useMemo, useRef } from 'preact/compat';
import type { ComponentChildren } from 'preact';
import { RoleButton } from '../controls/role-button';
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
  entriesByTier: ReadonlyMap<string, readonly FlatTabEntry[]>;
  selectedKeys: ReadonlySet<string>;
  operations: BulkOperations;
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
  entries: readonly FlatTabEntry[];
  selectedKeys: ReadonlySet<string>;
  onSelectTier: (tier: TierConfig, checked: boolean) => void;
  onQuick: (tier: TierConfig, factor: number) => void;
}

function BulkTierControls({
  tier,
  entries,
  selectedKeys,
  onSelectTier,
  onQuick,
}: BulkTierControlsProps): ComponentChildren {
  const selectable = useMemo(
    () => entries.filter(isBulkSelectable),
    [entries],
  );
  const selectedCount = selectable.reduce(
    (count, entry) => count + (selectedKeys.has(tokenAddressKey(entry.address)) ? 1 : 0),
    0,
  );
  const allSelected = selectable.length > 0 && selectedCount === selectable.length;
  const checkboxRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (checkboxRef.current) checkboxRef.current.indeterminate = selectedCount > 0 && !allSelected;
  }, [allSelected, selectedCount]);

  return (
    <span className="tokenpanel-bulk-tier-controls">
      <input
        ref={checkboxRef}
        type="checkbox"
        className="tokenpanel-bulk-checkbox tokenpanel-bulk-tier-checkbox"
        checked={allSelected}
        disabled={selectable.length === 0}
        aria-label={`Select all ${tier.label}`}
        data-testid={`bulk-select-tier-${tier.id}`}
        onChange={(event) => onSelectTier(tier, event.currentTarget.checked)}
      />
      <span className="tokenpanel-bulk-tier-quick">
        <RoleButton
          className="tokenpanel-bulk-quick-btn"
          aria-label={`Select ${tier.label} and multiply by 0.9`}
          title="Select tier and multiply by 0.9"
          data-testid={`bulk-quick-${tier.id}-0.9`}
          onClick={() => onQuick(tier, 0.9)}
        >
          ×0.9
        </RoleButton>
        <RoleButton
          className="tokenpanel-bulk-quick-btn"
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
  return {
    id: 'bulk',
    leading: (entry) => {
      if (!isBulkSelectable(entry)) return null;
      const selected = selectedKeys.has(tokenAddressKey(entry.address));
      return (
        <input
          type="checkbox"
          className="tokenpanel-bulk-checkbox tokenpanel-bulk-row-checkbox"
          checked={selected}
          aria-label={`Select ${entry.item.label}`}
          data-testid={`bulk-select-${tokenAddressKey(entry.address)}`}
          onChange={(event) => onToggle(entry, event.currentTarget.checked)}
        />
      );
    },
    className: (entry) => (
      selectedKeys.has(tokenAddressKey(entry.address)) && isBulkSelectable(entry)
        ? 'tokenpanel-row--bulk-selected'
        : undefined
    ),
    tail: (entry) => {
      if (!selectedKeys.has(tokenAddressKey(entry.address)) || !isBulkSelectable(entry)) return null;
      const next = transformBulkEntry(entry, operations);
      if (next === null || next === entry.value) return null;
      return (
        <span className="tokenpanel-bulk-preview" data-testid={`bulk-preview-${tokenAddressKey(entry.address)}`}>
          <span className="tokenpanel-bulk-preview-old">{entry.value}</span>
          <span className="tokenpanel-bulk-preview-arrow" aria-hidden="true">→</span>
          <span className="tokenpanel-bulk-preview-new">{next}</span>
        </span>
      );
    },
    tierHeadingExtra: (tier) => (
      <BulkTierControls
        tier={tier}
        entries={entriesByTier.get(tier.id) ?? []}
        selectedKeys={selectedKeys}
        onSelectTier={onSelectTier}
        onQuick={onQuick}
      />
    ),
  };
}

interface BulkRampSilhouetteProps {
  entries: readonly FlatTabEntry[];
  operations: BulkOperations;
}

function BulkRampSilhouette({ entries, operations }: BulkRampSilhouetteProps): ComponentChildren {
  const values = entries.map((entry) => {
    const current = numericValueForEntry(entry);
    const next = transformBulkEntry(entry, operations);
    const parsedNext = next === null ? null : parseNumericTransformValue(next, current?.unit ?? '');
    return { current: current?.magnitude ?? 0, next: parsedNext?.magnitude ?? current?.magnitude ?? 0 };
  });
  const max = Math.max(...values.flatMap((value) => [value.current, value.next]), 0.01);
  const width = Math.max(40, entries.length * 9);
  const height = 28;
  return (
    <svg
      className="tokenpanel-bulk-ramp"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Selected value ramp preview"
      data-testid="bulk-ramp-preview"
    >
      {values.map((value, index) => {
        const barHeight = (Math.max(0, value.current) / max) * height;
        const nextHeight = (Math.max(0, value.next) / max) * height;
        const x = index * 9;
        return (
          <g key={index}>
            <rect className="tokenpanel-bulk-ramp-old" x={x} y={height - barHeight} width="7" height={barHeight} />
            <rect className="tokenpanel-bulk-ramp-new" x={x} y={height - nextHeight} width="7" height={nextHeight} />
          </g>
        );
      })}
    </svg>
  );
}

export interface BulkActionBarProps {
  entries: readonly FlatTabEntry[];
  operations: BulkOperations;
  onOperationsChange: (operations: BulkOperations) => void;
  onClear: () => void;
  onApply: (patch: readonly BulkPatchEntry[]) => void;
}

export function BulkActionBar({
  entries,
  operations,
  onOperationsChange,
  onClear,
  onApply,
}: BulkActionBarProps): ComponentChildren {
  const patch = entries.flatMap((entry): BulkPatchEntry[] => {
    const value = transformBulkEntry(entry, operations);
    return value === null || value === entry.value ? [] : [{ address: entry.address, value }];
  });
  const setOperation = (key: keyof BulkOperations) => (event: React.ChangeEvent<HTMLInputElement>) => {
    onOperationsChange({ ...operations, [key]: event.currentTarget.value });
  };
  const operationClass = (key: keyof BulkOperations): string => {
    const setMode = operations.setTo.trim() !== '';
    const active = setMode
      ? key === 'setTo'
      : key === 'multiply'
        ? operations.multiply.trim() !== '' && operations.multiply !== '1'
        : key === 'add'
          ? operations.add.trim() !== '' && operations.add !== '0'
          : operations.roundToStep.trim() !== ''
            && operations.roundToStep !== '0'
            && operations.roundToStep !== '0.125';
    return `tokenpanel-bulk-number-input${active ? ' is-active' : ''}`;
  };

  return (
    <div className="tokenpanel-bulk-action-bar" data-testid="bulk-action-bar">
      <div className="tokenpanel-bulk-selection-count" role="status" aria-live="polite" data-testid="bulk-selection-count">
        {entries.length} selected
      </div>
      <label className="tokenpanel-bulk-operation">
        <span aria-hidden="true">×</span>
        <input
          type="text"
          inputMode="decimal"
          value={operations.multiply}
          aria-label="Multiply by"
          data-testid="bulk-multiply"
          className={operationClass('multiply')}
          onInput={setOperation('multiply')}
        />
      </label>
      <label className="tokenpanel-bulk-operation">
        <span aria-hidden="true">+</span>
        <input
          type="text"
          inputMode="decimal"
          value={operations.add}
          aria-label="Add"
          data-testid="bulk-add"
          className={operationClass('add')}
          onInput={setOperation('add')}
        />
      </label>
      <label className="tokenpanel-bulk-operation">
        <span>round to</span>
        <input
          type="text"
          inputMode="decimal"
          value={operations.roundToStep}
          aria-label="Round to step"
          data-testid="bulk-round"
          className={operationClass('roundToStep')}
          onInput={setOperation('roundToStep')}
        />
      </label>
      <label className="tokenpanel-bulk-operation">
        <span>set all</span>
        <input
          type="text"
          inputMode="decimal"
          value={operations.setTo}
          placeholder="—"
          aria-label="Set all to"
          data-testid="bulk-set"
          className={operationClass('setTo')}
          onInput={setOperation('setTo')}
        />
      </label>
      <BulkRampSilhouette entries={entries} operations={operations} />
      <span className="tokenpanel-spacer" />
      <RoleButton
        className="tokenpanel-bulk-clear tokenpanel-action-link"
        onClick={onClear}
        data-testid="bulk-clear"
      >
        Clear
      </RoleButton>
      <RoleButton
        className="tokenpanel-bulk-apply"
        aria-disabled={patch.length === 0}
        onClick={() => { if (patch.length > 0) onApply(patch); }}
        data-testid="bulk-apply"
      >
        Apply to selection
      </RoleButton>
    </div>
  );
}
