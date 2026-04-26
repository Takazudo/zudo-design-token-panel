/**
 * Build the flat `{ cssVarName: cssValue }` diff consumed by the host's
 * Apply endpoint (e.g. a dev-API route that POSTs the diff to the panel
 * server).
 *
 * Consumes the `TweakState` shape directly:
 *
 *   - `state.color.palette: string[]` — palette hex values
 *   - `state.color.semanticMappings: Record<string, number | 'bg' | 'fg'>` —
 *     semantic-token → palette-index map
 *   - `state.color.background` / `foreground` — palette indices used when a
 *     semantic mapping is `"bg"` / `"fg"` respectively
 *
 * The routing layer (`route-tokens-to-files.ts`) then splits the map into
 * per-file groups. The host (or the deferred bin) applies each group to
 * its target `.css` file.
 *
 * Scope
 * -----
 * Only cssVars that the cluster's CSS files actually declare are emitted.
 * Specifically:
 *
 *   - Palette slots (resolved via `resolvePaletteCssVar(cluster, i)`) —
 *     EMITTED as hex values.
 *   - Semantic tokens (`cluster.semanticCssNames` entries) — EMITTED as
 *     `var(--<paletteSlotName>)` so the rewrite preserves the indirection
 *     that the hand-authored CSS relies on.
 *   - Base roles (`cluster.baseRoles` entries) — NOT emitted. They do not
 *     belong to the apply pipeline's rewrite scope.
 *   - Spacing / typography / size — NOT emitted here. They live in a
 *     separate token file the Apply endpoint may or may not rewrite;
 *     routing them would surface as rejected prefixes.
 *
 * Diff-only output
 * ----------------
 * A cssVar is emitted ONLY when the current state differs from the provided
 * baseline. Callers without a baseline (tests, degraded-init paths) can pass
 * `colorDefaults: undefined`; in that case the whole color block is treated
 * as changed so the payload still goes out rather than silently noop'ing.
 *
 * Pure / no IO — safe to import anywhere (browser, Node, tests).
 */

import type { ColorTweakState, TweakState, ColorClusterConfig } from '../state/tweak-state';
import { resolvePaletteCssVar, safeIndex } from '../state/tweak-state';
import { getPanelConfig } from '../config/panel-config';

/**
 * Produce the flat cssVar → value map for the dev-API handler.
 *
 * `colorDefaults` should be the scheme baseline the UI diffs against (the
 * same baseline the panel passes to the Export / Import modals). Pass
 * `undefined` to force the whole color block into the output.
 *
 * `cluster` defaults to `getPanelConfig().colorCluster` so primary-cluster
 * callers do not have to thread the active cluster through every layer.
 * Secondary-cluster callers MUST pass an explicit cluster argument.
 */
export function buildApplyOverrides(
  state: TweakState,
  colorDefaults: ColorTweakState | undefined,
  cluster: ColorClusterConfig = getPanelConfig().colorCluster,
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
    // PR #1440 review item P1-9 — clamp out-of-range indices to a valid
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

  return out;
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
