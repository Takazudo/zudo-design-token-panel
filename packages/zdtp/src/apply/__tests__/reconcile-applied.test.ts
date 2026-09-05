import { describe, expect, it } from 'vitest';
import { reconcileApplied, writtenCssVarsFromResponse } from '../reconcile-applied';
import { FIXTURE_CLUSTER, FIXTURE_PANEL_CONFIG } from '../../__tests__/_test-helpers';
import { buildApplyOverrides } from '../build-apply-overrides';

function defaults(): import('../../state/tweak-state').ColorTweakState {
  return {
    palette: Array.from({ length: FIXTURE_CLUSTER.paletteSize }, () => '#000000'),
    background: 0,
    foreground: 15,
    cursor: 6,
    selectionBg: 0,
    selectionFg: 15,
    semanticMappings: { accent: 6, muted: 8, active: 14 },
    shikiTheme: 'dracula' as const,
  };
}

describe('reconcileApplied', () => {
  it('clears only addresses confirmed in per-file changed arrays', () => {
    const state = {
      color: defaults(),
      spacing: { 'hsp-md': '24px', 'hsp-lg': '32px' },
      typography: {},
      size: {},
    };
    const next = reconcileApplied(
      state,
      ['--zd-spacing-hgap-md'],
      FIXTURE_PANEL_CONFIG,
      defaults(),
    );
    expect(next.spacing).toEqual({ 'hsp-lg': '32px' });
  });

  it('deduplicates written vars across files', () => {
    expect(writtenCssVarsFromResponse({ updated: [
      { changed: ['--a', '--b'] },
      { changed: ['--a'] },
    ] })).toEqual(['--a', '--b']);
  });

  it('keeps a derived role dirty while its changed base-role index remains unreconciled', () => {
    const baseline = defaults();
    baseline.semanticMappings.accent = 'bg';
    const state = {
      color: { ...baseline, background: 2, semanticMappings: { ...baseline.semanticMappings } },
      spacing: {}, typography: {}, size: {},
    };
    const first = buildApplyOverrides(state, baseline, FIXTURE_CLUSTER, FIXTURE_PANEL_CONFIG.tabs);
    expect(first['--fixture-semantic-accent']).toBe('var(--fixture-p2)');

    const reconciled = reconcileApplied(
      state, ['--fixture-semantic-accent'], FIXTURE_PANEL_CONFIG, baseline,
    );
    expect(reconciled.color.background).toBe(2);
    expect(buildApplyOverrides(
      reconciled, baseline, FIXTURE_CLUSTER, FIXTURE_PANEL_CONFIG.tabs,
    )['--fixture-semantic-accent']).toBe('var(--fixture-p2)');
  });
});
