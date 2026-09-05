import { useEffect, useRef, useState } from 'preact/compat';
import { Fragment, type RefObject } from 'preact';
import type { PanelDensity } from '../state/tweak-state';
import { useShellRegions } from './regions';
import { useShortcut } from './shortcut-dispatcher';
import { ChangedTabBadge } from '../changed/tab-badge';
import { TabOverflowPopover } from './tab-overflow-popover';

export interface ShellTab {
  id: string;
  label: string;
}

export function ShellTabBar({
  tabs,
  activeTab,
  onActiveTabChange,
  ariaIdScope,
  tabRefs,
  density,
  onDensityChange,
  open,
  changedCounts = {},
}: {
  tabs: readonly ShellTab[];
  activeTab: string;
  onActiveTabChange: (id: string) => void;
  ariaIdScope: string;
  tabRefs: RefObject<Record<string, HTMLDivElement | null>>;
  density: PanelDensity;
  onDensityChange: (density: PanelDensity) => void;
  open: boolean;
  changedCounts?: Readonly<Record<string, number>>;
}) {
  const { items } = useShellRegions();
  const stripRef = useRef<HTMLDivElement>(null);
  const overflowTriggerRef = useRef<HTMLDivElement>(null);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [hasTotalOverflow, setHasTotalOverflow] = useState(false);
  const [hiddenTabIds, setHiddenTabIds] = useState<readonly string[]>([]);
  const [overflowOpen, setOverflowOpen] = useState(false);

  useShortcut(
    {
      key: ['ArrowRight', 'ArrowLeft', 'Home', 'End'],
      when: (event) =>
        event.target instanceof Node && Boolean(stripRef.current?.contains(event.target)),
    },
    (event) => {
      const index = tabs.findIndex((tab) => tab.id === activeTab);
      if (index === -1) return;
      let nextIndex = index;
      if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length;
      else if (event.key === 'Home') nextIndex = 0;
      else if (event.key === 'End') nextIndex = tabs.length - 1;
      event.preventDefault();
      const next = tabs[nextIndex];
      onActiveTabChange(next.id);
      window.requestAnimationFrame(() => tabRefs.current?.[next.id]?.focus());
    },
    open,
  );

  useEffect(() => {
    if (!open) {
      setOverflowOpen(false);
      return;
    }
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
      setHasOverflow(remainingOverflow);
      setHasTotalOverflow(totalOverflow);

      if (!totalOverflow) {
        setHiddenTabIds([]);
        const activeElement = document.activeElement;
        if (activeElement && trigger?.parentElement?.contains(activeElement)) {
          tabRefs.current?.[activeTab]?.focus();
        }
        setOverflowOpen(false);
        return;
      }
      const stripRect = current.getBoundingClientRect();
      const tolerance = 1;
      setHiddenTabIds(tabs
        .filter((tab) => {
          const rect = tabRefs.current?.[tab.id]?.getBoundingClientRect();
          return Boolean(rect && (
            rect.left < stripRect.left - tolerance || rect.right > stripRect.right + tolerance
          ));
        })
        .map((tab) => tab.id));
    }
    updateOverflow();
    element.addEventListener('scroll', updateOverflow);
    if (typeof ResizeObserver === 'undefined') {
      return () => element.removeEventListener('scroll', updateOverflow);
    }
    const observer = new ResizeObserver(updateOverflow);
    observer.observe(element);
    for (const tab of tabs) {
      const tabElement = tabRefs.current?.[tab.id];
      if (tabElement) observer.observe(tabElement);
    }
    return () => {
      observer.disconnect();
      element.removeEventListener('scroll', updateOverflow);
    };
  }, [activeTab, changedCounts, open, tabRefs, tabs]);

  useEffect(() => {
    if (!hasTotalOverflow) return;
    const frame = window.requestAnimationFrame(() => {
      stripRef.current?.dispatchEvent(new Event('scroll'));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [hasTotalOverflow]);

  function selectOverflowTab(id: string): void {
    onActiveTabChange(id);
    setOverflowOpen(false);
    window.requestAnimationFrame(() => {
      const tab = tabRefs.current?.[id];
      tab?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      window.requestAnimationFrame(() => tab?.focus());
    });
  }

  return (
    <div className="tokenpanel-tabbar">
      <div
        ref={stripRef}
        role="tablist"
        aria-label="Design token categories"
        className={hasOverflow ? 'tokenpanel-tabbar-tabs has-overflow' : 'tokenpanel-tabbar-tabs'}
      >
        {tabs.map((tab) => {
          const selected = activeTab === tab.id;
          return (
            <div
              key={tab.id}
              ref={(element) => {
                if (tabRefs.current) tabRefs.current[tab.id] = element;
              }}
              role="tab"
              id={`dtp-tab-${ariaIdScope}-${tab.id}`}
              aria-selected={selected}
              aria-controls={`dtp-panel-${ariaIdScope}-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => onActiveTabChange(tab.id)}
              className={selected ? 'tokenpanel-tab-button is-active' : 'tokenpanel-tab-button'}
            >
              {tab.label}
              <ChangedTabBadge tabId={tab.id} count={changedCounts[tab.id] ?? 0} />
            </div>
          );
        })}
      </div>
      {hasTotalOverflow && (
        <TabOverflowPopover
          tabs={tabs.filter((tab) => hiddenTabIds.includes(tab.id))}
          activeTab={activeTab}
          anchorRef={overflowTriggerRef}
          open={overflowOpen}
          onOpenChange={setOverflowOpen}
          onSelect={selectOverflowTab}
          ariaIdScope={ariaIdScope}
        />
      )}
      <div className="tokenpanel-density">
        <label
          htmlFor={`dtp-density-${ariaIdScope}`}
          className="tokenpanel-density-label"
          title="Tab grid density: dense / cozy / wide (forces 1 column)"
        >
          Density
        </label>
        <input
          id={`dtp-density-${ariaIdScope}`}
          type="range"
          min={0}
          max={2}
          step={1}
          value={density}
          onInput={(event) => {
            const raw = Number((event.currentTarget as HTMLInputElement).value);
            if (raw === 0 || raw === 1 || raw === 2) onDensityChange(raw);
          }}
          className="tokenpanel-density-slider"
          aria-label="Tab grid density"
        />
      </div>
      {items['tabbar-extras'].map((item) => (
        <Fragment key={item.id}>
          {item.render({ compact: false, closeCompactMenu: () => {} })}
        </Fragment>
      ))}
    </div>
  );
}
