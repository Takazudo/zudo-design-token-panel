/** @jsxImportSource @takazudo/zfb/zudo-react */
/**
 * HighlightOrchestrator — integration layer for the highlight feature.
 *
 * Responsibilities:
 * 1. Lifts and persists HighlightState.
 * 2. Returns the highlight context signal the panel passes to its rows.
 * 3. Mounts an overlay portal at document.body (above the panel-closed gate).
 * 4. Observes document.head for stylesheet changes so newly injected CSS is
 *    picked up by re-resolving elements.
 * 5. Handles astro:after-swap — recreates the portal mount and re-attaches the
 *    MutationObserver when Astro replaces the body/head.
 *
 * `panel.tsx` calls `useHighlightController` during setup, outside its
 * open gate, so the overlay persists even when the panel is closed.
 */

import {
  batch,
  computed,
  getScope,
  signal,
  type Child,
  type ReadonlySignal,
} from '@takazudo/zfb/zudo-react';
import type { HighlightContextValue } from './highlight-context';
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
import type { HighlightOverlayItem } from './highlight-overlay';
import { HighlightOverlay } from './highlight-overlay';
import { getPanelConfig, type PanelConfig } from '../config/panel-config';
import { peekable } from '../zr/live';
import { useMountPortal } from '../zr/portal';
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
// Controller
// ---------------------------------------------------------------------------

/**
 * Lift and persist this instance's highlight state, observe stylesheet and
 * theme changes, and render the overlay rings into the body-level portal for
 * the calling component's lifetime. Returns the highlight service the panel's
 * rows read.
 */
