/** @jsxImportSource @takazudo/zfb/zudo-react */
/**
 * Changed-state row contribution.
 *
 * The S2 token evaluator is deliberately the only source of truth here.  A
 * row's visual state, Changed-only filtering, ghost value, and revert affordance
 * all consult the same `isChanged` result for the row's stable token address.
 */

import type { PanelConfig } from '../config/panel-config';
import type { TweakState } from '../state/tweak-state';
import {
  isChanged,
  revertEntry,
  type ColorBaseline,
} from '../utils/token-diff';
import type { TokenIndex, TokenAddress } from '../utils/token-index';
import { computed, Show, type ReadonlySignal } from '@takazudo/zfb/zudo-react';
import type { FlatTabEntry, RowContribution } from '../tabs/flat/types';
import { RoleButton } from '../controls/role-button';
import { read, type MaybeSignal } from '../zr/live';

export interface ChangedContributionOptions {
  index: TokenIndex;
  state: TweakState;
  baseline: ColorBaseline;
  cfg: PanelConfig;
  /** True while the active tab's transient Changed-only filter is enabled. */
  changedOnly?: boolean;
  /** Reverts one stable token address through the shell transaction. */
  onRevert: (address: TokenAddress) => void;
}

function entryChanged(
  address: TokenAddress,
  options: ChangedContributionOptions,
): boolean {
  const entry = options.index.entry(address);
  return entry ? isChanged(entry, options.state, options.baseline, options.cfg) : false;
}

/** A stable text-only ghost line that survives hostile host styles. */
function ChangedTail({ defaultValue, currentValue }: { defaultValue: string; currentValue: ReadonlySignal<string> }) {
  return (
    <span
      class="tokenpanel-changed-tail"
      data-testid="tokenpanel-changed-tail"
      title={computed(() => `default ${defaultValue} → ${currentValue.value}`)}
    >
      <span class="tokenpanel-changed-tail-prefix">default </span>
      <span class="tokenpanel-changed-tail-old">{defaultValue}</span>
      <span class="tokenpanel-changed-tail-arrow"> → </span>
      <span class="tokenpanel-changed-tail-new">{currentValue}</span>
    </span>
  );
}

function RevertControl({
  address,
  label,
  onRevert,
}: {
  address: TokenAddress;
  label: string;
  onRevert: (address: TokenAddress) => void;
}) {
  return (
    <RoleButton
      class="tokenpanel-changed-revert"
      aria-label={`Revert ${label}`}
      title="Revert to default"
      onClick={() => onRevert(address)}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M3 12a9 9 0 1 0 3-6.7" />
        <path d="M3 4v6h6" />
      </svg>
    </RoleButton>
  );
}

/**
 * Build the contribution used by FlatTab-based token lists.  `revertEntry`
 * remains in the shell callback rather than here so this presentation seam
 * never mutates state directly. The options may be a signal so one
 * contribution follows the shell's state for the tab's whole lifetime; with
 * no options every row reads as unchanged.
 */
export function changedContribution(
  source: MaybeSignal<ChangedContributionOptions | undefined>,
): RowContribution {
  const changed = (entry: FlatTabEntry): boolean => {
    const options = read(source);
    return options ? entryChanged(entry.address, options) : false;
  };

  return {
    id: 'changed-state',
    filter: (entry) => !read(source)?.changedOnly || changed(entry),
    className: (entry) => changed(entry) ? 'is-changed' : undefined,
    trailing: (entry) => (
      <Show when={computed(() => changed(entry.value))}>
        {() => (
          <RevertControl
            address={entry.value.address}
            label={entry.value.item.cssVar}
            onRevert={(address) => read(source)?.onRevert(address)}
          />
        )}
      </Show>
    ),
    tail: (entry) => (
      <Show when={computed(() => changed(entry.value))}>
        {() => (
          <ChangedTail
            defaultValue={entry.value.item.default}
            currentValue={computed(() => entry.value.value)}
          />
        )}
      </Show>
    ),
  };
}

/** Explicit factory alias for feature callers and downstream consumers. */
export const createChangedContribution = changedContribution;
export const changedStateContribution = changedContribution;

// Keep the S2 updater available to callers that need to build a transaction
// callback without importing implementation details from this module.
export { revertEntry };
