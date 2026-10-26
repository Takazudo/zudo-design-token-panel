/** @jsxImportSource @takazudo/zfb/zudo-react */
import { computed, getScope, Show, signal, type ReadonlySignal } from '@takazudo/zfb/zudo-react';
import type { PanelDensity } from '../state/tweak-state';
import { TextInput } from '../zr/form-controls';
import type { LayerActivity } from './layer-activity';
import type { ShellRegions } from './regions';
import { RegionItems } from './region-items';
import { useShortcut, type ShortcutDispatcher } from './shortcut-dispatcher';
import { ChangedTabBadge } from '../changed/tab-badge';
import { TabOverflowPopover } from './tab-overflow-popover';

export interface ShellTab {
  id: string;
  label: string;
}

export interface ShellTabBarProps {
  tabs: readonly ShellTab[];
  activeTab: ReadonlySignal<string>;
  onActiveTabChange: (id: string) => void;
  ariaIdScope: string;
  tabRefs: Record<string, HTMLDivElement | null>;
  density: ReadonlySignal<PanelDensity>;
  onDensityChange: (density: PanelDensity) => void;
  changedCounts: ReadonlySignal<Readonly<Record<string, number>>>;
  regions: ShellRegions;
  shortcuts: ShortcutDispatcher;
  layers: LayerActivity;
}

