import { memo } from 'preact/compat';
import type { TabConfig, TierConfig, TierItem } from '../tokens/tier-model';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Sentinel string passed to `onChange` when the user picks "Literal...".
 * The parent component interprets this as a request to flip the item back
 * into its kind-specific editor (slider / text / select) writing a literal
 * CSS override.
 */
export const TIER_REF_LITERAL_SIGNAL = '__literal__' as const;

/**
 * Maximum length of a value preview string shown in option labels.
 * Long values like cubic-bezier strings are truncated so the UI stays compact.
 */
const PREVIEW_MAX_LEN = 28;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function truncatePreview(value: string): string {
  if (value.length <= PREVIEW_MAX_LEN) return value;
  return value.slice(0, PREVIEW_MAX_LEN - 1) + '…';
}

function findTier(tab: TabConfig, tierId: string): TierConfig | undefined {
  return tab.tiers.find((t) => t.id === tierId);
}

function findItem(tier: TierConfig, itemId: string): TierItem | undefined {
  return tier.items.find((i) => i.id === itemId);
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface TierRefSelectorProps {
  /** Full tab config — needed to look up the referenced tier and its items. */
  tab: TabConfig;
  /** The tier whose item is being edited (the "semantic" / reference tier). */
  tierId: string;
  /** The item being edited within `tierId`. */
  itemId: string;
  /**
   * The current stored value for this item — an item id within the
   * referenced (tier-1) tier. Empty string or an unrecognised id is treated
   * as "pick the first item" (mirrors resolver fallback).
   */
  value: string;
  /**
   * Called when the user commits a selection.
   *
   * - Picking a tier-1 item: `onChange(itemId, selectedRefItemId)`
   * - Picking "Literal...": `onChange(itemId, TIER_REF_LITERAL_SIGNAL)`
   */
  onChange: (itemId: string, next: string) => void;
  /**
   * Returns the resolved (override-aware) preview string for a tier-1 item id.
   * Each option label is formatted as `${item.cssVar} (${truncated preview})`.
   * Pass a wrapper around resolveTierItemValue using the current tweak-state map.
   */
  previewValueFor: (refItemId: string) => string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function TierRefSelector({ tab, tierId, itemId, value, onChange, previewValueFor }: TierRefSelectorProps) {
  // -------------------------------------------------------------------------
  // Derive ref tier and options
  // -------------------------------------------------------------------------

  const thisTier = findTier(tab, tierId);
  const refTierId = thisTier?.referencesTier ?? '';
  const refTier = refTierId ? findTier(tab, refTierId) : undefined;

  const refItems: readonly TierItem[] = refTier?.items ?? [];

  // Determine the currently selected value — fall back to first item if unrecognised.
  const selectedRefItemId = (() => {
    if (refTier && findItem(refTier, value)) return value;
    return refItems[0]?.id ?? '';
  })();

  // -------------------------------------------------------------------------
  // Handler
  // -------------------------------------------------------------------------

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(itemId, e.currentTarget.value);
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="tokenpanel-tier-ref-selector">
      <select
        className="tokenpanel-tier-ref-select"
        value={selectedRefItemId === '' ? TIER_REF_LITERAL_SIGNAL : selectedRefItemId}
        onChange={handleChange}
        aria-label={`${itemId} tier reference`}
      >
        {refItems.map((item) => {
          const preview = truncatePreview(previewValueFor(item.id));
          return (
            <option key={item.id} value={item.id}>
              {item.cssVar} ({preview})
            </option>
          );
        })}
        <option value={TIER_REF_LITERAL_SIGNAL}>Literal…</option>
      </select>
    </div>
  );
}

export default memo(TierRefSelector);
