import { createContext } from 'preact';
import { useContext, useMemo } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import type { PanelConfig } from '../config/panel-config';
import type { TweakState } from '../state/tweak-state';
import { buildTokenGraph, type TokenGraph } from '../utils/token-graph';

export interface TokenChainContextValue {
  graph: TokenGraph;
}

const TokenChainContext = createContext<TokenChainContextValue | null>(null);

export interface TokenChainProviderProps {
  instanceConfig: PanelConfig;
  state: TweakState | null;
  children?: ComponentChildren;
}

/**
 * Keeps the dependency graph tied to the mounted panel instance and its live
 * tweak state. A chain control rendered outside this provider simply degrades
 * to no chain affordance, which keeps the row primitives useful in isolation.
 */
export function TokenChainProvider({
  instanceConfig,
  state,
  children,
}: TokenChainProviderProps) {
  const graph = useMemo(
    () => (state ? buildTokenGraph(instanceConfig, state) : null),
    [instanceConfig, state],
  );
  const value = useMemo<TokenChainContextValue | null>(
    () => (graph ? { graph } : null),
    [graph],
  );

  return <TokenChainContext.Provider value={value}>{children}</TokenChainContext.Provider>;
}

export function useTokenChainContext(): TokenChainContextValue | null {
  return useContext(TokenChainContext);
}
