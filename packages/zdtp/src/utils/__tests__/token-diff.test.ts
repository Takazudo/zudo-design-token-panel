import { describe, expect, it } from 'vitest';
import { buildApplyOverrides } from '../../apply/build-apply-overrides';
import { flattenApplyOverrides } from '../../apply-modal';
import { resolveColorClusterFromTab } from '../../config/cluster-config';
import type { ColorTweakState, TweakState } from '../../state/tweak-state';
import { FIXTURE_PANEL_CONFIG } from '../../__tests__/_test-helpers';
import { semanticMappingsEqual, serialize } from '../design-token-serde';
import { buildTokenIndex } from '../token-index';
import type { TabConfig } from '../../tokens/tier-model';
import {
  changedCounts,
  changedEntries,
  formatCssDeclarations,
  revertEntry,
} from '../token-diff';

const baseline: ColorTweakState = {
  palette: Array.from({ length: 16 }, (_, index) => `#${index.toString(16).padStart(6, '0')}`),
  background: 0,
  foreground: 15,
  cursor: 6,
  selectionBg: 0,
  selectionFg: 15,
  semanticMappings: { accent: 6, muted: 8, active: 14 },
  shikiTheme: 'dracula',
};

function makeState(): TweakState {
  return { color: { ...baseline, palette: [...baseline.palette], semanticMappings: { ...baseline.semanticMappings } }, spacing: {}, typography: {}, size: {}, tabs: {} };
}

