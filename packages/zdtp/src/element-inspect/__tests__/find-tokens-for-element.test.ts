// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TokenAddress, TokenIndex, TokenIndexEntry } from '../../utils/token-index';

vi.mock('../../highlight/find-elements', () => ({
  probeElementForToken: (_el: Element, cssVar: string) => {
    if (cssVar.includes('inline')) return ['margin-left', 'margin-right'];
    if (cssVar.includes('space')) return ['padding-top', 'padding-right', 'padding-bottom', 'padding-left'];
    if (cssVar.includes('color')) return ['color'];
    return [];
  },
}));

import { findTokensForElement } from '../find-tokens-for-element';

function indexFor(entries: TokenIndexEntry[]): TokenIndex {
  return {
    entries,
    entry(address: TokenAddress) {
      return entries.find(({ address: candidate }) =>
        candidate.tabId === address.tabId &&
        candidate.tierId === address.tierId &&
        candidate.itemId === address.itemId,
      );
    },
    addressesForCssVar(cssVar: string) {
      return entries.filter((entry) => entry.cssVar === cssVar).map((entry) => entry.address);
    },
  };
}

function entry(itemId: string, cssVar: string, kind: TokenIndexEntry['kind']): TokenIndexEntry {
  return {
    address: { tabId: 'fixture', tierId: 'raw', itemId },
    tabLabel: 'Fixture',
    tierLabel: 'Raw',
    cssVar,
    label: itemId,
    kind,
    default: kind === 'color' ? '#000000' : '1px',
    source: 'item',
  };
}

beforeEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
});

describe('findTokensForElement', () => {
  it('scans shorthand cssText, inline declarations, and nearest inherited declarations', () => {
    const style = document.createElement('style');
    style.textContent = `
      .grand { color: var(--grand-color); }
      .parent { color: var(--parent-color); }
      .target { padding: var(--space-y) var(--space-x); background: var(--surface); }
    `;
    document.head.appendChild(style);
    document.body.innerHTML = `
      <div class="grand"><div class="parent"><div class="target" style="margin-inline: var(--inline-space)"></div></div></div>
    `;
    const target = document.querySelector('.target')!;
    const index = indexFor([
      entry('space-y', '--space-y', 'length'),
      entry('space-x', '--space-x', 'length'),
      entry('surface', '--surface', 'color'),
      entry('inline-space', '--inline-space', 'length'),
      entry('parent-color', '--parent-color', 'color'),
      entry('grand-color', '--grand-color', 'color'),
    ]);

    const result = findTokensForElement(target, index);

    expect(result.own.map(({ property }) => property)).toEqual([
      'padding',
      'background',
      'margin-inline',
    ]);
    expect(result.own[0].matches.map(({ cssVar }) => cssVar)).toEqual([
      '--space-y',
      '--space-x',
    ]);
    expect(result.own[0].matches.every(({ confirmed }) => confirmed)).toBe(true);
    expect(result.own[2].matches[0]).toMatchObject({
      selector: '<inline style>',
      cssVar: '--inline-space',
      confirmed: true,
    });
    expect(result.inherited).toHaveLength(1);
    expect(result.inherited[0].matches[0]).toMatchObject({
      cssVar: '--parent-color',
      inheritedFrom: target.parentElement,
      confirmed: true,
    });
  });
});
