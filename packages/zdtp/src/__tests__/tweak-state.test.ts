import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ZDTP_LEGACY_TYPOGRAPHY_RENAME_MAP,
  getStorageKeyV1,
  getStorageKeyV2,
  getStorageKeyV3,
  type ColorTweakState,
  type StorageLike,
  loadPersistedState,
} from '../state/tweak-state';
import { __resetPanelConfigForTests } from '../config/panel-config';
import { installFixturePanelConfig } from './_test-helpers';

/**
 * v1→v3 and v2→v3 migration tests.
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
let STORAGE_KEY_V3 = '';

beforeEach(() => {
  installFixturePanelConfig();
  STORAGE_KEY_V1 = getStorageKeyV1();
  STORAGE_KEY_V2 = getStorageKeyV2();
  STORAGE_KEY_V3 = getStorageKeyV3();
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  __resetPanelConfigForTests();
  warnSpy.mockRestore();
});

describe('loadPersistedState — v1→v3 and v2→v3 migrations', () => {
  it('returns null when nothing is stored (fresh defaults)', () => {
    const storage = makeStorage();
    const result = loadPersistedState(storage, defaults);
    expect(result).toBeNull();
  });

  it('loads a valid v1 state and writes it to v3, deleting v1', () => {
    const v1 = makeV1();
    const storage = makeStorage({ [STORAGE_KEY_V1]: JSON.stringify(v1) });

    const result = loadPersistedState(storage, defaults);

    expect(result).not.toBeNull();
    expect(result!.color.background).toBe(1);
    expect(result!.color.foreground).toBe(14);
    expect(result!.color.shikiTheme).toBe('tokyo-night');
    expect(result!.color.palette).toEqual(v1.palette);

    // v3 was written, v1 was removed.
    expect(storage.entries[STORAGE_KEY_V3]).toBeDefined();
    expect(storage.entries[STORAGE_KEY_V1]).toBeUndefined();

    const persisted = JSON.parse(storage.entries[STORAGE_KEY_V3]);
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
    // v3 written
    expect(storage.entries[STORAGE_KEY_V3]).toBeDefined();
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

  it('migrates v2 to v3 when only v2 is present', () => {
    const v2 = { color: { ...makeV1({ shikiTheme: 'v2-theme' }) } };
    const storage = makeStorage({ [STORAGE_KEY_V2]: JSON.stringify(v2) });

    const result = loadPersistedState(storage, defaults);

    expect(result).not.toBeNull();
    expect(result!.color.shikiTheme).toBe('v2-theme');
    // v3 written, v2 removed
    expect(storage.entries[STORAGE_KEY_V3]).toBeDefined();
    expect(storage.entries[STORAGE_KEY_V2]).toBeUndefined();
  });

  it('prefers v3 over v2 when both are present', () => {
    const v2 = { color: { ...makeV1({ shikiTheme: 'v2-theme' }) } };
    const v3 = { color: { ...makeV1({ shikiTheme: 'v3-theme' }) } };
    const storage = makeStorage({
      [STORAGE_KEY_V2]: JSON.stringify(v2),
      [STORAGE_KEY_V3]: JSON.stringify(v3),
    });

    const result = loadPersistedState(storage, defaults);

    expect(result).not.toBeNull();
    expect(result!.color.shikiTheme).toBe('v3-theme');
    // v2 was NOT touched (v3 wins means we don't run migration)
    expect(storage.entries[STORAGE_KEY_V2]).toBeDefined();
  });

  it('prefers v3 over v1 when both are present', () => {
    const v1 = makeV1({ shikiTheme: 'v1-theme' });
    const v3 = { color: { ...makeV1({ shikiTheme: 'v3-theme' }) } };
    const storage = makeStorage({
      [STORAGE_KEY_V1]: JSON.stringify(v1),
      [STORAGE_KEY_V3]: JSON.stringify(v3),
    });

    const result = loadPersistedState(storage, defaults);

    expect(result).not.toBeNull();
    expect(result!.color.shikiTheme).toBe('v3-theme');
    // v1 was NOT touched (v3 wins means we don't run migration)
    expect(storage.entries[STORAGE_KEY_V1]).toBeDefined();
  });

  it('fills in missing semantic keys from defaults when v3 state predates them', () => {
    // Simulate a v3 state written by an older build that did not yet know
    // about `price` / `sold` / `active`. The persisted semanticMappings has
    // the old keys only; loading it should backfill the new keys from the
    // caller-supplied defaults rather than leaving them undefined (which
    // would blow up `applyColorState`).
    const legacyV3 = {
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
    const storage = makeStorage({ [STORAGE_KEY_V3]: JSON.stringify(legacyV3) });

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

  it('preserves a user-remapped active mapping through v1 → v3 migration', () => {
    // User remapped `active` away from the default p14 before upgrading. The
    // migration must preserve their choice, not overwrite with defaults.
    const v1 = makeV1({ semanticMappings: { accent: 6, muted: 8, active: 5 } });
    const storage = makeStorage({ [STORAGE_KEY_V1]: JSON.stringify(v1) });

    const result = loadPersistedState(storage, defaults);

    expect(result).not.toBeNull();
    expect(result!.color.semanticMappings.active).toBe(5);
    // v3 written, v1 removed.
    expect(storage.entries[STORAGE_KEY_V3]).toBeDefined();
    expect(storage.entries[STORAGE_KEY_V1]).toBeUndefined();
  });

  it('falls back to v2 when v3 is malformed, migrating v2 to v3', () => {
    const v2 = { color: makeV1({ shikiTheme: 'v2-theme' }) };
    const storage = makeStorage({
      [STORAGE_KEY_V2]: JSON.stringify(v2),
      [STORAGE_KEY_V3]: '{broken',
    });

    const result = loadPersistedState(storage, defaults);

    expect(result).not.toBeNull();
    expect(result!.color.shikiTheme).toBe('v2-theme');
    expect(warnSpy).toHaveBeenCalled();
    // v2 migrated → v2 deleted, v3 overwritten
    expect(storage.entries[STORAGE_KEY_V2]).toBeUndefined();
    expect(storage.entries[STORAGE_KEY_V3]).toBeDefined();
  });

  it('falls back to v1 when v3 and v2 are both malformed', () => {
    const v1 = makeV1();
    const storage = makeStorage({
      [STORAGE_KEY_V1]: JSON.stringify(v1),
      [STORAGE_KEY_V2]: '{broken',
      [STORAGE_KEY_V3]: '{broken',
    });

    const result = loadPersistedState(storage, defaults);

    expect(result).not.toBeNull();
    expect(result!.color.shikiTheme).toBe(v1.shikiTheme);
    expect(warnSpy).toHaveBeenCalled();
    // migration ran successfully → v1 deleted, v3 written
    expect(storage.entries[STORAGE_KEY_V1]).toBeUndefined();
    expect(storage.entries[STORAGE_KEY_V3]).toBeDefined();
  });

  it('round-trips tabs overrides through v3 storage', () => {
    const v3 = {
      color: makeV1(),
      tabs: {
        easing: {
          raw: { 'ease-in': 'cubic-bezier(0.42, 0, 1, 1)' },
          semantic: { 'tab-open': 'ease-in' },
        },
      },
    };
    const storage = makeStorage({ [STORAGE_KEY_V3]: JSON.stringify(v3) });

    const result = loadPersistedState(storage, defaults);

    expect(result).not.toBeNull();
    expect(result!.tabs).toBeDefined();
    expect(result!.tabs!['easing']).toBeDefined();
    expect(result!.tabs!['easing']['raw']).toEqual({ 'ease-in': 'cubic-bezier(0.42, 0, 1, 1)' });
    expect(result!.tabs!['easing']['semantic']).toEqual({ 'tab-open': 'ease-in' });
  });

  it('migrates v2 that has no tabs field — tabs is undefined after migration', () => {
    const v2 = {
      color: makeV1(),
      spacing: { 'hsp-md': '20px' },
    };
    const storage = makeStorage({ [STORAGE_KEY_V2]: JSON.stringify(v2) });

    const result = loadPersistedState(storage, defaults);

    expect(result).not.toBeNull();
    expect(result!.spacing).toEqual({ 'hsp-md': '20px' });
    // No tabs — absent field, not empty object, since we only add it when non-empty
    expect(result!.tabs).toBeUndefined();
    // v3 was written, v2 removed
    expect(storage.entries[STORAGE_KEY_V3]).toBeDefined();
    expect(storage.entries[STORAGE_KEY_V2]).toBeUndefined();
  });
});

/**
 * Typography-id rename behaviour — driven by `PanelConfig.legacyIdRenameMap`.
 *
 * Pre-issue-#51 the migration map was hard-coded inside `loadPersistedState`,
 * which silently corrupted hosts whose canonical manifest ids happened to
 * match the "old" labels (e.g. `zudo-doc`'s `text-caption` was IS the
 * stable id, not a legacy one). The map is now an opt-in config field;
 * these tests pin both ends of that contract.
 */
