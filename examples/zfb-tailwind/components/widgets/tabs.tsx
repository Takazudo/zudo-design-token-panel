/**
 * TabsDemo — 3-tab horizontal nav with animated active indicator.
 *
 * Token consumption:
 *   flex gap-hsp-md border-b border-muted  → tab container
 *   px-hsp-md py-vsp-sm text-body text-muted  → resting tab label
 *   text-accent  → active tab label
 *
 * Indicator animation:
 *   transform: translateX(...)  driven by var(--zfbtw-easing-tab-open)
 *   width = 100%/tabCount via inline style (reason: dynamic from runtime tab count —
 *   no static Tailwind utility can express a fraction of parent from a variable count)
 *
 * Accessibility: WAI-ARIA Tabs APG pattern with automatic activation.
 *   https://www.w3.org/WAI/ARIA/apg/patterns/tabs/
 */

import { useState, useId, useRef } from 'preact/hooks';
import { Island, type IslandProps } from '@takazudo/zfb';

const TABS = ['Overview', 'Details', 'Settings'] as const;

function TabsInner() {
  const [activeIndex, setActiveIndex] = useState(0);
  const tabCount = TABS.length;
  const indicatorPct = 100 / tabCount;

  const baseId = useId();
  const tabIds = TABS.map((_, i) => `${baseId}-tab-${i}`);
  const panelIds = TABS.map((_, i) => `${baseId}-panel-${i}`);
  // ref array for programmatic focus on keyboard navigation
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (e: KeyboardEvent) => {
    let next = -1;
    if (e.key === 'ArrowRight') next = (activeIndex + 1) % tabCount;
    else if (e.key === 'ArrowLeft') next = (activeIndex - 1 + tabCount) % tabCount;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = tabCount - 1;
    if (next === -1) return;
    e.preventDefault(); // prevent page scroll on arrow/home/end keys
    setActiveIndex(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <div>
      {/* Tab list */}
      <div class="relative flex gap-hsp-md border-b border-muted" role="tablist" onKeyDown={onKeyDown}>
        {TABS.map((tab, i) => (
          <button
            key={tab}
            type="button"
            role="tab"
            id={tabIds[i]}
            aria-selected={activeIndex === i}
            aria-controls={panelIds[i]}
            tabIndex={activeIndex === i ? 0 : -1}
            onClick={() => setActiveIndex(i)}
            class={`px-hsp-md py-vsp-sm text-body cursor-pointer border-none bg-transparent ${
              activeIndex === i ? 'text-accent font-semibold' : 'text-muted'
            }`}
            ref={(el) => { tabRefs.current[i] = el; }}
          >
            {tab}
          </button>
        ))}
        {/*
          Active-tab indicator: absolutely-positioned 2px bar that slides
          via translateX. Width = 100% / tabCount (reason: dynamic value
          computed from tab count at runtime; no static Tailwind fraction).
          Transition timing uses semantic easing-tab-open token.
        */}
        <span
          class="absolute bottom-0 h-[2px] bg-accent"
          aria-hidden="true"
          // reason: width is 1/N of container from runtime tab count; transition
          // timing references semantic easing token not expressible as a Tailwind utility
          style={{
            width: `${indicatorPct}%`,
            transform: `translateX(${activeIndex * 100}%)`,
            transition: `transform 0.25s var(--zfbtw-easing-tab-open)`,
          }}
        />
      </div>

      {/* Tab panels — all rendered, toggled via hidden attribute */}
      <div
        role="tabpanel"
        id={panelIds[0]}
        aria-labelledby={tabIds[0]}
        hidden={activeIndex !== 0}
        class="px-hsp-md py-vsp-md text-body text-fg"
      >
        <p>
          <strong>Overview panel.</strong> Indicator slides on{' '}
          <code>easing-tab-open</code>{' '}
          (→&nbsp;<code>--zfbtw-easing-tab-open</code>).
        </p>
      </div>
      <div
        role="tabpanel"
        id={panelIds[1]}
        aria-labelledby={tabIds[1]}
        hidden={activeIndex !== 1}
        class="px-hsp-md py-vsp-md text-body text-fg"
      >
        <p>
          <strong>Details panel.</strong> Change the{' '}
          <em>Tab Open</em> easing in the panel to see the indicator motion update.
        </p>
      </div>
      <div
        role="tabpanel"
        id={panelIds[2]}
        aria-labelledby={tabIds[2]}
        hidden={activeIndex !== 2}
        class="px-hsp-md py-vsp-md text-body text-fg"
      >
        <p>
          <strong>Settings panel.</strong> Active label uses{' '}
          <code>text-accent</code>{' '}
          (→&nbsp;<code>--zfbtw-color-accent</code>).
        </p>
      </div>
    </div>
  );
}

export function TabsDemo() {
  return (
    <Island when="visible" ssrFallback={null}>
      {(<TabsInner />) as unknown as IslandProps['children']}
    </Island>
  );
}
