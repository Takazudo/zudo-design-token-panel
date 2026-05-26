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
  | { kind: 'color' };

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
