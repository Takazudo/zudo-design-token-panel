/** Canonical UI-facing changed-token evaluation and revert helpers. */

import type { PanelConfig } from '../config/panel-config';
import { resolveColorClusterFromTab, resolvePaletteCssVar } from '../config/cluster-config';
import type { ColorTweakState, SemanticValue, TweakState } from '../state/tweak-state';
import {
  isIndexMapping,
  isLiteralMapping,
  isPerModeLiteral,
  isRefMapping,
  safeIndex,
} from '../state/tweak-state';
import { emitTierItemCssValue, resolveRefToCssVar, resolveTierItemValue } from '../apply/tier-resolver';
import { structuralEqual } from './structural-equal';
import { paletteSlotIndex, type TokenAddress, type TokenIndexEntry } from './token-index';

export type ColorBaseline =
  | ColorTweakState
  | { color: ColorTweakState; secondary?: ColorTweakState }
  | undefined;

export type TweakStateUpdater = (state: TweakState) => TweakState;

function colorSlice(state: TweakState, tabId: string): ColorTweakState | undefined {
  return tabId === 'color' ? state.color : tabId === 'color-secondary' ? state.secondary : undefined;
}

function baselineSlice(baseline: ColorBaseline, tabId: string): ColorTweakState | undefined {
  if (!baseline) return undefined;
  if ('color' in baseline) {
    return tabId === 'color' ? baseline.color : tabId === 'color-secondary' ? baseline.secondary : undefined;
  }
  return tabId === 'color' ? baseline : undefined;
}

function paletteIndex(entry: TokenIndexEntry, cfg?: PanelConfig): number {
  const indexed = paletteSlotIndex(entry);
  if (indexed !== undefined) return indexed;
  if (!cfg) return -1;
  const tier = cfg.tabs
    .find((tab) => tab.id === entry.address.tabId)
    ?.tiers.find((candidate) => candidate.id === entry.address.tierId);
  return tier?.items.findIndex((item) => item.id === entry.address.itemId) ?? -1;
}

function flatOverrides(state: TweakState, tabId: string): Record<string, string> | undefined {
  if (tabId === 'spacing') return state.spacing;
  if (tabId === 'font') return state.typography;
  if (tabId === 'size') return state.size;
  return undefined;
}

export function currentTokenValue(
  entry: TokenIndexEntry,
  state: TweakState,
  cfg?: PanelConfig,
): string | SemanticValue | undefined {
  if (entry.source === 'palette-slot') {
    const index = paletteIndex(entry, cfg);
    return index >= 0 ? colorSlice(state, entry.address.tabId)?.palette[index] : undefined;
  }
  if (entry.source === 'semantic') {
    return colorSlice(state, entry.address.tabId)?.semanticMappings[entry.address.itemId] ?? entry.default;
  }
  const flat = flatOverrides(state, entry.address.tabId);
  if (flat) return flat[entry.address.itemId] ?? entry.default;
  return state.tabs?.[entry.address.tabId]?.[entry.address.tierId]?.[entry.address.itemId] ?? entry.default;
}

export function isChanged(
  entry: TokenIndexEntry,
  state: TweakState,
  baseline: ColorBaseline,
  cfg?: PanelConfig,
): boolean {
  if (entry.source === 'palette-slot') {
    const index = paletteIndex(entry, cfg);
    const current = index >= 0 ? colorSlice(state, entry.address.tabId)?.palette[index] : undefined;
    const original = index >= 0 ? baselineSlice(baseline, entry.address.tabId)?.palette[index] : undefined;
    return original === undefined ? current !== undefined && !structuralEqual(current, entry.default) : !structuralEqual(current, original);
  }
  if (entry.source === 'semantic') {
    const current = colorSlice(state, entry.address.tabId)?.semanticMappings[entry.address.itemId] ?? entry.default;
    const original = baselineSlice(baseline, entry.address.tabId)?.semanticMappings[entry.address.itemId] ?? entry.default;
    return !structuralEqual(current, original);
  }
  return !structuralEqual(currentTokenValue(entry, state, cfg), entry.default);
}

export function changedEntries(
  entries: readonly TokenIndexEntry[],
  state: TweakState,
  baseline: ColorBaseline,
  cfg?: PanelConfig,
): TokenIndexEntry[] {
  return entries.filter((entry) => isChanged(entry, state, baseline, cfg));
}

export function changedCounts(
  entries: readonly TokenIndexEntry[],
  state: TweakState,
  baseline: ColorBaseline,
  cfg?: PanelConfig,
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const entry of entries) {
    if (isChanged(entry, state, baseline, cfg)) {
      counts[entry.address.tabId] = (counts[entry.address.tabId] ?? 0) + 1;
    }
  }
  return counts;
}

