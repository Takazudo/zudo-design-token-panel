import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_PANEL_CONFIG,
  __resetPanelConfigForTests,
  assertValidPanelConfig,
  configurePanel,
  exportFilename,
  getPanelConfig,
  modalClass,
  panelRootId,
  storageKey_open,
  storageKey_position,
  storageKey_stateV1,
  storageKey_stateV2,
  storageKey_stateV3,
  storageKey_visible,
  type PanelConfig,
} from '../config/panel-config';
import { TierResolverError, resolveRefToCssVar } from '../apply/tier-resolver';
import type { TabConfig } from '../tokens/tier-model';

/**
 * `panel-config.ts` contract:
 *
 * The whole point of this module is that swapping the config in one place
 * re-targets every storage key, schema id, modal class, and filename the
 * panel emits. These tests pin both ends of that contract:
 *
 *  1. With the default config we land on the documented zudo-flavoured
 *     neutral defaults.
 *
 *  2. With a different config the same derivation helpers produce
 *     different literals — proof the panel is decoupled from any single
 *     consumer.
 *
 *  3. `configurePanel` is one-shot: same-value re-calls are no-ops, but
 *     different-value re-calls throw so config conflicts surface early
 *     rather than silently corrupting one of the two callers' assumptions.
 */

beforeEach(() => {
  __resetPanelConfigForTests();
});

afterEach(() => {
  __resetPanelConfigForTests();
});

describe('panel-config — default config literal-equality', () => {
  it('default config exposes neutral zudo-flavoured stub values', () => {
    // The package ships intentionally minimal defaults so the panel imports
    // cleanly even when no host has called configurePanel. Hosts MUST
    // override via configurePanel(...) for useful behaviour. The literals
    // below are the documented neutral defaults.
    expect(DEFAULT_PANEL_CONFIG.storagePrefix).toBe('zudo-design-token-panel');
    expect(DEFAULT_PANEL_CONFIG.consoleNamespace).toBe('zudo');
    expect(DEFAULT_PANEL_CONFIG.modalClassPrefix).toBe('zudo-design-token-panel-modal');
    expect(DEFAULT_PANEL_CONFIG.schemaId).toBe('zudo-design-tokens/v1');
    expect(DEFAULT_PANEL_CONFIG.exportFilenameBase).toBe('zudo-design-tokens');
    // tabs is the empty stub array — hosts MUST configure real tabs.
    expect(DEFAULT_PANEL_CONFIG.tabs).toBeDefined();
    expect(DEFAULT_PANEL_CONFIG.tabs).toEqual([]);
  });

  it('storage-key derivations produce the documented literal strings', () => {
    const cfg = DEFAULT_PANEL_CONFIG;
    expect(storageKey_stateV1(cfg)).toBe('zudo-design-token-panel-state');
    expect(storageKey_stateV2(cfg)).toBe('zudo-design-token-panel-state-v2');
    expect(storageKey_stateV3(cfg)).toBe('zudo-design-token-panel-state-v3');
    expect(storageKey_open(cfg)).toBe('zudo-design-token-panel-open');
    expect(storageKey_position(cfg)).toBe('zudo-design-token-panel-position');
    // NOTE: colon, not dash — historical artifact preserved.
    expect(storageKey_visible(cfg)).toBe('zudo-design-token-panel:visible');
  });

  it('default `colorPresets` is the empty object', () => {
    // The package itself ships zero presets. Consumers opt in by passing
    // `colorPresets` to `configurePanel`.
    expect(DEFAULT_PANEL_CONFIG.colorPresets).toEqual({});
  });

  it('panelRootId / modalClass / exportFilename produce the documented literals', () => {
    const cfg = DEFAULT_PANEL_CONFIG;
    expect(panelRootId(cfg)).toBe('zudo-design-token-panel-root');
    expect(modalClass(cfg, '')).toBe('zudo-design-token-panel-modal');
    expect(modalClass(cfg, '--export')).toBe('zudo-design-token-panel-modal--export');
    expect(modalClass(cfg, '__title')).toBe('zudo-design-token-panel-modal__title');
    expect(exportFilename(cfg)).toBe('zudo-design-tokens.json');
  });

  it('getPanelConfig returns DEFAULT_PANEL_CONFIG when configurePanel was never called', () => {
    expect(getPanelConfig()).toEqual(DEFAULT_PANEL_CONFIG);
  });
});

describe('panel-config — derivation flips with a non-default config', () => {
  const ALT_CONFIG: PanelConfig = {
    storagePrefix: 'foo-bar',
    consoleNamespace: 'foo',
    modalClassPrefix: 'foo-bar-modal',
    schemaId: 'foo-bar-tokens/v1',
    exportFilenameBase: 'foo-bar-tokens',
    tabs: [],
  };

  it('every derivation flips with the new prefix', () => {
    expect(storageKey_stateV1(ALT_CONFIG)).toBe('foo-bar-state');
    expect(storageKey_stateV2(ALT_CONFIG)).toBe('foo-bar-state-v2');
    expect(storageKey_open(ALT_CONFIG)).toBe('foo-bar-open');
    expect(storageKey_position(ALT_CONFIG)).toBe('foo-bar-position');
    expect(storageKey_visible(ALT_CONFIG)).toBe('foo-bar:visible');
    expect(panelRootId(ALT_CONFIG)).toBe('foo-bar-root');
    expect(modalClass(ALT_CONFIG, '')).toBe('foo-bar-modal');
    expect(modalClass(ALT_CONFIG, '--export')).toBe('foo-bar-modal--export');
    expect(exportFilename(ALT_CONFIG)).toBe('foo-bar-tokens.json');
  });

  it('configurePanel installs the alt config so getPanelConfig() returns it', () => {
    configurePanel(ALT_CONFIG);
    expect(getPanelConfig()).toEqual(ALT_CONFIG);
    // And the live derivations now route through the alt config.
    expect(storageKey_stateV2(getPanelConfig())).toBe('foo-bar-state-v2');
    expect(modalClass(getPanelConfig(), '__title')).toBe('foo-bar-modal__title');
  });
});

describe('panel-config — assertValidPanelConfig accepts and rejects domTweaker shapes', () => {
  function makeBaseConfig(extra: Record<string, unknown> = {}): unknown {
    return {
      storagePrefix: 'p',
      consoleNamespace: 'p',
      modalClassPrefix: 'p-modal',
      schemaId: 'p/v1',
      exportFilenameBase: 'p',
      tabs: [],
      ...extra,
    };
  }

  it('DEFAULT_PANEL_CONFIG leaves domTweaker disabled by omission', () => {
    expect(DEFAULT_PANEL_CONFIG.domTweaker).toBeUndefined();
  });

  it('accepts a config with no domTweaker field', () => {
    expect(() => assertValidPanelConfig(makeBaseConfig())).not.toThrow();
  });

  it('accepts an empty domTweaker block', () => {
    expect(() => assertValidPanelConfig(makeBaseConfig({ domTweaker: {} }))).not.toThrow();
  });

  it('accepts string themeCss without @import', () => {
    expect(() =>
      assertValidPanelConfig(
        makeBaseConfig({ domTweaker: { themeCss: '@theme { --color-brand: #f0f; }' } }),
      ),
    ).not.toThrow();
  });

  it('rejects domTweaker when it is a function', () => {
    expect(() =>
      assertValidPanelConfig(makeBaseConfig({ domTweaker: () => undefined })),
    ).toThrow(/PanelConfig\.domTweaker must be a plain object/);
  });

  it('rejects themeCss when it is a function', () => {
    expect(() =>
      assertValidPanelConfig(makeBaseConfig({ domTweaker: { themeCss: () => undefined } })),
    ).toThrow(/PanelConfig\.domTweaker\.themeCss must be a string/);
  });

  it('rejects non-string themeCss', () => {
    expect(() =>
      assertValidPanelConfig(makeBaseConfig({ domTweaker: { themeCss: 123 } })),
    ).toThrow(/PanelConfig\.domTweaker\.themeCss must be a string/);
  });

  it('rejects @import in themeCss', () => {
    expect(() =>
      assertValidPanelConfig(
        makeBaseConfig({ domTweaker: { themeCss: '@IMPORT url("https://example.com/x.css");' } }),
      ),
    ).toThrow(/PanelConfig\.domTweaker\.themeCss must not contain @import/);
  });

  it('rejects unknown fields inside domTweaker', () => {
    expect(() =>
      assertValidPanelConfig(makeBaseConfig({ domTweaker: { runtime: 'host-owned' } })),
    ).toThrow(/PanelConfig\.domTweaker\.runtime is not a supported field/);
  });
});

