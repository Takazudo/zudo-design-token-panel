// @vitest-environment jsdom

/**
 * Regression tests for instance-scoped SERDE operations (issue #361).
 *
 * The multi-instance epic (#353/#354/#356) made the panel per-instance, and
 * #357 scoped the persist / apply / reset / init / console paths to the mounted
 * instance. But the Export / Import / revert SERDE path was left routed through
 * `getPanelConfig()` (the most-recently-configured / DEFAULT instance):
 *
 *   - serialize() built export JSON from the DEFAULT instance's tab manifest,
 *   - deserialize() validated the schema + mapped cssVars against the DEFAULT
 *     instance's manifest,
 *   - the Apply modal's revert blob was serialized from the DEFAULT manifest,
 *
 * — all wrong when a NON-default panel coexists with a later-configured one.
 *
 * The fix threads each serde function's NEW optional `cfg: PanelConfig`
 * argument from the mounted instance. These tests prove the scoping at the
 * serde layer directly: with instances A and B configured (B is the active
 * default), A's serde operations use A's tab manifest + schema id + color
 * cluster, never B's.
 *
 * Existing coverage these COMPLEMENT (do not duplicate):
 *  - utils/__tests__/design-token-serde.test.ts — single-instance serde
 *    round-trips against the fixture config (no-arg default path).
 *  - instance-scoping-state.test.tsx — persist / apply / reset / init scoping.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  __resetPanelConfigForTests,
  configurePanel,
  getPanelConfig,
  type PanelConfig,
} from '../config/panel-config';
import {
  DesignTokenSchemaError,
  deserialize,
  getDesignTokenSchema,
  serialize,
  type DesignTokenJsonV2,
} from '../utils/design-token-serde';
import type { ColorTweakState, TweakState } from '../state/tweak-state';
import type { TabConfig } from '../tokens/tier-model';

// ---------------------------------------------------------------------------
// Fixtures — two instances A and B with DELIBERATELY DISTINCT manifests so a
// leak of B's manifest into A's serde shows up as a wrong cssVar / schema id.
// ---------------------------------------------------------------------------

/**
 * Build a single-tab-per-category manifest where every cssVar is prefixed with
 * `ns` so A's and B's vars never collide. A spacing token, a font token, a size
 * token, and a 4-slot color cluster (palette + one semantic) are enough to
 * exercise every serde branch.
 */
function makeTabs(ns: string): readonly TabConfig[] {
  return [
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
              cssVar: `--${ns}-hgap-md`,
              label: 'hsp-md',
              default: '40px',
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
              cssVar: `--${ns}-font-base`,
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
              cssVar: `--${ns}-radius-lg`,
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
      colorExtras: {
        id: `${ns}-cluster`,
        label: `${ns} Cluster`,
        baseRoles: {},
        baseDefaults: {
          background: 0,
          foreground: 3,
          cursor: 1,
          selectionBg: 0,
          selectionFg: 3,
        },
        defaultShikiTheme: 'dracula',
        colorSchemes: {},
        panelSettings: { colorScheme: '', colorMode: false },
      },
      tiers: [
        {
          id: 'palette',
          label: 'Palette',
          items: Array.from({ length: 4 }, (_, i) => ({
            id: `${ns}-p${i}`,
            cssVar: `--${ns}-p${i}`,
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
              id: 'accent',
              cssVar: `--${ns}-semantic-accent`,
              label: 'Accent',
              default: `${ns}-p2`,
              type: { kind: 'color' as const },
            },
          ],
        },
      ],
    },
  ];
}

function makeConfig(ns: string): PanelConfig {
  return {
    storagePrefix: ns,
    consoleNamespace: ns,
    modalClassPrefix: `${ns}-modal`,
    schemaId: `${ns}/v1`,
    exportFilenameBase: ns,
    tabs: makeTabs(ns),
    colorPresets: {},
  };
}

const CONFIG_A = makeConfig('aaa');
const CONFIG_B = makeConfig('bbb');

/** A 4-slot color baseline matching the 4-slot palette in makeTabs(). */
function colorBaseline(): ColorTweakState {
  return {
    palette: ['#000000', '#404040', '#808080', '#ffffff'],
    background: 0,
    foreground: 3,
    cursor: 1,
    selectionBg: 0,
    selectionFg: 3,
    semanticMappings: { accent: 2 },
    shikiTheme: 'dracula',
  };
}

