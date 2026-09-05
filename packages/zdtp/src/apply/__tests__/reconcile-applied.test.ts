import { describe, expect, it } from 'vitest';
import { reconcileApplied, writtenCssVarsFromResponse } from '../reconcile-applied';
import { FIXTURE_CLUSTER, FIXTURE_PANEL_CONFIG } from '../../__tests__/_test-helpers';

function defaults() {
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
});
