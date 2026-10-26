// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import { FIXTURE_PANEL_CONFIG } from '../../__tests__/_test-helpers';
import { createPersist } from '../persist';
import { createTweakStateTransaction } from '../transaction';
import type { TweakState } from '../tweak-state';

const initial: TweakState = {
  color: {
    palette: Array.from({ length: 16 }, () => '#000000'),
    background: 0,
    foreground: 15,
    cursor: 6,
    selectionBg: 0,
    selectionFg: 15,
    semanticMappings: {},
    shikiTheme: '',
  },
  spacing: { gap: '1px' },
  typography: {},
  size: {},
};

describe('commitTweakState', () => {
  it('runs apply, save, then setState and records an apply as the sole entry', () => {
    const calls: string[] = [];
    let current: TweakState | null = initial;
    const { commitTweakState: commit, history } = createTweakStateTransaction({
      cfg: FIXTURE_PANEL_CONFIG,
      getState: () => current,
      setState: (next) => {
        current = next;
        calls.push('setState');
      },
    });
    const entryReasons = () => history.getSnapshot().entries.map((item) => item.reason);

    commit('import', { ...initial, spacing: { gap: '2px' } }, {
      apply: () => calls.push('apply'),
      save: () => calls.push('save'),
      timestamp: 1,
    });
    commit('reset', { ...initial, spacing: { gap: '3px' } }, {
      apply: () => calls.push('apply'),
      save: () => calls.push('save'),
      timestamp: 2,
    });
    expect(entryReasons()).toEqual(['import', 'reset']);

    commit('apply', { ...initial, spacing: {} }, {
      apply: () => calls.push('apply'),
      save: () => calls.push('save'),
      resetHistory: true,
      timestamp: 3,
    });

    expect(calls).toEqual([
      'apply',
      'save',
      'setState',
      'apply',
      'save',
      'setState',
      'apply',
      'save',
      'setState',
    ]);
    expect(entryReasons()).toEqual(['apply']);
  });
});

describe('createPersist', () => {
  it('commits slice updates as persist transactions addressed to the changed leaf', () => {
    let current: TweakState | null = initial;
    const { commitTweakState, history } = createTweakStateTransaction({
      cfg: FIXTURE_PANEL_CONFIG,
      getState: () => current,
      setState: (next) => {
        current = next;
      },
    });
    const { persistSpacing, persistTab, persistSecondary } = createPersist(commitTweakState);

    persistSpacing((prev) => ({ ...prev, gap: '4px' }));
    persistTab('notes', (prev) => ({ ...prev, base: { accent: '1rem' } }));
    persistSecondary(() => undefined);

    expect(current?.spacing).toEqual({ gap: '4px' });
    expect(current?.tabs).toEqual({ notes: { base: { accent: '1rem' } } });
    expect(current && 'secondary' in current).toBe(false);
    expect(history.getSnapshot().entries.map((entry) => [entry.reason, entry.address])).toEqual([
      ['persist', 'spacing.gap'],
      ['persist', 'tabs'],
    ]);
  });
});
