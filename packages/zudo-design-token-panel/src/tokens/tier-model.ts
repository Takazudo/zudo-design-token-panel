/**
 * Abstract token tier model — type definitions only.
 *
 * Canonical source: packages/zudo-design-token-panel/src/tokens/tier-model.ts
 * Implemented by W1-S1 (#70). This stub ships the agreed contract so that
 * W1-S3 (the back-compat shim) can compile before the sibling PR lands.
 *
 * NOTE: this file is authored by W1-S3 as a local stub matching the type
 * contract in issue #70. When W1-S1 merges into base/abstract-token-tiers,
 * that branch's tier-model.ts supersedes this file. The shapes are identical
 * by contract so the merge will be a no-op diff (or a clean replacement).
 */

import type { ColorClusterDataConfig } from '../config/cluster-config';

export type TierValueKind =
  | { kind: 'length'; min: number; max: number; step: number; unit: string }
  | { kind: 'number'; min: number; max: number; step: number }
  | { kind: 'select'; options: readonly string[] }
  | { kind: 'text' }
  | { kind: 'color' };

export interface PillSpec {
  value: string;
  customDefault: string;
}

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
  referencesTier?: string;
}

/**
 * Everything in ColorClusterDataConfig that is NOT palette / semantic data.
 * Palette and semantic items are lifted into TierConfig items; the rest of
 * the cluster config (schemes, base roles, HSL picker settings, secondary
 * cluster metadata) rides here and is consumed by the color tab UI in Wave 7.
 */
export type ColorClusterExtras = Omit<ColorClusterDataConfig, never>;

export interface TabConfig {
  id: string;
  label: string;
  tiers: readonly TierConfig[];
  advancedTiers?: readonly string[];
  colorExtras?: ColorClusterExtras;
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
