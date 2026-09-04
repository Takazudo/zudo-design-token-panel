import { useCallback, useMemo, useRef } from 'preact/hooks';

import type { PanelConfig } from '../config/panel-config';
import { structuralEqual } from '../utils/structural-equal';
import { createTweakHistory, type TweakHistory } from './history';
import {
  applyFullState,
  clearAppliedColorStyles,
  getActiveColorIdentity,
  getActivePrimaryCluster,
  savePersistedState,
  type TweakState,
} from './tweak-state';

export type TweakStateUpdater = TweakState | ((previous: TweakState) => TweakState);
type SetState = (updater: (previous: TweakState | null) => TweakState | null) => void;

export interface CommitTweakStateOptions {
  address?: string;
  record?: boolean;
  forceRecord?: boolean;
  resetHistory?: boolean;
  timestamp?: number;
  beforeApply?: () => void;
  apply?: false | ((next: TweakState) => void);
  save?: false | ((next: TweakState) => void);
}

function changedLeafAddress(before: unknown, after: unknown, path = ''): string | undefined {
  if (structuralEqual(before, after)) return undefined;
  if (
    before === null ||
    after === null ||
    typeof before !== 'object' ||
    typeof after !== 'object' ||
    Array.isArray(before) !== Array.isArray(after)
  ) {
    return path || undefined;
  }
  const keys = new Set([
    ...Object.keys(before as Record<string, unknown>),
    ...Object.keys(after as Record<string, unknown>),
  ]);
  let found: string | undefined;
  for (const key of keys) {
    const child = changedLeafAddress(
      (before as Record<string, unknown>)[key],
      (after as Record<string, unknown>)[key],
      path ? `${path}.${key}` : key,
    );
    if (child === undefined) continue;
    if (found !== undefined) return undefined;
    found = child;
  }
  return found;
}

/**
 * The sole state-mutation pipeline for a mounted panel. Side effects retain
 * the established order: apply, persist, then publish component state.
 */
export function useTweakStateTransaction(
  state: TweakState | null,
  setState: SetState,
  cfg: PanelConfig,
): {
  commitTweakState: (
    reason: string,
    next: TweakStateUpdater,
    opts?: CommitTweakStateOptions,
  ) => void;
  history: TweakHistory;
} {
  const currentRef = useRef<TweakState | null>(state);
  currentRef.current = state;
  const history = useMemo(() => createTweakHistory(), []);

  const restore = useCallback(
    (next: TweakState) => {
      clearAppliedColorStyles(undefined, undefined, cfg);
      applyFullState(next, cfg);
      savePersistedState(next, undefined, cfg);
      currentRef.current = next;
      setState(() => next);
    },
    [cfg, setState],
  );

  history.configure({
    restore,
    getCurrentState: () => currentRef.current,
    getIdentity: () => getActiveColorIdentity(getActivePrimaryCluster(cfg), cfg),
  });

  const commitTweakState = useCallback(
    (reason: string, updaterOrState: TweakStateUpdater, opts: CommitTweakStateOptions = {}) => {
      const before = currentRef.current;
      if (!before && typeof updaterOrState === 'function') return;
      const next =
        typeof updaterOrState === 'function'
          ? updaterOrState(before as TweakState)
          : updaterOrState;

      opts.beforeApply?.();
      if (opts.apply !== false) (opts.apply ?? ((value) => applyFullState(value, cfg)))(next);
      if (opts.save !== false)
        (opts.save ?? ((value) => savePersistedState(value, undefined, cfg)))(next);
      currentRef.current = next;
      setState(() => next);

      if (before && opts.record !== false) {
        history.record(
          {
            reason,
            address:
              opts.address ?? (reason === 'persist' ? changedLeafAddress(before, next) : undefined),
            identity: getActiveColorIdentity(getActivePrimaryCluster(cfg), cfg),
            before,
            after: next,
            timestamp: opts.timestamp ?? Date.now(),
          },
          { reset: opts.resetHistory, force: opts.forceRecord },
        );
      }
    },
    [cfg, history, setState],
  );

  return { commitTweakState, history };
}
