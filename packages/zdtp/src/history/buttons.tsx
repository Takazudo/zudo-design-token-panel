/** @jsxImportSource @takazudo/zfb/zudo-react */
import { computed, type ReadonlySignal } from '@takazudo/zfb/zudo-react';

import { RoleButton } from '../controls/role-button';
import type { TweakHistorySnapshot } from '../state/history';
import { useRegisterRegionItem, type ShellRegionItem, type ShellRegions } from '../shell/regions';
import { useShortcut, type ShortcutDispatcher } from '../shell/shortcut-dispatcher';
import { read, type MaybeSignal } from '../zr/live';

function UndoIcon({ redo = false }: { redo?: boolean }) {
  return (
    <svg
      class="tokenpanel-history-icon"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      {redo
        ? [<path d="M21 7v6h-6" />, <path d="M3 17a9 9 0 0 1 15-6.7L21 13" />]
        : [<path d="M3 7v6h6" />, <path d="M21 17a9 9 0 0 0-15-6.7L3 13" />]}
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg
      class="tokenpanel-history-icon"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export interface HistoryButtonProps {
  canUndo: MaybeSignal<boolean>;
  onUndo: () => void;
}

/** Undo control shared by the header cluster and the mini pill slot. */
export function HistoryUndoButton({ canUndo, onUndo }: HistoryButtonProps) {
  return (
    <RoleButton
      class={computed(() => `tokenpanel-history-button${read(canUndo) ? '' : ' is-disabled'}`)}
      onClick={() => onUndo()}
      aria-disabled={computed(() => !read(canUndo))}
      aria-label="Undo"
      title="Undo (⌘Z / Ctrl+Z)"
    >
      <UndoIcon />
    </RoleButton>
  );
}

export function HistoryRedoButton({ canRedo, onRedo }: { canRedo: MaybeSignal<boolean>; onRedo: () => void }) {
  return (
    <RoleButton
      class={computed(() => `tokenpanel-history-button${read(canRedo) ? '' : ' is-disabled'}`)}
      onClick={() => onRedo()}
      aria-disabled={computed(() => !read(canRedo))}
      aria-label="Redo"
      title="Redo (⌘⇧Z / Ctrl+Shift+Z / Ctrl+Y)"
    >
      <UndoIcon redo />
    </RoleButton>
  );
}

export interface HistoryButtonsProps {
  history: ReadonlySignal<TweakHistorySnapshot>;
  railOpen: ReadonlySignal<boolean>;
  onUndo: () => void;
  onRedo: () => void;
  onToggleRail: () => void;
}

/** The header right-cluster undo/redo/count/rail controls, as an S18 region item. */
export function historyRegionItem({
  history,
  railOpen,
  onUndo,
  onRedo,
  onToggleRail,
}: HistoryButtonsProps): ShellRegionItem {
  return {
    id: 'history-controls',
    order: -3,
    renderInCompactMenu: true,
    render: ({ compact, closeCompactMenu }) => {
      const afterCompact = (run: () => void) => () => {
        run();
        if (compact) closeCompactMenu();
      };
      return (
        <div class="tokenpanel-history-controls" role="group" aria-label="History controls">
          <HistoryUndoButton canUndo={computed(() => history.value.canUndo)} onUndo={afterCompact(onUndo)} />
          <HistoryRedoButton canRedo={computed(() => history.value.canRedo)} onRedo={afterCompact(onRedo)} />
          <span class="tokenpanel-history-count" aria-label="History position">
            {computed(() => (history.value.entries.length > 0
              ? `${history.value.cursor}/${history.value.entries.length}`
              : '0/0'))}
          </span>
          <RoleButton
            class={computed(() => `tokenpanel-history-toggle${railOpen.value ? ' is-active' : ''}`)}
            onClick={afterCompact(onToggleRail)}
            aria-label="History rail"
            title="Toggle history rail"
            ariaProps={{ 'aria-expanded': railOpen }}
          >
            <HistoryIcon />
          </RoleButton>
        </div>
      );
    },
  };
}

/** Register the history controls in `regions` for the calling component's lifetime. */
export function HistoryButtons(props: HistoryButtonsProps & { regions: ShellRegions }) {
  useRegisterRegionItem(props.regions, 'header-right', historyRegionItem(props));
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
  shortcuts: ShortcutDispatcher;
  enabled: MaybeSignal<boolean>;
  onUndo: () => void;
  onRedo: () => void;
  onFlipSnapshots: () => void;
}

/** Register keyboard commands with S18's active-shell dispatcher. */
export function useHistoryShortcuts({
  shortcuts,
  enabled,
  onUndo,
  onRedo,
  onFlipSnapshots,
}: HistoryShortcutsProps): void {
  useShortcut(
    shortcuts,
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
    shortcuts,
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
    shortcuts,
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
    shortcuts,
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
}

/** Component form of `useHistoryShortcuts`. */
export function HistoryShortcuts(props: HistoryShortcutsProps) {
  useHistoryShortcuts(props);
  return null;
}
