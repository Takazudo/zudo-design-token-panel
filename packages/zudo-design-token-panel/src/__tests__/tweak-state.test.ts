import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getStorageKeyV1,
  getStorageKeyV2,
  type ColorTweakState,
  type StorageLike,
  loadPersistedState,
} from '../state/tweak-state';
import { __resetPanelConfigForTests } from '../config/panel-config';
import { installFixturePanelConfig } from './_test-helpers';

/**
 * v1→v2 migration tests.
 *
 * We use an in-memory storage double so the tests run in node without a DOM.
 * The color defaults are injected explicitly so the migration does not need to
 * resolve the active scheme (which depends on `document`).
 *
 * Adapted from zudo-doc's upstream suite. Palette size and shape are identical
 * (16-slot `ColorTweakState`); semantic-mapping key names are free-form so the
 * fixtures keep the upstream `accent` / `muted` names for readability.
 */

function makeStorage(initial: Record<string, string> = {}): StorageLike & {
  entries: Record<string, string>;
} {
  const entries: Record<string, string> = { ...initial };
  return {
    entries,
    getItem: (k) => (k in entries ? entries[k] : null),
    setItem: (k, v) => {
      entries[k] = v;
    },
    removeItem: (k) => {
      delete entries[k];
    },
  };
}

const palette16 = Array.from(
  { length: 16 },
  (_, i) => `#${i.toString(16).padStart(2, '0').repeat(3)}`,
);

const defaults: ColorTweakState = {
  palette: palette16,
  background: 0,
  foreground: 15,
  cursor: 6,
  selectionBg: 0,
  selectionFg: 15,
  semanticMappings: { accent: 6, muted: 8, active: 14 },
  shikiTheme: 'dracula',
};

function makeV1(overrides?: Partial<ColorTweakState>): ColorTweakState {
  return {
    palette: palette16.map((c) => c),
    background: 1,
    foreground: 14,
    cursor: 5,
    selectionBg: 2,
    selectionFg: 13,
    semanticMappings: { accent: 6, muted: 8, active: 14 },
    shikiTheme: 'tokyo-night',
    ...overrides,
  };
}

let warnSpy: ReturnType<typeof vi.spyOn>;
// Storage keys are derived from the active panel config and re-resolved per
// test (the fixture cluster has paletteSize=16 so the migration / hydration
// helpers accept the 16-slot fixtures below).
let STORAGE_KEY_V1 = '';
let STORAGE_KEY_V2 = '';

beforeEach(() => {
  installFixturePanelConfig();
  STORAGE_KEY_V1 = getStorageKeyV1();
  STORAGE_KEY_V2 = getStorageKeyV2();
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  __resetPanelConfigForTests();
  warnSpy.mockRestore();
});

