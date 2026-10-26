/**
 * Tooltip controller — single shared DOM tooltip for truncated token names.
 *
 * Architecture: a framework-free `TooltipController` (tooltip-controller.ts)
 * owns the single `.tokenpanel-tooltip` element on `document.body`. Preact
 * trees reach it through `TooltipProvider` + `useTooltip`; zudo-react
 * components receive the controller explicitly (`tooltip.ts`).
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
import { useCallback, useContext, useLayoutEffect, useState } from 'preact/hooks';
import type { ComponentChildren, JSX } from 'preact';
import { isDocumentUsable } from '../utils/document-liveness';
import {
  createTooltipController,
  type TooltipController,
  type TooltipOptions,
} from './tooltip-controller';

export type { TooltipAnchor, TooltipController, TooltipVariant } from './tooltip-controller';

const TooltipContext = createContext<TooltipController | null>(null);

interface TooltipProviderProps {
  children: ComponentChildren;
}

/**
 * TooltipProvider — owns this tree's tooltip controller and attaches its
 * shared element to `document.body` while mounted.
 */
export function TooltipProvider({ children }: TooltipProviderProps) {
  // Liveness + body probe, not just an SSR guard: a render scheduled from a
  // late effect can land after a test environment tore down the document
  // (zudolab/zudo-doc#3344).
  const [controller] = useState(() =>
    isDocumentUsable() && document.body ? createTooltipController(document) : null,
  );
  useLayoutEffect(() => controller?.connect(), [controller]);
  return <TooltipContext.Provider value={controller}>{children}</TooltipContext.Provider>;
}

/** The tree's tooltip controller, for handing to zudo-react components. */
export function useTooltipController(): TooltipController | null {
  return useContext(TooltipContext);
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export type UseTooltipOptions = TooltipOptions;

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
      ctx.show(e.currentTarget as HTMLElement, text, { variant, anchor });
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
      ctx.show(e.currentTarget as HTMLElement, text, { variant, anchor });
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
      ctx.show(el, text, { variant, anchor });
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
