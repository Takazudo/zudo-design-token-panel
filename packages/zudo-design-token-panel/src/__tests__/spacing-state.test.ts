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
 * Spacing / typography / size sections:
 *   - v1 migration initialises them to empty maps (v1 only knew about color).
 *   - v2 payloads missing the sections hydrate to `{}` without warnings.
 *   - v2 payloads containing overrides pass them through unchanged.
 *   - Non-string values inside `spacing` are silently dropped (defensive
 *     hydration — we don't want a broken entry to crash the panel).
 *
 * Adapted from zudo-doc's upstream suite. The only rename is `font` →
 * `typography` to match the state envelope.
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
  semanticMappings: { accent: 6, muted: 8 },
  shikiTheme: 'dracula',
};

function makeColor(): ColorTweakState {
  return {
    palette: palette16.map((c) => c),
    background: 1,
    foreground: 14,
    cursor: 5,
    selectionBg: 2,
    selectionFg: 13,
    semanticMappings: { accent: 6, muted: 8 },
    shikiTheme: 'tokyo-night',
  };
}

let warnSpy: ReturnType<typeof vi.spyOn>;
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

describe('loadPersistedState — spacing / typography / size sections', () => {
  it('fills spacing / typography / size with empty maps when migrating from v1', () => {
    const v1 = makeColor();
    const storage = makeStorage({ [STORAGE_KEY_V1]: JSON.stringify(v1) });

    const result = loadPersistedState(storage, defaults);

    expect(result).not.toBeNull();
    expect(result!.spacing).toEqual({});
    expect(result!.typography).toEqual({});
    expect(result!.size).toEqual({});

    // Persisted v2 carries the empty sections so future loads stay stable.
    const persisted = JSON.parse(storage.entries[STORAGE_KEY_V2]);
    expect(persisted.spacing).toEqual({});
    expect(persisted.typography).toEqual({});
    expect(persisted.size).toEqual({});
  });

  it('hydrates v2 missing the new sections to empty maps (no warn)', () => {
    const v2 = { color: makeColor() }; // no spacing/typography/size keys
    const storage = makeStorage({ [STORAGE_KEY_V2]: JSON.stringify(v2) });

    const result = loadPersistedState(storage, defaults);

    expect(result).not.toBeNull();
    expect(result!.spacing).toEqual({});
    expect(result!.typography).toEqual({});
    expect(result!.size).toEqual({});
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('round-trips spacing overrides from v2', () => {
    const v2 = {
      color: makeColor(),
      spacing: { 'hsp-sm': '0.75rem', 'vsp-md': '2rem' },
      typography: {},
      size: {},
    };
    const storage = makeStorage({ [STORAGE_KEY_V2]: JSON.stringify(v2) });

    const result = loadPersistedState(storage, defaults);

    expect(result!.spacing).toEqual({ 'hsp-sm': '0.75rem', 'vsp-md': '2rem' });
  });

  it('drops non-string entries inside spacing (defensive hydration)', () => {
    const v2 = {
      color: makeColor(),
      spacing: { 'hsp-sm': '0.75rem', 'hsp-md': 42, bogus: null },
    };
    const storage = makeStorage({ [STORAGE_KEY_V2]: JSON.stringify(v2) });

    const result = loadPersistedState(storage, defaults);

    expect(result!.spacing).toEqual({ 'hsp-sm': '0.75rem' });
  });

  it('migrates legacy typography ids to the current main-site tiers', () => {
    // Payload written under the old id scheme (text-caption / text-body /
    // text-heading / text-display) should land on the new ids (text-xs /
    // text-base / text-3xl / text-5xl). text-micro has no main-site
    // equivalent and should be dropped silently.
    const v2 = {
      color: makeColor(),
      typography: {
        'text-micro': '0.8rem', // dropped
        'text-caption': '1rem',
        'text-small': '1.15rem',
        'text-body': '1.5rem',
        'text-subheading': '1.7rem',
        'text-heading': '3.4rem',
        'text-display': '5rem',
      },
    };
    const storage = makeStorage({ [STORAGE_KEY_V2]: JSON.stringify(v2) });

    const result = loadPersistedState(storage, defaults);

    expect(result!.typography).toEqual({
      'text-xs': '1rem',
      'text-sm': '1.15rem',
      'text-base': '1.5rem',
      'text-lg': '1.7rem',
      'text-3xl': '3.4rem',
      'text-5xl': '5rem',
    });
  });

  it('prefers the post-migration id when both legacy and current keys exist', () => {
    // If the user already tweaked text-base after migration and we still
    // see an ancient text-body value lingering in storage, the fresh one
    // wins — we must not clobber the user's post-rename edit.
    const v2 = {
      color: makeColor(),
      typography: {
        'text-body': '1.5rem', // legacy
        'text-base': '1.6rem', // current — wins
      },
    };
    const storage = makeStorage({ [STORAGE_KEY_V2]: JSON.stringify(v2) });

    const result = loadPersistedState(storage, defaults);

    expect(result!.typography).toEqual({ 'text-base': '1.6rem' });
  });
});
