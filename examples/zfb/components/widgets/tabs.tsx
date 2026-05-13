/**
 * TabsDemo — 3-tab horizontal nav with animated active indicator.
 *
 * Plain CSS mirror of zfb-tailwind/components/widgets/tabs.tsx.
 *
 * Token consumption:
 *   .zfbexample-tabs__list      → gap: spacing-md; border-b: color-muted
 *   .zfbexample-tabs__tab       → px: spacing-md, py: spacing-sm, text-body, color-muted (resting)
 *   .zfbexample-tabs__tab.is-active → color-accent
 *   .zfbexample-tabs__indicator → easing-tab-open (transition via inline style)
 */

import { useState } from 'preact/hooks';

const TABS = ['Overview', 'Details', 'Settings'] as const;

export function TabsDemo() {
  const [activeIndex, setActiveIndex] = useState(0);
  const tabCount = TABS.length;
  const indicatorPct = 100 / tabCount;

  return (
    <div class="zfbexample-tabs">
      {/* Tab list */}
      <div class="zfbexample-tabs__list">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveIndex(i)}
            class={`zfbexample-tabs__tab${activeIndex === i ? ' is-active' : ''}`}
          >
            {tab}
          </button>
        ))}
        {/*
          Active-tab indicator: absolutely-positioned 2px bar that slides
          via translateX. Width = 100% / tabCount (reason: dynamic value
          computed from tab count at runtime; no static class can express this fraction).
          Transition timing uses semantic easing-tab-open token.
        */}
        <span
          class="zfbexample-tabs__indicator"
          // reason: width is 1/N of container from runtime tab count; transition
          // timing references semantic easing token not expressible without inline style
          style={{
            width: `${indicatorPct}%`,
            transform: `translateX(${activeIndex * 100}%)`,
            transition: `transform 0.25s var(--zfbexample-easing-tab-open)`,
          }}
        />
      </div>

      {/* Tab panels */}
      <div class="zfbexample-tabs__panel">
        {activeIndex === 0 && (
          <p>
            <strong>Overview panel.</strong> Indicator slides on{' '}
            <code>easing-tab-open</code>{' '}
            (→&nbsp;<code>--zfbexample-easing-tab-open</code>).
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
            <code>color-accent</code>{' '}
            (→&nbsp;<code>--zfbexample-color-accent</code>).
          </p>
        )}
      </div>
    </div>
  );
}