/**
 * A TweakState with exactly one override per category, keyed by the shared item
 * ids (`hsp-md` / `text-base` / `radius-lg`). Both A's and B's manifests share
 * those ids but map them to DIFFERENT cssVars, so the serialized output reveals
 * which manifest drove the diff.
 */
function tweakState(): TweakState {
  return {
    color: { ...colorBaseline(), palette: ['#111111', '#404040', '#808080', '#ffffff'] },
    spacing: { 'hsp-md': '99px' },
    typography: { 'text-base': '2rem' },
    size: { 'radius-lg': '12px' },
  };
}

beforeEach(() => {
  __resetPanelConfigForTests();
  // Configure A first, then B — so B is the active DEFAULT instance that the
  // no-arg getPanelConfig() resolves to. Any serde call that forgets to thread
  // A's config would silently fall back to B and fail these assertions.
  configurePanel(CONFIG_A);
  configurePanel(CONFIG_B);
});

afterEach(() => {
  __resetPanelConfigForTests();
});

describe('serde instance-scoping (#361)', () => {
  it('the active default really is B (guards the test premise)', () => {
    expect(getPanelConfig().storagePrefix).toBe('bbb');
  });

  describe('serialize() — export JSON uses the passed instance manifest', () => {
    it("A's export emits A's cssVars, never B's", () => {
      const json = serialize(tweakState(), { colorDefaults: colorBaseline() }, CONFIG_A);
      const flat = JSON.stringify(json);

      // A's raw cssVars are present.
      expect(json.tabs?.spacing?.raw).toEqual({ '--aaa-hgap-md': '99px' });
      expect(json.tabs?.font?.raw).toEqual({ '--aaa-font-base': '2rem' });
      expect(json.tabs?.size?.raw).toEqual({ '--aaa-radius-lg': '12px' });

      // B's cssVars must NOT leak anywhere in the document.
      expect(flat).not.toContain('--bbb-');
    });

    it("A's export color block uses A's palette + semantic cssVars, never B's", () => {
      const json = serialize(tweakState(), { colorDefaults: colorBaseline() }, CONFIG_A);
      // Palette slot 0 changed (#111111) → emitted under A's palette cssVar.
      expect(json.tabs?.color?.palette).toEqual({ '--aaa-p0': '#111111' });
      expect(JSON.stringify(json)).not.toContain('--bbb-p');
    });

    it("B's export (default, no cfg arg) still uses B's manifest — back-compat", () => {
      // No third arg → falls back to the active default (B). Proves the no-arg
      // default path keeps resolving the default instance unchanged.
      const json = serialize(tweakState(), { colorDefaults: colorBaseline() });
      expect(json.tabs?.spacing?.raw).toEqual({ '--bbb-hgap-md': '99px' });
      expect(JSON.stringify(json)).not.toContain('--aaa-');
    });

    it('explicit B cfg matches the no-arg default while B is active (byte-identical)', () => {
      const now = () => new Date('2020-01-01T00:00:00.000Z');
      const withArg = serialize(tweakState(), { colorDefaults: colorBaseline(), now }, CONFIG_B);
      const noArg = serialize(tweakState(), { colorDefaults: colorBaseline(), now });
      expect(JSON.stringify(withArg)).toBe(JSON.stringify(noArg));
    });
  });

  describe('getDesignTokenSchema() — schema id comes from the passed instance', () => {
    it("returns A's schema id when A's config is passed", () => {
      expect(getDesignTokenSchema(CONFIG_A)).toBe('aaa/v1');
    });

    it('returns the default (B) schema id with no arg', () => {
      expect(getDesignTokenSchema()).toBe('bbb/v1');
    });
  });

  describe('deserialize() — import schema-check + mapping use the passed instance', () => {
    it("A's import maps A's cssVars to ids; B's cssVars are unknown to A", () => {
      // A payload written from A's manifest.
      const payload: DesignTokenJsonV2 = {
        $schema: 'zudo-design-tokens/v2',
        exportedAt: '2020-01-01T00:00:00.000Z',
        tabs: {
          spacing: { raw: { '--aaa-hgap-md': '77px' } },
          // A B-namespaced var: unknown to A's manifest → reported, not applied.
          size: { raw: { '--bbb-radius-lg': '5px' } },
        },
      };

      const { state, unknownTokens } = deserialize(
        payload,
        { colorDefaults: colorBaseline() },
        CONFIG_A,
      );

      // A's var mapped back to the shared id.
      expect(state.spacing).toEqual({ 'hsp-md': '77px' });
      // B's var did NOT map under A — flagged unknown, dropped from state.
      expect(state.size).toEqual({});
      expect(unknownTokens).toContain('--bbb-radius-lg');
    });

    it("the SAME B-namespaced payload round-trips cleanly under B's config", () => {
      // Same var that was "unknown" to A is known to B — proves the unknown
      // result above is purely an instance-scoping effect, not a bad payload.
      const payload: DesignTokenJsonV2 = {
        $schema: 'zudo-design-tokens/v2',
        exportedAt: '2020-01-01T00:00:00.000Z',
        tabs: { size: { raw: { '--bbb-radius-lg': '5px' } } },
      };
      const { state, unknownTokens } = deserialize(
        payload,
        { colorDefaults: colorBaseline() },
        CONFIG_B,
      );
      expect(state.size).toEqual({ 'radius-lg': '5px' });
      expect(unknownTokens).not.toContain('--bbb-radius-lg');
    });

    it("A's import color palette maps A's palette cssVars, ignores B's", () => {
      const payload: DesignTokenJsonV2 = {
        $schema: 'zudo-design-tokens/v2',
        exportedAt: '2020-01-01T00:00:00.000Z',
        tabs: {
          color: {
            palette: { '--aaa-p1': '#abcdef', '--bbb-p1': '#fedcba' },
          },
        },
      };
      const { state } = deserialize(payload, { colorDefaults: colorBaseline() }, CONFIG_A);
      // A's slot 1 took the A-keyed value; B's key was ignored (slot 1 not
      // overwritten by '#fedcba').
      expect(state.color.palette[1]).toBe('#abcdef');
    });
  });

  describe('serialize → deserialize revert blob round-trips within an instance', () => {
    it("A's revert blob, re-imported under A, restores the same overrides", () => {
      const original = tweakState();
      // Revert blob path (matches the Apply modal's buildPreviewJson): serialize
      // with A's cfg, then re-deserialize with A's cfg.
      const blob = serialize(original, { colorDefaults: colorBaseline() }, CONFIG_A);
      const reparsed = JSON.parse(JSON.stringify(blob));
      const { state, unknownTokens } = deserialize(
        reparsed,
        { colorDefaults: colorBaseline() },
        CONFIG_A,
      );
      expect(unknownTokens).toEqual([]);
      expect(state.spacing).toEqual({ 'hsp-md': '99px' });
      expect(state.typography).toEqual({ 'text-base': '2rem' });
      expect(state.size).toEqual({ 'radius-lg': '12px' });
    });

    it("A's revert blob re-imported under B yields ONLY unknown tokens (cross-instance leak guard)", () => {
      const blob = serialize(tweakState(), { colorDefaults: colorBaseline() }, CONFIG_A);
      const reparsed = JSON.parse(JSON.stringify(blob));
      const { state, unknownTokens } = deserialize(
        reparsed,
        { colorDefaults: colorBaseline() },
        CONFIG_B,
      );
      // None of A's cssVars map under B's manifest.
      expect(state.spacing).toEqual({});
      expect(state.typography).toEqual({});
      expect(state.size).toEqual({});
      expect(unknownTokens).toEqual(
        expect.arrayContaining(['--aaa-hgap-md', '--aaa-font-base', '--aaa-radius-lg']),
      );
    });
  });

  describe('schema-mismatch is still thrown regardless of instance', () => {
    it('a foreign $schema throws under A', () => {
      expect(() =>
        deserialize(
          { $schema: 'some-other/v9', exportedAt: 'x' },
          { colorDefaults: colorBaseline() },
          CONFIG_A,
        ),
      ).toThrowError(DesignTokenSchemaError);
    });
  });
});
