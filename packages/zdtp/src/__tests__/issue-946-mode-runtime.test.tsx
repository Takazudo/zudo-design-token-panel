// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import DesignTokenTweakPanel from '../panel';
import { __resetInstanceBindingsForTests, reapplyPersistedOverrides } from '../index';
import {
  __resetPanelConfigForTests, configurePanel, ownsColorScheme, type PanelConfig,
} from '../config/panel-config';
import {
  applyColorSlices, applyFullState, applyManifestModeDefaults, applyNonColorSlices,
  clearAppliedColorStyles, clearAppliedStyles, getActivePrimaryCluster, getOpenKey,
  initColorFromScheme, initColorFromSchemeData, loadPersistedState, savePersistedState,
  type TweakState,
} from '../state/tweak-state';
import { buildApplyOverrides } from '../apply/build-apply-overrides';
import { deserialize, SCHEMA_V3 } from '../utils/design-token-serde';
import type { TabConfig, TierItem } from '../tokens/tier-model';
import type { ColorScheme } from '../config/color-schemes';
import { FIXTURE_PANEL_CONFIG } from './_test-helpers';

const PAIR = { light: 'rgb(10, 20, 30)', dark: 'oklch(0.8 0.1 240)' };
const CSS_PAIR = 'light-dark(rgb(10, 20, 30), oklch(0.8 0.1 240))';
const MODE_ITEM: TierItem = {
  id: 'surface', cssVar: '--mode-surface', label: 'Surface', default: '#abcdef',
  type: { kind: 'color' }, modes: PAIR,
};
const GENERIC_TAB: TabConfig = {
  id: 'theme', label: 'Theme', tiers: [{ id: 'raw', label: 'Raw', items: [
    MODE_ITEM,
    { id: 'plain', cssVar: '--mode-plain', label: 'Plain', default: '#fff', type: { kind: 'color' } },
  ] }],
};
const COLOR_EXTRAS = {
  id: 'mode-cluster', baseRoles: {}, baseDefaults: {}, defaultShikiTheme: '',
  colorSchemes: {}, panelSettings: { colorScheme: '', colorMode: false as const },
};

function config(tabs: readonly TabConfig[] = [GENERIC_TAB]): PanelConfig {
  return { ...FIXTURE_PANEL_CONFIG, storagePrefix: 'mode-runtime', tabs };
}

function freshState(cfg: PanelConfig): TweakState {
  return { color: initColorFromScheme(getActivePrimaryCluster(cfg), cfg),
    spacing: {}, typography: {}, size: {} };
}

const read = (name: string) => document.documentElement.style.getPropertyValue(name);
let container: HTMLDivElement;

beforeEach(() => {
  __resetInstanceBindingsForTests();
  __resetPanelConfigForTests();
  localStorage.clear();
  document.documentElement.removeAttribute('style');
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  act(() => render(null, container));
  container.remove();
  __resetInstanceBindingsForTests();
  __resetPanelConfigForTests();
  localStorage.clear();
  document.documentElement.removeAttribute('style');
  vi.restoreAllMocks();
});

