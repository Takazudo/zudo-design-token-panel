/** Pure, manifest-ordered token index with collision-safe stable addresses. */

import type { PanelConfig } from '../config/panel-config';
import { resolveColorClusterFromTab, resolvePaletteCssVar } from '../config/cluster-config';
import type { SemanticValue, TierValueKind } from '../tokens/tier-model';

export interface TokenAddress {
  tabId: string;
  tierId: string;
  itemId: string;
}

export type TokenSource = 'item' | 'palette-slot' | 'semantic';

export interface TokenIndexEntry {
  address: TokenAddress;
  tabLabel: string;
  tierLabel: string;
  cssVar: string;
  label: string;
  kind: TierValueKind['kind'];
  default: string | SemanticValue;
  source: TokenSource;
}

export interface TokenIndex {
  entries: readonly TokenIndexEntry[];
  entry(address: TokenAddress): TokenIndexEntry | undefined;
  addressesForCssVar(cssVar: string): readonly TokenAddress[];
}

const paletteSlotIndices = new WeakMap<TokenIndexEntry, number>();

/** Internal metadata accessor used by state evaluators without widening index entries. */
export function paletteSlotIndex(entry: TokenIndexEntry): number | undefined {
  return paletteSlotIndices.get(entry);
}

/** A stable internal key. Length prefixes avoid delimiter collisions in host ids. */
export function tokenAddressKey(address: TokenAddress): string {
  return [address.tabId, address.tierId, address.itemId]
    .map((part) => `${part.length}:${part}`)
    .join('');
}

export function sameTokenAddress(a: TokenAddress, b: TokenAddress): boolean {
  return a.tabId === b.tabId && a.tierId === b.tierId && a.itemId === b.itemId;
}

export function buildTokenIndex(cfg: PanelConfig): TokenIndex {
  const entries: TokenIndexEntry[] = [];

  for (const tab of cfg.tabs) {
    const cluster = tab.colorExtras ? resolveColorClusterFromTab(tab, cfg.tabs) : undefined;
    const paletteTier = tab.tiers.find(
      (tier) =>
        !tier.referencesTier &&
        !tier.semantic &&
        tier.items.length > 0 &&
        tier.items[0].type.kind === 'color',
    );

    for (const tier of tab.tiers) {
      const isPalette = cluster !== undefined && tier === paletteTier;
      const isSemantic =
        cluster !== undefined &&
        (tier.semantic === true || (paletteTier !== undefined && tier.referencesTier === paletteTier.id));

      for (let itemIndex = 0; itemIndex < tier.items.length; itemIndex++) {
        const item = tier.items[itemIndex];
        const source: TokenSource = isPalette
          ? 'palette-slot'
          : isSemantic
            ? 'semantic'
            : 'item';
        const entry: TokenIndexEntry = {
          address: { tabId: tab.id, tierId: tier.id, itemId: item.id },
          tabLabel: tab.label,
          tierLabel: tier.label,
          cssVar: isPalette ? resolvePaletteCssVar(cluster, itemIndex) : item.cssVar,
          label: item.label,
          kind: item.type.kind,
          default: isSemantic ? (cluster.semanticDefaults[item.id] ?? item.default) : item.default,
          source,
        };
        if (isPalette) paletteSlotIndices.set(entry, itemIndex);
        entries.push(entry);
      }
    }
  }

  const byAddress = new Map(entries.map((entry) => [tokenAddressKey(entry.address), entry]));
  const byCssVar = new Map<string, TokenAddress[]>();
  for (const entry of entries) {
    const addresses = byCssVar.get(entry.cssVar) ?? [];
    addresses.push(entry.address);
    byCssVar.set(entry.cssVar, addresses);
  }

  return {
    entries,
    entry: (address) => byAddress.get(tokenAddressKey(address)),
    addressesForCssVar: (cssVar) => byCssVar.get(cssVar) ?? [],
  };
}
