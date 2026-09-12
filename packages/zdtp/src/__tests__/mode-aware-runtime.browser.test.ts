// @vitest-environment browser
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { __resetPanelConfigForTests, configurePanel, type PanelConfig, type PanelInstanceHandle } from '../config/panel-config';
import { applyFullState, applyManifestModeDefaults, clearAppliedStyles, getActivePrimaryCluster, initColorFromScheme, type TweakState } from '../state/tweak-state';

let rootStyle: string | null;
let host: HTMLDivElement;
let handle: PanelInstanceHandle | undefined;
const token = '--mode-browser-surface';
const light = 'rgb(12, 34, 56)';
const dark = 'rgb(210, 220, 230)';

function config(customSink: boolean): PanelConfig {
  return {
    storagePrefix: `mode-browser-${customSink}`, consoleNamespace: 'modeBrowser',
    modalClassPrefix: 'mode-browser-modal', schemaId: 'mode-browser/v1',
    exportFilenameBase: 'mode-browser', colorPresets: {},
    tabs: [{ id: 'theme', label: 'Theme', tiers: [{ id: 'raw', label: 'Raw', items: [{
      id: 'surface', label: 'Surface', cssVar: token, default: '#abcdef',
      type: { kind: 'color' }, modes: { light, dark },
    }] }] }],
    ...(customSink ? { applySink: {
      apply: (pairs: ReadonlyArray<readonly [string, string]>) => {
        for (const [name, value] of pairs) host.style.setProperty(name, value);
      },
      clear: (names: readonly string[]) => {
        for (const name of names) host.style.removeProperty(name);
      },
    } } : {}),
  };
}

beforeEach(() => {
  __resetPanelConfigForTests();
  rootStyle = document.documentElement.getAttribute('style');
  host = document.createElement('div');
  document.body.append(host);
});
afterEach(() => {
  handle?.destroy();
  handle = undefined;
  host.remove();
  if (rootStyle === null) document.documentElement.removeAttribute('style');
  else document.documentElement.setAttribute('style', rootStyle);
  __resetPanelConfigForTests();
});

describe('manifest modes resolve on real apply targets', () => {
  it.each([false, true])('keeps both sides through apply, overrides and reset (custom sink: %s)', (customSink) => {
    const cfg = config(customSink);
    handle = configurePanel(cfg);
    const root = document.documentElement;
    const target = customSink ? host : root;
    // A host-owned root scheme must survive all document-target lifecycle calls.
    root.style.colorScheme = 'dark';
    const sample = document.createElement('div');
    sample.style.backgroundColor = `var(${token})`;
    host.append(sample);
    const state: TweakState = {
      color: initColorFromScheme(getActivePrimaryCluster(cfg), cfg),
      spacing: {}, typography: {}, size: {},
    };
    const expectBothSides = () => {
      for (const [scheme, color] of [['light', light], ['dark', dark]]) {
        // A sink writes its scheme to its target; a consumer may choose either side.
        if (customSink) sample.style.colorScheme = scheme;
        else root.style.colorScheme = scheme;
        expect(getComputedStyle(sample).backgroundColor).toBe(color);
      }
    };
    applyManifestModeDefaults(cfg);
    expectBothSides();
    applyFullState(state, cfg);
    expectBothSides();
    applyFullState({ ...state, tabs: { theme: { raw: { surface: '#123456' } } } }, cfg);
    expect(getComputedStyle(sample).backgroundColor).toBe('rgb(18, 52, 86)');
    // Reset's clear-then-manifest sequence restores the pair, not the fallback.
    clearAppliedStyles(undefined, cfg);
    applyManifestModeDefaults(cfg);
    expectBothSides();
    clearAppliedStyles(undefined, cfg);
    expect(target.style.getPropertyValue(token)).toBe('');
    expect(root.style.colorScheme).toBe('dark');
    if (customSink) {
      expect(root.style.getPropertyValue(token)).toBe('');
      expect(host.style.colorScheme).toBe('');
    }
  });
});
