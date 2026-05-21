/**
 * HighlightOrchestrator — integration layer for the highlight feature.
 *
 * Responsibilities:
 * 1. Lifts and persists HighlightState.
 * 2. Provides HighlightContext to all descendants.
 * 3. Mounts an overlay portal at document.body (above the panel-closed gate).
 * 4. Observes document.head for stylesheet changes so newly injected CSS is
 *    picked up by re-resolving elements.
 * 5. Handles astro:after-swap — recreates the portal mount and re-attaches the
 *    MutationObserver when Astro replaces the body/head.
 *
 * Self-contained — panel.tsx wraps its existing JSX in this component so the
 * overlay persists even when the panel is closed.
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { createPortal } from 'preact/compat';
import {
  HighlightContext,
  type HighlightContextValue,
} from './highlight-toggle-button';
import {
  loadHighlightState,
  saveHighlightState,
  toggleHighlight,
  setSlot as setSlotHelper,
  resetSlots,
  type HighlightState,
  type HighlightSlotSpec,
} from './highlight-state';
import { findElementsUsingToken } from './find-elements';
import { HighlightOverlay, type HighlightOverlayItem } from './highlight-overlay';

// ---------------------------------------------------------------------------
// Portal mount helpers
// ---------------------------------------------------------------------------

/** ID also referenced in find-elements.ts PANEL_EXCLUSION_SELECTOR. Must match exactly. */
const PORTAL_MOUNT_ID = 'tokenpanel-highlight-mount';

/**
 * Get or create the singleton portal mount <div> at document.body.
 * Idempotent: if an element with the id already exists it is returned as-is.
 */
function getOrCreateMountNode(): HTMLDivElement {
  const existing = document.getElementById(PORTAL_MOUNT_ID) as HTMLDivElement | null;
  if (existing) return existing;

  const node = document.createElement('div');
  node.id = PORTAL_MOUNT_ID;
  document.body.appendChild(node);
  return node;
}

// ---------------------------------------------------------------------------
// OverlayPortal
// ---------------------------------------------------------------------------

interface OverlayPortalProps {
  items: ReadonlyArray<HighlightOverlayItem>;
}

function OverlayPortal({ items }: OverlayPortalProps) {
  // mountNodeRef persists the DOM node so we can check isConnected.
  const mountNodeRef = useRef<HTMLDivElement | null>(null);
  // Bump to force re-render when mountNode needs to be recreated.
  const [mountVersion, setMountVersion] = useState(0);

  // Create or retrieve the portal mount on first render.
  if (mountNodeRef.current === null || !mountNodeRef.current.isConnected) {
    mountNodeRef.current = getOrCreateMountNode();
  }

  // astro:after-swap — Astro replaces document.body on view transitions.
  // After swap the mount node may be detached; recreate if needed.
  useEffect(() => {
    function handleAfterSwap() {
      if (!mountNodeRef.current || !mountNodeRef.current.isConnected) {
        mountNodeRef.current = getOrCreateMountNode();
        setMountVersion((v) => v + 1);
      }
    }
    window.addEventListener('astro:after-swap', handleAfterSwap);
    return () => {
      window.removeEventListener('astro:after-swap', handleAfterSwap);
    };
  }, []);

  // Suppress the linting rule that complains about mountVersion not being used —
  // it IS used: it's a dependency that forces this component to re-evaluate the
  // portal target when the mountNode is recreated.
  void mountVersion;

  return createPortal(<HighlightOverlay items={items} />, mountNodeRef.current);
}

// ---------------------------------------------------------------------------
// HighlightOrchestrator
// ---------------------------------------------------------------------------

export function HighlightOrchestrator({ children }: { children: ComponentChildren }) {
  const [state, setState] = useState<HighlightState>(loadHighlightState);

  // Track stylesheet version for cache-busting when new sheets are injected.
  const [stylesheetVersion, setStylesheetVersion] = useState(0);

  // -------------------------------------------------------------------------
  // State mutation helpers
  // -------------------------------------------------------------------------

  const toggle = useCallback((cssVar: string) => {
    setState((s) => {
      const next = toggleHighlight(s, cssVar);
      saveHighlightState(next);
      return next;
    });
  }, []);

  const setSlot = useCallback((index: number, partial: Partial<HighlightSlotSpec>) => {
    setState((s) => {
      const next = setSlotHelper(s, index, partial);
      saveHighlightState(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setState((s) => {
      const next = resetSlots(s);
      saveHighlightState(next);
      return next;
    });
  }, []);

  // -------------------------------------------------------------------------
  // Stylesheet MutationObserver — bumps stylesheetVersion when <style> or
  // <link rel="stylesheet"> nodes are added/removed from document.head.
  // Re-attaches on astro:after-swap if head is replaced.
  // -------------------------------------------------------------------------

  useEffect(() => {
    let observer: MutationObserver | null = null;

    function attachObserver() {
      if (observer) observer.disconnect();
      observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) {
            if (isStylesheetNode(node)) {
              setStylesheetVersion((v) => v + 1);
              return;
            }
          }
          for (const node of mutation.removedNodes) {
            if (isStylesheetNode(node)) {
              setStylesheetVersion((v) => v + 1);
              return;
            }
          }
        }
      });
      observer.observe(document.head, { childList: true });
    }

    attachObserver();

    function handleAfterSwap() {
      // Re-attach observer to the new head after Astro swaps the page.
      attachObserver();
    }
    window.addEventListener('astro:after-swap', handleAfterSwap);

    return () => {
      observer?.disconnect();
      window.removeEventListener('astro:after-swap', handleAfterSwap);
    };
  }, []);

  // -------------------------------------------------------------------------
  // Resolve items + matchCounts via useMemo
  // Recomputes whenever active tokens, slot specs, or stylesheets change.
  // -------------------------------------------------------------------------

  const { items, matchCounts } = useMemo(() => {
    // stylesheetVersion is captured to invalidate cache on new sheets.
    void stylesheetVersion;

    const resolvedItems: HighlightOverlayItem[] = [];
    const counts: Record<string, number> = {};

    for (const [cssVar, slotIdx] of Object.entries(state.active)) {
      const result = findElementsUsingToken(cssVar);

      if (result.warnings.length > 0) {
        for (const warning of result.warnings) {
          console.warn('[zudo-design-token-panel] highlight:', warning);
        }
      }

      const elements = result.elements;
      counts[cssVar] = elements.length;

      const slot = state.slots[slotIdx];
      if (!slot) continue;

      for (const element of elements) {
        resolvedItems.push({ element, slot });
      }
    }

    return { items: resolvedItems, matchCounts: counts };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.active, state.slots, stylesheetVersion]);

  // -------------------------------------------------------------------------
  // Context value
  // -------------------------------------------------------------------------

  const ctxValue = useMemo<HighlightContextValue>(
    () => ({ state, toggle, setSlot, reset, matchCounts }),
    [state, toggle, setSlot, reset, matchCounts],
  );

  return (
    <>
      <HighlightContext.Provider value={ctxValue}>{children}</HighlightContext.Provider>
      <OverlayPortal items={items} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isStylesheetNode(node: Node): boolean {
  if (node.nodeType !== Node.ELEMENT_NODE) return false;
  const el = node as Element;
  if (el.tagName === 'STYLE') return true;
  if (el.tagName === 'LINK' && el.getAttribute('rel') === 'stylesheet') return true;
  return false;
}
