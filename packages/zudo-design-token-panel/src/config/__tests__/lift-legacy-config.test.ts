/**
 * Snapshot tests for liftLegacyConfigToTabs — the back-compat shim that
 * synthesises TabConfig[] from a legacy PanelConfig.
 *
 * Each describe block uses the exact PanelConfig of a real example app as the
 * fixture so that the snapshots act as the byte-compat oracle for Wave 4.
 *
 * Fixtures covered:
 *  - zfb             (spacingGroupOrder, cluster, no advanced typography)
 *  - zfb-tailwind    (identical shape to zfb, different CSS-var family)
 *  - astro           (same shape, astroexample CSS-var family)
 *  - vite-react      (same shape, vitereact CSS-var family)
 *  - next            (same shape, nextexample CSS-var family)
 *
 * Acceptance criteria pinned:
 *  - color cluster lift (palette tier + semantic tier)
 *  - font tab (no advanced rows in example apps → only 'raw' tier)
 *  - size tab (pill preservation)
 *  - spacing tab (spacingGroupOrder preservation)
 *  - host-supplied tabs short-circuits the shim
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { liftLegacyConfigToTabs } from '../lift-legacy-config';
import {
  __resetPanelConfigForTests,
  getPanelConfig,
  getPanelTabs,
  configurePanel,
  type PanelConfig,
} from '../panel-config';
import type { TokenManifest } from '../../tokens/manifest';
import type { ColorClusterDataConfig } from '../cluster-config';

// ---------------------------------------------------------------------------
// Shared fixture helpers
// ---------------------------------------------------------------------------

const EMPTY_MANIFEST: TokenManifest = {
  spacing: [],
  typography: [],
  size: [],
  color: [],
};

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

function makeBaseConfig(extra: Partial<PanelConfig> = {}): PanelConfig {
  return {
    storagePrefix: 'test',
    consoleNamespace: 'test',
    modalClassPrefix: 'test-modal',
    schemaId: 'test/v1',
    exportFilenameBase: 'test',
    tokens: EMPTY_MANIFEST,
    colorCluster: EMPTY_CLUSTER,
    ...extra,
  };
}

// ---------------------------------------------------------------------------
// zfb example fixture
// ---------------------------------------------------------------------------

const ZFB_MANIFEST: TokenManifest = {
  spacing: [
    {
      id: 'zfbexample-spacing-md',
      cssVar: '--zfbexample-spacing-md',
      label: 'Spacing M',
      group: 'hsp',
      default: '1rem',
      min: 0,
      max: 4,
      step: 0.0625,
      unit: 'rem',
    },
    {
      id: 'zfbexample-spacing-lg',
      cssVar: '--zfbexample-spacing-lg',
      label: 'Spacing L',
      group: 'vsp',
      default: '2rem',
      min: 0,
      max: 6,
      step: 0.0625,
      unit: 'rem',
    },
  ],
  typography: [
    {
      id: 'zfbexample-text-base',
      cssVar: '--zfbexample-text-base',
      label: 'Body Text',
      group: 'font-size',
      default: '1rem',
      min: 0.75,
      max: 1.5,
      step: 0.0625,
      unit: 'rem',
    },
    {
      id: 'zfbexample-text-heading',
      cssVar: '--zfbexample-text-heading',
      label: 'Heading Text',
      group: 'font-size',
      default: '1.75rem',
      min: 1,
      max: 4,
      step: 0.0625,
      unit: 'rem',
    },
  ],
  size: [
    {
      id: 'zfbexample-radius',
      cssVar: '--zfbexample-radius',
      label: 'Border Radius',
      group: 'radius',
      default: '0.5rem',
      min: 0,
      max: 2,
      step: 0.0625,
      unit: 'rem',
    },
  ],
  color: [],
  spacingGroupOrder: ['vsp', 'hsp'],
};

const ZFB_CLUSTER: ColorClusterDataConfig = {
  id: 'zfbexample-cluster',
  label: 'zfb Example',
  paletteSize: 16,
  baseRoles: {
    background: '--zfbexample-bg',
    foreground: '--zfbexample-fg',
  },
  paletteCssVarTemplate: '--zfbexample-palette-{n}',
  semanticDefaults: {
    primary: 1,
    accent: 3,
    surface: 0,
    muted: 8,
    danger: 5,
  },
  semanticCssNames: {
    primary: '--zfbexample-color-primary',
    accent: '--zfbexample-color-accent',
    surface: '--zfbexample-color-surface',
    muted: '--zfbexample-color-muted',
    danger: '--zfbexample-color-danger',
  },
  baseDefaults: {
    background: 0,
    foreground: 15,
  },
  defaultShikiTheme: 'github-dark',
  colorSchemes: {
    Default: {
      background: 0,
      foreground: 15,
      cursor: 4,
      selectionBg: 1,
      selectionFg: 15,
      palette: [
        '#1e1e1e',
        '#2d6cdf',
        '#3aa676',
        '#d97706',
        '#9b5de5',
        '#e63946',
        '#1d3557',
        '#06b6d4',
        '#475569',
        '#94a3b8',
        '#cbd5e1',
        '#e2e8f0',
        '#f1f5f9',
        '#fef3c7',
        '#bbf7d0',
        '#f8fafc',
      ],
      shikiTheme: 'github-dark',
    },
  },
  panelSettings: {
    colorScheme: 'Default',
    colorMode: false,
  },
};

const ZFB_PANEL_CONFIG: PanelConfig = {
  storagePrefix: 'zfb-example-tokens',
  consoleNamespace: 'zfbExample',
  modalClassPrefix: 'zfb-example-design-token-panel-modal',
  schemaId: 'zfb-example-design-tokens/v1',
  exportFilenameBase: 'zfb-example-design-tokens',
  tokens: ZFB_MANIFEST,
  colorCluster: ZFB_CLUSTER,
  applyEndpoint: '/pj/zudo-design-token-panel/examples/zfb/api/dev/apply',
  applyRouting: { zfbexample: 'styles/global.css' },
  secondaryColorCluster: null,
};

// ---------------------------------------------------------------------------
// zfb-tailwind example fixture
// ---------------------------------------------------------------------------

const ZFB_TAILWIND_MANIFEST: TokenManifest = {
  spacing: [
    {
      id: 'zfbtailwindexample-spacing-md',
      cssVar: '--zfbtailwindexample-spacing-md',
      label: 'Spacing M',
      group: 'hsp',
      default: '1rem',
      min: 0,
      max: 4,
      step: 0.0625,
      unit: 'rem',
    },
    {
      id: 'zfbtailwindexample-spacing-lg',
      cssVar: '--zfbtailwindexample-spacing-lg',
      label: 'Spacing L',
      group: 'vsp',
      default: '2rem',
      min: 0,
      max: 6,
      step: 0.0625,
      unit: 'rem',
    },
  ],
  typography: [
    {
      id: 'zfbtailwindexample-text-base',
      cssVar: '--zfbtailwindexample-text-base',
      label: 'Body Text',
      group: 'font-size',
      default: '1rem',
      min: 0.75,
      max: 1.5,
      step: 0.0625,
      unit: 'rem',
    },
    {
      id: 'zfbtailwindexample-text-heading',
      cssVar: '--zfbtailwindexample-text-heading',
      label: 'Heading Text',
      group: 'font-size',
      default: '1.75rem',
      min: 1,
      max: 4,
      step: 0.0625,
      unit: 'rem',
    },
  ],
  size: [
    {
      id: 'zfbtailwindexample-radius',
      cssVar: '--zfbtailwindexample-radius',
      label: 'Border Radius',
      group: 'radius',
      default: '0.5rem',
      min: 0,
      max: 2,
      step: 0.0625,
      unit: 'rem',
    },
  ],
  color: [],
  spacingGroupOrder: ['vsp', 'hsp'],
};

const ZFB_TAILWIND_CLUSTER: ColorClusterDataConfig = {
  id: 'zfbtailwindexample-cluster',
  label: 'zfb Tailwind Example',
  paletteSize: 16,
  baseRoles: {
    background: '--zfbtailwindexample-bg',
    foreground: '--zfbtailwindexample-fg',
  },
  paletteCssVarTemplate: '--zfbtailwindexample-palette-{n}',
  semanticDefaults: {
    primary: 1,
    accent: 3,
    surface: 0,
    muted: 8,
    danger: 5,
  },
  semanticCssNames: {
    primary: '--zfbtailwindexample-color-primary',
    accent: '--zfbtailwindexample-color-accent',
    surface: '--zfbtailwindexample-color-surface',
    muted: '--zfbtailwindexample-color-muted',
    danger: '--zfbtailwindexample-color-danger',
  },
  baseDefaults: {
    background: 0,
    foreground: 15,
  },
  defaultShikiTheme: 'github-dark',
  colorSchemes: {
    Default: {
      background: 0,
      foreground: 15,
      cursor: 4,
      selectionBg: 1,
      selectionFg: 15,
      palette: [
        '#1e1e1e',
        '#2d6cdf',
        '#3aa676',
        '#d97706',
        '#9b5de5',
        '#e63946',
        '#1d3557',
        '#06b6d4',
        '#475569',
        '#94a3b8',
        '#cbd5e1',
        '#e2e8f0',
        '#f1f5f9',
        '#fef3c7',
        '#bbf7d0',
        '#f8fafc',
      ],
      shikiTheme: 'github-dark',
    },
  },
  panelSettings: {
    colorScheme: 'Default',
    colorMode: false,
  },
};

const ZFB_TAILWIND_PANEL_CONFIG: PanelConfig = {
  storagePrefix: 'zfb-tailwind-example-tokens',
  consoleNamespace: 'zfbTailwindExample',
  modalClassPrefix: 'zfb-tailwind-example-design-token-panel-modal',
  schemaId: 'zfb-tailwind-example-design-tokens/v1',
  exportFilenameBase: 'zfb-tailwind-example-design-tokens',
  tokens: ZFB_TAILWIND_MANIFEST,
  colorCluster: ZFB_TAILWIND_CLUSTER,
  applyEndpoint: '/pj/zudo-design-token-panel/examples/zfb-tailwind/api/dev/apply',
  applyRouting: { zfbtailwindexample: 'styles/global.css' },
  secondaryColorCluster: null,
};

// ---------------------------------------------------------------------------
// astro example fixture
// ---------------------------------------------------------------------------

const ASTRO_MANIFEST: TokenManifest = {
  spacing: [
    {
      id: 'astroexample-spacing-md',
      cssVar: '--astroexample-spacing-md',
      label: 'Spacing M',
      group: 'hsp',
      default: '1rem',
      min: 0,
      max: 4,
      step: 0.0625,
      unit: 'rem',
    },
    {
      id: 'astroexample-spacing-lg',
      cssVar: '--astroexample-spacing-lg',
      label: 'Spacing L',
      group: 'vsp',
      default: '2rem',
      min: 0,
      max: 6,
      step: 0.0625,
      unit: 'rem',
    },
  ],
  typography: [
    {
      id: 'astroexample-text-base',
      cssVar: '--astroexample-text-base',
      label: 'Body Text',
      group: 'font-size',
      default: '1rem',
      min: 0.75,
      max: 1.5,
      step: 0.0625,
      unit: 'rem',
    },
    {
      id: 'astroexample-text-heading',
      cssVar: '--astroexample-text-heading',
      label: 'Heading Text',
      group: 'font-size',
      default: '1.75rem',
      min: 1,
      max: 4,
      step: 0.0625,
      unit: 'rem',
    },
  ],
  size: [
    {
      id: 'astroexample-radius',
      cssVar: '--astroexample-radius',
      label: 'Border Radius',
      group: 'radius',
      default: '0.5rem',
      min: 0,
      max: 2,
      step: 0.0625,
      unit: 'rem',
    },
  ],
  color: [],
  spacingGroupOrder: ['vsp', 'hsp'],
};

const ASTRO_CLUSTER: ColorClusterDataConfig = {
  id: 'astroexample-cluster',
  label: 'Astro Example',
  paletteSize: 16,
  baseRoles: {
    background: '--astroexample-bg',
    foreground: '--astroexample-fg',
  },
  paletteCssVarTemplate: '--astroexample-palette-{n}',
  semanticDefaults: {
    primary: 1,
    accent: 3,
    surface: 0,
    muted: 8,
    danger: 5,
  },
  semanticCssNames: {
    primary: '--astroexample-color-primary',
    accent: '--astroexample-color-accent',
    surface: '--astroexample-color-surface',
    muted: '--astroexample-color-muted',
    danger: '--astroexample-color-danger',
  },
  baseDefaults: {
    background: 0,
    foreground: 15,
  },
  defaultShikiTheme: 'github-dark',
  colorSchemes: {
    Default: {
      background: 0,
      foreground: 15,
      cursor: 4,
      selectionBg: 1,
      selectionFg: 15,
      palette: [
        '#1e1e1e',
        '#2d6cdf',
        '#3aa676',
        '#d97706',
        '#9b5de5',
        '#e63946',
        '#1d3557',
        '#06b6d4',
        '#475569',
        '#94a3b8',
        '#cbd5e1',
        '#e2e8f0',
        '#f1f5f9',
        '#fef3c7',
        '#bbf7d0',
        '#f8fafc',
      ],
      shikiTheme: 'github-dark',
    },
  },
  panelSettings: {
    colorScheme: 'Default',
    colorMode: false,
  },
};

const ASTRO_PANEL_CONFIG: PanelConfig = {
  storagePrefix: 'astro-example-tokens',
  consoleNamespace: 'astroExample',
  modalClassPrefix: 'astro-example-design-token-panel-modal',
  schemaId: 'astro-example-design-tokens/v1',
  exportFilenameBase: 'astro-example-design-tokens',
  tokens: ASTRO_MANIFEST,
  colorCluster: ASTRO_CLUSTER,
  applyEndpoint: '/api/dev/apply',
  applyRouting: { astroexample: 'src/styles/tokens.css' },
  secondaryColorCluster: null,
};

// ---------------------------------------------------------------------------
// vite-react example fixture
// ---------------------------------------------------------------------------

const VITE_REACT_MANIFEST: TokenManifest = {
  spacing: [
    {
      id: 'vitereact-spacing-md',
      cssVar: '--vitereact-spacing-md',
      label: 'Spacing M',
      group: 'hsp',
      default: '1rem',
      min: 0,
      max: 4,
      step: 0.0625,
      unit: 'rem',
    },
    {
      id: 'vitereact-spacing-lg',
      cssVar: '--vitereact-spacing-lg',
      label: 'Spacing L',
      group: 'vsp',
      default: '2rem',
      min: 0,
      max: 6,
      step: 0.0625,
      unit: 'rem',
    },
  ],
  typography: [
    {
      id: 'vitereact-text-base',
      cssVar: '--vitereact-text-base',
      label: 'Body Text',
      group: 'font-size',
      default: '1rem',
      min: 0.75,
      max: 1.5,
      step: 0.0625,
      unit: 'rem',
    },
    {
      id: 'vitereact-text-heading',
      cssVar: '--vitereact-text-heading',
      label: 'Heading Text',
      group: 'font-size',
      default: '1.75rem',
      min: 1,
      max: 4,
      step: 0.0625,
      unit: 'rem',
    },
  ],
  size: [
    {
      id: 'vitereact-radius',
      cssVar: '--vitereact-radius',
      label: 'Border Radius',
      group: 'radius',
      default: '0.5rem',
      min: 0,
      max: 2,
      step: 0.0625,
      unit: 'rem',
    },
  ],
  color: [],
  spacingGroupOrder: ['vsp', 'hsp'],
};

const VITE_REACT_CLUSTER: ColorClusterDataConfig = {
  id: 'vitereact-cluster',
  label: 'Vite + React Example',
  paletteSize: 16,
  baseRoles: {
    background: '--vitereact-bg',
    foreground: '--vitereact-fg',
  },
  paletteCssVarTemplate: '--vitereact-palette-{n}',
  semanticDefaults: {
    primary: 1,
    accent: 3,
    surface: 0,
    muted: 8,
    danger: 5,
  },
  semanticCssNames: {
    primary: '--vitereact-color-primary',
    accent: '--vitereact-color-accent',
    surface: '--vitereact-color-surface',
    muted: '--vitereact-color-muted',
    danger: '--vitereact-color-danger',
  },
  baseDefaults: {
    background: 0,
    foreground: 15,
  },
  defaultShikiTheme: 'github-dark',
  colorSchemes: {
    Default: {
      background: 0,
      foreground: 15,
      cursor: 4,
      selectionBg: 1,
      selectionFg: 15,
      palette: [
        '#1e1e1e',
        '#2d6cdf',
        '#3aa676',
        '#d97706',
        '#9b5de5',
        '#e63946',
        '#1d3557',
        '#06b6d4',
        '#475569',
        '#94a3b8',
        '#cbd5e1',
        '#e2e8f0',
        '#f1f5f9',
        '#fef3c7',
        '#bbf7d0',
        '#f8fafc',
      ],
      shikiTheme: 'github-dark',
    },
  },
  panelSettings: {
    colorScheme: 'Default',
    colorMode: false,
  },
};

const VITE_REACT_PANEL_CONFIG: PanelConfig = {
  storagePrefix: 'vite-react-example-tokens',
  consoleNamespace: 'viteReactExample',
  modalClassPrefix: 'vite-react-example-design-token-panel-modal',
  schemaId: 'vite-react-example-design-tokens/v1',
  exportFilenameBase: 'vite-react-example-design-tokens',
  tokens: VITE_REACT_MANIFEST,
  colorCluster: VITE_REACT_CLUSTER,
  applyEndpoint: '/api/dev/apply',
  applyRouting: { vitereact: 'src/styles/tokens.css' },
  secondaryColorCluster: null,
};

// ---------------------------------------------------------------------------
// next example fixture
// ---------------------------------------------------------------------------

const NEXT_MANIFEST: TokenManifest = {
  spacing: [
    {
      id: 'nextexample-spacing-md',
      cssVar: '--nextexample-spacing-md',
      label: 'Spacing M',
      group: 'hsp',
      default: '1rem',
      min: 0,
      max: 4,
      step: 0.0625,
      unit: 'rem',
    },
    {
      id: 'nextexample-spacing-lg',
      cssVar: '--nextexample-spacing-lg',
      label: 'Spacing L',
      group: 'vsp',
      default: '2rem',
      min: 0,
      max: 6,
      step: 0.0625,
      unit: 'rem',
    },
  ],
  typography: [
    {
      id: 'nextexample-text-base',
      cssVar: '--nextexample-text-base',
      label: 'Body Text',
      group: 'font-size',
      default: '1rem',
      min: 0.75,
      max: 1.5,
      step: 0.0625,
      unit: 'rem',
    },
    {
      id: 'nextexample-text-heading',
      cssVar: '--nextexample-text-heading',
      label: 'Heading Text',
      group: 'font-size',
      default: '1.75rem',
      min: 1,
      max: 4,
      step: 0.0625,
      unit: 'rem',
    },
  ],
  size: [
    {
      id: 'nextexample-radius',
      cssVar: '--nextexample-radius',
      label: 'Border Radius',
      group: 'radius',
      default: '0.5rem',
      min: 0,
      max: 2,
      step: 0.0625,
      unit: 'rem',
    },
  ],
  color: [],
  spacingGroupOrder: ['vsp', 'hsp'],
};

const NEXT_CLUSTER: ColorClusterDataConfig = {
  id: 'nextexample-cluster',
  label: 'Next.js Example',
  paletteSize: 16,
  baseRoles: {
    background: '--nextexample-bg',
    foreground: '--nextexample-fg',
  },
  paletteCssVarTemplate: '--nextexample-palette-{n}',
  semanticDefaults: {
    primary: 1,
    accent: 3,
    surface: 0,
    muted: 8,
    danger: 5,
  },
  semanticCssNames: {
    primary: '--nextexample-color-primary',
    accent: '--nextexample-color-accent',
    surface: '--nextexample-color-surface',
    muted: '--nextexample-color-muted',
    danger: '--nextexample-color-danger',
  },
  baseDefaults: {
    background: 0,
    foreground: 15,
  },
  defaultShikiTheme: 'github-dark',
  colorSchemes: {
    Default: {
      background: 0,
      foreground: 15,
      cursor: 4,
      selectionBg: 1,
      selectionFg: 15,
      palette: [
        '#1e1e1e',
        '#2d6cdf',
        '#3aa676',
        '#d97706',
        '#9b5de5',
        '#e63946',
        '#1d3557',
        '#06b6d4',
        '#475569',
        '#94a3b8',
        '#cbd5e1',
        '#e2e8f0',
        '#f1f5f9',
        '#fef3c7',
        '#bbf7d0',
        '#f8fafc',
      ],
      shikiTheme: 'github-dark',
    },
  },
  panelSettings: {
    colorScheme: 'Default',
    colorMode: false,
  },
};

const NEXT_PANEL_CONFIG: PanelConfig = {
  storagePrefix: 'next-example-tokens',
  consoleNamespace: 'nextExample',
  modalClassPrefix: 'next-example-design-token-panel-modal',
  schemaId: 'next-example-design-tokens/v1',
  exportFilenameBase: 'next-example-design-tokens',
  tokens: NEXT_MANIFEST,
  colorCluster: NEXT_CLUSTER,
  applyEndpoint: '/api/dev/apply',
  applyRouting: { nextexample: 'src/styles/tokens.css' },
  secondaryColorCluster: null,
};

// ---------------------------------------------------------------------------
// Snapshot tests — one per example app
// ---------------------------------------------------------------------------

describe('liftLegacyConfigToTabs — zfb example', () => {
  it('produces a stable snapshot', () => {
    expect(liftLegacyConfigToTabs(ZFB_PANEL_CONFIG)).toMatchSnapshot();
  });

  it('returns 4 tabs: spacing, font, size, color', () => {
    const tabs = liftLegacyConfigToTabs(ZFB_PANEL_CONFIG);
    expect(tabs.map((t) => t.id)).toEqual(['spacing', 'font', 'size', 'color']);
  });

  it('spacing tab carries spacingGroupOrder from manifest', () => {
    const tabs = liftLegacyConfigToTabs(ZFB_PANEL_CONFIG);
    const spacingTab = tabs.find((t) => t.id === 'spacing')!;
    expect((spacingTab as { spacingGroupOrder?: readonly string[] }).spacingGroupOrder).toEqual([
      'vsp',
      'hsp',
    ]);
  });

  it('spacing tab raw tier has 2 items', () => {
    const tabs = liftLegacyConfigToTabs(ZFB_PANEL_CONFIG);
    const spacingTab = tabs.find((t) => t.id === 'spacing')!;
    expect(spacingTab.tiers[0].items).toHaveLength(2);
  });

  it('font tab has only raw tier (no advanced tokens in zfb manifest)', () => {
    const tabs = liftLegacyConfigToTabs(ZFB_PANEL_CONFIG);
    const fontTab = tabs.find((t) => t.id === 'font')!;
    expect(fontTab.tiers).toHaveLength(1);
    expect(fontTab.tiers[0].id).toBe('raw');
    expect(fontTab.advancedTiers).toBeUndefined();
  });

  it('size tab raw tier has 1 item', () => {
    const tabs = liftLegacyConfigToTabs(ZFB_PANEL_CONFIG);
    const sizeTab = tabs.find((t) => t.id === 'size')!;
    expect(sizeTab.tiers[0].items).toHaveLength(1);
  });

  it('color tab has palette tier with 16 items', () => {
    const tabs = liftLegacyConfigToTabs(ZFB_PANEL_CONFIG);
    const colorTab = tabs.find((t) => t.id === 'color')!;
    const paletteTier = colorTab.tiers.find((t) => t.id === 'palette')!;
    expect(paletteTier.items).toHaveLength(16);
  });

  it('color tab palette items have kind: color', () => {
    const tabs = liftLegacyConfigToTabs(ZFB_PANEL_CONFIG);
    const colorTab = tabs.find((t) => t.id === 'color')!;
    const paletteTier = colorTab.tiers.find((t) => t.id === 'palette')!;
    for (const item of paletteTier.items) {
      expect(item.type.kind).toBe('color');
    }
  });

  it('color tab semantic tier has 5 items and referencesTier: palette', () => {
    const tabs = liftLegacyConfigToTabs(ZFB_PANEL_CONFIG);
    const colorTab = tabs.find((t) => t.id === 'color')!;
    const semanticTier = colorTab.tiers.find((t) => t.id === 'semantic')!;
    expect(semanticTier.items).toHaveLength(5);
    expect(semanticTier.referencesTier).toBe('palette');
  });

  it('color tab carries colorExtras with the full cluster', () => {
    const tabs = liftLegacyConfigToTabs(ZFB_PANEL_CONFIG);
    const colorTab = tabs.find((t) => t.id === 'color')!;
    expect(colorTab.colorExtras).toBeDefined();
    expect(colorTab.colorExtras?.id).toBe('zfbexample-cluster');
  });

  it('produces identical output on a second call (deterministic)', () => {
    const first = liftLegacyConfigToTabs(ZFB_PANEL_CONFIG);
    const second = liftLegacyConfigToTabs(ZFB_PANEL_CONFIG);
    expect(first).toEqual(second);
  });
});

describe('liftLegacyConfigToTabs — zfb-tailwind example', () => {
  it('produces a stable snapshot', () => {
    expect(liftLegacyConfigToTabs(ZFB_TAILWIND_PANEL_CONFIG)).toMatchSnapshot();
  });
});

describe('liftLegacyConfigToTabs — astro example', () => {
  it('produces a stable snapshot', () => {
    expect(liftLegacyConfigToTabs(ASTRO_PANEL_CONFIG)).toMatchSnapshot();
  });
});

describe('liftLegacyConfigToTabs — vite-react example', () => {
  it('produces a stable snapshot', () => {
    expect(liftLegacyConfigToTabs(VITE_REACT_PANEL_CONFIG)).toMatchSnapshot();
  });
});

describe('liftLegacyConfigToTabs — next example', () => {
  it('produces a stable snapshot', () => {
    expect(liftLegacyConfigToTabs(NEXT_PANEL_CONFIG)).toMatchSnapshot();
  });
});

// ---------------------------------------------------------------------------
// Advanced typography tier splitting
// ---------------------------------------------------------------------------

describe('liftLegacyConfigToTabs — advanced typography', () => {
  it('splits advanced tokens into a separate scale tier listed in advancedTiers', () => {
    const manifestWithAdvanced: TokenManifest = {
      ...EMPTY_MANIFEST,
      typography: [
        {
          id: 'text-base',
          cssVar: '--text-base',
          label: 'Base',
          group: 'font-size',
          default: '1rem',
          min: 0.5,
          max: 2,
          step: 0.0625,
          unit: 'rem',
        },
        {
          id: 'scale-base',
          cssVar: '--scale-base',
          label: 'Scale Base',
          group: 'font-scale',
          default: '1rem',
          min: 0.5,
          max: 2,
          step: 0.0625,
          unit: 'rem',
          advanced: true,
        },
      ],
    };
    const cfg = makeBaseConfig({ tokens: manifestWithAdvanced });
    const tabs = liftLegacyConfigToTabs(cfg);
    const fontTab = tabs.find((t) => t.id === 'font')!;
    expect(fontTab.tiers).toHaveLength(2);
    expect(fontTab.tiers[0].id).toBe('raw');
    expect(fontTab.tiers[1].id).toBe('scale');
    expect(fontTab.advancedTiers).toEqual(['scale']);
    expect(fontTab.tiers[0].items).toHaveLength(1);
    expect(fontTab.tiers[1].items).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Pill preservation
// ---------------------------------------------------------------------------

describe('liftLegacyConfigToTabs — pill preservation', () => {
  it('pill spec is carried through on size tier items', () => {
    const manifestWithPill: TokenManifest = {
      ...EMPTY_MANIFEST,
      size: [
        {
          id: 'radius-full',
          cssVar: '--radius-full',
          label: 'Full Radius',
          group: 'radius',
          default: '0.5rem',
          min: 0,
          max: 2,
          step: 0.0625,
          unit: 'rem',
          pill: { value: '9999px', customDefault: '0.5rem' },
        },
      ],
    };
    const cfg = makeBaseConfig({ tokens: manifestWithPill });
    const tabs = liftLegacyConfigToTabs(cfg);
    const sizeTab = tabs.find((t) => t.id === 'size')!;
    const item = sizeTab.tiers[0].items[0];
    expect(item.pill).toEqual({ value: '9999px', customDefault: '0.5rem' });
  });
});

// ---------------------------------------------------------------------------
// groupTitles preservation
// ---------------------------------------------------------------------------

describe('liftLegacyConfigToTabs — groupTitles preservation', () => {
  it('groupTitles from manifest are carried onto spacing tab', () => {
    const manifestWithTitles: TokenManifest = {
      ...EMPTY_MANIFEST,
      spacing: [
        {
          id: 'sp-md',
          cssVar: '--sp-md',
          label: 'Medium',
          group: 'hsp',
          default: '1rem',
          min: 0,
          max: 4,
          step: 0.125,
          unit: 'rem',
        },
      ],
      groupTitles: { hsp: 'Horizontal Space' },
    };
    const cfg = makeBaseConfig({ tokens: manifestWithTitles });
    const tabs = liftLegacyConfigToTabs(cfg);
    const spacingTab = tabs.find((t) => t.id === 'spacing')!;
    expect((spacingTab as { groupTitles?: Record<string, string> }).groupTitles).toEqual({
      hsp: 'Horizontal Space',
    });
  });
});

// ---------------------------------------------------------------------------
// Host-supplied tabs short-circuit the shim
// ---------------------------------------------------------------------------

describe('getPanelTabs — host-supplied tabs win over legacy fields', () => {
  beforeEach(() => {
    __resetPanelConfigForTests();
  });

  afterEach(() => {
    __resetPanelConfigForTests();
  });

  it('returns host tabs when tabs is present, not the lifted result', () => {
    const hostTabs = [
      {
        id: 'custom',
        label: 'Custom',
        tiers: [{ id: 'raw', label: 'Raw', items: [] }],
      },
    ] as const;

    const cfg = makeBaseConfig({
      tokens: ZFB_MANIFEST,
      colorCluster: ZFB_CLUSTER,
      tabs: hostTabs,
    });

    const tabs = getPanelTabs(cfg);
    expect(tabs).toBe(hostTabs);
    expect(tabs[0].id).toBe('custom');
  });

  it('produces lifted tabs (not host tabs) when tabs is absent', () => {
    const cfg = makeBaseConfig({ tokens: ZFB_MANIFEST, colorCluster: ZFB_CLUSTER });
    configurePanel(cfg);
    const tabs = getPanelTabs(getPanelConfig());
    // Lifted result starts with spacing tab, not a custom tab — confirming
    // the shim ran rather than returning host-supplied tabs.
    expect(tabs[0].id).toBe('spacing');
    expect(tabs.map((t) => t.id)).toEqual(['spacing', 'font', 'size', 'color']);
  });

  it('memoises: getPanelTabs returns the same array reference on repeated calls', () => {
    const cfg = makeBaseConfig({ tokens: ZFB_MANIFEST, colorCluster: ZFB_CLUSTER });
    configurePanel(cfg);
    const first = getPanelTabs(getPanelConfig());
    const second = getPanelTabs(getPanelConfig());
    expect(first).toBe(second);
  });
});
