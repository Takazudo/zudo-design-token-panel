// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  __claimSpawnSlotForTests,
  __mountedSpawnSlotsForTests,
  __resetSpawnSlotsForTests,
} from '../index';
import { storageKey_spawnOrdinal, type PanelConfig } from '../config/panel-config';
import { clearPersistedState } from '../state/tweak-state';

const MAX_PERSISTED_SPAWN_ORDINAL = 31;

function makeConfig(prefix: string): PanelConfig {
  return {
    storagePrefix: prefix,
    consoleNamespace: prefix,
    modalClassPrefix: `${prefix}-modal`,
    schemaId: `${prefix}/v1`,
    exportFilenameBase: prefix,
    tabs: [],
  };
}

function slotOf(cfg: PanelConfig): number | undefined {
  return __mountedSpawnSlotsForTests().get(cfg.storagePrefix);
}

describe('persisted spawn ordinal (#596)', () => {
  beforeEach(() => {
    __resetSpawnSlotsForTests();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    __resetSpawnSlotsForTests();
    localStorage.clear();
  });

  it('keeps absent-key allocation identical to mount order with lowest-free reuse', () => {
    const cfgA = makeConfig('persist-absent-a');
    const cfgB = makeConfig('persist-absent-b');
    const cfgC = makeConfig('persist-absent-c');

    expect(__claimSpawnSlotForTests(cfgB)).toBe(0);
    expect(__claimSpawnSlotForTests(cfgA)).toBe(1);
    expect(__claimSpawnSlotForTests(cfgC)).toBe(2);
  });

  it('restores a valid persisted ordinal when that live slot is free', () => {
    const cfg = makeConfig('persist-valid');
    localStorage.setItem(storageKey_spawnOrdinal(cfg), JSON.stringify(7));

    expect(__claimSpawnSlotForTests(cfg)).toBe(7);
    expect(slotOf(cfg)).toBe(7);
  });

  it('accepts the documented upper cap', () => {
    const cfg = makeConfig('persist-valid-cap');
    localStorage.setItem(
      storageKey_spawnOrdinal(cfg),
      JSON.stringify(MAX_PERSISTED_SPAWN_ORDINAL),
    );

    expect(__claimSpawnSlotForTests(cfg)).toBe(MAX_PERSISTED_SPAWN_ORDINAL);
  });

  it.each([
    ['not a number', JSON.stringify('7')],
    ['negative', JSON.stringify(-1)],
    ['non-integer', JSON.stringify(1.5)],
    ['above the cap', JSON.stringify(MAX_PERSISTED_SPAWN_ORDINAL + 1)],
    ['unparseable', '{'],
  ])('falls back without throwing for a %s stored value', (label, raw) => {
    const cfg = makeConfig(`persist-invalid-${label.replaceAll(' ', '-')}`);
    localStorage.setItem(storageKey_spawnOrdinal(cfg), raw);

    expect(() => __claimSpawnSlotForTests(cfg)).not.toThrow();
    expect(slotOf(cfg)).toBe(0);
    expect(localStorage.getItem(storageKey_spawnOrdinal(cfg))).toBe('0');
  });

  it('falls back without throwing when storage getItem throws', () => {
    const cfg = makeConfig('persist-storage-throws');
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });

    expect(() => __claimSpawnSlotForTests(cfg)).not.toThrow();
    expect(slotOf(cfg)).toBe(0);
  });

  it('still mounts in memory when storage setItem throws', () => {
    const cfg = makeConfig('persist-storage-write-throws');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });

    expect(() => __claimSpawnSlotForTests(cfg)).not.toThrow();
    expect(slotOf(cfg)).toBe(0);
  });

  it('lets the already-live collision holder win and heals the later claimant', () => {
    const first = makeConfig('persist-collision-first');
    const later = makeConfig('persist-collision-later');
    localStorage.setItem(storageKey_spawnOrdinal(first), '4');
    localStorage.setItem(storageKey_spawnOrdinal(later), '4');

    expect(__claimSpawnSlotForTests(first)).toBe(4);
    expect(__claimSpawnSlotForTests(later)).toBe(0);
    expect(slotOf(first)).toBe(4);
    expect(slotOf(later)).toBe(0);
    expect(localStorage.getItem(storageKey_spawnOrdinal(first))).toBe('4');
    expect(localStorage.getItem(storageKey_spawnOrdinal(later))).toBe('0');

    __resetSpawnSlotsForTests();
    expect(__claimSpawnSlotForTests(later), 'repaired identity survives reload').toBe(0);
    expect(__claimSpawnSlotForTests(first), 'original holder keeps its identity').toBe(4);
  });

  it('does not let a departed prefix stored on disk reserve a live slot', () => {
    const departed = makeConfig('persist-departed');
    const newcomer = makeConfig('persist-newcomer');
    expect(__claimSpawnSlotForTests(departed)).toBe(0);

    // Clearing the live registry models releaseSpawnSlot: the retained key is
    // intentionally not a reservation by itself.
    __resetSpawnSlotsForTests();
    expect(localStorage.getItem(storageKey_spawnOrdinal(departed))).toBe('0');
    expect(__claimSpawnSlotForTests(newcomer)).toBe(0);
  });

  it('retains instance identity when user tweak state is reset', () => {
    const cfg = makeConfig('persist-reset-retains');
    localStorage.setItem(storageKey_spawnOrdinal(cfg), '3');

    clearPersistedState(localStorage, cfg);

    expect(localStorage.getItem(storageKey_spawnOrdinal(cfg))).toBe('3');
  });
});
