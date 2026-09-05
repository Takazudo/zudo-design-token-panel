// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';
import type { PanelConfig } from '../../config/panel-config';
import { storageKey_specimen } from '../../config/panel-config';
import {
  DEFAULT_SPECIMEN_STATE,
  SPECIMEN_PRESETS,
  loadSpecimenState,
  saveSpecimenState,
} from '../specimen-state';

const CFG = {
  storagePrefix: 'specimen-test',
  consoleNamespace: 'specimenTest',
  modalClassPrefix: 'specimen-test-modal',
  schemaId: 'specimen-test/v1',
  exportFilenameBase: 'specimen-test',
  tabs: [],
} satisfies PanelConfig;

beforeEach(() => localStorage.clear());

describe('specimen state', () => {
  it('uses the instance-scoped storage key and round-trips custom text', () => {
    const state = { text: '銀河鉄道', preset: 'ja' as const, overridden: true, width: 512 };
    saveSpecimenState(CFG, state);
    expect(storageKey_specimen(CFG)).toBe('specimen-test-specimen');
    expect(loadSpecimenState(CFG)).toEqual(state);
  });

  it('refreshes non-overridden text from its preset and clamps width', () => {
    localStorage.setItem(storageKey_specimen(CFG), JSON.stringify({
      text: 'stale preset copy',
      preset: 'mixed',
      overridden: false,
      width: 999,
    }));
    expect(loadSpecimenState(CFG)).toEqual({
      text: SPECIMEN_PRESETS.mixed,
      preset: 'mixed',
      overridden: false,
      width: 720,
    });
  });

  it('falls back safely for malformed storage', () => {
    localStorage.setItem(storageKey_specimen(CFG), '{bad');
    expect(loadSpecimenState(CFG)).toEqual(DEFAULT_SPECIMEN_STATE);
  });
});
