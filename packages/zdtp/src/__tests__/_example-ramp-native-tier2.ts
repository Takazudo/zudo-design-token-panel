/**
 * Example manifest — ramp-native Tier-2 color editor (epic #459, S14/#475).
 *
 * A minimal, realistic `PanelConfig` fixture that exercises every #459
 * addition side by side, in the shape a real host would actually ship:
 *
 *   - `TierConfig.semantic: true`   — the Color tab's only tier is a lone
 *     semantic tier (no palette tier of its own); it is never mistaken for
 *     the palette (#461).
 *   - `TierConfig.referencesRamps`  — the semantic tier declares two ramp
 *     sources living on a SEPARATE `palette` tab: `base` and `accent` (#467).
 *   - `SemanticValue` `{ ref }`     — `surface` uses the bare-id form
 *     (resolves against the FIRST declared ramp source, `base`); `brand`
 *     uses the `"tierId:itemId"` form to pick the non-first `accent` source
 *     (#467/#468).
 *   - `SemanticValue` `{ literal }` — `info` is a standalone literal OKLCH
 *     color, unrelated to any ramp (#464/#465).
 *
 * `danger`'s MANIFEST default is a single-mode literal string — `TierItem.default`
 * is always a plain string, so the `{ literal: { light, dark } }` per-mode shape
 * can only ever arise as a RUNTIME override (via the panel's "Per-mode" editor
 * checkbox, or a hand-built `ColorTweakState`), never as a manifest default
 * (#472/#473). `EXAMPLE_DANGER_LIGHT` / `EXAMPLE_DANGER_DARK` below are the pair
 * `manifest-cascade-verification.test.ts`'s Invariant H layers on top of this
 * manifest's cluster to exercise that shape end-to-end.
 *
 * Consumed by:
 *   - `manifest-cascade-verification.test.ts` (Invariant H) — asserts the
 *     manifest is valid and exercises the tier-model fields above.
 *   - `doc/src/content/docs/reference/color-cluster.mdx` ("Semantic value
 *     shapes" worked example) — the doc's `configurePanel({...})` snippet
 *     transcribes this fixture's shape.
 */

import type { PanelConfig } from '../config/panel-config';
import type { TabConfig } from '../tokens/tier-model';

// ---------------------------------------------------------------------------
// Ramp source — a standalone Palette tab (no colorExtras: it is never itself
// a color cluster's primary tab, only a source of ramp items for the Color
// tab's semantic tier). Two tiers so the grouped picker's two ramp sources
// are genuinely distinct groups, not a single-source degenerate case.
// ---------------------------------------------------------------------------

export const EXAMPLE_PALETTE_TAB: TabConfig = {
  id: 'palette',
  label: 'Palette',
  tiers: [
    {
      id: 'base',
      label: 'Base',
      items: [
        { id: 'base-0', cssVar: '--palette-base-0', label: 'Base 0', default: 'oklch(0.98 0 0)', type: { kind: 'color', format: 'oklch' } },
        { id: 'base-1', cssVar: '--palette-base-1', label: 'Base 1', default: 'oklch(0.85 0 0)', type: { kind: 'color', format: 'oklch' } },
        { id: 'base-2', cssVar: '--palette-base-2', label: 'Base 2', default: 'oklch(0.7 0 0)', type: { kind: 'color', format: 'oklch' } },
        { id: 'base-3', cssVar: '--palette-base-3', label: 'Base 3', default: 'oklch(0.2 0 0)', type: { kind: 'color', format: 'oklch' } },
      ],
    },
    {
      id: 'accent',
      label: 'Accent',
      items: [
        { id: 'accent-0', cssVar: '--palette-accent-0', label: 'Accent 0', default: 'oklch(0.65 0.2 250)', type: { kind: 'color', format: 'oklch' } },
        { id: 'accent-1', cssVar: '--palette-accent-1', label: 'Accent 1', default: 'oklch(0.55 0.2 250)', type: { kind: 'color', format: 'oklch' } },
        { id: 'accent-2', cssVar: '--palette-accent-2', label: 'Accent 2', default: 'oklch(0.45 0.2 250)', type: { kind: 'color', format: 'oklch' } },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// The Color tab — a lone `semantic: true` tier referencing both of the
// Palette tab's ramps, plus a standalone literal row.
// ---------------------------------------------------------------------------

/** Manifest default for `danger` — a single-mode literal (see file header). */
export const EXAMPLE_DANGER_LIGHT = 'oklch(0.55 0.22 25)';
/** Dark-mode counterpart used only by the Invariant H runtime-state check. */
export const EXAMPLE_DANGER_DARK = 'oklch(0.7 0.19 25)';

export const EXAMPLE_COLOR_TAB: TabConfig = {
  id: 'color',
  label: 'Color',
  colorExtras: {
    id: 'ramp-native-example',
    label: 'Example',
    baseRoles: {},
    baseDefaults: {},
    defaultShikiTheme: 'github-dark',
    colorSchemes: {},
    // A non-empty colorScheme is required by assertValidPanelConfig even
    // though it is functionally unused here (colorSchemes is empty, so
    // initColorFromScheme short-circuits to initSecondaryDefaults).
    panelSettings: { colorScheme: 'default', colorMode: false },
  },
  tiers: [
    {
      id: 'semantic',
      label: 'Semantic',
      semantic: true,
      referencesRamps: [
        { tab: 'palette', tier: 'base' },
        { tab: 'palette', tier: 'accent' },
      ],
      items: [
        {
          id: 'surface',
          cssVar: '--zd-surface',
          label: 'Surface',
          // Bare ramp-item id -> resolves against the FIRST declared ramp
          // source (referencesRamps[0] = base).
          default: 'base-2',
          type: { kind: 'color', format: 'oklch' },
        },
        {
          id: 'brand',
          cssVar: '--zd-brand',
          label: 'Brand',
          // "tierId:itemId" form -> picks a NON-first ramp source by name.
          default: 'accent:accent-1',
          type: { kind: 'color', format: 'oklch' },
        },
        {
          id: 'info',
          cssVar: '--zd-info',
          label: 'Info',
          // Standalone literal, unrelated to any ramp.
          default: 'oklch(0.6 0.1 230)',
          type: { kind: 'color', format: 'oklch' },
        },
        {
          id: 'danger',
          cssVar: '--zd-danger',
          label: 'Danger',
          default: EXAMPLE_DANGER_LIGHT,
          type: { kind: 'color', format: 'oklch' },
        },
      ],
    },
  ],
};

export const EXAMPLE_TABS: readonly TabConfig[] = [EXAMPLE_PALETTE_TAB, EXAMPLE_COLOR_TAB];

export const EXAMPLE_PANEL_CONFIG: PanelConfig = {
  storagePrefix: 'zdtp-example-ramp-native',
  consoleNamespace: 'zdtpExample',
  modalClassPrefix: 'zdtp-example-ramp-native-modal',
  schemaId: 'zudo-design-tokens/v1',
  exportFilenameBase: 'zdtp-example-ramp-native-tokens',
  tabs: EXAMPLE_TABS,
  colorPresets: {},
};
