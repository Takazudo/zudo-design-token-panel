import type { Child, ReadonlySignal } from '@takazudo/zfb/zudo-react';
import type { TabConfig, TierConfig, TierItem, TierValueKind } from '../../tokens/tier-model';

export interface TokenAddress {
  tabId: string;
  tierId: string;
  itemId: string;
}

export interface FlatTabEntry {
  address: TokenAddress;
  tab: TabConfig;
  tier: TierConfig;
  item: TierItem;
  value: string;
  kind: TierValueKind['kind'];
}

/**
 * A feature's hooks into every FlatTab row. A contribution object lives as
 * long as the tab that owns it, so its functions read any changing state from
 * signals: `filter` and `className` are re-run reactively, while the region
 * renderers are called once per mounted row (or tier heading) and return
 * zudo-react children that track the row's `entry` signal themselves.
 */
export interface RowContribution {
  id: string;
  filter?: (entry: FlatTabEntry) => boolean;
  leading?: (entry: ReadonlySignal<FlatTabEntry>) => Child;
  trailing?: (entry: ReadonlySignal<FlatTabEntry>) => Child;
  tail?: (entry: ReadonlySignal<FlatTabEntry>) => Child;
  className?: (entry: FlatTabEntry) => string | undefined;
  tierHeadingExtra?: (tier: TierConfig) => Child;
}

export function tokenAddressKey(address: TokenAddress): string {
  return [address.tabId, address.tierId, address.itemId].map(encodeURIComponent).join('/');
}
