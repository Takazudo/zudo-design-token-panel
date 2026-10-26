import type { FlatTabEntry, TokenAddress } from './types';
import { tokenAddressKey } from './types';

export interface TokenController {
  value: string;
  setValue: (next: string) => void;
  revert: () => void;
  kind: FlatTabEntry['kind'];
  entry: FlatTabEntry;
  readonly: boolean;
  jumpTo?: () => void;
}

export interface TokenControllerRegistry {
  entries: ReadonlyMap<string, FlatTabEntry>;
  setValue: (address: TokenAddress, next: string) => void;
  deleteValue: (address: TokenAddress) => void;
  jumpTo?: (address: TokenAddress) => void;
}

/** The read/write handle for one token address in `registry`. */
export function getTokenController(
  registry: TokenControllerRegistry,
  address: TokenAddress,
): TokenController {
  const entry = registry.entries.get(tokenAddressKey(address));
  if (entry === undefined) {
    throw new Error(`Unknown token address: ${tokenAddressKey(address)}`);
  }

  const isColorTab = address.tabId === 'color' || address.tabId === 'color-secondary';
  return {
    value: entry.value,
    setValue: isColorTab ? () => undefined : (next) => registry.setValue(address, next),
    revert: isColorTab ? () => undefined : () => registry.deleteValue(address),
    kind: entry.kind,
    entry,
    readonly: isColorTab,
    ...(isColorTab && registry.jumpTo
      ? { jumpTo: () => registry.jumpTo?.(address) }
      : {}),
  };
}
