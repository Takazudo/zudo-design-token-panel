import { describe, expect, it } from 'vitest';

import { createTweakHistory, HISTORY_LIMIT, type TweakHistoryEntry } from '../history';
import type { TweakState } from '../tweak-state';

const color = (value: string) => ({
  palette: [value],
  background: 0,
  foreground: 0,
  cursor: 0,
  selectionBg: 0,
  selectionFg: 0,
  semanticMappings: {},
  shikiTheme: '',
});

const state = (spacing: string, colorValue = '#000'): TweakState => ({
  color: color(colorValue),
  spacing: { gap: spacing },
  typography: {},
  size: {},
});

function entry(
  before: TweakState,
  after: TweakState,
  timestamp: number,
  overrides: Partial<TweakHistoryEntry> = {},
): TweakHistoryEntry {
  return { reason: 'persist', identity: 'light', before, after, timestamp, ...overrides };
}

describe('TweakHistory', () => {
  it('coalesces the same address inside 500 ms while retaining the gesture start', () => {
    const history = createTweakHistory();
    const initial = state('1px');
    const middle = state('2px');
    const final = state('3px');
    history.record(entry(initial, middle, 1_000, { address: 'spacing.gap' }));
    history.record(entry(middle, final, 1_500, { address: 'spacing.gap' }));

    expect(history.getSnapshot().entries).toHaveLength(1);
    expect(history.getSnapshot().entries[0].before).toBe(initial);
    expect(history.getSnapshot().entries[0].after).toBe(final);

    history.record(entry(final, state('4px'), 2_001, { address: 'spacing.gap' }));
    expect(history.getSnapshot().entries).toHaveLength(2);
  });

  it('caps history at 100 and cuts the redo branch on a new commit', () => {
    const history = createTweakHistory();
    for (let i = 0; i < HISTORY_LIMIT + 5; i += 1) {
      history.record(entry(state(`${i}px`), state(`${i + 1}px`), i));
    }
    expect(history.getSnapshot().entries).toHaveLength(HISTORY_LIMIT);

    let current = state('105px');
    history.configure({
      restore: (next) => (current = next),
      getCurrentState: () => current,
      getIdentity: () => 'light',
    });
    history.undo();
    expect(history.getSnapshot().canRedo).toBe(true);
    history.record(entry(current, state('branch'), 10_000));
    expect(history.getSnapshot().canRedo).toBe(false);
    expect(history.getSnapshot().entries.at(-1)?.after.spacing.gap).toBe('branch');
  });

  it('restores global slices but never restores colors from another identity', () => {
    const history = createTweakHistory();
    const before = state('1px', '#111');
    const after = state('2px', '#222');
    let current = state('2px', '#dark');
    history.configure({
      restore: (next) => (current = next),
      getCurrentState: () => current,
      getIdentity: () => 'dark',
    });
    history.record(entry(before, after, 1, { identity: 'light' }));

    const result = history.undo();
    expect(current.spacing.gap).toBe('1px');
    expect(current.color.palette[0]).toBe('#dark');
    expect(result.skippedReason).toContain('inactive identity');
  });

  it('skips a color-only entry owned by another identity', () => {
    const history = createTweakHistory();
    const before = state('1px', '#111');
    const after = state('1px', '#222');
    let current = state('1px', '#dark');
    let restores = 0;
    history.configure({
      restore: (next) => {
        current = next;
        restores += 1;
      },
      getCurrentState: () => current,
      getIdentity: () => 'dark',
    });
    history.record(entry(before, after, 1, { identity: 'light' }));

    expect(history.undo().entry).toBeNull();
    expect(restores).toBe(0);
    expect(history.getSnapshot().lastSkippedReason).toContain('inactive identity');
  });

  it('can force a no-op Apply entry while resetting earlier history', () => {
    const history = createTweakHistory();
    const unchanged = state('1px');
    history.record(entry(unchanged, state('2px'), 1));
    history.record(entry(unchanged, unchanged, 2, { reason: 'apply' }), {
      reset: true,
      force: true,
    });
    expect(history.getSnapshot().entries.map(({ reason }) => reason)).toEqual(['apply']);
  });
});