export function useHighlightController(
  instanceConfigProp?: PanelConfig,
): ReadonlySignal<HighlightContextValue> {
  // Keep all probe-kind and cssVar resolution tied to this mounted instance.
  // Looking up the global active config here causes two panels to probe with
  // whichever manifest happened to be configured last.
  const instanceConfig = instanceConfigProp ?? getPanelConfig();
  const tokenIndex = buildTokenIndex(instanceConfig);
  const cssVarKindIndex = buildCssVarKindIndex(instanceConfig, tokenIndex);
  const state = signal<HighlightState>(loadHighlightState(instanceConfig));

  // Bumped to bust the match cache when stylesheets or the theme change.
  const stylesheetVersion = peekable(0);
  const themeVersion = peekable(0);

  // Per-cssVar match cache keyed by (cssVar, stylesheetVersion, themeVersion).
  const matchCache = new Map<CacheKey, CacheEntry>();
  const requestedMatchCounts = peekable<Record<string, number>>({});

  // -------------------------------------------------------------------------
  // State mutation helpers
  // -------------------------------------------------------------------------

  function update(change: (current: HighlightState) => HighlightState): void {
    const next = change(state.value);
    saveHighlightState(next, instanceConfig);
    state.value = next;
  }

  const toggle = (cssVar: string) => update((s) => toggleHighlight(s, cssVar));
  const setSlot = (index: number, partial: Partial<HighlightSlotSpec>) =>
    update((s) => setSlotHelper(s, index, partial));
  const setOutlineWidth = (width: number) => update((s) => setOutlineWidthHelper(s, width));
  const reset = () => update(resetSlots);
  const disableAll = () => update(clearAllActive);

  function invalidate(version: typeof stylesheetVersion): void {
    // Clear the cache so stale entries (holding detached Element refs) are not
    // returned on the next re-probe. Version-stamped keys make old entries
    // unreachable anyway, but clearing prevents the Map from growing
    // unboundedly in HMR / styled-components hosts that inject many <style>
    // nodes over time (F26). Previously requested counts are likewise stale,
    // but remain lazy: the next open/request repopulates them.
    matchCache.clear();
    batch(() => {
      version.value += 1;
      requestedMatchCounts.value = {};
    });
  }

  const scope = getScope();

  // -------------------------------------------------------------------------
  // Stylesheet MutationObserver — bumps stylesheetVersion when <style> or
  // <link rel="stylesheet"> nodes are added/removed from document.head.
  // Re-attaches on astro:after-swap if head is replaced.
  // -------------------------------------------------------------------------

  scope.onActivate(() => {
    let observer: MutationObserver | null = null;

    function attachObserver() {
      if (!isDocumentUsable() || !document.head) return;
      if (observer) observer.disconnect();
      observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          for (const node of [...mutation.addedNodes, ...mutation.removedNodes]) {
            if (isStylesheetNode(node)) {
              invalidate(stylesheetVersion);
              return;
            }
          }
        }
      });
      observer.observe(document.head, { childList: true });
    }

    attachObserver();

    function handleAfterSwap() {
      // Re-attach observer to the new head after Astro swaps the page. Astro
      // view transitions replace document.body, so every previously matched
      // Element reference is now detached (F26).
      attachObserver();
      invalidate(stylesheetVersion);
    }
    window.addEventListener('astro:after-swap', handleAfterSwap);

    return () => {
      observer?.disconnect();
      window.removeEventListener('astro:after-swap', handleAfterSwap);
    };
  });

  // -------------------------------------------------------------------------
  // documentElement attribute observer — bumps themeVersion when
  // <html data-theme="..."> or <html class="..."> changes (theme toggles).
  // -------------------------------------------------------------------------

  scope.onActivate(() => {
    if (!isDocumentUsable()) return;
    const observer = new MutationObserver(() => invalidate(themeVersion));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'class'],
    });
    return () => observer.disconnect();
  });

  // -------------------------------------------------------------------------
  // Resolve items + matchCounts. lookupOrProbe consults the per-cssVar cache
  // keyed by (cssVar, stylesheetVersion, themeVersion) so slot edits — which
  // change only state.slots — do not re-probe the DOM.
  // -------------------------------------------------------------------------

  function lookupOrProbe(cssVar: string, versions: readonly [number, number]): CacheEntry {
    const key: CacheKey = `${instanceConfig.storagePrefix}|${cssVar}|${versions[0]}|${versions[1]}`;
    const cached = matchCache.get(key);
    if (cached) {
      // F26: Evict the entry if any element has been detached from the DOM
      // since it was cached (e.g. SPA re-render without a version bump).
      // Re-probe so we don't pass disconnected Elements to HighlightOverlay,
      // which would draw a 0×0 ring at the viewport origin.
      if (cached.elements.every((el) => el.isConnected)) {
        return cached;
      }
      matchCache.delete(key);
    }

    const tierKind = cssVarKindIndex.get(cssVar);
    const kind = tierKindToProbeKind(tierKind);
    const kindOpt = kind ? { kind } : {};

    // F31 (option a): differential-eligible kinds skip the separate equality
    // pass — differential's A/B comparison already detects direct consumers,
    // halving the style-recalculation cost for the most common token kinds.
    // String-only kinds (text, cursor, content, mask-image) run a single
    // equality probe, since differential mode is not applicable to them.
    const result = isDifferentialEligible(tierKind)
      ? findElementsUsingToken(cssVar, { ...kindOpt, mode: 'differential' })
      : findElementsUsingToken(cssVar, kindOpt);

    const entry: CacheEntry = { elements: result.elements, warnings: result.warnings };
    matchCache.set(key, entry);
    return entry;
  }

  function logProbeWarnings(result: CacheEntry): void {
    for (const warning of result.warnings) {
      console.warn('[zudo-design-token-panel] highlight:', warning);
    }
  }

  const versions = (): readonly [number, number] => [stylesheetVersion.value, themeVersion.value];

  function requestMatchCount(address: TokenAddress): number | undefined {
    const entry = tokenIndex.entry(address);
    if (!entry) return undefined;
    const result = lookupOrProbe(entry.cssVar, [stylesheetVersion.peek(), themeVersion.peek()]);
    logProbeWarnings(result);
    const count = result.elements.length;
    const key = tokenAddressKey(address);
    const previous = requestedMatchCounts.peek();
    // Keep the historical cssVar lookup available to existing consumers while
    // also retaining an address key for same-cssVar tokens in one manifest.
    // The chain UI uses the address key; the highlight toggle continues to
    // read the cssVar key.
    if (previous[key] !== count || previous[entry.cssVar] !== count) {
      requestedMatchCounts.value = { ...previous, [key]: count, [entry.cssVar]: count };
    }
    return count;
  }

  let lastResolved: { state: HighlightState; versions: readonly [number, number]; value: Resolved } | null = null;
  const resolved = computed((): Resolved => {
    const current = state.value;
    const currentVersions = versions();
    if (
      lastResolved &&
      lastResolved.state === current &&
      lastResolved.versions[0] === currentVersions[0] &&
      lastResolved.versions[1] === currentVersions[1]
    ) {
      return lastResolved.value;
    }
    const items: HighlightOverlayItem[] = [];
    const counts: Record<string, number> = {};

    for (const [cssVar, slotIdx] of Object.entries(current.active)) {
      const result = lookupOrProbe(cssVar, currentVersions);
      logProbeWarnings(result);
      counts[cssVar] = result.elements.length;

      const slot = current.slots[slotIdx];
      if (!slot) continue;

      for (const element of result.elements) {
        // Stamp the global outlineWidth onto each overlay item so
        // HighlightOverlay receives a complete HighlightSlotSpec.
        items.push({ element, slot: { color: slot.color, outlineWidth: current.outlineWidth } });
      }
    }

    const value = { items, matchCounts: counts };
    lastResolved = { state: current, versions: currentVersions, value };
    return value;
  });

  const items = computed(() => resolved.value.items);

  useMountPortal(HIGHLIGHT_PORTAL_MOUNT_ID, () => <HighlightOverlay items={items} />);

  return computed<HighlightContextValue>(() => ({
    state: state.value,
    toggle,
    setSlot,
    setOutlineWidth,
    reset,
    disableAll,
    matchCounts: { ...requestedMatchCounts.value, ...resolved.value.matchCounts },
    requestMatchCount,
  }));
}

interface Resolved {
  items: HighlightOverlayItem[];
  matchCounts: Record<string, number>;
}

export interface HighlightOrchestratorProps {
  /** Config for the mounted panel instance; omitted for the default path. */
  instanceConfig?: PanelConfig;
  children?: (highlight: ReadonlySignal<HighlightContextValue>) => Child;
}

/** Component form of `useHighlightController`, for isolated use. */
export function HighlightOrchestrator(props: HighlightOrchestratorProps) {
  const highlight = useHighlightController(props.instanceConfig);
  return props.children ? props.children(highlight) : null;
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
