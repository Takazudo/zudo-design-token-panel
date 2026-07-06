// @vitest-environment jsdom

/**
 * Scheme-change behavior for the per-scheme color persistence model (#500/#509),
 * plus the pre-existing #347 non-color-survival contract.
 *
 * Three properties are pinned here:
 *
 *  - #347 — a host light/dark toggle (`color-scheme-changed`) must NOT wipe the
 *    user's spacing / typography / size tweaks from the live panel. This is the
 *    scheme-INDEPENDENCE the global tweak model always promised; it survives the
 *    v4 per-scheme upgrade unchanged (the toggle clears + re-seeds only the color
 *    cluster vars). The color-var side of that test now reflects the NEW model:
 *    when the active identity has a persisted slot, the toggle RE-APPLIES it
 *    (instead of leaving the color vars cleared) so the overrides paint instead
 *    of drifting until the next edit — that drift was the #500 bug.
 *
 *  - Contract a (#500 clobber repro) — an edit while scheme A is active never
 *    modifies scheme B's stored color slice. The v4 merge-save preserves every
 *    inactive identity's slot.
 *
 *  - Contract b (round-trip survival) — tweak dark → toggle light → toggle dark
 *    restores the dark tweaks. The scheme-change handler loads + applies the new
 *    identity's persisted slot.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { __resetPanelConfigForTests, getPanelConfig, storageKey_visible } from '../config/panel-config';
import {
  getActivePrimaryCluster,
  getStorageKeyV3,
  getStorageKeyV4,
  loadPersistedState,
  savePersistedState,
  type ColorTweakState,
  type PersistedEnvelopeV4,
  type TweakState,
} from '../state/tweak-state';
import type { ColorScheme } from '../config/color-schemes';
import type { TabConfig } from '../tokens/tier-model';
import { FIXTURE_PANEL_CONFIG, FIXTURE_TABS, installFixturePanelConfig, flushEffects } from './_test-helpers';

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

  it('keeps the applied spacing var and re-applies the persisted color slot on a scheme change', async () => {
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
    await flushEffects();

    // Sanity: both the spacing override and a color palette var are applied.
    expect(readVar('--zd-spacing-hgap-md')).toBe('24px');
    expect(readVar('--fixture-p6')).toBe('#060606');

    // Host toggles light/dark. The fixture cluster has no light/dark modes
    // (colorMode: false), so its active identity is CONSTANT — the v3 payload
    // migrated to v4 under that one identity, so the toggle re-applies it.
    window.dispatchEvent(new Event('color-scheme-changed'));
    await flushEffects();

    // NEW model (#500/#509): the active identity has a persisted color slot, so
    // the toggle RE-APPLIES it rather than leaving the color vars cleared. (The
    // old global model left this at '' and let the next edit clobber the slice.)
    expect(readVar('--fixture-p6')).toBe('#060606');
    // ...and the scheme-independent spacing tweak is preserved (the #347 fix).
    expect(readVar('--zd-spacing-hgap-md')).toBe('24px');
  });
});

// ---------------------------------------------------------------------------
// Per-scheme (light/dark) fixture — the active identity actually changes on a
// data-theme toggle, so contracts a/b can exercise distinct persisted slots.
// ---------------------------------------------------------------------------

/** Distinct light/dark palettes so an applied slot is identifiable by value. */
const lightPalette = Array.from(
  { length: 16 },
  (_, i) => `#11${i.toString(16).padStart(2, '0')}11`,
) as unknown as ColorScheme['palette'];
const darkPalette = Array.from(
  { length: 16 },
  (_, i) => `#ee${i.toString(16).padStart(2, '0')}ee`,
) as unknown as ColorScheme['palette'];

const lightScheme: ColorScheme = {
  background: 0,
  foreground: 15,
  cursor: 6,
  selectionBg: 0,
  selectionFg: 15,
  palette: lightPalette,
  shikiTheme: 'dracula',
};
const darkScheme: ColorScheme = {
  background: 0,
  foreground: 15,
  cursor: 6,
  selectionBg: 0,
  selectionFg: 15,
  palette: darkPalette,
  shikiTheme: 'dracula',
};

/**
 * A color tab whose cluster distinguishes light/dark modes. `getActiveSchemeName`
 * (and therefore `getActiveColorIdentity`) resolves `mode-light` / `mode-dark`
 * from `document.documentElement`'s `data-theme`, so a toggle changes identity.
 */
const MODE_COLOR_TAB: TabConfig = {
  id: 'color',
  label: 'Color',
  colorExtras: {
    id: 'mode-fixture',
    label: 'Mode Fixture',
    baseRoles: {},
    baseDefaults: { background: 0, foreground: 15, cursor: 6, selectionBg: 0, selectionFg: 15 },
    defaultShikiTheme: 'dracula',
    colorSchemes: { 'mode-light': lightScheme, 'mode-dark': darkScheme },
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
        id: `modep${i}`,
        cssVar: `--modep${i}`,
        label: `Palette ${i}`,
        default: '#000000',
        type: { kind: 'color' as const },
      })),
    },
  ],
};

