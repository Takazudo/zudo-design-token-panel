import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  __resetPanelConfigForTests,
  configurePanel,
  DEFAULT_PANEL_CONFIG,
  getPanelConfig,
} from '../config/panel-config';
import type { TokenDef } from '../tokens/manifest';

/**
 * Consumer-supplied manifest works end-to-end at the config level.
 *
 * The portable contract lets a host pass an arbitrary `TokenManifest` into
 * `configurePanel`. The package itself ships an empty stub manifest;
 * different consumers can ship distinct manifests of any shape. Passing 3
 * spacing tokens and zero typography tokens MUST produce a panel that
 * surfaces 3 spacing rows and zero typography rows.
 *
 * This test exercises the plumbing — `configurePanel` accepts a smaller
 * manifest, `getPanelConfig().tokens` reflects it.
 */

beforeEach(() => {
  __resetPanelConfigForTests();
});

afterEach(() => {
  __resetPanelConfigForTests();
});

const FAKE_SPACING_TOKENS: readonly TokenDef[] = [
  {
    id: 'demo-sm',
    cssVar: '--demo-sm',
    label: 'demo-sm',
    group: 'hsp',
    default: '4px',
    min: 0,
    max: 32,
    step: 1,
    unit: 'px',
  },
  {
    id: 'demo-md',
    cssVar: '--demo-md',
    label: 'demo-md',
    group: 'hsp',
    default: '8px',
    min: 0,
    max: 32,
    step: 1,
    unit: 'px',
  },
  {
    id: 'demo-lg',
    cssVar: '--demo-lg',
    label: 'demo-lg',
    group: 'hsp',
    default: '16px',
    min: 0,
    max: 64,
    step: 1,
    unit: 'px',
  },
] as const;

describe('configurePanel — consumer-supplied smaller manifest', () => {
  it('exposes a 3-token spacing manifest with no typography tokens', () => {
    configurePanel({
      ...DEFAULT_PANEL_CONFIG,
      tokens: {
        spacing: FAKE_SPACING_TOKENS,
        typography: [],
        size: [],
        color: [],
      },
    });

    const tokens = getPanelConfig().tokens;
    expect(tokens.spacing.length).toBe(3);
    expect(tokens.typography.length).toBe(0);
    expect(tokens.size.length).toBe(0);
    expect(tokens.color.length).toBe(0);
    expect(tokens.spacing.map((t) => t.id)).toEqual(['demo-sm', 'demo-md', 'demo-lg']);
  });

  it('default config exposes the empty stub manifest when configurePanel is not called', () => {
    // No configurePanel call — the singleton stays null, getPanelConfig
    // returns DEFAULT_PANEL_CONFIG, which ships an empty stub manifest.
    // Hosts MUST call configurePanel to drive useful behaviour.
    const tokens = getPanelConfig().tokens;
    expect(tokens.spacing).toEqual([]);
    expect(tokens.typography).toEqual([]);
    expect(tokens.size).toEqual([]);
    expect(tokens.color).toEqual([]);
  });
});
