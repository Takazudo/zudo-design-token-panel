import type { TweakState } from '../state/tweak-state';
import { currentTokenValue } from '../utils/token-diff';
import {
  buildTokenIndex,
  type TokenAddress,
  type TokenIndex,
  type TokenIndexEntry,
} from '../utils/token-index';
import type { PanelConfig } from '../config/panel-config';
import { fuzzySubsequence } from './fuzzy';

/** The fields intentionally mirror the header-filter contract. */
export interface TokenSearchFields {
  cssVar: string;
  id: string;
  label: string;
  value: string;
  tierLabel: string;
}

/** A command-palette token carries its stable S2 address and display fields. */
export interface SearchToken {
  kind: 'token';
  address: TokenAddress;
  tabLabel: string;
  tierLabel: string;
  cssVar: string;
  label: string;
  value: string;
  source: TokenIndexEntry['source'];
}

/** Normalize values from the S2 SemanticValue union for matching/display. */
export function stringifySearchValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (value === null || value === undefined) return '';
  if (typeof value !== 'object') return String(value);

  const candidate = value as Record<string, unknown>;
  if ('literal' in candidate) {
    const literal = candidate.literal;
    if (typeof literal === 'string') return literal;
    if (literal && typeof literal === 'object') {
      const modes = literal as Record<string, unknown>;
      return `light-dark(${String(modes.light ?? '')}, ${String(modes.dark ?? '')})`;
    }
  }
  if ('ref' in candidate && candidate.ref && typeof candidate.ref === 'object') {
    const ref = candidate.ref as Record<string, unknown>;
    return [ref.tab, ref.tier, ref.item].filter((part) => typeof part === 'string').join(' / ');
  }
  try {
    return JSON.stringify(value) ?? '';
  } catch {
    return '';
  }
}

/** Build the five searchable fields for one indexed token. */
export function searchFieldsForEntry(
  entry: TokenIndexEntry,
  state?: TweakState,
  cfg?: PanelConfig,
): TokenSearchFields {
  const value = state ? (currentTokenValue(entry, state, cfg) ?? entry.default) : entry.default;
  return {
    cssVar: entry.cssVar,
    id: entry.address.itemId,
    label: entry.label,
    value: stringifySearchValue(value),
    tierLabel: entry.tierLabel,
  };
}

/** Case-insensitive substring search used by the header filter. */
export function matchesSearchFields(fields: TokenSearchFields, query: string): boolean {
  const needle = query.trim().toLocaleLowerCase();
  if (needle.length === 0) return true;
  return [fields.cssVar, fields.id, fields.label, fields.value, fields.tierLabel]
    .some((field) => field.toLocaleLowerCase().includes(needle));
}

export function matchesTokenEntry(
  entry: TokenIndexEntry,
  query: string,
  state?: TweakState,
  cfg?: PanelConfig,
): boolean {
  if (!query.trim()) return true;
  return matchesSearchFields(searchFieldsForEntry(entry, state, cfg), query);
}

/** Filter an S2 index while preserving manifest order. */
export function filterTokenIndex(
  index: TokenIndex,
  query: string,
  state?: TweakState,
  cfg?: PanelConfig,
): TokenIndexEntry[] {
  return index.entries.filter((entry) => matchesTokenEntry(entry, query, state, cfg));
}

export const filterTokenEntries = filterTokenIndex;

/** Build command-palette token rows from the current registered manifest. */
export function buildSearchTokens(
  cfg: PanelConfig,
  state?: TweakState,
): SearchToken[] {
  const index = buildTokenIndex(cfg);
  return index.entries.map((entry) => {
    const value = state ? (currentTokenValue(entry, state, cfg) ?? entry.default) : entry.default;
    return {
      kind: 'token' as const,
      address: entry.address,
      tabLabel: entry.tabLabel,
      tierLabel: entry.tierLabel,
      cssVar: entry.cssVar,
      label: entry.label,
      value: stringifySearchValue(value),
      source: entry.source,
    };
  });
}

/** Fuzzy-filter command-palette token rows over address + labels + value. */
export function fuzzyFilterTokens(tokens: readonly SearchToken[], query: string): SearchToken[] {
  const needle = query.trim();
  if (!needle) return [...tokens];
  return tokens.filter((token) => [
    token.cssVar,
    token.address.itemId,
    token.label,
    token.value,
    token.tierLabel,
    token.tabLabel,
  ].some((field) => fuzzySubsequence(needle, field)));
}
