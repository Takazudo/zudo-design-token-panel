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

export interface TweakStateTransactionOptions {
  cfg: PanelConfig;
  getState: () => TweakState | null;
  /** Publish the committed state; the transaction already treats it as current. */
  setState: (next: TweakState) => void;
  history?: TweakHistory;
}

export type CommitTweakState = (
  reason: string,
  next: TweakStateUpdater,
  opts?: CommitTweakStateOptions,
) => void;

export interface TweakStateTransaction {
  commitTweakState: CommitTweakState;
  history: TweakHistory;
}

/**
 * The sole state-mutation pipeline for a mounted panel. Side effects retain
 * the established order: apply, persist, then publish component state.
 */
export function createTweakStateTransaction({
  cfg,
  getState,
  setState,
  history = createTweakHistory(),
}: TweakStateTransactionOptions): TweakStateTransaction {
  const restore = (next: TweakState) => {
    clearAppliedColorStyles(undefined, undefined, cfg);
    applyFullState(next, cfg);
    savePersistedState(next, undefined, cfg);
    setState(next);
  };

  history.configure({
    restore,
    getCurrentState: getState,
    getIdentity: () => getActiveColorIdentity(getActivePrimaryCluster(cfg), cfg),
  });

  const commitTweakState: CommitTweakState = (reason, updaterOrState, opts = {}) => {
    const before = getState();
    if (!before && typeof updaterOrState === 'function') return;
    const next =
      typeof updaterOrState === 'function' ? updaterOrState(before as TweakState) : updaterOrState;

    opts.beforeApply?.();
    if (opts.apply !== false) (opts.apply ?? ((value) => applyFullState(value, cfg)))(next);
    if (opts.save !== false)
      (opts.save ?? ((value) => savePersistedState(value, undefined, cfg)))(next);
    setState(next);

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
  };

  return { commitTweakState, history };
}
