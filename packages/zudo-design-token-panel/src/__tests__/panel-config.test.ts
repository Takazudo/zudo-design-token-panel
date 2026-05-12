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
import type { ColorClusterDataConfig } from '../config/cluster-config';
import type { TabConfig } from '../tokens/tier-model';

/**
 * Minimal cluster fixture used by tests that don't care about cluster data —
 * `colorCluster` is a required field on `PanelConfig`; this stub keeps the
 * storage / namespace / branding fixtures focused on what they assert.
 */
const EMPTY_CLUSTER: ColorClusterDataConfig = {
  id: 'empty',
  paletteSize: 0,
  baseRoles: {},
  paletteCssVarTemplate: '--empty-{n}',
  semanticDefaults: {},
  semanticCssNames: {},
  baseDefaults: {},
  defaultShikiTheme: 'dracula',
  colorSchemes: {},
  panelSettings: { colorScheme: '', colorMode: false },
};

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
    colorCluster: EMPTY_CLUSTER,
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

describe('panel-config — configurePanel idempotency', () => {
  const CONFIG_A: PanelConfig = {
    storagePrefix: 'aaa',
    consoleNamespace: 'aaa',
    modalClassPrefix: 'aaa-modal',
    schemaId: 'aaa/v1',
    exportFilenameBase: 'aaa',
    tabs: [],
    colorCluster: EMPTY_CLUSTER,
  };

  const CONFIG_B: PanelConfig = {
    storagePrefix: 'bbb',
    consoleNamespace: 'bbb',
    modalClassPrefix: 'bbb-modal',
    schemaId: 'bbb/v1',
    exportFilenameBase: 'bbb',
    tabs: [],
    colorCluster: EMPTY_CLUSTER,
  };

  it('calling configurePanel twice with identical values is a no-op (does not throw)', () => {
    configurePanel(CONFIG_A);
    expect(() => configurePanel({ ...CONFIG_A })).not.toThrow();
    expect(getPanelConfig()).toEqual(CONFIG_A);
  });

  it('calling configurePanel twice with different values throws', () => {
    configurePanel(CONFIG_A);
    expect(() => configurePanel(CONFIG_B)).toThrow(/already called with different values/);
    // The first config is preserved — the second call did not silently overwrite.
    expect(getPanelConfig()).toEqual(CONFIG_A);
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
      colorCluster: EMPTY_CLUSTER,
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
      colorCluster: {
        id: 'empty',
        paletteSize: 0,
        baseRoles: {},
        paletteCssVarTemplate: '--empty-{n}',
        semanticDefaults: {},
        semanticCssNames: {},
        baseDefaults: {},
        defaultShikiTheme: 'dracula',
        colorSchemes: {},
        panelSettings: { colorScheme: '', colorMode: false },
      },
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
            type: { kind: 'length', min: 0, max: 100, step: 1, unit: 'px' },
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
            type: { kind: 'length', min: 0, max: 100, step: 1, unit: 'px' },
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
              type: { kind: 'number', min: 0, max: 10, step: 1 },
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
              type: { kind: 'number', min: 0, max: 10, step: 1 },
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
              type: { kind: 'length', min: 0, max: 100, step: 1, unit: 'px' },
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
              type: { kind: 'length', min: 0, max: 100, step: 1, unit: 'px' },
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
              type: { kind: 'length', min: 0, max: 100, step: 1, unit: 'px' },
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
              type: { kind: 'length', min: 0, max: 100, step: 1, unit: 'px' },
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

  // Rule: referencesTier kind compatibility ----------------------------------

  it('rejects referencesTier when kinds are incompatible (color vs length)', () => {
    const tabKindMismatch: TabConfig = {
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
              type: { kind: 'length', min: 0, max: 100, step: 1, unit: 'px' },
            },
          ],
        },
        {
          id: 'semantic-colors',
          label: 'Semantic colors',
          referencesTier: 'raw-lengths', // kind mismatch: color vs length
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
      assertValidPanelConfig(makeBaseConfig({ tabs: [tabKindMismatch] })),
    ).toThrow(/kind mismatch/);
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
              type: { kind: 'length', min: 0, max: 100, step: 1, unit: 'px' } as any,
            },
          ],
        },
      ],
    };
    expect(() =>
      assertValidPanelConfig(makeBaseConfig({ tabs: [tabMixedKinds] })),
    ).toThrow(/mixed item kinds/);
  });
});
