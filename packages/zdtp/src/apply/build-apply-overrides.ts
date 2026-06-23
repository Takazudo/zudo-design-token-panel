/**
 * Build the flat `{ cssVarName: cssValue }` diff consumed by the host's
 * Apply endpoint (e.g. a dev-API route that POSTs the diff to the panel
 * server).
 *
 * Consumes the `TweakState` shape directly:
 *
 * Color tokens:
 *   - `state.color.palette: string[]` — palette hex values
 *   - `state.color.semanticMappings: Record<string, number | 'bg' | 'fg'>` —
 *     semantic-token → palette-index map
 *   - `state.color.background` / `foreground` — palette indices used when a
 *     semantic mapping is `"bg"` / `"fg"` respectively
 *
 * Non-color tokens (spacing / typography / size including radius):
 *   - `state.spacing: TokenOverrides` — keyed by token id (e.g. `hsp-md`)
 *   - `state.typography: TokenOverrides` — keyed by token id (e.g. `text-base`)
 *   - `state.size: TokenOverrides` — keyed by token id (e.g. `radius-lg`)
 *
 * The routing layer (`route-tokens-to-files.ts`) then splits the map into
 * per-file groups. The host (or the deferred bin) applies each group to
 * its target `.css` file.
 *
 * Scope
 * -----
 * Only cssVars that the cluster's or tabs' CSS files actually declare are emitted.
 * Specifically:
 *
 *   - Palette slots (resolved via `resolvePaletteCssVar(cluster, i)`) —
 *     EMITTED as hex values.
 *   - Semantic tokens (`cluster.semanticCssNames` entries) — EMITTED as
 *     `var(--<paletteSlotName>)` so the rewrite preserves the indirection
 *     that the hand-authored CSS relies on.
 *   - Base roles (`cluster.baseRoles` entries) — NOT emitted. They do not
 *     belong to the apply pipeline's rewrite scope.
 *   - Spacing / typography / size — EMITTED when the corresponding
 *     `TokenOverrides` map is non-empty. Values are resolved through the
 *     tier resolver so reference tiers emit `var(--targetCssVar)` rather
 *     than the raw item id string. Readonly items are skipped.
 *
 * Diff-only output
 * ----------------
 * For color tokens, a cssVar is emitted ONLY when the current state differs
 * from the provided baseline. Callers without a baseline (tests,
 * degraded-init paths) can pass `colorDefaults: undefined`; in that case the
 * whole color block is treated as changed.
 *
 * For non-color tokens, `TokenOverrides` is already a sparse diff (only
 * overridden tokens appear in the map) — no baseline comparison is needed.
 *
 * Pure / no IO — safe to import anywhere (browser, Node, tests).
 */

import type { ColorTweakState, TweakState, ColorClusterConfig } from '../state/tweak-state';
import { resolvePaletteCssVar, safeIndex, getActivePrimaryCluster } from '../state/tweak-state';
import type { TabConfig } from '../tokens/tier-model';
import { getPanelConfig } from '../config/panel-config';
import { resolveTierItemValue, emitTierItemCssValue, type TabOverrides } from './tier-resolver';

/**
 * Produce the flat cssVar → value map for the dev-API handler.
 *
 * `colorDefaults` should be the scheme baseline the UI diffs against (the
 * same baseline the panel passes to the Export / Import modals). Pass
 * `undefined` to force the whole color block into the output.
 *
 * `cluster` defaults to the primary color cluster derived from the active
 * panel config's color TabConfig so primary-cluster callers do not have to
 * thread the active cluster through every layer. Secondary-cluster callers
 * MUST pass an explicit cluster argument.
 *
 * `tabs` defaults to the active panel config's tab list. Injected by tests so
 * non-color token resolution works without a live panel config singleton.
 */