/** Non-color tabs from the shared fixture + the light/dark-aware color tab. */
const MODE_TABS: readonly TabConfig[] = [
  ...FIXTURE_TABS.filter((t) => t.id !== 'color'),
  MODE_COLOR_TAB,
];

function setTheme(mode: 'light' | 'dark'): void {
  document.documentElement.setAttribute('data-theme', mode);
}

/** Build a full runtime TweakState whose primary palette[0] is `p0`. */
function modeState(p0: string, spacing: Record<string, string> = {}): TweakState {
  const palette = Array.from({ length: 16 }, (_, i) => (i === 0 ? p0 : `#${i.toString(16).padStart(2, '0').repeat(3)}`));
  const color: ColorTweakState = {
    palette,
    background: 0,
    foreground: 15,
    cursor: 6,
    selectionBg: 0,
    selectionFg: 15,
    semanticMappings: {},
    shikiTheme: 'dracula',
  };
  return { color, spacing, typography: {}, size: {} };
}

describe('per-scheme color persistence — scheme change (#500/#509)', () => {
  beforeEach(() => {
    installFixturePanelConfig({ tabs: MODE_TABS });
    localStorage.clear();
    document.body.innerHTML = '';
    document.documentElement.removeAttribute('style');
    document.documentElement.removeAttribute('data-theme');
    const adapterWin = window as unknown as Record<string, unknown>;
    delete adapterWin.__zudoDesignTokenPanelAdapter;
    delete adapterWin.__zudoDesignTokenPanelLifecycle;
  });

  afterEach(() => {
    document.body.innerHTML = '';
    document.documentElement.removeAttribute('style');
    document.documentElement.removeAttribute('data-theme');
    localStorage.clear();
    __resetPanelConfigForTests();
  });

  function readV4(): PersistedEnvelopeV4 {
    return JSON.parse(localStorage.getItem(getStorageKeyV4())!) as PersistedEnvelopeV4;
  }

  it('contract a: an edit while scheme A is active never modifies scheme B\'s stored slice', () => {
    const cfg = getPanelConfig();

    // 1. Persist DARK overrides (custom dark palette[0]).
    setTheme('dark');
    savePersistedState(modeState('#dada00'), undefined, cfg);
    expect(readV4().color['mode-dark'].palette[0]).toBe('#dada00');

    // 2. Toggle to LIGHT — the light identity has no slot yet.
    setTheme('light');

    // 3. Edit an UNRELATED slice (spacing) while LIGHT is active. This is the
    //    literal #500 clobber trigger: an edit-driven whole-envelope save used
    //    to overwrite the reseeded light color over the persisted dark slice.
    savePersistedState(modeState('#0000ff', { 'hsp-md': '24px' }), undefined, cfg);

    const env = readV4();
    // The DARK slot is intact — the spacing edit under LIGHT did not touch it.
    expect(env.color['mode-dark'].palette[0]).toBe('#dada00');
    // The LIGHT slot + the global spacing edit landed.
    expect(env.color['mode-light'].palette[0]).toBe('#0000ff');
    expect(env.spacing['hsp-md']).toBe('24px');
  });

  it('contract b: tweak dark → toggle light → toggle dark restores the dark tweaks', async () => {
    const cfg = getPanelConfig();

    // Persist a CUSTOM dark slot (distinct from the dark scheme default so a
    // restore is distinguishable from a plain reseed).
    setTheme('dark');
    savePersistedState(modeState('#dada00'), undefined, cfg);

    // Mount the panel under DARK — the init effect loads + applies the slot.
    localStorage.setItem(storageKey_visible(FIXTURE_PANEL_CONFIG), '1');
    const { showDesignTokenPanel } = await import('../index');
    showDesignTokenPanel();
    await flushEffects();
    expect(readVar('--modep0')).toBe('#dada00');

    // Toggle to LIGHT — no light slot, so the color vars clear (the new scheme's
    // stylesheet would show through in a real browser).
    setTheme('light');
    window.dispatchEvent(new Event('color-scheme-changed'));
    await flushEffects();
    expect(readVar('--modep0')).toBe('');

    // Toggle back to DARK — the persisted dark slot is re-applied, not reseeded.
    setTheme('dark');
    window.dispatchEvent(new Event('color-scheme-changed'));
    await flushEffects();
    expect(readVar('--modep0')).toBe('#dada00');
  });
});

// ---------------------------------------------------------------------------
// #509 audit (epic #502 codex review) — two v4 edge cases the confirm pass
// (#510) did not exercise.
// ---------------------------------------------------------------------------

