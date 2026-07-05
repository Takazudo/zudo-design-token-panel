/**
 * Color-cluster type contract.
 *
 * Defines the JSON-serializable shape every host-supplied color cluster must
 * conform to. The package itself ships ZERO baked-in cluster data — consumers
 * provide their own `colorCluster` (and optional `secondaryColorCluster`) via
 * `configurePanel({ ... })`.
 *
 * **JSON-serializable**
 *
 * `ColorClusterDataConfig` deliberately holds NO function-typed fields. The
 * palette CSS-var name is materialised at use sites by the
 * `resolvePaletteCssVar(cluster, i)` helper below, NOT by a function field
 * baked into the cluster. This is the JSON-roundtrip property hosts rely on:
 * a cluster can cross an Astro frontmatter → prop boundary, or persist to
 * disk, without losing fidelity.
 *
 * The cluster also carries `colorSchemes` and `panelSettings` so a host
 * doesn't need to vend its own scheme registry through separate imports —
 * everything the color tab needs to render is reachable from
 * `panelConfig.colorCluster`.
 */

import type { ColorScheme } from './color-schemes';
import type { SemanticValue } from '../tokens/tier-model';

// Re-exported so callers that only import from `cluster-config` (rather than
// `tokens/tier-model` or `state/tweak-state`) can still reach the type.
export type { SemanticValue } from '../tokens/tier-model';

/**
 * Base-role keys that a cluster may declare. Subset is allowed (a cluster may
 * ship zero base roles when its design system doesn't expose them as tokens).
 * The state shape on disk still carries all 5 numeric fields for envelope
 * round-trip compatibility — they're inert when the cluster doesn't reference
 * them.
 */
export type BaseRoleKey = 'background' | 'foreground' | 'cursor' | 'selectionBg' | 'selectionFg';

/**
 * Panel-level scheme settings carried INSIDE the cluster (rather than on a
 * separate import). Lets `getActiveSchemeName` / `initColorFromScheme` read
 * everything from the cluster argument.
 */
export interface ClusterPanelSettings {
  /** Scheme name to seed state from when `colorMode` is `false`. */
  colorScheme: string;
  /**
   * Optional light/dark pairing. When set, the panel resolves the active
   * scheme by reading `data-theme` on `<html>`.
   */
  colorMode: false | { defaultMode: 'light' | 'dark'; lightScheme: string; darkScheme: string };
}

/**
 * JSON-serializable color-cluster data. Every field is a primitive,
 * plain object, or array; no functions, no class instances.
 *
 * `colorSchemes` and `panelSettings` are required (not optional) so the
 * shape is uniform across primary / secondary clusters. Scheme-less clusters
 * supply `colorSchemes: {}` and a stub `panelSettings` — both unused by call
 * sites that seed state without ever consulting a scheme registry.
 */
export interface ColorClusterDataConfig {
  /** Stable id — used for debugging / logging only. */
  id: string;
  /**
   * Optional human-visible label rendered in the Color tab section headings.
   * When absent, the tab falls back to `id.toUpperCase()`. Hosts that ship
   * their own naming can override here without forking the panel.
   */
  label?: string;
  /** Expected palette size. Used for init + v1 validation. */
  paletteSize: number;
  /** Map of base-role name → CSS custom-property name. Partial: a cluster
   *  declares only the roles it actually has. */
  baseRoles: Partial<Record<BaseRoleKey, string>>;
  /**
   * Palette-slot CSS-var template. The token `{n}` is replaced with the
   * palette index by `resolvePaletteCssVar` below. Examples:
   * `--brand-p{n}`, `--demo-palette-{n}`.
   */
  paletteCssVarTemplate: string;
  /**
   * Semantic token name → default mapping. Historically always a palette
   * index (`number`); widened to `SemanticValue` (#459) so a default can also
   * be a literal color or a cross-tab ramp reference. `resolveColorClusterFromTab`
   * still only ever produces `number` defaults today — the wider variants are
   * populated by downstream sub-issues (#467/#469).
   */
  semanticDefaults: Record<string, SemanticValue>;
  /** Semantic token name → CSS custom-property name. */
  semanticCssNames: Record<string, string>;
  /** Fallback indices used when a scheme doesn't declare a base role. */
  baseDefaults: Partial<Record<BaseRoleKey, number>>;
  /** Fallback shikiTheme when a scheme lacks one. */
  defaultShikiTheme: string;
  /**
   * Bundled scheme registry. The Scheme… dropdown in the color tab lists
   * these. Pass `{}` for clusters that don't use schemes.
   */
  colorSchemes: Record<string, ColorScheme>;
  /** Panel-level scheme settings — drives `getActiveSchemeName`. */
  panelSettings: ClusterPanelSettings;
}

/**
 * Materialise the palette-slot CSS-var name for a cluster. Pure and
 * side-effect-free so it's safe to call from any layer (apply, clear,
 * tab UI, tests).
 */
export function resolvePaletteCssVar(
  cluster: { paletteCssVarTemplate: string },
  index: number,
): string {
  return cluster.paletteCssVarTemplate.replace('{n}', String(index));
}

// ---------------------------------------------------------------------------
// Color tab → ColorClusterDataConfig bridge
//
// Wave 7 moved the color cluster data into the tier model (TabConfig). The
// legacy ColorClusterDataConfig shape is still used internally by apply,
// serde, and state helpers. These bridge helpers derive a
// ColorClusterDataConfig from a color TabConfig so those call sites don't
// all need to be rewritten in one wave.
// ---------------------------------------------------------------------------

