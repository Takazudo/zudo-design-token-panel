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
  setOutlineWidth as setOutlineWidthHelper,
  resetSlots,
  clearAllActive,
  type HighlightState,
  type HighlightSlotSpec,
} from './highlight-state';
import { findElementsUsingToken, HIGHLIGHT_PORTAL_MOUNT_ID } from './find-elements';
import type { FindElementsResult } from './find-elements';
import { HighlightOverlay, type HighlightOverlayItem } from './highlight-overlay';
import { getPanelConfig, type PanelConfig } from '../config/panel-config';
import { usePortalMount } from '../utils/use-portal-mount';
import { isDocumentUsable } from '../utils/document-liveness';
import type { TierValueKind } from '../tokens/tier-model';
import { buildTokenIndex, tokenAddressKey, type TokenAddress, type TokenIndex } from '../utils/token-index';

// ---------------------------------------------------------------------------
// Kind helpers
// ---------------------------------------------------------------------------

type ProbeKind = 'color' | 'length' | 'number' | 'text' | 'easing' | 'cursor' | 'content' | 'mask-image';

export function tierKindToProbeKind(t: TierValueKind | undefined): ProbeKind | undefined {
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
    // cursor/content/mask-image: pass the explicit hint through so find-elements
    // uses the matching probe config in TOKEN_TYPES. Auto-detect cannot route
    // url()-valued tokens to 'cursor' or 'mask-image' (it falls back to 'text'
    // with a warning), so honoring the manifest hint is required for consumers
    // of those properties to be found.
    case 'cursor': return 'cursor';
    case 'content': return 'content';
    case 'mask-image': return 'mask-image';
  }
}

