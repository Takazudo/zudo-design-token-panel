import { describe, expect, it, vi } from 'vitest';
import { resolveColorClusterFromTab } from '../cluster-config';
import { resolveRefToCssVar } from '../../apply/tier-resolver';
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

  it('does not pick a `semantic: true` tier as the palette when it is ordered BEFORE the real palette tier', () => {
    // Regression guard: the test above places the real palette tier FIRST, so
    // it still passes even if the `!t.semantic` exclusion in the paletteTier
    // finder were deleted (Array.prototype.find would just return the same
    // first match either way). Order the semantic tier first instead — with a
    // differing `type.format` from the real palette tier — so this test
    // actually exercises the guard.
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
              default: 'oklch(0.6 0.2 25)',
              type: { kind: 'color' as const, format: 'oklch' as const },
            },
            {
              id: 'warning',
              cssVar: '--zd-warning',
              label: 'Warning',
              default: 'oklch(0.8 0.15 80)',
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

    const cluster = resolveColorClusterFromTab(tab);
    expect(cluster).toBeDefined();
    // The `palette` tier (not the `semantic: true` tier ordered before it)
    // must be the one reported as the 2-slot palette.
    expect(cluster?.paletteSize).toBe(2);
    expect(cluster?.paletteCssVarTemplate).toBe('--pal-{n}');
  });
});

/**
 * Semantic-map derivation tests (#463, S2b). `resolveColorClusterFromTab`
 * must populate `semanticDefaults`/`semanticCssNames` for a `semantic: true`
 * tier in all three cluster shapes: lone semantic tier (no palette sibling),
 * conventional palette+semantic, and palette-only (no semantic tier at all).
 */
describe('resolveColorClusterFromTab — semantic default derivation (#463)', () => {
  it('derives `{ literal }` semantic defaults for a lone `semantic: true` tier with no palette sibling', () => {
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
              default: 'oklch(0.6 0.2 25)',
              type: { kind: 'color' as const, format: 'oklch' as const },
            },
            {
              id: 'success',
              cssVar: '--zd-success',
              label: 'Success',
              default: '#00cc66',
              type: { kind: 'color' as const },
            },
          ],
        },
      ],
    };

    const cluster = resolveColorClusterFromTab(tab);
    expect(cluster).toBeDefined();
    expect(cluster?.paletteSize).toBe(0);
    expect(cluster?.semanticCssNames).toEqual({
      danger: '--zd-danger',
      success: '--zd-success',
    });
    // Must be literal-wrapped, not the empty-stub `{}` nor a grayscale/index
    // fallback (e.g. `{ danger: 0, success: 0 }`).
    expect(cluster?.semanticDefaults).toEqual({
      danger: { literal: 'oklch(0.6 0.2 25)' },
      success: { literal: '#00cc66' },
    });
  });

  it('keeps producing numeric palette indices for a conventional palette+semantic config', () => {
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
            {
              id: 'p2',
              cssVar: '--pal-2',
              label: 'Palette 2',
              default: '#ff00ff',
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
            {
              id: 'brand',
              cssVar: '--semantic-brand',
              label: 'Brand',
              default: 'p2',
              type: { kind: 'color' as const },
            },
          ],
        },
      ],
    };

    const cluster = resolveColorClusterFromTab(tab);
    expect(cluster).toBeDefined();
    expect(cluster?.paletteSize).toBe(3);
    expect(cluster?.semanticDefaults).toEqual({ accent: 1, brand: 2 });
  });

  it('leaves semanticDefaults/semanticCssNames empty for a palette-only tab (no semantic tier)', () => {
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
      ],
    };

    const cluster = resolveColorClusterFromTab(tab);
    expect(cluster).toBeDefined();
    expect(cluster?.paletteSize).toBe(2);
    expect(cluster?.paletteCssVarTemplate).toBe('--pal-{n}');
    expect(cluster?.semanticDefaults).toEqual({});
    expect(cluster?.semanticCssNames).toEqual({});
  });
});

