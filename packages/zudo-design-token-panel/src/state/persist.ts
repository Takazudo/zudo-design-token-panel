/**
 * `usePersist` hook — orchestrates setState + DOM apply + localStorage write
 * for the design-token panel. Each callback is a persist pipeline:
 *
 *   updater  →  setState(updater)  →  applyFullState(next)  →  savePersistedState(next)
 *
 * The slice-specific helpers (`persistColor`, `persistSpacing`, etc.) wrap a
 * slice updater into a full-state updater so callers don't have to thread the
 * whole envelope themselves.
 *
 * Framework-agnostic wrt. the setState function: pass any
 * `(updater) => void` that propagates `updater(prev)` to the caller's state.
 * In practice the panel passes Preact's `setState` from `useState`.
 */

import { useCallback } from 'preact/hooks';

import {
  applyFullState,
  savePersistedState,
  type ColorTweakState,
  type TokenOverrides,
  type TweakState,
} from './tweak-state';

type SetState<T> = (updater: (prev: T | null) => T | null) => void;

export function usePersist(setState: SetState<TweakState>) {
  const persist = useCallback(
    (updater: (prev: TweakState) => TweakState) => {
      setState((prev) => {
        if (!prev) return prev;
        const next = updater(prev);
        applyFullState(next);
        savePersistedState(next);
        return next;
      });
    },
    [setState],
  );

  const persistColor = useCallback(
    (updater: (prev: ColorTweakState) => ColorTweakState) => {
      persist((prev) => ({ ...prev, color: updater(prev.color) }));
    },
    [persist],
  );

  const persistSpacing = useCallback(
    (updater: (prev: TokenOverrides) => TokenOverrides) => {
      persist((prev) => ({ ...prev, spacing: updater(prev.spacing) }));
    },
    [persist],
  );

  const persistTypography = useCallback(
    (updater: (prev: TokenOverrides) => TokenOverrides) => {
      persist((prev) => ({ ...prev, typography: updater(prev.typography) }));
    },
    [persist],
  );

  const persistSize = useCallback(
    (updater: (prev: TokenOverrides) => TokenOverrides) => {
      persist((prev) => ({ ...prev, size: updater(prev.size) }));
    },
    [persist],
  );

  const persistPanelPosition = useCallback(
    (updater: (prev: TweakState['panelPosition']) => TweakState['panelPosition']) => {
      persist((prev) => ({ ...prev, panelPosition: updater(prev.panelPosition) }));
    },
    [persist],
  );

  /**
   * Optional secondary slice — absent until a host opts in. Passing
   * `undefined` from the updater unsets the slice so envelopes stay small
   * when the secondary cluster is idle.
   */
  const persistSecondary = useCallback(
    (updater: (prev: ColorTweakState | undefined) => ColorTweakState | undefined) => {
      persist((prev) => {
        const next = updater(prev.secondary);
        if (next === undefined) {
          const { secondary: _secondary, ...rest } = prev;
          return rest;
        }
        return { ...prev, secondary: next };
      });
    },
    [persist],
  );

  return {
    persist,
    persistColor,
    persistSpacing,
    persistTypography,
    // Upstream (zudo-doc) naming — the verbatim-ported FontTab imports
    // `persistFont` / `PersistFont`. The adapted envelope still names the
    // slice `typography`; this alias lets the port compile without touching
    // the upstream file. Slice can be renamed in a later sub-issue if the
    // envelope ever aligns with upstream's shape.
    persistFont: persistTypography,
    persistSize,
    persistPanelPosition,
    persistSecondary,
  };
}

export type Persist = ReturnType<typeof usePersist>['persist'];
export type PersistColor = ReturnType<typeof usePersist>['persistColor'];
export type PersistSpacing = ReturnType<typeof usePersist>['persistSpacing'];
export type PersistTypography = ReturnType<typeof usePersist>['persistTypography'];
/** Upstream alias for `PersistTypography`. See `persistFont` above. */
export type PersistFont = PersistTypography;
export type PersistSize = ReturnType<typeof usePersist>['persistSize'];
export type PersistPanelPosition = ReturnType<typeof usePersist>['persistPanelPosition'];
export type PersistSecondary = ReturnType<typeof usePersist>['persistSecondary'];
