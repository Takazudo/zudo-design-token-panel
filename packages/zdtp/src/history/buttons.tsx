import { useMemo } from 'preact/hooks';

import { RoleButton } from '../controls/role-button';
import type { TweakHistorySnapshot } from '../state/history';
import { useRegisterRegionItem, type ShellRegionItem } from '../shell/regions';
import { useShortcut } from '../shell/shortcut-dispatcher';

function UndoIcon({ redo = false }: { redo?: boolean }) {
  return (
    <svg
      className="tokenpanel-history-icon"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {redo ? (
        <>
          <path d="M21 7v6h-6" />
          <path d="M3 17a9 9 0 0 1 15-6.7L21 13" />
        </>
      ) : (
        <>
          <path d="M3 7v6h6" />
          <path d="M21 17a9 9 0 0 0-15-6.7L3 13" />
        </>
      )}
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg
      className="tokenpanel-history-icon"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export interface HistoryButtonProps {
  canUndo: boolean;
  onUndo: () => void;
}

/** Undo control shared by the header cluster and the mini pill slot. */
export function HistoryUndoButton({ canUndo, onUndo }: HistoryButtonProps) {
  return (
    <RoleButton
      className={`tokenpanel-history-button${canUndo ? '' : ' is-disabled'}`}
      onClick={() => onUndo()}
      aria-disabled={!canUndo}
      aria-label="Undo"
      title="Undo (⌘Z / Ctrl+Z)"
    >
      <UndoIcon />
    </RoleButton>
  );
}

export function HistoryRedoButton({ canRedo, onRedo }: { canRedo: boolean; onRedo: () => void }) {
  return (
    <RoleButton
      className={`tokenpanel-history-button${canRedo ? '' : ' is-disabled'}`}
      onClick={() => onRedo()}
      aria-disabled={!canRedo}
      aria-label="Redo"
      title="Redo (⌘⇧Z / Ctrl+Shift+Z / Ctrl+Y)"
    >
      <UndoIcon redo />
    </RoleButton>
  );
}

export interface HistoryButtonsProps {
  history: TweakHistorySnapshot;
  railOpen: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onToggleRail: () => void;
}

/** Register the header right-cluster undo/redo/count/rail controls through S18. */
export function HistoryButtons({
  history,
  railOpen,
  onUndo,
  onRedo,
  onToggleRail,
}: HistoryButtonsProps) {
  const item = useMemo<ShellRegionItem>(
    () => ({
      id: 'history-controls',
      order: -3,
      render: () => (
        <div className="tokenpanel-history-controls" role="group" aria-label="History controls">
          <HistoryUndoButton canUndo={history.canUndo} onUndo={onUndo} />
          <HistoryRedoButton canRedo={history.canRedo} onRedo={onRedo} />
          <span className="tokenpanel-history-count" aria-label="History position">
            {history.entries.length > 0 ? `${history.cursor}/${history.entries.length}` : '0/0'}
          </span>
          <RoleButton
            className={`tokenpanel-history-toggle${railOpen ? ' is-active' : ''}`}
            onClick={() => onToggleRail()}
            aria-label="History rail"
            title="Toggle history rail"
            ariaProps={{ 'aria-expanded': railOpen }}
          >
            <HistoryIcon />
          </RoleButton>
        </div>
      ),
    }),
    [history, onRedo, onToggleRail, onUndo, railOpen],
  );

  useRegisterRegionItem('header-right', item);
  return null;
}

function isEditableTarget(event: KeyboardEvent): boolean {
  const target = event.target;
  return target instanceof Element && Boolean(
    target.closest(
      'input, textarea, select, [contenteditable=""], [contenteditable="true"], [contenteditable="plaintext-only"]',
    ),
  );
}

export interface HistoryShortcutsProps {
  enabled: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onFlipSnapshots: () => void;
}

/** Register keyboard commands with S18's active-shell dispatcher. */
export function HistoryShortcuts({
  enabled,
  onUndo,
  onRedo,
  onFlipSnapshots,
}: HistoryShortcutsProps) {
  useShortcut(
    {
      key: ['z', 'Z'],
      when: (event) =>
        !event.altKey &&
        !event.shiftKey &&
        (event.metaKey || event.ctrlKey),
    },
    (event) => {
      event.preventDefault();
      onUndo();
    },
    enabled,
  );
  useShortcut(
    {
      key: ['z', 'Z'],
      when: (event) =>
        !event.altKey &&
        event.shiftKey &&
        (event.metaKey || event.ctrlKey),
    },
    (event) => {
      event.preventDefault();
      onRedo();
    },
    enabled,
  );
  useShortcut(
    {
      key: ['y', 'Y'],
      when: (event) =>
        !event.altKey &&
        !event.metaKey &&
        !event.shiftKey &&
        event.ctrlKey,
    },
    (event) => {
      event.preventDefault();
      onRedo();
    },
    enabled,
  );
  useShortcut(
    {
      key: '\\',
      when: (event) =>
        !event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.shiftKey &&
        !isEditableTarget(event),
    },
    (event) => {
      event.preventDefault();
      onFlipSnapshots();
    },
    enabled,
  );

  return null;
}
