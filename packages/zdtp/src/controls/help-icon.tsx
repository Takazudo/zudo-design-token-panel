/** @jsxImportSource @takazudo/zfb/zudo-react */
/**
 * HelpIcon — small round "?" badge that explains a panel concept via the
 * shared `.tokenpanel-tooltip--help` variant (issues #520 and #544).
 *
 * Chrome-button policy (CLAUDE.md): implemented as
 * `<div role="button" tabIndex={0}>` with explicit Enter/Space handling —
 * never a native `<button>`.
 *
 * Behavior:
 *  - Hover / focus shows the help tooltip transiently, same as any other
 *    tooltip trigger.
 *  - Click (or Enter/Space) PINS the tooltip open — touch devices have no
 *    hover, so a tap must be able to reveal and hold the tip. A second
 *    activation, or pressing Escape anywhere on the page, unpins it.
 *
 * Callers must never nest this inside a `<label>`, where activating the icon
 * would also toggle the label's control.
 *
 * Known trade-off: `tooltip-controller.ts` renders a single shared tooltip DOM node,
 * so pinning icon A then hovering/pinning icon B silently replaces A's
 * visible content with B's — A's `pinned`/`is-pinned` state persists until
 * A is next clicked or Escape is pressed, even though its tooltip is no
 * longer the one on screen. Acceptable for this panel's single-tooltip
 * architecture; not worth a cross-instance pin registry for a "?" hint.
 * The same applies to a panel/window resize: `tooltip-controller.ts` hides the shared
 * tooltip on resize (its ResizeObserver + window-resize handlers), but this
 * component's local `pinned` state only clears on click/Escape — so after a
 * resize the icon may briefly keep `is-pinned`/`aria-pressed` with no tooltip
 * visible until the next activation. Same accepted single-tooltip trade-off.
 */

import { computed, getScope, signal, type Ref } from '@takazudo/zfb/zudo-react';
import type { TooltipController } from './tooltip-controller';

// ---------------------------------------------------------------------------
// Copy — single source of truth for the Color tab's section-level semantic
// token explainer.
// ---------------------------------------------------------------------------

export const SEMANTIC_TOKENS_HELP_TEXT =
  'Ramp options stay linked live to palette edits. Literal sets a fixed color that is not linked. Per-mode sets independent light and dark colors emitted with CSS light-dark().';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface HelpIconProps {
  /** The help text shown in the tooltip (wrapped, multi-line). */
  text: string;
  /** Accessible name for the icon itself (e.g. "Literal help", "Surface per-mode help"). */
  ariaLabel: string;
  tooltip: TooltipController | null;
}

export function HelpIcon({ text, ariaLabel, tooltip }: HelpIconProps) {
  const pinned = signal(false);
  const el: Ref<HTMLDivElement> = { current: null };
  const show = (target: HTMLElement) => tooltip?.show(target, text, { variant: 'help' });
  const hide = (target: HTMLElement) => tooltip?.hide(target);

  const handleActivate = () => {
    const next = !pinned.value;
    pinned.value = next;
    if (!el.current) return;
    if (next) show(el.current);
    else hide(el.current);
  };

  // Escape unpins from anywhere on the page — mirrors the tooltip
  // controller's own document-level Escape listener, which already hides the
  // visual tooltip; this keeps the local `pinned` state in sync with that
  // even when focus isn't on the icon itself.
  getScope().onActivate(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && pinned.value) pinned.value = false;
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  });

  return (
    <div
      ref={el}
      role="button"
      tabindex={0}
      class={computed(() => (pinned.value ? 'tokenpanel-help-icon is-pinned' : 'tokenpanel-help-icon'))}
      aria-label={ariaLabel}
      aria-pressed={pinned}
      on:click={handleActivate}
      on:keydown={(e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleActivate();
        }
      }}
      on:mouseenter={(e: MouseEvent) => show(e.currentTarget as HTMLElement)}
      // Skip the hide half of hover/focus while pinned — the tooltip should
      // survive the pointer/focus leaving until the user explicitly unpins.
      on:mouseleave={(e: MouseEvent) => {
        if (!pinned.value) hide(e.currentTarget as HTMLElement);
      }}
      on:focusin={(e: FocusEvent) => show(e.currentTarget as HTMLElement)}
      on:focusout={(e: FocusEvent) => {
        if (!pinned.value) hide(e.currentTarget as HTMLElement);
      }}
    >
      ?
    </div>
  );
}

export default HelpIcon;
