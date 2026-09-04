import { createContext } from 'preact';
import { useContext } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
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

interface TokenControllerRegistry {
  entries: ReadonlyMap<string, FlatTabEntry>;
  setValue: (address: TokenAddress, next: string) => void;
  deleteValue: (address: TokenAddress) => void;
  jumpTo?: (address: TokenAddress) => void;
}

const TokenControllerContext = createContext<TokenControllerRegistry | null>(null);

interface TokenControllerProviderProps extends TokenControllerRegistry {
  children: ComponentChildren;
}

export function TokenControllerProvider({ children, ...registry }: TokenControllerProviderProps) {
  return (
    <TokenControllerContext.Provider value={registry}>
      {children}
    </TokenControllerContext.Provider>
  );
}

export function useTokenController(address: TokenAddress): TokenController {
  const registry = useContext(TokenControllerContext);
  if (registry === null) {
    throw new Error('useTokenController must be used inside a FlatTab.');
  }
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

