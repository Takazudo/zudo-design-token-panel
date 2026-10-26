/** @jsxImportSource @takazudo/zfb/zudo-react */
/**
 * ElementPathToggleButton — header button that enables/disables inspect mode.
 *
 * A crosshair/target icon. When active, holding Alt and hovering the page
 * highlights elements; clicking copies an annotated path block. Renders
 * nothing without a controller.
 *
 * Follows the chrome-button policy via the shared `RoleButton` control
 * (role="button" + tabindex + Enter/Space wiring), exposing `aria-pressed`
 * through its `ariaProps` bag.
 */

import { computed } from '@takazudo/zfb/zudo-react';
import type { ElementPathController } from './element-path-context';
import { RoleButton } from '../controls/role-button';

export interface ElementPathToggleButtonProps {
  controller: ElementPathController | null;
  compact?: boolean;
}

export function ElementPathToggleButton({ controller, compact = false }: ElementPathToggleButtonProps) {
  if (controller === null) return null;
  const { enabled, toggle } = controller;

  const title = computed(() =>
    enabled.value
      ? 'Element path copy: ON — hold Alt and click an element to copy its path. Click to turn off.'
      : 'Element path copy: OFF — click to enable, then hold Alt and click an element to copy its path.',
  );

  return (
    <RoleButton
      class={computed(() => (enabled.value ? 'tokenpanel-elpath-toggle is-active' : 'tokenpanel-elpath-toggle'))}
      aria-label="Toggle element path copy"
      ariaProps={{ 'aria-pressed': enabled }}
      title={title}
      onClick={toggle}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
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
      {compact ? <span>Element path copy</span> : null}
    </RoleButton>
  );
}
