import type { ComponentChildren } from 'preact';
import { useCallback, useMemo } from 'preact/compat';
import type { TabOverrides } from '../../apply/tier-resolver';
import type { TierConfig, TierItem } from '../../tokens/tier-model';
import TokenRow from './token-row';
import type { FlatTabEntry, RowContribution, TokenAddress } from './types';

export type SharedRowRenderer = (item: TierItem) => ComponentChildren;

export interface TierSectionProps {
  tier: TierConfig;
  entries: readonly FlatTabEntry[];
  overrides: TabOverrides;
  contributions?: readonly RowContribution[];
  testId?: string;
  setValue: (address: TokenAddress, next: string) => void;
  deleteValue: (address: TokenAddress) => void;
  renderTierBody?: (tier: TierConfig, renderRow: SharedRowRenderer) => ComponentChildren;
}

function TierSection({
  tier,
  entries,
  overrides,
  contributions = [],
  testId,
  setValue,
  deleteValue,
  renderTierBody,
}: TierSectionProps) {
  const entryByItem = useMemo(() => new Map(entries.map((entry) => [entry.item.id, entry])), [entries]);
  const renderRow = useCallback<SharedRowRenderer>((item) => {
    const entry = entryByItem.get(item.id);
    if (!entry) return null;
    return (
      <TokenRow
        key={item.id}
        entry={entry}
        overrides={overrides}
        contributions={contributions}
        onChange={setValue}
        onDelete={deleteValue}
      />
    );
  }, [contributions, deleteValue, entryByItem, overrides, setValue]);

  return (
    <div className="tokenpanel-tab-section" {...(testId ? { 'data-testid': testId } : {})}>
      <div role="heading" aria-level={3} className="tokenpanel-tab-section-heading">
        {tier.label}
        {contributions.map((contribution) => contribution.tierHeadingExtra
          ? <span key={contribution.id} className="tokenpanel-tab-section-heading-extra">{contribution.tierHeadingExtra(tier)}</span>
          : null)}
      </div>
      <div className="tokenpanel-tab-grid">
        {renderTierBody
          ? renderTierBody(tier, renderRow)
          : tier.items.map((item) => renderRow(item))}
      </div>
    </div>
  );
}

export default TierSection;
