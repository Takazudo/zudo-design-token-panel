/**
 * Tabs — 3-tab horizontal nav with animated sliding indicator.
 *
 * Token consumption:
 *   .vr-tabs             → position: relative wrapper
 *   .vr-tabs__list       → flex row, border-b, relative for indicator
 *   .vr-tabs__tab        → resting tab button
 *   .vr-tabs__tab.is-active → active color + weight
 *   .vr-tabs__indicator  → absolute 2px bar, transition on easing-tab-open
 *   .vr-tabs__panel      → content area padding
 *
 * Indicator width: 100% / tabCount (computed at runtime from tab count;
 * no static CSS utility can express a fraction of parent from a variable count).
 */

import { useState } from 'react';

const TABS = ['Overview', 'Details', 'Settings'] as const;

export function Tabs() {
  const [activeIndex, setActiveIndex] = useState(0);
  const tabCount = TABS.length;
  const indicatorPct = 100 / tabCount;

  return (
    <div className="vr-tabs">
      {/* Tab list */}
      <div className="vr-tabs__list">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveIndex(i)}
            className={`vr-tabs__tab${activeIndex === i ? ' is-active' : ''}`}
          >
            {tab}
          </button>
        ))}
        {/*
          Active-tab indicator: absolutely-positioned 2px bar that slides
          via translateX. Width = 100% / tabCount (reason: dynamic value
          computed from tab count at runtime; no static CSS fraction possible).
          Transition timing references semantic easing-tab-open token.
        */}
        <span
          className="vr-tabs__indicator"
          style={{
            width: `${indicatorPct}%`,
            transform: `translateX(${activeIndex * 100}%)`,
          }}
        />
      </div>

      {/* Tab panels */}
      <div className="vr-tabs__panel">
        {activeIndex === 0 && (
          <div className="vr-body">
            <strong>Overview panel.</strong> Indicator slides on{' '}
            <code>easing-tab-open</code>{' '}
            (→&nbsp;<code>--vr-easing-tab-open</code>).
          </div>
        )}
        {activeIndex === 1 && (
          <div className="vr-body">
            <strong>Details panel.</strong> Change the{' '}
            <em>Tab Open</em> easing in the panel to see the indicator motion update.
          </div>
        )}
        {activeIndex === 2 && (
          <div className="vr-body">
            <strong>Settings panel.</strong> Active label uses{' '}
            <code>--vr-color-accent</code>.
          </div>
        )}
      </div>
    </div>
  );
}
