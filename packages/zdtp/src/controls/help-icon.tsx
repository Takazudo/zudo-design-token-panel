/**
 * HelpIcon — small round "?" badge that explains a nearby control via the
 * shared `.tokenpanel-tooltip--help` variant (issue #520).
 *
 * Chrome-button policy (CLAUDE.md): implemented as
 * `<div role="button" tabIndex={0}>` with explicit Enter/Space handling —
 * never a native `<button>`.
 *
 * Behavior:
 *  - Hover / focus shows the help tooltip transiently, same as any other
 *    `useTooltip` trigger.
 *  - Click (or Enter/Space) PINS the tooltip open — touch devices have no
 *    hover, so a tap must be able to reveal and hold the tip. A second
 *    activation, or pressing Escape anywhere on the page, unpins it.
 *
 * Callers place this as a SIBLING of the control it explains (e.g. after a
 * `<select>`, or after a `<label>` wrapping a checkbox) — never nested
 * inside a `<label>`, where a click would also toggle the label's own
 * control.
 */

import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import type { JSX } from 'preact';
import { useTooltip } from './tooltip';

// ---------------------------------------------------------------------------
// Copy — single source of truth for the Literal / Per-mode explainer text
// shared between `tier-ref-selector.tsx` (grouped/ramp-native rows) and
// `tabs/color-tab.tsx`'s `SemanticLiteralRow`.
// ---------------------------------------------------------------------------

export const LITERAL_HELP_TEXT =
  "Literal sets a fixed color just for this token — it won't update if you edit a palette/ramp swatch later. Pick a ramp option to keep it linked live.";

export const PER_MODE_HELP_TEXT =
  'Per-mode gives this token two colors — one for light mode, one for dark. The browser picks the right one automatically via CSS light-dark().';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface HelpIconProps {
  /** The help text shown in the tooltip (wrapped, multi-line). */
  text: string;
  /** Accessible name for the icon itself (e.g. "Literal help", "Surface per-mode help"). */
  ariaLabel: string;
}

export function HelpIcon({ text, ariaLabel }: HelpIconProps): JSX.Element {
  const tooltip = useTooltip(text, { variant: 'help' });
  const [pinned, setPinned] = useState(false);
  const elRef = useRef<HTMLDivElement>(null);

  const handleActivate = useCallback(() => {
    const el = elRef.current;
    const next = !pinned;
    setPinned(next);
    if (!el) return;
    if (next) {
      tooltip.show(el);
    } else {
      tooltip.hide(el);
    }
  }, [pinned, tooltip]);

  const handleClick = useCallback(() => {
    handleActivate();
  }, [handleActivate]);

  const handleKeyDown = useCallback(
    (e: JSX.TargetedKeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleActivate();
      }
    },
    [handleActivate],
  );

  // Skip the hide half of hover/focus while pinned — the tooltip should
  // survive the pointer/focus leaving until the user explicitly unpins.
  const handleMouseLeave = useCallback(
    (e: JSX.TargetedMouseEvent<HTMLElement>) => {
      if (pinned) return;
      tooltip.onMouseLeave(e);
    },
    [pinned, tooltip],
  );

  const handleFocusOut = useCallback(
    (e: JSX.TargetedFocusEvent<HTMLElement>) => {
      if (pinned) return;
      tooltip.onFocusOut(e);
    },
    [pinned, tooltip],
  );

  // Escape unpins from anywhere on the page — mirrors TooltipProvider's own
  // document-level Escape listener, which already hides the visual tooltip;
  // this keeps this component's local `pinned` state in sync with that even
  // when focus isn't on the icon itself.
  useEffect(() => {
    if (!pinned) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setPinned(false);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [pinned]);

  return (
    <div
      ref={elRef}
      role="button"
      tabIndex={0}
      className={pinned ? 'tokenpanel-help-icon is-pinned' : 'tokenpanel-help-icon'}
      aria-label={ariaLabel}
      aria-pressed={pinned}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={tooltip.onMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocusIn={tooltip.onFocusIn}
      onFocusOut={handleFocusOut}
    >
      ?
    </div>
  );
}

export default HelpIcon;
