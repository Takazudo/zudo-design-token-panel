import { useRef } from 'preact/compat';
import { RoleButton } from '../controls/role-button';
import { useLayerActivity } from '../shell/layer-activity';
import { useShortcut } from '../shell/shortcut-dispatcher';

export interface SearchHeaderProps {
  query: string;
  onQueryChange: (query: string) => void;
  onOpenPalette: () => void;
}

function isEditableTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest(
    'input, textarea, select, [contenteditable=""], [contenteditable="true"], [contenteditable="plaintext-only"]',
  ));
}

/** Header-region search control. The compact affordance opens the palette. */
export function SearchHeader({ query, onQueryChange, onOpenPalette }: SearchHeaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const layerActive = useLayerActivity();
  const openPalette = () => {
    if (!layerActive) onOpenPalette();
  };

  useShortcut(
    {
      key: '/',
      when: (event) => !layerActive && !isEditableTarget(event.target),
    },
    (event) => {
      event.preventDefault();
      const input = inputRef.current;
      if (!input || getComputedStyle(input).display === 'none') {
        onOpenPalette();
      } else {
        input.focus();
      }
    },
  );

  return (
    <div className="tokenpanel-search-control">
      <span className="tokenpanel-search-glyph" aria-hidden="true">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-4.3-4.3" />
        </svg>
      </span>
      <input
        ref={inputRef}
        value={query}
        placeholder="Filter tokens…"
        aria-label="Filter tokens"
        className="tokenpanel-search-input"
        onInput={(event) => onQueryChange(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key !== 'Escape') return;
          event.preventDefault();
          onQueryChange('');
          inputRef.current?.blur();
        }}
      />
      <span className="tokenpanel-search-key" aria-hidden="true">/</span>
      <RoleButton
        className="tokenpanel-search-compact-btn"
        aria-label="Search tokens"
        title="Search tokens (⌘K / Ctrl+K)"
        onClick={openPalette}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-4.3-4.3" />
        </svg>
      </RoleButton>
    </div>
  );
}
