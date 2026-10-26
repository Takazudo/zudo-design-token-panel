/** @jsxImportSource @takazudo/zfb/zudo-react */
import { computed, getScope, Show, signal, type ReadonlySignal } from '@takazudo/zfb/zudo-react';
import { bindPopoverClose } from '../components/color-picker/popover';
import { RoleButton } from '../controls/role-button';
import { Rebuild } from '../zr/rebuild';
import { useLayerRegistration, type LayerActivity } from './layer-activity';
import type { ShellTab } from './tab-bar';

interface TabOverflowPopoverProps {
  tabs: ReadonlySignal<readonly ShellTab[]>;
  activeTab: ReadonlySignal<string>;
  anchorRef: { current: HTMLDivElement | null };
  open: ReadonlySignal<boolean>;
  onOpenChange: (open: boolean) => void;
  onSelect: (id: string) => void;
  ariaIdScope: string;
  layers: LayerActivity;
}

function OverflowListbox({
  tabs,
  activeTab,
  anchorRef,
  onClose,
  onSelect,
  ariaIdScope,
  layers,
}: Omit<TabOverflowPopoverProps, 'open' | 'onOpenChange'> & { onClose: () => void }) {
  const listboxRef: { current: HTMLDivElement | null } = { current: null };
  const fallbackId = () =>
    tabs.value.some((tab) => tab.id === activeTab.value) ? activeTab.value : tabs.value[0]?.id;
  const focusedRaw = signal<string | undefined>(fallbackId());
  // Fall back to the active (or first) hidden tab when the focused one stops
  // being hidden.
  const focusedId = computed(() => {
    const id = focusedRaw.value;
    return id && tabs.value.some((tab) => tab.id === id) ? id : fallbackId();
  });

  const scope = getScope();
  scope.onActivate(() => bindPopoverClose(listboxRef, onClose, anchorRef));
  useLayerRegistration(layers, `tab-overflow-${ariaIdScope}`, true);
  scope.onActivate(() => {
    listboxRef.current?.focus();
  });
  scope.effect(() => {
    const id = focusedId.value;
    if (!id) return;
    queueMicrotask(() => {
      const option = Array.from(listboxRef.current?.children ?? []).find(
        (child) => (child as HTMLElement).dataset.tabId === id,
      );
      (option as HTMLElement | undefined)?.scrollIntoView({ block: 'nearest' });
    });
  });

  const focusedIndex = computed(() => Math.max(0, tabs.value.findIndex((tab) => tab.id === focusedId.value)));

  function handleKeyDown(event: KeyboardEvent): void {
    const list = tabs.value;
    const index = focusedIndex.value;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      let nextIndex = index;
      if (event.key === 'ArrowDown') nextIndex = (index + 1) % list.length;
      else if (event.key === 'ArrowUp') nextIndex = (index - 1 + list.length) % list.length;
      else if (event.key === 'Home') nextIndex = 0;
      else nextIndex = list.length - 1;
      focusedRaw.value = list[nextIndex]?.id;
      return;
    }
    const focusedTab = list[index];
    if ((event.key === 'Enter' || event.key === ' ') && focusedTab) {
      event.preventDefault();
      onSelect(focusedTab.id);
    }
  }

  return (
    <div
      ref={listboxRef}
      role="listbox"
      tabindex={0}
      aria-label="Hidden design token categories"
      aria-activedescendant={computed(() =>
        tabs.value[focusedIndex.value] ? `dtp-tab-overflow-${ariaIdScope}-${focusedIndex.value}` : null)}
      class="tokenpanel-tab-overflow-popover"
      on:keydown={handleKeyDown}
    >
      <Rebuild value={tabs}>
        {(list) => list.map((tab, index) => (
          <div
            data-tab-id={tab.id}
            id={`dtp-tab-overflow-${ariaIdScope}-${index}`}
            role="option"
            aria-selected={computed(() => tab.id === activeTab.value)}
            class={computed(() => (tab.id === focusedId.value
              ? 'tokenpanel-tab-overflow-option is-focused'
              : 'tokenpanel-tab-overflow-option'))}
            on:pointermove={() => {
              focusedRaw.value = tab.id;
            }}
            on:click={() => onSelect(tab.id)}
          >
            {tab.label}
          </div>
        ))}
      </Rebuild>
    </div>
  );
}

export function TabOverflowPopover(props: TabOverflowPopoverProps) {
  const { anchorRef, open, onOpenChange, tabs } = props;
  return (
    <div class="tokenpanel-tab-overflow">
      <RoleButton
        ref={anchorRef}
        class="tokenpanel-tab-overflow-trigger"
        aria-label="Show hidden tabs"
        ariaProps={{ 'aria-haspopup': 'listbox', 'aria-expanded': open }}
        onClick={() => onOpenChange(!open.value)}
      >
        <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
          <path d="m3.5 4 4 4-4 4M8.5 4l4 4-4 4" />
        </svg>
      </RoleButton>
      <Show when={computed(() => open.value && tabs.value.length > 0)}>
        {() => <OverflowListbox {...props} onClose={() => onOpenChange(false)} />}
      </Show>
    </div>
  );
}
