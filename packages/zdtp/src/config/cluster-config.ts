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
   * now derives the `{ literal }` / best-effort `{ ref }` variants too (#463)
   * for a `semantic: true` tier; actually resolving a `{ ref }` against the
   * ramp tier it names (rendering + apply) is still downstream work
   * (#467/#469).
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

import type { TabConfig, TierItem } from '../tokens/tier-model';
import { resolveRefToCssVar } from '../apply/tier-resolver';

/**
 * True when `value` reads as a literal CSS color (e.g. `#fff`, `oklch(...)`,
 * `rgb(...)`) rather than an id referencing another tier's item. Bare ids
 * (palette-item ids, ramp-item ids) never start with `#` or contain `(`, so
 * this is a cheap, reliable-enough discriminator for #463's best-effort
 * literal-vs-ref split.
 */
function looksLikeColorLiteral(value: string): boolean {
  return value.startsWith('#') || value.includes('(');
}

/**
 * Build a `{ ref }` `SemanticValue` for a semantic item whose `default` names
 * a ramp item rather than a literal color.
 *
 * Convention: `"tierId:itemId"` picks the matching `referencesRamps` entry by
 * tier id; a bare `"itemId"` (no `:`) assumes the tier's first declared ramp.
 *
 * When the panel's full `tabs` array is threaded in (via
 * `resolveColorClusterFromTab(tab, tabs)`), each candidate ref is checked
 * against the real ramp tier with `resolveRefToCssVar`, and the first ref that
 * names an existing ramp item is chosen. This makes the derived ref actually
 * resolvable cross-tab (the ramp typically lives in the Palette tab). When no
 * candidate resolves — e.g. a lone-tab caller passing only `[tab]` — the
 * best-effort shape is returned unchanged; up-front source validation (throwing
 * on an unresolvable declaration) is #469's job.
 */
function deriveRampRef(
  defaultId: string,
  referencesRamps: readonly { tab?: string; tier: string }[],
  currentTab: TabConfig,
  tabs: readonly TabConfig[],
): { ref: { tab?: string; tier: string; item: string } } {
  const candidates: { tab?: string; tier: string; item: string }[] = [];

  const sepIdx = defaultId.indexOf(':');
  if (sepIdx !== -1) {
    const tierId = defaultId.slice(0, sepIdx);
    const itemId = defaultId.slice(sepIdx + 1);
    const match = referencesRamps.find((r) => r.tier === tierId);
    if (match) candidates.push({ tab: match.tab, tier: match.tier, item: itemId });
  }

  const [firstRamp] = referencesRamps;
  candidates.push({ tab: firstRamp.tab, tier: firstRamp.tier, item: defaultId });

  // Prefer the first candidate that resolves against a real ramp item.
  for (const cand of candidates) {
    try {
      resolveRefToCssVar(cand, currentTab, tabs);
      return { ref: cand };
    } catch {
      // Not resolvable against the supplied tabs — try the next candidate.
    }
  }

  // Nothing resolved (lone-tab caller / ramp lives in a tab not passed).
  // Return the best-effort shape; #469 owns up-front validation.
  return { ref: candidates[0] };
}

/**
 * Derive the `SemanticValue` a semantic-tier item's `default` denotes.
 *
 * Branches (checked in order):
 * 1. Legacy palette-index shape — `default` names a sibling palette item's
 *    id (conventional 2-tier palette+semantic config, or a `semantic: true`
 *    tier that still points at palette ids). Regression-critical: must keep
 *    producing the exact numeric index as before.
 * 2. `'bg'` / `'fg'` base-role sentinel aliases, passed through unchanged.
 * 3. Cross-tab ramp reference — the tier declares `referencesRamps` and
 *    `default` doesn't read as a literal color, so it's treated as naming a
 *    ramp item (best-effort shape; see `deriveRampRef`).
 * 4. Literal color default (e.g. an `oklch(...)`/hex string) — the common
 *    case for a lone `semantic: true` tier with no palette sibling.
 */
function deriveSemanticValue(
  item: TierItem,
  paletteIdToIndex: ReadonlyMap<string, number>,
  referencesRamps: readonly { tab?: string; tier: string }[] | undefined,
  currentTab: TabConfig,
  tabs: readonly TabConfig[],
): SemanticValue {
  const paletteIdx = paletteIdToIndex.get(item.default);
  if (paletteIdx !== undefined) return paletteIdx;

  if (item.default === 'bg' || item.default === 'fg') return item.default;

  if (referencesRamps && referencesRamps.length > 0 && !looksLikeColorLiteral(item.default)) {
    return deriveRampRef(item.default, referencesRamps, currentTab, tabs);
  }

  return { literal: item.default };
}

/**
 * Derive a `ColorClusterDataConfig` from a color `TabConfig`.
 *
 * - Palette items: the first tier whose items all have `kind: 'color'` and
 *   are not `semantic: true`. Each item's `cssVar` becomes a palette slot;
 *   `paletteCssVarTemplate` is synthesised as `"{item.cssVar}"` with `{n}`
 *   replaced by the slot index. Because item cssVars are explicit (e.g.
 *   `--zfb-palette-0`) rather than template-based, we derive the template
 *   from the first item by replacing the terminal digit sequence with `{n}`.
 *
 * - Semantic items: either the first tier with `referencesTier` set pointing
 *   at the palette tier (legacy shape), or a tier explicitly marked
 *   `semantic: true` (#461) — the latter may have no palette sibling at all.
 *   Each item's `id` → `cssVar` mapping becomes `semanticCssNames`; the
 *   item's `default` is resolved to a `SemanticValue` by
 *   `deriveSemanticValue` (palette index / literal / ramp-ref — see there).
 *
 * - A tab with a semantic tier but NO palette tier still produces a usable
 *   cluster: `paletteSize` is `0` (the palette-driven UI has nothing to
 *   render) but `semanticDefaults`/`semanticCssNames` are populated from the
 *   semantic tier so the Semantic Tokens section isn't left empty (#463).
 *
 * - Metadata comes from `tab.colorExtras` (required on a color tab).
 *
 * `tabs` is the panel config's full tabs array, used to resolve a semantic
 * tier's cross-tab `{ ref }` mappings against a ramp tier living in ANOTHER
 * tab (typically the grouped Palette tab). It defaults to `[tab]` so an
 * existing single-argument call still works — intra-tab refs resolve, and a
 * cross-tab ramp declaration falls back to its best-effort shape (#467).
 *
 * Returns `undefined` when the tab has no `colorExtras` (not a color tab).
 */
export function resolveColorClusterFromTab(
  tab: TabConfig,
  tabs: readonly TabConfig[] = [tab],
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

  // Find the semantic tier: either the first tier with referencesTier pointing
  // at paletteTier (legacy shape), or a tier explicitly marked `semantic: true`
  // (#461) — the latter may have no referencesTier at all, and no palette
  // sibling at all (#463).
  const semanticTier = tab.tiers.find(
    (t) => (paletteTier && t.referencesTier === paletteTier.id) || t.semantic === true,
  );

  if (!paletteTier && !semanticTier) {
    // Genuinely no palette AND no semantic tier — return stub cluster.
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

  const paletteItems = paletteTier?.items ?? [];
  const paletteSize = paletteItems.length;

  // Derive the palette CSS-var template from the first item's cssVar.
  // e.g. "--zfb-palette-0" → "--zfb-palette-{n}"
  // Strategy: replace the LAST run of digits in the cssVar with "{n}".
  // When there's no palette tier (lone semantic tier), fall back to the
  // stub template — nothing reads it since paletteSize is 0.
  const paletteCssVarTemplate = paletteItems[0]
    ? paletteItems[0].cssVar.replace(/\d+$/, '{n}')
    : '--zudo-stub-p{n}';

  // Build palette cssVar lookup for semantic default index resolution.
  const paletteIdToIndex = new Map<string, number>();
  for (let i = 0; i < paletteItems.length; i++) {
    paletteIdToIndex.set(paletteItems[i].id, i);
  }

  const semanticDefaults: Record<string, SemanticValue> = {};
  const semanticCssNames: Record<string, string> = {};

  if (semanticTier) {
    for (const item of semanticTier.items) {
      semanticCssNames[item.id] = item.cssVar;
      semanticDefaults[item.id] = deriveSemanticValue(
        item,
        paletteIdToIndex,
        semanticTier.referencesRamps,
        tab,
        tabs,
      );
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
  return resolveColorClusterFromTab(colorTab, tabs);
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
  return resolveColorClusterFromTab(secondaryTab, tabs) ?? null;
}
