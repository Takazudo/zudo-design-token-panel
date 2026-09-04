import { describe, expect, it } from 'vitest';

import type { PanelConfig } from '../../config/panel-config';
import {
  getSnapshotKey,
  loadSnapshot,
  loadSnapshots,
  restoreSnapshotState,
  saveSnapshot,
  type StorageLike,
  type TweakSnapshot,
} from '../snapshots';
import type { TweakState } from '../../state/tweak-state';

const cfg: PanelConfig = {
  storagePrefix: 'history-fixture',
  consoleNamespace: 'fixture',
  modalClassPrefix: 'fixture-modal',
  schemaId: 'fixture/v1',
  exportFilenameBase: 'fixture',
  tabs: [],
};

const state = (spacing: string, color = '#111'): TweakState => ({
  color: {
    palette: [color],
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
});
class MemoryStorage implements StorageLike {
  private values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

function snapshot(value: TweakState, identity = 'light', edits = 1): TweakSnapshot {
  return { state: value, identity, savedAt: 100, edits };
}

describe('history snapshots', () => {
  it('uses a separate, per-instance A/B key and round-trips both slots', () => {
    const storage = new MemoryStorage();
    const a = snapshot(state('1px'));
    const b = snapshot(state('2px'), 'dark', 2);
    saveSnapshot('A', a, cfg, storage);
    saveSnapshot('B', b, cfg, storage);

    expect(getSnapshotKey('A', cfg)).toBe('history-fixture-snapshot-a');
    expect(getSnapshotKey('B', cfg)).toBe('history-fixture-snapshot-b');
    expect(loadSnapshots(cfg, storage)).toEqual({ A: a, B: b });
    expect(loadSnapshot('A', { ...cfg, storagePrefix: 'other' }, storage)).toBeNull();
  });

  it('ignores malformed snapshot payloads', () => {
    const storage = new MemoryStorage();
    storage.setItem(getSnapshotKey('A', cfg), JSON.stringify({ state: {}, identity: 'x' }));
    expect(loadSnapshot('A', cfg, storage)).toBeNull();
  });

  it('restores non-color slices while retaining current colors for another identity', () => {
    const current = state('current', '#dark');
    const saved = snapshot(state('saved', '#light'), 'light');
    const restored = restoreSnapshotState(saved, current, 'dark', 'B');

    expect(restored.state.spacing.gap).toBe('saved');
    expect(restored.state.color).toBe(current.color);
    expect(restored.skippedReason).toContain('Snapshot B');
    expect(restored.skippedReason).toContain('inactive color identity');
  });

  it('restores colors when identities match', () => {
    const current = state('current', '#dark');
    const saved = snapshot(state('saved', '#dark'), 'dark');
    const restored = restoreSnapshotState(saved, current, 'dark', 'A');

    expect(restored.state).toBe(saved.state);
    expect(restored.skippedReason).toBeUndefined();
  });
});
