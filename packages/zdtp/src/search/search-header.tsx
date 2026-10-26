/** @jsxImportSource @takazudo/zfb/zudo-react */
import type { ReadonlySignal } from '@takazudo/zfb/zudo-react';
import { RoleButton } from '../controls/role-button';
import { TextInput } from '../zr/form-controls';
import { useShortcut, type ShortcutDispatcher } from '../shell/shortcut-dispatcher';

export interface SearchHeaderProps {
  query: ReadonlySignal<string>;
  onQueryChange: (query: string) => void;
  onOpenPalette: () => void;
  shortcuts: ShortcutDispatcher;
  layerActive: ReadonlySignal<boolean>;
}

function isEditableTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest(
    'input, textarea, select, [contenteditable=""], [contenteditable="true"], [contenteditable="plaintext-only"]',
  ));
}

/** Header-region search control. The compact affordance opens the palette. */
export function SearchHeader({ query, onQueryChange, onOpenPalette, shortcuts, layerActive }: SearchHeaderProps) {
  const control: { current: HTMLDivElement | null } = { current: null };
  const input = () => control.current?.querySelector<HTMLInputElement>('.tokenpanel-search-input') ?? null;
  const openPalette = () => {
    if (!layerActive.value) onOpenPalette();
  };

  useShortcut(
    shortcuts,
    {
      key: '/',
      when: (event) => !layerActive.value && !isEditableTarget(event.target),
    },
    (event) => {
      event.preventDefault();
      const element = input();
      if (!element || getComputedStyle(element).display === 'none') {
        onOpenPalette();
      } else {
        element.focus();
      }
    },
  );

  return (
    <div ref={control} class="tokenpanel-search-control">
      <span class="tokenpanel-search-glyph" aria-hidden="true">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-4.3-4.3" />
        </svg>
      </span>
      <TextInput
        value={query}
        class="tokenpanel-search-input"
        attrs={{ placeholder: 'Filter tokens…', 'aria-label': 'Filter tokens' }}
        onInput={onQueryChange}
        onKeyDown={(event) => {
          if (event.key !== 'Escape') return;
          event.preventDefault();
          onQueryChange('');
          input()?.blur();
        }}
      />
      <span class="tokenpanel-search-key" aria-hidden="true">/</span>
      <RoleButton
        class="tokenpanel-search-compact-btn"
        aria-label="Search tokens"
        title="Search tokens (⌘K / Ctrl+K)"
        onClick={openPalette}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-4.3-4.3" />
        </svg>
      </RoleButton>
    </div>
  );
}
