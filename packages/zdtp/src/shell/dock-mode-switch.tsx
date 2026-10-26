/** @jsxImportSource @takazudo/zfb/zudo-react */
import { computed, type Child } from '@takazudo/zfb/zudo-react';
import { RoleButton } from '../controls/role-button';
import { read, type MaybeSignal } from '../zr/live';
import type { DockMode } from '../state/tweak-state';

const MODES: readonly { mode: DockMode; label: string; shortcut: string }[] = [
  { mode: 'float', label: 'Float panel', shortcut: '1' },
  { mode: 'right', label: 'Dock panel right', shortcut: '2' },
  { mode: 'bottom', label: 'Dock panel bottom', shortcut: '3' },
  { mode: 'mini', label: 'Mini panel', shortcut: '4' },
];

function modeIcon(mode: DockMode): Child {
  if (mode === 'float') {
    return [<rect x="4" y="5" width="16" height="14" rx="1" />, <path d="M4 9h16" />];
  }
  if (mode === 'right') {
    return [<rect x="3" y="4" width="18" height="16" rx="1" />, <path d="M14 4v16" />];
  }
  if (mode === 'bottom') {
    return [<rect x="3" y="4" width="18" height="16" rx="1" />, <path d="M3 13h18" />];
  }
  return [<rect x="4" y="8" width="16" height="8" rx="4" />, <path d="M15 12h2" />];
}

export function DockModeSwitch({
  value,
  onChange,
  compact = false,
}: {
  value: MaybeSignal<DockMode>;
  onChange: (mode: DockMode) => void;
  compact?: boolean;
}) {
  return (
    <div
      role="group"
      class={`tokenpanel-dock-modes${compact ? ' is-compact' : ''}`}
      aria-label="Panel dock mode"
    >
      {MODES.map((item) => {
        const active = computed(() => read(value) === item.mode);
        return (
          <RoleButton
            class={computed(() => `tokenpanel-dock-mode${active.value ? ' is-active' : ''}`)}
            onClick={() => onChange(item.mode)}
            aria-label={`${item.label} (Alt+${item.shortcut})`}
            title={`${item.label} (Alt+${item.shortcut})`}
            ariaProps={{ 'aria-pressed': active }}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              aria-hidden="true"
            >
              {modeIcon(item.mode)}
            </svg>
            {compact ? <span>{item.label}</span> : null}
          </RoleButton>
        );
      })}
    </div>
  );
}
