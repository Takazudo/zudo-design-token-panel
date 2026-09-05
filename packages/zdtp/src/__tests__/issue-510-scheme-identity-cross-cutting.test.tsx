// @vitest-environment jsdom

/**
 * #510 confirm — cross-cutting interaction checks that no single sub-issue's
 * acceptance criteria asserts (see epic #502 / issue #510).
 *
 * #506 x #509 — a host-owned inline `color-scheme` must survive a scheme
 * TOGGLE that runs through the real `handleSchemeChange` panel effect, not
 * just a bare `applyFullState` / `clearAppliedColorStyles` call
 * (issue-501-color-scheme-ownership.test.ts covers the latter). The same
 * toggle must also load + apply the NEW identity's persisted color slot
 * (scheme-change-preserves-non-color.test.tsx's contract b covers that in
 * isolation, with no host-owned value present). Neither test drives both at
 * once.
 *
 * #504 x #509 — `colorExtras.semanticDefaults` (config-time per-mode-literal
 * defaults, #499/#504) must seed verbatim into a FRESH v4 slot for EVERY mode
 * identity, not just one. The #499 unit tests call `initColorFromSchemeData`
 * directly with a single scheme literal; this drives the identity-aware
 * `initColorFromScheme` entry point (the same one `handleSchemeChange` calls
 * when the new identity has no persisted slot) under both light and dark
 * `data-theme` values, against a cluster resolved through the real
 * `resolveColorClusterFromTab` config plumbing.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act } from 'preact/test-utils';
import { __resetInstanceBindingsForTests } from '../index';
import {
  __resetPanelConfigForTests,
  configurePanel,
  type PanelConfig,
  type PanelInstanceHandle,
} from '../config/panel-config';
import {
  getActiveColorIdentity,
  getActivePrimaryCluster,
  getStorageKeyV4,
  hasActiveColorSlot,
  initColorFromScheme,
  type ColorTweakState,
  type PersistedEnvelopeV4,
} from '../state/tweak-state';
import type { ColorScheme } from '../config/color-schemes';
import type { TabConfig } from '../tokens/tier-model';
import { flushEffects } from './_test-helpers';

function setTheme(mode: 'light' | 'dark'): void {
  document.documentElement.setAttribute('data-theme', mode);
}

// ---------------------------------------------------------------------------
// #506 x #509
// ---------------------------------------------------------------------------

const scheme16 = (p0: string): ColorScheme => ({
  background: 0,
  foreground: 15,
  cursor: 6,
  selectionBg: 0,
  selectionFg: 15,
  palette: Array.from(
    { length: 16 },
    (_, i) => (i === 0 ? p0 : `#${i.toString(16).padStart(2, '0').repeat(3)}`),
  ) as unknown as ColorScheme['palette'],
  shikiTheme: 'dracula',
});

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

// A plain palette-only color tab (no per-mode literal semantic value) — the
// panel itself never claims ownership of `color-scheme` here, so any survival
// of a host-owned value is entirely down to the #506 ownership gate, not a
// coincidence of the panel never being asked to clear anything.
const HOST_OWNED_COLOR_TAB: TabConfig = {
  id: 'color',
  label: 'Color',
  colorExtras: {
    id: 'host-owned-fixture',
    baseRoles: {},
    baseDefaults: { background: 0, foreground: 15, cursor: 6, selectionBg: 0, selectionFg: 15 },
    defaultShikiTheme: 'dracula',
    colorSchemes: { 'mode-light': scheme16('#00cc00'), 'mode-dark': scheme16('#cc0000') },
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
        id: `hop${i}`,
        cssVar: `--hop${i}`,
        label: `Palette ${i}`,
        default: '#000000',
        type: { kind: 'color' as const },
      })),
    },
  ],
};

function makeHostOwnedConfig(): PanelConfig {
  return {
    storagePrefix: 'zudo-design-token-panel',
    consoleNamespace: 'zudo',
    modalClassPrefix: 'zudo-design-token-panel-modal',
    schemaId: 'zudo-design-tokens/v1',
    exportFilenameBase: 'zudo-design-tokens',
    tabs: [HOST_OWNED_COLOR_TAB],
    colorPresets: {},
  };
}

function readVar(name: string): string {
  return document.documentElement.style.getPropertyValue(name);
}

describe('#506 x #509 — scheme toggle with a host-owned inline color-scheme', () => {
  let handle: PanelInstanceHandle | undefined;

  beforeEach(() => {
    handle = undefined;
    __resetInstanceBindingsForTests();
    __resetPanelConfigForTests();
    localStorage.clear();
    document.body.innerHTML = '';
    document.documentElement.removeAttribute('style');
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(async () => {
    // Removing the root DOM directly leaves Preact's mounted tree and deferred
    // effects alive after Vitest disposes this test's jsdom environment.
    // Destroy through the public lifecycle while `document` still exists, then
    // let Preact finish the unmount cleanups before resetting module state.
    act(() => handle?.destroy());
    handle = undefined;
    await flushEffects();
    __resetInstanceBindingsForTests();
    __resetPanelConfigForTests();
    document.body.innerHTML = '';
    document.documentElement.removeAttribute('style');
    document.documentElement.removeAttribute('data-theme');
    localStorage.clear();
  });

  it('leaves the host-owned color-scheme untouched across a toggle while the new identity slot paints', async () => {
    await import('../index');

    const cfg = makeHostOwnedConfig();
    const envelope: PersistedEnvelopeV4 = {
      color: { 'mode-light': slot('#00cc00'), 'mode-dark': slot('#cc0000') },
      spacing: {},
      typography: {},
      size: {},
    };
    localStorage.setItem(getStorageKeyV4(cfg), JSON.stringify(envelope));

    // Host owns this value independently of the panel — set BEFORE the panel
    // mounts, using a value the panel's own per-mode-literal sentinel
    // ('light dark') never produces, so a regression back to unconditional
    // clearing is unambiguous.
    document.documentElement.style.setProperty('color-scheme', 'only dark');

    setTheme('dark');
    handle = configurePanel(cfg);
    handle.open();
    await flushEffects();
    expect(readVar('--hop0')).toBe('#cc0000');
    expect(readVar('color-scheme')).toBe('only dark');

    // Toggle to the LIGHT identity — handleSchemeChange clears the color
    // cluster vars (gated by #506 ownership) and loads the new identity's
    // persisted slot (#509).
    setTheme('light');
    window.dispatchEvent(new Event('color-scheme-changed'));
    await flushEffects();

    expect(readVar('--hop0')).toBe('#00cc00');
    // The host's value was never touched by the gated clear even though it
    // ran mid-toggle — the panel never owned it.
    expect(readVar('color-scheme')).toBe('only dark');

    // Toggle back to DARK for good measure — same guarantee both ways.
    setTheme('dark');
    window.dispatchEvent(new Event('color-scheme-changed'));
    await flushEffects();
    expect(readVar('--hop0')).toBe('#cc0000');
    expect(readVar('color-scheme')).toBe('only dark');
  });
});

// ---------------------------------------------------------------------------
// #504 x #509
// ---------------------------------------------------------------------------

// A per-mode-literal default (#499/#504 Option B) for a semantic item neither
// scheme below overrides — the seed loop must carry it verbatim regardless of
// which identity (light or dark) is active.
const perModeDanger = {
  literal: { light: 'oklch(.505 .170 25)', dark: 'oklch(.655 .170 25)' },
};

const SEMANTIC_DEFAULTS_TAB: TabConfig = {
  id: 'color',
  label: 'Color',
  colorExtras: {
    id: 'confirm-504-509-fixture',
    baseRoles: {},
    baseDefaults: { background: 0, foreground: 1, cursor: 0, selectionBg: 0, selectionFg: 1 },
    defaultShikiTheme: 'dracula',
    colorSchemes: {
      'mode-light': {
        background: 0,
        foreground: 1,
        cursor: 0,
        selectionBg: 0,
        selectionFg: 1,
        palette: ['#111111', '#eeeeee'] as unknown as ColorScheme['palette'],
      },
      'mode-dark': {
        background: 0,
        foreground: 1,
        cursor: 0,
        selectionBg: 0,
        selectionFg: 1,
        palette: ['#eeeeee', '#111111'] as unknown as ColorScheme['palette'],
      },
    },
    panelSettings: {
      colorScheme: 'mode-light',
      colorMode: { defaultMode: 'light', lightScheme: 'mode-light', darkScheme: 'mode-dark' },
    },
    // The override map — resolveColorClusterFromTab must use this verbatim
    // instead of deriving `danger`'s default from the tier item below.
    semanticDefaults: { danger: perModeDanger },
  },
  tiers: [
    {
      id: 'palette',
      label: 'Palette',
      items: [
        { id: 'p0', cssVar: '--sd-p0', label: 'P0', default: '#000000', type: { kind: 'color' as const } },
        { id: 'p1', cssVar: '--sd-p1', label: 'P1', default: '#ffffff', type: { kind: 'color' as const } },
      ],
    },
    {
      id: 'semantic',
      label: 'Semantic',
      referencesTier: 'palette',
      items: [
        {
          id: 'danger',
          cssVar: '--sd-danger',
          label: 'Danger',
          // Would derive to palette index 0 without the override above.
          default: 'p0',
          type: { kind: 'color' as const },
        },
      ],
    },
  ],
};

const SEMANTIC_DEFAULTS_CFG: PanelConfig = {
  storagePrefix: 'confirm-504-509',
  consoleNamespace: 'zudo',
  modalClassPrefix: 'confirm-504-509-modal',
  schemaId: 'confirm-504-509/v1',
  exportFilenameBase: 'confirm-504-509',
  tabs: [SEMANTIC_DEFAULTS_TAB],
  colorPresets: {},
};

describe('#504 x #509 — config-time semanticDefaults seed a fresh v4 slot for each mode identity', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('seeds the per-mode-literal default verbatim for the LIGHT identity with no persisted slot', () => {
    const cluster = getActivePrimaryCluster(SEMANTIC_DEFAULTS_CFG);
    setTheme('light');
    expect(getActiveColorIdentity(cluster, SEMANTIC_DEFAULTS_CFG)).toBe('mode-light');
    expect(hasActiveColorSlot(SEMANTIC_DEFAULTS_CFG, cluster)).toBe(false);

    const state = initColorFromScheme(cluster, SEMANTIC_DEFAULTS_CFG);
    expect(state.semanticMappings.danger).toEqual(perModeDanger);
  });

  it('seeds the SAME per-mode-literal default verbatim for the DARK identity with no persisted slot', () => {
    const cluster = getActivePrimaryCluster(SEMANTIC_DEFAULTS_CFG);
    setTheme('dark');
    expect(getActiveColorIdentity(cluster, SEMANTIC_DEFAULTS_CFG)).toBe('mode-dark');
    expect(hasActiveColorSlot(SEMANTIC_DEFAULTS_CFG, cluster)).toBe(false);

    const state = initColorFromScheme(cluster, SEMANTIC_DEFAULTS_CFG);
    expect(state.semanticMappings.danger).toEqual(perModeDanger);
  });
});
