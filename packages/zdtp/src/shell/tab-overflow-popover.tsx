import { useEffect, useRef, useState } from 'preact/compat';
import type { JSX } from 'preact';
import { usePopoverClose } from '../components/color-picker';
import { RoleButton } from '../controls/role-button';
import { useLayerRegistration } from './layer-activity';
import type { ShellTab } from './tab-bar';

interface TabOverflowPopoverProps {
  tabs: readonly ShellTab[];
  activeTab: string;
  anchorRef: React.RefObject<HTMLDivElement>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (id: string) => void;
  ariaIdScope: string;
}

function OverflowListbox({
  tabs,
  activeTab,
  anchorRef,
  onClose,
  onSelect,
  ariaIdScope,
}: Omit<TabOverflowPopoverProps, 'open' | 'onOpenChange'> & { onClose: () => void }): JSX.Element {
  const listboxRef = useRef<HTMLDivElement>(null);
  const [focusedId, setFocusedId] = useState(() =>
    tabs.some((tab) => tab.id === activeTab) ? activeTab : tabs[0]?.id,
  );

  usePopoverClose(listboxRef, onClose, anchorRef);
  useLayerRegistration(`tab-overflow-${ariaIdScope}`, true);

  useEffect(() => {
    listboxRef.current?.focus();
  }, []);

  useEffect(() => {
    if (focusedId && tabs.some((tab) => tab.id === focusedId)) return;
    setFocusedId(tabs.some((tab) => tab.id === activeTab) ? activeTab : tabs[0]?.id);
  }, [activeTab, focusedId, tabs]);

  useEffect(() => {
    if (!focusedId) return;
    const option = Array.from(listboxRef.current?.children ?? []).find(
      (child) => (child as HTMLElement).dataset.tabId === focusedId,
    );
    (option as HTMLElement | undefined)?.scrollIntoView({ block: 'nearest' });
  }, [focusedId]);

  const focusedIndex = Math.max(0, tabs.findIndex((tab) => tab.id === focusedId));
  const focusedTab = tabs[focusedIndex];

  function handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      let nextIndex = focusedIndex;
      if (event.key === 'ArrowDown') nextIndex = (focusedIndex + 1) % tabs.length;
      else if (event.key === 'ArrowUp') nextIndex = (focusedIndex - 1 + tabs.length) % tabs.length;
      else if (event.key === 'Home') nextIndex = 0;
      else nextIndex = tabs.length - 1;
      setFocusedId(tabs[nextIndex]?.id);
      return;
    }
    if ((event.key === 'Enter' || event.key === ' ') && focusedTab) {
      event.preventDefault();
      onSelect(focusedTab.id);
    }
  }

  return (
    <div
      ref={listboxRef}
      role="listbox"
      tabIndex={0}
      aria-label="Hidden design token categories"
      aria-activedescendant={focusedTab ? `dtp-tab-overflow-${ariaIdScope}-${focusedIndex}` : undefined}
      className="tokenpanel-tab-overflow-popover"
      onKeyDown={handleKeyDown}
    >
      {tabs.map((tab, index) => (
        <div
          key={tab.id}
          data-tab-id={tab.id}
          id={`dtp-tab-overflow-${ariaIdScope}-${index}`}
          role="option"
          aria-selected={tab.id === activeTab}
          className={tab.id === focusedId
            ? 'tokenpanel-tab-overflow-option is-focused'
            : 'tokenpanel-tab-overflow-option'}
          onPointerMove={() => setFocusedId(tab.id)}
          onClick={() => onSelect(tab.id)}
        >
          {tab.label}
        </div>
      ))}
    </div>
  );
}

export function TabOverflowPopover(props: TabOverflowPopoverProps): JSX.Element {
  const { anchorRef, open, onOpenChange, tabs } = props;
  return (
    <div className="tokenpanel-tab-overflow">
      <RoleButton
        elementRef={anchorRef}
        className="tokenpanel-tab-overflow-trigger"
        aria-label="Show hidden tabs"
        ariaProps={{ 'aria-haspopup': 'listbox', 'aria-expanded': open }}
        onClick={() => onOpenChange(!open)}
      >
        <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
          <path d="m3.5 4 4 4-4 4M8.5 4l4 4-4 4" />
        </svg>
      </RoleButton>
      {open && tabs.length > 0 && (
        <OverflowListbox {...props} onClose={() => onOpenChange(false)} />
      )}
    </div>
  );
}
