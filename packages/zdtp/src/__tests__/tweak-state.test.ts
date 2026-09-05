import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ZDTP_LEGACY_TYPOGRAPHY_RENAME_MAP,
  clearPersistedState,
  getActivePrimaryCluster,
  getStorageKeyV1,
  getStorageKeyV2,
  getStorageKeyV3,
  getStorageKeyV4,
  getDockKey,
  getDockSizeKey,
  hasActiveColorSlot,
  initColorFromSchemeData,
  initSecondaryDefaults,
  type ColorTweakState,
  type PersistedEnvelopeV4,
  type StorageLike,
  type TweakState,
  loadPersistedState,
  savePersistedState,
  loadDockMode,
  loadDockSize,
  saveDockMode,
  saveDockSize,
} from '../state/tweak-state';
import type { ColorScheme } from '../config/color-schemes';
import type { ColorClusterDataConfig } from '../config/cluster-config';
import { __resetPanelConfigForTests, resolveSecondaryColorCluster } from '../config/panel-config';
import type { TabConfig } from '../tokens/tier-model';
import { installFixturePanelConfig, FIXTURE_CLUSTER, FIXTURE_TABS } from './_test-helpers';

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
let STORAGE_KEY_V4 = '';

beforeEach(() => {
  installFixturePanelConfig();
  STORAGE_KEY_V1 = getStorageKeyV1();
  STORAGE_KEY_V2 = getStorageKeyV2();
  STORAGE_KEY_V3 = getStorageKeyV3();
  STORAGE_KEY_V4 = getStorageKeyV4();
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  __resetPanelConfigForTests();
  warnSpy.mockRestore();
});

