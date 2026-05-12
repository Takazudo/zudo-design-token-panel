/**
 * Abstract token tier model — TabConfig / TierConfig / TierItem types and
 * value-kind union.
 *
 * This module declares the unified shape that the tier resolver and the rest
 * of the abstract-token-tiers epic build on. It contains ONLY types and
 * tiny narrowing helpers; no runtime logic, no DOM.
 *
 * NOTE (W1-S2): These types were authored in parallel with W1-S1. When both
 * sub-issues land on base/abstract-token-tiers, the manager will retain
 * whichever version landed first and delete any duplicate. No breaking API
 * difference is expected — the shapes are identical across both worktrees.
 */

export type TierValueKind =
  | { kind: 'length'; min: number; max: number; step: number; unit: string }
  | { kind: 'number'; min: number; max: number; step: number }
  | { kind: 'select'; options: readonly string[] }
  | { kind: 'text' }
  | { kind: 'color' };

export type PillSpec = { value: string; customDefault: string };

export interface TierItem {
  id: string;
  cssVar: string;
  label: string;
  group?: string;
  default: string;
  type: TierValueKind;
  pill?: PillSpec;
  readonly?: true;
}

export interface TierConfig {
  id: string;
  label: string;
  items: readonly TierItem[];
  /** When set, each item's override value is the id of an item in the tier
   *  identified by this string. The resolver emits var(--that-item-cssVar). */
  referencesTier?: string;
}

export interface TabConfig {
  id: string;
  label: string;
  tiers: readonly TierConfig[];
  advancedTiers?: readonly string[];
  colorExtras?: ColorClusterExtras;
}

/**
 * Captures the non-data fields of today's ColorClusterDataConfig that do not
 * belong in the tier model itself. Wave 7 wires the consumers; defined here
 * so TabConfig can carry it without a forward-reference.
 */
export interface ColorClusterExtras {
  schemes?: readonly unknown[];
  baseRoles?: readonly unknown[];
  secondaryCluster?: unknown;
}

// ---------------------------------------------------------------------------
// Narrowing helpers
// ---------------------------------------------------------------------------

export function isLengthKind(k: TierValueKind): k is Extract<TierValueKind, { kind: 'length' }> {
  return k.kind === 'length';
}

export function isNumberKind(k: TierValueKind): k is Extract<TierValueKind, { kind: 'number' }> {
  return k.kind === 'number';
}

export function isSelectKind(k: TierValueKind): k is Extract<TierValueKind, { kind: 'select' }> {
  return k.kind === 'select';
}

export function isTextKind(k: TierValueKind): k is Extract<TierValueKind, { kind: 'text' }> {
  return k.kind === 'text';
}

export function isColorKind(k: TierValueKind): k is Extract<TierValueKind, { kind: 'color' }> {
  return k.kind === 'color';
}