describe('panel-config — configurePanel idempotency (per prefix)', () => {
  const CONFIG_A: PanelConfig = {
    storagePrefix: 'aaa',
    consoleNamespace: 'aaa',
    modalClassPrefix: 'aaa-modal',
    schemaId: 'aaa/v1',
    exportFilenameBase: 'aaa',
    tabs: [],
  };

  /** Same prefix as CONFIG_A but a structurally-different non-prefix field. */
  const CONFIG_A_CONFLICT: PanelConfig = {
    ...CONFIG_A,
    consoleNamespace: 'aaa-renamed',
  };

  it('calling configurePanel twice with identical values is a no-op (does not throw)', () => {
    configurePanel(CONFIG_A);
    expect(() => configurePanel({ ...CONFIG_A })).not.toThrow();
    expect(getPanelConfig()).toEqual(CONFIG_A);
  });

  it('idempotent re-call for the same prefix returns the SAME handle', () => {
    const handle = configurePanel(CONFIG_A);
    const again = configurePanel({ ...CONFIG_A });
    expect(again).toBe(handle);
    expect(again.instanceId).toBe('aaa');
  });

  it('same prefix but structurally-different config throws (reconfigure rule: reject-with-error)', () => {
    configurePanel(CONFIG_A);
    expect(() => configurePanel(CONFIG_A_CONFLICT)).toThrow(/already called with different values/);
    // The first config is preserved — the conflicting call did not overwrite it.
    expect(getPanelConfig()).toEqual(CONFIG_A);
  });
});

describe('panel-config — multi-instance registry (distinct prefixes)', () => {
  const CONFIG_A: PanelConfig = {
    storagePrefix: 'aaa',
    consoleNamespace: 'aaa',
    modalClassPrefix: 'aaa-modal',
    schemaId: 'aaa/v1',
    exportFilenameBase: 'aaa',
    tabs: [],
  };

  const CONFIG_B: PanelConfig = {
    storagePrefix: 'bbb',
    consoleNamespace: 'bbb',
    modalClassPrefix: 'bbb-modal',
    schemaId: 'bbb/v1',
    exportFilenameBase: 'bbb',
    tabs: [],
  };

  it('a distinct prefix registers a second instance without throwing', () => {
    configurePanel(CONFIG_A);
    expect(() => configurePanel(CONFIG_B)).not.toThrow();
  });

  it('returns distinct handles whose instanceId equals the storagePrefix', () => {
    const handleA = configurePanel(CONFIG_A);
    const handleB = configurePanel(CONFIG_B);
    expect(handleA).not.toBe(handleB);
    expect(handleA.instanceId).toBe('aaa');
    expect(handleB.instanceId).toBe('bbb');
  });

  it('the most-recently-configured instance becomes the default getPanelConfig() returns', () => {
    configurePanel(CONFIG_A);
    configurePanel(CONFIG_B);
    // CONFIG_B was configured last → it is the active/default instance.
    expect(getPanelConfig()).toEqual(CONFIG_B);
  });

  it('two instances derive independent storage keys / root ids from their prefixes', () => {
    const handleA = configurePanel(CONFIG_A);
    const handleB = configurePanel(CONFIG_B);
    void handleA;
    void handleB;
    // Storage keys are a pure function of storagePrefix → fully independent.
    expect(storageKey_stateV3(CONFIG_A)).toBe('aaa-state-v3');
    expect(storageKey_stateV3(CONFIG_B)).toBe('bbb-state-v3');
    expect(storageKey_open(CONFIG_A)).toBe('aaa-open');
    expect(storageKey_open(CONFIG_B)).toBe('bbb-open');
    expect(panelRootId(CONFIG_A)).toBe('aaa-root');
    expect(panelRootId(CONFIG_B)).toBe('bbb-root');
  });

  it('destroy() deregisters an instance and re-points the default to the remaining one', () => {
    const handleA = configurePanel(CONFIG_A);
    configurePanel(CONFIG_B);
    // B is the default; destroying B falls the default back to A.
    const handleB = configurePanel(CONFIG_B); // idempotent — same handle as before
    void handleA;
    handleB.destroy();
    expect(getPanelConfig()).toEqual(CONFIG_A);
  });

  it('destroy() then re-configure the same prefix with a different config no longer throws', () => {
    const handleA = configurePanel(CONFIG_A);
    handleA.destroy();
    // After destroy the prefix is free — a fresh config under the same prefix
    // is accepted (the reconfigure escape hatch documented on RECONFIGURE_RULE).
    const reconfigured: PanelConfig = { ...CONFIG_A, consoleNamespace: 'aaa-v2' };
    expect(() => configurePanel(reconfigured)).not.toThrow();
    expect(getPanelConfig()).toEqual(reconfigured);
  });
});

describe('panel-config — assertValidPanelConfig accepts and rejects legacyIdRenameMap shapes', () => {
  /**
   * The new optional `legacyIdRenameMap` is an opt-in for hosts who
   * depended on the historical built-in typography rename. The validator
   * gates the trust boundary on the inline JSON config, so it must accept
   * an absent field, accept an empty / populated object whose values are
   * all strings, and reject every other shape (null inside, array, value
   * not a string).
   */
  function makeBaseConfig(extra: Partial<PanelConfig> = {}): PanelConfig {
    return {
      storagePrefix: 'p',
      consoleNamespace: 'p',
      modalClassPrefix: 'p-modal',
      schemaId: 'p/v1',
      exportFilenameBase: 'p',
      tabs: [],
      ...extra,
    };
  }

  it('accepts a config with no legacyIdRenameMap field (default)', () => {
    expect(() => assertValidPanelConfig(makeBaseConfig())).not.toThrow();
  });

  it('accepts an empty legacyIdRenameMap', () => {
    expect(() => assertValidPanelConfig(makeBaseConfig({ legacyIdRenameMap: {} }))).not.toThrow();
  });

  it('accepts a populated legacyIdRenameMap with string values', () => {
    expect(() =>
      assertValidPanelConfig(
        makeBaseConfig({
          legacyIdRenameMap: { 'text-caption': 'text-xs', 'text-body': 'text-base' },
        }),
      ),
    ).not.toThrow();
  });

  it('accepts legacyIdRenameMap with a null value (drop semantics)', () => {
    // `null` signals "drop the legacy id entirely" — used for legacy ids
    // that have no replacement in the current manifest. The validator
    // must accept it because the historical zdtp-internal map relies on it
    // (see ZDTP_LEGACY_TYPOGRAPHY_RENAME_MAP's text-micro entry).
    expect(() =>
      assertValidPanelConfig(
        makeBaseConfig({
          legacyIdRenameMap: { 'text-micro': null, 'text-caption': 'text-xs' },
        }),
      ),
    ).not.toThrow();
  });

  it('rejects legacyIdRenameMap with a non-string non-null value', () => {
    expect(() =>
      assertValidPanelConfig(
        makeBaseConfig({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          legacyIdRenameMap: { 'text-caption': 123 as any },
        }),
      ),
    ).toThrow(/legacyIdRenameMap\["text-caption"\] must be a string or null/);
  });

  it('rejects legacyIdRenameMap when set to an array', () => {
    expect(() =>
      assertValidPanelConfig(
        makeBaseConfig({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          legacyIdRenameMap: ['nope'] as any,
        }),
      ),
    ).toThrow(/legacyIdRenameMap must be a plain object/);
  });

  it('rejects legacyIdRenameMap when the field itself is set to null', () => {
    expect(() =>
      assertValidPanelConfig(
        makeBaseConfig({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          legacyIdRenameMap: null as any,
        }),
      ),
    ).toThrow(/legacyIdRenameMap must be a plain object/);
  });

  it('rejects legacyIdRenameMap with an array value inside', () => {
    expect(() =>
      assertValidPanelConfig(
        makeBaseConfig({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          legacyIdRenameMap: { 'text-caption': ['text-xs'] as any },
        }),
      ),
    ).toThrow(/legacyIdRenameMap\["text-caption"\] must be a string or null/);
  });
});

