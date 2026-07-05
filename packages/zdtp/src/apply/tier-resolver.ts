/**
 * Cross-tier reference resolver and CSS value emitter.
 *
 * Pure module — no DOM, no Preact, no IO. Safe to import in any environment.
 *
 * ## TabOverrides shape
 *
 * `TabOverrides` is a two-level nested map:
 *
 *   tierId → itemId → overrideValue (CSS string)
 *
 * Example:
 *   {
 *     raw:      { 'ease-in': 'cubic-bezier(0.42,0,1,1)' },
 *     semantic: { 'tab-open': 'ease-in' },  // ref value — points at a raw item id
 *   }
 *
 * For a literal tier (no referencesTier) the value is the CSS string to emit.
 * For a reference tier (referencesTier is set) the value is the id of a target
 * item in the named tier.
 */

import type { TabConfig, TierConfig, TierItem } from '../tokens/tier-model';

export type TabOverrides = Readonly<Record<string, Readonly<Record<string, string>>>>;

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export class TierResolverError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TierResolverError';
    Object.setPrototypeOf(this, TierResolverError.prototype);
  }
}

// ---------------------------------------------------------------------------
// Resolution result
// ---------------------------------------------------------------------------

export type ResolvedLiteral = { kind: 'literal'; value: string };
export type ResolvedRef = { kind: 'ref'; targetCssVar: string };
export type ResolvedTierItem = ResolvedLiteral | ResolvedRef;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function findTier(tab: TabConfig, tierId: string): TierConfig | undefined {
  return tab.tiers.find((t) => t.id === tierId);
}

function findItem(tier: TierConfig, itemId: string): TierItem | undefined {
  return tier.items.find((i) => i.id === itemId);
}

// ---------------------------------------------------------------------------
// Core resolver
// ---------------------------------------------------------------------------

/**
 * Resolve the effective CSS value for a single tier item.
 *
 * For literal tiers (no `referencesTier`):
 *   Returns { kind: 'literal', value } where value is the override string
 *   or the item's `default`.
 *
 * For reference tiers (`referencesTier` is set):
 *   The override value is interpreted as an item id in the referenced tier.
 *   Returns { kind: 'ref', targetCssVar } pointing at the referenced item's
 *   cssVar so callers can emit `var(--targetCssVar)`.
 *
 * Pill semantics:
 *   When a literal-tier item has a `pill` spec and the override value equals
 *   `pill.value`, the pill value is returned verbatim (the pill toggle is ON).
 *   When the override is absent but the item has a pill, `pill.customDefault`
 *   is used as the baseline (not the item's `default`). The item's `default`
 *   is used only when neither an override nor a pill customDefault apply.
 *
 * Error cases (throw TierResolverError):
 *   - tierId not found in tab.tiers
 *   - referencesTier id not found in tab.tiers
 *   - ref override points at a tier other than the one declared in referencesTier
 *     (guarded by design: the resolver validates the target tier id)
 *
 * Fallback case (no error):
 *   - ref override id not found in the target tier → falls back to the target
 *     tier's item whose id matches itemId; if that also doesn't exist, falls
 *     back to the first item's default.
 */
