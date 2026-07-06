// @vitest-environment jsdom

/**
 * Integration round-trip test for the Palette tab (#396).
 *
 * Covers:
 *   1. Configure panel with a grouped palette TabConfig.
 *   2. Apply an Edit-mode change (simulate what persistTab does).
 *   3. Verify --palette-{group}-{n} CSS custom properties land on :root.
 *   4. savePersistedState + loadPersistedState round-trip rehydrates
 *      state.tabs['palette'] identically.
 *   5. Export/import (serialize + deserialize) via the generic serde path
 *      (palette NOT in RESERVED_TAB_IDS in design-token-serde.ts).
 *   6. Verifies 'palette' is absent from RESERVED_TAB_IDS in serde.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act } from 'preact/test-utils';

import {
  __resetPanelConfigForTests,
  configurePanel,
  type PanelConfig,
} from '../config/panel-config';
import {
  applyFullState,
  getStorageKeyV4,
  loadPersistedState,
  savePersistedState,
  type TweakState,
} from '../state/tweak-state';
import { serialize, deserialize, SCHEMA_V2 } from '../utils/design-token-serde';
import { FIXTURE_CLUSTER } from './_test-helpers';
import type { TabConfig } from '../tokens/tier-model';

// ---------------------------------------------------------------------------
// Fixture: grouped palette TabConfig (two groups, two steps each)
// ---------------------------------------------------------------------------

const PALETTE_TAB: TabConfig = {
  id: 'palette',
  label: 'Palette',
  // colorExtras intentionally omitted — resolveColorClusterFromTab only runs
  // when colorExtras is present; omitting it keeps multiple kind:'color' tiers safe.
  tiers: [
    {
      id: 'warm',
      label: 'Warm',
      items: [
        {
          id: 'warm-1',
          cssVar: '--palette-warm-1',
          label: 'Warm 1',
          default: 'oklch(80% 0.12 50)',
          type: { kind: 'color', format: 'oklch' },
        },
        {
          id: 'warm-2',
          cssVar: '--palette-warm-2',
          label: 'Warm 2',
          default: 'oklch(60% 0.18 45)',
          type: { kind: 'color', format: 'oklch' },
        },
      ],
    },
    {
      id: 'cool',
      label: 'Cool',
      items: [
        {
          id: 'cool-1',
          cssVar: '--palette-cool-1',
          label: 'Cool 1',
          default: 'oklch(75% 0.14 240)',
          type: { kind: 'color', format: 'oklch' },
        },
        {
          id: 'cool-2',
          cssVar: '--palette-cool-2',
          label: 'Cool 2',
          default: 'oklch(55% 0.20 260)',
          type: { kind: 'color', format: 'oklch' },
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Panel config + minimal color state for the fixture cluster
// ---------------------------------------------------------------------------

const PALETTE_PANEL_CONFIG: PanelConfig = {
  storagePrefix: 'zdtp-palette-integ',
  consoleNamespace: 'zdtp-palette-integ',
  modalClassPrefix: 'zdtp-palette-integ-modal',
  schemaId: 'zudo-design-tokens/v1',
  exportFilenameBase: 'palette-integ-tokens',
  tabs: [PALETTE_TAB],
  colorPresets: {},
};

function makeFreshColorState() {
  const paletteSize = FIXTURE_CLUSTER.paletteSize;
  const palette = Array.from({ length: paletteSize }, (_, i) =>
    i === 0 ? '#000000' : i === paletteSize - 1 ? '#ffffff' : '#808080',
  );
  return {
    palette,
    background: 0,
    foreground: 15,
    cursor: 6,
    selectionBg: 0,
    selectionFg: 15,
    semanticMappings: { accent: 6, muted: 8, active: 14 },
    shikiTheme: 'dracula' as const,
  };
}

function makeFreshState(tabOverrides?: Record<string, Record<string, string>>): TweakState {
  return {
    color: makeFreshColorState(),
    spacing: {},
    typography: {},
    size: {},
    tabs: tabOverrides
      ? { palette: tabOverrides }
      : undefined,
  };
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

// In-memory localStorage substitute
class MemStorage {
  private map: Record<string, string> = {};
  getItem(key: string): string | null { return this.map[key] ?? null; }
  setItem(key: string, value: string): void { this.map[key] = value; }
  removeItem(key: string): void { delete this.map[key]; }
  clear(): void { this.map = {}; }
}

let storage: MemStorage;

beforeEach(() => {
  __resetPanelConfigForTests();
  configurePanel(PALETTE_PANEL_CONFIG);
  storage = new MemStorage();
  document.documentElement.removeAttribute('style');
});

afterEach(() => {
  document.documentElement.removeAttribute('style');
  __resetPanelConfigForTests();
});

// ---------------------------------------------------------------------------
// 1. Apply-mode: palette CSS vars land on :root
// ---------------------------------------------------------------------------

describe('palette-tab integration — apply path writes CSS vars to :root', () => {
  it('applies --palette-warm-1 override to document.documentElement', () => {
    const state = makeFreshState({ warm: { 'warm-1': 'oklch(0.9 0.05 50)' } });

    act(() => {
      applyFullState(state, PALETTE_PANEL_CONFIG);
    });

    const val = document.documentElement.style.getPropertyValue('--palette-warm-1');
    expect(val).toBe('oklch(0.9 0.05 50)');
  });

  it('applies multiple vars across both groups simultaneously', () => {
    const state = makeFreshState({
      warm: { 'warm-1': 'oklch(0.9 0.05 50)', 'warm-2': 'oklch(0.7 0.1 45)' },
      cool: { 'cool-1': 'oklch(0.8 0.12 240)', 'cool-2': 'oklch(0.6 0.15 260)' },
    });

    act(() => {
      applyFullState(state, PALETTE_PANEL_CONFIG);
    });

    expect(document.documentElement.style.getPropertyValue('--palette-warm-1')).toBe('oklch(0.9 0.05 50)');
    expect(document.documentElement.style.getPropertyValue('--palette-warm-2')).toBe('oklch(0.7 0.1 45)');
    expect(document.documentElement.style.getPropertyValue('--palette-cool-1')).toBe('oklch(0.8 0.12 240)');
    expect(document.documentElement.style.getPropertyValue('--palette-cool-2')).toBe('oklch(0.6 0.15 260)');
  });

  it('clears the inline property when an override is removed (default reasserts)', () => {
    // First apply with an override
    const stateWith = makeFreshState({ warm: { 'warm-1': 'oklch(0.9 0.05 50)' } });
    act(() => {
      applyFullState(stateWith, PALETTE_PANEL_CONFIG);
    });
    expect(document.documentElement.style.getPropertyValue('--palette-warm-1')).toBe('oklch(0.9 0.05 50)');

    // Apply with palette tab present but the specific item override removed.
    // When state.tabs['palette'] is an empty tier map, applyTabOverridesFlat
    // runs for the palette tab with no overrides → removes the inline property.
    const stateWithout = makeFreshState({ warm: {}, cool: {} });
    act(() => {
      applyFullState(stateWithout, PALETTE_PANEL_CONFIG);
    });
    expect(document.documentElement.style.getPropertyValue('--palette-warm-1')).toBe('');
  });
});

// ---------------------------------------------------------------------------
// 2. Persist + reload round-trip rehydrates state.tabs['palette']
// ---------------------------------------------------------------------------

describe('palette-tab integration — persist + reload rehydrates overrides', () => {
  it('savePersistedState + loadPersistedState round-trips palette overrides', () => {
    const overrides = {
      warm: { 'warm-1': 'oklch(0.9 0.05 50)' },
      cool: { 'cool-1': 'oklch(0.7 0.12 240)' },
    };
    const state = makeFreshState(overrides);

    savePersistedState(state, storage, PALETTE_PANEL_CONFIG);

    // Verify the storage key was written (v4 per-scheme envelope, #500/#509).
    const storageKey = getStorageKeyV4(PALETTE_PANEL_CONFIG);
    const raw = storage.getItem(storageKey);
    expect(raw).not.toBeNull();

    // Reload from storage
    const loaded = loadPersistedState(storage, undefined, FIXTURE_CLUSTER, PALETTE_PANEL_CONFIG);
    expect(loaded).not.toBeNull();

    // tabs['palette'] should be identical to what we saved
    expect(loaded!.tabs?.['palette']).toBeDefined();
    expect(loaded!.tabs!['palette']['warm']['warm-1']).toBe('oklch(0.9 0.05 50)');
    expect(loaded!.tabs!['palette']['cool']['cool-1']).toBe('oklch(0.7 0.12 240)');
  });

  it('after reload, applying loaded state writes vars to :root', () => {
    const state = makeFreshState({ warm: { 'warm-2': 'oklch(0.5 0.2 30)' } });

    savePersistedState(state, storage, PALETTE_PANEL_CONFIG);
    const loaded = loadPersistedState(storage, undefined, FIXTURE_CLUSTER, PALETTE_PANEL_CONFIG);
    expect(loaded).not.toBeNull();

    act(() => {
      applyFullState(loaded!, PALETTE_PANEL_CONFIG);
    });

    expect(document.documentElement.style.getPropertyValue('--palette-warm-2')).toBe('oklch(0.5 0.2 30)');
  });

  it('simulated reload: Edit-mode change → switch to Check → reload → CSS vars present', () => {
    // Step 1: User makes an Edit-mode change (simulate persistTab)
    const afterEdit = makeFreshState({
      warm: { 'warm-1': 'oklch(0.85 0.08 55)', 'warm-2': 'oklch(0.65 0.14 48)' },
      cool: { 'cool-2': 'oklch(0.45 0.18 265)' },
    });

    // Apply (Edit mode = apply state to DOM + save to storage)
    act(() => {
      applyFullState(afterEdit, PALETTE_PANEL_CONFIG);
    });
    savePersistedState(afterEdit, storage, PALETTE_PANEL_CONFIG);

    // Verify vars are live on :root after edit
    expect(document.documentElement.style.getPropertyValue('--palette-warm-1')).toBe('oklch(0.85 0.08 55)');

    // Step 2: User switches to Check mode (no state change; the same state applies)
    // No DOM change needed — PaletteCheckView reads overrides from props.

    // Step 3: Simulate reload — clear :root inline styles and re-load from storage
    document.documentElement.removeAttribute('style');
    const reloaded = loadPersistedState(storage, undefined, FIXTURE_CLUSTER, PALETTE_PANEL_CONFIG);
    expect(reloaded).not.toBeNull();

    act(() => {
      applyFullState(reloaded!, PALETTE_PANEL_CONFIG);
    });

    // Assert CSS custom properties are back on :root
    expect(document.documentElement.style.getPropertyValue('--palette-warm-1')).toBe('oklch(0.85 0.08 55)');
    expect(document.documentElement.style.getPropertyValue('--palette-warm-2')).toBe('oklch(0.65 0.14 48)');
    expect(document.documentElement.style.getPropertyValue('--palette-cool-2')).toBe('oklch(0.45 0.18 265)');

    // And state.tabs['palette'] matches
    expect(reloaded!.tabs?.['palette']?.['warm']?.['warm-1']).toBe('oklch(0.85 0.08 55)');
    expect(reloaded!.tabs?.['palette']?.['cool']?.['cool-2']).toBe('oklch(0.45 0.18 265)');
  });
});

// ---------------------------------------------------------------------------
// 3. Export/import (serialize + deserialize) via the generic serde path
//    Palette is NOT in RESERVED_TAB_IDS in design-token-serde.ts, so it
//    round-trips through the generic state.tabs['palette'] path.
// ---------------------------------------------------------------------------

describe('palette-tab integration — serde export/import round-trip (generic path)', () => {
  it('serialize emits palette overrides under tabs.palette.raw', () => {
    const state = makeFreshState({
      warm: { 'warm-1': 'oklch(0.9 0.05 50)' },
      cool: { 'cool-2': 'oklch(0.5 0.18 265)' },
    });

    const json = serialize(state, undefined, PALETTE_PANEL_CONFIG);

    expect(json.$schema).toBe(SCHEMA_V2);
    expect(json.tabs).toBeDefined();
    // Palette is a GENERIC tab — round-trips under tabs['palette'].raw
    expect(json.tabs!['palette']).toBeDefined();
    expect(json.tabs!['palette']['raw']).toBeDefined();
    expect(json.tabs!['palette']['raw']['--palette-warm-1']).toBe('oklch(0.9 0.05 50)');
    expect(json.tabs!['palette']['raw']['--palette-cool-2']).toBe('oklch(0.5 0.18 265)');
  });

  it('serialize does NOT emit palette under reserved slices (color / spacing / font / size)', () => {
    const state = makeFreshState({ warm: { 'warm-1': 'oklch(0.9 0.05 50)' } });
    const json = serialize(state, undefined, PALETTE_PANEL_CONFIG);

    // color slice must not contain palette-warm vars
    const colorSlice = json.tabs?.['color'];
    if (colorSlice) {
      const paletteSlice = colorSlice['palette'];
      if (paletteSlice) {
        expect(Object.keys(paletteSlice)).not.toContain('--palette-warm-1');
      }
    }

    // spacing / font / size must not contain palette vars either
    expect(json.tabs?.['spacing']).toBeUndefined();
    expect(json.tabs?.['font']).toBeUndefined();
    expect(json.tabs?.['size']).toBeUndefined();
  });

  it('deserialize restores palette overrides into state.tabs[palette]', () => {
    const original = makeFreshState({
      warm: { 'warm-1': 'oklch(0.9 0.05 50)', 'warm-2': 'oklch(0.7 0.1 45)' },
      cool: { 'cool-1': 'oklch(0.8 0.12 240)' },
    });

    const json = serialize(original, undefined, PALETTE_PANEL_CONFIG);
    const { state: restored, unknownTokens, warnings } = deserialize(json, undefined, PALETTE_PANEL_CONFIG);

    expect(unknownTokens).toHaveLength(0);
    expect(warnings).toHaveLength(0);

    // Restored palette overrides should match originals
    expect(restored.tabs?.['palette']).toBeDefined();
    expect(restored.tabs!['palette']['warm']['warm-1']).toBe('oklch(0.9 0.05 50)');
    expect(restored.tabs!['palette']['warm']['warm-2']).toBe('oklch(0.7 0.1 45)');
    expect(restored.tabs!['palette']['cool']['cool-1']).toBe('oklch(0.8 0.12 240)');
  });

  it('export → import yields identical overrides (full round-trip symmetry)', () => {
    const original = makeFreshState({
      warm: { 'warm-1': 'oklch(0.9 0.05 50)', 'warm-2': 'oklch(0.7 0.1 45)' },
      cool: { 'cool-1': 'oklch(0.8 0.12 240)', 'cool-2': 'oklch(0.5 0.18 265)' },
    });

    const json = serialize(original, undefined, PALETTE_PANEL_CONFIG);
    const { state: restored } = deserialize(json, undefined, PALETTE_PANEL_CONFIG);

    // Apply both states and compare the CSS vars on :root
    act(() => { applyFullState(original, PALETTE_PANEL_CONFIG); });
    const warm1Original = document.documentElement.style.getPropertyValue('--palette-warm-1');
    const cool2Original = document.documentElement.style.getPropertyValue('--palette-cool-2');

    document.documentElement.removeAttribute('style');

    act(() => { applyFullState(restored, PALETTE_PANEL_CONFIG); });
    const warm1Restored = document.documentElement.style.getPropertyValue('--palette-warm-1');
    const cool2Restored = document.documentElement.style.getPropertyValue('--palette-cool-2');

    expect(warm1Restored).toBe(warm1Original);
    expect(cool2Restored).toBe(cool2Original);
  });

  it('unknown cssVar in import payload surfaces in unknownTokens (no crash)', () => {
    const payload = {
      $schema: SCHEMA_V2,
      exportedAt: new Date().toISOString(),
      tabs: {
        palette: {
          raw: {
            '--palette-warm-1': 'oklch(0.9 0.05 50)',
            '--palette-does-not-exist': 'oklch(0.5 0.1 100)',
          },
        },
      },
    };

    const { state: restored, unknownTokens } = deserialize(payload, undefined, PALETTE_PANEL_CONFIG);
    expect(unknownTokens).toContain('--palette-does-not-exist');
    // The known override should still land
    expect(restored.tabs?.['palette']?.['warm']?.['warm-1']).toBe('oklch(0.9 0.05 50)');
  });
});

// ---------------------------------------------------------------------------
// 4. Verify 'palette' is NOT in RESERVED_TAB_IDS in the serde module
//    (palette round-trips through the generic state.tabs path, not a dedicated slice)
// ---------------------------------------------------------------------------

describe('palette-tab integration — serde RESERVED_TAB_IDS check', () => {
  it('palette overrides are NOT emitted under a dedicated color serde slice when tab id is palette', () => {
    // The key signal: if palette were in RESERVED_TAB_IDS, the serde would
    // skip it in the generic loop AND it would only appear under the color
    // slice — which doesn't handle palette-{group} vars. The override would
    // be silently dropped on export/import.
    //
    // Here we verify the round-trip is lossless, proving palette goes through
    // the generic path.
    const state = makeFreshState({
      warm: { 'warm-1': 'oklch(0.8 0.1 55)' },
    });

    const json = serialize(state, undefined, PALETTE_PANEL_CONFIG);
    const { state: restored, unknownTokens } = deserialize(json, undefined, PALETTE_PANEL_CONFIG);

    // If palette were in RESERVED_TAB_IDS, this override would be missing
    expect(unknownTokens).toHaveLength(0);
    expect(restored.tabs?.['palette']?.['warm']?.['warm-1']).toBe('oklch(0.8 0.1 55)');
  });
});