/**
 * Cross-tab ramp-reference derivation (#467, S7a). When a `semantic: true` tier
 * declares `referencesRamps` pointing at a ramp tier in the grouped Palette tab
 * (a DIFFERENT tab), `resolveColorClusterFromTab(colorTab, tabs)` must derive a
 * `{ ref: { tab, tier, item } }` that actually names a real ramp item — i.e. one
 * that `resolveRefToCssVar` can resolve to the ramp item's cssVar.
 */
describe('resolveColorClusterFromTab — cross-tab ramp ref derivation (#467)', () => {
  const PALETTE_TAB: TabConfig = {
    id: 'palette',
    label: 'Palette',
    tiers: [
      {
        id: 'base',
        label: 'Base',
        items: [
          { id: 'base-1', cssVar: '--palette-base-1', label: 'Base 1', default: 'oklch(0.98 0 0)', type: { kind: 'color' as const, format: 'oklch' as const } },
          { id: 'base-2', cssVar: '--palette-base-2', label: 'Base 2', default: 'oklch(0.9 0 0)', type: { kind: 'color' as const, format: 'oklch' as const } },
          { id: 'base-3', cssVar: '--palette-base-3', label: 'Base 3', default: 'oklch(0.8 0 0)', type: { kind: 'color' as const, format: 'oklch' as const } },
        ],
      },
    ],
  };

  const COLOR_TAB: TabConfig = {
    id: 'color',
    label: 'Color',
    colorExtras: COLOR_EXTRAS,
    tiers: [
      {
        id: 'semantic',
        label: 'Semantic',
        semantic: true,
        referencesRamps: [{ tab: 'palette', tier: 'base' }],
        items: [
          { id: 'surface', cssVar: '--zd-surface', label: 'Surface', default: 'base-3', type: { kind: 'color' as const } },
        ],
      },
    ],
  };

  it('derives a { ref } naming a real ramp item that resolves cross-tab to its cssVar', () => {
    const tabs = [COLOR_TAB, PALETTE_TAB];
    const cluster = resolveColorClusterFromTab(COLOR_TAB, tabs);
    expect(cluster).toBeDefined();
    expect(cluster?.paletteSize).toBe(0);
    expect(cluster?.semanticCssNames).toEqual({ surface: '--zd-surface' });
    expect(cluster?.semanticDefaults).toEqual({
      surface: { ref: { tab: 'palette', tier: 'base', item: 'base-3' } },
    });

    // The derived ref must actually resolve against the Palette tab.
    const derived = cluster?.semanticDefaults.surface as {
      ref: { tab?: string; tier: string; item: string };
    };
    expect(resolveRefToCssVar(derived.ref, COLOR_TAB, tabs)).toBe('--palette-base-3');
  });

  it('back-compat: single-arg (lone-tab) call still derives the best-effort ref shape', () => {
    // Without the Palette tab threaded in, the ref cannot be resolved but the
    // shape is still produced (validation/throwing is #469's job).
    const cluster = resolveColorClusterFromTab(COLOR_TAB);
    expect(cluster?.semanticDefaults).toEqual({
      surface: { ref: { tab: 'palette', tier: 'base', item: 'base-3' } },
    });
  });
});

/**
 * Legacy index-0 fallback (#479 n1, S3a). A LEGACY `referencesTier` semantic
 * tier's `default` is contractually always a palette id (or `bg`/`fg`) — a
 * bogus default (e.g. a renamed/removed palette item) must fall back to
 * palette index 0 with a warning, restoring pre-#459 behavior, instead of
 * falling through to `{ literal: <bogus-id> }` (an invalid CSS custom
 * property value once emitted). A `semantic: true` tier hitting the same
 * bogus-default case keeps the `{ literal }` fallthrough — that IS the new
 * model's contract.
 */
