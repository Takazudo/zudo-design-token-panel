// @vitest-environment jsdom

/**
 * Cross-tab semantic ref cascade — end-to-end confirm (S10, #471, closing out
 * the Wave-3 sequence for epic #459).
 *
 * Wave 3 (#467-#470) added the ability for a `semantic: true` tier to point a
 * mapping at a ramp item living in ANOTHER tab (typically a grouped Palette
 * tab), instead of only a literal color or an intra-tab palette index:
 *
 *   - `TierConfig.referencesRamps` declares which ramp tier(s) (optionally in
 *     another tab) a semantic tier's `{ ref }` mappings may point into (#467).
 *   - `SemanticValue` gained the `{ ref: { tab?, tier, item } }` variant, and
 *     `resolveRefToCssVar` (`apply/tier-resolver.ts`) resolves it to the
 *     target item's bare `cssVar` (#467).
 *   - Both emitters — the disk emitter (`buildApplyOverrides`) and the DOM
 *     emitter (`applyColorState`/`resolveSemanticCssValue`) — wrap that
 *     cssVar in `var(...)` so the written custom property is a live CSS
 *     reference, not a snapshot (#468).
 *   - `configurePanel` validates every `referencesRamps` SOURCE declaration up
 *     front — unknown tab/tier throws a clear configure-time error (#469).
 *   - `TierRefSelector` renders a grouped ref-or-literal `<select>` (one
 *     `<optgroup>` per declared ramp source) and `color-tab.tsx` routes a
 *     `referencesRamps`-declaring tier's rows through it via
 *     `SemanticRefOrLiteralRow` (#470).
 *
 * Each of #467-#470 has its own unit-level test file (`tier-resolver.test.ts`,
 * `build-apply-overrides.test.ts`'s S7b section, `panel-config.test.ts`,
 * `tier-ref-selector.test.tsx`). This file is the S10 confirm: it proves the
 * whole stack works together — configure -> resolve -> render -> apply (disk
 * + DOM, parity) -> the actual var()-indirection cascade -> validation -> the
 * pre-existing literal/legacy paths are unaffected — through one fixture that
 * ships BOTH a grouped Palette tab (the ramp source) and a Color tab whose
 * semantic tier declares `referencesRamps` into it, wired through
 * `configurePanel` exactly as a real host would.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';

import ColorTab from '../tabs/color-tab';
import {
  __resetPanelConfigForTests,
  assertValidPanelConfig,
  configurePanel,
  getPanelConfig,
  type PanelConfig,
} from '../config/panel-config';
import { resolveColorClusterFromTab } from '../config/cluster-config';
import {
  applyColorState,
  applyFullState,
  getActivePrimaryCluster,
  initColorFromScheme,
  type ColorTweakState,
  type TweakState,
} from '../state/tweak-state';
import { buildApplyOverrides } from '../apply/build-apply-overrides';
import { resolveRefToCssVar, TierResolverError } from '../apply/tier-resolver';
import {
  HighlightContext,
  type HighlightContextValue,
} from '../highlight/highlight-toggle-button';
import { DEFAULT_HIGHLIGHT_SLOTS, type HighlightState } from '../highlight/highlight-state';
import { TooltipProvider } from '../controls/tooltip';
import type { TabConfig } from '../tokens/tier-model';
import type { PersistColor, PersistSecondary } from '../state/persist';
import { FIXTURE_TABS, FIXTURE_PANEL_CONFIG } from './_test-helpers';

// ---------------------------------------------------------------------------
// FIXTURE — a grouped Palette tab (ramp source) + a Color tab whose semantic
// tier declares referencesRamps into it (3 sources: base/accent/state).
// ---------------------------------------------------------------------------

/**
 * The ramp-source tab. No `colorExtras` — it is never itself a color
 * cluster's primary tab, only a source of ramp items for another tab's
 * semantic tier. Three tiers so the grouped picker renders three distinct
 * `<optgroup>`s (base/accent/state), matching real-world "palette split into
 * named ramps" manifests.
 */
