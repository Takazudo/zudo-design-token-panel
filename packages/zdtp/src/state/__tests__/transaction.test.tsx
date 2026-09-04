// @vitest-environment jsdom

import { render } from 'preact';
import { describe, expect, it } from 'vitest';

import { FIXTURE_PANEL_CONFIG } from '../../__tests__/_test-helpers';
import { useTweakStateTransaction, type CommitTweakStateOptions } from '../transaction';
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
    let current = initial;
    let commit:
      | ((reason: string, updater: TweakState, options?: CommitTweakStateOptions) => void)
      | undefined;
    let entryReasons: readonly string[] = [];

    function Harness() {
      const transaction = useTweakStateTransaction(
        current,
        (updater) => {
          current = updater(current) as TweakState;
          calls.push('setState');
        },
        FIXTURE_PANEL_CONFIG,
      );
      commit = transaction.commitTweakState;
      entryReasons = transaction.history.getSnapshot().entries.map((item) => item.reason);
      return null;
    }

    const host = document.createElement('div');
    render(<Harness />, host);
    commit?.('import', { ...initial, spacing: { gap: '2px' } }, {
      apply: () => calls.push('apply'),
      save: () => calls.push('save'),
      timestamp: 1,
    });
    commit?.('reset', { ...initial, spacing: { gap: '3px' } }, {
      apply: () => calls.push('apply'),
      save: () => calls.push('save'),
      timestamp: 2,
    });
    render(<Harness />, host);
    expect(entryReasons).toEqual(['import', 'reset']);

    commit?.('apply', { ...initial, spacing: {} }, {
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
    // Read the stable history object directly because this harness deliberately
    // uses a framework-agnostic setter instead of scheduling a Preact render.
    render(<Harness />, host);
    expect(entryReasons).toEqual(['apply']);
    render(null, host);
  });
});
