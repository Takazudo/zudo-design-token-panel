// @vitest-environment jsdom

/**
 * Notes-tab landing-view e2e (#515).
 *
 * panel.tsx generalizes its initial `activeTab` from a hardcoded
 * `DEFAULT_TAB_ID = 'color'` to `instanceConfig.tabs[0]?.id ?? DEFAULT_TAB_ID`
 * — a host makes ANY tab the landing view (most usefully 'notes') just by
 * ordering it first in `tabs[]`. This confirms both directions:
 *  - a notes-first manifest actually opens on the notes tab and renders its
 *    sanitized content;
 *  - an existing color-first manifest is UNCHANGED — still opens on 'color'
 *    (the accidental-blank-body fix must not alter today's common case).
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import DesignTokenTweakPanel from '../panel';
import { getOpenKey } from '../state/tweak-state';
import type { PanelConfig } from '../config/panel-config';
import type { TabConfig } from '../tokens/tier-model';
import { FIXTURE_TABS, flushEffects } from './_test-helpers';

const COLOR_TAB = FIXTURE_TABS.find((t) => t.id === 'color')!;
const SPACING_TAB = FIXTURE_TABS.find((t) => t.id === 'spacing')!;

const NOTES_TAB: TabConfig = {
  id: 'notes',
  label: 'Notes',
  tiers: [],
  notesExtras: { title: 'Landing notes', html: '<p>hello from the host</p>' },
};

function makeConfig(prefix: string, tabs: readonly TabConfig[]): PanelConfig {
  return {
    storagePrefix: prefix,
    consoleNamespace: prefix,
    modalClassPrefix: `${prefix}-modal`,
    schemaId: `${prefix}/v1`,
    exportFilenameBase: prefix,
    tabs,
    colorPresets: {},
  };
}

let container: HTMLDivElement;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  act(() => {
    render(null, container);
  });
  container.remove();
});

describe('panel — initial activeTab lands on the first configured tab (#515)', () => {
  it('a notes-first manifest opens on the notes tab and renders its content', async () => {
    const cfg = makeConfig('notes-first-test', [NOTES_TAB, COLOR_TAB, SPACING_TAB]);
    localStorage.setItem(getOpenKey(cfg), '1');
    try {
      act(() => {
        render(<DesignTokenTweakPanel instanceConfig={cfg} />, container);
      });
      await flushEffects();

      const selectedTab = container.querySelector('[role="tab"][aria-selected="true"]');
      expect(selectedTab?.textContent).toBe('Notes');

      const heading = container.querySelector('[role="heading"]');
      expect(heading?.textContent).toBe('Landing notes');
      expect(container.querySelector('.tokenpanel-notes-body')?.textContent).toContain(
        'hello from the host',
      );
    } finally {
      localStorage.removeItem(getOpenKey(cfg));
    }
  });

  it('an existing color-first manifest still opens on the color tab (no regression)', async () => {
    const cfg = makeConfig('color-first-test', [COLOR_TAB, SPACING_TAB]);
    localStorage.setItem(getOpenKey(cfg), '1');
    try {
      act(() => {
        render(<DesignTokenTweakPanel instanceConfig={cfg} />, container);
      });
      await flushEffects();

      const selectedTab = container.querySelector('[role="tab"][aria-selected="true"]');
      expect(selectedTab?.textContent).toBe('Color');
    } finally {
      localStorage.removeItem(getOpenKey(cfg));
    }
  });
});