describe('#946 — mode rows on the apply target', () => {
  it('initial full apply emits a generic row with no state.tabs and claims the fallback', () => {
    const cfg = config();
    configurePanel(cfg);
    document.documentElement.style.setProperty('--mode-plain', 'host-value');
    applyFullState(freshState(cfg), cfg);
    expect(read('--mode-surface')).toBe(CSS_PAIR);
    expect(read('color-scheme')).toBe('light dark');
    expect(ownsColorScheme(cfg.storagePrefix)).toBe(true);
    expect(read('--mode-plain')).toBe('host-value');
  });

  it('an override wins, and removing the tab state restores the manifest pair', () => {
    const cfg = config();
    configurePanel(cfg);
    const state = freshState(cfg);
    applyFullState(state, cfg);
    applyFullState({ ...state, tabs: { theme: { raw: { surface: '#abcdef' } } } }, cfg);
    expect(read('--mode-surface')).toBe('#abcdef');
    expect(read('color-scheme')).toBe('');
    expect(ownsColorScheme(cfg.storagePrefix)).toBe(false);
    applyFullState(state, cfg);
    expect(read('--mode-surface')).toBe(CSS_PAIR);
    expect(ownsColorScheme(cfg.storagePrefix)).toBe(true);
  });

  it('clear removes the mode pair and releases ownership, including an empty cluster wipe set', () => {
    const cfg = config();
    configurePanel(cfg);
    applyManifestModeDefaults(cfg);
    clearAppliedStyles([], cfg);
    expect(read('--mode-surface')).toBe('');
    expect(read('color-scheme')).toBe('');
    expect(ownsColorScheme(cfg.storagePrefix)).toBe(false);
  });

  it.each(['light', 'dark', 'light dark'])('preserves the host-owned %s declaration', (value) => {
    const cfg = config();
    configurePanel(cfg);
    document.documentElement.style.setProperty('color-scheme', value, 'important');
    document.documentElement.style.setProperty('--host', 'keep');
    applyManifestModeDefaults(cfg);
    applyFullState(freshState(cfg), cfg);
    clearAppliedStyles(undefined, cfg);
    expect(read('color-scheme')).toBe(value);
    expect(document.documentElement.style.getPropertyPriority('color-scheme')).toBe('important');
    expect(read('--host')).toBe('keep');
    expect(ownsColorScheme(cfg.storagePrefix)).toBe(false);
  });

  it('drops stale ownership when the host replaces the fallback', () => {
    const cfg = config();
    configurePanel(cfg);
    applyManifestModeDefaults(cfg);
    document.documentElement.style.setProperty('color-scheme', 'dark');
    applyManifestModeDefaults(cfg);
    expect(ownsColorScheme(cfg.storagePrefix)).toBe(false);
    clearAppliedStyles(undefined, cfg);
    expect(read('color-scheme')).toBe('dark');
  });

  it('routes cold/default/full apply and clear to the instance sink', () => {
    const values = new Map<string, string>();
    const cfg = { ...config(), applySink: {
      apply: vi.fn((pairs: ReadonlyArray<readonly [string, string]>) => {
        for (const [name, value] of pairs) values.set(name, value);
      }),
      clear: vi.fn((names: readonly string[]) => { for (const name of names) values.delete(name); }),
    } };
    configurePanel(cfg);
    applyManifestModeDefaults(cfg);
    expect(values.get('--mode-surface')).toBe(CSS_PAIR);
    applyFullState(freshState(cfg), cfg);
    expect(values.get('--mode-surface')).toBe(CSS_PAIR);
    expect(values.get('color-scheme')).toBe('light dark');
    expect(ownsColorScheme(cfg.storagePrefix)).toBe(true);
    expect(document.documentElement.getAttribute('style')).toBeNull();
    clearAppliedStyles([], cfg);
    expect(values.size).toBe(0);
    expect(ownsColorScheme(cfg.storagePrefix)).toBe(false);
  });

  it('keeps generic mode rows and their scheme through a color-only clear/reapply', () => {
    const cfg = config();
    configurePanel(cfg);
    const state = freshState(cfg);
    applyFullState(state, cfg);
    clearAppliedColorStyles(undefined, undefined, cfg);
    applyColorSlices(state.color, undefined, cfg);
    expect(read('--mode-surface')).toBe(CSS_PAIR);
    expect(read('color-scheme')).toBe('light dark');
    expect(ownsColorScheme(cfg.storagePrefix)).toBe(true);
  });

  it('does not write readonly modes', () => {
    const cfg = config([{ ...GENERIC_TAB, tiers: [{ id: 'raw', label: 'Raw',
      items: [{ ...MODE_ITEM, readonly: true }] }] }]);
    configurePanel(cfg);
    applyManifestModeDefaults(cfg);
    applyFullState(freshState(cfg), cfg);
    expect(read('--mode-surface')).toBe('');
    expect(ownsColorScheme(cfg.storagePrefix)).toBe(false);
  });
});

