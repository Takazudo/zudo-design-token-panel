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
import { isDocumentUsable } from '../utils/document-liveness';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Opt-in tooltip presentation variant. `'help'` applies the wrapped,
 * bounded-width `.tokenpanel-tooltip--help` class (see panel.css) instead of
 * the default token tooltip — used by `controls/help-icon.tsx`
 * for the multi-sentence Literal / Per-mode explainer tips.
 */
export type TooltipVariant = 'help';

/** Opt-in horizontal anchor for triggers whose box is wider than its text. */
export type TooltipAnchor = 'text';

interface TooltipState {
  visible: boolean;
  text: string;
  /** The element that is currently triggering the tooltip. */
  triggerEl: HTMLElement | null;
  variant?: TooltipVariant;
  anchor?: TooltipAnchor;
}

interface TooltipContextValue {
  show: (
    el: HTMLElement,
    text: string,
    variant?: TooltipVariant,
    anchor?: TooltipAnchor,
  ) => void;
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
 * Return the visible horizontal part of a trigger's first text node.
 *
 * A Range measures the text's full layout extent, including characters hidden
 * by text-overflow. Intersecting it with the trigger's client box gives the
 * displayed text area for both truncated and untruncated labels. The
 * intersection is intentionally horizontal only; the trigger's border box
 * still controls vertical placement and flipping.
 */
function getTextAnchorRect(
  trigger: HTMLElement,
  triggerRect: DOMRect,
): { left: number; right: number } | null {
  const textNode = Array.from(trigger.childNodes).find(
    (node): node is Text => node.nodeType === 3,
  );
  if (!textNode) return null;

  const range = document.createRange();
  range.selectNodeContents(textNode);
  if (typeof range.getBoundingClientRect !== 'function') return null;
  const textRect = range.getBoundingClientRect();
  if (textRect.width <= 0 || textRect.height <= 0) return null;

  const clientLeft = triggerRect.left + trigger.clientLeft;
  const clientRight = clientLeft + trigger.clientWidth;
  const left = Math.max(textRect.left, clientLeft);
  const right = Math.min(textRect.right, clientRight);
  if (right <= left) return null;

  return { left, right };
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
    const textAnchor = state.anchor === 'text' ? getTextAnchorRect(trigger, r) : null;
    const anchorLeft = textAnchor?.left ?? r.left;
    const anchorRight = textAnchor?.right ?? r.left + r.width;
    let left = (anchorLeft + anchorRight) / 2 - tw / 2;
    left = Math.max(pad, Math.min(left, window.innerWidth - tw - pad));
    let top = r.top - th - gap; // prefer above
    if (top < pad) top = r.bottom + gap; // flip below
    // The below branch can itself run past the viewport (for example when a
    // trigger is near the bottom edge), so apply the same vertical clamp after
    // choosing the preferred side. `th` is read above after CSS wrapping has
    // determined the tooltip's actual height.
    top = Math.max(pad, Math.min(top, window.innerHeight - th - pad));
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
  });

  const className =
    state.variant === 'help' ? 'tokenpanel-tooltip tokenpanel-tooltip--help' : 'tokenpanel-tooltip';

  return (
    <div
      ref={elRef}
      role="tooltip"
      aria-hidden={state.visible ? 'false' : 'true'}
      data-show={state.visible ? 'true' : 'false'}
      className={className}
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

  const show = useCallback(
    (el: HTMLElement, text: string, variant?: TooltipVariant, anchor?: TooltipAnchor) => {
      currentTriggerRef.current = el;
      setTooltipState({ visible: true, text, triggerEl: el, variant, anchor });
    },
    [],
  );

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

  // Resize also invalidates the cached position, but unlike scroll it has no
  // native capture-phase event that always fires: panel.tsx's grip-drag
  // writes width/height straight onto `.tokenpanel-shell` without a Preact
  // re-render (perf choice — see handleResizeStart), and the debounced
  // window-resize handler there skips setSize/setPosition entirely when no
  // clamping is needed. So mirror the scroll-hide UX with two listeners,
  // both scoped to "a tooltip is currently visible": a ResizeObserver on the
  // trigger's panel shell (fires on the grip-drag's direct style mutation
  // regardless of why the shell resized) and a window 'resize' listener
  // (covers viewport-driven resizes). Do NOT observe document.body — the
  // panel is `position: fixed`, so resizing it never resizes the body, and a
  // body observer would silently never fire.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const trigger = tooltipState.triggerEl;
    if (!tooltipState.visible || !trigger) return;

    function onWindowResize() {
      hideAll();
    }
    window.addEventListener('resize', onWindowResize);

    let shellObserver: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      const shell = trigger.closest<HTMLElement>('.tokenpanel-shell');
      if (shell) {
        // ResizeObserver always delivers one "initial" callback right after
        // observe() — even when nothing has actually resized — because it
        // has no prior size to diff the newly-observed target against. Skip
        // that first delivery (it fires on every hover, not just a resize)
        // and only hideAll() on a genuine SUBSEQUENT delivery, which means
        // the shell's size changed after observation began.
        let primed = false;
        shellObserver = new ResizeObserver(() => {
          if (!primed) {
            primed = true;
            return;
          }
          hideAll();
        });
        shellObserver.observe(shell);
      }
    }

    return () => {
      window.removeEventListener('resize', onWindowResize);
      shellObserver?.disconnect();
    };
  }, [tooltipState.visible, tooltipState.triggerEl, hideAll]);

  return (
    <TooltipContext.Provider value={{ show, hide }}>
      {children}
      {/* Liveness + body probe, not just an SSR guard: a re-render scheduled
          from a late effect can land after a test environment tore down the
          document (zudolab/zudo-doc#3344) — portaling into a missing body
          would throw mid-render. */}
      {isDocumentUsable() &&
        !!document.body &&
        createPortal(<TooltipElement state={tooltipState} />, document.body)}
    </TooltipContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface UseTooltipOptions {
  /** Opt into a presentation variant — see `TooltipVariant` above. */
  variant?: TooltipVariant;
  /** Opt into horizontal centering over the trigger's displayed text area. */
  anchor?: TooltipAnchor;
}

/**
 * Returns event handler props to spread onto the tooltip trigger element.
 *
 * @param text - The full text to show in the tooltip.
 * @param opts - Optional presentation variant and horizontal anchor (see
 *               `UseTooltipOptions`).
 * @returns An object of `onMouseEnter`, `onMouseLeave`, `onFocusIn`, `onFocusOut`
 *          handlers to spread onto the trigger element, plus imperative
 *          `show`/`hide` escape hatches for callers that need to
 *          show/keep-open the tooltip outside of a raw hover/focus event
 *          (e.g. `controls/help-icon.tsx`'s click-to-pin behavior).
 */
export function useTooltip(
  text: string,
  opts?: UseTooltipOptions,
): {
  onMouseEnter: JSX.MouseEventHandler<HTMLElement>;
  onMouseLeave: JSX.MouseEventHandler<HTMLElement>;
  onFocusIn: JSX.FocusEventHandler<HTMLElement>;
  onFocusOut: JSX.FocusEventHandler<HTMLElement>;
  show: (el: HTMLElement) => void;
  hide: (el: HTMLElement) => void;
} {
  const ctx = useContext(TooltipContext);
  const variant = opts?.variant;
  const anchor = opts?.anchor;

  const onMouseEnter: JSX.MouseEventHandler<HTMLElement> = useCallback(
    (e) => {
      if (!ctx) return;
      ctx.show(e.currentTarget as HTMLElement, text, variant, anchor);
    },
    [ctx, text, variant, anchor],
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
      ctx.show(e.currentTarget as HTMLElement, text, variant, anchor);
    },
    [ctx, text, variant, anchor],
  );

  const onFocusOut: JSX.FocusEventHandler<HTMLElement> = useCallback(
    (e) => {
      if (!ctx) return;
      ctx.hide(e.currentTarget as HTMLElement);
    },
    [ctx, text],
  );

  const show = useCallback(
    (el: HTMLElement) => {
      if (!ctx) return;
      ctx.show(el, text, variant, anchor);
    },
    [ctx, text, variant, anchor],
  );

  const hide = useCallback(
    (el: HTMLElement) => {
      if (!ctx) return;
      ctx.hide(el);
    },
    [ctx],
  );

  return { onMouseEnter, onMouseLeave, onFocusIn, onFocusOut, show, hide };
}
