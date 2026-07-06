// @vitest-environment jsdom

/**
 * #501 — the panel must scope its `color-scheme` clearing to values IT wrote.
 *
 * The host owns `<html style="color-scheme">` (its own theme toggle sets it so
 * `light-dark()` tokens resolve to the right arm). The panel writes
 * `color-scheme: light dark` ONLY when a per-mode literal is present. Its
 * mount-time / scheme-change / reset clear passes previously removed
 * `color-scheme` unconditionally, wiping the host-owned value and breaking the
 * host's theme toggle while the panel is open.
 *
 * The fix records per-instance ownership (keyed by `storagePrefix`, on the
 * shared globalThis registry so it outlives `destroy()` and survives Vite
 * module duplication) and gates every `document.documentElement` color-scheme
 * removal on it, plus a stale-value guard so a host overwrite is never wiped.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { __resetPanelConfigForTests, configurePanel, type PanelConfig } from '../config/panel-config';
import { FIXTURE_CLUSTER, FIXTURE_PANEL_CONFIG } from './_test-helpers';
import {
  applyFullState,
  clearAppliedColorStyles,
  clearAppliedStyles,
  initColorFromScheme,
  type ColorTweakState,
  type TweakState,
} from '../state/tweak-state';

function readColorScheme(): string {
  return document.documentElement.style.getPropertyValue('color-scheme');
}

/** Non-per-mode color state for the fixture cluster (index semantics only). */
function plainColorState(): ColorTweakState {
  return initColorFromScheme(FIXTURE_CLUSTER);
}

/**
 * Color state whose `accent` semantic is a per-mode `light-dark()` literal, so
 * the apply path writes `color-scheme: light dark` AND marks this instance as
 * its owner.
 */
function perModeColorState(): ColorTweakState {
  const base = initColorFromScheme(FIXTURE_CLUSTER);
  return {
    ...base,
    semanticMappings: {
      ...base.semanticMappings,
      accent: { literal: { light: '#ff0000', dark: '#990000' } },
    },
  };
}

function fullState(color: ColorTweakState): TweakState {
  return { color, spacing: {}, typography: {}, size: {} };
}

function cfgWithPrefix(prefix: string): PanelConfig {
  return { ...FIXTURE_PANEL_CONFIG, storagePrefix: prefix };
}

describe('#501 — color-scheme ownership (host-owned value is never wiped)', () => {
  beforeEach(() => {
    __resetPanelConfigForTests();
    document.documentElement.removeAttribute('style');
  });

  afterEach(() => {
    document.documentElement.removeAttribute('style');
    __resetPanelConfigForTests();
  });

  it('a host-owned color-scheme the panel never wrote survives applyFullState / clearAppliedColorStyles / clearAppliedStyles', () => {
    const cfg = cfgWithPrefix('wt-host');
    configurePanel(cfg);

    // Host owns <html style="color-scheme"> — the panel never wrote it.
    document.documentElement.style.setProperty('color-scheme', 'dark');

    // The common real-world trigger: reapplyPersistedOverrides → applyFullState
    // with a non-per-mode state. Must NOT wipe the host's value.
    applyFullState(fullState(plainColorState()), cfg);
    expect(readColorScheme()).toBe('dark');

    // The scheme-change clear path must not wipe it either.
    clearAppliedColorStyles(undefined, undefined, cfg);
    expect(readColorScheme()).toBe('dark');

    // Nor the full-reset path.
    clearAppliedStyles(undefined, cfg);
    expect(readColorScheme()).toBe('dark');
  });

  it('a panel-written color-scheme is still cleared correctly on the reset/clear paths', () => {
    const cfg = cfgWithPrefix('wt-owned');
    configurePanel(cfg);

    applyFullState(fullState(perModeColorState()), cfg);
    expect(readColorScheme()).toBe('light dark');

    clearAppliedStyles(undefined, cfg);
    expect(readColorScheme()).toBe('');
  });

  it('demoting the last per-mode row via applyFullState clears the panel-written value but leaves a later host value', () => {
    const cfg = cfgWithPrefix('wt-demote');
    configurePanel(cfg);

    // Panel writes color-scheme via a per-mode literal.
    applyFullState(fullState(perModeColorState()), cfg);
    expect(readColorScheme()).toBe('light dark');

    // Demote to a non-per-mode state — applyFullState's aggregate clear removes
    // the panel-written value (we own it, value still the sentinel).
    applyFullState(fullState(plainColorState()), cfg);
    expect(readColorScheme()).toBe('');

    // Now the host takes ownership. A subsequent non-per-mode reapply must not
    // wipe it (ownership was dropped when we cleared above).
    document.documentElement.style.setProperty('color-scheme', 'light');
    applyFullState(fullState(plainColorState()), cfg);
    expect(readColorScheme()).toBe('light');
  });

  describe('destroy / remount ownership survival', () => {
    it('ownership outlives destroy() → configurePanel() → remount clear', () => {
      const cfg = cfgWithPrefix('wt-destroy');
      const handle = configurePanel(cfg);

      // Panel writes a per-mode color-scheme.
      applyFullState(fullState(perModeColorState()), cfg);
      expect(readColorScheme()).toBe('light dark');

      // destroy() drops the registry record but NOT the inline style (unmount
      // never clears it) and NOT the ownership metadata.
      handle.destroy();
      expect(readColorScheme()).toBe('light dark');

      // Remount with the same storagePrefix, then reset. The clear removes the
      // panel-owned value precisely because ownership survived the destroy.
      configurePanel(cfg);
      clearAppliedStyles(undefined, cfg);
      expect(readColorScheme()).toBe('');
    });

    it('stale-ownership guard: a host overwrite between destroy and remount is left intact and the flag is dropped', () => {
      const cfg = cfgWithPrefix('wt-stale');
      const handle = configurePanel(cfg);

      applyFullState(fullState(perModeColorState()), cfg);
      expect(readColorScheme()).toBe('light dark');

      handle.destroy();
      // Host re-asserts its own color-scheme AFTER destroy (its value is not the
      // panel's `light dark` sentinel).
      document.documentElement.style.setProperty('color-scheme', 'dark');

      configurePanel(cfg);
      clearAppliedStyles(undefined, cfg);
      // Not removed — it is no longer the panel-written value.
      expect(readColorScheme()).toBe('dark');

      // Ownership was dropped, so a further clear is a no-op on the host value.
      clearAppliedStyles(undefined, cfg);
      expect(readColorScheme()).toBe('dark');
    });
  });

  describe('multi-instance scoping (#357)', () => {
    it("instance A's per-mode-literal write does not authorize instance B's clear", () => {
      const cfgA = cfgWithPrefix('inst-a');
      const cfgB = cfgWithPrefix('inst-b');
      configurePanel(cfgA);
      configurePanel(cfgB);

      // A writes a per-mode color-scheme to the shared :root.
      applyFullState(fullState(perModeColorState()), cfgA);
      expect(readColorScheme()).toBe('light dark');

      // B (which never wrote color-scheme) clears — must NOT remove A's value.
      // (B and A share the fixture cluster var names, so B's clear also strips
      // the shared palette/semantic vars; only the color-scheme scoping is
      // under test here.)
      clearAppliedColorStyles(undefined, undefined, cfgB);
      expect(readColorScheme()).toBe('light dark');

      // A's own clear removes it (A is the recorded owner).
      clearAppliedColorStyles(undefined, undefined, cfgA);
      expect(readColorScheme()).toBe('');
    });
  });
});
