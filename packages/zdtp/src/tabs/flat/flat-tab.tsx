import type { ComponentChildren } from 'preact';
import { useCallback, useEffect, useMemo, useState } from 'preact/compat';
import {
  BulkActionBar,
  createBulkContribution,
  DEFAULT_BULK_OPERATIONS,
  isBulkSelectable,
  type BulkOperations,
  type BulkPatchEntry,
} from '../../bulk';
import type { TabOverrides } from '../../apply/tier-resolver';
import type { TabConfig, TierConfig, TierItem } from '../../tokens/tier-model';
import { tokenSearchContribution } from '../../search/contribution';
import { TokenControllerProvider } from './token-controller';
import TierSection, { type SharedRowRenderer } from './tier-section';
import type { FlatTabEntry, RowContribution, TokenAddress } from './types';
import { tokenAddressKey } from './types';

export interface FlatTabProps {
  tab: TabConfig;
  getValue: (address: TokenAddress, item: TierItem) => string;
  setValue: (address: TokenAddress, next: string) => void;
  deleteValue: (address: TokenAddress) => void;
  overrides?: TabOverrides;
  contributions?: readonly RowContribution[];
  /** Header-filter query; implemented as an S3 row contribution. */
  searchQuery?: string;
  /** Transient S7 Changed-only filter; never persisted. */
  changedOnly?: boolean;
  actions?: ComponentChildren;
  className?: string;
  testId?: string;
  sectionTestId?: (tier: TierConfig) => string;
  renderTierBody?: (tier: TierConfig, renderRow: SharedRowRenderer) => ComponentChildren;
  jumpTo?: (address: TokenAddress) => void;
  /** Enables the shared numeric-selection action bar for this tab. */
  onBulkApply?: (patch: readonly BulkPatchEntry[]) => void;
}

