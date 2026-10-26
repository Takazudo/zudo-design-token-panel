/**
 * `createPersist` — adapts slice updaters to the panel's single state
 * transaction path. Each callback is a persist pipeline:
 *
 *   updater  →  commitTweakState('persist', updater)
 *
 * The slice-specific helpers (`persistColor`, `persistSpacing`, etc.) wrap a
 * slice updater into a full-state updater so callers don't have to thread the
 * whole envelope themselves.
 *
 * The transaction owns apply/save/setState ordering and history recording;
 * this module only lifts legacy slice callbacks into whole-state updaters.
 *
 * `persistColor`'s updater is `(prev: ColorTweakState) => ColorTweakState`, so
 * the widened `ColorTweakState.semanticMappings: Record<string, SemanticValue>`
 * (#459) — including the `{ literal }` / `{ ref }` object variants added for
 * #462 — already flows through this module's generic pass-through unchanged; the
 * actual validating hydrate/round-trip logic for those variants lives in
 * `tweak-state.ts` (`hydrateSemanticMappings` / `savePersistedState`), not here.
 */

import type {
  ColorTweakState,
  TabOverrides,
  TokenOverrides,
  TweakState,
} from './tweak-state';
import type { CommitTweakState } from './transaction';

/** Build the persist callbacks for one panel instance's transaction. */
export function createPersist(commitTweakState: CommitTweakState) {
  const persist = (updater: (prev: TweakState) => TweakState) => {
    commitTweakState('persist', updater);
  };

  /**
   * Persist overrides for a single generic tab (identified by `tabId`).
   *
   * This is the general-purpose entry point for host-coined tabs that use the
   * tier model. The slice-specific helpers (`persistColor`, `persistSpacing`,
   * etc.) remain as thin forwards for the built-in tab components.
   */
  const persistTab = (tabId: string, updater: (prev: TabOverrides) => TabOverrides) => {
    persist((prev) => ({
      ...prev,
      tabs: {
        ...prev.tabs,
        [tabId]: updater(prev.tabs?.[tabId] ?? {}),
      },
    }));
  };

  const persistColor = (updater: (prev: ColorTweakState) => ColorTweakState) => {
    persist((prev) => ({ ...prev, color: updater(prev.color) }));
  };

  const persistSpacing = (updater: (prev: TokenOverrides) => TokenOverrides) => {
    persist((prev) => ({ ...prev, spacing: updater(prev.spacing) }));
  };

  const persistTypography = (updater: (prev: TokenOverrides) => TokenOverrides) => {
    persist((prev) => ({ ...prev, typography: updater(prev.typography) }));
  };

  const persistSize = (updater: (prev: TokenOverrides) => TokenOverrides) => {
    persist((prev) => ({ ...prev, size: updater(prev.size) }));
  };

  /**
   * Optional secondary slice — absent until a host opts in. Passing
   * `undefined` from the updater unsets the slice so envelopes stay small
   * when the secondary cluster is idle.
   */
  const persistSecondary = (
    updater: (prev: ColorTweakState | undefined) => ColorTweakState | undefined,
  ) => {
    persist((prev) => {
      const next = updater(prev.secondary);
      if (next === undefined) {
        const { secondary: _secondary, ...rest } = prev;
        return rest;
      }
      return { ...prev, secondary: next };
    });
  };

  return {
    persist,
    persistTab,
    persistColor,
    persistSpacing,
    persistTypography,
    // Upstream (zudo-doc) naming — the verbatim-ported FontTab imports
    // `persistFont` / `PersistFont`. The adapted envelope still names the
    // slice `typography`; this alias lets the port compile without touching
    // the upstream file.
    persistFont: persistTypography,
    persistSize,
    persistSecondary,
  };
}

type PersistApi = ReturnType<typeof createPersist>;
export type Persist = PersistApi['persist'];
export type PersistTab = PersistApi['persistTab'];
export type PersistColor = PersistApi['persistColor'];
export type PersistSpacing = PersistApi['persistSpacing'];
export type PersistTypography = PersistApi['persistTypography'];
/** Upstream alias for `PersistTypography`. See `persistFont` above. */
export type PersistFont = PersistTypography;
export type PersistSize = PersistApi['persistSize'];
export type PersistSecondary = PersistApi['persistSecondary'];