describe('panel-config — assertValidPanelConfig accepts and rejects autoRememberOnOpen shapes', () => {
  /**
   * The new optional `autoRememberOnOpen` field (#578) gates whether opening
   * the panel persists owner-mode autoload. It must accept an absent field
   * and either boolean, and reject any non-boolean value.
   */
  function makeBaseConfig(extra: Partial<PanelConfig> = {}): PanelConfig {
    return {
      storagePrefix: 'p',
      consoleNamespace: 'p',
      modalClassPrefix: 'p-modal',
      schemaId: 'p/v1',
      exportFilenameBase: 'p',
      tabs: [],
      ...extra,
    };
  }

  it('accepts a config with no autoRememberOnOpen field (default)', () => {
    expect(() => assertValidPanelConfig(makeBaseConfig())).not.toThrow();
  });

  it('accepts autoRememberOnOpen: true', () => {
    expect(() =>
      assertValidPanelConfig(makeBaseConfig({ autoRememberOnOpen: true })),
    ).not.toThrow();
  });

  it('accepts autoRememberOnOpen: false', () => {
    expect(() =>
      assertValidPanelConfig(makeBaseConfig({ autoRememberOnOpen: false })),
    ).not.toThrow();
  });

  it('rejects a non-boolean autoRememberOnOpen', () => {
    expect(() =>
      assertValidPanelConfig(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        makeBaseConfig({ autoRememberOnOpen: 'yes' as any }),
      ),
    ).toThrow(/autoRememberOnOpen must be a boolean when set/);
  });
});

// ---------------------------------------------------------------------------
// assertValidPanelConfig — tabs validation
// ---------------------------------------------------------------------------

