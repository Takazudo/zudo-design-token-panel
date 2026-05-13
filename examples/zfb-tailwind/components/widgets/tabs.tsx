/**
 * TabsDemo — 3-tab horizontal nav with animated active indicator.
 *
 * Token consumption:
 *   flex gap-spacing-md border-b border-muted  → tab container
 *   px-spacing-md py-spacing-sm text-body text-muted  → resting tab label
 *   text-accent  → active tab label
 *
 * Indicator animation:
 *   transform: translateX(...)  driven by var(--zfbtw-easing-tab-open)
 *   width = 100%/tabCount via inline style (reason: dynamic from runtime tab count —
 *   no static Tailwind utility can express a fraction of parent from a variable count)
 */

import { useState } from 'preact/hooks';

const TABS = ['Overview', 'Details', 'Settings'] as const;

export function TabsDemo() {
  const [activeIndex, setActiveIndex] = useState(0);
  const tabCount = TABS.length;
  const indicatorPct = 100 / tabCount;

  return (
    <div>
      {/* Tab list */}
      <div class="relative flex gap-spacing-md border-b border-muted">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveIndex(i)}
            class={`px-spacing-md py-spacing-sm text-body cursor-pointer border-none bg-transparent ${
              activeIndex === i ? 'text-accent font-semibold' : 'text-muted'
            }`}
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
          // reason: width is 1/N of container from runtime tab count; transition
          // timing references semantic easing token not expressible as a Tailwind utility
          style={{
            width: `${indicatorPct}%`,
            transform: `translateX(${activeIndex * 100}%)`,
            transition: `transform 0.25s var(--zfbtw-easing-tab-open)`,
          }}
        />
      </div>

      {/* Tab panels */}
      <div class="p-spacing-md text-body text-fg">
        {activeIndex === 0 && (
          <p>
            <strong>Overview panel.</strong> Indicator slides on{' '}
            <code>easing-tab-open</code>{' '}
            (→&nbsp;<code>--zfbtw-easing-tab-open</code>).
          </p>
        )}
        {activeIndex === 1 && (
          <p>
            <strong>Details panel.</strong> Change the{' '}
            <em>Tab Open</em> easing in the panel to see the indicator motion update.
          </p>
        )}
        {activeIndex === 2 && (
          <p>
            <strong>Settings panel.</strong> Active label uses{' '}
            <code>text-accent</code>{' '}
            (→&nbsp;<code>--zfbtw-color-accent</code>).
          </p>
        )}
      </div>
    </div>
  );
}