export function resolveTierItemValue(
  tab: TabConfig,
  tierId: string,
  itemId: string,
  overrides: TabOverrides,
): ResolvedTierItem {
  const tier = findTier(tab, tierId);
  if (!tier) {
    throw new TierResolverError(
      `Tier "${tierId}" not found in tab "${tab.id}". ` +
        `Available tiers: ${tab.tiers.map((t) => t.id).join(', ')}.`,
    );
  }

  const item = findItem(tier, itemId);
  if (!item) {
    throw new TierResolverError(
      `Item "${itemId}" not found in tier "${tierId}" of tab "${tab.id}".`,
    );
  }

  const tierOverrides = overrides[tierId];
  const overrideValue = tierOverrides?.[itemId];

  // -------------------------------------------------------------------------
  // Reference tier
  // -------------------------------------------------------------------------
  if (tier.referencesTier !== undefined) {
    const refTierId = tier.referencesTier;
    const refTier = findTier(tab, refTierId);
    if (!refTier) {
      throw new TierResolverError(
        `Tier "${tierId}" declares referencesTier "${refTierId}" ` +
          `but that tier does not exist in tab "${tab.id}".`,
      );
    }

    const refItemId = overrideValue ?? itemId;
    const refItem = findItem(refTier, refItemId);

    if (!refItem) {
      // Unknown ref id — fall back chain:
      // 1. item.default (manifest-declared scale, e.g. "nx-scale-md")
      // 2. matching item by id in the ref tier
      // 3. first item in the ref tier
      const fallbackItem =
        findItem(refTier, item.default) ??
        findItem(refTier, itemId) ??
        refTier.items[0];
      if (!fallbackItem) {
        throw new TierResolverError(
          `Referenced tier "${refTierId}" has no items; cannot resolve fallback ` +
            `for item "${itemId}" in tier "${tierId}" of tab "${tab.id}".`,
        );
      }
      return { kind: 'ref', targetCssVar: fallbackItem.cssVar };
    }

    return { kind: 'ref', targetCssVar: refItem.cssVar };
  }

  // -------------------------------------------------------------------------
  // Literal tier
  // -------------------------------------------------------------------------
  if (overrideValue !== undefined) {
    // Pill toggle: if the override equals pill.value, emit the pill value.
    if (item.pill && overrideValue === item.pill.value) {
      return { kind: 'literal', value: item.pill.value };
    }
    return { kind: 'literal', value: overrideValue };
  }

  // No override — use pill.customDefault if available, otherwise item.default.
  if (item.pill) {
    return { kind: 'literal', value: item.pill.customDefault };
  }
  return { kind: 'literal', value: item.default };
}

// ---------------------------------------------------------------------------
// Emitter
// ---------------------------------------------------------------------------

/**
 * Convert a resolved tier item into the final CSS value string to write into
 * a CSS custom property.
 *
 * - Literal → returns the value as-is (e.g. `1.25rem`).
 * - Ref     → returns `var(--targetCssVar)` (e.g. `var(--zfb-easing-ease-in)`).
 */
export function emitTierItemCssValue(resolved: ResolvedTierItem): string {
  if (resolved.kind === 'literal') return resolved.value;
  return `var(${resolved.targetCssVar})`;
}

// ---------------------------------------------------------------------------
// Cross-tab ref resolution (#467)
// ---------------------------------------------------------------------------

/**
 * A `SemanticValue`'s cross-tab ramp reference: names a target ramp item by
 * `{ tab?, tier, item }`. An omitted `tab` means "the current tab" (intra-tab,
 * back-compat). Mirrors the `{ ref }` variant of `SemanticValue` in
 * `tokens/tier-model.ts`.
 */
export type CrossTabRef = { tab?: string; tier: string; item: string };

/**
 * Resolve a `{ tab?, tier, item }` reference to the target item's `cssVar`
 * so a downstream emitter (#468) can write `var(--target-cssvar)`.
 *
 * Resolution:
 *   - `tab` omitted (or equal to `currentTab.id`) → resolve within
 *     `currentTab` (intra-tab; keeps a lone-tab caller working with the
 *     default `tabs = [currentTab]`).
 *   - `tab` set → look the target tab up by id in `tabs` (the panel config's
 *     full tabs array), then find `tier` in it, then `item` in that tier.
 *
 * Throws `TierResolverError` with a precise message when the target tab, tier,
 * or item does not exist. This is the single reachable cross-tab lookup path;
 * #468 wraps the returned cssVar in `var(...)` and #469 validates source
 * declarations up front.
 */
export function resolveRefToCssVar(
  ref: CrossTabRef,
  currentTab: TabConfig,
  tabs: readonly TabConfig[] = [currentTab],
): string {
  const targetTab =
    ref.tab === undefined || ref.tab === currentTab.id
      ? currentTab
      : tabs.find((t) => t.id === ref.tab);
  if (!targetTab) {
    throw new TierResolverError(
      `Cross-tab ref target tab "${ref.tab}" not found. ` +
        `Available tabs: ${tabs.map((t) => t.id).join(', ')}.`,
    );
  }

  const tier = findTier(targetTab, ref.tier);
  if (!tier) {
    throw new TierResolverError(
      `Cross-tab ref target tier "${ref.tier}" not found in tab "${targetTab.id}". ` +
        `Available tiers: ${targetTab.tiers.map((t) => t.id).join(', ')}.`,
    );
  }

  const item = findItem(tier, ref.item);
  if (!item) {
    throw new TierResolverError(
      `Cross-tab ref target item "${ref.item}" not found in tier "${ref.tier}" ` +
        `of tab "${targetTab.id}". Available items: ${tier.items.map((i) => i.id).join(', ')}.`,
    );
  }

  return item.cssVar;
}