describe('panel-config — assertValidPanelConfig host-tabs validation', () => {
  /**
   * Shared base-config factory for tabs tests. Mirrors the helper above but
   * lives in its own scope so the tabs tests are self-contained.
   */
  function makeBaseConfig(extra: Partial<PanelConfig> = {}): PanelConfig {
    return {
      storagePrefix: 'p',
      consoleNamespace: 'p',
      modalClassPrefix: 'p-modal',
      schemaId: 'p/v1',
      exportFilenameBase: 'p',
      tabs: [],
      ...extra,
    };
  }

  /** A minimal valid single-tier text tab used as a building block. */
  const VALID_TEXT_TAB: TabConfig = {
    id: 'easing',
    label: 'Easing',
    tiers: [
      {
        id: 'raw',
        label: 'Raw curves',
        items: [
          {
            id: 'ease-in',
            cssVar: '--my-easing-ease-in',
            label: 'Ease in',
            default: 'cubic-bezier(0.42,0,1,1)',
            type: { kind: 'text' },
          },
          {
            id: 'ease-out',
            cssVar: '--my-easing-ease-out',
            label: 'Ease out',
            default: 'cubic-bezier(0,0,0.58,1)',
            type: { kind: 'text' },
          },
        ],
      },
    ],
  };

  /** A minimal valid two-tier tab (raw + semantic, same kind). */
  const VALID_TWO_TIER_TAB: TabConfig = {
    id: 'spacing',
    label: 'Spacing',
    tiers: [
      {
        id: 'raw',
        label: 'Raw',
        items: [
          {
            id: 'space-1',
            cssVar: '--my-spacing-space-1',
            label: 'Space 1',
            default: '4px',
            type: { kind: 'length', step: 1, unit: 'px' },
          },
        ],
      },
      {
        id: 'semantic',
        label: 'Semantic',
        referencesTier: 'raw',
        items: [
          {
            id: 'gap-sm',
            cssVar: '--my-spacing-gap-sm',
            label: 'Gap small',
            default: 'space-1',
            type: { kind: 'length', step: 1, unit: 'px' },
          },
        ],
      },
    ],
  };

  // Happy path ---------------------------------------------------------------

  it('accepts a valid config with no tabs field', () => {
    expect(() => assertValidPanelConfig(makeBaseConfig())).not.toThrow();
  });

  it('accepts a valid config with an empty tabs array', () => {
    expect(() => assertValidPanelConfig(makeBaseConfig({ tabs: [] }))).not.toThrow();
  });

  it('accepts a valid config with a single-tier tab', () => {
    expect(() =>
      assertValidPanelConfig(makeBaseConfig({ tabs: [VALID_TEXT_TAB] })),
    ).not.toThrow();
  });

  it('accepts a valid config with a two-tier tab using referencesTier', () => {
    expect(() =>
      assertValidPanelConfig(makeBaseConfig({ tabs: [VALID_TWO_TIER_TAB] })),
    ).not.toThrow();
  });

  it('accepts a valid config with multiple tabs', () => {
    expect(() =>
      assertValidPanelConfig(makeBaseConfig({ tabs: [VALID_TEXT_TAB, VALID_TWO_TIER_TAB] })),
    ).not.toThrow();
  });

  // Rule: tabs must be an array -----------------------------------------------

  it('rejects tabs when set to a non-array', () => {
    expect(() =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      assertValidPanelConfig(makeBaseConfig({ tabs: {} as any })),
    ).toThrow(/PanelConfig\.tabs must be an array/);
  });

  // Rule: every tab.id is unique within the array ----------------------------

  it('rejects duplicate tab ids', () => {
    const dupTab: TabConfig = { ...VALID_TEXT_TAB, id: 'easing' };
    expect(() =>
      assertValidPanelConfig(makeBaseConfig({ tabs: [VALID_TEXT_TAB, dupTab] })),
    ).toThrow(/duplicate tab id "easing"/);
  });

  // Rule: every tier.id is unique within a tab --------------------------------

  it('rejects duplicate tier ids within a tab', () => {
    const tabWithDupTiers: TabConfig = {
      id: 'my-tab',
      label: 'My Tab',
      tiers: [
        {
          id: 'raw',
          label: 'Raw',
          items: [
            {
              id: 'item-a',
              cssVar: '--my-tab-item-a',
              label: 'Item A',
              default: '1',
              type: { kind: 'number', step: 1 },
            },
          ],
        },
        {
          id: 'raw', // duplicate!
          label: 'Raw duplicate',
          items: [
            {
              id: 'item-b',
              cssVar: '--my-tab-item-b',
              label: 'Item B',
              default: '2',
              type: { kind: 'number', step: 1 },
            },
          ],
        },
      ],
    };
    expect(() =>
      assertValidPanelConfig(makeBaseConfig({ tabs: [tabWithDupTiers] })),
    ).toThrow(/duplicate tier id "raw".*"my-tab"|"my-tab".*duplicate tier id "raw"/);
  });

  // Rule: every item.id is unique within a tab (across all tiers) -----------

  it('rejects duplicate item ids across tiers within the same tab', () => {
    const tabWithDupItems: TabConfig = {
      id: 'dup-items-tab',
      label: 'Dup Items Tab',
      tiers: [
        {
          id: 'tier-a',
          label: 'Tier A',
          items: [
            {
              id: 'shared-id',
              cssVar: '--dup-items-shared-id',
              label: 'Shared',
              default: '4px',
              type: { kind: 'length', step: 1, unit: 'px' },
            },
          ],
        },
        {
          id: 'tier-b',
          label: 'Tier B',
          items: [
            {
              id: 'shared-id', // duplicate across tiers!
              cssVar: '--dup-items-shared-id-2',
              label: 'Shared again',
              default: '8px',
              type: { kind: 'length', step: 1, unit: 'px' },
            },
          ],
        },
      ],
    };
    expect(() =>
      assertValidPanelConfig(makeBaseConfig({ tabs: [tabWithDupItems] })),
    ).toThrow(/duplicate item id "shared-id".*"dup-items-tab"|"dup-items-tab".*duplicate item id "shared-id"/);
  });

  // Rule: every item.cssVar starts with "--" and is non-empty ----------------

  it('rejects an item whose cssVar does not start with "--"', () => {
    const tabBadCssVar: TabConfig = {
      id: 'bad-cssvar-tab',
      label: 'Bad CssVar Tab',
      tiers: [
        {
          id: 'raw',
          label: 'Raw',
          items: [
            {
              id: 'item-a',
              cssVar: 'my-spacing-item-a', // missing "--"
              label: 'Item A',
              default: '4px',
              type: { kind: 'length', step: 1, unit: 'px' },
            },
          ],
        },
      ],
    };
    expect(() =>
      assertValidPanelConfig(makeBaseConfig({ tabs: [tabBadCssVar] })),
    ).toThrow(/cssVar must start with "--"/);
  });

  it('rejects an item whose cssVar is exactly "--" (non-empty after "--" rule)', () => {
    const tabEmptyCssVar: TabConfig = {
      id: 'empty-cssvar-tab',
      label: 'Empty CssVar Tab',
      tiers: [
        {
          id: 'raw',
          label: 'Raw',
          items: [
            {
              id: 'item-a',
              cssVar: '--', // only "--", nothing after
              label: 'Item A',
              default: '4px',
              type: { kind: 'length', step: 1, unit: 'px' },
            },
          ],
        },
      ],
    };
    expect(() =>
      assertValidPanelConfig(makeBaseConfig({ tabs: [tabEmptyCssVar] })),
    ).toThrow(/cssVar must be non-empty after "--"/);
  });

  // Rule: referencesTier must name an existing tier --------------------------

  it('rejects referencesTier that names a non-existent tier', () => {
    const tabBadRef: TabConfig = {
      id: 'bad-ref-tab',
      label: 'Bad Ref Tab',
      tiers: [
        {
          id: 'semantic',
          label: 'Semantic',
          referencesTier: 'palette', // "palette" does not exist
          items: [
            {
              id: 'role-a',
              cssVar: '--bad-ref-role-a',
              label: 'Role A',
              default: 'palette-item',
              type: { kind: 'color' },
            },
          ],
        },
      ],
    };
    expect(() =>
      assertValidPanelConfig(makeBaseConfig({ tabs: [tabBadRef] })),
    ).toThrow(/tier "palette" does not exist/);
  });

  // Rule: referencesTier kind compatibility (Option 2-a, issue #282) ----------
  //
  // #245 removed the strict kind-compat check entirely. #282 re-adds a
  // narrower guard (Option 2-a): cross-kind refs are rejected UNLESS the
  // referencing tier has kind 'text' OR both tiers share the same kind.
  // See panel-config-ref-tier-kind.test.ts for full rationale and coverage.

  it('rejects referencesTier when kinds DIFFER and referencing tier is not text (color → length)', () => {
    // Option 2-a guard: a color semantic tier referencing a length raw tier
    // would emit var(--length-token) into a color: declaration — invalid CSS.
    // Previously (#245) this was allowed; #282 Option 2-a rejects it.
    const tabKindDiffer: TabConfig = {
      id: 'mismatch-tab',
      label: 'Mismatch Tab',
      tiers: [
        {
          id: 'raw-lengths',
          label: 'Raw lengths',
          items: [
            {
              id: 'size-sm',
              cssVar: '--mismatch-size-sm',
              label: 'Size sm',
              default: '4px',
              type: { kind: 'length', step: 1, unit: 'px' },
            },
          ],
        },
        {
          id: 'semantic-colors',
          label: 'Semantic colors',
          referencesTier: 'raw-lengths',
          items: [
            {
              id: 'primary',
              cssVar: '--mismatch-primary',
              label: 'Primary',
              default: 'size-sm',
              type: { kind: 'color' },
            },
          ],
        },
      ],
    };
    expect(() =>
      assertValidPanelConfig(makeBaseConfig({ tabs: [tabKindDiffer] })),
    ).toThrow(/cross-kind reference is only allowed when the referencing tier has kind "text"/);
  });

  it('accepts referencesTier when kinds are compatible (text-to-text)', () => {
    // This is exactly the easing tab scenario from the integration tests.
    expect(() =>
      assertValidPanelConfig(makeBaseConfig({ tabs: [VALID_TEXT_TAB, VALID_TWO_TIER_TAB] })),
    ).not.toThrow();
  });

  // Rule: all items in a tier must share the same kind ----------------------

  it('rejects a tier with mixed item kinds', () => {
    const tabMixedKinds: TabConfig = {
      id: 'mixed-kinds-tab',
      label: 'Mixed Kinds Tab',
      tiers: [
        {
          id: 'mixed',
          label: 'Mixed',
          items: [
            {
              id: 'item-color',
              cssVar: '--mixed-kinds-item-color',
              label: 'Color item',
              default: '#ff0000',
              type: { kind: 'color' },
            },
            {
              id: 'item-length',
              cssVar: '--mixed-kinds-item-length',
              label: 'Length item',
              default: '4px',
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              type: { kind: 'length', step: 1, unit: 'px' } as any,
            },
          ],
        },
      ],
    };
    expect(() =>
      assertValidPanelConfig(makeBaseConfig({ tabs: [tabMixedKinds] })),
    ).toThrow(/mixed item kinds/);
  });

  // Click-to-cycle unit suffix — type.units validation (#519) ----------------

  /** Build a single-tab, single-tier config with one length item carrying `units`. */
  function makeUnitsTab(units: unknown): TabConfig {
    return {
      id: 'units-tab',
      label: 'Units Tab',
      tiers: [
        {
          id: 'values',
          label: 'Values',
          items: [
            {
              id: 'length-item',
              cssVar: '--units-tab-length-item',
              label: 'Length item',
              default: '1rem',
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              type: { kind: 'length', step: 0.25, unit: 'rem', units } as any,
            },
          ],
        },
      ],
    };
  }

  it('accepts a length item with 2+ valid units', () => {
    expect(() =>
      assertValidPanelConfig(makeBaseConfig({ tabs: [makeUnitsTab(['rem', 'em', 'px'])] })),
    ).not.toThrow();
  });

  it('accepts a length item with units omitted (default: static unit span)', () => {
    const tab: TabConfig = {
      id: 'units-tab',
      label: 'Units Tab',
      tiers: [
        {
          id: 'values',
          label: 'Values',
          items: [
            {
              id: 'length-item',
              cssVar: '--units-tab-length-item',
              label: 'Length item',
              default: '1rem',
              type: { kind: 'length', step: 0.25, unit: 'rem' },
            },
          ],
        },
      ],
    };
    expect(() => assertValidPanelConfig(makeBaseConfig({ tabs: [tab] }))).not.toThrow();
  });

  it('rejects type.units when not an array', () => {
    expect(() =>
      assertValidPanelConfig(makeBaseConfig({ tabs: [makeUnitsTab('rem')] })),
    ).toThrow(/type\.units must be an array/);
  });

  it('rejects type.units containing an empty string', () => {
    expect(() =>
      assertValidPanelConfig(makeBaseConfig({ tabs: [makeUnitsTab(['rem', ''])] })),
    ).toThrow(/type\.units entries must be non-empty strings/);
  });

  it('rejects type.units containing a non-string entry', () => {
    expect(() =>
      assertValidPanelConfig(makeBaseConfig({ tabs: [makeUnitsTab(['rem', 1])] })),
    ).toThrow(/type\.units entries must be non-empty strings/);
  });

  it('rejects type.units with a duplicate unit', () => {
    expect(() =>
      assertValidPanelConfig(makeBaseConfig({ tabs: [makeUnitsTab(['rem', 'px', 'rem'])] })),
    ).toThrow(/type\.units: duplicate unit "rem"/);
  });

  // F4: palette cssVar 0-based contiguity check (issue #440) ----------------

  /**
   * Build a minimal color tab with 4 explicit palette cssVars.
   * `cssvars` supplies the per-slot names; colorExtras is always valid here.
   */
  function makeColorTab(cssVars: string[]): TabConfig {
    return {
      id: 'color',
      label: 'Color',
      colorExtras: {
        id: 'test',
        defaultShikiTheme: 'dracula',
        baseRoles: {},
        baseDefaults: {},
        colorSchemes: {},
        panelSettings: { colorScheme: 'default', colorMode: false },
      },
      tiers: [
        {
          id: 'palette',
          label: 'Palette',
          items: cssVars.map((cssVar, i) => ({
            id: `p${i}`,
            cssVar,
            label: `Palette ${i}`,
            default: '#000000',
            type: { kind: 'color' as const },
          })),
        },
      ],
    };
  }

  it('F4: accepts a valid 0-based palette (--pal-0 … --pal-3)', () => {
    const tab = makeColorTab(['--pal-0', '--pal-1', '--pal-2', '--pal-3']);
    expect(() => assertValidPanelConfig(makeBaseConfig({ tabs: [tab] }))).not.toThrow();
  });

  it('F4: rejects a 1-based palette (--pal-1 … --pal-4) with a clear error naming the offending item', () => {
    // Host that numbered palette slots 1..4 instead of 0..3.
    const tab = makeColorTab(['--pal-1', '--pal-2', '--pal-3', '--pal-4']);
    expect(() => assertValidPanelConfig(makeBaseConfig({ tabs: [tab] }))).toThrow(
      /palette item cssVars must share one prefix and be numbered 0\.\.n-1/,
    );
  });

  it('F4: rejects a palette where the first cssVar has no trailing digit (mixed names)', () => {
    // When firstCssVar has no trailing digits, the template stays unchanged (no
    // {n} placeholder is inserted). The validator detects this and rejects the
    // multi-slot palette via the explicit no-trailing-digit guard.
    const tab = makeColorTab(['--brand-red', '--brand-blue', '--brand-green']);
    expect(() => assertValidPanelConfig(makeBaseConfig({ tabs: [tab] }))).toThrow(
      /palette item cssVars must share one prefix and be numbered 0\.\.n-1/,
    );
  });

  it('F4: rejects a palette where ALL items share the same non-numbered cssVar (false-negative guard)', () => {
    // Without the explicit {n}-presence guard, a uniform non-indexed palette
    // (same cssVar repeated) would pass silently: expectedCssVar === item.cssVar
    // for every slot because the template has no {n} to substitute. The guard
    // must explicitly reject any multi-item palette whose first cssVar lacks
    // a trailing digit.
    const tab = makeColorTab(['--brand-color', '--brand-color', '--brand-color']);
    expect(() => assertValidPanelConfig(makeBaseConfig({ tabs: [tab] }))).toThrow(
      /has no trailing digit/,
    );
  });

  it('F4: accepts a single-slot palette with a non-numbered cssVar', () => {
    // A 1-item palette requires no index, so a bare cssVar is valid.
    const tab = makeColorTab(['--brand-accent']);
    expect(() => assertValidPanelConfig(makeBaseConfig({ tabs: [tab] }))).not.toThrow();
  });

  it('F4: skips a `semantic: true` tier — named, non-contiguous cssVars do not throw (#461)', () => {
    // A lone semantic tier (no palette tier at all) with named cssVars like
    // `--zd-danger` must not trip the "no trailing digit" guard: that guard
    // only applies to the palette tier, and a semantic:true tier is never
    // the palette (see cluster-config.ts / color-tab.ts findPaletteTier).
    const tab: TabConfig = {
      id: 'color',
      label: 'Color',
      colorExtras: {
        id: 'test',
        defaultShikiTheme: 'dracula',
        baseRoles: {},
        baseDefaults: {},
        colorSchemes: {},
        panelSettings: { colorScheme: 'default', colorMode: false },
      },
      tiers: [
        {
          id: 'semantic',
          label: 'Semantic',
          semantic: true,
          items: [
            {
              id: 'danger',
              cssVar: '--zd-danger',
              label: 'Danger',
              default: '#ff0000',
              type: { kind: 'color' as const },
            },
            {
              id: 'warning',
              cssVar: '--zd-warning',
              label: 'Warning',
              default: '#ffaa00',
              type: { kind: 'color' as const },
            },
          ],
        },
      ],
    };
    expect(() => assertValidPanelConfig(makeBaseConfig({ tabs: [tab] }))).not.toThrow();
  });

  it('F4: still finds the real palette tier when a `semantic: true` tier is ordered BEFORE it', () => {
    // Regression guard mirroring the mixed-order test in cluster-config.test.ts:
    // this exercises the F4 finder's own `t.semantic === true` exclusion.
    // Ordering the semantic tier FIRST means Array.prototype.find would pick
    // it up (and throw on its non-numbered, multi-item cssVars) if that
    // exclusion were ever deleted.
    const tab: TabConfig = {
      id: 'color',
      label: 'Color',
      colorExtras: {
        id: 'test',
        defaultShikiTheme: 'dracula',
        baseRoles: {},
        baseDefaults: {},
        colorSchemes: {},
        panelSettings: { colorScheme: 'default', colorMode: false },
      },
      tiers: [
        {
          id: 'semantic',
          label: 'Semantic',
          semantic: true,
          items: [
            {
              id: 'danger',
              cssVar: '--zd-danger',
              label: 'Danger',
              default: '#ff0000',
              type: { kind: 'color' as const, format: 'oklch' as const },
            },
            {
              id: 'warning',
              cssVar: '--zd-warning',
              label: 'Warning',
              default: '#ffaa00',
              type: { kind: 'color' as const, format: 'oklch' as const },
            },
          ],
        },
        {
          id: 'palette',
          label: 'Palette',
          items: [
            {
              id: 'p0',
              cssVar: '--pal-0',
              label: 'Palette 0',
              default: '#000000',
              type: { kind: 'color' as const },
            },
            {
              id: 'p1',
              cssVar: '--pal-1',
              label: 'Palette 1',
              default: '#ffffff',
              type: { kind: 'color' as const },
            },
          ],
        },
      ],
    };
    expect(() => assertValidPanelConfig(makeBaseConfig({ tabs: [tab] }))).not.toThrow();
  });

  // Rule: `semantic` must be exactly `true` when present -----------------------
  //
  // A truthy-but-not-`true` marker (e.g. `1`, `'true'`) is reachable from a
  // plain-JS host config (TS's structural typing offers no defense at that
  // boundary) and would otherwise get divergent treatment across the five
  // separate `semantic` predicate sites in this file, cluster-config.ts, and
  // color-tab.tsx — some compare with truthiness, some with `=== true`.
  // Rejecting it here at config-validation time makes that ambiguity
  // unreachable instead of leaving it to silently misbehave downstream.

  it('rejects a tier with `semantic: 1` (truthy, not exactly `true`)', () => {
    const tab: TabConfig = {
      id: 'color',
      label: 'Color',
      tiers: [
        {
          id: 'semantic',
          label: 'Semantic',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          semantic: 1 as any,
          items: [
            {
              id: 'danger',
              cssVar: '--zd-danger',
              label: 'Danger',
              default: '#ff0000',
              type: { kind: 'color' as const },
            },
          ],
        },
      ],
    };
    expect(() => assertValidPanelConfig(makeBaseConfig({ tabs: [tab] }))).toThrow(
      /tiers\["semantic"\]\.semantic must be exactly `true`/,
    );
  });

  it('rejects a tier with `semantic: \'true\'` (string, not the boolean `true`)', () => {
    const tab: TabConfig = {
      id: 'color',
      label: 'Color',
      tiers: [
        {
          id: 'semantic',
          label: 'Semantic',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          semantic: 'true' as any,
          items: [
            {
              id: 'danger',
              cssVar: '--zd-danger',
              label: 'Danger',
              default: '#ff0000',
              type: { kind: 'color' as const },
            },
          ],
        },
      ],
    };
    expect(() => assertValidPanelConfig(makeBaseConfig({ tabs: [tab] }))).toThrow(
      /tiers\["semantic"\]\.semantic must be exactly `true`/,
    );
  });

  it('accepts a tier with `semantic: true` (unchanged) and a tier with `semantic` absent (unchanged)', () => {
    expect(() =>
      assertValidPanelConfig(makeBaseConfig({ tabs: [VALID_TEXT_TAB, VALID_TWO_TIER_TAB] })),
    ).not.toThrow();
  });

  // F8: colorExtras deep validation (issue #440) ----------------------------

  function makeColorExtrasTab(overrides: Record<string, unknown> = {}): TabConfig {
    return {
      id: 'color',
      label: 'Color',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      colorExtras: {
        id: 'test',
        defaultShikiTheme: 'dracula',
        baseRoles: {},
        baseDefaults: {},
        colorSchemes: {},
        panelSettings: { colorScheme: 'default', colorMode: false },
        ...overrides,
      } as any,
      tiers: [],
    };
  }

  it('F8: accepts a fully-valid colorExtras', () => {
    expect(() =>
      assertValidPanelConfig(makeBaseConfig({ tabs: [makeColorExtrasTab()] })),
    ).not.toThrow();
  });

  it('F8: rejects colorExtras missing panelSettings', () => {
    expect(() =>
      assertValidPanelConfig(
        makeBaseConfig({ tabs: [makeColorExtrasTab({ panelSettings: undefined })] }),
      ),
    ).toThrow(/panelSettings must be a plain object/);
  });

  it('F8: rejects colorExtras with panelSettings missing colorScheme', () => {
    expect(() =>
      assertValidPanelConfig(
        makeBaseConfig({
          tabs: [
            makeColorExtrasTab({
              panelSettings: { colorMode: false },
            }),
          ],
        }),
      ),
    ).toThrow(/panelSettings\.colorScheme must be a non-empty string/);
  });

  it('F8: rejects colorExtras with missing id', () => {
    expect(() =>
      assertValidPanelConfig(makeBaseConfig({ tabs: [makeColorExtrasTab({ id: '' })] })),
    ).toThrow(/colorExtras\.id must be a non-empty string/);
  });

  it('F8: rejects colorExtras with missing defaultShikiTheme', () => {
    expect(() =>
      assertValidPanelConfig(
        makeBaseConfig({ tabs: [makeColorExtrasTab({ defaultShikiTheme: '' })] }),
      ),
    ).toThrow(/colorExtras\.defaultShikiTheme must be a non-empty string/);
  });

  it('F8: rejects colorExtras where colorSchemes is not an object', () => {
    expect(() =>
      assertValidPanelConfig(
        makeBaseConfig({ tabs: [makeColorExtrasTab({ colorSchemes: 'invalid' })] }),
      ),
    ).toThrow(/colorExtras\.colorSchemes must be a plain object/);
  });

  it('F8: rejects colorExtras with colorMode that has invalid defaultMode', () => {
    expect(() =>
      assertValidPanelConfig(
        makeBaseConfig({
          tabs: [
            makeColorExtrasTab({
              panelSettings: {
                colorScheme: 'default',
                colorMode: { defaultMode: 'system', lightScheme: 'light', darkScheme: 'dark' },
              },
            }),
          ],
        }),
      ),
    ).toThrow(/defaultMode must be "light" or "dark"/);
  });

  it('F8: accepts colorExtras with a valid colorMode object', () => {
    expect(() =>
      assertValidPanelConfig(
        makeBaseConfig({
          tabs: [
            makeColorExtrasTab({
              panelSettings: {
                colorScheme: 'default',
                colorMode: {
                  defaultMode: 'light',
                  lightScheme: 'light-scheme',
                  darkScheme: 'dark-scheme',
                },
              },
            }),
          ],
        }),
      ),
    ).not.toThrow();
  });

  // colorExtras.semanticDefaults override map (#499) -------------------------

  it('accepts colorExtras with an omitted semanticDefaults (optional field)', () => {
    expect(() =>
      assertValidPanelConfig(makeBaseConfig({ tabs: [makeColorExtrasTab()] })),
    ).not.toThrow();
  });

  it('accepts every valid SemanticValue shape in semanticDefaults', () => {
    expect(() =>
      assertValidPanelConfig(
        makeBaseConfig({
          tabs: [
            makeColorExtrasTab({
              semanticDefaults: {
                legacyIndex: 3,
                bgAlias: 'bg',
                fgAlias: 'fg',
                literalString: { literal: '#00cc66' },
                literalPerMode: { literal: { light: '#fff', dark: '#000' } },
                ref: { ref: { tier: 'ramp', item: 'p5' } },
                refWithTab: { ref: { tab: 'palette', tier: 'ramp', item: 'p5' } },
              },
            }),
          ],
        }),
      ),
    ).not.toThrow();
  });

  it('rejects semanticDefaults that is not a plain object', () => {
    expect(() =>
      assertValidPanelConfig(
        makeBaseConfig({ tabs: [makeColorExtrasTab({ semanticDefaults: 'invalid' })] }),
      ),
    ).toThrow(/colorExtras\.semanticDefaults must be a plain object/);
  });

  it('rejects a semanticDefaults entry with an invalid literal shape', () => {
    expect(() =>
      assertValidPanelConfig(
        makeBaseConfig({
          tabs: [
            makeColorExtrasTab({
              semanticDefaults: { danger: { literal: { light: '#fff' } } },
            }),
          ],
        }),
      ),
    ).toThrow(/colorExtras\.semanticDefaults\["danger"\] must be a valid SemanticValue/);
  });

  it('rejects a semanticDefaults entry with an invalid ref shape', () => {
    expect(() =>
      assertValidPanelConfig(
        makeBaseConfig({
          tabs: [
            makeColorExtrasTab({
              semanticDefaults: { accent: { ref: { item: 'p5' } } },
            }),
          ],
        }),
      ),
    ).toThrow(/colorExtras\.semanticDefaults\["accent"\] must be a valid SemanticValue/);
  });

  it('rejects a semanticDefaults entry that is neither literal, ref, index, nor bg/fg', () => {
    expect(() =>
      assertValidPanelConfig(
        makeBaseConfig({
          tabs: [makeColorExtrasTab({ semanticDefaults: { danger: true } })],
        }),
      ),
    ).toThrow(/colorExtras\.semanticDefaults\["danger"\] must be a valid SemanticValue/);
  });
});

