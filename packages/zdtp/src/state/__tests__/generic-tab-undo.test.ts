// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';

import { FIXTURE_PANEL_CONFIG } from '../../__tests__/_test-helpers';
import type { ApplySink, PanelConfig } from '../../config/panel-config';
import type { TabConfig } from '../../tokens/tier-model';
import { createPersist } from '../persist';
import { createTweakStateTransaction } from '../transaction';
import type { TweakState } from '../tweak-state';

const GAP = '--undo-gap';
const SURFACE = '--undo-surface';
const ALIAS = '--undo-alias';

const THEME_TAB: TabConfig = {
  id: 'theme',
  label: 'Theme',
  tiers: [
    {
      id: 'raw',
      label: 'Raw',
      items: [
        { id: 'gap', cssVar: GAP, label: 'Gap', default: '20px', type: { kind: 'length', step: 1, unit: 'px' } },
        {
          id: 'surface',
          cssVar: SURFACE,
          label: 'Surface',
          default: '#abcdef',
          type: { kind: 'color' },
          modes: { light: '#ffffff', dark: '#111111' },
        },
      ],
    },
    {
      id: 'alias',
      label: 'Alias',
      referencesTier: 'raw',
      items: [{ id: 'alias', cssVar: ALIAS, label: 'Alias', default: 'gap', type: { kind: 'length', step: 1, unit: 'px' } }],
    },
  ],
};

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
  spacing: {},
  typography: {},
  size: {},
};

function makeConfig(applySink?: ApplySink): PanelConfig {
  return {
    ...FIXTURE_PANEL_CONFIG,
    storagePrefix: 'generic-tab-undo',
    tabs: [...FIXTURE_PANEL_CONFIG.tabs, THEME_TAB],
    ...(applySink ? { applySink } : {}),
  };
}

function setup(cfg: PanelConfig) {
  let current: TweakState | null = initial;
  const transaction = createTweakStateTransaction({
    cfg,
    getState: () => current,
    setState: (next) => {
      current = next;
    },
  });
  const { persistTab } = createPersist(transaction.commitTweakState);
  return { ...transaction, persistTab, state: () => current };
}

const inline = (name: string) => document.documentElement.style.getPropertyValue(name);

afterEach(() => {
  document.documentElement.removeAttribute('style');
  localStorage.clear();
});

describe('generic tab overrides dropped between states', () => {
  it('removes the undone inline value and leaves mode pairs to the next apply', () => {
    const { persistTab, history, state } = setup(makeConfig());

    persistTab('theme', () => ({ raw: { gap: '3px' } }));
    expect(inline(GAP)).toBe('3px');
    expect(inline(ALIAS)).toBe('var(--undo-gap)');

    history.undo();
    expect(state()?.tabs?.theme).toBeUndefined();
    expect(inline(GAP)).toBe('');
    expect(inline(ALIAS)).toBe('');
    expect(inline(SURFACE)).toBe('light-dark(#ffffff, #111111)');
    expect(state()).toEqual(initial);

    history.redo();
    expect(inline(GAP)).toBe('3px');
  });

  it('removes the value when the last override is dropped by a commit', () => {
    const { persistTab, commitTweakState, state } = setup(makeConfig());

    persistTab('theme', () => ({ raw: { gap: '3px' } }));
    // Shape of a per-token revert of the last override (`revertEntry`).
    commitTweakState('revert', (prev) => ({ ...prev, tabs: {} }));

    expect(state()?.tabs?.theme).toBeUndefined();
    expect(inline(GAP)).toBe('');
  });

  it('routes the clear through the apply sink', () => {
    const sink: ApplySink = { apply: vi.fn(), clear: vi.fn() };
    const { persistTab, history } = setup(makeConfig(sink));

    persistTab('theme', () => ({ raw: { gap: '3px' } }));
    vi.mocked(sink.clear).mockClear();
    history.undo();

    expect(vi.mocked(sink.clear).mock.calls.flat(2)).toEqual(expect.arrayContaining([GAP, ALIAS]));
    expect(vi.mocked(sink.clear).mock.calls.flat(2)).not.toContain(SURFACE);
  });

  it('keeps an unrelated host declaration when the tab was never stored', () => {
    document.documentElement.style.setProperty(GAP, '7px');
    const { persistTab } = setup(makeConfig());

    persistTab('other', () => ({ raw: { x: '1px' } }));

    expect(inline(GAP)).toBe('7px');
  });
});