describe('canonical token diff', () => {
  it('compares color entries with the supplied identity baseline and other entries with manifest defaults', () => {
    const index = buildTokenIndex(FIXTURE_PANEL_CONFIG);
    const state = makeState();
    state.color.palette[2] = '#abcdef';
    state.color.semanticMappings.accent = { literal: '#123456' };
    state.spacing['hsp-md'] = '44px';

    expect(changedEntries(index.entries, state, baseline).map((entry) => entry.address.itemId)).toEqual([
      'hsp-md',
      'fixture-p2',
      'accent',
    ]);
    expect(changedCounts(index.entries, state, baseline)).toEqual({ spacing: 1, color: 2 });
  });

  it('formats references through the tier emitter and semantic mappings through color semantics', () => {
    const cfg = {
      ...FIXTURE_PANEL_CONFIG,
      tabs: [
        ...FIXTURE_PANEL_CONFIG.tabs,
        {
          id: 'easing', label: 'Easing', tiers: [
            { id: 'raw', label: 'Raw', items: [{ id: 'ease', cssVar: '--ease', label: 'Ease', default: 'linear', type: { kind: 'text' as const } }] },
            { id: 'semantic', label: 'Semantic', referencesTier: 'raw', items: [{ id: 'motion', cssVar: '--motion', label: 'Motion', default: 'ease', type: { kind: 'text' as const } }] },
          ],
        },
      ],
    };
    const index = buildTokenIndex(cfg);
    const state = makeState();
    state.tabs = { easing: { semantic: { motion: 'ease' } } };
    state.color.semanticMappings.accent = { literal: { light: '#fff', dark: '#000' } };
    const entries = [
      index.entry({ tabId: 'easing', tierId: 'semantic', itemId: 'motion' })!,
      index.entry({ tabId: 'color', tierId: 'semantic', itemId: 'accent' })!,
    ];
    expect(formatCssDeclarations(entries, state, cfg)).toBe('--motion: var(--ease);\n--fixture-semantic-accent: light-dark(#fff, #000);');
  });

  it('revert updaters delete sparse overrides and restore color baseline values', () => {
    const index = buildTokenIndex(FIXTURE_PANEL_CONFIG);
    const state = makeState();
    state.spacing['hsp-md'] = '44px';
    state.color.palette[2] = '#abcdef';
    const spacing = index.entry({ tabId: 'spacing', tierId: 'raw', itemId: 'hsp-md' })!;
    const palette = index.entry({ tabId: 'color', tierId: 'palette', itemId: 'fixture-p2' })!;
    const reverted = revertEntry(palette, baseline, FIXTURE_PANEL_CONFIG)(
      revertEntry(spacing, baseline, FIXTURE_PANEL_CONFIG)(state),
    );
    expect(reverted.spacing).toEqual({});
    expect(reverted.color.palette[2]).toBe(baseline.palette[2]);
  });

  it('uses the same changed cssVar set for UI, export, and Apply', () => {
    const colorTab = FIXTURE_PANEL_CONFIG.tabs.find((tab) => tab.id === 'color')!;
    const cluster = resolveColorClusterFromTab(colorTab, FIXTURE_PANEL_CONFIG.tabs)!;
    const index = buildTokenIndex(FIXTURE_PANEL_CONFIG);
    const exportedCssVars = (state: TweakState, colorBaseline: ColorTweakState): string[] => {
      const tabs = serialize(state, { colorDefaults: colorBaseline }, FIXTURE_PANEL_CONFIG).tabs ?? {};
      return Object.values(tabs).flatMap((tab) =>
        Object.values(tab).flatMap((tier) => Object.keys(tier)),
      ).sort();
    };
    const assertParity = (state: TweakState, colorBaseline = baseline) => {
      const ui = changedEntries(index.entries, state, colorBaseline, FIXTURE_PANEL_CONFIG)
        .map((entry) => entry.cssVar).sort();
      const exported = exportedCssVars(state, colorBaseline);
      const applied = Object.keys(buildApplyOverrides(
        state, colorBaseline, cluster, FIXTURE_PANEL_CONFIG.tabs,
      )).sort();
      expect({ exported, applied }).toEqual({ exported: ui, applied: ui });
    };

    const defaultEqual = makeState();
    defaultEqual.spacing['hsp-md'] = '40px';
    assertParity(defaultEqual);

    const empty = makeState();
    empty.spacing['hsp-md'] = '';
    assertParity(empty);

    const roleEquivalent = makeState();
    roleEquivalent.color.semanticMappings.accent = 'bg';
    const numericBaseline = { ...baseline, semanticMappings: { ...baseline.semanticMappings, accent: 0 } };
    expect(semanticMappingsEqual('bg', 0, 0, 15, numericBaseline)).toBe(true);
    assertParity(roleEquivalent, numericBaseline);

    const literal = makeState();
    literal.color.semanticMappings.accent = { literal: '#123456' };
    assertParity(literal);

    const ref = makeState();
    ref.color.semanticMappings.accent = { ref: { tier: 'palette', item: 'fixture-p2' } };
    assertParity(ref);

    const palette = makeState();
    palette.color.palette[2] = '#abcdef';
    assertParity(palette);
  });

  it('flattenApplyOverrides diffs the secondary cluster against its configured defaults', () => {
    const secondaryTab: TabConfig = {
      id: 'color-secondary', label: 'Secondary',
      colorExtras: {
        id: 'secondary', label: 'Secondary', baseRoles: {},
        baseDefaults: { background: 0, foreground: 1, cursor: 0, selectionBg: 0, selectionFg: 1 },
        defaultShikiTheme: 'dracula' as const, colorSchemes: {}, panelSettings: { colorScheme: '', colorMode: false as const },
      },
      tiers: [
        { id: 'palette', label: 'Palette', items: [
          { id: 'secondary-p0', cssVar: '--secondary-p0', label: 'P0', default: '#000000', type: { kind: 'color' as const } },
          { id: 'secondary-p1', cssVar: '--secondary-p1', label: 'P1', default: '#ffffff', type: { kind: 'color' as const } },
        ] },
        { id: 'semantic', label: 'Semantic', semantic: true as const, items: [
          { id: 'surface', cssVar: '--secondary-surface', label: 'Surface', default: 'secondary-p0', type: { kind: 'color' as const } },
        ] },
      ],
    };
    const cfg = { ...FIXTURE_PANEL_CONFIG, tabs: [...FIXTURE_PANEL_CONFIG.tabs, secondaryTab] };
    const state = makeState();
    state.secondary = {
      palette: ['#123456', '#ffffff'], background: 0, foreground: 1, cursor: 0,
      selectionBg: 0, selectionFg: 1, semanticMappings: { surface: 0 }, shikiTheme: 'dracula',
    };
    expect(flattenApplyOverrides(state, baseline, cfg)).toEqual({ '--secondary-p0': '#123456' });
  });
});