export function ShellTabBar({
  tabs,
  activeTab,
  onActiveTabChange,
  ariaIdScope,
  tabRefs,
  density,
  onDensityChange,
  changedCounts,
  regions,
  shortcuts,
  layers,
}: ShellTabBarProps) {
  const stripRef: { current: HTMLDivElement | null } = { current: null };
  const overflowTriggerRef: { current: HTMLDivElement | null } = { current: null };
  const hasOverflow = signal(false);
  const hasTotalOverflow = signal(false);
  const hiddenTabIds = signal<readonly string[]>([]);
  let hiddenNow: readonly string[] = [];
  const overflowOpen = signal(false);

  useShortcut(
    shortcuts,
    {
      key: ['ArrowRight', 'ArrowLeft', 'Home', 'End'],
      when: (event) =>
        event.target instanceof Node && Boolean(stripRef.current?.contains(event.target)),
    },
    (event) => {
      const index = tabs.findIndex((tab) => tab.id === activeTab.value);
      if (index === -1) return;
      let nextIndex = index;
      if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length;
      else if (event.key === 'Home') nextIndex = 0;
      else if (event.key === 'End') nextIndex = tabs.length - 1;
      event.preventDefault();
      const next = tabs[nextIndex];
      onActiveTabChange(next.id);
      window.requestAnimationFrame(() => tabRefs[next.id]?.focus());
    },
  );

  const scope = getScope();
  scope.effect(() => {
    const active = activeTab.value;
    const element = stripRef.current;
    if (!element) return;
    function updateOverflow() {
      const current = stripRef.current;
      if (!current) return;
      const remainingOverflow =
        current.scrollWidth > current.clientWidth &&
        current.scrollLeft + current.clientWidth < current.scrollWidth - 1;
      const trigger = overflowTriggerRef.current;
      const parentGap = Number.parseFloat(getComputedStyle(current.parentElement!).columnGap) || 0;
      const availableWithoutTrigger = current.clientWidth
        + (trigger ? trigger.getBoundingClientRect().width + parentGap : 0);
      const totalOverflow = current.scrollWidth > availableWithoutTrigger + 1;
      hasOverflow.value = remainingOverflow;
      hasTotalOverflow.value = totalOverflow;

      if (!totalOverflow) {
        if (hiddenNow.length > 0) hiddenTabIds.value = hiddenNow = [];
        const activeElement = document.activeElement;
        if (activeElement && trigger?.parentElement?.contains(activeElement)) {
          tabRefs[active]?.focus();
        }
        overflowOpen.value = false;
        return;
      }
      const stripRect = current.getBoundingClientRect();
      const tolerance = 1;
      const hidden = tabs
        .filter((tab) => {
          const rect = tabRefs[tab.id]?.getBoundingClientRect();
          return Boolean(rect && (
            rect.left < stripRect.left - tolerance || rect.right > stripRect.right + tolerance
          ));
        })
        .map((tab) => tab.id);
      if (hiddenNow.length !== hidden.length || hiddenNow.some((id, i) => id !== hidden[i])) {
        hiddenTabIds.value = hiddenNow = hidden;
      }
    }
    updateOverflow();
    element.addEventListener('scroll', updateOverflow);
    if (typeof ResizeObserver === 'undefined') {
      return () => element.removeEventListener('scroll', updateOverflow);
    }
    const observer = new ResizeObserver(updateOverflow);
    observer.observe(element);
    for (const tab of tabs) {
      const tabElement = tabRefs[tab.id];
      if (tabElement) observer.observe(tabElement);
    }
    return () => {
      observer.disconnect();
      element.removeEventListener('scroll', updateOverflow);
    };
  });

  scope.effect(() => {
    if (!hasTotalOverflow.value) return;
    const frame = window.requestAnimationFrame(() => {
      stripRef.current?.dispatchEvent(new Event('scroll'));
    });
    return () => window.cancelAnimationFrame(frame);
  });

  function selectOverflowTab(id: string): void {
    onActiveTabChange(id);
    overflowOpen.value = false;
    window.requestAnimationFrame(() => {
      const tab = tabRefs[id];
      tab?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      window.requestAnimationFrame(() => tab?.focus());
    });
  }

  const hiddenTabs = computed(() => tabs.filter((tab) => hiddenTabIds.value.includes(tab.id)));

  return (
    <div class="tokenpanel-tabbar">
      <div
        ref={stripRef}
        role="tablist"
        aria-label="Design token categories"
        class={computed(() => (hasOverflow.value ? 'tokenpanel-tabbar-tabs has-overflow' : 'tokenpanel-tabbar-tabs'))}
      >
        {tabs.map((tab) => {
          const selected = computed(() => activeTab.value === tab.id);
          const ref = {
            get current() {
              return tabRefs[tab.id] ?? null;
            },
            set current(element: HTMLDivElement | null) {
              tabRefs[tab.id] = element;
            },
          };
          return (
            <div
              ref={ref}
              role="tab"
              id={`dtp-tab-${ariaIdScope}-${tab.id}`}
              aria-selected={selected}
              aria-controls={`dtp-panel-${ariaIdScope}-${tab.id}`}
              tabindex={computed(() => (selected.value ? 0 : -1))}
              on:click={() => onActiveTabChange(tab.id)}
              class={computed(() => (selected.value ? 'tokenpanel-tab-button is-active' : 'tokenpanel-tab-button'))}
            >
              {tab.label}
              <ChangedTabBadge tabId={tab.id} count={computed(() => changedCounts.value[tab.id] ?? 0)} />
            </div>
          );
        })}
      </div>
      <Show when={hasTotalOverflow}>
        {() => (
          <TabOverflowPopover
            tabs={hiddenTabs}
            activeTab={activeTab}
            anchorRef={overflowTriggerRef}
            open={overflowOpen}
            onOpenChange={(open) => {
              overflowOpen.value = open;
            }}
            onSelect={selectOverflowTab}
            ariaIdScope={ariaIdScope}
            layers={layers}
          />
        )}
      </Show>
      <div class="tokenpanel-density">
        <label
          for={`dtp-density-${ariaIdScope}`}
          class="tokenpanel-density-label"
          title="Tab grid density: dense / cozy / wide (forces 1 column)"
        >
          Density
        </label>
        <DensitySlider id={`dtp-density-${ariaIdScope}`} density={density} onDensityChange={onDensityChange} />
      </div>
      <RegionItems
        items={computed(() => regions.items.value['tabbar-extras'])}
        context={{ compact: false, closeCompactMenu: () => {} }}
      />
    </div>
  );
}

export function DensitySlider({
  id,
  density,
  onDensityChange,
}: {
  id?: string;
  density: ReadonlySignal<PanelDensity>;
  onDensityChange: (density: PanelDensity) => void;
}) {
  return (
    <TextInput
      type="range"
      value={computed(() => String(density.value))}
      class="tokenpanel-density-slider"
      attrs={{ ...(id ? { id } : {}), min: 0, max: 2, step: 1, 'aria-label': 'Tab grid density' }}
      onInput={(raw) => {
        const value = Number(raw);
        if (value === 0 || value === 1 || value === 2) onDensityChange(value);
      }}
    />
  );
}
