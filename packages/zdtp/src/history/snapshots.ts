import { useCallback, useState } from 'preact/hooks';

import {
  storageKey_snapshot,
  storageKey_snapshotA,
  storageKey_snapshotB,
  type PanelConfig,
} from '../config/panel-config';
import type { TweakState } from '../state/tweak-state';

export type SnapshotSlot = 'A' | 'B';

export interface TweakSnapshot {
  state: TweakState;
  identity: string;
  savedAt: number;
  edits: number;
}

export interface SnapshotSlots {
  A: TweakSnapshot | null;
  B: TweakSnapshot | null;
}

export interface SnapshotRestoreResult {
  state: TweakState;
  skippedReason?: string;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function getStorage(storage?: StorageLike): StorageLike | null {
  if (storage) return storage;
  try {
    return typeof globalThis.localStorage === 'undefined' ? null : globalThis.localStorage;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isColorState(value: unknown): boolean {
  if (!isRecord(value) || !Array.isArray(value.palette)) return false;
  return (
    value.palette.every((entry) => typeof entry === 'string') &&
    typeof value.background === 'number' &&
    Number.isFinite(value.background) &&
    typeof value.foreground === 'number' &&
    Number.isFinite(value.foreground) &&
    typeof value.cursor === 'number' &&
    Number.isFinite(value.cursor) &&
    typeof value.selectionBg === 'number' &&
    Number.isFinite(value.selectionBg) &&
    typeof value.selectionFg === 'number' &&
    Number.isFinite(value.selectionFg) &&
    isRecord(value.semanticMappings) &&
    typeof value.shikiTheme === 'string'
  );
}

/**
 * Snapshot payloads are user-editable localStorage data. Keep malformed blobs
 * from reaching the apply pipeline while allowing additive state slices to
 * round-trip as the runtime model evolves.
 */
export function isSnapshotState(value: unknown): value is TweakState {
  if (!isRecord(value) || !isColorState(value.color)) return false;
  if (!isRecord(value.spacing) || !isRecord(value.typography) || !isRecord(value.size)) {
    return false;
  }
  if (value.secondary !== undefined && !isColorState(value.secondary)) return false;
  if (value.tabs !== undefined && !isRecord(value.tabs)) return false;
  return true;
}

function isSnapshot(value: unknown): value is TweakSnapshot {
  return (
    isRecord(value) &&
    isSnapshotState(value.state) &&
    typeof value.identity === 'string' &&
    typeof value.savedAt === 'number' &&
    Number.isFinite(value.savedAt) &&
    typeof value.edits === 'number' &&
    Number.isFinite(value.edits) &&
    value.edits >= 0
  );
}

function snapshotKey(slot: SnapshotSlot, cfg: PanelConfig): string {
  return storageKey_snapshot(cfg, slot.toLowerCase() as 'a' | 'b');
}

/** Return the exact per-instance storage key for a snapshot slot. */
export function getSnapshotKey(slot: SnapshotSlot, cfg: PanelConfig): string {
  return snapshotKey(slot, cfg);
}

/** Read one validated snapshot. Invalid or unavailable storage is treated as empty. */
export function loadSnapshot(
  slot: SnapshotSlot,
  cfg: PanelConfig,
  storage?: StorageLike,
): TweakSnapshot | null {
  const target = getStorage(storage);
  if (!target) return null;
  try {
    const raw = target.getItem(snapshotKey(slot, cfg));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isSnapshot(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Read both A/B slots for one panel instance. */
export function loadSnapshots(cfg: PanelConfig, storage?: StorageLike): SnapshotSlots {
  return {
    A: loadSnapshot('A', cfg, storage),
    B: loadSnapshot('B', cfg, storage),
  };
}

/** Persist one snapshot slot under `${storagePrefix}-snapshot-a|b`. */
export function saveSnapshot(
  slot: SnapshotSlot,
  snapshot: TweakSnapshot,
  cfg: PanelConfig,
  storage?: StorageLike,
): void {
  const target = getStorage(storage);
  if (!target) return;
  try {
    target.setItem(snapshotKey(slot, cfg), JSON.stringify(snapshot));
  } catch {
    /* Storage can be full or disabled; snapshots are an optional convenience. */
  }
}

/** Remove one snapshot slot. */
export function removeSnapshot(
  slot: SnapshotSlot,
  cfg: PanelConfig,
  storage?: StorageLike,
): void {
  const target = getStorage(storage);
  if (!target) return;
  try {
    target.removeItem(snapshotKey(slot, cfg));
  } catch {
    /* ignore unavailable storage */
  }
}

/** Remove both persisted snapshot slots for one panel instance. */
export function clearSnapshots(cfg: PanelConfig, storage?: StorageLike): void {
  removeSnapshot('A', cfg, storage);
  removeSnapshot('B', cfg, storage);
}

/**
 * Keep color slices tied to the active scheme/mode identity when restoring an
 * A/B snapshot captured under another identity. Non-color slices remain fully
 * restorable, including host-coined tab overrides.
 */
export function restoreSnapshotState(
  snapshot: TweakSnapshot,
  current: TweakState,
  activeIdentity: string,
  slot?: SnapshotSlot,
): SnapshotRestoreResult {
  if (snapshot.identity === activeIdentity) return { state: snapshot.state };

  const { secondary: _snapshotSecondary, ...snapshotWithoutSecondary } = snapshot.state;
  return {
    state: {
      ...snapshotWithoutSecondary,
      color: current.color,
      ...(current.secondary === undefined ? {} : { secondary: current.secondary }),
    },
    skippedReason:
      `Snapshot${slot ? ` ${slot}` : ''} was saved under inactive color identity ` +
      `"${snapshot.identity}"; color state was kept from "${activeIdentity}".`,
  };
}

/**
 * Reactive per-instance snapshot store used by the panel. Selection itself is
 * intentionally kept by the caller as transient UI state; only A/B payloads
 * are persisted.
 */
export function useSnapshots(cfg: PanelConfig): {
  snapshots: SnapshotSlots;
  save: (slot: SnapshotSlot, state: TweakState, identity: string, edits: number) => TweakSnapshot;
  remove: (slot: SnapshotSlot) => void;
} {
  const [snapshots, setSnapshots] = useState<SnapshotSlots>(() => loadSnapshots(cfg));

  const save = useCallback(
    (slot: SnapshotSlot, state: TweakState, identity: string, edits: number): TweakSnapshot => {
      const snapshot: TweakSnapshot = {
        state,
        identity,
        savedAt: Date.now(),
        edits: Math.max(0, Math.floor(edits)),
      };
      saveSnapshot(slot, snapshot, cfg);
      setSnapshots((current) => ({ ...current, [slot]: snapshot }));
      return snapshot;
    },
    [cfg],
  );

  const remove = useCallback(
    (slot: SnapshotSlot) => {
      removeSnapshot(slot, cfg);
      setSnapshots((current) => ({ ...current, [slot]: null }));
    },
    [cfg],
  );

  return { snapshots, save, remove };
}

// Keep these named imports reachable to downstream callers that historically
// derive keys from the config module rather than the generic slot helper.
export { storageKey_snapshotA, storageKey_snapshotB };