describe('dock preference persistence', () => {
  it('loads and saves the dock mode under the instance prefix', () => {
    const storage = makeStorage();
    saveDockMode('bottom', undefined, storage);
    expect(storage.getItem(getDockKey())).toBe('bottom');
    expect(loadDockMode(undefined, storage)).toBe('bottom');
  });

  it('falls back to float for unknown dock modes', () => {
    const storage = makeStorage({ [getDockKey()]: 'sideways' });
    expect(loadDockMode(undefined, storage)).toBe('float');
  });

  it('loads and saves independent right and bottom dock sizes', () => {
    const storage = makeStorage();
    saveDockSize({ right: 512, bottom: 376 }, undefined, storage);
    expect(JSON.parse(storage.getItem(getDockSizeKey())!)).toEqual({ right: 512, bottom: 376 });
    expect(loadDockSize(undefined, storage)).toEqual({ right: 512, bottom: 376 });
  });

  it('repairs invalid dock-size axes independently', () => {
    const storage = makeStorage({
      [getDockSizeKey()]: JSON.stringify({ right: -1, bottom: 420 }),
    });
    expect(loadDockSize(undefined, storage)).toEqual({ right: 440, bottom: 420 });
  });

  it('clamps a persisted right dock size to the panel width floor', () => {
    const storage = makeStorage({
      [getDockSizeKey()]: JSON.stringify({ right: 120, bottom: 420 }),
    });
    expect(loadDockSize(undefined, storage)).toEqual({ right: 320, bottom: 420 });
  });
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

  it('F5: palette-size change preserves non-color slices and rewrites the stale v3 key', () => {
    // Simulate a host that shipped with paletteSize=16 (user has spacing overrides),
    // then reconfigured to paletteSize=17. The v3 envelope has a 16-slot palette;
    // the active cluster now expects 17 slots.
    //
    // Pre-fix: hydrateV2OrV3Object returned null (isValidColorShape failed),
    // the spacing override was discarded, and the stale v3 key was left on disk.
    // Post-fix: color falls back to defaults.palette; spacing/typography/size/tabs
    // survive; v3 is rewritten to drop the stale palette.
    const palette16: string[] = Array.from({ length: 16 }, (_, i) =>
      `#${i.toString(16).padStart(2, '0').repeat(3)}`,
    );
    const palette17: string[] = Array.from({ length: 17 }, (_, i) =>
      `#${i.toString(16).padStart(2, '0').repeat(3)}`,
    );

    const cluster17: ColorClusterDataConfig = {
      ...FIXTURE_CLUSTER,
      paletteSize: 17,
    };

    const defaults17: ColorTweakState = {
      ...defaults,
      palette: palette17,
    };

    const v3 = {
      color: {
        palette: palette16, // old 16-slot palette — mismatches cluster17.paletteSize=17
        background: 3,
        foreground: 12,
        cursor: 6,
        selectionBg: 0,
        selectionFg: 15,
        semanticMappings: { accent: 6, muted: 8, active: 14 },
        shikiTheme: 'dracula',
      },
      spacing: { 'hsp-md': '88px' },
      size: { 'radius-lg': '4px' },
    };

    const storage = makeStorage({ [STORAGE_KEY_V3]: JSON.stringify(v3) });

    const result = loadPersistedState(storage, defaults17, cluster17);

    // Must NOT return null — the palette mismatch does NOT discard the envelope.
    expect(result).not.toBeNull();

    // Non-color slices must survive.
    expect(result!.spacing['hsp-md']).toBe('88px');
    expect(result!.size['radius-lg']).toBe('4px');

    // Color slice falls back to defaults when palette size mismatches.
    expect(result!.color.palette).toEqual(palette17);

    // v3 key must have been rewritten (stale 16-slot palette gone).
    expect(storage.entries[STORAGE_KEY_V3]).toBeDefined();
    const persisted = JSON.parse(storage.entries[STORAGE_KEY_V3]);
    // Rewritten envelope carries the 17-slot default palette.
    expect(persisted.color.palette).toHaveLength(17);
    // Spacing preserved in the rewritten key too.
    expect(persisted.spacing?.['hsp-md']).toBe('88px');
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

describe('#342 — ColorScheme.shikiTheme is optional', () => {
  // A scheme literal that omits `shikiTheme` must type-check (this annotation
  // would fail to compile if the field were still required) and, at runtime,
  // fall back to the cluster's `defaultShikiTheme`. The palette cast is an
  // unrelated concern — `ColorScheme.palette` is a 16-tuple, our fixture a
  // plain `string[]`.
  const schemeWithoutShiki: ColorScheme = {
    background: 0,
    foreground: 15,
    cursor: 6,
    selectionBg: 0,
    selectionFg: 15,
    palette: palette16 as ColorScheme['palette'],
  };

  it('falls back to the cluster defaultShikiTheme when a scheme omits it', () => {
    const cluster = getActivePrimaryCluster();
    const state = initColorFromSchemeData(schemeWithoutShiki, cluster);
    expect(state.shikiTheme).toBe(cluster.defaultShikiTheme);
  });

  it('honors an explicit shikiTheme when the scheme provides one', () => {
    const cluster = getActivePrimaryCluster();
    const state = initColorFromSchemeData(
      { ...schemeWithoutShiki, shikiTheme: 'vitesse-dark' },
      cluster,
    );
    expect(state.shikiTheme).toBe('vitesse-dark');
  });
});

// ---------------------------------------------------------------------------
// #488 (S7) — initColorFromSchemeData is a no-op for a palette-less cluster
// ---------------------------------------------------------------------------

describe('#488 — initColorFromSchemeData no-ops for a palette-less (paletteSize: 0) cluster', () => {
  // A lone `semantic: true` tier cluster (#458/#466) — no palette sibling.
  // `semanticDefaults` mixes every SemanticValue shape a scheme cannot
  // express, so a regression back to the pre-#488 flattening (every
  // non-numeric default collapsed to palette index 0) is caught here.
  const loneSemanticCluster: ColorClusterDataConfig = {
    id: 'lone-semantic-fixture',
    label: 'Lone Semantic',
    paletteSize: 0,
    baseRoles: {},
    paletteCssVarTemplate: '--zudo-stub-p{n}',
    semanticDefaults: {
      danger: { literal: 'oklch(0.55 0.22 25)' },
      accent: { ref: { tier: 'ramp', item: 'p5' } },
      legacyIndex: 3,
    },
    semanticCssNames: { danger: '--zd-danger', accent: '--zd-accent', legacyIndex: '--zd-legacy' },
    baseDefaults: {},
    defaultShikiTheme: 'dracula',
    colorSchemes: {},
    panelSettings: { colorScheme: '', colorMode: false },
  };

  // A fully-populated 16-slot scheme — exactly the shape a bundled preset or
  // a host `colorPresets` entry ships. Loading it against the palette-less
  // cluster above must not resurrect any of this into state.
  const fullScheme: ColorScheme = {
    background: 9,
    foreground: 11,
    cursor: 6,
    selectionBg: 11,
    selectionFg: 10,
    palette: palette16 as ColorScheme['palette'],
    shikiTheme: 'catppuccin-latte',
    semantic: { danger: 1, accent: 5 },
  };

  it('returns an empty palette instead of seeding scheme.palette', () => {
    const state = initColorFromSchemeData(fullScheme, loneSemanticCluster);
    expect(state.palette).toEqual([]);
  });

  it('leaves semanticMappings byte-identical to cluster.semanticDefaults (literal/ref rows intact)', () => {
    const state = initColorFromSchemeData(fullScheme, loneSemanticCluster);
    expect(state.semanticMappings).toEqual(loneSemanticCluster.semanticDefaults);
  });

  it('does not collapse the { literal } / { ref } rows to a palette index', () => {
    const state = initColorFromSchemeData(fullScheme, loneSemanticCluster);
    expect(state.semanticMappings.danger).toEqual({ literal: 'oklch(0.55 0.22 25)' });
    expect(state.semanticMappings.accent).toEqual({ ref: { tier: 'ramp', item: 'p5' } });
  });

  it('warns once via console.warn instead of throwing', () => {
    expect(() => initColorFromSchemeData(fullScheme, loneSemanticCluster)).not.toThrow();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0]?.[0]).toContain('lone-semantic-fixture');
  });

  it('matches initSecondaryDefaults(cluster) exactly — a scheme load is indistinguishable from no scheme', () => {
    const state = initColorFromSchemeData(fullScheme, loneSemanticCluster);
    const noSchemeState = initSecondaryDefaults(loneSemanticCluster);
    expect(state).toEqual(noSchemeState);
  });
});

// ---------------------------------------------------------------------------
// #499 — initColorFromSchemeData preserves a non-numeric semanticDefaults
// entry verbatim when the scheme leaves that key un-overridden, instead of
// collapsing it to palette index 0.
// ---------------------------------------------------------------------------

describe('#499 — initColorFromSchemeData seeds un-overridden non-numeric defaults verbatim', () => {
  // A normal palette-backed cluster (paletteSize > 0) so this exercises the
  // seed loop itself, not the paletteSize:0 no-op path covered by #488 above.
  const clusterWithMixedDefaults: ColorClusterDataConfig = {
    id: 'mixed-defaults-fixture',
    label: 'Mixed Defaults',
    paletteSize: 16,
    baseRoles: {},
    paletteCssVarTemplate: '--zd-palette-{n}',
    semanticDefaults: {
      danger: { literal: { light: 'oklch(.505 .170 25)', dark: 'oklch(.655 .170 25)' } },
      accent: { ref: { tier: 'ramp', item: 'p5' } },
      muted: { literal: '#888888' },
      success: 3,
    },
    semanticCssNames: {
      danger: '--zd-danger',
      accent: '--zd-accent',
      muted: '--zd-muted',
      success: '--zd-success',
    },
    baseDefaults: {},
    defaultShikiTheme: 'dracula',
    colorSchemes: {},
    panelSettings: { colorScheme: '', colorMode: false },
  };

  // Overrides only `success` — `danger` / `accent` / `muted` are left
  // un-overridden, so the seed loop must fall through to the cluster default
  // for those three instead of coercing them to index 0.
  const partialScheme: ColorScheme = {
    background: 0,
    foreground: 15,
    cursor: 6,
    selectionBg: 0,
    selectionFg: 15,
    palette: palette16 as ColorScheme['palette'],
    semantic: { success: 7 },
  };

  it('seeds a per-mode { literal: { light, dark } } default verbatim', () => {
    const state = initColorFromSchemeData(partialScheme, clusterWithMixedDefaults);
    expect(state.semanticMappings.danger).toEqual({
      literal: { light: 'oklch(.505 .170 25)', dark: 'oklch(.655 .170 25)' },
    });
  });

  it('seeds a { ref } default verbatim', () => {
    const state = initColorFromSchemeData(partialScheme, clusterWithMixedDefaults);
    expect(state.semanticMappings.accent).toEqual({ ref: { tier: 'ramp', item: 'p5' } });
  });

  it('seeds a plain { literal: string } default verbatim', () => {
    const state = initColorFromSchemeData(partialScheme, clusterWithMixedDefaults);
    expect(state.semanticMappings.muted).toEqual({ literal: '#888888' });
  });

  it('still honors the scheme override for a key the scheme does provide', () => {
    const state = initColorFromSchemeData(partialScheme, clusterWithMixedDefaults);
    expect(state.semanticMappings.success).toBe(7);
  });
});

// ---------------------------------------------------------------------------
// #462 (S5) — persist-envelope round-trip for every SemanticValue variant
// ---------------------------------------------------------------------------

describe('savePersistedState / loadPersistedState — SemanticValue variant round-trips (#462)', () => {
  function makeFullState(semanticMappings: ColorTweakState['semanticMappings']): TweakState {
    return {
      color: { ...defaults, semanticMappings },
      spacing: {},
      typography: {},
      size: {},
    };
  }

  it('round-trips a plain index (number) mapping unchanged', () => {
    const storage = makeStorage();
    const state = makeFullState({ accent: 9, muted: 8, active: 14 });
    savePersistedState(state, storage);

    const result = loadPersistedState(storage, defaults);
    expect(result).not.toBeNull();
    expect(result!.color.semanticMappings.accent).toBe(9);
  });

  it('round-trips a { literal: string } mapping', () => {
    const storage = makeStorage();
    const state = makeFullState({
      accent: { literal: '#ff8800' },
      muted: 8,
      active: 14,
    });
    savePersistedState(state, storage);

    const result = loadPersistedState(storage, defaults);
    expect(result).not.toBeNull();
    expect(result!.color.semanticMappings.accent).toEqual({ literal: '#ff8800' });
  });

  it('round-trips a { literal: { light, dark } } per-mode mapping', () => {
    const storage = makeStorage();
    const perMode = { literal: { light: '#111111', dark: '#eeeeee' } };
    const state = makeFullState({ accent: 6, muted: perMode, active: 14 });
    savePersistedState(state, storage);

    const result = loadPersistedState(storage, defaults);
    expect(result).not.toBeNull();
    expect(result!.color.semanticMappings.muted).toEqual(perMode);
  });

  it('round-trips a { ref } mapping (with and without the optional tab field)', () => {
    const storage = makeStorage();
    const refWithTab = { ref: { tab: 'brand', tier: 'ramp', item: 'brand-500' } };
    const refWithoutTab = { ref: { tier: 'ramp', item: 'brand-700' } };
    const state = makeFullState({ accent: refWithTab, muted: refWithoutTab, active: 14 });
    savePersistedState(state, storage);

    const result = loadPersistedState(storage, defaults);
    expect(result).not.toBeNull();
    expect(result!.color.semanticMappings.accent).toEqual(refWithTab);
    expect(result!.color.semanticMappings.muted).toEqual(refWithoutTab);
  });

  it('loads an OLD (pre-#459, index-only) persisted envelope without error under the widened hydrator', () => {
    // Simulate a v3 envelope written by a build that predates #459/#462 — every
    // semanticMappings value is a plain number (no object variants ever
    // existed at persist time). Must hydrate byte-identical to before.
    const legacyIndexOnlyV3 = {
      color: {
        palette: palette16,
        background: 1,
        foreground: 14,
        cursor: 5,
        selectionBg: 2,
        selectionFg: 13,
        semanticMappings: { accent: 6, muted: 8, active: 14 },
        shikiTheme: 'tokyo-night',
      },
      spacing: {},
      typography: {},
      size: {},
    };
    const storage = makeStorage({ [STORAGE_KEY_V3]: JSON.stringify(legacyIndexOnlyV3) });

    const result = loadPersistedState(storage, defaults);
    expect(result).not.toBeNull();
    expect(result!.color.semanticMappings).toEqual({ accent: 6, muted: 8, active: 14 });
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('a malformed semantic-mapping value (neither index nor a recognized object shape) falls back to defaults instead of corrupting state', () => {
    const corrupted = {
      color: {
        palette: palette16,
        background: 1,
        foreground: 14,
        cursor: 5,
        selectionBg: 2,
        selectionFg: 13,
        // `garbage` matches none of the SemanticValue variants.
        semanticMappings: { accent: { garbage: true }, muted: 8, active: 14 },
        shikiTheme: 'tokyo-night',
      },
      spacing: {},
      typography: {},
      size: {},
    };
    const storage = makeStorage({ [STORAGE_KEY_V3]: JSON.stringify(corrupted) });

    const result = loadPersistedState(storage, defaults);
    expect(result).not.toBeNull();
    // Falls back to the caller-supplied default for the corrupted key instead
    // of admitting the arbitrary `{ garbage: true }` object into state.
    expect(result!.color.semanticMappings.accent).toBe(defaults.semanticMappings.accent);
    expect(result!.color.semanticMappings.muted).toBe(8);
  });
});

// ---------------------------------------------------------------------------
// #497/#503 — a legacy palette-index `semanticMappings` entry persisted
// BEFORE a cluster went ramp-native must be validated against the LIVE
// cluster's paletteSize at hydration, not merged in verbatim.
// ---------------------------------------------------------------------------

describe('loadPersistedState — stale numeric semanticMappings rejected against the live cluster paletteSize (#497/#503)', () => {
  // A lone `semantic: true` tier cluster (#458/#466) — no palette sibling,
  // paletteSize 0. Mirrors the `loneSemanticCluster` fixture in the #488
  // describe block above.
  const paletteless0Cluster: ColorClusterDataConfig = {
    id: 'stale-index-fixture',
    label: 'Stale Index Fixture',
    paletteSize: 0,
    baseRoles: {},
    paletteCssVarTemplate: '--zudo-stub-p{n}',
    semanticDefaults: { danger: { literal: 'oklch(0.55 0.22 25)' } },
    semanticCssNames: { danger: '--zd-danger' },
    baseDefaults: {},
    defaultShikiTheme: 'dracula',
    colorSchemes: {},
    panelSettings: { colorScheme: '', colorMode: false },
  };

  const paletteless0Defaults: ColorTweakState = {
    palette: [],
    background: 0,
    foreground: 0,
    cursor: 0,
    selectionBg: 0,
    selectionFg: 0,
    semanticMappings: { danger: { literal: 'oklch(0.55 0.22 25)' } },
    shikiTheme: 'dracula',
  };

  it('a stale legacy index survives into a paletteSize:0 cluster and hydrates to the config default, never a raw index or #000000', () => {
    const staleV3 = {
      color: {
        palette: [],
        background: 0,
        foreground: 0,
        cursor: 0,
        selectionBg: 0,
        selectionFg: 0,
        // Stale: `danger` used to point at palette slot 3, back when this
        // cluster still had a palette. The cluster is now paletteSize:0
        // (ramp-native) — index 3 no longer exists.
        semanticMappings: { danger: 3 },
        shikiTheme: 'dracula',
      },
      spacing: {},
      typography: {},
      size: {},
    };
    const storage = makeStorage({ [STORAGE_KEY_V3]: JSON.stringify(staleV3) });

    const result = loadPersistedState(storage, paletteless0Defaults, paletteless0Cluster);

    expect(result).not.toBeNull();
    expect(result!.color.semanticMappings.danger).toEqual({
      literal: 'oklch(0.55 0.22 25)',
    });
  });

  it('boundary: an index equal to paletteSize (16) is rejected against a non-zero cluster', () => {
    const staleV3 = {
      color: {
        ...defaults,
        semanticMappings: { accent: 16, muted: 8, active: 14 }, // 16 === paletteSize, out of range
      },
      spacing: {},
      typography: {},
      size: {},
    };
    const storage = makeStorage({ [STORAGE_KEY_V3]: JSON.stringify(staleV3) });

    const result = loadPersistedState(storage, defaults);

    expect(result).not.toBeNull();
    expect(result!.color.semanticMappings.accent).toBe(defaults.semanticMappings.accent);
  });

  it('boundary: the last valid index (paletteSize - 1 = 15) is accepted', () => {
    const v3 = {
      color: {
        ...defaults,
        semanticMappings: { accent: 15, muted: 8, active: 14 }, // 15 === paletteSize - 1, in range
      },
      spacing: {},
      typography: {},
      size: {},
    };
    const storage = makeStorage({ [STORAGE_KEY_V3]: JSON.stringify(v3) });

    const result = loadPersistedState(storage, defaults);

    expect(result).not.toBeNull();
    expect(result!.color.semanticMappings.accent).toBe(15);
  });

  it('the v1-migration branch also rejects a stale out-of-range index', () => {
    const v1 = makeV1({ semanticMappings: { accent: 16, muted: 8, active: 14 } });
    const storage = makeStorage({ [STORAGE_KEY_V1]: JSON.stringify(v1) });

    const result = loadPersistedState(storage, defaults);

    expect(result).not.toBeNull();
    expect(result!.color.semanticMappings.accent).toBe(defaults.semanticMappings.accent);
    // Untouched keys still come through unchanged.
    expect(result!.color.semanticMappings.muted).toBe(8);
  });
});

describe('loadPersistedState — secondary slice validated against the SECONDARY cluster\'s own paletteSize (#497/#503)', () => {
  const SECONDARY_PALETTE_SIZE = 4;
  const SECONDARY_TAB: TabConfig = {
    id: 'color-secondary',
    label: 'Secondary Color',
    colorExtras: {
      id: 'secondary-fixture',
      label: 'Secondary Fixture',
      baseRoles: {},
      baseDefaults: { background: 0, foreground: 3 },
      defaultShikiTheme: 'dracula',
      colorSchemes: {},
      panelSettings: { colorScheme: '', colorMode: false },
    },
    tiers: [
      {
        id: 'palette',
        label: 'Palette',
        items: Array.from({ length: SECONDARY_PALETTE_SIZE }, (_, i) => ({
          id: `sec-p${i}`,
          cssVar: `--sec-p${i}`,
          label: `Palette ${i}`,
          default: '#000000',
          type: { kind: 'color' as const },
        })),
      },
      {
        id: 'semantic',
        label: 'Semantic',
        referencesTier: 'palette',
        items: [
          {
            id: 'highlight',
            cssVar: '--sec-semantic-highlight',
            label: 'Highlight',
            default: 'sec-p2',
            type: { kind: 'color' as const },
          },
        ],
      },
    ],
  };

  function makeSecondaryPalette(): string[] {
    return Array.from({ length: SECONDARY_PALETTE_SIZE }, (_, i) => `#${i}${i}${i}${i}${i}${i}`);
  }

  beforeEach(() => {
    installFixturePanelConfig({ tabs: [...FIXTURE_TABS, SECONDARY_TAB] });
    STORAGE_KEY_V3 = getStorageKeyV3();
  });

  it('the secondary cluster fixture resolves to paletteSize 4 (sanity check)', () => {
    expect(resolveSecondaryColorCluster()?.paletteSize).toBe(SECONDARY_PALETTE_SIZE);
  });

  it("rejects a secondary index equal to the SECONDARY paletteSize (4), even though it is well within the PRIMARY cluster's range (16)", () => {
    const v3 = {
      color: { ...defaults },
      spacing: {},
      typography: {},
      size: {},
      secondary: {
        palette: makeSecondaryPalette(),
        background: 0,
        foreground: 3,
        cursor: 0,
        selectionBg: 0,
        selectionFg: 3,
        // 4 is in-range for the PRIMARY cluster (paletteSize 16) but
        // out-of-range for the secondary cluster (paletteSize 4) — must be
        // validated against the secondary cluster's OWN size (#497/#503).
        semanticMappings: { highlight: 4 },
        shikiTheme: 'dracula',
      },
    };
    const storage = makeStorage({ [STORAGE_KEY_V3]: JSON.stringify(v3) });

    const result = loadPersistedState(storage, defaults);

    expect(result).not.toBeNull();
    expect(result!.secondary).toBeDefined();
    // Falls back to the secondary cluster's own semantic default (index 2,
    // derived from `sec-p2`), not the stale out-of-range 4.
    expect(result!.secondary!.semanticMappings.highlight).toBe(2);
  });

  it('accepts a secondary index at the boundary (paletteSize - 1 = 3)', () => {
    const v3 = {
      color: { ...defaults },
      spacing: {},
      typography: {},
      size: {},
      secondary: {
        palette: makeSecondaryPalette(),
        background: 0,
        foreground: 3,
        cursor: 0,
        selectionBg: 0,
        selectionFg: 3,
        semanticMappings: { highlight: 3 },
        shikiTheme: 'dracula',
      },
    };
    const storage = makeStorage({ [STORAGE_KEY_V3]: JSON.stringify(v3) });

    const result = loadPersistedState(storage, defaults);

    expect(result).not.toBeNull();
    expect(result!.secondary!.semanticMappings.highlight).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// #500/#509 (S7) — v4 per-scheme envelope: selection, merge-save preservation,
// and v3/v2/v1 → v4 migration. The fixture cluster has `colorMode: false`, so
// `getActiveColorIdentity` resolves the CONSTANT identity `''` (one slot) in the
// node environment; the distinct-identity flow is covered by the jsdom
// scheme-change tests. Contract d ("a v3 envelope migrates losslessly for the
// identity active at load; subsequent loads prefer v4") is pinned here.
// ---------------------------------------------------------------------------

describe('loadPersistedState / savePersistedState — v4 per-scheme envelope (#500/#509)', () => {
  // colorMode:false fixture → getActiveSchemeName === '' (see FIXTURE_CLUSTER).
  const IDENTITY = '';

  it('contract d: migrates a v3 envelope into v4 under the active identity; subsequent loads prefer v4', () => {
    const v3 = { color: makeV1({ shikiTheme: 'v3-theme' }), spacing: { 'hsp-md': '20px' } };
    const storage = makeStorage({ [STORAGE_KEY_V3]: JSON.stringify(v3) });

    const result = loadPersistedState(storage, defaults);
    expect(result).not.toBeNull();
    expect(result!.color.shikiTheme).toBe('v3-theme');
    expect(result!.color.background).toBe(1);
    expect(result!.spacing).toEqual({ 'hsp-md': '20px' });

    // v4 written, keyed by the active identity; the color slice is filed under
    // the identity, the non-color slices stay global.
    const v4 = JSON.parse(storage.entries[STORAGE_KEY_V4]) as PersistedEnvelopeV4;
    expect(v4.color[IDENTITY].shikiTheme).toBe('v3-theme');
    expect(v4.color[IDENTITY].background).toBe(1);
    expect(v4.spacing).toEqual({ 'hsp-md': '20px' });
    // Legacy v3 is left in place (legacy chain unchanged); v4 wins on next load.
    expect(storage.entries[STORAGE_KEY_V3]).toBeDefined();

    // Subsequent loads PREFER v4 — mutate the stale v3 and prove it's ignored.
    storage.entries[STORAGE_KEY_V3] = JSON.stringify({
      color: makeV1({ shikiTheme: 'STALE-V3' }),
    });
    const second = loadPersistedState(storage, defaults);
    expect(second!.color.shikiTheme).toBe('v3-theme');
  });

  it('contract d (chain sanity): a v2 envelope migrates into v4', () => {
    const v2 = { color: makeV1({ shikiTheme: 'v2-theme' }) };
    const storage = makeStorage({ [STORAGE_KEY_V2]: JSON.stringify(v2) });

    const result = loadPersistedState(storage, defaults);
    expect(result!.color.shikiTheme).toBe('v2-theme');
    const v4 = JSON.parse(storage.entries[STORAGE_KEY_V4]) as PersistedEnvelopeV4;
    expect(v4.color[IDENTITY].shikiTheme).toBe('v2-theme');
  });

  it('contract d (chain sanity): a v1 envelope migrates into v4', () => {
    const v1 = makeV1({ shikiTheme: 'v1-theme' });
    const storage = makeStorage({ [STORAGE_KEY_V1]: JSON.stringify(v1) });

    const result = loadPersistedState(storage, defaults);
    expect(result!.color.shikiTheme).toBe('v1-theme');
    const v4 = JSON.parse(storage.entries[STORAGE_KEY_V4]) as PersistedEnvelopeV4;
    expect(v4.color[IDENTITY].shikiTheme).toBe('v1-theme');
  });

  it('v4 wins over v3 when both are present — no re-migration', () => {
    const v4Env: PersistedEnvelopeV4 = {
      color: { [IDENTITY]: makeV1({ shikiTheme: 'v4-theme' }) },
      spacing: {},
      typography: {},
      size: {},
    };
    const v3 = { color: makeV1({ shikiTheme: 'v3-theme' }) };
    const storage = makeStorage({
      [STORAGE_KEY_V4]: JSON.stringify(v4Env),
      [STORAGE_KEY_V3]: JSON.stringify(v3),
    });

    const result = loadPersistedState(storage, defaults);
    expect(result!.color.shikiTheme).toBe('v4-theme');
    // v3 untouched — the v4 branch short-circuits before the legacy chain.
    expect(JSON.parse(storage.entries[STORAGE_KEY_V3]).color.shikiTheme).toBe('v3-theme');
  });

  it('merge-save overwrites the active slot while preserving an inactive identity\'s slot', () => {
    const storage = makeStorage({
      [STORAGE_KEY_V4]: JSON.stringify({
        color: { 'other-scheme': makeV1({ shikiTheme: 'other' }) },
        spacing: {},
        typography: {},
        size: {},
      }),
    });
    const state: TweakState = {
      color: { ...defaults, shikiTheme: 'active' },
      spacing: {},
      typography: {},
      size: {},
    };

    savePersistedState(state, storage);

    const v4 = JSON.parse(storage.entries[STORAGE_KEY_V4]) as PersistedEnvelopeV4;
    // Inactive identity's slot is preserved …
    expect(v4.color['other-scheme'].shikiTheme).toBe('other');
    // … and the active identity's slot is written.
    expect(v4.color[IDENTITY].shikiTheme).toBe('active');
  });

  it('round-trips a fresh save through v4 (save then load selects the active slot)', () => {
    const storage = makeStorage();
    const state: TweakState = {
      color: { ...defaults, background: 3 },
      spacing: { 'hsp-md': '5px' },
      typography: {},
      size: {},
    };

    savePersistedState(state, storage);
    // Only the v4 key is written — no legacy keys on a fresh save.
    expect(storage.entries[STORAGE_KEY_V4]).toBeDefined();
    expect(storage.entries[STORAGE_KEY_V3]).toBeUndefined();

    const result = loadPersistedState(storage, defaults);
    expect(result!.color.background).toBe(3);
    expect(result!.spacing).toEqual({ 'hsp-md': '5px' });
  });

  it('hasActiveColorSlot reflects whether the active identity has a persisted slot', () => {
    const storage = makeStorage();
    expect(hasActiveColorSlot(undefined, undefined, storage)).toBe(false);

    savePersistedState({ color: defaults, spacing: {}, typography: {}, size: {} }, storage);
    expect(hasActiveColorSlot(undefined, undefined, storage)).toBe(true);
  });

  it('a malformed v4 blob falls through to the legacy chain and is re-migrated', () => {
    const v3 = { color: makeV1({ shikiTheme: 'from-v3' }) };
    const storage = makeStorage({
      [STORAGE_KEY_V4]: '{not valid json',
      [STORAGE_KEY_V3]: JSON.stringify(v3),
    });

    const result = loadPersistedState(storage, defaults);
    expect(result!.color.shikiTheme).toBe('from-v3');
    expect(warnSpy).toHaveBeenCalled();
    // The malformed v4 is overwritten by the migration.
    const v4 = JSON.parse(storage.entries[STORAGE_KEY_V4]) as PersistedEnvelopeV4;
    expect(v4.color[IDENTITY].shikiTheme).toBe('from-v3');
  });

  it('clearPersistedState removes the v4 key alongside the legacy keys', () => {
    const storage = makeStorage({
      [STORAGE_KEY_V4]: '{"color":{}}',
      [STORAGE_KEY_V3]: '{}',
      [STORAGE_KEY_V2]: '{}',
      [STORAGE_KEY_V1]: '{}',
    });

    clearPersistedState(storage);

    expect(storage.entries[STORAGE_KEY_V4]).toBeUndefined();
    expect(storage.entries[STORAGE_KEY_V3]).toBeUndefined();
    expect(storage.entries[STORAGE_KEY_V2]).toBeUndefined();
    expect(storage.entries[STORAGE_KEY_V1]).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// #510 confirm — #503 x #509 cross-cutting: the "stale numeric semanticMappings
// (#497/#503)" describe above only exercises loadLegacyPersistedState (a v3
// read with no v4 key involved). Separately, the "v4 per-scheme envelope"
// describe above migrates v3 -> v4 but its fixtures never carry a stale
// semantic index. Neither proves the migration branch of loadPersistedState
// (step 2 -> step 3, writeMergedV4) re-validates against the live cluster
// paletteSize before filing the color slot under v4, rather than copying the
// legacy value across verbatim.
// ---------------------------------------------------------------------------

describe('loadPersistedState — v3-to-v4 migration re-validates a stale semantic index against paletteSize (#503 x #509)', () => {
  // Mirrors the paletteless0Cluster fixture from the #497/#503 describe above.
  const paletteless0Cluster: ColorClusterDataConfig = {
    id: 'stale-index-v4-migration-fixture',
    label: 'Stale Index V4 Migration Fixture',
    paletteSize: 0,
    baseRoles: {},
    paletteCssVarTemplate: '--zudo-stub-p{n}',
    semanticDefaults: { danger: { literal: 'oklch(0.55 0.22 25)' } },
    semanticCssNames: { danger: '--zd-danger' },
    baseDefaults: {},
    defaultShikiTheme: 'dracula',
    colorSchemes: {},
    panelSettings: { colorScheme: '', colorMode: false },
  };

  const paletteless0Defaults: ColorTweakState = {
    palette: [],
    background: 0,
    foreground: 0,
    cursor: 0,
    selectionBg: 0,
    selectionFg: 0,
    semanticMappings: { danger: { literal: 'oklch(0.55 0.22 25)' } },
    shikiTheme: 'dracula',
  };

  it('migrating a v3 envelope with a stale numeric mapping under a paletteSize:0 cluster writes the DEFAULTED value to v4, never the stale index', () => {
    const staleV3 = {
      color: {
        palette: [],
        background: 0,
        foreground: 0,
        cursor: 0,
        selectionBg: 0,
        selectionFg: 0,
        // Stale: this cluster went ramp-native (paletteSize: 0) after this
        // index was persisted — index 3 no longer names a palette slot.
        semanticMappings: { danger: 3 },
        shikiTheme: 'dracula',
      },
      spacing: {},
      typography: {},
      size: {},
    };
    // No v4 key present, so loadPersistedState falls through to the legacy
    // chain and then migrates the result into v4 (steps 2-3).
    const storage = makeStorage({ [STORAGE_KEY_V3]: JSON.stringify(staleV3) });

    const result = loadPersistedState(storage, paletteless0Defaults, paletteless0Cluster);

    expect(result).not.toBeNull();
    expect(result!.color.semanticMappings.danger).toEqual({
      literal: 'oklch(0.55 0.22 25)',
    });

    // The migrated v4 envelope carries the VALIDATED value — proving
    // writeMergedV4 was handed the already-hydrated `legacy` state (which ran
    // through hydrateColorState's paletteSize gate), not a raw copy of the
    // stale v3 payload.
    const v4 = JSON.parse(storage.entries[STORAGE_KEY_V4]) as PersistedEnvelopeV4;
    const identity = ''; // colorMode: false -> constant identity
    expect(v4.color[identity].semanticMappings.danger).toEqual({
      literal: 'oklch(0.55 0.22 25)',
    });
  });
});