import type { TabConfig } from '../tokens/tier-model';

/**
 * Derive a `ColorClusterDataConfig` from a color `TabConfig`.
 *
 * - Palette items: the first tier whose items all have `kind: 'color'`.
 *   Each item's `cssVar` becomes a palette slot; `paletteCssVarTemplate` is
 *   synthesised as `"{item.cssVar}"` with `{n}` replaced by the slot index.
 *   Because item cssVars are explicit (e.g. `--zfb-palette-0`) rather
 *   than template-based, we derive the template from the first item by
 *   replacing the terminal digit sequence with `{n}`.
 *
 * - Semantic items: the first tier with `referencesTier` set pointing at the
 *   palette tier. Each item's `id` → `cssVar` mapping becomes `semanticCssNames`;
 *   the item's `default` (a palette item id) is looked up to produce the index
 *   for `semanticDefaults`.
 *
 * - Metadata comes from `tab.colorExtras` (required on a color tab).
 *
 * Returns `undefined` when the tab has no `colorExtras` (not a color tab).
 */
export function resolveColorClusterFromTab(
  tab: TabConfig,
): ColorClusterDataConfig | undefined {
  const extras = tab.colorExtras;
  if (!extras) return undefined;

  // Find the palette tier (first tier with kind: 'color' items). A tier
  // marked `semantic: true` is never the palette, even if its items happen
  // to be color-kind — it holds SemanticValue mappings (#461).
  const paletteTier = tab.tiers.find(
    (t) =>
      !t.referencesTier &&
      !t.semantic &&
      t.items.length > 0 &&
      t.items[0].type.kind === 'color',
  );
  if (!paletteTier) {
    // No palette tier — return stub cluster with zero palette.
    return {
      id: extras.id,
      label: extras.label,
      paletteSize: 0,
      baseRoles: extras.baseRoles,
      paletteCssVarTemplate: '--zudo-stub-p{n}',
      semanticDefaults: {},
      semanticCssNames: {},
      baseDefaults: extras.baseDefaults,
      defaultShikiTheme: extras.defaultShikiTheme,
      colorSchemes: extras.colorSchemes,
      panelSettings: extras.panelSettings,
    };
  }

  const paletteItems = paletteTier.items;
  const paletteSize = paletteItems.length;

  // Derive the palette CSS-var template from the first item's cssVar.
  // e.g. "--zfb-palette-0" → "--zfb-palette-{n}"
  // Strategy: replace the LAST run of digits in the cssVar with "{n}".
  const firstCssVar = paletteItems[0]?.cssVar ?? '--palette-{n}';
  const paletteCssVarTemplate = firstCssVar.replace(/\d+$/, '{n}');

  // Build palette cssVar lookup for semantic default index resolution.
  const paletteIdToIndex = new Map<string, number>();
  for (let i = 0; i < paletteItems.length; i++) {
    paletteIdToIndex.set(paletteItems[i].id, i);
  }

  // Find the semantic tier: either the first tier with referencesTier pointing
  // at paletteTier (legacy shape), or a tier explicitly marked `semantic: true`
  // (#461) — the latter may have no referencesTier at all (its mappings are
  // SemanticValue, not necessarily plain palette indices). Literal/ref default
  // derivation for a `semantic: true` tier is #463's job; this only stops it
  // from being mis-detected as "no semantic tier".
  const semanticTier = tab.tiers.find(
    (t) => t.referencesTier === paletteTier.id || t.semantic === true,
  );

  const semanticDefaults: Record<string, number> = {};
  const semanticCssNames: Record<string, string> = {};

  if (semanticTier) {
    for (const item of semanticTier.items) {
      semanticCssNames[item.id] = item.cssVar;
      // item.default is the palette item id; look up its index.
      const idx = paletteIdToIndex.get(item.default);
      semanticDefaults[item.id] = idx ?? 0;
    }
  }

  return {
    id: extras.id,
    label: extras.label,
    paletteSize,
    baseRoles: extras.baseRoles,
    paletteCssVarTemplate,
    semanticDefaults,
    semanticCssNames,
    baseDefaults: extras.baseDefaults,
    defaultShikiTheme: extras.defaultShikiTheme,
    colorSchemes: extras.colorSchemes,
    panelSettings: extras.panelSettings,
  };
}

/**
 * Find the primary color tab (id 'color') in the host's tabs array and
 * derive its `ColorClusterDataConfig`. Returns `undefined` when no color tab
 * exists or it has no `colorExtras`.
 */
export function resolvePrimaryColorCluster(
  tabs: readonly TabConfig[],
): ColorClusterDataConfig | undefined {
  const colorTab = tabs.find((t) => t.id === 'color');
  if (!colorTab) return undefined;
  return resolveColorClusterFromTab(colorTab);
}

/**
 * Find the secondary color tab (id 'color-secondary') and derive its
 * `ColorClusterDataConfig`. Returns `null` when no secondary color tab exists.
 */
export function resolveSecondaryColorClusterFromTabs(
  tabs: readonly TabConfig[],
): ColorClusterDataConfig | null {
  const secondaryTab = tabs.find((t) => t.id === 'color-secondary');
  if (!secondaryTab) return null;
  return resolveColorClusterFromTab(secondaryTab) ?? null;
}
