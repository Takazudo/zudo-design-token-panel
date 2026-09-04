import { useContext } from 'preact/hooks';
import type { JSX } from 'preact';
import { RoleButton } from '../controls/role-button';
import { useShortcut } from '../shell/shortcut-dispatcher';
import { ElementInspectContext } from './element-inspect-context';

/** Header control for the element → tokens picker. */
export function ElementInspectToggleButton(): JSX.Element | null {
  const context = useContext(ElementInspectContext);
  if (context === null) return null;

  const { armed, toggle } = context;
  useShortcut(
    {
      key: 'i',
      when: (event) => {
        if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return false;
        const target = event.target instanceof Element ? event.target : null;
        return !target?.closest(
          'input, textarea, select, [contenteditable=""], [contenteditable="true"], [contenteditable="plaintext-only"]',
        );
      },
    },
    (event) => {
      event.preventDefault();
      toggle();
    },
  );

  return (
    <RoleButton
      className={armed ? 'tokenpanel-element-inspect-toggle is-active' : 'tokenpanel-element-inspect-toggle'}
      aria-label="Inspect an element to see its tokens"
      ariaProps={{ 'aria-pressed': armed }}
      title={armed
        ? 'Element inspect: ON — click a page element to list its tokens. Press I to turn off.'
        : 'Inspect an element to see its tokens (I)'}
      onClick={toggle}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {/* target + list: intentionally distinct from Element Path's crosshair */}
        <circle cx="8" cy="8" r="4.5" />
        <path d="M8 1v2M8 13v2M1 8h2M13 8h2" />
        <path d="M16 6h6M16 11h6M16 16h6" />
      </svg>
    </RoleButton>
  );
}