describe('#946 — color cluster mode defaults and real overrides', () => {
  const colorTab: TabConfig = {
    id: 'color', label: 'Color', colorExtras: COLOR_EXTRAS, tiers: [
      { id: 'palette', label: 'Palette', items: [{ ...MODE_ITEM, id: 'p0', cssVar: '--mode-p0' }] },
      { id: 'semantic', label: 'Semantic', semantic: true, items: [MODE_ITEM] },
    ],
  };

  it('seeds both dense palette and semantic modes, and emits matching live/disk values', () => {
    const cfg = config([colorTab]);
    configurePanel(cfg);
    const cluster = getActivePrimaryCluster(cfg);
    const state = freshState(cfg);
    expect(state.color.palette).toEqual([CSS_PAIR]);
    expect(state.color.semanticMappings.surface).toEqual({ literal: PAIR });
    applyFullState(state, cfg);
    const disk = buildApplyOverrides(state, state.color, cluster, cfg.tabs);
    expect(disk['--mode-p0']).toBe(CSS_PAIR);
    expect(disk['--mode-surface']).toBe(CSS_PAIR);
    expect(read('--mode-p0')).toBe(disk['--mode-p0']);
    expect(read('--mode-surface')).toBe(disk['--mode-surface']);
    expect(read('color-scheme')).toBe('light dark');
    const seeded = initColorFromSchemeData({
      background: 0, foreground: 15, cursor: 7, selectionBg: 0, selectionFg: 15,
      palette: Array.from({ length: 16 }, () => '#ffffff') as ColorScheme['palette'],
    }, cluster);
    expect(seeded.palette[0]).toBe(CSS_PAIR);
  });

  it('preserves explicit imported palette/semantic overrides and mode pairs through persistence', () => {
    const cfg = config([colorTab]);
    configurePanel(cfg);
    const baseline = freshState(cfg).color;
    const imported = deserialize({ $schema: SCHEMA_V3, tabs: { color: {
      palette: { '--mode-p0': '#123456' },
      semantic: { '--mode-surface': { literal: '#654321' } },
    } } }, { colorDefaults: baseline }, cfg);
    expect(imported.warnings).toEqual([]);
    savePersistedState(imported.state, localStorage, cfg);
    const restored = loadPersistedState(localStorage, undefined, getActivePrimaryCluster(cfg), cfg)!;
    applyFullState(restored, cfg);
    expect(read('--mode-p0')).toBe('#123456');
    expect(read('--mode-surface')).toBe('#654321');
    expect(read('color-scheme')).toBe('');
    const disk = buildApplyOverrides(restored, baseline, getActivePrimaryCluster(cfg), cfg.tabs);
    expect(disk['--mode-p0']).toBe('#123456');
    expect(disk['--mode-surface']).toBe('#654321');

    const modeImport = deserialize({ $schema: SCHEMA_V3, tabs: { color: {
      palette: { '--mode-p0': CSS_PAIR },
    } } }, { colorDefaults: baseline }, cfg);
    expect(modeImport.state.color.palette).toEqual([CSS_PAIR]);
    savePersistedState(modeImport.state, localStorage, cfg);
    const modeRestored = loadPersistedState(localStorage, undefined, getActivePrimaryCluster(cfg), cfg)!;
    expect(modeRestored.color.palette).toEqual([CSS_PAIR]);
  });

  it('the missing-color-slot reapply paints only modes and independent overrides', () => {
    const generic: TabConfig = { ...GENERIC_TAB, tiers: [{ id: 'raw', label: 'Raw',
      items: [{ ...MODE_ITEM, cssVar: '--generic-surface' }] }] };
    const cfg = config([colorTab, generic]);
    configurePanel(cfg);
    const state = freshState(cfg);
    document.documentElement.style.setProperty('--host', 'keep');
    applyNonColorSlices({ ...state, tabs: { theme: { raw: { surface: '#123456' } } } }, cfg);
    expect(read('--mode-p0')).toBe(CSS_PAIR);
    expect(read('--mode-surface')).toBe(CSS_PAIR);
    expect(read('--generic-surface')).toBe('#123456');
    expect(read('--host')).toBe('keep');
  });

  it('applies and clears explicit modes outside the first palette and semantic tiers', () => {
    const cfg = config([{ ...colorTab, tiers: [...colorTab.tiers, {
      id: 'extra', label: 'Extra', items: [{ ...MODE_ITEM, id: 'extra', cssVar: '--mode-extra' }],
    }] }]);
    configurePanel(cfg);
    const state = freshState(cfg);
    applyFullState(state, cfg);
    expect(read('--mode-extra')).toBe(CSS_PAIR);
    expect(buildApplyOverrides(state, state.color, getActivePrimaryCluster(cfg), cfg.tabs)['--mode-extra'])
      .toBe(CSS_PAIR);
    clearAppliedStyles(undefined, cfg);
    expect(read('--mode-extra')).toBe('');
  });
});

describe('#946 — panel lifecycle', () => {
  it('bootstrap reapply writes manifest modes without persisted state or an open panel', () => {
    const cfg = config();
    configurePanel(cfg);
    document.documentElement.style.setProperty('--mode-plain', 'host-value');
    reapplyPersistedOverrides();
    expect(read('--mode-surface')).toBe(CSS_PAIR);
    expect(read('--mode-plain')).toBe('host-value');
    expect(localStorage.length).toBe(0);
  });

  it('first open and the actual Reset All action restore modes without writing plain defaults', async () => {
    const cfg = config();
    configurePanel(cfg);
    localStorage.setItem(getOpenKey(cfg), '1');
    document.documentElement.style.setProperty('--host', 'keep');
    await act(async () => render(<DesignTokenTweakPanel instanceConfig={cfg} />, container));
    expect(read('--mode-surface')).toBe(CSS_PAIR);
    const reset = Array.from(container.querySelectorAll<HTMLElement>('[role="button"]'))
      .find((element) => element.textContent === 'Reset');
    expect(reset).toBeDefined();
    document.documentElement.style.setProperty('--mode-surface', '#123456');
    await act(async () => reset!.click());
    expect(read('--mode-surface')).toBe(CSS_PAIR);
    expect(read('--mode-plain')).toBe('');
    expect(read('--host')).toBe('keep');
    expect(read('color-scheme')).toBe('light dark');
    expect(ownsColorScheme(cfg.storagePrefix)).toBe(true);
  });
});