describe('resolveColorClusterFromTab — legacy palette-index fallback (#479 n1)', () => {
  it('falls back to palette index 0 with a console.warn when a legacy tier default names no palette item', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

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
              default: 'p-nonexistent',
              type: { kind: 'color' as const },
            },
          ],
        },
      ],
    };

    const cluster = resolveColorClusterFromTab(tab);
    expect(cluster?.semanticDefaults).toEqual({ accent: 0 });
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toContain('accent');
    expect(warnSpy.mock.calls[0][0]).toContain('p-nonexistent');

    warnSpy.mockRestore();
  });

  it('keeps the { literal } fallthrough (no warning) for a `semantic: true` tier with the same bogus default', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

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
              id: 'accent',
              cssVar: '--semantic-accent',
              label: 'Accent',
              default: 'p-nonexistent',
              type: { kind: 'color' as const },
            },
          ],
        },
      ],
    };

    const cluster = resolveColorClusterFromTab(tab);
    expect(cluster?.semanticDefaults).toEqual({ accent: { literal: 'p-nonexistent' } });
    expect(warnSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });
});

/**
 * Named-color literal detection (#479 n2, S3a). `looksLikeColorLiteral` must
 * recognise bare CSS named-color keywords and value sentinels (`red`,
 * `transparent`, `currentColor`, …) as literals — not just `#`/`(`-prefixed
 * values — so a `semantic: true` tier with `referencesRamps` routes them to
 * `{ literal }` instead of a broken best-effort `{ ref }`. Matching is
 * case-insensitive; the stored literal preserves the default's original
 * casing.
 */
describe('resolveColorClusterFromTab — named-color literal detection (#479 n2)', () => {
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
            default: 'oklch(0.98 0 0)',
            type: { kind: 'color' as const, format: 'oklch' as const },
          },
        ],
      },
    ],
  };

  it.each([
    ['red', 'red'],
    ['transparent', 'transparent'],
    ['currentColor', 'currentColor'],
    ['currentcolor', 'currentcolor'],
    ['rebeccapurple', 'rebeccapurple'],
  ])('treats default %s as a literal, preserving its casing', (defaultValue, expectedLiteral) => {
    const colorTab: TabConfig = {
      id: 'color',
      label: 'Color',
      colorExtras: COLOR_EXTRAS,
      tiers: [
        {
          id: 'semantic',
          label: 'Semantic',
          semantic: true,
          referencesRamps: [{ tab: 'palette', tier: 'base' }],
          items: [
            {
              id: 'danger',
              cssVar: '--zd-danger',
              label: 'Danger',
              default: defaultValue,
              type: { kind: 'color' as const },
            },
          ],
        },
      ],
    };

    const cluster = resolveColorClusterFromTab(colorTab, [colorTab, PALETTE_TAB]);
    expect(cluster?.semanticDefaults).toEqual({ danger: { literal: expectedLiteral } });
  });

  it('still derives a real ramp ref alongside a named-color-literal sibling on the same tier', () => {
    const colorTab: TabConfig = {
      id: 'color',
      label: 'Color',
      colorExtras: COLOR_EXTRAS,
      tiers: [
        {
          id: 'semantic',
          label: 'Semantic',
          semantic: true,
          referencesRamps: [{ tab: 'palette', tier: 'base' }],
          items: [
            {
              id: 'danger',
              cssVar: '--zd-danger',
              label: 'Danger',
              default: 'red',
              type: { kind: 'color' as const },
            },
            {
              id: 'surface',
              cssVar: '--zd-surface',
              label: 'Surface',
              default: 'base-1',
              type: { kind: 'color' as const },
            },
          ],
        },
      ],
    };

    const tabs = [colorTab, PALETTE_TAB];
    const cluster = resolveColorClusterFromTab(colorTab, tabs);
    expect(cluster?.semanticDefaults).toEqual({
      danger: { literal: 'red' },
      surface: { ref: { tab: 'palette', tier: 'base', item: 'base-1' } },
    });
  });
});