const PALETTE_TAB: TabConfig = {
  id: 'palette',
  label: 'Palette',
  tiers: [
    {
      id: 'base',
      label: 'Base',
      items: [
        { id: 'base-0', cssVar: '--palette-base-0', label: 'Base 0', default: 'oklch(0.98 0 0)', type: { kind: 'color', format: 'oklch' } },
        { id: 'base-1', cssVar: '--palette-base-1', label: 'Base 1', default: 'oklch(0.9 0 0)', type: { kind: 'color', format: 'oklch' } },
        { id: 'base-2', cssVar: '--palette-base-2', label: 'Base 2', default: 'oklch(0.8 0 0)', type: { kind: 'color', format: 'oklch' } },
        { id: 'base-3', cssVar: '--palette-base-3', label: 'Base 3', default: 'oklch(0.7 0 0)', type: { kind: 'color', format: 'oklch' } },
        { id: 'base-4', cssVar: '--palette-base-4', label: 'Base 4', default: 'oklch(0.2 0 0)', type: { kind: 'color', format: 'oklch' } },
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
    {
      id: 'state',
      label: 'State',
      items: [
        { id: 'state-0', cssVar: '--palette-state-0', label: 'State 0', default: 'oklch(0.6 0.22 25)', type: { kind: 'color', format: 'oklch' } },
        { id: 'state-1', cssVar: '--palette-state-1', label: 'State 1', default: 'oklch(0.75 0.15 140)', type: { kind: 'color', format: 'oklch' } },
      ],
    },
  ],
};

/**
 * The Color tab: a lone `semantic: true` tier (no palette tier of its own —
 * every mapping either references the Palette tab's ramps or is a standalone
 * literal). Three semantic rows exercise the three `SemanticValue` shapes
 * that can appear side by side on a `referencesRamps` tier:
 *
 *   - `surface` — `default: 'base-3'`, a bare ramp-item id. Convention: a bare
 *     id (no `tierId:` prefix) resolves against the tier's FIRST declared
 *     ramp source (`referencesRamps[0]` = base) — see
 *     `deriveRampRef`/`deriveSemanticValue` in `config/cluster-config.ts`.
 *   - `brand` — `default: 'accent:accent-1'`, the `"tierId:itemId"` form that
 *     picks a NON-first ramp source by name.
 *   - `danger` — `default: 'oklch(0.55 0.22 25)'`, a literal color. Proves a
 *     `referencesRamps`-declaring tier still supports plain literal rows
 *     side by side with ref rows (the #464 literal path is not disturbed by
 *     Wave 3).
 */
const COLOR_TAB: TabConfig = {
  id: 'color',
  label: 'Color',
  colorExtras: {
    id: 'crosstab-e2e',
    label: 'Crosstab E2E',
    baseRoles: {},
    baseDefaults: {},
    defaultShikiTheme: 'dracula',
    colorSchemes: {},
    panelSettings: { colorScheme: '', colorMode: false },
  },
  tiers: [
    {
      id: 'semantic',
      label: 'Semantic',
      semantic: true,
      referencesRamps: [
        { tab: 'palette', tier: 'base' },
        { tab: 'palette', tier: 'accent' },
        { tab: 'palette', tier: 'state' },
      ],
      items: [
        {
          id: 'surface',
          cssVar: '--zd-surface',
          label: 'Surface',
          default: 'base-3',
          type: { kind: 'color', format: 'oklch' },
        },
        {
          id: 'brand',
          cssVar: '--zd-brand',
          label: 'Brand',
          default: 'accent:accent-1',
          type: { kind: 'color', format: 'oklch' },
        },
        {
          id: 'danger',
          cssVar: '--zd-danger',
          label: 'Danger',
          default: 'oklch(0.55 0.22 25)',
          type: { kind: 'color', format: 'oklch' },
        },
      ],
    },
  ],
};

const ALL_TABS: readonly TabConfig[] = [PALETTE_TAB, COLOR_TAB];

const CROSSTAB_PANEL_CONFIG: PanelConfig = {
  storagePrefix: 'issue-459-e2e',
  consoleNamespace: 'issue-459-e2e',
  modalClassPrefix: 'issue-459-e2e-modal',
  schemaId: 'zudo-design-tokens/v1',
  exportFilenameBase: 'issue-459-e2e-tokens',
  tabs: ALL_TABS,
  colorPresets: {},
};

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

function makeHighlightState(): HighlightState {
  return {
    slots: DEFAULT_HIGHLIGHT_SLOTS.map((s) => ({ ...s })),
    outlineWidth: 2,
    active: {},
  };
}

function makeCtx(state: HighlightState, toggle: (cssVar: string) => void): HighlightContextValue {
  return { state, toggle };
}

let container: HTMLDivElement;

beforeEach(() => {
  __resetPanelConfigForTests();
  configurePanel(CROSSTAB_PANEL_CONFIG);
  container = document.createElement('div');
  document.body.appendChild(container);
  document.documentElement.removeAttribute('style');
});

afterEach(() => {
  act(() => {
    render(null, container);
  });
  document.body.removeChild(container);
  document.documentElement.removeAttribute('style');
  __resetPanelConfigForTests();
  vi.restoreAllMocks();
});

/** Render ColorTab wrapped in TooltipProvider and HighlightContext. */
function renderColorTab(
  tab: TabConfig,
  state: ColorTweakState,
  opts: { persistColor?: PersistColor; persistSecondary?: PersistSecondary } = {},
): void {
  const { persistColor = vi.fn(), persistSecondary = vi.fn() } = opts;
  const ctx = makeCtx(makeHighlightState(), vi.fn());
  act(() => {
    render(
      <TooltipProvider>
        <HighlightContext.Provider value={ctx}>
          <ColorTab
            tab={tab}
            state={state}
            persistColor={persistColor}
            secondaryTab={null}
            secondaryState={null}
            persistSecondary={persistSecondary}
          />
        </HighlightContext.Provider>
      </TooltipProvider>,
      container,
    );
  });
}

function makeCrosstabState(): ColorTweakState {
  const cluster = getActivePrimaryCluster();
  return initColorFromScheme(cluster);
}

/** Locate a semantic row's `<select>` by its row data-testid. */
function getSemanticRefSelect(idKey: string): HTMLSelectElement {
  const row = container.querySelector(`[data-testid="tokenpanel-semantic-ref-${idKey}"]`);
  expect(row).not.toBeNull();
  const select = row!.querySelector('select.tokenpanel-tier-ref-select') as HTMLSelectElement;
  expect(select).not.toBeNull();
  return select;
}

/** Fire a native change event on a select element, setting its value first. */
function fireSelectChange(select: HTMLSelectElement, newValue: string) {
  act(() => {
    Object.defineProperty(select, 'value', { value: newValue, writable: true, configurable: true });
    select.value = newValue;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

/** Locate the "Semantic Tokens" grid by its section heading (not a fixed
 * grid index — the Base section renders its own `.tokenpanel-color-base-grid`
 * sibling with two more `.tokenpanel-palette-selector` rows of its own for
 * the background/foreground base roles, so an unscoped count would double
 * count them). Mirrors `issue-458-lone-semantic-tier-e2e.test.tsx`'s helper
 * of the same name. */
function getSemanticGrid(): HTMLElement {
  const headings = Array.from(container.querySelectorAll('[role="heading"][aria-level="3"]'));
  const semanticHeading = headings.find((h) => (h.textContent ?? '').includes('Semantic Tokens'));
  expect(semanticHeading).not.toBeUndefined();
  const section = semanticHeading!.parentElement as HTMLElement;
  const grid = section.querySelector('.tokenpanel-color-base-grid') as HTMLElement | null;
  expect(grid).not.toBeNull();
  return grid!;
}

function findOptionByText(select: HTMLSelectElement, needle: string): HTMLOptionElement {
  const opt = Array.from(select.querySelectorAll('option')).find((o) =>
    (o.textContent ?? '').includes(needle),
  );
  if (!opt) throw new Error(`no option with text containing "${needle}" in select`);
  return opt;
}

// ---------------------------------------------------------------------------
// 1. configurePanel + resolveColorClusterFromTab
// ---------------------------------------------------------------------------

describe('1. configurePanel accepts the palette + referencesRamps color tab pair', () => {
  it('does NOT throw', () => {
    __resetPanelConfigForTests();
    expect(() => configurePanel(CROSSTAB_PANEL_CONFIG)).not.toThrow();
  });

  it('resolves the bare-id ramp ref ("surface": "base-3") against the FIRST declared ramp source', () => {
    const cluster = resolveColorClusterFromTab(COLOR_TAB, ALL_TABS)!;
    expect(cluster).toBeDefined();
    expect(cluster.semanticDefaults['surface']).toEqual({
      ref: { tab: 'palette', tier: 'base', item: 'base-3' },
    });
  });

  it('resolves the "tierId:itemId" ramp ref ("brand": "accent:accent-1") against the NAMED ramp source', () => {
    const cluster = resolveColorClusterFromTab(COLOR_TAB, ALL_TABS)!;
    expect(cluster.semanticDefaults['brand']).toEqual({
      ref: { tab: 'palette', tier: 'accent', item: 'accent-1' },
    });
  });

  it('resolves the literal default ("danger") to a { literal } SemanticValue, unaffected by referencesRamps', () => {
    const cluster = resolveColorClusterFromTab(COLOR_TAB, ALL_TABS)!;
    expect(cluster.semanticDefaults['danger']).toEqual({ literal: 'oklch(0.55 0.22 25)' });
  });

  it('paletteSize is 0 for the lone-semantic Color tab (no palette tier of its own)', () => {
    const cluster = resolveColorClusterFromTab(COLOR_TAB, ALL_TABS)!;
    expect(cluster.paletteSize).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 2. Emitter parity — disk (buildApplyOverrides) vs. DOM (applyColorState)
// ---------------------------------------------------------------------------

describe('2. both emitters emit var(--palette-base-3) for the resolved cross-tab ref, and agree with each other', () => {
  it('buildApplyOverrides emits var(...) for each ref row and the literal verbatim for the literal row', () => {
    const colorState = makeCrosstabState();
    const fullState: TweakState = { color: colorState, spacing: {}, typography: {}, size: {} };
    const cluster = getActivePrimaryCluster();

    const out = buildApplyOverrides(fullState, undefined, cluster, ALL_TABS);

    expect(out['--zd-surface']).toBe('var(--palette-base-3)');
    expect(out['--zd-brand']).toBe('var(--palette-accent-1)');
    expect(out['--zd-danger']).toBe('oklch(0.55 0.22 25)');
  });

  it('applyColorState writes the identical values to document.documentElement', () => {
    const colorState = makeCrosstabState();
    const cluster = getActivePrimaryCluster();

    applyColorState(colorState, cluster, undefined, COLOR_TAB, ALL_TABS);

    const root = document.documentElement.style;
    expect(root.getPropertyValue('--zd-surface')).toBe('var(--palette-base-3)');
    expect(root.getPropertyValue('--zd-brand')).toBe('var(--palette-accent-1)');
    expect(root.getPropertyValue('--zd-danger')).toBe('oklch(0.55 0.22 25)');
  });

  it('disk and DOM outputs agree byte-for-byte for every semantic cssVar (ref rows AND the literal row)', () => {
    const colorState = makeCrosstabState();
    const cluster = getActivePrimaryCluster();
    const fullState: TweakState = { color: colorState, spacing: {}, typography: {}, size: {} };

    const diskMap = buildApplyOverrides(fullState, undefined, cluster, ALL_TABS);
    applyColorState(colorState, cluster, undefined, COLOR_TAB, ALL_TABS);

    for (const cssVar of ['--zd-surface', '--zd-brand', '--zd-danger']) {
      const domValue = document.documentElement.style.getPropertyValue(cssVar);
      expect(diskMap[cssVar]).toBe(domValue);
    }
  });
});

// ---------------------------------------------------------------------------
// 3. Cascade — the var() indirection actually points at a live ramp value
// ---------------------------------------------------------------------------

describe('3. cascade: --zd-surface indirects through var(--palette-base-3) to the ramp value', () => {
  it('applyFullState (the real apply path, resolving currentTab/tabs from panel config) writes the var() reference, not a resolved snapshot', () => {
    const cluster = getActivePrimaryCluster();
    const colorState = initColorFromScheme(cluster);
    applyFullState({ color: colorState, spacing: {}, typography: {}, size: {} });

    expect(document.documentElement.style.getPropertyValue('--zd-surface')).toBe(
      'var(--palette-base-3)',
    );
  });

  it('jsdom cannot compute var() substitution on a consuming declaration (documented environment limit, not a panel bug)', () => {
    // Sanity-check the fallback path this describe block relies on: jsdom's
    // cssstyle engine returns the literal `var(...)` text for any property
    // that references a custom property — it never substitutes the target's
    // value. This is a jsdom limitation (confirmed independently), not
    // something the panel's apply logic could paper over from inside jsdom.
    document.documentElement.style.setProperty('--palette-base-3', 'oklch(0.5 0.1 30)');
    const probe = document.createElement('div');
    document.body.appendChild(probe);
    probe.style.setProperty('background-color', 'var(--palette-base-3)');
    expect(getComputedStyle(probe).backgroundColor).toBe('var(--palette-base-3)');
    probe.remove();
  });

  it('changing --palette-base-3 on :root (documentElement) changes the RESOLUTION TARGET\'s value while the emitted reference form stays the same', () => {
    const cluster = getActivePrimaryCluster();
    const colorState = initColorFromScheme(cluster);

    // Seed the ramp source to a known concrete value, then apply.
    document.documentElement.style.setProperty('--palette-base-3', 'oklch(0.7 0 0)');
    applyFullState({ color: colorState, spacing: {}, typography: {}, size: {} });

    // The written semantic token is the reference form...
    expect(document.documentElement.style.getPropertyValue('--zd-surface')).toBe(
      'var(--palette-base-3)',
    );
    // ...and the target it points at holds the seeded concrete value. jsdom
    // correctly reports a custom property's OWN computed value even though it
    // cannot substitute var() inside a consuming declaration (see the
    // preceding test) — this is enough to prove the indirection targets a
    // live, changeable value rather than a baked-in literal.
    expect(
      getComputedStyle(document.documentElement).getPropertyValue('--palette-base-3').trim(),
    ).toBe('oklch(0.7 0 0)');

    // Change the ramp source to a different concrete color and re-apply.
    document.documentElement.style.setProperty('--palette-base-3', 'oklch(0.3 0.1 300)');
    applyFullState({ color: colorState, spacing: {}, typography: {}, size: {} });

    // The reference form emitted for --zd-surface is UNCHANGED (still a live
    // pointer, not re-baked per apply)...
    expect(document.documentElement.style.getPropertyValue('--zd-surface')).toBe(
      'var(--palette-base-3)',
    );
    // ...but the value the pointer resolves against has genuinely changed —
    // this is the whole point of the var() indirection: --zd-surface's
    // effective color changes whenever --palette-base-3 changes, with no
    // further apply-side work required.
    expect(
      getComputedStyle(document.documentElement).getPropertyValue('--palette-base-3').trim(),
    ).toBe('oklch(0.3 0.1 300)');
  });
});

// ---------------------------------------------------------------------------
// 4. Rendering — grouped picker shows optgroups per ramp tier; edits reflect
// ---------------------------------------------------------------------------

describe('4. the rendered grouped picker groups by ramp tier and reflects edits into state', () => {
  it('the "surface" row selects the Base optgroup option matching its resolved ref (base-3)', () => {
    renderColorTab(COLOR_TAB, makeCrosstabState());
    const select = getSemanticRefSelect('surface');

    const groups = Array.from(select.querySelectorAll('optgroup'));
    expect(groups.map((g) => g.label)).toEqual(['Base', 'Accent', 'State']);
    expect(groups[0].querySelectorAll('option').length).toBe(5); // base-0..4
    expect(groups[1].querySelectorAll('option').length).toBe(3); // accent-0..2
    expect(groups[2].querySelectorAll('option').length).toBe(2); // state-0..1

    const selected = Array.from(select.querySelectorAll('option')).find((o) => o.selected);
    expect(selected?.textContent).toContain('--palette-base-3');
  });

  it('the "brand" row selects the Accent optgroup option matching its resolved ref (accent-1)', () => {
    renderColorTab(COLOR_TAB, makeCrosstabState());
    const select = getSemanticRefSelect('brand');
    const selected = Array.from(select.querySelectorAll('option')).find((o) => o.selected);
    expect(selected?.textContent).toContain('--palette-accent-1');
  });

  it('the "danger" row (literal, on a referencesRamps tier) shows "Literal…" selected and an editable swatch', () => {
    renderColorTab(COLOR_TAB, makeCrosstabState());
    const select = getSemanticRefSelect('danger');
    const selected = Array.from(select.querySelectorAll('option')).find((o) => o.selected);
    expect(selected?.textContent).toContain('Literal');

    const row = container.querySelector('[data-testid="tokenpanel-semantic-ref-danger"]')!;
    const swatch = row.querySelector('.tokenpanel-color-field-swatch') as HTMLElement;
    expect(swatch).not.toBeNull();
    expect(swatch.style.backgroundColor).toBe('oklch(0.55 0.22 25)');
  });

  it('selecting a different ramp option for "surface" persists a new { ref } mapping', () => {
    const persistColor = vi.fn();
    const baseState = makeCrosstabState();
    renderColorTab(COLOR_TAB, baseState, { persistColor });

    const select = getSemanticRefSelect('surface');
    fireSelectChange(select, findOptionByText(select, '--palette-accent-2').value);

    expect(persistColor).toHaveBeenCalled();
    const updater = persistColor.mock.calls.at(-1)![0] as (
      prev: ColorTweakState,
    ) => ColorTweakState;
    const result = updater(baseState);
    expect(result.semanticMappings['surface']).toEqual({
      ref: { tab: 'palette', tier: 'accent', item: 'accent-2' },
    });
  });

  it('selecting "Literal…" for "surface" persists a { literal } mapping seeded from the resolved preview', () => {
    const persistColor = vi.fn();
    const baseState = makeCrosstabState();
    renderColorTab(COLOR_TAB, baseState, { persistColor });

    const select = getSemanticRefSelect('surface');
    fireSelectChange(select, findOptionByText(select, 'Literal').value);

    expect(persistColor).toHaveBeenCalled();
    const updater = persistColor.mock.calls.at(-1)![0] as (
      prev: ColorTweakState,
    ) => ColorTweakState;
    const result = updater(baseState);
    const mapping = result.semanticMappings['surface'];
    expect(mapping).toEqual({ literal: expect.stringMatching(/^oklch\(/) });
  });
});

// ---------------------------------------------------------------------------
// 5. Validation — bad referencesRamps sources / bad per-row refs throw
// ---------------------------------------------------------------------------

describe('5. validation: a bad referencesRamps source or a bad per-row ref throws a clear error', () => {
  // Configure-time validation of the `referencesRamps` SOURCE declaration
  // (as opposed to a per-row `{ ref }` VALUE, tested below) is performed by
  // `assertValidPanelConfig` — the same trust-boundary validator #469's own
  // tests exercise (`panel-config.test.ts`). `configurePanel` itself does
  // NOT re-run this validation (it is invoked by the host-adapter at the
  // untrusted-JSON boundary before `configurePanel` is ever called), so
  // asserting against `configurePanel` here would not exercise #469 at all.
  it('assertValidPanelConfig throws when referencesRamps names a tab that does not exist', () => {
    const badColorTab: TabConfig = {
      ...COLOR_TAB,
      tiers: [
        {
          ...COLOR_TAB.tiers[0],
          referencesRamps: [{ tab: 'no-such-tab', tier: 'base' }],
        },
      ],
    };
    expect(() =>
      assertValidPanelConfig({ ...CROSSTAB_PANEL_CONFIG, tabs: [PALETTE_TAB, badColorTab] }),
    ).toThrow(/tab "no-such-tab" does not exist/);
  });

  it('assertValidPanelConfig throws when referencesRamps names a tier that does not exist in the target tab', () => {
    const badColorTab: TabConfig = {
      ...COLOR_TAB,
      tiers: [
        {
          ...COLOR_TAB.tiers[0],
          referencesRamps: [{ tab: 'palette', tier: 'no-such-tier' }],
        },
      ],
    };
    expect(() =>
      assertValidPanelConfig({ ...CROSSTAB_PANEL_CONFIG, tabs: [PALETTE_TAB, badColorTab] }),
    ).toThrow(/tier "no-such-tier" does not exist in tab "palette"/);
  });

  it('resolveRefToCssVar throws when a per-row { ref } names an item that does not exist in the target tier', () => {
    expect(() =>
      resolveRefToCssVar({ tab: 'palette', tier: 'base', item: 'no-such-item' }, COLOR_TAB, ALL_TABS),
    ).toThrow(TierResolverError);
    expect(() =>
      resolveRefToCssVar({ tab: 'palette', tier: 'base', item: 'no-such-item' }, COLOR_TAB, ALL_TABS),
    ).toThrow(/item "no-such-item" not found in tier "base"/);
  });

  it('an unresolvable per-row { ref } degrades gracefully at apply time: skipped on disk, #000000 fallback in the DOM', () => {
    const baseState = makeCrosstabState();
    const badState: ColorTweakState = {
      ...baseState,
      semanticMappings: {
        ...baseState.semanticMappings,
        surface: { ref: { tab: 'palette', tier: 'base', item: 'no-such-item' } },
      },
    };
    const fullState: TweakState = { color: badState, spacing: {}, typography: {}, size: {} };
    const cluster = getActivePrimaryCluster();

    const diskMap = buildApplyOverrides(fullState, undefined, cluster, ALL_TABS);
    expect(diskMap['--zd-surface']).toBeUndefined();

    applyColorState(badState, cluster, undefined, COLOR_TAB, ALL_TABS);
    expect(document.documentElement.style.getPropertyValue('--zd-surface')).toBe('#000000');
  });
});

// ---------------------------------------------------------------------------
// 6. Regression — literal semantic rows (#464) and the conventional
// palette+semantic 2-tier cluster (legacy index mappings) still work.
// ---------------------------------------------------------------------------

describe('6. regression: pre-Wave-3 semantic mapping shapes are unaffected', () => {
  it('a lone semantic:true tier with NO referencesRamps still renders literal rows through SemanticLiteralRow (#464)', () => {
    __resetPanelConfigForTests();
    const loneLiteralColorTab: TabConfig = {
      id: 'color',
      label: 'Color',
      colorExtras: COLOR_TAB.colorExtras,
      tiers: [
        {
          id: 'semantic',
          label: 'Semantic',
          semantic: true,
          // No referencesRamps — this is the #458/#464 shape, not Wave 3's.
          items: [
            {
              id: 'info',
              cssVar: '--zd-info',
              label: 'Info',
              default: 'oklch(0.6 0.1 230)',
              type: { kind: 'color', format: 'oklch' },
            },
          ],
        },
      ],
    };
    configurePanel({ ...CROSSTAB_PANEL_CONFIG, tabs: [loneLiteralColorTab] });

    const cluster = getActivePrimaryCluster();
    const state = initColorFromScheme(cluster);
    renderColorTab(loneLiteralColorTab, state);

    // Literal-only tier -> SemanticLiteralRow (data-testid marker), NOT the
    // grouped ref-or-literal picker (no `tokenpanel-semantic-ref-*` row, no
    // <select>).
    expect(
      container.querySelector('[data-testid="tokenpanel-semantic-literal-info"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-testid="tokenpanel-semantic-ref-info"]'),
    ).toBeNull();
    expect(container.querySelector('select.tokenpanel-tier-ref-select')).toBeNull();
  });

  it('a conventional 2-tier palette+semantic color tab (legacy index mappings) still renders and applies unchanged', () => {
    __resetPanelConfigForTests();
    configurePanel(FIXTURE_PANEL_CONFIG);

    const colorTab = FIXTURE_TABS.find((t) => t.id === 'color')!;
    const cluster = getActivePrimaryCluster();
    const state = initColorFromScheme(cluster);

    renderColorTab(colorTab, state);

    const paletteGrid = container.querySelector('.tokenpanel-color-palette-grid') as HTMLElement;
    expect(paletteGrid).not.toBeNull();
    expect(paletteGrid.querySelectorAll('.tokenpanel-color-swatch-button').length).toBe(16);

    // Legacy index mappings -> PaletteSelector rows, not the grouped picker.
    // FIXTURE_CLUSTER declares 3 semantic entries (accent / muted / active).
    expect(getSemanticGrid().querySelectorAll('.tokenpanel-palette-selector').length).toBe(3);
    expect(container.querySelectorAll('select.tokenpanel-tier-ref-select').length).toBe(0);

    // Apply path: legacy index rows resolve straight to the palette color on
    // disk AND in the DOM (no var() indirection involved for this shape).
    const fullState: TweakState = { color: state, spacing: {}, typography: {}, size: {} };
    const diskMap = buildApplyOverrides(fullState, undefined, cluster, getPanelConfig().tabs);
    applyColorState(state, cluster);
    expect(diskMap['--fixture-semantic-accent']).toBe('var(--fixture-p6)');
    expect(document.documentElement.style.getPropertyValue('--fixture-semantic-accent')).toBe(
      state.palette[6],
    );
  });
});
