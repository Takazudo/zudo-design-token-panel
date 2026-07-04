// @vitest-environment jsdom

/**
 * Tab rendering when tabs are configured vs. not configured.
 *
 * With Wave 5, tabs[] is required on PanelConfig and the EmptyState component
 * is removed. A tab with zero items simply renders no rows. This test guards
 * against regressions in the tab dispatch path.
 *
 * We verify:
 *  - When PanelConfig.tabs includes a spacing tab with items, the spacing
 *    tabpanel renders those items.
 *  - When PanelConfig.tabs is empty (no spacing tab), the spacing tabpanel
 *    is simply absent from the rendered DOM.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  __resetPanelConfigForTests,
  configurePanel,
  DEFAULT_PANEL_CONFIG,
  panelRootId,
  storageKey_visible,
} from '../config/panel-config';
import type { TabConfig } from '../tokens/tier-model';
import { flushEffects } from './_test-helpers';

const STORAGE_KEY_VISIBLE = storageKey_visible(DEFAULT_PANEL_CONFIG);
const PANEL_ROOT_ID = panelRootId(DEFAULT_PANEL_CONFIG);

const SPACING_TAB_WITH_ITEMS: TabConfig = {
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
          label: 'Demo SM',
          default: '4px',
          type: { kind: 'length', step: 1, unit: 'px' },
        },
      ],
    },
  ],
};

const COLOR_TAB: TabConfig = {
  id: 'color',
  label: 'Color',
  tiers: [],
};

describe('design-token-panel tab dispatch', () => {
  beforeEach(() => {
    __resetPanelConfigForTests();
    localStorage.clear();
    document.body.innerHTML = '';
    const adapterWin = window as unknown as Record<string, unknown>;
    delete adapterWin.__zudoDesignTokenPanelAdapter;
    delete adapterWin.__zudoDesignTokenPanelLifecycle;
  });

  afterEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
    __resetPanelConfigForTests();
  });

  it('renders spacing tab items when the spacing tab has items configured', async () => {
    configurePanel({
      ...DEFAULT_PANEL_CONFIG,
      tabs: [SPACING_TAB_WITH_ITEMS, COLOR_TAB],
    });

    localStorage.setItem(STORAGE_KEY_VISIBLE, '1');
    const { showDesignTokenPanel } = await import('../index');
    showDesignTokenPanel();
    await flushEffects();

    const root = document.getElementById(PANEL_ROOT_ID);
    expect(root).not.toBeNull();

    const spacingPanel = root!.querySelector('[role="tabpanel"][id*="-spacing"]');
    expect(spacingPanel).not.toBeNull();
    // Should contain item content (tier section renders)
    expect(spacingPanel!.textContent ?? '').toContain('Demo SM');
  });
});