/** Build a cssVar → TierValueKind map from one mounted panel instance. */
function buildCssVarKindIndex(cfg: PanelConfig, index: TokenIndex): Map<string, TierValueKind> {
  const out = new Map<string, TierValueKind>();
  for (const entry of index.entries) {
    const item = cfg.tabs
      .find((tab) => tab.id === entry.address.tabId)
      ?.tiers.find((tier) => tier.id === entry.address.tierId)
      ?.items.find((candidate) => candidate.id === entry.address.itemId);
    if (item) out.set(entry.cssVar, item.type);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Match cache
// ---------------------------------------------------------------------------

type CacheKey = string; // `${storagePrefix}|${cssVar}|${stylesheetVersion}|${themeVersion}`
type CacheEntry = FindElementsResult;

// ---------------------------------------------------------------------------
// Differential-probe eligibility
// ---------------------------------------------------------------------------

/**
 * TierValueKind.kind values for which differential mode is NOT applicable.
 * These kinds use string-only CSS values (custom-idents, easing functions, etc.)
 * where transforms like calc()/min()/max()/clamp()/color-mix() are not
 * grammatically applicable. Running differential for these kinds wastes 4-6×
 * the probe cost with no benefit.
 *
 * When the kind is undefined (auto-detect path: 'select' tiers, cssVars not
 * in the tier index), differential is run because the resolved kind could be
 * color/length/number where transform consumers would otherwise be missed.
 */
const STRING_ONLY_TIER_KINDS = new Set<string>(['text', 'cursor', 'content', 'mask-image']);

function isDifferentialEligible(tierKind: TierValueKind | undefined): boolean {
  if (!tierKind) return true; // unknown — run differential to be safe
  return !STRING_ONLY_TIER_KINDS.has(tierKind.kind);
}

// ---------------------------------------------------------------------------
// Portal mount
// ---------------------------------------------------------------------------

interface OverlayPortalProps {
  items: ReadonlyArray<HighlightOverlayItem>;
}

function OverlayPortal({ items }: OverlayPortalProps) {
  const mountNode = usePortalMount(HIGHLIGHT_PORTAL_MOUNT_ID);
  if (!mountNode) return null;
  return createPortal(<HighlightOverlay items={items} />, mountNode);
}

// ---------------------------------------------------------------------------
// HighlightOrchestrator
// ---------------------------------------------------------------------------

export interface HighlightOrchestratorProps {
  children?: ComponentChildren;
  /** Config for the mounted panel instance; omitted for the default path. */
  instanceConfig?: PanelConfig;
}

export function HighlightOrchestrator({
  children,
  instanceConfig: instanceConfigProp,
}: HighlightOrchestratorProps) {
  // Keep all probe-kind and cssVar resolution tied to this mounted instance.
  // Looking up the global active config here causes two panels to probe with
  // whichever manifest happened to be configured last.
  const instanceConfig = instanceConfigProp ?? getPanelConfig();
  const tokenIndex = useMemo(() => buildTokenIndex(instanceConfig), [instanceConfig]);
  const cssVarKindIndex = useMemo(
    () => buildCssVarKindIndex(instanceConfig, tokenIndex),
    [instanceConfig, tokenIndex],
  );
  const [state, setState] = useState<HighlightState>(() => loadHighlightState(instanceConfig));

  // Track stylesheet version for cache-busting when new sheets are injected.
  const [stylesheetVersion, setStylesheetVersion] = useState(0);

  // Track theme version for cache-busting when <html data-theme> or class changes.
  const [themeVersion, setThemeVersion] = useState(0);

  // Per-cssVar match cache keyed by (cssVar, stylesheetVersion, themeVersion).
  const matchCacheRef = useRef<Map<CacheKey, CacheEntry>>(new Map());
  const [requestedMatchCounts, setRequestedMatchCounts] = useState<Record<string, number>>({});

  // A mounted orchestrator can be reused with another instance config by a
  // host during a view transition. Drop both DOM results and address counts
  // when that instance identity changes; otherwise a same-cssVar token could
  // inherit the previous instance's probe result.
  useEffect(() => {
    matchCacheRef.current.clear();
    setRequestedMatchCounts({});
  }, [instanceConfig.storagePrefix]);

  // -------------------------------------------------------------------------
  // State mutation helpers
  // -------------------------------------------------------------------------

  const toggle = useCallback((cssVar: string) => {
    setState((s) => {
      const next = toggleHighlight(s, cssVar);
      saveHighlightState(next, instanceConfig);
      return next;
    });
  }, [instanceConfig]);

  const setSlot = useCallback((index: number, partial: Partial<HighlightSlotSpec>) => {
    setState((s) => {
      const next = setSlotHelper(s, index, partial);
      saveHighlightState(next, instanceConfig);
      return next;
    });
  }, [instanceConfig]);

  const setOutlineWidth = useCallback((width: number) => {
    setState((s) => {
      const next = setOutlineWidthHelper(s, width);
      saveHighlightState(next, instanceConfig);
      return next;
    });
  }, [instanceConfig]);

  const reset = useCallback(() => {
    setState((s) => {
      const next = resetSlots(s);
      saveHighlightState(next, instanceConfig);
      return next;
    });
  }, [instanceConfig]);

  const disableAll = useCallback(() => {
    setState((s) => {
      const next = clearAllActive(s);
      saveHighlightState(next, instanceConfig);
      return next;
    });
  }, [instanceConfig]);

  // -------------------------------------------------------------------------
  // Stylesheet MutationObserver — bumps stylesheetVersion when <style> or
  // <link rel="stylesheet"> nodes are added/removed from document.head.
  // Re-attaches on astro:after-swap if head is replaced.
  // -------------------------------------------------------------------------

  useEffect(() => {
    let observer: MutationObserver | null = null;

    function attachObserver() {
      // Preact flushes effects on rAF/setTimeout, so this can run after a
      // test environment tore down the document (zudolab/zudo-doc#3344) —
      // bail instead of observing a corpse's missing head.
      if (!isDocumentUsable() || !document.head) return;
      if (observer) observer.disconnect();
      observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) {
            if (isStylesheetNode(node)) {
              // Clear the cache so stale entries (holding detached Element refs)
              // are not returned on the next re-probe. Version-stamped keys make
              // old entries unreachable anyway, but clearing prevents the Map from
              // growing unboundedly in HMR / styled-components hosts that inject
              // many <style> nodes over time (F26).
              matchCacheRef.current.clear();
              setStylesheetVersion((v) => v + 1);
              return;
            }
          }
          for (const node of mutation.removedNodes) {
            if (isStylesheetNode(node)) {
              matchCacheRef.current.clear();
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
      // Astro view transitions replace document.body, so every previously matched
      // Element reference is now detached. Clear the cache to release those
      // references and avoid drawing stale overlays (F26).
      matchCacheRef.current.clear();
      // Bump version to cause a cache miss on the next re-probe.
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
    // Liveness probe (zudolab/zudo-doc#3344): this effect can flush after a
    // test environment tore down the document, whose stand-in carries a
    // non-Node documentElement — observe() would throw.
    if (!isDocumentUsable()) return;
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

  const lookupOrProbe = useCallback((cssVar: string): CacheEntry => {
    const key: CacheKey = `${instanceConfig.storagePrefix}|${cssVar}|${stylesheetVersion}|${themeVersion}`;
    const cached = matchCacheRef.current.get(key);
    if (cached) {
      // F26: Evict the entry if any element has been detached from the DOM
      // since it was cached (e.g. SPA re-render without a version bump).
      // Re-probe so we don't pass disconnected Elements to HighlightOverlay,
      // which would draw a 0×0 ring at the viewport origin.
      if (cached.elements.every((el) => el.isConnected)) {
        return cached;
      }
      matchCacheRef.current.delete(key);
    }

    const tierKind = cssVarKindIndex.get(cssVar);
    const kind = tierKindToProbeKind(tierKind);
    const kindOpt = kind ? { kind } : {};

    let elements: Element[];
    let warnings: string[];

    if (isDifferentialEligible(tierKind)) {
      // F31 (option a): Skip the separate equality pass for differential-eligible
      // kinds. Differential's A/B comparison already detects direct consumers —
      // any element whose computed longhand equals sentinelA in phase A will
      // produce a different value in phase B (where sentinelB ≠ sentinelA).
      // This reduces the DOM walk from 3 (equality + differential A + B) to 2
      // (differential A + B), halving the style-recalculation cost for the most
      // common token kinds (color, length, number, auto-detect).
      const diffResult = findElementsUsingToken(cssVar, { ...kindOpt, mode: 'differential' });
      elements = diffResult.elements;
      warnings = diffResult.warnings;
    } else {
      // String-only kinds (text, cursor, content, mask-image): differential mode
      // is not applicable. Run a single equality probe.
      const eqResult = findElementsUsingToken(cssVar, kindOpt);
      elements = eqResult.elements;
      warnings = eqResult.warnings;
    }

    const entry: CacheEntry = { elements, warnings };
    matchCacheRef.current.set(key, entry);
    return entry;
  }, [cssVarKindIndex, instanceConfig.storagePrefix, stylesheetVersion, themeVersion]);

  const logProbeWarnings = useCallback((result: CacheEntry) => {
    if (result.warnings.length === 0) return;
    for (const warning of result.warnings) {
      console.warn('[zudo-design-token-panel] highlight:', warning);
    }
  }, []);

  const requestMatchCount = useCallback((address: TokenAddress): number | undefined => {
    const entry = tokenIndex.entry(address);
    if (!entry) return undefined;
    const result = lookupOrProbe(entry.cssVar);
    logProbeWarnings(result);
    const count = result.elements.length;
    const key = tokenAddressKey(address);
    setRequestedMatchCounts((previous) => {
      // Keep the historical cssVar lookup available to existing consumers
      // while also retaining an address key for same-cssVar tokens in one
      // manifest. The chain UI uses the address key; the highlight toggle
      // continues to read the cssVar key.
      if (previous[key] === count && previous[entry.cssVar] === count) return previous;
      return { ...previous, [key]: count, [entry.cssVar]: count };
    });
    return count;
  }, [logProbeWarnings, lookupOrProbe, tokenIndex]);

  const { items, matchCounts: activeMatchCounts } = useMemo(() => {

    const resolvedItems: HighlightOverlayItem[] = [];
    const counts: Record<string, number> = {};

    for (const [cssVar, slotIdx] of Object.entries(state.active)) {
      const result = lookupOrProbe(cssVar);
      logProbeWarnings(result);

      const elements = result.elements;
      counts[cssVar] = elements.length;

      const slot = state.slots[slotIdx];
      if (!slot) continue;

      for (const element of elements) {
        // Stamp the global outlineWidth onto each overlay item so HighlightOverlay
        // receives a complete HighlightSlotSpec (color + outlineWidth) without
        // needing to know about the global-width concept itself.
        resolvedItems.push({ element, slot: { color: slot.color, outlineWidth: state.outlineWidth } });
      }
    }

    return { items: resolvedItems, matchCounts: counts };
  }, [logProbeWarnings, lookupOrProbe, state.active, state.outlineWidth, state.slots]);

  // A stylesheet/theme change invalidates the DOM cache. Previously requested
  // counts are likewise stale, but remain lazy: the next open/request probes
  // the new cache entry and repopulates them.
  useEffect(() => {
    setRequestedMatchCounts({});
  }, [stylesheetVersion, themeVersion]);

  const matchCounts = useMemo(
    () => ({ ...requestedMatchCounts, ...activeMatchCounts }),
    [activeMatchCounts, requestedMatchCounts],
  );

  // -------------------------------------------------------------------------
  // Context value
  // -------------------------------------------------------------------------

  const ctxValue = useMemo<HighlightContextValue>(
    () => ({
      state,
      toggle,
      setSlot,
      setOutlineWidth,
      reset,
      disableAll,
      matchCounts,
      requestMatchCount,
    }),
    [state, toggle, setSlot, setOutlineWidth, reset, disableAll, matchCounts, requestMatchCount],
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
