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
  /** Semantic token name → default palette index. */
  semanticDefaults: Record<string, number>;
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
