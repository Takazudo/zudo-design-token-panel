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
 *
 * `persistColor`'s updater is `(prev: ColorTweakState) => ColorTweakState`, so
 * the widened `ColorTweakState.semanticMappings: Record<string, SemanticValue>`
 * (#459) — including the `{ literal }` / `{ ref }` object variants added for
 * #462 — already flows through this hook's generic pass-through unchanged; the
 * actual validating hydrate/round-trip logic for those variants lives in
 * `tweak-state.ts` (`hydrateSemanticMappings` / `savePersistedState`), not here.
 */

import { useCallback } from 'preact/hooks';

import {
  applyFullState,
  savePersistedState,
  type ColorTweakState,
  type TabOverrides,
  type TokenOverrides,
  type TweakState,
} from './tweak-state';
import type { PanelConfig } from '../config/panel-config';

type SetState<T> = (updater: (prev: T | null) => T | null) => void;

/**
 * `usePersist` hook.
 *
 * Accepts an optional `cfg` — the panel instance config. When supplied its
 * `applySink` (if any) routes every CSS-var write through the sink instead
 * of `document.documentElement`, AND its `storagePrefix` scopes the persisted
 * envelope to THIS instance's storage key (multi-instance, #357). Omitting
 * `cfg` resolves the default instance via `getPanelConfig()` inside both
 * `applyFullState` and `savePersistedState`, preserving the single-panel path.
 */
export function usePersist(setState: SetState<TweakState>, cfg?: PanelConfig) {
  const persist = useCallback(
    (updater: (prev: TweakState) => TweakState) => {
      setState((prev) => {
        if (!prev) return prev;
        const next = updater(prev);
        applyFullState(next, cfg);
        savePersistedState(next, undefined, cfg);
        return next;
      });
    },
    // cfg is intentionally included so the callback re-binds when the
    // config reference changes (e.g. hot-reload in dev).
    [setState, cfg],
  );

  /**
   * Persist overrides for a single generic tab (identified by `tabId`).
   *
   * This is the general-purpose entry point for host-coined tabs that use the
   * tier model. The existing slice-specific helpers (`persistColor`,
   * `persistSpacing`, etc.) remain as thin forwards so the internal tab
   * components keep compiling until Wave 5 / Wave 7 migrates them.
   */
  const persistTab = useCallback(
    (tabId: string, updater: (prev: TabOverrides) => TabOverrides) => {
      persist((prev) => {
        const prevTabOverrides = prev.tabs?.[tabId] ?? {};
        const nextTabOverrides = updater(prevTabOverrides);
        return {
          ...prev,
          tabs: {
            ...prev.tabs,
            [tabId]: nextTabOverrides,
          },
        };
      });
    },
    [persist],
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
    persistTab,
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
    persistSecondary,
  };
}

export type Persist = ReturnType<typeof usePersist>['persist'];
export type PersistTab = ReturnType<typeof usePersist>['persistTab'];
export type PersistColor = ReturnType<typeof usePersist>['persistColor'];
export type PersistSpacing = ReturnType<typeof usePersist>['persistSpacing'];
export type PersistTypography = ReturnType<typeof usePersist>['persistTypography'];
/** Upstream alias for `PersistTypography`. See `persistFont` above. */
export type PersistFont = PersistTypography;
export type PersistSize = ReturnType<typeof usePersist>['persistSize'];
export type PersistSecondary = ReturnType<typeof usePersist>['persistSecondary'];