describe('loadPersistedState — typography rename map (configurable)', () => {
  /** Build a minimal v3 envelope with a single typography override. */
  function makeV3WithTypography(typography: Record<string, string>): string {
    return JSON.stringify({
      color: makeV1(),
      typography,
    });
  }

  it('with NO legacyIdRenameMap configured: preserves stable ids verbatim (issue #51 regression)', () => {
    // Default fixture config has no `legacyIdRenameMap` → empty rename map.
    // A host whose canonical manifest id happens to be `text-caption` MUST
    // see their override survive verbatim instead of being remapped to a
    // non-existent id and silently dropped.
    const storage = makeStorage({
      [STORAGE_KEY_V3]: makeV3WithTypography({ 'text-caption': '0.9rem' }),
    });

    const result = loadPersistedState(storage, defaults);

    expect(result).not.toBeNull();
    expect(result!.typography).toEqual({ 'text-caption': '0.9rem' });
  });

  it('with legacyIdRenameMap = ZDTP_LEGACY_TYPOGRAPHY_RENAME_MAP: applies the historical rename', () => {
    installFixturePanelConfig({ legacyIdRenameMap: { ...ZDTP_LEGACY_TYPOGRAPHY_RENAME_MAP } });
    STORAGE_KEY_V3 = getStorageKeyV3();

    const storage = makeStorage({
      [STORAGE_KEY_V3]: makeV3WithTypography({
        'text-caption': '0.9rem',
        'text-body': '1.4rem',
      }),
    });

    const result = loadPersistedState(storage, defaults);

    expect(result).not.toBeNull();
    expect(result!.typography['text-xs']).toBe('0.9rem');
    expect(result!.typography['text-base']).toBe('1.4rem');
    // Old ids are gone after the rename — only the new ids carry the value.
    expect(result!.typography['text-caption']).toBeUndefined();
    expect(result!.typography['text-body']).toBeUndefined();
  });

  it('with a custom partial map: only specified keys are renamed; others pass through', () => {
    installFixturePanelConfig({
      legacyIdRenameMap: { 'old-only-key': 'new-key' },
    });
    STORAGE_KEY_V3 = getStorageKeyV3();

    const storage = makeStorage({
      [STORAGE_KEY_V3]: makeV3WithTypography({
        'old-only-key': '1rem',
        'unrelated-key': '2rem',
      }),
    });

    const result = loadPersistedState(storage, defaults);

    expect(result).not.toBeNull();
    expect(result!.typography['new-key']).toBe('1rem');
    expect(result!.typography['unrelated-key']).toBe('2rem');
    expect(result!.typography['old-only-key']).toBeUndefined();
  });

  it('when both old and new ids are present: new id wins (post-migration tweak preserved)', () => {
    installFixturePanelConfig({ legacyIdRenameMap: { ...ZDTP_LEGACY_TYPOGRAPHY_RENAME_MAP } });
    STORAGE_KEY_V3 = getStorageKeyV3();

    const storage = makeStorage({
      [STORAGE_KEY_V3]: makeV3WithTypography({
        'text-caption': 'OLD',
        'text-xs': 'NEW',
      }),
    });

    const result = loadPersistedState(storage, defaults);

    expect(result).not.toBeNull();
    expect(result!.typography['text-xs']).toBe('NEW');
  });

  it('exports ZDTP_LEGACY_TYPOGRAPHY_RENAME_MAP with the documented historical mappings', () => {
    // Pin the constant's contents so the opt-in stays stable. text-micro
    // maps to null (drop) — its historical "no main-site equivalent"
    // semantic — so opt-in callers get the full original behaviour.
    expect(ZDTP_LEGACY_TYPOGRAPHY_RENAME_MAP).toEqual({
      'text-caption': 'text-xs',
      'text-small': 'text-sm',
      'text-body': 'text-base',
      'text-subheading': 'text-lg',
      'text-heading': 'text-3xl',
      'text-display': 'text-5xl',
      'text-micro': null,
    });
  });

  it('with legacyIdRenameMap value of null: drops the legacy id entirely (no dead persistence)', () => {
    // Without drop semantics, a stray legacy id (e.g. text-micro) survives
    // every save round-trip as dead localStorage data: applyTokenOverrides
    // silently ignores ids missing from the active manifest, but every
    // save writes the dead key back to disk. Mapping to `null` ensures the
    // hydrate step purges it once and never persists it again.
    installFixturePanelConfig({ legacyIdRenameMap: { 'text-micro': null } });
    STORAGE_KEY_V3 = getStorageKeyV3();

    const storage = makeStorage({
      [STORAGE_KEY_V3]: makeV3WithTypography({
        'text-micro': '0.7rem',
        'text-base': '1rem',
      }),
    });

    const result = loadPersistedState(storage, defaults);

    expect(result).not.toBeNull();
    expect(result!.typography['text-micro']).toBeUndefined();
    expect(result!.typography['text-base']).toBe('1rem');
  });

  it('persists the renamed envelope back to v3 so legacy ids do not survive (issue #51 codex finding)', () => {
    // The migration must be DURABLE: rewriting in-memory only would leave
    // legacy keys on disk indefinitely, and a host that later removes the
    // opt-in rename map would regress every user back to non-applying
    // overrides on the next reload.
    installFixturePanelConfig({ legacyIdRenameMap: { ...ZDTP_LEGACY_TYPOGRAPHY_RENAME_MAP } });
    STORAGE_KEY_V3 = getStorageKeyV3();

    const storage = makeStorage({
      [STORAGE_KEY_V3]: makeV3WithTypography({
        'text-caption': '0.9rem',
        'text-micro': '0.6rem',
      }),
    });

    loadPersistedState(storage, defaults);

    const rewritten = JSON.parse(storage.entries[STORAGE_KEY_V3]!) as {
      typography: Record<string, string>;
    };
    expect(rewritten.typography['text-xs']).toBe('0.9rem');
    expect(rewritten.typography['text-caption']).toBeUndefined();
    expect(rewritten.typography['text-micro']).toBeUndefined();
  });

  it('does NOT rewrite storage when the typography slice is unchanged (no spurious writes)', () => {
    // Guard against writeback churn for hosts whose payload already matches
    // the canonical envelope — every reload would otherwise touch storage.
    installFixturePanelConfig({ legacyIdRenameMap: {} });
    STORAGE_KEY_V3 = getStorageKeyV3();

    const original = makeV3WithTypography({ 'text-caption': '0.9rem' });
    const storage = makeStorage({ [STORAGE_KEY_V3]: original });

    loadPersistedState(storage, defaults);

    expect(storage.entries[STORAGE_KEY_V3]).toBe(original);
  });

  it('rejects prototype-chain payload keys as rename targets (Object.hasOwn guard)', () => {
    // A payload key like `toString` / `constructor` / `hasOwnProperty`
    // would match an inherited Object.prototype method under a `k in
    // renameMap` check and corrupt the rename target. The Object.hasOwn
    // guard ensures only own-property keys participate in the rename.
    installFixturePanelConfig({ legacyIdRenameMap: { 'text-caption': 'text-xs' } });
    STORAGE_KEY_V3 = getStorageKeyV3();

    const storage = makeStorage({
      [STORAGE_KEY_V3]: makeV3WithTypography({
        toString: '1rem',
        constructor: '2rem',
        'text-caption': '0.9rem',
      }),
    });

    const result = loadPersistedState(storage, defaults);

    expect(result).not.toBeNull();
    expect(result!.typography['toString']).toBe('1rem');
    expect(result!.typography['constructor']).toBe('2rem');
    expect(result!.typography['text-xs']).toBe('0.9rem');
  });
});
