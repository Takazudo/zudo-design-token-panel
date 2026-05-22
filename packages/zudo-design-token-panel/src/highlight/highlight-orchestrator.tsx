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
  clearAllActive,
  type HighlightState,
  type HighlightSlotSpec,
} from './highlight-state';
import { findElementsUsingToken } from './find-elements';
import type { FindElementsResult } from './find-elements';
import { HighlightOverlay, type HighlightOverlayItem } from './highlight-overlay';
import { getPanelConfig } from '../config/panel-config';
import type { TierValueKind } from '../tokens/tier-model';

// ---------------------------------------------------------------------------
// Kind helpers
// ---------------------------------------------------------------------------

type ProbeKind = 'color' | 'length' | 'number' | 'text' | 'easing';

function tierKindToProbeKind(t: TierValueKind | undefined): ProbeKind | undefined {
  if (!t) return undefined;
  switch (t.kind) {
    case 'color': return 'color';
    case 'length': return 'length';
    case 'number': return 'number';
    // 'text' is a string-valued catch-all in this repo (ref-tier identifiers,
    // easing functions, font families, animation names, etc.). Fall back to
    // auto-detect so the resolved value picks the right probe ('easing' for
    // cubic-bezier/keywords, 'text' for arbitrary idents).
    case 'text': return undefined;
    case 'select': return undefined; // select can hold any type — fall back to auto-detect
  }
}

/** Build a cssVar → TierValueKind map from the current panel config's tier items. */
function buildCssVarKindIndex(): Map<string, TierValueKind> {
  const out = new Map<string, TierValueKind>();
  for (const tab of getPanelConfig().tabs) {
    for (const tier of tab.tiers) {
      for (const item of tier.items) {
        out.set(item.cssVar, item.type);
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Match cache
// ---------------------------------------------------------------------------

type CacheKey = string; // `${cssVar}|${stylesheetVersion}|${themeVersion}`
type CacheEntry = FindElementsResult & { usedDifferential: boolean };

// ---------------------------------------------------------------------------
// Portal mount helpers
// ---------------------------------------------------------------------------

/** ID also referenced in find-elements.ts PANEL_EXCLUSION_SELECTOR. Must match exactly. */
const PORTAL_MOUNT_ID = 'tokenpanel-highlight-mount';

/**
 * Get or create the singleton portal mount <div> at document.body.
 * Idempotent: if an element with the id already exists it is returned as-is.
 * SSR-safe: returns null when document is unavailable (server-render / prerender).
 */
function getOrCreateMountNode(): HTMLDivElement | null {
  if (typeof document === 'undefined') return null;
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
  const mountNodeRef = useRef<HTMLDivElement | null>(null);
  const [mountVersion, setMountVersion] = useState(0);

  useEffect(() => {
    if (!mountNodeRef.current || !mountNodeRef.current.isConnected) {
      mountNodeRef.current = getOrCreateMountNode();
      setMountVersion((v) => v + 1);
    }
    function handleAfterSwap() {
      if (!mountNodeRef.current || !mountNodeRef.current.isConnected) {
        mountNodeRef.current = getOrCreateMountNode();
        setMountVersion((v) => v + 1);
      }
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('astro:after-swap', handleAfterSwap);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('astro:after-swap', handleAfterSwap);
      }
    };
  }, []);

  void mountVersion;

  if (!mountNodeRef.current) return null;
  return createPortal(<HighlightOverlay items={items} />, mountNodeRef.current);
}

// ---------------------------------------------------------------------------
// HighlightOrchestrator
// ---------------------------------------------------------------------------

export function HighlightOrchestrator({ children }: { children: ComponentChildren }) {
  const [state, setState] = useState<HighlightState>(loadHighlightState);

  // Track stylesheet version for cache-busting when new sheets are injected.
  const [stylesheetVersion, setStylesheetVersion] = useState(0);

  // Track theme version for cache-busting when <html data-theme> or class changes.
  const [themeVersion, setThemeVersion] = useState(0);

  // Per-cssVar match cache keyed by (cssVar, stylesheetVersion, themeVersion).
  const matchCacheRef = useRef<Map<CacheKey, CacheEntry>>(new Map());

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

  const disableAll = useCallback(() => {
    setState((s) => {
      const next = clearAllActive(s);
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
      // Bump version to invalidate the per-cssVar element cache — Astro view
      // transitions replace document.body, so every previously matched Element
      // reference is now detached.
      setStylesheetVersion((v) => v + 1);
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('astro:after-swap', handleAfterSwap);
    }

    return () => {
      observer?.disconnect();
      if (typeof window !== 'undefined') {
        window.removeEventListener('astro:after-swap', handleAfterSwap);
      }
    };
  }, []);

  // -------------------------------------------------------------------------
  // documentElement attribute observer — bumps themeVersion when
  // <html data-theme="..."> or <html class="..."> changes (theme toggles).
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (typeof window === 'undefined') return; // SSR safety
    const observer = new MutationObserver(() => {
      setThemeVersion((v) => v + 1);
      matchCacheRef.current.clear();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'class'],
    });
    return () => observer.disconnect();
  }, []);

  // -------------------------------------------------------------------------
  // Resolve items + matchCounts via useMemo.
  // Inner lookupOrProbe consults the per-cssVar cache keyed by
  // (cssVar, stylesheetVersion, themeVersion) so slot edits — which change
  // only state.slots — do not re-probe the DOM.
  // -------------------------------------------------------------------------

  const { items, matchCounts } = useMemo(() => {
    const cssVarKindIndex = buildCssVarKindIndex();

    function lookupOrProbe(cssVar: string): CacheEntry {
      const key: CacheKey = `${cssVar}|${stylesheetVersion}|${themeVersion}`;
      const cached = matchCacheRef.current.get(key);
      if (cached) return cached;

      const kind = tierKindToProbeKind(cssVarKindIndex.get(cssVar));
      const kindOpt = kind ? { kind } : {};
      let result = findElementsUsingToken(cssVar, kindOpt);
      let usedDifferential = false;
      if (result.elements.length === 0) {
        result = findElementsUsingToken(cssVar, { ...kindOpt, mode: 'differential' });
        usedDifferential = true;
      }
      const entry: CacheEntry = { ...result, usedDifferential };
      matchCacheRef.current.set(key, entry);
      return entry;
    }

    const resolvedItems: HighlightOverlayItem[] = [];
    const counts: Record<string, number> = {};

    for (const [cssVar, slotIdx] of Object.entries(state.active)) {
      const result = lookupOrProbe(cssVar);

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
  }, [state.active, state.slots, stylesheetVersion, themeVersion]);

  // -------------------------------------------------------------------------
  // Context value
  // -------------------------------------------------------------------------

  const ctxValue = useMemo<HighlightContextValue>(
    () => ({ state, toggle, setSlot, reset, disableAll, matchCounts }),
    [state, toggle, setSlot, reset, disableAll, matchCounts],
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
