import { Fragment } from 'preact';

import { RoleButton } from '../controls/role-button';
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
      className="tokenpanel-history-icon"
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  );
}

export interface HistoryRailProps {
  history: TweakHistorySnapshot;
  snapshots: SnapshotSlots;
  selectedSnapshot: SnapshotSlot | null;
  notice?: string | null;
  activeIdentity: string;
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
  snapshot: TweakSnapshot | null;
  selected: boolean;
  onSave: () => void;
  onSelect: () => void;
}) {
  return (
    <div className="tokenpanel-snapshot-row">
      <RoleButton
        className={`tokenpanel-snapshot-tag${selected ? ' is-selected' : ''}`}
        onClick={() => onSelect()}
        aria-disabled={snapshot ? undefined : true}
        aria-label={snapshot ? `Show snapshot ${slot}` : `Snapshot ${slot} is empty`}
        ariaProps={{ 'aria-pressed': selected }}
      >
        {slot}
      </RoleButton>
      <span className="tokenpanel-snapshot-meta">{snapshotLabel(snapshot)}</span>
      <RoleButton
        className="tokenpanel-snapshot-save"
        onClick={() => onSave()}
        aria-label={snapshot ? `Overwrite snapshot ${slot}` : `Save snapshot ${slot}`}
      >
        {snapshot ? 'Overwrite' : `Save ${slot}`}
      </RoleButton>
    </div>
  );
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
  const currentIndex = history.cursor - 1;
  return (
    <div
      className="tokenpanel-history-rail"
      data-testid="tokenpanel-history-rail"
      aria-label="History and snapshots"
    >
      <div className="tokenpanel-history-rail-heading" role="heading" aria-level={3}>
        <CameraIcon />
        <span>Snapshots</span>
      </div>
      <div className="tokenpanel-snapshots">
        <SnapshotRow
          slot="A"
          snapshot={snapshots.A}
          selected={selectedSnapshot === 'A'}
          onSave={() => onSaveSnapshot('A')}
          onSelect={() => onSelectSnapshot('A')}
        />
        <SnapshotRow
          slot="B"
          snapshot={snapshots.B}
          selected={selectedSnapshot === 'B'}
          onSave={() => onSaveSnapshot('B')}
          onSelect={() => onSelectSnapshot('B')}
        />
        <div className="tokenpanel-snapshot-compare">
          <span className="tokenpanel-snapshot-compare-label">Compare on page</span>
          <div
            className="tokenpanel-snapshot-segmented"
            role="group"
            aria-label="Compare snapshots"
          >
            {(['A', 'B'] as const).map((slot) => {
              const available = snapshots[slot] !== null;
              return (
                <RoleButton
                  key={slot}
                  className={selectedSnapshot === slot ? 'is-selected' : ''}
                  onClick={() => onSelectSnapshot(slot)}
                  aria-disabled={available ? undefined : true}
                  aria-label={available ? `Compare snapshot ${slot}` : `Snapshot ${slot} is empty`}
                  ariaProps={{ 'aria-pressed': selectedSnapshot === slot }}
                >
                  {slot}
                </RoleButton>
              );
            })}
          </div>
          <span className="tokenpanel-snapshot-flip-hint" aria-label="Flip snapshots shortcut">
            \
          </span>
        </div>
      </div>

      {notice && (
        <div className="tokenpanel-history-notice" role="status">
          {notice}
        </div>
      )}

      <div className="tokenpanel-history-heading">
        <span role="heading" aria-level={3}>History</span>
        <span className="tokenpanel-history-heading-count">
          {history.entries.length > 0 ? `${history.entries.length} edits` : 'no edits yet'}
        </span>
      </div>
      <div className="tokenpanel-history-list">
        {history.entries.length === 0 && (
          <div className="tokenpanel-history-empty">Edit a token to start a history.</div>
        )}
        {history.entries
          .map((entry, index) => ({ entry, index }))
          .reverse()
          .map(({ entry, index }) => {
            const isCurrent = index === currentIndex;
            const isFuture = index >= history.cursor;
            const identityMismatch = entry.identity !== activeIdentity;
            return (
              <Fragment key={`${entry.timestamp}-${index}`}>
                <RoleButton
                  className={`tokenpanel-history-entry${isCurrent ? ' is-current' : ''}${isFuture ? ' is-future' : ''}`}
                  onClick={() => onJumpTo(index)}
                  aria-label={`${entry.reason}${entry.address ? ` ${entry.address}` : ''}`}
                  ariaProps={{ 'aria-current': isCurrent ? 'step' : undefined }}
                >
                  <span className="tokenpanel-history-entry-address">
                    {entry.address ?? entry.reason}
                  </span>
                  <span className="tokenpanel-history-entry-reason">
                    {entry.reason}
                    {identityMismatch ? ` · inactive identity "${entry.identity}"` : ''}
                  </span>
                  <span className="tokenpanel-history-entry-detail">{formatEntry(entry)}</span>
                </RoleButton>
              </Fragment>
            );
          })}
        {history.entries.length > 0 && (
          <RoleButton
            className={`tokenpanel-history-entry tokenpanel-history-start${history.cursor === 0 ? ' is-current' : ''}`}
            onClick={() => onJumpTo(-1)}
            aria-label="Manifest defaults (start)"
            ariaProps={{ 'aria-current': history.cursor === 0 ? 'step' : undefined }}
          >
            <span className="tokenpanel-history-entry-detail">● manifest defaults (start)</span>
          </RoleButton>
        )}
      </div>
    </div>
  );
}