function semanticCssValue(
  mapping: SemanticValue,
  color: ColorTweakState,
  entry: TokenIndexEntry,
  cfg: PanelConfig,
): string | undefined {
  if (isPerModeLiteral(mapping)) {
    return `light-dark(${mapping.literal.light}, ${mapping.literal.dark})`;
  }
  if (isLiteralMapping(mapping)) return mapping.literal as string;
  if (isRefMapping(mapping)) {
    const tab = cfg.tabs.find((candidate) => candidate.id === entry.address.tabId);
    if (!tab) return undefined;
    try {
      return `var(${resolveRefToCssVar(mapping.ref, tab, cfg.tabs)})`;
    } catch {
      return undefined;
    }
  }
  if (isIndexMapping(mapping)) {
    const index = mapping === 'bg' ? color.background : mapping === 'fg' ? color.foreground : mapping;
    const tab = cfg.tabs.find((candidate) => candidate.id === entry.address.tabId);
    const resolvedCluster = tab ? resolveColorClusterFromTab(tab, cfg.tabs) : undefined;
    if (!resolvedCluster || color.palette.length === 0) return undefined;
    return `var(${resolvePaletteCssVar(resolvedCluster, safeIndex(index, color.palette.length))})`;
  }
  return undefined;
}

export function formatCssDeclarations(
  entries: readonly TokenIndexEntry[],
  state: TweakState,
  cfg: PanelConfig,
): string {
  const lines: string[] = [];
  for (const entry of entries) {
    let value: string | undefined;
    if (entry.source === 'semantic') {
      const color = colorSlice(state, entry.address.tabId);
      const mapping = color?.semanticMappings[entry.address.itemId];
      if (color && mapping !== undefined) value = semanticCssValue(mapping, color, entry, cfg);
    } else if (entry.source === 'palette-slot') {
      const current = currentTokenValue(entry, state, cfg);
      value = typeof current === 'string' ? current : undefined;
    } else {
      const tab = cfg.tabs.find((candidate) => candidate.id === entry.address.tabId);
      if (!tab) continue;
      const overrides = entry.address.tabId === 'spacing'
        ? state.spacing
        : entry.address.tabId === 'font'
          ? state.typography
          : entry.address.tabId === 'size'
            ? state.size
            : Object.assign({}, ...Object.values(state.tabs?.[entry.address.tabId] ?? {}));
      value = emitTierItemCssValue(
        resolveTierItemValue(tab, entry.address.tierId, entry.address.itemId, {
          [entry.address.tierId]: overrides,
        }),
      );
    }
    if (value !== undefined) lines.push(`${entry.cssVar}: ${value};`);
  }
  return lines.join('\n');
}

function deleteFlatKey(map: Record<string, string>, itemId: string): Record<string, string> {
  const next = { ...map };
  delete next[itemId];
  return next;
}

export function revertEntry(entry: TokenIndexEntry, baseline: ColorBaseline, cfg: PanelConfig): TweakStateUpdater {
  return (state) => {
    const { tabId, tierId, itemId } = entry.address;
    if (entry.source === 'palette-slot' || entry.source === 'semantic') {
      const current = colorSlice(state, tabId);
      const original = baselineSlice(baseline, tabId);
      if (!current || !original) return state;
      const next = { ...current };
      if (entry.source === 'palette-slot') {
        const index = paletteIndex(entry, cfg);
        if (index < 0 || original.palette[index] === undefined) return state;
        next.palette = [...current.palette];
        next.palette[index] = original.palette[index];
      } else {
        next.semanticMappings = { ...current.semanticMappings };
        const value = original.semanticMappings[itemId];
        if (value === undefined) delete next.semanticMappings[itemId];
        else next.semanticMappings[itemId] = value;
      }
      return tabId === 'color' ? { ...state, color: next } : { ...state, secondary: next };
    }
    if (tabId === 'spacing') return { ...state, spacing: deleteFlatKey(state.spacing, itemId) };
    if (tabId === 'font') return { ...state, typography: deleteFlatKey(state.typography, itemId) };
    if (tabId === 'size') return { ...state, size: deleteFlatKey(state.size, itemId) };
    const tabOverrides = state.tabs?.[tabId] ?? {};
    const tierOverrides = { ...tabOverrides[tierId] };
    delete tierOverrides[itemId];
    const nextTabOverrides = { ...tabOverrides };
    if (Object.keys(tierOverrides).length === 0) delete nextTabOverrides[tierId];
    else nextTabOverrides[tierId] = tierOverrides;
    const nextTabs = { ...state.tabs };
    if (Object.keys(nextTabOverrides).length === 0) delete nextTabs[tabId];
    else nextTabs[tabId] = nextTabOverrides;
    return {
      ...state,
      tabs: nextTabs,
    };
  };
}

export function revertEntries(
  entries: readonly TokenIndexEntry[],
  baseline: ColorBaseline,
  cfg: PanelConfig,
): TweakStateUpdater {
  return (state) => entries.reduce((next, entry) => revertEntry(entry, baseline, cfg)(next), state);
}

export function addressMatches(entry: TokenIndexEntry, address: TokenAddress): boolean {
  return entry.address.tabId === address.tabId && entry.address.tierId === address.tierId && entry.address.itemId === address.itemId;
}
