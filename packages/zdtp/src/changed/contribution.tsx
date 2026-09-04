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
import type { RowContribution } from '../tabs/flat/types';
import { RoleButton } from '../controls/role-button';

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
function ChangedTail({ defaultValue, currentValue }: { defaultValue: string; currentValue: string }) {
  return (
    <span className="tokenpanel-changed-tail" data-testid="tokenpanel-changed-tail">
      <span className="tokenpanel-changed-tail-prefix">default </span>
      <span className="tokenpanel-changed-tail-old">{defaultValue}</span>
      <span className="tokenpanel-changed-tail-arrow"> → </span>
      <span className="tokenpanel-changed-tail-new">{currentValue}</span>
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
      className="tokenpanel-changed-revert"
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
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
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
 * never mutates state directly.
 */
export function changedContribution(options: ChangedContributionOptions): RowContribution {
  const changed = (entry: Parameters<NonNullable<RowContribution['filter']>>[0]): boolean =>
    entryChanged(entry.address, options);

  return {
    id: 'changed-state',
    filter: (entry) => !options.changedOnly || changed(entry),
    className: (entry) => changed(entry) ? 'is-changed' : undefined,
    trailing: (entry) => changed(entry) ? (
      <RevertControl
        address={entry.address}
        label={entry.item.cssVar}
        onRevert={options.onRevert}
      />
    ) : null,
    tail: (entry) => changed(entry) ? (
      <ChangedTail defaultValue={entry.item.default} currentValue={entry.value} />
    ) : null,
  };
}

/** Explicit factory alias for feature callers and downstream consumers. */
export const createChangedContribution = changedContribution;
export const changedStateContribution = changedContribution;

// Keep the S2 updater available to callers that need to build a transaction
// callback without importing implementation details from this module.
export { revertEntry };
