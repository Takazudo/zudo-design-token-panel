// @vitest-environment jsdom

/**
 * #500/#509 — Contract c: destroy + remount under a DIFFERENT mode applies THAT
 * mode's persisted color slot, not the previously-mounted mode's.
 *
 * This is the "destroy+remount angle" of #500: a host that destroys the panel
 * and reconfigures per light/dark mode (rather than relying on the in-place
 * `color-scheme-changed` listener) must, on remount, apply the slot for the mode
 * that is active NOW. Under the old single-slot envelope, mode-A's overrides
 * were applied over mode-B's defaults because there was no per-mode slot to
 * select between. The v4 identity-keyed envelope fixes this: the panel's
 * first-open effect runs `loadPersistedState`, which selects the active
 * identity's slot.
 *
 * The lifecycle exercised is exactly `configurePanel → destroy → configurePanel
 * → mount`, driven through the public instance handle.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { __resetInstanceBindingsForTests } from '../index';
import {
  __resetPanelConfigForTests,
  configurePanel,
  panelRootId,
  type PanelConfig,
} from '../config/panel-config';
import {
  getStorageKeyV4,
  type ColorTweakState,
  type PersistedEnvelopeV4,
} from '../state/tweak-state';
import type { ColorScheme } from '../config/color-schemes';
import type { TabConfig } from '../tokens/tier-model';
import { flushEffects } from './_test-helpers';

const scheme16 = (p0: string): ColorScheme => ({
  background: 0,
  foreground: 15,
  cursor: 6,
  selectionBg: 0,
  selectionFg: 15,
  palette: Array.from({ length: 16 }, (_, i) => (i === 0 ? p0 : `#${i.toString(16).padStart(2, '0').repeat(3)}`)) as unknown as ColorScheme['palette'],
  shikiTheme: 'dracula',
});

/** A full 16-slot color slot whose palette[0] is the sentinel `p0`. */
const slot = (p0: string): ColorTweakState => ({
  palette: Array.from({ length: 16 }, (_, i) => (i === 0 ? p0 : `#${i.toString(16).padStart(2, '0').repeat(3)}`)),
  background: 0,
  foreground: 15,
  cursor: 6,
  selectionBg: 0,
  selectionFg: 15,
  semanticMappings: {},
  shikiTheme: 'dracula',
});

const MODE_COLOR_TAB: TabConfig = {
  id: 'color',
  label: 'Color',
  colorExtras: {
    id: 'remount-fixture',
    label: 'Remount Fixture',
    baseRoles: {},
    baseDefaults: { background: 0, foreground: 15, cursor: 6, selectionBg: 0, selectionFg: 15 },
    defaultShikiTheme: 'dracula',
    colorSchemes: { 'mode-light': scheme16('#00dd00'), 'mode-dark': scheme16('#dd0000') },
    panelSettings: {
      colorScheme: 'mode-light',
      colorMode: { defaultMode: 'light', lightScheme: 'mode-light', darkScheme: 'mode-dark' },
    },
  },
  tiers: [
    {
      id: 'palette',
      label: 'Palette',
      items: Array.from({ length: 16 }, (_, i) => ({
        id: `remp${i}`,
        cssVar: `--remp${i}`,
        label: `Palette ${i}`,
        default: '#000000',
        type: { kind: 'color' as const },
      })),
    },
  ],
};

function makeModeConfig(): PanelConfig {
  return {
    storagePrefix: 'zudo-design-token-panel',
    consoleNamespace: 'zudo',
    modalClassPrefix: 'zudo-design-token-panel-modal',
    schemaId: 'zudo-design-tokens/v1',
    exportFilenameBase: 'zudo-design-tokens',
    tabs: [MODE_COLOR_TAB],
    colorPresets: {},
  };
}

function readVar(name: string): string {
  return document.documentElement.style.getPropertyValue(name);
}

function setTheme(mode: 'light' | 'dark'): void {
  document.documentElement.setAttribute('data-theme', mode);
}

describe('per-scheme color persistence — destroy + remount (#500/#509, contract c)', () => {
  beforeEach(() => {
    __resetInstanceBindingsForTests();
    __resetPanelConfigForTests();
    localStorage.clear();
    document.body.innerHTML = '';
    document.documentElement.removeAttribute('style');
    document.documentElement.removeAttribute('data-theme');
    const w = window as unknown as Record<string, unknown>;
    delete w.__zudoDesignTokenPanelAdapter;
    delete w.__zudoDesignTokenPanelLifecycle;
  });

  afterEach(() => {
    __resetInstanceBindingsForTests();
    __resetPanelConfigForTests();
    document.body.innerHTML = '';
    document.documentElement.removeAttribute('style');
    document.documentElement.removeAttribute('data-theme');
    localStorage.clear();
  });

  it('remount under mode B applies mode B\'s slot, not the mode-A slot the previous mount applied', async () => {
    await import('../index');

    // Persist DISTINCT slots for both identities under the single v4 key.
    const cfg = makeModeConfig();
    const envelope: PersistedEnvelopeV4 = {
      color: { 'mode-light': slot('#00dd00'), 'mode-dark': slot('#dd0000') },
      spacing: {},
      typography: {},
      size: {},
    };
    localStorage.setItem(getStorageKeyV4(cfg), JSON.stringify(envelope));

    // 1. Mount under DARK — the first-open effect selects + applies the dark slot.
    setTheme('dark');
    const handle = configurePanel(cfg);
    handle.open();
    await flushEffects();
    expect(document.getElementById(panelRootId(cfg))).not.toBeNull();
    expect(readVar('--remp0')).toBe('#dd0000');

    // 2. Destroy the instance (host tears the panel down before reconfiguring).
    handle.destroy();
    await flushEffects();
    expect(document.getElementById(panelRootId(cfg))).toBeNull();

    // 3. Remount under LIGHT — configurePanel again on the freed prefix, mount.
    setTheme('light');
    const handle2 = configurePanel(cfg);
    handle2.open();
    await flushEffects();

    // The LIGHT slot is applied — mode B's slot, not the dark slot the first
    // mount had painted (which is what the single-slot envelope would reapply).
    expect(readVar('--remp0')).toBe('#00dd00');
  });
});