// ---------------------------------------------------------------------------
// notesExtras validation (host-configurable "token notes" tab, #515)
// ---------------------------------------------------------------------------

describe('panel-config — notesExtras validation (#515)', () => {
  function makeBaseConfig(extra: Partial<PanelConfig> = {}): PanelConfig {
    return {
      storagePrefix: 'p',
      consoleNamespace: 'p',
      modalClassPrefix: 'p-modal',
      schemaId: 'p/v1',
      exportFilenameBase: 'p',
      tabs: [],
      ...extra,
    };
  }

  function makeNotesTab(overrides: Record<string, unknown> = {}): TabConfig {
    return {
      id: 'notes',
      label: 'Notes',
      tiers: [],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      notesExtras: { title: 'Welcome', html: '<p>hello</p>' } as any,
      ...overrides,
    } as TabConfig;
  }

  it('accepts a fully-valid notes tab', () => {
    expect(() =>
      assertValidPanelConfig(makeBaseConfig({ tabs: [makeNotesTab()] })),
    ).not.toThrow();
  });

  it('rejects a notes tab with notesExtras omitted', () => {
    expect(() =>
      assertValidPanelConfig(
        makeBaseConfig({ tabs: [{ id: 'notes', label: 'Notes', tiers: [] }] }),
      ),
    ).toThrow(/notesExtras must be a plain object with \{ title, html \}/);
  });

  it('rejects a notes tab whose notesExtras is not a plain object', () => {
    expect(() =>
      assertValidPanelConfig(
        makeBaseConfig({ tabs: [makeNotesTab({ notesExtras: 'nope' })] }),
      ),
    ).toThrow(/notesExtras must be a plain object with \{ title, html \}/);
  });

  it('rejects a notes tab with an empty title', () => {
    expect(() =>
      assertValidPanelConfig(
        makeBaseConfig({
          tabs: [makeNotesTab({ notesExtras: { title: '', html: '<p>hi</p>' } })],
        }),
      ),
    ).toThrow(/notesExtras\.title must be a non-empty string/);
  });

  it('rejects a notes tab with a non-string title', () => {
    expect(() =>
      assertValidPanelConfig(
        makeBaseConfig({
          tabs: [makeNotesTab({ notesExtras: { title: 42, html: '<p>hi</p>' } })],
        }),
      ),
    ).toThrow(/notesExtras\.title must be a non-empty string/);
  });

  it('rejects a notes tab with an empty html', () => {
    expect(() =>
      assertValidPanelConfig(
        makeBaseConfig({
          tabs: [makeNotesTab({ notesExtras: { title: 'Welcome', html: '' } })],
        }),
      ),
    ).toThrow(/notesExtras\.html must be a non-empty string/);
  });

  it('rejects a notes tab with a non-string html', () => {
    expect(() =>
      assertValidPanelConfig(
        makeBaseConfig({
          tabs: [makeNotesTab({ notesExtras: { title: 'Welcome', html: null } })],
        }),
      ),
    ).toThrow(/notesExtras\.html must be a non-empty string/);
  });

  it('rejects a notes tab with non-empty tiers', () => {
    expect(() =>
      assertValidPanelConfig(
        makeBaseConfig({
          tabs: [
            makeNotesTab({
              tiers: [{ id: 'raw', label: 'Raw', items: [] }],
            }),
          ],
        }),
      ),
    ).toThrow(/PanelConfig\.tabs\["notes"\]\.tiers must be empty/);
  });

  it('rejects a notes tab that also carries colorExtras', () => {
    expect(() =>
      assertValidPanelConfig(
        makeBaseConfig({
          tabs: [
            makeNotesTab({
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              colorExtras: {
                id: 'x',
                defaultShikiTheme: 'dracula',
                baseRoles: {},
                baseDefaults: {},
                colorSchemes: {},
                panelSettings: { colorScheme: 'default', colorMode: false },
              } as any,
            }),
          ],
        }),
      ),
    ).toThrow(/PanelConfig\.tabs\["notes"\]\.colorExtras must not be set/);
  });

  it('rejects notesExtras set on a non-notes tab', () => {
    expect(() =>
      assertValidPanelConfig(
        makeBaseConfig({
          tabs: [
            {
              id: 'spacing',
              label: 'Spacing',
              tiers: [],
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              notesExtras: { title: 'Welcome', html: '<p>hi</p>' } as any,
            },
          ],
        }),
      ),
    ).toThrow(/notesExtras must only be set on a tab with id "notes"/);
  });
});

