/**
 * TabsDemo — 3-tab horizontal nav with animated active indicator.
 *
 * Plain CSS mirror of zfb-tailwind/components/widgets/tabs.tsx.
 *
 * Token consumption:
 *   .zfb-tabs__list      → gap: spacing-md; border-b: color-muted
 *   .zfb-tabs__tab       → px: spacing-md, py: spacing-sm, text-body, color-muted (resting)
 *   .zfb-tabs__tab.is-active → color-accent
 *   .zfb-tabs__indicator → easing-tab-open (transition via inline style)
 */

import { useState } from 'preact/hooks';
import { Island, type IslandProps } from '@takazudo/zfb';

const TABS = ['Overview', 'Details', 'Settings'] as const;

function TabsInner() {
  const [activeIndex, setActiveIndex] = useState(0);
  const tabCount = TABS.length;
  const indicatorPct = 100 / tabCount;

  return (
    <div class="zfb-tabs">
      {/* Tab list */}
      <div class="zfb-tabs__list">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveIndex(i)}
            class={`zfb-tabs__tab${activeIndex === i ? ' is-active' : ''}`}
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
          class="zfb-tabs__indicator"
          // reason: width is 1/N of container from runtime tab count; transition
          // timing references semantic easing token not expressible without inline style
          style={{
            width: `${indicatorPct}%`,
            transform: `translateX(${activeIndex * 100}%)`,
            transition: `transform 0.25s var(--zfb-easing-tab-open)`,
          }}
        />
      </div>

      {/* Tab panels */}
      <div class="zfb-tabs__panel">
        {activeIndex === 0 && (
          <p>
            <strong>Overview panel.</strong> Indicator slides on{' '}
            <code>easing-tab-open</code>{' '}
            (→&nbsp;<code>--zfb-easing-tab-open</code>).
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
            (→&nbsp;<code>--zfb-color-accent</code>).
          </p>
        )}
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
