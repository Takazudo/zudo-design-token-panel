import { describe, expect, it } from 'vitest';
import { buildApplyOverrides } from '../../apply/build-apply-overrides';
import { resolveColorClusterFromTab } from '../../config/cluster-config';
import type { ColorTweakState, TweakState } from '../../state/tweak-state';
import { FIXTURE_PANEL_CONFIG } from '../../__tests__/_test-helpers';
import { semanticMappingsEqual, serialize } from '../design-token-serde';
import { buildTokenIndex } from '../token-index';
import {
  changedCounts,
  changedEntries,
  formatCssDeclarations,
  isChanged,
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

  it('pins the intentional serde and Apply divergences', () => {
    const state = makeState();
    state.spacing['hsp-md'] = '40px';
    const serialized = serialize(state, { colorDefaults: baseline }, FIXTURE_PANEL_CONFIG);
    expect(serialized.tabs?.spacing).toBeUndefined();
    const colorTab = FIXTURE_PANEL_CONFIG.tabs.find((tab) => tab.id === 'color')!;
    const cluster = resolveColorClusterFromTab(colorTab, FIXTURE_PANEL_CONFIG.tabs)!;
    expect(buildApplyOverrides(state, baseline, cluster, FIXTURE_PANEL_CONFIG.tabs)).toMatchObject({
      '--zd-spacing-hgap-md': '40px',
    });

    expect(semanticMappingsEqual('bg', 0, 0, 15, baseline)).toBe(true);
    const accent = buildTokenIndex(FIXTURE_PANEL_CONFIG).entry({ tabId: 'color', tierId: 'semantic', itemId: 'accent' })!;
    state.color.semanticMappings.accent = 'bg';
    const numericBaseline = { ...baseline, semanticMappings: { ...baseline.semanticMappings, accent: 0 } };
    expect(isChanged(accent, state, numericBaseline, FIXTURE_PANEL_CONFIG)).toBe(true);
  });
});
