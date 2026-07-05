/**
 * Tooltip controller — single shared DOM tooltip for truncated token names.
 *
 * Architecture: Context + hook pattern with a single `.tokenpanel-tooltip`
 * element rendered in a portal to `document.body` so that panel overflow
 * clipping cannot hide it.
 *
 * Usage:
 *   // Wrap the tree:
 *   <TooltipProvider>
 *     <YourContent />
 *   </TooltipProvider>
 *
 *   // Inside any descendant:
 *   const tooltipProps = useTooltip(label);
 *   <div {...tooltipProps}>...</div>
 */

import { createContext } from 'preact';
import { useContext, useState, useEffect, useRef, useCallback } from 'preact/hooks';
import { createPortal } from 'preact/compat';
import type { ComponentChildren, JSX } from 'preact';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TooltipState {
  visible: boolean;
  text: string;
  /** The element that is currently triggering the tooltip. */
  triggerEl: HTMLElement | null;
}

interface TooltipContextValue {
  show: (el: HTMLElement, text: string) => void;
  hide: (el: HTMLElement) => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const TooltipContext = createContext<TooltipContextValue | null>(null);

// ---------------------------------------------------------------------------
// Tooltip element
// ---------------------------------------------------------------------------

interface TooltipElementProps {
  state: TooltipState;
}

/**
 * The visual tooltip element.  Rendered via portal to document.body.
 * Positions itself above the trigger element, flipping below when no room.
 * Position is recomputed on every render — the parent re-renders whenever
 * state changes (show/hide/scroll).
 */
function TooltipElement({ state }: TooltipElementProps) {
  const elRef = useRef<HTMLDivElement>(null);

  // Compute position after render so offsetWidth/Height are up-to-date.
  useEffect(() => {
    if (!state.visible || !state.triggerEl || !elRef.current) return;
    const trigger = state.triggerEl;
    const tip = elRef.current;
    const r = trigger.getBoundingClientRect();
    const tw = tip.offsetWidth;
    const th = tip.offsetHeight;
    const gap = 6;
    const pad = 6;
    let left = r.left + r.width / 2 - tw / 2;
    left = Math.max(pad, Math.min(left, window.innerWidth - tw - pad));
    let top = r.top - th - gap; // prefer above
    if (top < pad) top = r.bottom + gap; // flip below
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
  });

  return (
    <div
      ref={elRef}
      role="tooltip"
      aria-hidden={state.visible ? 'false' : 'true'}
      data-show={state.visible ? 'true' : 'false'}
      className="tokenpanel-tooltip"
    >
      {state.text}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface TooltipProviderProps {
  children: ComponentChildren;
}

/**
 * TooltipProvider — owns tooltip state and renders the single shared tooltip
 * element via a portal to document.body.
 *
 * Escape and scroll-capture listeners are mounted once here and hide the
 * tooltip globally.
 */
export function TooltipProvider({ children }: TooltipProviderProps) {
  const [tooltipState, setTooltipState] = useState<TooltipState>({
    visible: false,
    text: '',
    triggerEl: null,
  });

  const currentTriggerRef = useRef<HTMLElement | null>(null);

  const show = useCallback((el: HTMLElement, text: string) => {
    currentTriggerRef.current = el;
    setTooltipState({ visible: true, text, triggerEl: el });
  }, []);

  const hide = useCallback((el: HTMLElement) => {
    // Only hide if this is the element that triggered us (prevents race conditions).
    if (currentTriggerRef.current === el) {
      currentTriggerRef.current = null;
      setTooltipState({ visible: false, text: '', triggerEl: null });
    }
  }, []);

  const hideAll = useCallback(() => {
    currentTriggerRef.current = null;
    setTooltipState({ visible: false, text: '', triggerEl: null });
  }, []);

  // Escape key hides tooltip.
  useEffect(() => {
    // Guard document: preact flushes effects via a scheduled timer, which can
    // fire after a test's jsdom environment tears down (leaking into a later
    // node-environment test file). Matches the `typeof document` guard on the
    // portal render below.
    if (typeof document === 'undefined') return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') hideAll();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [hideAll]);

  // Scroll (capture) repositions the tooltip by hiding it.
  // The trigger will re-show it on next mouseenter if still hovered.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    function onScroll() {
      if (currentTriggerRef.current) hideAll();
    }
    window.addEventListener('scroll', onScroll, true);
    return () => window.removeEventListener('scroll', onScroll, true);
  }, [hideAll]);

  return (
    <TooltipContext.Provider value={{ show, hide }}>
      {children}
      {typeof document !== 'undefined' &&
        createPortal(<TooltipElement state={tooltipState} />, document.body)}
    </TooltipContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Returns event handler props to spread onto the tooltip trigger element.
 *
 * @param text - The full text to show in the tooltip.
 * @returns An object of `onMouseEnter`, `onMouseLeave`, `onFocusIn`, `onFocusOut`
 *          handlers to spread onto the trigger element.
 */
export function useTooltip(text: string): {
  onMouseEnter: JSX.MouseEventHandler<HTMLElement>;
  onMouseLeave: JSX.MouseEventHandler<HTMLElement>;
  onFocusIn: JSX.FocusEventHandler<HTMLElement>;
  onFocusOut: JSX.FocusEventHandler<HTMLElement>;
} {
  const ctx = useContext(TooltipContext);

  const onMouseEnter: JSX.MouseEventHandler<HTMLElement> = useCallback(
    (e) => {
      if (!ctx) return;
      ctx.show(e.currentTarget as HTMLElement, text);
    },
    [ctx, text],
  );

  const onMouseLeave: JSX.MouseEventHandler<HTMLElement> = useCallback(
    (e) => {
      if (!ctx) return;
      ctx.hide(e.currentTarget as HTMLElement);
    },
    [ctx, text],
  );

  const onFocusIn: JSX.FocusEventHandler<HTMLElement> = useCallback(
    (e) => {
      if (!ctx) return;
      ctx.show(e.currentTarget as HTMLElement, text);
    },
    [ctx, text],
  );

  const onFocusOut: JSX.FocusEventHandler<HTMLElement> = useCallback(
    (e) => {
      if (!ctx) return;
      ctx.hide(e.currentTarget as HTMLElement);
    },
    [ctx, text],
  );

  return { onMouseEnter, onMouseLeave, onFocusIn, onFocusOut };
}
