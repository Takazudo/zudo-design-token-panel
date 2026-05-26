import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  __resetPanelConfigForTests,
  configurePanel,
  DEFAULT_PANEL_CONFIG,
  getPanelConfig,
} from '../config/panel-config';
import type { TabConfig } from '../tokens/tier-model';

/**
 * Consumer-supplied tabs[] works end-to-end at the config level.
 *
 * The portable contract lets a host pass `tabs: TabConfig[]` into
 * `configurePanel`. The package itself ships an empty stub tabs array;
 * different consumers can ship distinct tab configs. Passing a spacing tab
 * with 3 items MUST produce a panel config that surfaces those 3 items.
 *
 * This test exercises the plumbing — `configurePanel` accepts custom tabs,
 * `getPanelConfig().tabs` reflects them.
 */

beforeEach(() => {
  __resetPanelConfigForTests();
});

afterEach(() => {
  __resetPanelConfigForTests();
});

const FAKE_SPACING_TAB: TabConfig = {
  id: 'spacing',
  label: 'Spacing',
  tiers: [
    {
      id: 'raw',
      label: 'Raw',
      items: [
        {
          id: 'demo-sm',
          cssVar: '--demo-sm',
          label: 'demo-sm',
          default: '4px',
          type: { kind: 'length', step: 1, unit: 'px' },
        },
        {
          id: 'demo-md',
          cssVar: '--demo-md',
          label: 'demo-md',
          default: '8px',
          type: { kind: 'length', step: 1, unit: 'px' },
        },
        {
          id: 'demo-lg',
          cssVar: '--demo-lg',
          label: 'demo-lg',
          default: '16px',
          type: { kind: 'length', step: 1, unit: 'px' },
        },
      ],
    },
  ],
};

describe('configurePanel — consumer-supplied tabs', () => {
  it('exposes a 3-item spacing tab with no font or size tabs', () => {
    configurePanel({
      ...DEFAULT_PANEL_CONFIG,
      tabs: [FAKE_SPACING_TAB],
    });

    const tabs = getPanelConfig().tabs;
    expect(tabs.length).toBe(1);
    const spacing = tabs.find((t) => t.id === 'spacing');
    expect(spacing).toBeDefined();
    const items = spacing!.tiers[0].items;
    expect(items.length).toBe(3);
    expect(items.map((t) => t.id)).toEqual(['demo-sm', 'demo-md', 'demo-lg']);
  });

  it('default config exposes the empty tabs array when configurePanel is not called', () => {
    // No configurePanel call — the singleton stays null, getPanelConfig
    // returns DEFAULT_PANEL_CONFIG, which ships an empty tabs array.
    // Hosts MUST call configurePanel to drive useful behaviour.
    const tabs = getPanelConfig().tabs;
    expect(tabs).toEqual([]);
  });
});
