// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';
import type { PanelConfig } from '../config/panel-config';
import {
  storageKey_dock,
  storageKey_dockSize,
  storageKey_lastApplied,
  storageKey_snapshotA,
  storageKey_snapshotB,
  storageKey_specimen,
} from '../config/panel-config';
import { loadLastApplied, saveLastApplied } from '../apply/last-applied';
import { loadSnapshot, saveSnapshot, type TweakSnapshot } from '../history/snapshots';
import {
  DEFAULT_SPECIMEN_STATE,
  loadSpecimenState,
  saveSpecimenState,
} from '../specimen/specimen-state';
import {
  loadDockMode,
  loadDockSize,
  saveDockMode,
  saveDockSize,
  type TweakState,
} from '../state/tweak-state';

function config(storagePrefix: string): PanelConfig {
  return {
    storagePrefix,
    consoleNamespace: storagePrefix,
    modalClassPrefix: `${storagePrefix}-modal`,
    schemaId: `${storagePrefix}/v1`,
    exportFilenameBase: storagePrefix,
    tabs: [],
  };
}

function state(spacing: string): TweakState {
  return {
    color: {
      palette: ['#111111'],
      background: 0,
      foreground: 0,
      cursor: 0,
      selectionBg: 0,
      selectionFg: 0,
      semanticMappings: {},
      shikiTheme: 'fixture',
    },
    spacing: { gap: spacing },
    typography: {},
    size: {},
  };
}

describe('Wave-3 two-instance persisted feature isolation', () => {
  beforeEach(() => localStorage.clear());

  it('keeps dock, snapshots, specimen text, and last-applied baselines under each instance prefix', () => {
    const alpha = config('wave3-alpha');
    const beta = config('wave3-beta');
    const alphaSnapshot: TweakSnapshot = {
      state: state('12px'),
      identity: 'light',
      savedAt: 100,
      edits: 1,
    };
    const betaSnapshot: TweakSnapshot = {
      state: state('24px'),
      identity: 'dark',
      savedAt: 200,
      edits: 2,
    };

    saveDockMode('right', alpha);
    saveDockSize({ right: 512, bottom: 360 }, alpha);
    saveSnapshot('A', alphaSnapshot, alpha);
    saveSpecimenState(alpha, {
      text: 'Alpha specimen',
      preset: 'latin',
      overridden: true,
      width: 480,
    });
    saveLastApplied({ '--alpha-gap': '12px' }, alpha);

    expect(loadDockMode(beta)).toBe('float');
    expect(loadDockSize(beta)).toEqual({ right: 440, bottom: 340 });
    expect(loadSnapshot('A', beta)).toBeNull();
    expect(loadSpecimenState(beta)).toEqual(DEFAULT_SPECIMEN_STATE);
    expect(loadLastApplied(beta)).toEqual({});

    saveDockMode('bottom', beta);
    saveDockSize({ right: 420, bottom: 410 }, beta);
    saveSnapshot('B', betaSnapshot, beta);
    saveSpecimenState(beta, {
      text: 'ベータ標本',
      preset: 'ja',
      overridden: true,
      width: 620,
    });
    saveLastApplied({ '--beta-gap': '24px' }, beta);

    expect(loadDockMode(alpha)).toBe('right');
    expect(loadDockSize(alpha)).toEqual({ right: 512, bottom: 360 });
    expect(loadSnapshot('A', alpha)).toEqual(alphaSnapshot);
    expect(loadSnapshot('B', alpha)).toBeNull();
    expect(loadSpecimenState(alpha).text).toBe('Alpha specimen');
    expect(loadLastApplied(alpha)).toEqual({ '--alpha-gap': '12px' });

    expect(loadDockMode(beta)).toBe('bottom');
    expect(loadDockSize(beta)).toEqual({ right: 420, bottom: 410 });
    expect(loadSnapshot('A', beta)).toBeNull();
    expect(loadSnapshot('B', beta)).toEqual(betaSnapshot);
    expect(loadSpecimenState(beta).text).toBe('ベータ標本');
    expect(loadLastApplied(beta)).toEqual({ '--beta-gap': '24px' });

    const alphaKeys = [
      storageKey_dock(alpha),
      storageKey_dockSize(alpha),
      storageKey_snapshotA(alpha),
      storageKey_specimen(alpha),
      storageKey_lastApplied(alpha),
    ];
    const betaKeys = [
      storageKey_dock(beta),
      storageKey_dockSize(beta),
      storageKey_snapshotB(beta),
      storageKey_specimen(beta),
      storageKey_lastApplied(beta),
    ];
    expect(alphaKeys.every((key) => localStorage.getItem(key) !== null)).toBe(true);
    expect(betaKeys.every((key) => localStorage.getItem(key) !== null)).toBe(true);
    expect(localStorage.getItem(storageKey_snapshotB(alpha))).toBeNull();
    expect(localStorage.getItem(storageKey_snapshotA(beta))).toBeNull();
  });
});
