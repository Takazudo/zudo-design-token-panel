import { computed, type ReadonlySignal } from '@takazudo/zfb/zudo-react';
import type { PanelConfig } from '../config/panel-config';
import type { TweakState } from '../state/tweak-state';
import { buildTokenGraph, type TokenGraph } from '../utils/token-graph';

export interface TokenChainContextValue {
  graph: TokenGraph;
}

/**
 * The dependency graph of the mounted panel instance, tied to its live tweak
 * state. A chain control given null simply degrades to no chain affordance,
 * which keeps the row primitives useful in isolation.
 */
export function tokenChainSignal(
  instanceConfig: PanelConfig,
  state: ReadonlySignal<TweakState | null>,
): ReadonlySignal<TokenChainContextValue | null> {
  let last: { state: TweakState; value: TokenChainContextValue } | null = null;
  return computed(() => {
    const current = state.value;
    if (!current) return null;
    if (last?.state !== current) last = { state: current, value: { graph: buildTokenGraph(instanceConfig, current) } };
    return last.value;
  });
}
