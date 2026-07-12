// @vitest-environment jsdom

/**
 * Regression coverage for the closed-shell DOM Tweaker revive path.
 *
 * The Astro host adapter can decide to fetch the panel bundle from the
 * persisted `-domtweaker-enabled` bit, but the package-root adapter still has
 * to mount the Preact shell CLOSED so DomTweakerOrchestrator can run and load
 * the lazy boundary.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushEffects } from '../../__tests__/_test-helpers';
import type { PanelConfig } from '../../config/panel-config';

const OPEN_PANEL_HEADER_TEXT = 'zdtp';

function makeConfig(): PanelConfig {
  return {
    storagePrefix: 'domtweak-reapply',
    consoleNamespace: 'domtweakReapply',
    modalClassPrefix: 'domtweak-reapply-modal',
    schemaId: 'domtweak-reapply/v1',
    exportFilenameBase: 'domtweak-reapply',
    tabs: [],
    domTweaker: {},
  };
}

describe('adapter — DOM Tweaker mounts the shell while closed', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
    const adapterWin = window as unknown as Record<string, unknown>;
    delete adapterWin.__zudoDesignTokenPanelAdapter;
    delete adapterWin.__zudoDesignTokenPanelLifecycle;
  });

  afterEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
    vi.resetModules();
  });

  it('mounts the shell CLOSED when domTweaker is configured and persisted enabled', async () => {
    vi.resetModules();
    const cfg = makeConfig();
    const panelConfig = await import('../../config/panel-config');
    panelConfig.__resetPanelConfigForTests();
    localStorage.setItem(`${cfg.storagePrefix}-domtweaker-enabled`, '1');

    await import('../../index');
    expect(document.getElementById(panelConfig.panelRootId(cfg))).toBeNull();

    panelConfig.configurePanel(cfg);
    await flushEffects();

    const root = document.getElementById(panelConfig.panelRootId(cfg));
    expect(root).not.toBeNull();
    expect(root!.textContent ?? '').not.toContain(OPEN_PANEL_HEADER_TEXT);
  });
});
