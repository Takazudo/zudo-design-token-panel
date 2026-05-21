/**
 * HighlightToggleButton — eye icon that toggles CSS-variable-based highlighting.
 *
 * Reads HighlightContext to determine active state and slot colour.  When the
 * context is null (component rendered outside the orchestrator's provider —
 * e.g. in unit tests without a wrapper), the component renders nothing so
 * rows degrade gracefully.
 *
 * HighlightContext is the single source of truth for the context type so both
 * consumers (this button) and the orchestrator (#232) import from the same
 * module.
 */

import { createContext } from 'preact';
import { useContext, useCallback } from 'preact/hooks';
import type { JSX } from 'preact';
import type { HighlightState, HighlightSlotSpec } from './highlight-state';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export interface HighlightContextValue {
  state: HighlightState;
  toggle: (cssVar: string) => void;
  /** Optional — when the orchestrator computes match counts it injects them here for title attributes. */
  matchCounts?: Record<string, number>;
  /** Optional — orchestrator may expose setSlot for slot colour editing. */
  setSlot?: (index: number, partial: Partial<HighlightSlotSpec>) => void;
  /** Optional — orchestrator may expose reset to clear all active highlights. */
  reset?: () => void;
  /** Optional — orchestrator may expose disableAll to clear the active map while preserving slot colours. */
  disableAll?: () => void;
}

export const HighlightContext = createContext<HighlightContextValue | null>(null);

// ---------------------------------------------------------------------------
// HighlightToggleButton
// ---------------------------------------------------------------------------

export interface HighlightToggleButtonProps {
  cssVar: string;
}

export function HighlightToggleButton({ cssVar }: HighlightToggleButtonProps): JSX.Element | null {
  const ctx = useContext(HighlightContext);

  // Render nothing when used outside the orchestrator's provider.
  if (ctx === null) return null;

  const { state, toggle, matchCounts } = ctx;

  const slotIdx = state.active[cssVar];
  const isActive = slotIdx !== undefined;
  const slotColor = isActive ? state.slots[slotIdx]?.color : undefined;
  const count = matchCounts?.[cssVar];

  const handleToggle = useCallback(() => {
    toggle(cssVar);
  }, [toggle, cssVar]);

  const title = isActive
    ? `Stop highlighting ${cssVar}` + (count !== undefined ? ` (${count} elements)` : '')
    : `Highlight elements using ${cssVar}`;

  return (
    <div
      role="button"
      tabIndex={0}
      className={isActive ? 'tokenpanel-highlight-toggle is-active' : 'tokenpanel-highlight-toggle'}
      onClick={handleToggle}
      onKeyDown={(e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleToggle();
        }
      }}
      title={title}
      style={isActive ? { color: slotColor } : undefined}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {isActive ? (
          // eye-open: outer path + pupil circle
          <>
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </>
        ) : (
          // eye-off: slashed eye
          <>
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </>
        )}
      </svg>
    </div>
  );
}
