import type { BaseRoleKey, ClusterPanelSettings } from '../config/cluster-config';
import type { ColorScheme } from '../config/color-schemes';

// ---------------------------------------------------------------------------
// Value-kind discriminated union
// ---------------------------------------------------------------------------

export type TierValueKind =
  | { kind: 'length'; step: number; unit: string }
  | { kind: 'number'; step: number }
  | { kind: 'select'; options: readonly string[] }
  | { kind: 'text' }
  | { kind: 'cursor' }
  | { kind: 'content' }
  | { kind: 'mask-image' }
  /**
   * Omitting `format` (or passing `'hex'`) uses the native `<input type="color">`
   * (today's behavior, emits a hex string). Passing `'oklch'` opts into the OKLCH
   * picker that emits an `oklch(...)` string (rendering wired in later sub-tasks).
   */
  | { kind: 'color'; format?: 'hex' | 'oklch' };

// ---------------------------------------------------------------------------
// Narrowing helpers
// ---------------------------------------------------------------------------

export function isLengthKind(v: TierValueKind): v is Extract<TierValueKind, { kind: 'length' }> {
  return v.kind === 'length';
}

export function isNumberKind(v: TierValueKind): v is Extract<TierValueKind, { kind: 'number' }> {
  return v.kind === 'number';
}

export function isSelectKind(v: TierValueKind): v is Extract<TierValueKind, { kind: 'select' }> {
  return v.kind === 'select';
}

export function isTextKind(v: TierValueKind): v is Extract<TierValueKind, { kind: 'text' }> {
  return v.kind === 'text';
}

export function isCursorKind(v: TierValueKind): v is Extract<TierValueKind, { kind: 'cursor' }> {
  return v.kind === 'cursor';
}

export function isContentKind(v: TierValueKind): v is Extract<TierValueKind, { kind: 'content' }> {
  return v.kind === 'content';
}

export function isMaskImageKind(v: TierValueKind): v is Extract<TierValueKind, { kind: 'mask-image' }> {
  return v.kind === 'mask-image';
}

export function isColorKind(v: TierValueKind): v is Extract<TierValueKind, { kind: 'color' }> {
  return v.kind === 'color';
}

// ---------------------------------------------------------------------------
// Shared sub-types
// ---------------------------------------------------------------------------

export interface PillSpec {
  value: string;
  customDefault: string;
}

// ---------------------------------------------------------------------------
// Semantic value union (Ramp-native Tier-2 color editor, #459)
// ---------------------------------------------------------------------------

/**
 * A semantic token's mapping value.
 *
 * Legacy shape stays valid: a palette index (`number`) or the `'bg'` / `'fg'`
 * sentinel aliases. New variants (added for #459) let a semantic tier point at
 * an arbitrary literal color (optionally split light/dark) or reference a ramp
 * item living in another tab/tier — both resolved downstream by #467/#469.
 *
 * Defined here (not in `state/tweak-state.ts`) because `config/cluster-config.ts`
 * needs it for `ColorClusterDataConfig.semanticDefaults`, and cluster-config.ts
 * already imports types from this module — keeping the definition here avoids
 * a new type-only import cycle. `state/tweak-state.ts` re-exports it.
 */
export type SemanticValue =
  | number
  | 'bg'
  | 'fg'
  | { literal: string }
  | { literal: { light: string; dark: string } }
  | { ref: { tab?: string; tier: string; item: string } };

// ---------------------------------------------------------------------------
// Tier item
// ---------------------------------------------------------------------------

export interface TierItem {
  id: string;
  cssVar: string;
  label: string;
  default: string;
  type: TierValueKind;
  pill?: PillSpec;
  readonly?: true;
}

// ---------------------------------------------------------------------------
// Tier config
// ---------------------------------------------------------------------------

export interface TierConfig {
  id: string;
  label: string;
  items: readonly TierItem[];
  /** When set, this tier's items hold references — each value is the id of
   *  an item in the tier whose id matches referencesTier. The apply pipeline
   *  emits var(--tier1-cssvar). */
  referencesTier?: string;
  /**
   * Marks this tier as a SEMANTIC tier (its items hold `SemanticValue`
   * mappings, not raw palette entries) so the panel never mistakes it for
   * the palette tier. Optional and additive — omitting it preserves today's
   * behavior (palette-tier detection stays structural, via
   * `resolveColorClusterFromTab`'s `kind: 'color'` check).
   */
  semantic?: true;
  /**
   * Cross-tab ramp-source declaration for a semantic tier: the ramp tier(s)
   * this tier's `{ ref }` mappings are allowed to point into. Each entry names
   * a tier id and an optional tab id (omitted `tab` means "this tab").
   * `assertValidPanelConfig` validates every declared source up front (the
   * tab/tier must exist and share this tier's kind); `resolveColorClusterFromTab`
   * (`config/cluster-config.ts`) uses the allow-list to derive each row's
   * `SemanticValue`; the grouped `TierRefSelector` picker
   * (`controls/tier-ref-selector.tsx`) renders one `<optgroup>` per declared
   * source.
   */
  referencesRamps?: readonly { tab?: string; tier: string }[];
}

// ---------------------------------------------------------------------------
// Color cluster extras
//
// Captures everything in ColorClusterDataConfig EXCEPT palette / semantic data
// (paletteSize, paletteCssVarTemplate, semanticDefaults, semanticCssNames).
// Those fields move into the tier model as TierItems. Wave 7 wires this type
// into the color tab so ColorClusterExtras replaces the non-tier fields on
// the existing config shape.
// ---------------------------------------------------------------------------

export interface ColorClusterExtras {
  id: string;
  label?: string;
  baseRoles: Partial<Record<BaseRoleKey, string>>;
  baseDefaults: Partial<Record<BaseRoleKey, number>>;
  defaultShikiTheme: string;
  colorSchemes: Record<string, ColorScheme>;
  panelSettings: ClusterPanelSettings;
}

// ---------------------------------------------------------------------------
// Tab config
// ---------------------------------------------------------------------------

export interface TabConfig {
  id: string;
  label: string;
  tiers: readonly TierConfig[];
  colorExtras?: ColorClusterExtras;
}
