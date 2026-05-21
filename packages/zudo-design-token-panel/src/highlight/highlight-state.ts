/**
 * Highlight state slice — reservation-sheet model.
 *
 * 10 colour slots ({color, outlineWidth}) are pre-defined. A cssVar can be
 * mapped to a slot (0..9) via toggleHighlight. The slot is reserved until
 * the same cssVar is toggled off, giving a stable colour across inspect
 * sessions (the "reservation-sheet" property: slot 2 always means the same
 * colour regardless of toggle order).
 *
 * Persistence is split:
 *   slots  → localStorage  (survives full page reload — user colour edits kept)
 *   active → sessionStorage (cleared on reload — inspection set is ephemeral)
 */

import { getPanelConfig } from '../config/panel-config';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HighlightSlotSpec {
  color: string;
  outlineWidth: number;
}

export interface HighlightState {
  /** Fixed-length array of 10 slot specs. */
  slots: HighlightSlotSpec[];
  /** cssVar → slotIndex (0..9) for every currently-highlighted token. */
  active: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Default slots
// ---------------------------------------------------------------------------

export const DEFAULT_HIGHLIGHT_SLOTS: HighlightSlotSpec[] = [
  { color: '#ff2d2d', outlineWidth: 2 }, // red
  { color: '#ff2dcf', outlineWidth: 2 }, // pink
  { color: '#2dd4ff', outlineWidth: 2 }, // skyblue
  { color: '#ffa92d', outlineWidth: 2 }, // orange
  { color: '#2dff5b', outlineWidth: 2 }, // green
  { color: '#a92dff', outlineWidth: 2 }, // purple
  { color: '#ff2d6e', outlineWidth: 2 }, // magenta-pink
  { color: '#2dffd1', outlineWidth: 2 }, // mint
  { color: '#ffe92d', outlineWidth: 2 }, // yellow
  { color: '#2d6eff', outlineWidth: 2 }, // blue
];

// ---------------------------------------------------------------------------
// Storage key helpers (read prefix at call-time — never at module init)
// ---------------------------------------------------------------------------

function storageKey_highlightSlots(): string {
  return `${getPanelConfig().storagePrefix}-highlight-slots`;
}

function storageKey_highlightActive(): string {
  return `${getPanelConfig().storagePrefix}-highlight-active`;
}

// ---------------------------------------------------------------------------
// Pure state helpers
// ---------------------------------------------------------------------------

/**
 * Return the lowest slot index (0..9) not present in `active`, or -1 if all
 * 10 slots are already in use.
 */
export function allocateSlot(active: Record<string, number>): number {
  const used = new Set(Object.values(active));
  for (let i = 0; i < 10; i++) {
    if (!used.has(i)) return i;
  }
  return -1;
}

/**
 * Toggle highlight for `cssVar`.
 *
 * - If `cssVar` is already active, remove it (release the slot).
 * - Otherwise allocate the lowest free slot and add the mapping.
 * - If no slots are free, return `state` unchanged (referentially equal) and
 *   emit a console.warn.
 */
export function toggleHighlight(state: HighlightState, cssVar: string): HighlightState {
  if (cssVar in state.active) {
    const { [cssVar]: _removed, ...rest } = state.active;
    return { ...state, active: rest };
  }

  const slot = allocateSlot(state.active);
  if (slot === -1) {
    console.warn(
      '[zudo-design-token-panel] highlight: all 10 slots are in use; cannot highlight',
      cssVar,
    );
    return state;
  }

  return {
    ...state,
    active: { ...state.active, [cssVar]: slot },
  };
}

/**
 * Reset slot specs to the defaults. The `active` map is preserved — the user
 * is resetting slot colours, not their inspection set.
 */
export function resetSlots(state: HighlightState): HighlightState {
  return { ...state, slots: DEFAULT_HIGHLIGHT_SLOTS.map((s) => ({ ...s })) };
}

/**
 * Merge `partial` into the slot at `index`. Out-of-range index returns
 * `state` unchanged.
 */
export function setSlot(
  state: HighlightState,
  index: number,
  partial: Partial<HighlightSlotSpec>,
): HighlightState {
  if (index < 0 || index >= state.slots.length) return state;
  const nextSlots = state.slots.map((s, i) => (i === index ? { ...s, ...partial } : s));
  return { ...state, slots: nextSlots };
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

/**
 * Load highlight state from the split storage backends.
 *
 * - slots  ← localStorage  (key: `${storagePrefix}-highlight-slots`)
 * - active ← sessionStorage (key: `${storagePrefix}-highlight-active`)
 *
 * On any parse / access failure the affected slice falls back to its default
 * (`DEFAULT_HIGHLIGHT_SLOTS` / `{}`).
 */
export function loadHighlightState(): HighlightState {
  let slots: HighlightSlotSpec[] = DEFAULT_HIGHLIGHT_SLOTS.map((s) => ({ ...s }));
  let active: Record<string, number> = {};

  try {
    const raw = localStorage.getItem(storageKey_highlightSlots());
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length === 10) {
        slots = parsed as HighlightSlotSpec[];
      }
    }
  } catch {
    // Storage unavailable or parse error — use default slots.
  }

  try {
    const raw = sessionStorage.getItem(storageKey_highlightActive());
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
        active = parsed as Record<string, number>;
      }
    }
  } catch {
    // Storage unavailable or parse error — use empty active map.
  }

  return { slots, active };
}

/**
 * Persist highlight state to the split storage backends.
 *
 * - slots  → localStorage
 * - active → sessionStorage
 *
 * Gracefully handles environments where storage is unavailable.
 */
export function saveHighlightState(state: HighlightState): void {
  try {
    localStorage.setItem(storageKey_highlightSlots(), JSON.stringify(state.slots));
  } catch {
    // Storage unavailable — degrade silently.
  }

  try {
    sessionStorage.setItem(storageKey_highlightActive(), JSON.stringify(state.active));
  } catch {
    // Storage unavailable — degrade silently.
  }
}
