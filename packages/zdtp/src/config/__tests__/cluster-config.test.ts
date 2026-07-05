import { describe, expect, it } from 'vitest';
import { resolveColorClusterFromTab } from '../cluster-config';
import type { TabConfig } from '../../tokens/tier-model';

/**
 * Disambiguation tests (#461, S2a): `TierConfig.semantic === true` must
 * exclude a tier from palette-tier detection, even when its items happen to
 * be `kind: 'color'`. Mirrors the same fixture shape used by the
 * `cluster-config.ts` JSDoc and `color-tab.tsx`'s `findPaletteTier`.
 */

const COLOR_EXTRAS = {
  id: 'test-cluster',
  baseRoles: {},
  baseDefaults: {},
  defaultShikiTheme: 'dracula' as const,
  colorSchemes: {},
  panelSettings: { colorScheme: 'default', colorMode: false as const },
};

describe('resolveColorClusterFromTab — palette vs. semantic disambiguation (#461)', () => {
  it('does NOT select a lone `semantic: true` color tier as the palette', () => {
    const tab: TabConfig = {
      id: 'color',
      label: 'Color',
      colorExtras: COLOR_EXTRAS,
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

    const cluster = resolveColorClusterFromTab(tab);
    expect(cluster).toBeDefined();
    // No palette tier was found (the only tier is `semantic: true`), so the
    // bridge falls back to the zero-palette stub — it must NOT report the
    // semantic tier's 2 items as a 2-slot palette.
    expect(cluster?.paletteSize).toBe(0);
  });

  it('still detects the palette tier as before in a conventional 2-tier palette+semantic config', () => {
    const tab: TabConfig = {
      id: 'color',
      label: 'Color',
      colorExtras: COLOR_EXTRAS,
      tiers: [
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
        {
          id: 'semantic',
          label: 'Semantic',
          referencesTier: 'palette',
          items: [
            {
              id: 'accent',
              cssVar: '--semantic-accent',
              label: 'Accent',
              default: 'p1',
              type: { kind: 'color' as const },
            },
          ],
        },
      ],
    };

    const cluster = resolveColorClusterFromTab(tab);
    expect(cluster).toBeDefined();
    expect(cluster?.paletteSize).toBe(2);
    expect(cluster?.paletteCssVarTemplate).toBe('--pal-{n}');
    expect(cluster?.semanticCssNames).toEqual({ accent: '--semantic-accent' });
    expect(cluster?.semanticDefaults).toEqual({ accent: 1 });
  });

  it('does not pick a `semantic: true` tier as the palette even when a real palette tier is also present', () => {
    const tab: TabConfig = {
      id: 'color',
      label: 'Color',
      colorExtras: COLOR_EXTRAS,
      tiers: [
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
          ],
        },
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
          ],
        },
      ],
    };

    const cluster = resolveColorClusterFromTab(tab);
    expect(cluster).toBeDefined();
    // The `palette` tier (not the `semantic: true` tier) must be the one
    // reported as the 1-slot palette.
    expect(cluster?.paletteSize).toBe(1);
    expect(cluster?.paletteCssVarTemplate).toBe('--pal-{n}');
  });
});
