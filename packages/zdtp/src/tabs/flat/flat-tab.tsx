/** @jsxImportSource @takazudo/zfb/zudo-react */
import { computed, getScope, Show, signal, type Child } from '@takazudo/zfb/zudo-react';
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
import { createTokenChainContribution } from '../../chain/token-chain-popover';
import { read, type MaybeSignal } from '../../zr/live';
import type { PanelServices } from '../../zr/panel-services';
import TierSection, { type TierItemOrder } from './tier-section';
import type { FlatTabEntry, RowContribution, TokenAddress } from './types';
import { tokenAddressKey } from './types';

export type FlatTabValueGetter = (address: TokenAddress, item: TierItem) => string;

export interface FlatTabProps {
  tab: TabConfig;
  getValue: MaybeSignal<FlatTabValueGetter>;
  setValue: (address: TokenAddress, next: string) => void;
  deleteValue: (address: TokenAddress) => void;
  overrides?: MaybeSignal<TabOverrides>;
  /** Fixed for the tab's lifetime; each contribution reads its own signals. */
  contributions?: readonly RowContribution[];
  /** Header-filter query; implemented as an S3 row contribution. */
  searchQuery?: MaybeSignal<string | undefined>;
  /** Transient S7 Changed-only filter; never persisted. */
  changedOnly?: MaybeSignal<boolean | undefined>;
  actions?: Child;
  class?: string;
  testId?: string;
  sectionTestId?: (tier: TierConfig) => string;
  orderItems?: TierItemOrder;
  /** Enables the shared numeric-selection action bar for this tab. */
  onBulkApply?: (patch: readonly BulkPatchEntry[]) => void;
  services: PanelServices;
}

export default function FlatTab(props: FlatTabProps) {
  const { tab, setValue, deleteValue, onBulkApply, services } = props;
  const overrides = computed(() => read(props.overrides) ?? {});
  const changedOnly = computed(() => read(props.changedOnly) ?? false);
  const allContributions = [
    ...(props.contributions ?? []),
    tokenSearchContribution(computed(() => read(props.searchQuery) ?? '')),
  ];
  const entriesByTier = computed(() => {
    const getValue = read(props.getValue);
    return new Map(tab.tiers.map((tier) => [
      tier.id,
      tier.items.map((item): FlatTabEntry => {
        const address = { tabId: tab.id, tierId: tier.id, itemId: item.id };
        return { address, tab, tier, item, value: getValue(address, item), kind: item.type.kind };
      }),
    ]));
  });
  // Selection follows the rows currently visible in the tab. This matters
  // when another contribution (search / changed-only) filters a row: a tier
  // select-all must not silently include an entry the user cannot see.
  const visibleEntriesByTier = computed(() => new Map(
    [...entriesByTier.value].map(([tierId, entries]) => [
      tierId,
      entries.filter((entry) => allContributions.every((contribution) => contribution.filter?.(entry) !== false)),
    ]),
  ));
  const selectedKeys = signal<ReadonlySet<string>>(new Set());
  const bulkOperations = signal<BulkOperations>(DEFAULT_BULK_OPERATIONS);
  const selectableEntries = computed(
    () => [...visibleEntriesByTier.value.values()].flat().filter(isBulkSelectable),
  );
  const selectedEntries = computed(
    () => selectableEntries.value.filter((entry) => selectedKeys.value.has(tokenAddressKey(entry.address))),
  );
  // A normal row edit can make a selected value unparseable (or activate a
  // pill). Drop that address from the action bar rather than retaining an
  // invisible, non-transformable selection.
  getScope().effect(() => {
    const selectable = new Set(selectableEntries.value.map((entry) => tokenAddressKey(entry.address)));
    const current = selectedKeys.value;
    let changed = false;
    const next = new Set<string>();
    for (const key of current) {
      if (selectable.has(key)) next.add(key);
      else changed = true;
    }
    if (changed) selectedKeys.value = next;
  });
  const toggleBulkEntry = (entry: FlatTabEntry, checked: boolean) => {
    const next = new Set(selectedKeys.value);
    const key = tokenAddressKey(entry.address);
    if (checked) next.add(key);
    else next.delete(key);
    selectedKeys.value = next;
  };
  const selectBulkTier = (tier: TierConfig, checked: boolean) => {
    const tierEntries = visibleEntriesByTier.value.get(tier.id) ?? [];
    const next = new Set(selectedKeys.value);
    for (const entry of tierEntries) {
      if (!isBulkSelectable(entry)) continue;
      const key = tokenAddressKey(entry.address);
      if (checked) next.add(key);
      else next.delete(key);
    }
    selectedKeys.value = next;
  };
  const quickBulkTier = (tier: TierConfig, factor: number) => {
    selectBulkTier(tier, true);
    bulkOperations.value = { ...bulkOperations.value, multiply: String(factor), add: '0', setTo: '' };
  };
  const applyBulkPatch = (patch: readonly BulkPatchEntry[]) => {
    if (!onBulkApply || patch.length === 0) return;
    onBulkApply(patch);
    // Match the prototype's one-shot action semantics: selection remains
    // visible, but multiply/add/set are reset so a second click cannot repeat
    // the same transform against the newly committed values.
    bulkOperations.value = { ...bulkOperations.value, multiply: '1', add: '0', setTo: '' };
  };
  const renderedContributions = onBulkApply
    ? [
        createBulkContribution({
          entriesByTier: visibleEntriesByTier,
          selectedKeys,
          operations: bulkOperations,
          onToggle: toggleBulkEntry,
          onSelectTier: selectBulkTier,
          onQuick: quickBulkTier,
        }),
        ...allContributions,
      ]
    : allContributions;
  const rowContributions = [...renderedContributions, createTokenChainContribution(services)];
  const hasVisibleEntries = computed(
    () => [...visibleEntriesByTier.value.values()].some((entries) => entries.length > 0),
  );
  const classes = ['tokenpanel-tab-content', props.class].filter(Boolean).join(' ');

  return (
    <div class={classes} data-testid={props.testId ?? null}>
      {props.actions}
      {tab.tiers.map((tier) => {
        const tierEntries = computed(() => visibleEntriesByTier.value.get(tier.id) ?? []);
        return (
          <Show when={computed(() => tierEntries.value.length > 0)}>
            {() => (
              <TierSection
                tier={tier}
                entries={tierEntries}
                overrides={overrides}
                contributions={rowContributions}
                testId={props.sectionTestId?.(tier)}
                setValue={setValue}
                deleteValue={deleteValue}
                orderItems={props.orderItems}
                services={services}
              />
            )}
          </Show>
        );
      })}
      <Show when={computed(() => onBulkApply !== undefined && selectedEntries.value.length > 0)}>
        {() => (
          <BulkActionBar
            entries={selectedEntries}
            operations={bulkOperations}
            onOperationsChange={(next) => {
              bulkOperations.value = next;
            }}
            onClear={() => {
              selectedKeys.value = new Set();
            }}
            onApply={applyBulkPatch}
          />
        )}
      </Show>
      <Show when={computed(() => changedOnly.value && !hasVisibleEntries.value)}>
        {() => (
          <div class="tokenpanel-changed-empty" data-testid="tokenpanel-changed-empty">
            No changed tokens in this tab — everything is at its manifest default.
          </div>
        )}
      </Show>
    </div>
  );
}
