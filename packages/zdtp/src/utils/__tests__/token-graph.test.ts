import { describe, expect, it } from 'vitest';
import type { TweakState } from '../../state/tweak-state';
import { EXAMPLE_PANEL_CONFIG } from '../../__tests__/_example-ramp-native-tier2';
import type { PanelConfig } from '../../config/panel-config';
import { buildTokenGraph } from '../token-graph';

function state(): TweakState {
  return {
    color: {
      palette: [], background: 0, foreground: 0, cursor: 0, selectionBg: 0, selectionFg: 0,
      semanticMappings: {
        surface: { ref: { tab: 'palette', tier: 'base', item: 'base-2' } },
        brand: { ref: { tab: 'palette', tier: 'accent', item: 'accent-1' } },
        info: { literal: 'oklch(0.6 0.1 230)' },
        danger: { literal: 'oklch(0.55 0.22 25)' },
      },
      shikiTheme: 'github-dark',
    },
    spacing: {}, typography: {}, size: {},
    tabs: { palette: { base: { 'base-2': 'oklch(0.72 0.08 220)' } } },
  };
}

describe('buildTokenGraph', () => {
  it('uses current semantic mappings, and moving one changes both edges and dependents', () => {
    const before = buildTokenGraph(EXAMPLE_PANEL_CONFIG, state());
    const surface = { tabId: 'color', tierId: 'semantic', itemId: 'surface' };
    expect(before.dependentsOf({ tabId: 'palette', tierId: 'base', itemId: 'base-2' })).toEqual([surface]);

    const moved = state();
    moved.color.semanticMappings.surface = { ref: { tab: 'palette', tier: 'accent', item: 'accent-0' } };
    const after = buildTokenGraph(EXAMPLE_PANEL_CONFIG, moved);
    expect(after.dependentsOf({ tabId: 'palette', tierId: 'base', itemId: 'base-2' })).toEqual([]);
    expect(after.dependentsOf({ tabId: 'palette', tierId: 'accent', itemId: 'accent-0' })).toEqual([surface]);
  });

  it('returns same-ramp siblings and a token → oklch → hex resolution chain', () => {
    const graph = buildTokenGraph(EXAMPLE_PANEL_CONFIG, state());
    const address = { tabId: 'color', tierId: 'semantic', itemId: 'surface' };
    expect(graph.rampSiblings({ tabId: 'palette', tierId: 'base', itemId: 'base-2' })).toHaveLength(3);
    expect(graph.resolutionChain(address)).toEqual([
      { kind: 'token', address, cssVar: '--zd-surface' },
      { kind: 'token', address: { tabId: 'palette', tierId: 'base', itemId: 'base-2' }, cssVar: '--palette-base-2' },
      { kind: 'literal', value: 'oklch(0.72 0.08 220)' },
      { kind: 'literal', value: '#68b1c7' },
    ]);
  });

  it('does not mistake referencesRamps allow-list declarations for edges', () => {
    const current = state();
    current.color.semanticMappings.surface = { literal: '#ffffff' };
    const graph = buildTokenGraph(EXAMPLE_PANEL_CONFIG, current);
    expect(graph.dependentsOf({ tabId: 'palette', tierId: 'base', itemId: 'base-0' })).toEqual([]);
    expect(graph.resolutionChain({ tabId: 'color', tierId: 'semantic', itemId: 'surface' })).toEqual([
      { kind: 'token', address: { tabId: 'color', tierId: 'semantic', itemId: 'surface' }, cssVar: '--zd-surface' },
      { kind: 'literal', value: '#ffffff' },
    ]);
  });

  it('matches reference-tier identity-first default resolution', () => {
    const cfg: PanelConfig = {
      ...EXAMPLE_PANEL_CONFIG,
      tabs: [{
        id: 'motion', label: 'Motion', tiers: [
          { id: 'raw', label: 'Raw', items: [
            { id: 'same', cssVar: '--raw-same', label: 'Same', default: 'linear', type: { kind: 'text' } },
            { id: 'declared', cssVar: '--raw-declared', label: 'Declared', default: 'ease', type: { kind: 'text' } },
          ] },
          { id: 'semantic', label: 'Semantic', referencesTier: 'raw', items: [
            { id: 'same', cssVar: '--semantic-same', label: 'Same', default: 'declared', type: { kind: 'text' } },
          ] },
        ],
      }],
    };
    const current = state();
    current.tabs = {};
    const graph = buildTokenGraph(cfg, current);
    expect(graph.resolutionChain({ tabId: 'motion', tierId: 'semantic', itemId: 'same' })).toEqual([
      { kind: 'token', address: { tabId: 'motion', tierId: 'semantic', itemId: 'same' }, cssVar: '--semantic-same' },
      { kind: 'token', address: { tabId: 'motion', tierId: 'raw', itemId: 'same' }, cssVar: '--raw-same' },
      { kind: 'literal', value: 'linear' },
    ]);
  });
});
