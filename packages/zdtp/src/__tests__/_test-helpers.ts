/**
 * Shared test helpers for the design-token panel package.
 *
 * The package itself ships an empty stub cluster + empty tabs as the
 * fallback `DEFAULT_PANEL_CONFIG`, so tests that exercise color-state /
 * persistence / serde paths need to configure a non-empty cluster before
 * the helpers under test will accept their fixtures.
 *
 * `installFixturePanelConfig()` wires a 16-slot palette cluster + a small
 * spacing / typography / size tab config that mirrors what most tests in
 * this suite expect. Call it from `beforeEach` AFTER
 * `__resetPanelConfigForTests()`.
 */

import {
  __resetPanelConfigForTests,
  configurePanel,
  type PanelConfig,
} from '../config/panel-config';
import type { ColorClusterDataConfig } from '../config/cluster-config';
import type { TabConfig } from '../tokens/tier-model';

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

export const FIXTURE_TABS: readonly TabConfig[] = [
  {
    id: 'spacing',
    label: 'Spacing',
    tiers: [
      {
        id: 'raw',
        label: 'Spacing',
        items: [
          {
            id: 'hsp-md',
            cssVar: '--zd-spacing-hgap-md',
            label: 'hsp-md',
            default: '40px',
            type: { kind: 'length', step: 1, unit: 'px' },
          },
          {
            id: 'vsp-sm',
            cssVar: '--zd-spacing-vgap-sm',
            label: 'vsp-sm',
            default: '16px',
            type: { kind: 'length', step: 1, unit: 'px' },
          },
        ],
      },
    ],
  },
  {
    id: 'font',
    label: 'Font',
    tiers: [
      {
        id: 'raw',
        label: 'Font Sizes',
        items: [
          {
            id: 'text-base',
            cssVar: '--zd-font-base-size',
            label: 'text-base',
            default: '1.4rem',
            type: { kind: 'length', step: 0.05, unit: 'rem' },
          },
        ],
      },
    ],
  },
  {
    id: 'size',
    label: 'Size',
    tiers: [
      {
        id: 'raw',
        label: 'Border Radius',
        items: [
          {
            id: 'radius-lg',
            cssVar: '--radius-lg',
            label: 'radius-lg',
            default: '8px',
            type: { kind: 'length', step: 1, unit: 'px' },
          },
        ],
      },
    ],
  },
  {
    id: 'color',
    label: 'Color',
    // colorExtras carries the non-tier metadata; tiers carry the palette and
    // semantic rows. The FIXTURE_CLUSTER shape drives these values so tests
    // that call resolveColorClusterFromTab() get a result consistent with
    // the direct FIXTURE_CLUSTER constant.
    colorExtras: {
      id: FIXTURE_CLUSTER.id,
      label: FIXTURE_CLUSTER.label,
      baseRoles: FIXTURE_CLUSTER.baseRoles,
      baseDefaults: FIXTURE_CLUSTER.baseDefaults,
      defaultShikiTheme: FIXTURE_CLUSTER.defaultShikiTheme,
      colorSchemes: FIXTURE_CLUSTER.colorSchemes,
      panelSettings: FIXTURE_CLUSTER.panelSettings,
    },
    tiers: [
      {
        id: 'palette',
        label: 'Palette',
        // 16 explicit palette slots matching FIXTURE_CLUSTER.paletteSize = 16
        items: Array.from({ length: 16 }, (_, i) => ({
          id: `fixture-p${i}`,
          cssVar: `--fixture-p${i}`,
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
          { id: 'accent', cssVar: '--fixture-semantic-accent', label: 'Accent', default: 'fixture-p6',  type: { kind: 'color' as const } },
          { id: 'muted',  cssVar: '--fixture-semantic-muted',  label: 'Muted',  default: 'fixture-p8',  type: { kind: 'color' as const } },
          { id: 'active', cssVar: '--fixture-semantic-active', label: 'Active', default: 'fixture-p14', type: { kind: 'color' as const } },
        ],
      },
    ],
  },
];

export const FIXTURE_PANEL_CONFIG: PanelConfig = {
  storagePrefix: 'zudo-design-token-panel',
  consoleNamespace: 'zudo',
  modalClassPrefix: 'zudo-design-token-panel-modal',
  schemaId: 'zudo-design-tokens/v1',
  exportFilenameBase: 'zudo-design-tokens',
  tabs: FIXTURE_TABS,
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

/**
 * Wait until Preact has flushed pending effects. Preact uses
 * requestAnimationFrame to flush effects (with a setTimeout(35) fallback
 * inside its scheduler), so we wait long enough for either path to fire and
 * then yield to any further macrotasks.
 *
 * Wait-ok: the 50ms constant is not an arbitrary guess — it covers Preact's
 * own rAF + setTimeout(35) effect-flush path. This cannot be expressed as a
 * condition poll because "all Preact effects done" is not observable from
 * outside Preact internals without coupling to private scheduler APIs.
 */
export async function flushEffects(): Promise<void> {
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
  await new Promise<void>((resolve) => setTimeout(resolve, 50));
}
