import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_PANEL_CONFIG,
  __resetPanelConfigForTests,
  configurePanel,
  exportFilename,
  getPanelConfig,
  modalClass,
  panelRootId,
  storageKey_open,
  storageKey_position,
  storageKey_stateV1,
  storageKey_stateV2,
  storageKey_visible,
  type PanelConfig,
} from '../config/panel-config';
import type { TokenManifest } from '../tokens/manifest';
import type { ColorClusterDataConfig } from '../config/cluster-config';

/**
 * Empty manifest used by tests that don't care about token data — they're
 * exercising the storage / namespace / branding plumbing only. `tokens` is
 * a required field on `PanelConfig`; this stub keeps the fixtures focused
 * on what each test is actually asserting.
 */
const EMPTY_MANIFEST: TokenManifest = {
  spacing: [],
  typography: [],
  size: [],
  color: [],
};

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
    // tokens is the empty stub manifest — every slice is an empty array.
    expect(DEFAULT_PANEL_CONFIG.tokens).toBeDefined();
    expect(DEFAULT_PANEL_CONFIG.tokens.spacing).toEqual([]);
    expect(DEFAULT_PANEL_CONFIG.tokens.typography).toEqual([]);
    expect(DEFAULT_PANEL_CONFIG.tokens.size).toEqual([]);
    expect(DEFAULT_PANEL_CONFIG.tokens.color).toEqual([]);
  });

  it('storage-key derivations produce the documented literal strings', () => {
    const cfg = DEFAULT_PANEL_CONFIG;
    expect(storageKey_stateV1(cfg)).toBe('zudo-design-token-panel-state');
    expect(storageKey_stateV2(cfg)).toBe('zudo-design-token-panel-state-v2');
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
    tokens: EMPTY_MANIFEST,
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
    tokens: EMPTY_MANIFEST,
    colorCluster: EMPTY_CLUSTER,
  };

  const CONFIG_B: PanelConfig = {
    storagePrefix: 'bbb',
    consoleNamespace: 'bbb',
    modalClassPrefix: 'bbb-modal',
    schemaId: 'bbb/v1',
    exportFilenameBase: 'bbb',
    tokens: EMPTY_MANIFEST,
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
