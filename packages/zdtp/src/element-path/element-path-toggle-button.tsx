/**
 * ElementPathToggleButton — header button that enables/disables inspect mode.
 *
 * A crosshair/target icon. When active, holding Alt and hovering the page
 * highlights elements; clicking copies an annotated path block. Reads
 * ElementPathContext; renders nothing when used outside the orchestrator.
 *
 * Follows the chrome-button policy via the shared `RoleButton` control
 * (role="button" + tabIndex + Enter/Space wiring), exposing `aria-pressed`
 * through its `ariaProps` bag.
 */

import { useContext } from 'preact/hooks';
import type { JSX } from 'preact';
import { ElementPathContext } from './element-path-context';
import { RoleButton } from '../controls/role-button';

export function ElementPathToggleButton({ compact = false }: { compact?: boolean } = {}): JSX.Element | null {
  const ctx = useContext(ElementPathContext);
  if (ctx === null) return null;

  const { enabled, toggle } = ctx;

  const title = enabled
    ? 'Element path copy: ON — hold Alt and click an element to copy its path. Click to turn off.'
    : 'Element path copy: OFF — click to enable, then hold Alt and click an element to copy its path.';

  return (
    <RoleButton
      className={enabled ? 'tokenpanel-elpath-toggle is-active' : 'tokenpanel-elpath-toggle'}
      aria-label="Toggle element path copy"
      ariaProps={{ 'aria-pressed': enabled }}
      title={title}
      onClick={toggle}
    >
      <>
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {/* crosshair / inspect target */}
        <circle cx="12" cy="12" r="7" />
        <line x1="12" y1="1" x2="12" y2="4" />
        <line x1="12" y1="20" x2="12" y2="23" />
        <line x1="1" y1="12" x2="4" y2="12" />
        <line x1="20" y1="12" x2="23" y2="12" />
        <circle cx="12" cy="12" r="1.5" />
      </svg>
      {compact && <span>Element path copy</span>}
      </>
    </RoleButton>
  );
}
