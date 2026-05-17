/**
 * TabsDemo — 3-tab horizontal nav with animated active indicator.
 *
 * Token consumption:
 *   astro-tabs                → tab container (flex column)
 *   astro-tabs__list          → tab list row, border-b
 *   astro-tabs__tab           → resting tab button
 *   astro-tabs__tab.is-active → active tab (accent color, border-bottom)
 *   astro-tabs__panel         → content area padding + typography
 *
 * Indicator animation:
 *   transform: translateX(…) driven by --astro-easing-tab-open
 *   width = 100%/tabCount via inline style (dynamic runtime value)
 */

import { useState } from 'preact/hooks';

const TABS = ['Overview', 'Details', 'Settings'] as const;

export function TabsDemo() {
  const [activeIndex, setActiveIndex] = useState(0);
  const tabCount = TABS.length;
  const indicatorPct = 100 / tabCount;

  return (
    <div class="astro-tabs">
      {/* Tab list */}
      <div class="astro-tabs__list" style="position:relative">
        {TABS.map((tab, i) => (
          <div
            key={tab}
            role="button"
            tabIndex={0}
            class={`astro-tabs__tab${activeIndex === i ? ' is-active' : ''}`}
            onClick={() => setActiveIndex(i)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setActiveIndex(i);
              }
            }}
            aria-selected={activeIndex === i}
          >
            {tab}
          </div>
        ))}
        {/*
          Active-tab indicator: absolutely-positioned 2px bar that slides
          via translateX. Width = 100% / tabCount (reason: dynamic value
          computed from tab count at runtime; no static CSS fraction).
          Transition timing uses semantic easing-tab-open token.
        */}
        <span
          class="astro-tabs__indicator"
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: `${indicatorPct}%`,
            transform: `translateX(${activeIndex * 100}%)`,
            transition: `transform 0.25s var(--astro-easing-tab-open)`,
          }}
        />
      </div>

      {/* Tab panels */}
      <div class="astro-tabs__panel">
        {activeIndex === 0 && (
          <span>
            <strong>Overview panel.</strong> Indicator slides on{' '}
            <code>easing-tab-open</code>{' '}
            (&#x2192;&nbsp;<code>--astro-easing-tab-open</code>).
          </span>
        )}
        {activeIndex === 1 && (
          <span>
            <strong>Details panel.</strong> Change the{' '}
            Tab Open easing in the panel to see the indicator motion update.
          </span>
        )}
        {activeIndex === 2 && (
          <span>
            <strong>Settings panel.</strong> Active label uses{' '}
            <code>is-active</code>{' '}
            (&#x2192;&nbsp;<code>--astro-color-accent</code>).
          </span>
        )}
      </div>
    </div>
  );
}
