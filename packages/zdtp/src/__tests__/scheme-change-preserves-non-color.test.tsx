// @vitest-environment jsdom

/**
 * #347 — a host light/dark toggle (`color-scheme-changed`) must NOT wipe the
 * user's spacing / typography / size tweaks from the live panel.
 *
 * Before the fix, `handleSchemeChange` called the bare `clearAppliedStyles()`
 * (which strips every spacing/font/size inline var too) and re-seeded the live
 * state with `freshTweakState()` (which empties those slices). The net effect
 * was that a light/dark toggle silently dropped non-color tweaks — the opposite
 * of the scheme-independence the global tweak model promises.
 *
 * This test seeds a persisted spacing override, opens the panel (which applies
 * the override to `:root`), dispatches `color-scheme-changed`, and asserts the
 * spacing inline var survives while the color cluster vars are cleared.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { __resetPanelConfigForTests, storageKey_visible } from '../config/panel-config';
import { getStorageKeyV3 } from '../state/tweak-state';
import { FIXTURE_PANEL_CONFIG, installFixturePanelConfig } from './_test-helpers';

/** Wait for Preact to flush effects + the scheme-change handler. */
async function waitForEffectFlush(): Promise<void> {
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
  await new Promise<void>((resolve) => setTimeout(resolve, 50));
}

/** A valid 16-slot color slice for the fixture cluster (paletteSize = 16). */
const palette16 = Array.from(
  { length: 16 },
  (_, i) => `#${i.toString(16).padStart(2, '0').repeat(3)}`,
);

const colorSlice = {
  palette: palette16,
  background: 0,
  foreground: 15,
  cursor: 6,
  selectionBg: 0,
  selectionFg: 15,
  semanticMappings: { accent: 6, muted: 8, active: 14 },
  shikiTheme: 'dracula',
};

function readVar(name: string): string {
  return document.documentElement.style.getPropertyValue(name);
}

describe('color-scheme-changed preserves non-color tweaks (#347)', () => {
  beforeEach(() => {
    installFixturePanelConfig();
    localStorage.clear();
    document.body.innerHTML = '';
    document.documentElement.removeAttribute('style');
    const adapterWin = window as unknown as Record<string, unknown>;
    delete adapterWin.__zudoDesignTokenPanelAdapter;
    delete adapterWin.__zudoDesignTokenPanelLifecycle;
  });

  afterEach(() => {
    document.body.innerHTML = '';
    document.documentElement.removeAttribute('style');
    localStorage.clear();
    __resetPanelConfigForTests();
  });

  it('keeps the applied spacing var and clears color vars on a scheme change', async () => {
    // Seed a persisted envelope with a spacing override + valid color slice.
    localStorage.setItem(
      getStorageKeyV3(),
      JSON.stringify({ color: colorSlice, spacing: { 'hsp-md': '24px' } }),
    );
    // Open the panel via the public adapter so the init effect runs
    // applyFullState() and writes the inline vars to :root.
    localStorage.setItem(storageKey_visible(FIXTURE_PANEL_CONFIG), '1');
    const { showDesignTokenPanel } = await import('../index');
    showDesignTokenPanel();
    await waitForEffectFlush();

    // Sanity: both the spacing override and a color palette var are applied.
    expect(readVar('--zd-spacing-hgap-md')).toBe('24px');
    expect(readVar('--fixture-p6')).not.toBe('');

    // Host toggles light/dark.
    window.dispatchEvent(new Event('color-scheme-changed'));
    await waitForEffectFlush();

    // Color cluster vars are cleared so the new scheme's stylesheet shows
    // through...
    expect(readVar('--fixture-p6')).toBe('');
    // ...but the scheme-independent spacing tweak is preserved (the #347 fix).
    expect(readVar('--zd-spacing-hgap-md')).toBe('24px');
  });
});
