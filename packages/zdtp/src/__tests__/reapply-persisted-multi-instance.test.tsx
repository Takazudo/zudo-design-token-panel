// @vitest-environment jsdom

/**
 * reapplyPersistedOverrides must apply persisted CSS vars for EVERY registered
 * instance — the panel's own persisted-state apply effect is gated on `open`,
 * so a hidden instance's overrides are only ever applied by this module-level
 * reapply path. A default-only reapply silently drops every non-default
 * instance's overrides after an Astro lifecycle page load (codex review
 * finding on #439; sibling of the #449 lifecycle loops).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { reapplyPersistedOverrides, __resetInstanceBindingsForTests } from '../index';
import {
  __resetPanelConfigForTests,
  configurePanel,
  type PanelConfig,
  type TabConfig,
} from '../config/panel-config';
import { getStorageKeyV3, type ColorTweakState } from '../state/tweak-state';

const palette16 = Array.from(
  { length: 16 },
  (_, i) => `#${i.toString(16).padStart(2, '0').repeat(3)}`,
);

function makeColor(): ColorTweakState {
  return {
    palette: [...palette16],
    background: 1,
    foreground: 14,
    cursor: 5,
    selectionBg: 2,
    selectionFg: 13,
    semanticMappings: { accent: 6, muted: 8 },
    shikiTheme: 'tokyo-night',
  };
}

function spacingTab(cssVar: string): TabConfig {
  return {
    id: 'spacing',
    label: 'Spacing',
    tiers: [
      {
        id: 'raw',
        label: 'Raw',
        items: [
          {
            id: 'gap',
            cssVar,
            label: 'gap',
            default: '4px',
            type: { kind: 'length', step: 1, unit: 'px' },
          },
        ],
      },
    ],
  };
}

function makeConfig(prefix: string, tabs: TabConfig[]): PanelConfig {
  return {
    storagePrefix: prefix,
    consoleNamespace: prefix,
    modalClassPrefix: `${prefix}-modal`,
    schemaId: `${prefix}/v1`,
    exportFilenameBase: prefix,
    tabs,
  };
}

let warnSpy: ReturnType<typeof vi.spyOn>;

describe('reapplyPersistedOverrides — multi-instance', () => {
  beforeEach(() => {
    __resetInstanceBindingsForTests();
    __resetPanelConfigForTests();
    localStorage.clear();
    document.documentElement.removeAttribute('style');
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
    __resetInstanceBindingsForTests();
    __resetPanelConfigForTests();
    localStorage.clear();
    document.documentElement.removeAttribute('style');
  });

  it('applies persisted overrides for every registered instance, not just the default', () => {
    const cfgA = makeConfig('zdtp-multi-a', [spacingTab('--a-gap')]);
    const cfgB = makeConfig('zdtp-multi-b', [spacingTab('--b-gap')]);
    configurePanel(cfgA);
    // B is configured last → it is the "current" instance getPanelConfig()
    // resolves to; A is the non-default instance the old code dropped.
    configurePanel(cfgB);

    localStorage.setItem(
      getStorageKeyV3(cfgA),
      JSON.stringify({ color: makeColor(), spacing: { gap: '42px' } }),
    );
    localStorage.setItem(
      getStorageKeyV3(cfgB),
      JSON.stringify({ color: makeColor(), spacing: { gap: '7px' } }),
    );

    reapplyPersistedOverrides();

    const rootStyle = document.documentElement.style;
    expect(rootStyle.getPropertyValue('--a-gap')).toBe('42px');
    expect(rootStyle.getPropertyValue('--b-gap')).toBe('7px');
  });

  it('still applies the default instance in the pre-configure bootstrap path', () => {
    // No configurePanel call: registry is empty, fallback covers the default.
    // Nothing persisted → must be a silent no-op (no throw).
    expect(() => reapplyPersistedOverrides()).not.toThrow();
  });
});
