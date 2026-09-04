import type { ComponentChildren } from 'preact';
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

export interface RowContribution {
  id: string;
  filter?: (entry: FlatTabEntry) => boolean;
  leading?: (entry: FlatTabEntry) => ComponentChildren;
  trailing?: (entry: FlatTabEntry) => ComponentChildren;
  tail?: (entry: FlatTabEntry) => ComponentChildren;
  className?: (entry: FlatTabEntry) => string | undefined;
  tierHeadingExtra?: (tier: TierConfig) => ComponentChildren;
}

export function tokenAddressKey(address: TokenAddress): string {
  return [address.tabId, address.tierId, address.itemId].map(encodeURIComponent).join('/');
}
