/**
 * Shared test helpers for the design-token panel package.
 *
 * The package itself ships an empty stub cluster + manifest as the
 * fallback `DEFAULT_PANEL_CONFIG`, so tests that exercise color-state /
 * persistence / serde paths need to configure a non-empty cluster before
 * the helpers under test will accept their fixtures.
 *
 * `installFixturePanelConfig()` wires a 16-slot palette cluster + a small
 * spacing / typography / size manifest that mirrors what most tests in this
 * suite expect. Call it from `beforeEach` AFTER `__resetPanelConfigForTests()`.
 */

import {
  __resetPanelConfigForTests,
  configurePanel,
  type PanelConfig,
} from '../config/panel-config';
import type { ColorClusterDataConfig } from '../config/cluster-config';
import type { TokenManifest, TokenDef } from '../tokens/manifest';

/**
 * 16-slot test cluster with the historical zd-style palette template. The
 * specific CSS-var template / id are arbitrary — what matters for state
 * validation is `paletteSize: 16`.
 */
export const FIXTURE_CLUSTER: ColorClusterDataConfig = {
  id: 'fixture',
  label: 'Fixture',
  paletteSize: 16,
  baseRoles: {},
  paletteCssVarTemplate: '--fixture-p{n}',
  semanticDefaults: { accent: 6, muted: 8, active: 14 },
  semanticCssNames: {
    accent: '--fixture-semantic-accent',
    muted: '--fixture-semantic-muted',
    active: '--fixture-semantic-active',
  },
  baseDefaults: {
    background: 0,
    foreground: 15,
    cursor: 6,
    selectionBg: 0,
    selectionFg: 15,
  },
  defaultShikiTheme: 'dracula',
  colorSchemes: {},
  panelSettings: { colorScheme: '', colorMode: false },
};

const SPACING_TOKENS: readonly TokenDef[] = [
  {
    id: 'hsp-md',
    cssVar: '--zd-spacing-hgap-md',
    label: 'hsp-md',
    group: 'hsp',
    default: '40px',
    min: 0,
    max: 64,
    step: 1,
    unit: 'px',
  },
  {
    id: 'vsp-sm',
    cssVar: '--zd-spacing-vgap-sm',
    label: 'vsp-sm',
    group: 'vsp',
    default: '16px',
    min: 0,
    max: 64,
    step: 1,
    unit: 'px',
  },
];

const TYPOGRAPHY_TOKENS: readonly TokenDef[] = [
  {
    id: 'text-base',
    cssVar: '--zd-font-base-size',
    label: 'text-base',
    group: 'main',
    default: '1.4rem',
    min: 0.5,
    max: 4,
    step: 0.05,
    unit: 'rem',
  },
];

const SIZE_TOKENS: readonly TokenDef[] = [
  {
    id: 'radius-lg',
    cssVar: '--radius-lg',
    label: 'radius-lg',
    group: 'radius',
    default: '8px',
    min: 0,
    max: 32,
    step: 1,
    unit: 'px',
  },
];

export const FIXTURE_MANIFEST: TokenManifest = {
  spacing: SPACING_TOKENS,
  typography: TYPOGRAPHY_TOKENS,
  size: SIZE_TOKENS,
  color: [],
};

export const FIXTURE_PANEL_CONFIG: PanelConfig = {
  storagePrefix: 'zudo-design-token-panel',
  consoleNamespace: 'zudo',
  modalClassPrefix: 'zudo-design-token-panel-modal',
  schemaId: 'zudo-design-tokens/v1',
  exportFilenameBase: 'zudo-design-tokens',
  tokens: FIXTURE_MANIFEST,
  colorCluster: FIXTURE_CLUSTER,
  secondaryColorCluster: null,
  colorPresets: {},
};

/**
 * Reset and re-configure the panel-config singleton for a test. Call from
 * `beforeEach` so each test starts from a known state.
 */
export function installFixturePanelConfig(overrides: Partial<PanelConfig> = {}): void {
  __resetPanelConfigForTests();
  configurePanel({ ...FIXTURE_PANEL_CONFIG, ...overrides });
}
