'use client';

/**
 * TabsDemo — 3-tab horizontal nav with animated active indicator.
 *
 * Token consumption (via frozen nx-* vocabulary):
 *   .nx-tabs              → column flex container
 *   .nx-tabs__list        → tab row with relative positioning for indicator
 *   .nx-tabs__tab         → resting tab label (muted color)
 *   .nx-tabs__tab.is-active → active tab label (accent color, semibold)
 *   .nx-tabs__indicator   → absolutely-positioned 2px sliding bar
 *   .nx-tabs__panel       → tab content area
 *
 * Indicator width + transform are runtime values (1/N of container, from
 * tab count) — set via inline style, not a class.
 * Transition timing references --nx-easing-tab-open semantic token.
 */

import { useState } from 'react';

const TABS = ['Overview', 'Details', 'Settings'] as const;

export default function TabsDemo() {
  const [activeIndex, setActiveIndex] = useState(0);
  const tabCount = TABS.length;
  const indicatorPct = 100 / tabCount;

  const panelId = (i: number) => `tabs-panel-${i}`;
  const tabId = (i: number) => `tabs-tab-${i}`;

  return (
    <div className="nx-tabs">
      {/* Tab list */}
      <div className="nx-tabs__list" role="tablist" aria-label="Demo tabs">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            id={tabId(i)}
            type="button"
            role="tab"
            aria-selected={activeIndex === i}
            aria-controls={panelId(i)}
            onClick={() => setActiveIndex(i)}
            className={`nx-tabs__tab${activeIndex === i ? ' is-active' : ''}`}
          >
            {tab}
          </button>
        ))}
        {/*
          Active-tab indicator: absolutely-positioned 2px bar that slides
          via translateX. Width = 100% / tabCount (reason: dynamic value
          computed from tab count at runtime; no static class can express this).
          Transition timing uses semantic easing-tab-open token.
        */}
        <span
          className="nx-tabs__indicator"
          aria-hidden="true"
          style={{
            width: `${indicatorPct}%`,
            transform: `translateX(${activeIndex * 100}%)`,
          }}
        />
      </div>

      {/* Tab panels */}
      {TABS.map((tab, i) => (
        <div
          key={tab}
          id={panelId(i)}
          role="tabpanel"
          aria-labelledby={tabId(i)}
          hidden={activeIndex !== i}
          className="nx-tabs__panel"
        >
          {i === 0 && (
            <div>
              <strong>Overview panel.</strong> Indicator slides on{' '}
              <code>easing-tab-open</code>{' '}
              (&#8594;&nbsp;<code>--nx-easing-tab-open</code>).
            </div>
          )}
          {i === 1 && (
            <div>
              <strong>Details panel.</strong> Change the Tab Open easing in the
              panel to see the indicator motion update.
            </div>
          )}
          {i === 2 && (
            <div>
              <strong>Settings panel.</strong> Active label uses{' '}
              <code>nx-tabs__tab.is-active</code>{' '}
              (&#8594;&nbsp;<code>--nx-color-accent</code>).
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
