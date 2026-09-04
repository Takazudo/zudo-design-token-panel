/** State-aware token dependency graph. References are address-based, never cssVar-based. */

import type { PanelConfig } from '../config/panel-config';
import type { ColorTweakState, SemanticValue, TweakState } from '../state/tweak-state';
import { isIndexMapping, isLiteralMapping, isPerModeLiteral, isRefMapping, safeIndex } from '../state/tweak-state';
import { oklchaToHex, staticCssColorToOklcha } from './color-oklch';
import { currentTokenValue, type ColorBaseline } from './token-diff';
import {
  buildTokenIndex,
  tokenAddressKey,
  type TokenAddress,
  type TokenIndexEntry,
} from './token-index';

export type ResolutionHop =
  | { kind: 'token'; address: TokenAddress; cssVar: string; value?: undefined }
  | { kind: 'literal'; value: string; address?: undefined; cssVar?: undefined };

export interface TokenGraph {
  entries: readonly TokenIndexEntry[];
  dependentsOf(address: TokenAddress): readonly TokenAddress[];
  rampSiblings(address: TokenAddress): readonly TokenAddress[];
  resolutionChain(address: TokenAddress): readonly ResolutionHop[];
}

function colorSlice(state: TweakState, tabId: string): ColorTweakState | undefined {
  return tabId === 'color' ? state.color : tabId === 'color-secondary' ? state.secondary : undefined;
}

function baselineSlice(baseline: ColorBaseline, tabId: string): ColorTweakState | undefined {
  if (!baseline) return undefined;
  if ('color' in baseline) return tabId === 'color' ? baseline.color : baseline.secondary;
  return tabId === 'color' ? baseline : undefined;
}

function semanticValue(
  entry: TokenIndexEntry,
  state: TweakState,
  baseline: ColorBaseline,
): SemanticValue | undefined {
  return (
    colorSlice(state, entry.address.tabId)?.semanticMappings[entry.address.itemId] ??
    baselineSlice(baseline, entry.address.tabId)?.semanticMappings[entry.address.itemId] ??
    (entry.default as SemanticValue)
  );
}

function findAddress(
  entries: readonly TokenIndexEntry[],
  tabId: string,
  tierId: string,
  itemId: string,
): TokenAddress | undefined {
  return entries.find(
    (entry) =>
      entry.address.tabId === tabId &&
      entry.address.tierId === tierId &&
      entry.address.itemId === itemId,
  )?.address;
}

function literalFor(
  entry: TokenIndexEntry,
  state: TweakState,
  baseline: ColorBaseline,
  cfg: PanelConfig,
): string | undefined {
  if (entry.source === 'semantic') {
    const mapping = semanticValue(entry, state, baseline);
    if (!mapping) return undefined;
    if (isPerModeLiteral(mapping)) return `light-dark(${mapping.literal.light}, ${mapping.literal.dark})`;
    if (isLiteralMapping(mapping)) return mapping.literal as string;
    return undefined;
  }
  const value = currentTokenValue(entry, state, cfg);
  return typeof value === 'string' ? value : undefined;
}

export function buildTokenGraph(
  cfg: PanelConfig,
  state: TweakState,
  baseline?: ColorBaseline,
): TokenGraph {
  const index = buildTokenIndex(cfg);
  const byKey = new Map(index.entries.map((entry) => [tokenAddressKey(entry.address), entry]));
  const outgoing = new Map<string, TokenAddress>();
  const incoming = new Map<string, TokenAddress[]>();

  const addEdge = (from: TokenAddress, to: TokenAddress | undefined) => {
    if (!to) return;
    outgoing.set(tokenAddressKey(from), to);
    const key = tokenAddressKey(to);
    const dependents = incoming.get(key) ?? [];
    dependents.push(from);
    incoming.set(key, dependents);
  };

  for (const entry of index.entries) {
    const tab = cfg.tabs.find((candidate) => candidate.id === entry.address.tabId);
    const tier = tab?.tiers.find((candidate) => candidate.id === entry.address.tierId);
    if (!tab || !tier) continue;

    if (entry.source === 'semantic') {
      const mapping = semanticValue(entry, state, baseline);
      if (mapping === undefined) continue;
      if (isRefMapping(mapping)) {
        addEdge(
          entry.address,
          findAddress(
            index.entries,
            mapping.ref.tab ?? tab.id,
            mapping.ref.tier,
            mapping.ref.item,
          ),
        );
      } else if (isIndexMapping(mapping)) {
        const color = colorSlice(state, tab.id) ?? baselineSlice(baseline, tab.id);
        const paletteTier = tab.tiers.find(
          (candidate) => index.entries.some(
            (indexed) => indexed.source === 'palette-slot' && indexed.address.tabId === tab.id && indexed.address.tierId === candidate.id,
          ),
        );
        if (!color || !paletteTier || paletteTier.items.length === 0) continue;
        const rawIndex = mapping === 'bg' ? color.background : mapping === 'fg' ? color.foreground : mapping;
        const item = paletteTier.items[safeIndex(rawIndex, paletteTier.items.length)];
        addEdge(entry.address, findAddress(index.entries, tab.id, paletteTier.id, item.id));
      }
      continue;
    }

    if (tier.referencesTier) {
      const override = entry.address.tabId === 'spacing'
        ? state.spacing[entry.address.itemId]
        : entry.address.tabId === 'font'
          ? state.typography[entry.address.itemId]
          : entry.address.tabId === 'size'
            ? state.size[entry.address.itemId]
            : state.tabs?.[tab.id]?.[tier.id]?.[entry.address.itemId];
      const targetTier = tab.tiers.find((candidate) => candidate.id === tier.referencesTier);
      if (!targetTier || targetTier.items.length === 0) continue;
      const target =
        targetTier.items.find((item) => item.id === override) ??
        targetTier.items.find((item) => item.id === entry.default) ??
        targetTier.items.find((item) => item.id === entry.address.itemId) ??
        targetTier.items[0];
      addEdge(entry.address, findAddress(index.entries, tab.id, targetTier.id, target.id));
    }
  }

  const resolutionChain = (address: TokenAddress): ResolutionHop[] => {
    const hops: ResolutionHop[] = [];
    const visited = new Set<string>();
    let current = byKey.get(tokenAddressKey(address));
    while (current) {
      const key = tokenAddressKey(current.address);
      if (visited.has(key)) break;
      visited.add(key);
      hops.push({ kind: 'token', address: current.address, cssVar: current.cssVar });
      const target = outgoing.get(key);
      if (target) {
        current = byKey.get(tokenAddressKey(target));
        continue;
      }
      const literal = literalFor(current, state, baseline, cfg);
      if (literal !== undefined) {
        hops.push({ kind: 'literal', value: literal });
        if (current.kind === 'color') {
          const oklcha = staticCssColorToOklcha(literal);
          if (oklcha && /^oklch\s*\(/i.test(literal.trim())) {
            hops.push({ kind: 'literal', value: oklchaToHex(oklcha) });
          }
        }
      }
      break;
    }
    return hops;
  };

  return {
    entries: index.entries,
    dependentsOf: (address) => incoming.get(tokenAddressKey(address)) ?? [],
    rampSiblings: (address) => {
      const entry = byKey.get(tokenAddressKey(address));
      if (!entry || entry.kind !== 'color' || entry.source === 'semantic') return [];
      return index.entries
        .filter(
          (candidate) =>
            candidate.address.tabId === address.tabId &&
            candidate.address.tierId === address.tierId &&
            tokenAddressKey(candidate.address) !== tokenAddressKey(address),
        )
        .map((candidate) => candidate.address);
    },
    resolutionChain,
  };
}