export default function FlatTab({
  tab,
  getValue,
  setValue,
  deleteValue,
  overrides = {},
  contributions = [],
  searchQuery = '',
  changedOnly = false,
  actions,
  className,
  testId,
  sectionTestId,
  renderTierBody,
  jumpTo,
  onBulkApply,
}: FlatTabProps) {
  const allContributions = useMemo(
    () => searchQuery.trim()
      ? [...contributions, tokenSearchContribution(searchQuery)]
      : contributions,
    [contributions, searchQuery],
  );
  const entriesByTier = useMemo(() => new Map(tab.tiers.map((tier) => [
    tier.id,
    tier.items.map((item): FlatTabEntry => {
      const address = { tabId: tab.id, tierId: tier.id, itemId: item.id };
      return { address, tab, tier, item, value: getValue(address, item), kind: item.type.kind };
    }),
  ])), [getValue, tab]);
  const allEntries = useMemo(() => {
    const entries = new Map<string, FlatTabEntry>();
    for (const tierEntries of entriesByTier.values()) {
      for (const entry of tierEntries) entries.set(tokenAddressKey(entry.address), entry);
    }
    return entries;
  }, [entriesByTier]);
  // Selection follows the rows currently visible in the tab. This matters
  // when another contribution (search / changed-only) filters a row: a tier
  // select-all must not silently include an entry the user cannot see.
  const visibleEntriesByTier = useMemo(() => new Map(
    [...entriesByTier].map(([tierId, entries]) => [
      tierId,
      entries.filter((entry) => allContributions.every((contribution) => contribution.filter?.(entry) !== false)),
    ]),
  ), [allContributions, entriesByTier]);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => new Set());
  const [bulkOperations, setBulkOperations] = useState<BulkOperations>(DEFAULT_BULK_OPERATIONS);
  const selectableEntries = useMemo(
    () => [...visibleEntriesByTier.values()].flat().filter(isBulkSelectable),
    [visibleEntriesByTier],
  );
  const selectedEntries = useMemo(
    () => selectableEntries.filter((entry) => selectedKeys.has(tokenAddressKey(entry.address))),
    [selectableEntries, selectedKeys],
  );
  // A normal row edit can make a selected value unparseable (or activate a
  // pill). Drop that address from the action bar rather than retaining an
  // invisible, non-transformable selection.
  useEffect(() => {
    const selectableKeys = new Set(selectableEntries.map((entry) => tokenAddressKey(entry.address)));
    setSelectedKeys((current) => {
      let changed = false;
      const next = new Set<string>();
      for (const key of current) {
        if (selectableKeys.has(key)) next.add(key);
        else changed = true;
      }
      return changed ? next : current;
    });
  }, [selectableEntries]);
  const toggleBulkEntry = useCallback((entry: FlatTabEntry, checked: boolean) => {
    const key = tokenAddressKey(entry.address);
    setSelectedKeys((current) => {
      const next = new Set(current);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  }, []);
  const selectBulkTier = useCallback((tier: TierConfig, checked: boolean) => {
    const tierEntries = visibleEntriesByTier.get(tier.id) ?? [];
    setSelectedKeys((current) => {
      const next = new Set(current);
      for (const entry of tierEntries) {
        if (!isBulkSelectable(entry)) continue;
        const key = tokenAddressKey(entry.address);
        if (checked) next.add(key);
        else next.delete(key);
      }
      return next;
    });
  }, [visibleEntriesByTier]);
  const quickBulkTier = useCallback((tier: TierConfig, factor: number) => {
    selectBulkTier(tier, true);
    setBulkOperations((current) => ({
      ...current,
      multiply: String(factor),
      add: '0',
      setTo: '',
    }));
  }, [selectBulkTier]);
  const clearBulkSelection = useCallback(() => {
    setSelectedKeys(new Set());
  }, []);
  const applyBulkPatch = useCallback((patch: readonly BulkPatchEntry[]) => {
    if (!onBulkApply || patch.length === 0) return;
    onBulkApply(patch);
    // Match the prototype's one-shot action semantics: selection remains
    // visible, but multiply/add/set are reset so a second click cannot repeat
    // the same transform against the newly committed values.
    setBulkOperations((current) => ({
      ...current,
      multiply: '1',
      add: '0',
      setTo: '',
    }));
  }, [onBulkApply]);
  const bulkContribution = useMemo(() => {
    if (!onBulkApply) return null;
    return createBulkContribution({
      entriesByTier: visibleEntriesByTier,
      selectedKeys,
      operations: bulkOperations,
      onToggle: toggleBulkEntry,
      onSelectTier: selectBulkTier,
      onQuick: quickBulkTier,
    });
  }, [
    bulkOperations,
    onBulkApply,
    quickBulkTier,
    selectBulkTier,
    selectedKeys,
    toggleBulkEntry,
    visibleEntriesByTier,
  ]);
  const renderedContributions = useMemo(
    () => bulkContribution ? [bulkContribution, ...allContributions] : allContributions,
    [allContributions, bulkContribution],
  );
  const hasVisibleEntries = useMemo(
    () => [...visibleEntriesByTier.values()].some((entries) => entries.length > 0),
    [visibleEntriesByTier],
  );
  const classes = ['tokenpanel-tab-content', className].filter(Boolean).join(' ');

  return (
    <TokenControllerProvider
      entries={allEntries}
      setValue={setValue}
      deleteValue={deleteValue}
      jumpTo={jumpTo}
    >
      <div className={classes} {...(testId ? { 'data-testid': testId } : {})}>
        {actions}
        {tab.tiers.map((tier) => {
          const tierEntries = (entriesByTier.get(tier.id) ?? []).filter((entry) =>
            renderedContributions.every((contribution) => contribution.filter?.(entry) !== false));
          if (tierEntries.length === 0) return null;
          return (
            <TierSection
              key={tier.id}
              tier={tier}
              entries={tierEntries}
              overrides={overrides}
              contributions={renderedContributions}
              testId={sectionTestId?.(tier)}
              setValue={setValue}
              deleteValue={deleteValue}
              renderTierBody={renderTierBody}
            />
          );
        })}
        {onBulkApply && selectedEntries.length > 0 && (
          <BulkActionBar
            entries={selectedEntries}
            operations={bulkOperations}
            onOperationsChange={setBulkOperations}
            onClear={clearBulkSelection}
            onApply={applyBulkPatch}
          />
        )}
        {changedOnly && !hasVisibleEntries && (
          <div className="tokenpanel-changed-empty" data-testid="tokenpanel-changed-empty">
            No changed tokens in this tab — everything is at its manifest default.
          </div>
        )}
      </div>
    </TokenControllerProvider>
  );
}
