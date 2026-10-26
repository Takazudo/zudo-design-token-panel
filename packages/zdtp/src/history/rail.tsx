/** @jsxImportSource @takazudo/zfb/zudo-react */
import { computed, type ReadonlySignal } from '@takazudo/zfb/zudo-react';

import { RoleButton } from '../controls/role-button';
import { Rebuild } from '../zr/rebuild';
import type { TweakHistoryEntry, TweakHistorySnapshot } from '../state/history';
import type { SnapshotSlot, SnapshotSlots, TweakSnapshot } from './snapshots';

function relativeTime(timestamp: number): string {
  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  return `${hours}h ago`;
}

function readPath(value: unknown, path: string | undefined): unknown {
  if (!path) return undefined;
  let current: unknown = value;
  for (const segment of path.split('.')) {
    if (typeof current !== 'object' || current === null) return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

function formatValue(value: unknown): string {
  if (value === undefined) return '—';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return 'changed';
  }
}

function formatEntry(entry: TweakHistoryEntry): string {
  const before = formatValue(readPath(entry.before, entry.address));
  const after = formatValue(readPath(entry.after, entry.address));
  return `${before} → ${after} · ${relativeTime(entry.timestamp)}`;
}

function snapshotLabel(snapshot: TweakSnapshot | null): string {
  if (!snapshot) return 'empty';
  const editLabel = snapshot.edits === 1 ? 'edit' : 'edits';
  return `${snapshot.edits} ${editLabel} · saved ${relativeTime(snapshot.savedAt)}`;
}

function CameraIcon() {
  return (
    <svg
      class="tokenpanel-history-icon"
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  );
}

export interface HistoryRailProps {
  history: ReadonlySignal<TweakHistorySnapshot>;
  snapshots: ReadonlySignal<SnapshotSlots>;
  selectedSnapshot: ReadonlySignal<SnapshotSlot | null>;
  notice: ReadonlySignal<string | null | undefined>;
  activeIdentity: ReadonlySignal<string>;
  onSaveSnapshot: (slot: SnapshotSlot) => void;
  onSelectSnapshot: (slot: SnapshotSlot) => void;
  onJumpTo: (index: number) => void;
}

function SnapshotRow({
  slot,
  snapshot,
  selected,
  onSave,
  onSelect,
}: {
  slot: SnapshotSlot;
  snapshot: ReadonlySignal<TweakSnapshot | null>;
  selected: ReadonlySignal<boolean>;
  onSave: () => void;
  onSelect: () => void;
}) {
  return (
    <div class="tokenpanel-snapshot-row">
      <RoleButton
        class={computed(() => `tokenpanel-snapshot-tag${selected.value ? ' is-selected' : ''}`)}
        onClick={() => onSelect()}
        aria-disabled={computed(() => (snapshot.value ? null : true))}
        aria-label={computed(() => (snapshot.value ? `Show snapshot ${slot}` : `Snapshot ${slot} is empty`))}
        ariaProps={{ 'aria-pressed': selected }}
      >
        {slot}
      </RoleButton>
      <span class="tokenpanel-snapshot-meta">{computed(() => snapshotLabel(snapshot.value))}</span>
      <RoleButton
        class="tokenpanel-snapshot-save"
        onClick={() => onSave()}
        aria-label={computed(() => (snapshot.value ? `Overwrite snapshot ${slot}` : `Save snapshot ${slot}`))}
      >
        {computed(() => (snapshot.value ? 'Overwrite' : `Save ${slot}`))}
      </RoleButton>
    </div>
  );
}

function HistoryEntries({
  history,
  activeIdentity,
  onJumpTo,
}: {
  history: TweakHistorySnapshot;
  activeIdentity: string;
  onJumpTo: (index: number) => void;
}) {
  const currentIndex = history.cursor - 1;
  return [
    history.entries.length === 0
      ? <div class="tokenpanel-history-empty">Edit a token to start a history.</div>
      : null,
    ...history.entries
      .map((entry, index) => ({ entry, index }))
      .reverse()
      .map(({ entry, index }) => {
        const isCurrent = index === currentIndex;
        const isFuture = index >= history.cursor;
        const identityMismatch = entry.identity !== activeIdentity;
        return (
          <RoleButton
            class={`tokenpanel-history-entry${isCurrent ? ' is-current' : ''}${isFuture ? ' is-future' : ''}`}
            onClick={() => onJumpTo(index)}
            aria-label={`${entry.reason}${entry.address ? ` ${entry.address}` : ''}`}
            ariaProps={{ 'aria-current': isCurrent ? 'step' : null }}
          >
            <span class="tokenpanel-history-entry-address">
              {entry.address ?? entry.reason}
            </span>
            <span class="tokenpanel-history-entry-reason">
              {`${entry.reason}${identityMismatch ? ` · inactive identity "${entry.identity}"` : ''}`}
            </span>
            <span class="tokenpanel-history-entry-detail">{formatEntry(entry)}</span>
          </RoleButton>
        );
      }),
    history.entries.length > 0 ? (
      <RoleButton
        class={`tokenpanel-history-entry tokenpanel-history-start${history.cursor === 0 ? ' is-current' : ''}`}
        onClick={() => onJumpTo(-1)}
        aria-label="Manifest defaults (start)"
        ariaProps={{ 'aria-current': history.cursor === 0 ? 'step' : null }}
      >
        <span class="tokenpanel-history-entry-detail">● manifest defaults (start)</span>
      </RoleButton>
    ) : null,
  ];
}

export function HistoryRail({
  history,
  snapshots,
  selectedSnapshot,
  notice,
  activeIdentity,
  onSaveSnapshot,
  onSelectSnapshot,
  onJumpTo,
}: HistoryRailProps) {
  const entriesView = computed(() => ({ history: history.value, identity: activeIdentity.value }));
  let lastView: { history: TweakHistorySnapshot; identity: string } | null = null;
  const stableView = computed(() => {
    const next = entriesView.value;
    if (lastView && lastView.history === next.history && lastView.identity === next.identity) return lastView;
    lastView = next;
    return next;
  });
  const noticeText = computed(() => notice.value ?? null);
  return (
    <div
      class="tokenpanel-history-rail"
      data-testid="tokenpanel-history-rail"
      aria-label="History and snapshots"
    >
      <div class="tokenpanel-history-rail-heading" role="heading" aria-level={3}>
        <CameraIcon />
        <span>Snapshots</span>
      </div>
      <div class="tokenpanel-snapshots">
        {(['A', 'B'] as const).map((slot) => (
          <SnapshotRow
            slot={slot}
            snapshot={computed(() => snapshots.value[slot])}
            selected={computed(() => selectedSnapshot.value === slot)}
            onSave={() => onSaveSnapshot(slot)}
            onSelect={() => onSelectSnapshot(slot)}
          />
        ))}
        <div class="tokenpanel-snapshot-compare">
          <span class="tokenpanel-snapshot-compare-label">Compare on page</span>
          <div
            class="tokenpanel-snapshot-segmented"
            role="group"
            aria-label="Compare snapshots"
          >
            {(['A', 'B'] as const).map((slot) => {
              const available = computed(() => snapshots.value[slot] !== null);
              return (
                <RoleButton
                  class={computed(() => (selectedSnapshot.value === slot ? 'is-selected' : ''))}
                  onClick={() => onSelectSnapshot(slot)}
                  aria-disabled={computed(() => (available.value ? null : true))}
                  aria-label={computed(() => (available.value ? `Compare snapshot ${slot}` : `Snapshot ${slot} is empty`))}
                  ariaProps={{ 'aria-pressed': computed(() => selectedSnapshot.value === slot) }}
                >
                  {slot}
                </RoleButton>
              );
            })}
          </div>
          <span class="tokenpanel-snapshot-flip-hint" aria-label="Flip snapshots shortcut">
            \
          </span>
        </div>
      </div>

      <Rebuild value={noticeText}>
        {(text) => (text ? <div class="tokenpanel-history-notice" role="status">{text}</div> : null)}
      </Rebuild>

      <div class="tokenpanel-history-heading">
        <span role="heading" aria-level={3}>History</span>
        <span class="tokenpanel-history-heading-count">
          {computed(() => {
            const count = history.value.entries.length;
            return count > 0 ? `${count} ${count === 1 ? 'edit' : 'edits'}` : 'no edits yet';
          })}
        </span>
      </div>
      <div class="tokenpanel-history-list">
        <Rebuild value={stableView}>
          {(view) => (
            <HistoryEntries history={view.history} activeIdentity={view.identity} onJumpTo={onJumpTo} />
          )}
        </Rebuild>
      </div>
    </div>
  );
}
