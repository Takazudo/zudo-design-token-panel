import { useEffect, useState } from 'preact/hooks';

import type { TweakState } from './tweak-state';
import { structuralEqual } from '../utils/structural-equal';

export const HISTORY_LIMIT = 100;
export const HISTORY_COALESCE_MS = 500;

export interface TweakHistoryEntry {
  reason: string;
  address?: string;
  identity: string;
  before: TweakState;
  after: TweakState;
  timestamp: number;
}

export interface HistoryRestoreResult {
  entry: TweakHistoryEntry | null;
  skippedReason?: string;
}

export interface TweakHistorySnapshot {
  entries: readonly TweakHistoryEntry[];
  cursor: number;
  canUndo: boolean;
  canRedo: boolean;
  lastSkippedReason: string | null;
}

type Restore = (state: TweakState) => void;

function nonColorState(state: TweakState): Omit<TweakState, 'color' | 'secondary'> {
  const { color: _color, secondary: _secondary, ...rest } = state;
  return rest;
}

/** In-memory, identity-aware history for one mounted panel instance. */
export class TweakHistory {
  private items: TweakHistoryEntry[] = [];
  private cursor = 0;
  private restore: Restore = () => {};
  private getCurrentState: () => TweakState | null = () => null;
  private getIdentity: () => string = () => '';
  private listeners = new Set<() => void>();
  private lastSkippedReason: string | null = null;

  configure(options: {
    restore: Restore;
    getCurrentState: () => TweakState | null;
    getIdentity: () => string;
  }): void {
    this.restore = options.restore;
    this.getCurrentState = options.getCurrentState;
    this.getIdentity = options.getIdentity;
  }

  getSnapshot(): TweakHistorySnapshot {
    return {
      entries: this.items,
      cursor: this.cursor,
      canUndo: this.cursor > 0,
      canRedo: this.cursor < this.items.length,
      lastSkippedReason: this.lastSkippedReason,
    };
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  clear(): void {
    this.items = [];
    this.cursor = 0;
    this.lastSkippedReason = null;
    this.emit();
  }

  record(entry: TweakHistoryEntry, options: { reset?: boolean; force?: boolean } = {}): void {
    if (!options.force && structuralEqual(entry.before, entry.after)) return;
    if (options.reset) {
      this.items = [];
      this.cursor = 0;
    } else if (this.cursor < this.items.length) {
      this.items = this.items.slice(0, this.cursor);
    }

    const previous = this.items.at(-1);
    if (
      entry.address !== undefined &&
      previous?.address === entry.address &&
      previous.identity === entry.identity &&
      entry.timestamp - previous.timestamp <= HISTORY_COALESCE_MS
    ) {
      this.items = [
        ...this.items.slice(0, -1),
        { ...previous, reason: entry.reason, after: entry.after, timestamp: entry.timestamp },
      ];
    } else {
      this.items = [...this.items, entry];
      if (this.items.length > HISTORY_LIMIT) this.items = this.items.slice(-HISTORY_LIMIT);
    }
    this.cursor = this.items.length;
    this.lastSkippedReason = null;
    this.emit();
  }

  undo(): HistoryRestoreResult {
    let skippedReason: string | undefined;
    while (this.cursor > 0) {
      const entry = this.items[this.cursor - 1];
      this.cursor -= 1;
      const result = this.restoreEntry(entry, entry.before);
      skippedReason ??= result.skippedReason;
      if (result.entry) return { ...result, skippedReason };
    }
    this.emit();
    return { entry: null, skippedReason: skippedReason ?? this.lastSkippedReason ?? undefined };
  }

  redo(): HistoryRestoreResult {
    let skippedReason: string | undefined;
    while (this.cursor < this.items.length) {
      const entry = this.items[this.cursor];
      this.cursor += 1;
      const result = this.restoreEntry(entry, entry.after);
      skippedReason ??= result.skippedReason;
      if (result.entry) return { ...result, skippedReason };
    }
    this.emit();
    return { entry: null, skippedReason: skippedReason ?? this.lastSkippedReason ?? undefined };
  }

  /** Restore the state after entry `index`; `-1` means the pre-history state. */
  jumpTo(index: number): HistoryRestoreResult {
    if (this.items.length === 0) return { entry: null };
    const targetCursor = Math.max(0, Math.min(index + 1, this.items.length));
    if (targetCursor === this.cursor) return { entry: null };
    const entry = targetCursor === 0 ? this.items[0] : this.items[targetCursor - 1];
    const target = targetCursor === 0 ? entry.before : entry.after;
    this.cursor = targetCursor;
    return this.restoreEntry(entry, target);
  }

  private restoreEntry(entry: TweakHistoryEntry, target: TweakState): HistoryRestoreResult {
    const current = this.getCurrentState();
    if (!current) {
      this.lastSkippedReason = 'History restore skipped because panel state is not initialized.';
      this.emit();
      return { entry: null, skippedReason: this.lastSkippedReason };
    }

    const activeIdentity = this.getIdentity();
    let restored = target;
    let skippedReason: string | undefined;
    if (entry.identity !== activeIdentity) {
      restored = { ...target, color: current.color, secondary: current.secondary };
      skippedReason = `Skipped color state for inactive identity "${entry.identity}".`;
      if (structuralEqual(nonColorState(restored), nonColorState(current))) {
        this.lastSkippedReason = skippedReason;
        this.emit();
        return { entry: null, skippedReason };
      }
    }

    this.restore(restored);
    this.lastSkippedReason = skippedReason ?? null;
    this.emit();
    return { entry, skippedReason };
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}

export function createTweakHistory(): TweakHistory {
  return new TweakHistory();
}

/** Reactive facade consumed by the later history UI. */
export function useHistory(history: TweakHistory) {
  const [snapshot, setSnapshot] = useState<TweakHistorySnapshot>(() => history.getSnapshot());
  useEffect(() => history.subscribe(() => setSnapshot(history.getSnapshot())), [history]);
  return {
    ...snapshot,
    undo: () => history.undo(),
    redo: () => history.redo(),
    jumpTo: (index: number) => history.jumpTo(index),
  };
}
