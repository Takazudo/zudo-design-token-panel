import { describe, expect, it } from 'vitest';
import { FIXTURE_PANEL_CONFIG } from '../../__tests__/_test-helpers';
import { buildTokenIndex } from '../../utils/token-index';
import { filterTokenIndex, matchesTokenEntry } from '../token-search';
import { fuzzySubsequence } from '../fuzzy';

describe('search helpers', () => {
  it('matches fuzzy queries as a case-insensitive subsequence', () => {
    expect(fuzzySubsequence('zdp', '--zudo-panel')).toBe(true);
    expect(fuzzySubsequence('PANEL', 'panel')).toBe(true);
    expect(fuzzySubsequence('zpx', '--zudo-panel')).toBe(false);
    expect(fuzzySubsequence('', 'anything')).toBe(true);
  });

  it('filters the S2 index over css var, id, label, value, and tier label', () => {
    const index = buildTokenIndex(FIXTURE_PANEL_CONFIG);
    expect(filterTokenIndex(index, 'fixture-p6').map((entry) => entry.address.itemId)).toEqual(['fixture-p6']);
    expect(filterTokenIndex(index, 'semantic').every((entry) => entry.tierLabel === 'Semantic')).toBe(true);
    expect(filterTokenIndex(index, '--fixture-semantic-accent').map((entry) => entry.address.itemId)).toEqual(['accent']);
    const paletteEntry = index.entries.find((entry) => entry.address.itemId === 'fixture-p6')!;
    expect(matchesTokenEntry(paletteEntry, '#000000')).toBe(true);
  });
});