export function buildApplyOverrides(
  state: TweakState,
  colorDefaults: ColorTweakState | undefined,
  cluster: ColorClusterConfig = getActivePrimaryCluster(),
  tabs: readonly TabConfig[] = getPanelConfig().tabs,
): Record<string, string> {
  const out: Record<string, string> = {};
  const color = state.color;

  // ---------- Palette slots ----------
  const paletteLen = color.palette.length;
  for (let i = 0; i < paletteLen; i++) {
    const current = color.palette[i];
    if (typeof current !== 'string' || current.length === 0) continue;
    const baseline = colorDefaults?.palette[i];
    if (colorDefaults === undefined || current !== baseline) {
      out[resolvePaletteCssVar(cluster, i)] = current;
    }
  }

  // ---------- Semantic mappings ----------
  // Walk the cluster's semantic registry (SEMANTIC_CSS_NAMES under the hood)
  // so we emit exactly the tokens the design system declares — any stray keys
  // in `semanticMappings` with no matching cssVar are silently dropped.
  for (const [key, cssVar] of Object.entries(cluster.semanticCssNames)) {
    const currentMapping = color.semanticMappings[key];
    if (currentMapping === undefined) continue;
    const baselineMapping = colorDefaults?.semanticMappings[key];
    const changed = colorDefaults === undefined || currentMapping !== baselineMapping;
    if (!changed) continue;
    const paletteIndex = resolveMappingIndex(currentMapping, color);
    if (paletteIndex === null) continue;
    // clamp out-of-range indices to a valid
    // slot before emitting the CSS-var reference. The DOM-apply path uses
    // `safeIndex` already; the disk-rewrite pipeline must do the same so
    // a corrupted persisted index (e.g. `paletteIndex = 99` when palette
    // length is 16) doesn't write `var(--zd-p99)` into tokens.css.
    const clamped = safeIndex(paletteIndex, color.palette.length);
    if (clamped !== paletteIndex) {
      console.error(
        `[design-token-panel] paletteIndex ${paletteIndex} for ${cssVar} is out of range (palette length ${color.palette.length}); clamping to ${clamped}.`,
      );
    }
    out[cssVar] = `var(${resolvePaletteCssVar(cluster, clamped)})`;
  }

  // ---------- Non-color tabs: spacing / typography / size ----------
  // `TokenOverrides` is already a sparse diff (absent = use stylesheet default)
  // so no baseline comparison is needed — every present key is an override.
  // The state's `typography` field maps to the panel tab with id `font`.
  const NON_COLOR_SLICES: ReadonlyArray<{ tabId: string; overrides: Record<string, string> }> = [
    { tabId: 'spacing', overrides: state.spacing },
    { tabId: 'font', overrides: state.typography },
    { tabId: 'size', overrides: state.size },
  ];

  for (const { tabId, overrides } of NON_COLOR_SLICES) {
    if (Object.keys(overrides).length === 0) continue;
    const tab = tabs.find((t) => t.id === tabId);
    if (!tab) continue;
    emitTabOverrides(tab, overrides, out);
  }

  // ---------- Generic tabs (state.tabs[*]) ----------
  // `state.tabs` stores per-tab overrides as `TabOverrides` (tierId → itemId → value).
  // Flatten each tab's tier map into a single itemId → value map before resolving,
  // mirroring the same flatten step the live-apply path uses in `applyFullState`.
  if (state.tabs) {
    for (const [tabId, tabOverrides] of Object.entries(state.tabs)) {
      const tab = tabs.find((t) => t.id === tabId);
      if (!tab) continue;
      const flatOverrides: Record<string, string> = {};
      for (const tierOverrides of Object.values(tabOverrides)) {
        for (const [itemId, value] of Object.entries(tierOverrides)) {
          flatOverrides[itemId] = value;
        }
      }
      if (Object.keys(flatOverrides).length === 0) continue;
      emitTabOverrides(tab, flatOverrides, out);
    }
  }

  return out;
}

/**
 * Walk a tab's tier items and emit `cssVar → cssValue` entries into `out`
 * for every item id present in `overrides`.
 *
 * Uses the tier resolver so reference tiers emit `var(--targetCssVar)` rather
 * than the raw item-id string. Readonly items are silently skipped (they are
 * informational rows in the UI, never written to storage or disk).
 */
function emitTabOverrides(
  tab: TabConfig,
  overrides: Record<string, string>,
  out: Record<string, string>,
): void {
  // Build a TabOverrides-shaped view of the flat overrides so the resolver
  // can follow cross-tier references. Each item id appears in exactly one
  // tier, so we bucket them by tier id.
  const tabOverrides: Record<string, Record<string, string>> = {};
  for (const tier of tab.tiers) {
    const tierOverrides: Record<string, string> = {};
    for (const item of tier.items) {
      const v = overrides[item.id];
      if (typeof v === 'string' && v.length > 0) {
        tierOverrides[item.id] = v;
      }
    }
    tabOverrides[tier.id] = tierOverrides;
  }

  // Emit one entry per overridden item. The tier resolver is invoked so
  // reference-tier items produce a `var(--targetCssVar)` rather than the
  // raw target item id that is stored in `overrides`.
  for (const tier of tab.tiers) {
    for (const item of tier.items) {
      if (item.readonly) continue;
      const v = overrides[item.id];
      if (typeof v !== 'string' || v.length === 0) continue;
      try {
        const resolved = resolveTierItemValue(tab, tier.id, item.id, tabOverrides as TabOverrides);
        out[item.cssVar] = emitTierItemCssValue(resolved);
      } catch {
        // Misconfigured tab — skip item rather than crashing the apply pipeline.
      }
    }
  }
}

/**
 * Resolve a `semanticMappings` value to a concrete palette index.
 *
 * - `number`  → used as-is.
 * - `"bg"`    → the color state's current background index.
 * - `"fg"`    → the color state's current foreground index.
 * - anything else → `null` (caller skips the entry).
 */
function resolveMappingIndex(mapping: number | 'bg' | 'fg', color: ColorTweakState): number | null {
  if (mapping === 'bg') return color.background;
  if (mapping === 'fg') return color.foreground;
  if (typeof mapping === 'number' && Number.isInteger(mapping)) return mapping;
  return null;
}