// ---------------------------------------------------------------------------
// S8 (#469): cross-tab ramp-source (`referencesRamps`) validation
// ---------------------------------------------------------------------------
//
// `referencesRamps` (tier-level, on a `semantic: true` tier) is a DIFFERENT
// mechanism from the same-tab `referencesTier` guard covered above: it is an
// allow-list of ramp SOURCES — `{ tab?, tier }` — that per-row
// `{ ref: { tab?, tier, item } }` VALUES are permitted to point into, and it
// may legitimately name a tier in a DIFFERENT tab. See `TierConfig.referencesRamps`
// in `tokens/tier-model.ts` and `resolveRefToCssVar` in `apply/tier-resolver.ts`
// (#467/#468) for the runtime resolution counterpart.
describe('panel-config — referencesRamps cross-tab source validation (S8, #469)', () => {
  function makeBaseConfig(extra: Partial<PanelConfig> = {}): PanelConfig {
    return {
      storagePrefix: 'p',
      consoleNamespace: 'p',
      modalClassPrefix: 'p-modal',
      schemaId: 'p/v1',
      exportFilenameBase: 'p',
      tabs: [],
      ...extra,
    };
  }

  /** The Palette tab: a plain color-kind ramp tier, no semantic/referencesTier. */
  const PALETTE_TAB: TabConfig = {
    id: 'palette',
    label: 'Palette',
    tiers: [
      {
        id: 'base',
        label: 'Base',
        items: [
          {
            id: 'base-1',
            cssVar: '--palette-base-1',
            label: 'Base 1',
            default: '#111111',
            type: { kind: 'color' },
          },
          {
            id: 'base-2',
            cssVar: '--palette-base-2',
            label: 'Base 2',
            default: '#222222',
            type: { kind: 'color' },
          },
        ],
      },
      {
        id: 'length-tier',
        label: 'Not a color tier',
        items: [
          {
            id: 'len-1',
            cssVar: '--palette-len-1',
            label: 'Len 1',
            default: '4px',
            type: { kind: 'length', step: 1, unit: 'px' },
          },
        ],
      },
    ],
  };

  /** A Color tab whose semantic tier declares a cross-tab ramp source. */
  function makeSemanticColorTab(
    referencesRamps: unknown,
    overrides: Record<string, unknown> = {},
  ): TabConfig {
    return {
      id: 'color',
      label: 'Color',
      tiers: [
        {
          id: 'semantic',
          label: 'Semantic',
          semantic: true,
          referencesRamps,
          items: [
            {
              id: 'surface',
              cssVar: '--zd-surface',
              label: 'Surface',
              default: 'base-1',
              type: { kind: 'color' },
            },
          ],
          ...overrides,
        },
      ],
    } as unknown as TabConfig;
  }

  it('accepts a valid referencesRamps declaration naming an existing tab + tier', () => {
    const colorTab = makeSemanticColorTab([{ tab: 'palette', tier: 'base' }]);
    expect(() =>
      assertValidPanelConfig(makeBaseConfig({ tabs: [colorTab, PALETTE_TAB] })),
    ).not.toThrow();
  });

  it('accepts a referencesRamps entry with `tab` omitted (same-tab source)', () => {
    // Same-tab source: a semantic tier referencing a ramp tier in ITS OWN tab.
    const colorTab: TabConfig = {
      id: 'color',
      label: 'Color',
      tiers: [
        {
          id: 'base',
          label: 'Base',
          items: [
            {
              id: 'base-1',
              cssVar: '--color-base-1',
              label: 'Base 1',
              default: '#111111',
              type: { kind: 'color' },
            },
          ],
        },
        {
          id: 'semantic',
          label: 'Semantic',
          semantic: true,
          referencesRamps: [{ tier: 'base' }],
          items: [
            {
              id: 'surface',
              cssVar: '--zd-surface',
              label: 'Surface',
              default: 'base-1',
              type: { kind: 'color' },
            },
          ],
        },
      ],
    };
    expect(() => assertValidPanelConfig(makeBaseConfig({ tabs: [colorTab] }))).not.toThrow();
  });

  it('rejects a referencesRamps entry naming a missing tab, listing available tabs', () => {
    const colorTab = makeSemanticColorTab([{ tab: 'no-such-tab', tier: 'base' }]);
    expect(() =>
      assertValidPanelConfig(makeBaseConfig({ tabs: [colorTab, PALETTE_TAB] })),
    ).toThrow(/tab "no-such-tab" does not exist. Available tabs: color, palette/);
  });

  it('rejects a referencesRamps entry naming a missing tier in an existing tab, listing available tiers', () => {
    const colorTab = makeSemanticColorTab([{ tab: 'palette', tier: 'no-such-tier' }]);
    expect(() =>
      assertValidPanelConfig(makeBaseConfig({ tabs: [colorTab, PALETTE_TAB] })),
    ).toThrow(/tier "no-such-tier" does not exist in tab "palette". Available tiers: base, length-tier/);
  });

  it('rejects a cross-kind referencesRamps source (color semantic tier -> length ramp tier)', () => {
    const colorTab = makeSemanticColorTab([{ tab: 'palette', tier: 'length-tier' }]);
    expect(() =>
      assertValidPanelConfig(makeBaseConfig({ tabs: [colorTab, PALETTE_TAB] })),
    ).toThrow(
      /referencing semantic tier has kind "color" but target tier "length-tier" in tab "palette" has kind "length"/,
    );
  });

  it('rejects referencesRamps declared on a tier that is not semantic: true', () => {
    const colorTab: TabConfig = {
      id: 'color',
      label: 'Color',
      tiers: [
        {
          id: 'base',
          label: 'Base',
          // Not `semantic: true` — referencesRamps has no business here.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          referencesRamps: [{ tier: 'base' }] as any,
          items: [
            {
              id: 'base-1',
              cssVar: '--color-base-1',
              label: 'Base 1',
              default: '#111111',
              type: { kind: 'color' },
            },
          ],
        },
      ],
    };
    expect(() => assertValidPanelConfig(makeBaseConfig({ tabs: [colorTab] }))).toThrow(
      /referencesRamps is only valid on a tier with semantic: true/,
    );
  });

  it('rejects a referencesRamps entry missing the required `tier` field', () => {
    const colorTab = makeSemanticColorTab([{ tab: 'palette' }]);
    expect(() =>
      assertValidPanelConfig(makeBaseConfig({ tabs: [colorTab, PALETTE_TAB] })),
    ).toThrow(/referencesRamps\[0\]\.tier must be a non-empty string/);
  });

  it('rejects a referencesRamps field that is not an array', () => {
    const colorTab = makeSemanticColorTab({ tab: 'palette', tier: 'base' });
    expect(() =>
      assertValidPanelConfig(makeBaseConfig({ tabs: [colorTab, PALETTE_TAB] })),
    ).toThrow(/referencesRamps must be an array/);
  });

  it('keeps the existing same-tab referencesTier guard and F4 palette checks green alongside referencesRamps', () => {
    // Sanity check: a tab using the unrelated same-tab referencesTier
    // mechanism (no referencesRamps at all) still validates cleanly when a
    // sibling tab in the array declares referencesRamps.
    const spacingTab: TabConfig = {
      id: 'spacing',
      label: 'Spacing',
      tiers: [
        {
          id: 'raw',
          label: 'Raw',
          items: [
            {
              id: 'space-1',
              cssVar: '--my-spacing-space-1',
              label: 'Space 1',
              default: '4px',
              type: { kind: 'length', step: 1, unit: 'px' },
            },
          ],
        },
        {
          id: 'semantic',
          label: 'Semantic',
          referencesTier: 'raw',
          items: [
            {
              id: 'gap-sm',
              cssVar: '--my-spacing-gap-sm',
              label: 'Gap small',
              default: 'space-1',
              type: { kind: 'length', step: 1, unit: 'px' },
            },
          ],
        },
      ],
    };
    const colorTab = makeSemanticColorTab([{ tab: 'palette', tier: 'base' }]);
    expect(() =>
      assertValidPanelConfig(makeBaseConfig({ tabs: [colorTab, PALETTE_TAB, spacingTab] })),
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// S8 (#469): per-row `{ ref }` to a missing item throws via resolveRefToCssVar
// ---------------------------------------------------------------------------
//
// Per-row `{ ref: { tab?, tier, item } }` VALUES (the actual mappings stored
// per semantic item, distinct from the tier-level `referencesRamps` source
// declaration validated above) are resolved — and validated against real
// items — at apply time by `resolveRefToCssVar` (#467/#468), not re-validated
// eagerly by `assertValidPanelConfig`. This covers that a bad per-row ref
// still surfaces a clear error, even though panel-config itself does not
// re-check every row.
describe('resolveRefToCssVar — per-row ref to a missing item throws (S8, #469)', () => {
  const PALETTE_TAB_RESOLVER: TabConfig = {
    id: 'palette',
    label: 'Palette',
    tiers: [
      {
        id: 'base',
        label: 'Base',
        items: [
          {
            id: 'base-1',
            cssVar: '--palette-base-1',
            label: 'Base 1',
            default: '#111111',
            type: { kind: 'color' },
          },
        ],
      },
    ],
  };

  const SEMANTIC_COLOR_TAB_RESOLVER: TabConfig = {
    id: 'color',
    label: 'Color',
    tiers: [
      {
        id: 'semantic',
        label: 'Semantic',
        semantic: true,
        referencesRamps: [{ tab: 'palette', tier: 'base' }],
        items: [
          {
            id: 'surface',
            cssVar: '--zd-surface',
            label: 'Surface',
            default: 'base-1',
            type: { kind: 'color' },
          },
        ],
      },
    ],
  };

  it('throws a clear TierResolverError when a per-row ref names a missing item in an existing tab+tier', () => {
    expect(() =>
      resolveRefToCssVar(
        { tab: 'palette', tier: 'base', item: 'no-such-item' },
        SEMANTIC_COLOR_TAB_RESOLVER,
        [SEMANTIC_COLOR_TAB_RESOLVER, PALETTE_TAB_RESOLVER],
      ),
    ).toThrow(TierResolverError);
    expect(() =>
      resolveRefToCssVar(
        { tab: 'palette', tier: 'base', item: 'no-such-item' },
        SEMANTIC_COLOR_TAB_RESOLVER,
        [SEMANTIC_COLOR_TAB_RESOLVER, PALETTE_TAB_RESOLVER],
      ),
    ).toThrow(/no-such-item/);
  });
});
