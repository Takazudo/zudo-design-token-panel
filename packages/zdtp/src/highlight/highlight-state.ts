/**
 * Highlight state slice — reservation-sheet model.
 *
 * 10 colour slots ({color}) are pre-defined. A cssVar can be mapped to a slot
 * (0..9) via toggleHighlight. The slot is reserved until the same cssVar is
 * toggled off, giving a stable colour across inspect sessions (the
 * "reservation-sheet" property: slot 2 always means the same colour regardless
 * of toggle order).
 *
 * A single global `outlineWidth` applies to all overlay rings simultaneously.
 *
 * Persistence is split:
 *   slots        → localStorage  (survives full page reload — user colour edits kept)
 *   outlineWidth → localStorage  (survives full page reload — user width setting kept)
 *   active       → sessionStorage (cleared on reload — inspection set is ephemeral)
 */

import { getPanelConfig, type PanelConfig } from '../config/panel-config';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HighlightSlotSpec {
  color: string;
}

export interface HighlightState {
  /** Fixed-length array of 10 slot specs. */
  slots: HighlightSlotSpec[];
  /** Global outline width in px applied to all overlay rings. Default 2. */
  outlineWidth: number;
  /** cssVar → slotIndex (0..9) for every currently-highlighted token. */
  active: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Default slots
// ---------------------------------------------------------------------------

export const DEFAULT_HIGHLIGHT_SLOTS: HighlightSlotSpec[] = [
  { color: '#ff2d2d' }, // red
  { color: '#ff2dcf' }, // pink
  { color: '#2dd4ff' }, // skyblue
  { color: '#ffa92d' }, // orange
  { color: '#2dff5b' }, // green
  { color: '#a92dff' }, // purple
  { color: '#ff2d6e' }, // magenta-pink
  { color: '#2dffd1' }, // mint
  { color: '#ffe92d' }, // yellow
  { color: '#2d6eff' }, // blue
];

const DEFAULT_OUTLINE_WIDTH = 2;

// ---------------------------------------------------------------------------
// Storage key helpers (read prefix at call-time — never at module init)
// ---------------------------------------------------------------------------

function storageKey_highlightSlots(cfg?: PanelConfig): string {
  return `${(cfg ?? getPanelConfig()).storagePrefix}-highlight-slots`;
}

function storageKey_highlightActive(cfg?: PanelConfig): string {
  return `${(cfg ?? getPanelConfig()).storagePrefix}-highlight-active`;
}

function storageKey_highlightOutlineWidth(cfg?: PanelConfig): string {
  return `${(cfg ?? getPanelConfig()).storagePrefix}-highlight-outline-width`;
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
 * Reset slot specs to the defaults and restore global outlineWidth to 2.
 * The `active` map is preserved — the user is resetting slot colours, not
 * their inspection set.
 */
export function resetSlots(state: HighlightState): HighlightState {
  return {
    ...state,
    slots: DEFAULT_HIGHLIGHT_SLOTS.map((s) => ({ ...s })),
    outlineWidth: DEFAULT_OUTLINE_WIDTH,
  };
}

/**
 * Clear all active highlights. Returns a new state with an empty `active` map;
 * `slots` (colors) and `outlineWidth` are left untouched.
 */
export function clearAllActive(state: HighlightState): HighlightState {
  return { ...state, active: {} };
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

/**
 * Set the global outline width. Width is clamped to >= 1.
 */
export function setOutlineWidth(state: HighlightState, width: number): HighlightState {
  const clamped = Math.max(1, width);
  return { ...state, outlineWidth: clamped };
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

/**
 * Load highlight state from the split storage backends.
 *
 * - slots        ← localStorage  (key: `${storagePrefix}-highlight-slots`)
 * - outlineWidth ← localStorage  (key: `${storagePrefix}-highlight-outline-width`)
 * - active       ← sessionStorage (key: `${storagePrefix}-highlight-active`)
 *
 * On any parse / access failure the affected slice falls back to its default
 * (`DEFAULT_HIGHLIGHT_SLOTS` / 2 / `{}`).
 *
 * Migration: existing localStorage `slots` arrays may carry a per-slot
 * `outlineWidth` field — the extra field is simply ignored on load.
 */
export function loadHighlightState(cfg?: PanelConfig): HighlightState {
  let slots: HighlightSlotSpec[] = DEFAULT_HIGHLIGHT_SLOTS.map((s) => ({ ...s }));
  let outlineWidth: number = DEFAULT_OUTLINE_WIDTH;
  let active: Record<string, number> = {};

  try {
    const raw = localStorage.getItem(storageKey_highlightSlots(cfg));
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length === 10) {
        // Strip any extra fields (e.g. legacy per-slot outlineWidth) — keep only color.
        slots = (parsed as Array<{ color: string }>).map((s) => ({ color: s.color }));
      }
    }
  } catch {
    // Storage unavailable or parse error — use default slots.
  }

  try {
    const raw = localStorage.getItem(storageKey_highlightOutlineWidth(cfg));
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'number' && parsed >= 1) {
        outlineWidth = parsed;
      }
    }
  } catch {
    // Storage unavailable or parse error — use default outlineWidth.
  }

  try {
    const raw = sessionStorage.getItem(storageKey_highlightActive(cfg));
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
        active = parsed as Record<string, number>;
      }
    }
  } catch {
    // Storage unavailable or parse error — use empty active map.
  }

  return { slots, outlineWidth, active };
}

/**
 * Persist highlight state to the split storage backends.
 *
 * - slots        → localStorage
 * - outlineWidth → localStorage
 * - active       → sessionStorage
 *
 * Gracefully handles environments where storage is unavailable.
 */
export function saveHighlightState(state: HighlightState, cfg?: PanelConfig): void {
  try {
    localStorage.setItem(storageKey_highlightSlots(cfg), JSON.stringify(state.slots));
  } catch {
    // Storage unavailable — degrade silently.
  }

  try {
    localStorage.setItem(storageKey_highlightOutlineWidth(cfg), JSON.stringify(state.outlineWidth));
  } catch {
    // Storage unavailable — degrade silently.
  }

  try {
    sessionStorage.setItem(storageKey_highlightActive(cfg), JSON.stringify(state.active));
  } catch {
    // Storage unavailable — degrade silently.
  }
}
