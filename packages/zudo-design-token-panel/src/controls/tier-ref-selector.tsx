import { memo, useCallback, useEffect, useId, useRef, useState } from 'preact/compat';
import type { TabConfig, TierConfig, TierItem } from '../tokens/tier-model';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Sentinel string passed to `onChange` when the user picks "Literal...".
 * The parent component (Wave 5) interprets this as a request to flip the
 * item back into its kind-specific editor (slider / text / select) writing a
 * literal CSS override.
 */
export const TIER_REF_LITERAL_SIGNAL = '__literal__' as const;

/**
 * Maximum length of a value preview string shown in the trigger button and
 * dropdown options. Long values like cubic-bezier strings are truncated so
 * the UI stays compact.
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

/**
 * Resolve the label + preview string for the currently-selected ref item.
 * Falls back to the first item in the ref tier when the current `value` id
 * does not match any known item (mirrors tier-resolver fallback semantics).
 */
function resolveCurrentRefItem(
  refTier: TierConfig,
  currentRefId: string,
): TierItem {
  return findItem(refTier, currentRefId) ?? refTier.items[0];
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
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function TierRefSelector({ tab, tierId, itemId, value, onChange }: TierRefSelectorProps) {
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number>(0);

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const listboxRef = useRef<HTMLUListElement | null>(null);

  const triggerId = useId();
  const listboxId = useId();

  // -------------------------------------------------------------------------
  // Derive ref tier and options
  // -------------------------------------------------------------------------

  const thisTier = findTier(tab, tierId);
  const refTierId = thisTier?.referencesTier ?? '';
  const refTier = refTierId ? findTier(tab, refTierId) : undefined;

  // All options: tier-1 items + "Literal..." sentinel at the end.
  const refItems: readonly TierItem[] = refTier?.items ?? [];

  // "Literal..." is always last in the list.
  const optionCount = refItems.length + 1;
  const LITERAL_INDEX = refItems.length;

  // -------------------------------------------------------------------------
  // Current selection display
  // -------------------------------------------------------------------------

  const currentRefItem = refTier ? resolveCurrentRefItem(refTier, value) : undefined;
  const triggerLabel = currentRefItem
    ? `${currentRefItem.cssVar} — ${truncatePreview(currentRefItem.default)}`
    : value || '—';

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const openDropdown = useCallback(() => {
    // Position focus on the currently-selected item when opening.
    const selectedIdx = refItems.findIndex((i) => i.id === value);
    setFocusedIndex(selectedIdx >= 0 ? selectedIdx : 0);
    setOpen(true);
  }, [refItems, value]);

  const closeDropdown = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  const commitSelection = useCallback(
    (idx: number) => {
      if (idx === LITERAL_INDEX) {
        onChange(itemId, TIER_REF_LITERAL_SIGNAL);
      } else {
        const picked = refItems[idx];
        if (picked) onChange(itemId, picked.id);
      }
      closeDropdown();
    },
    [LITERAL_INDEX, refItems, itemId, onChange, closeDropdown],
  );

  // Trigger keydown: Enter / Space open; arrow keys also open.
  const handleTriggerKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        openDropdown();
      }
    },
    [openDropdown],
  );

  // Listbox keydown: ArrowUp/Down navigate, Enter/Space picks, Escape closes.
  const handleListKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex((prev) => Math.min(prev + 1, optionCount - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        commitSelection(focusedIndex);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeDropdown();
      }
    },
    [focusedIndex, optionCount, commitSelection, closeDropdown],
  );

  // Close when clicking outside.
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        listboxRef.current &&
        !listboxRef.current.contains(target)
      ) {
        closeDropdown();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, closeDropdown]);

  // Move focus to the listbox when it opens; move focus back to trigger when it
  // closes is handled in closeDropdown().
  useEffect(() => {
    if (open) {
      listboxRef.current?.focus();
    }
  }, [open]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="tokenpanel-tier-ref-selector">
      {/* Trigger button */}
      <button
        ref={triggerRef}
        type="button"
        id={triggerId}
        className="tokenpanel-tier-ref-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        onClick={openDropdown}
        onKeyDown={handleTriggerKeyDown}
      >
        <span className="tokenpanel-tier-ref-trigger-label">{triggerLabel}</span>
        <span className="tokenpanel-tier-ref-trigger-arrow" aria-hidden>
          {open ? '▲' : '▼'}
        </span>
      </button>

      {/* Dropdown listbox */}
      {open && (
        <ul
          ref={listboxRef}
          id={listboxId}
          role="listbox"
          aria-labelledby={triggerId}
          tabIndex={-1}
          className="tokenpanel-tier-ref-listbox"
          onKeyDown={handleListKeyDown}
        >
          {refItems.map((item, idx) => (
            <li
              key={item.id}
              role="option"
              aria-selected={item.id === value}
              data-focused={idx === focusedIndex || undefined}
              className={
                'tokenpanel-tier-ref-option' +
                (idx === focusedIndex ? ' tokenpanel-tier-ref-option--focused' : '')
              }
              onMouseDown={(e) => {
                e.preventDefault(); // keep listbox focus
                commitSelection(idx);
              }}
              onMouseEnter={() => setFocusedIndex(idx)}
            >
              <span className="tokenpanel-tier-ref-option-label">
                {item.cssVar}
                {item.label !== item.cssVar && (
                  <span className="tokenpanel-row-label-sub">{item.label}</span>
                )}
              </span>
              <span className="tokenpanel-tier-ref-option-preview">
                {truncatePreview(item.default)}
              </span>
            </li>
          ))}

          {/* "Literal..." sentinel option */}
          <li
            key="__literal__"
            role="option"
            aria-selected={false}
            data-focused={LITERAL_INDEX === focusedIndex || undefined}
            className={
              'tokenpanel-tier-ref-option tokenpanel-tier-ref-option--literal' +
              (LITERAL_INDEX === focusedIndex ? ' tokenpanel-tier-ref-option--focused' : '')
            }
            onMouseDown={(e) => {
              e.preventDefault();
              commitSelection(LITERAL_INDEX);
            }}
            onMouseEnter={() => setFocusedIndex(LITERAL_INDEX)}
          >
            <span className="tokenpanel-tier-ref-option-label">Literal…</span>
          </li>
        </ul>
      )}
    </div>
  );
}

export default memo(TierRefSelector);