describe('#509 audit — first-open with a v4 envelope but no slot for the active identity', () => {
  beforeEach(() => {
    installFixturePanelConfig({ tabs: MODE_TABS });
    localStorage.clear();
    document.body.innerHTML = '';
    document.documentElement.removeAttribute('style');
    document.documentElement.removeAttribute('data-theme');
    const adapterWin = window as unknown as Record<string, unknown>;
    delete adapterWin.__zudoDesignTokenPanelAdapter;
    delete adapterWin.__zudoDesignTokenPanelLifecycle;
  });

  afterEach(() => {
    document.body.innerHTML = '';
    document.documentElement.removeAttribute('style');
    document.documentElement.removeAttribute('data-theme');
    localStorage.clear();
    __resetPanelConfigForTests();
  });

  it('applies the global non-color tweaks but lets the active scheme colors show through (no default paint)', async () => {
    const cfg = getPanelConfig();

    // Persist a DARK color slot + a GLOBAL (scheme-independent) spacing tweak.
    setTheme('dark');
    savePersistedState(modeState('#dada00', { 'hsp-md': '24px' }), undefined, cfg);

    // Open the panel under LIGHT — the light identity has NO color slot, yet a
    // v4 envelope exists (the dark slot + the global spacing).
    setTheme('light');
    localStorage.setItem(storageKey_visible(FIXTURE_PANEL_CONFIG), '1');
    const { showDesignTokenPanel } = await import('../index');
    showDesignTokenPanel();
    await flushEffects();

    // The scheme-independent spacing tweak IS applied.
    expect(readVar('--zd-spacing-hgap-md')).toBe('24px');
    // ...but NO color var is painted — the light scheme's own stylesheet shows
    // through. Pre-fix, first-open (and reapplyPersistedOverrides) called
    // applyFullState and painted the synthesized default light palette here.
    expect(readVar('--modep0')).toBe('');
  });
});

// A cluster whose single scheme — and therefore active identity — is literally
// named "palette", to exercise the v3/v4 discriminator collision.
const paletteIdentityScheme: ColorScheme = {
  background: 0,
  foreground: 15,
  cursor: 6,
  selectionBg: 0,
  selectionFg: 15,
  palette: Array.from(
    { length: 16 },
    (_, i) => `#22${i.toString(16).padStart(2, '0')}22`,
  ) as unknown as ColorScheme['palette'],
  shikiTheme: 'dracula',
};

const PALETTE_IDENTITY_COLOR_TAB: TabConfig = {
  id: 'color',
  label: 'Color',
  colorExtras: {
    id: 'palette-identity-fixture',
    label: 'Palette Identity Fixture',
    baseRoles: {},
    baseDefaults: { background: 0, foreground: 15, cursor: 6, selectionBg: 0, selectionFg: 15 },
    defaultShikiTheme: 'dracula',
    colorSchemes: { palette: paletteIdentityScheme },
    // colorMode: false → active identity is the constant scheme name "palette".
    panelSettings: { colorScheme: 'palette', colorMode: false },
  },
  tiers: [
    {
      id: 'palette',
      label: 'Palette',
      items: Array.from({ length: 16 }, (_, i) => ({
        id: `palidp${i}`,
        cssVar: `--palidp${i}`,
        label: `Palette ${i}`,
        default: '#000000',
        type: { kind: 'color' as const },
      })),
    },
  ],
};

const PALETTE_IDENTITY_TABS: readonly TabConfig[] = [
  ...FIXTURE_TABS.filter((t) => t.id !== 'color'),
  PALETTE_IDENTITY_COLOR_TAB,
];

describe('#509 audit — v4 envelope whose active identity is literally "palette"', () => {
  beforeEach(() => {
    installFixturePanelConfig({ tabs: PALETTE_IDENTITY_TABS });
    localStorage.clear();
    document.documentElement.removeAttribute('style');
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('style');
    __resetPanelConfigForTests();
  });

  it('round-trips the saved slot instead of misreading the v4 blob as a legacy v3 payload', () => {
    const cfg = getPanelConfig();

    // Save a custom slot under the "palette" identity → the v4 color map gets a
    // `palette` KEY whose value is a ColorTweakState OBJECT (not the v3 array).
    savePersistedState(modeState('#abcdef'), undefined, cfg);

    const env = JSON.parse(localStorage.getItem(getStorageKeyV4())!) as PersistedEnvelopeV4;
    expect(Array.isArray(env.color.palette)).toBe(false);
    expect((env.color.palette as ColorTweakState).palette[0]).toBe('#abcdef');

    // Load it back. Pre-fix, readV4Envelope rejected ANY `color.palette` key and
    // returned null (the slot was silently dropped); post-fix it discriminates
    // on the array shape, so the valid v4 envelope is read and the slot survives.
    const loaded = loadPersistedState(undefined, undefined, getActivePrimaryCluster(cfg), cfg);
    expect(loaded).not.toBeNull();
    expect(loaded!.color.palette[0]).toBe('#abcdef');
  });
});
