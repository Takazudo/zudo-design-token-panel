import { RoleButton } from '../controls/role-button';
import type { DockMode } from '../state/tweak-state';
import { useShortcut } from './shortcut-dispatcher';

const MODES: readonly { mode: DockMode; label: string; shortcut: string }[] = [
  { mode: 'float', label: 'Float panel', shortcut: '1' },
  { mode: 'right', label: 'Dock panel right', shortcut: '2' },
  { mode: 'bottom', label: 'Dock panel bottom', shortcut: '3' },
  { mode: 'mini', label: 'Mini panel', shortcut: '4' },
];

function ModeIcon({ mode }: { mode: DockMode }) {
  if (mode === 'float') {
    return (
      <>
        <rect x="4" y="5" width="16" height="14" rx="1" />
        <path d="M4 9h16" />
      </>
    );
  }
  if (mode === 'right') {
    return (
      <>
        <rect x="3" y="4" width="18" height="16" rx="1" />
        <path d="M14 4v16" />
      </>
    );
  }
  if (mode === 'bottom') {
    return (
      <>
        <rect x="3" y="4" width="18" height="16" rx="1" />
        <path d="M3 13h18" />
      </>
    );
  }
  return (
    <>
      <rect x="4" y="8" width="16" height="8" rx="4" />
      <path d="M15 12h2" />
    </>
  );
}

export function DockModeSwitch({
  value,
  onChange,
  compact = false,
  enableShortcuts = false,
}: {
  value: DockMode;
  onChange: (mode: DockMode) => void;
  compact?: boolean;
  enableShortcuts?: boolean;
}) {
  useShortcut({ key: '1', altKey: true }, () => onChange('float'), enableShortcuts);
  useShortcut({ key: '2', altKey: true }, () => onChange('right'), enableShortcuts);
  useShortcut({ key: '3', altKey: true }, () => onChange('bottom'), enableShortcuts);
  useShortcut({ key: '4', altKey: true }, () => onChange('mini'), enableShortcuts);

  return (
    <div
      role="group"
      className={`tokenpanel-dock-modes${compact ? ' is-compact' : ''}`}
      aria-label="Panel dock mode"
    >
      {MODES.map((item) => (
        <RoleButton
          key={item.mode}
          className={`tokenpanel-dock-mode${value === item.mode ? ' is-active' : ''}`}
          onClick={() => onChange(item.mode)}
          aria-label={`${item.label} (Alt+${item.shortcut})`}
          title={`${item.label} (Alt+${item.shortcut})`}
          ariaProps={{ 'aria-pressed': value === item.mode }}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <ModeIcon mode={item.mode} />
          </svg>
          {compact ? <span>{item.label}</span> : <></>}
        </RoleButton>
      ))}
    </div>
  );
}
