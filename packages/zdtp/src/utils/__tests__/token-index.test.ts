import { describe, expect, it } from 'vitest';
import type { PanelConfig } from '../../config/panel-config';
import { EXAMPLE_PANEL_CONFIG } from '../../__tests__/_example-ramp-native-tier2';
import { FIXTURE_PANEL_CONFIG } from '../../__tests__/_test-helpers';
import { buildTokenIndex } from '../token-index';

describe('buildTokenIndex', () => {
  it('indexes the standard manifest in tab order without double-indexing color tiers', () => {
    const index = buildTokenIndex(FIXTURE_PANEL_CONFIG);
    expect(index.entries.slice(0, 4).map((entry) => entry.address.tabId)).toEqual([
      'spacing',
      'spacing',
      'font',
      'size',
    ]);
    expect(index.entries).toHaveLength(23);
    expect(index.entries.filter((entry) => entry.source === 'palette-slot')).toHaveLength(16);
    expect(index.entries.filter((entry) => entry.source === 'semantic')).toHaveLength(3);
    expect(index.entries.find((entry) => entry.address.itemId === 'fixture-p6')).toMatchObject({
      cssVar: '--fixture-p6',
      source: 'palette-slot',
    });
  });

  it('indexes ramp-native semantic defaults once while ordinary palette ramps remain items', () => {
    const index = buildTokenIndex(EXAMPLE_PANEL_CONFIG);
    expect(index.entries).toHaveLength(11);
    expect(index.entries.filter((entry) => entry.address.tabId === 'palette').every((entry) => entry.source === 'item')).toBe(true);
    expect(index.entry({ tabId: 'color', tierId: 'semantic', itemId: 'brand' })).toMatchObject({
      source: 'semantic',
      default: { ref: { tab: 'palette', tier: 'accent', item: 'accent-1' } },
    });
  });

  it('returns every stable address for a duplicate cssVar without collapsing entries', () => {
    const cfg: PanelConfig = {
      ...FIXTURE_PANEL_CONFIG,
      tabs: [
        { id: 'one', label: 'One', tiers: [{ id: 'raw', label: 'Raw', items: [{ id: 'a', label: 'A', cssVar: '--shared', default: '1px', type: { kind: 'length', step: 1, unit: 'px' } }] }] },
        { id: 'two', label: 'Two', tiers: [{ id: 'raw', label: 'Raw', items: [{ id: 'b', label: 'B', cssVar: '--shared', default: '2px', type: { kind: 'length', step: 1, unit: 'px' } }] }] },
      ],
    };
    expect(buildTokenIndex(cfg).addressesForCssVar('--shared')).toEqual([
      { tabId: 'one', tierId: 'raw', itemId: 'a' },
      { tabId: 'two', tierId: 'raw', itemId: 'b' },
    ]);
  });
});
