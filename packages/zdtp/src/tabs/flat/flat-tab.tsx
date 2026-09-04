import type { ComponentChildren } from 'preact';
import { useMemo } from 'preact/compat';
import type { TabOverrides } from '../../apply/tier-resolver';
import type { TabConfig, TierConfig, TierItem } from '../../tokens/tier-model';
import { TokenControllerProvider } from './token-controller';
import TierSection, { type SharedRowRenderer } from './tier-section';
import type { FlatTabEntry, RowContribution, TokenAddress } from './types';
import { tokenAddressKey } from './types';
import { TOKEN_CHAIN_CONTRIBUTION } from '../../chain';

export interface FlatTabProps {
  tab: TabConfig;
  getValue: (address: TokenAddress, item: TierItem) => string;
  setValue: (address: TokenAddress, next: string) => void;
  deleteValue: (address: TokenAddress) => void;
  overrides?: TabOverrides;
  contributions?: readonly RowContribution[];
  actions?: ComponentChildren;
  className?: string;
  testId?: string;
  sectionTestId?: (tier: TierConfig) => string;
  renderTierBody?: (tier: TierConfig, renderRow: SharedRowRenderer) => ComponentChildren;
  jumpTo?: (address: TokenAddress) => void;
}

export default function FlatTab({
  tab,
  getValue,
  setValue,
  deleteValue,
  overrides = {},
  contributions = [],
  actions,
  className,
  testId,
  sectionTestId,
  renderTierBody,
  jumpTo,
}: FlatTabProps) {
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
  const rowContributions = useMemo(
    () => [...contributions, TOKEN_CHAIN_CONTRIBUTION],
    [contributions],
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
            contributions.every((contribution) => contribution.filter?.(entry) !== false));
          return (
            <TierSection
              key={tier.id}
              tier={tier}
              entries={tierEntries}
              overrides={overrides}
              contributions={rowContributions}
              testId={sectionTestId?.(tier)}
              setValue={setValue}
              deleteValue={deleteValue}
              renderTierBody={renderTierBody}
            />
          );
        })}
      </div>
    </TokenControllerProvider>
  );
}