describe('loadPersistedState — v1→v2 migration', () => {
  it('returns null when nothing is stored (fresh defaults)', () => {
    const storage = makeStorage();
    const result = loadPersistedState(storage, defaults);
    expect(result).toBeNull();
  });

  it('loads a valid v1 state and writes it to v2, deleting v1', () => {
    const v1 = makeV1();
    const storage = makeStorage({ [STORAGE_KEY_V1]: JSON.stringify(v1) });

    const result = loadPersistedState(storage, defaults);

    expect(result).not.toBeNull();
    expect(result!.color.background).toBe(1);
    expect(result!.color.foreground).toBe(14);
    expect(result!.color.shikiTheme).toBe('tokyo-night');
    expect(result!.color.palette).toEqual(v1.palette);

    // v2 was written, v1 was removed.
    expect(storage.entries[STORAGE_KEY_V2]).toBeDefined();
    expect(storage.entries[STORAGE_KEY_V1]).toBeUndefined();

    const persisted = JSON.parse(storage.entries[STORAGE_KEY_V2]);
    expect(persisted.color.background).toBe(1);
    expect(persisted.color.shikiTheme).toBe('tokyo-night');
  });

  it('fills in missing fields from defaults on a partial v1 state', () => {
    // v1 missing shikiTheme + semanticMappings — still has the required 16-item palette & numeric indices
    const partial = {
      palette: palette16,
      background: 2,
      foreground: 13,
      cursor: 4,
      selectionBg: 0,
      selectionFg: 15,
      semanticMappings: {}, // empty object — still valid shape
    } as ColorTweakState;
    const storage = makeStorage({ [STORAGE_KEY_V1]: JSON.stringify(partial) });

    const result = loadPersistedState(storage, defaults);

    expect(result).not.toBeNull();
    expect(result!.color.background).toBe(2);
    // missing shikiTheme filled from defaults
    expect(result!.color.shikiTheme).toBe(defaults.shikiTheme);
    // missing semantic keys filled from defaults
    expect(result!.color.semanticMappings.accent).toBe(defaults.semanticMappings.accent);
    // v2 written
    expect(storage.entries[STORAGE_KEY_V2]).toBeDefined();
    // v1 removed
    expect(storage.entries[STORAGE_KEY_V1]).toBeUndefined();
  });

  it('returns null and removes v1 when v1 JSON is corrupt', () => {
    const storage = makeStorage({ [STORAGE_KEY_V1]: '{not valid json' });

    const result = loadPersistedState(storage, defaults);

    expect(result).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
    expect(storage.entries[STORAGE_KEY_V1]).toBeUndefined();
  });

  it('prefers v2 when both v1 and v2 are present', () => {
    const v1 = makeV1({ shikiTheme: 'v1-theme' });
    const v2 = { color: { ...makeV1({ shikiTheme: 'v2-theme' }) } };
    const storage = makeStorage({
      [STORAGE_KEY_V1]: JSON.stringify(v1),
      [STORAGE_KEY_V2]: JSON.stringify(v2),
    });

    const result = loadPersistedState(storage, defaults);

    expect(result).not.toBeNull();
    expect(result!.color.shikiTheme).toBe('v2-theme');
    // v1 was NOT touched (v2 wins means we don't run migration)
    expect(storage.entries[STORAGE_KEY_V1]).toBeDefined();
  });

  it('fills in missing semantic keys from defaults when v2 state predates them', () => {
    // Simulate a v2 state written by an older build that did not yet know
    // about `price` / `sold` / `active`. The persisted semanticMappings has
    // the old keys only; loading it should backfill the new keys from the
    // caller-supplied defaults rather than leaving them undefined (which
    // would blow up `applyColorState`).
    const legacyV2 = {
      color: {
        palette: palette16,
        background: 1,
        foreground: 14,
        cursor: 5,
        selectionBg: 2,
        selectionFg: 13,
        // Missing `price` / `sold` / `active` on purpose.
        semanticMappings: { accent: 6, muted: 8 },
        shikiTheme: 'tokyo-night',
      },
    };
    const freshDefaults: ColorTweakState = {
      ...defaults,
      semanticMappings: {
        ...defaults.semanticMappings,
        price: 12,
        sold: 13,
        active: 14,
      },
    };
    const storage = makeStorage({ [STORAGE_KEY_V2]: JSON.stringify(legacyV2) });

    const result = loadPersistedState(storage, freshDefaults);

    expect(result).not.toBeNull();
    // User-persisted values preserved.
    expect(result!.color.background).toBe(1);
    expect(result!.color.semanticMappings.accent).toBe(6);
    // New keys hydrated from defaults — this is what protects users who
    // upgrade into a build that added new semantic tokens.
    expect(result!.color.semanticMappings.price).toBe(12);
    expect(result!.color.semanticMappings.sold).toBe(13);
    expect(result!.color.semanticMappings.active).toBe(14);
  });

  it('preserves a user-remapped active mapping through v1 → v2 migration', () => {
    // User remapped `active` away from the default p14 before upgrading. The
    // migration must preserve their choice, not overwrite with defaults.
    const v1 = makeV1({ semanticMappings: { accent: 6, muted: 8, active: 5 } });
    const storage = makeStorage({ [STORAGE_KEY_V1]: JSON.stringify(v1) });

    const result = loadPersistedState(storage, defaults);

    expect(result).not.toBeNull();
    expect(result!.color.semanticMappings.active).toBe(5);
    // v2 written, v1 removed.
    expect(storage.entries[STORAGE_KEY_V2]).toBeDefined();
    expect(storage.entries[STORAGE_KEY_V1]).toBeUndefined();
  });

  it('falls back to v1 when v2 is malformed (with console.warn)', () => {
    const v1 = makeV1();
    const storage = makeStorage({
      [STORAGE_KEY_V1]: JSON.stringify(v1),
      [STORAGE_KEY_V2]: '{broken',
    });

    const result = loadPersistedState(storage, defaults);

    expect(result).not.toBeNull();
    expect(result!.color.shikiTheme).toBe(v1.shikiTheme);
    expect(warnSpy).toHaveBeenCalled();
    // migration ran successfully → v1 deleted, v2 overwritten
    expect(storage.entries[STORAGE_KEY_V1]).toBeUndefined();
    expect(storage.entries[STORAGE_KEY_V2]).toBeDefined();
  });
});
