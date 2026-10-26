/** @jsxImportSource @takazudo/zfb/zudo-react */
import { computed, type ReadonlySignal } from '@takazudo/zfb/zudo-react';
import type { TabConfig } from '../tokens/tier-model';
import { RoleButton } from '../controls/role-button';
import { Rebuild } from '../zr/rebuild';

export interface SearchTabCount {
  tab: TabConfig;
  matches: number;
  total: number;
}

export interface SearchMatchBarProps {
  query: ReadonlySignal<string>;
  activeTabId: ReadonlySignal<string>;
  counts: ReadonlySignal<readonly SearchTabCount[]>;
  onSelectTab: (tabId: string) => void;
}

/** The compact cross-tab result summary below the tab strip. */
export function SearchMatchBar({
  query,
  activeTabId,
  counts,
  onSelectTab,
}: SearchMatchBarProps) {
  // Rebuilt from a string key: the bar is a handful of spans and chips.
  const view = computed(() => {
    if (!query.value.trim()) return '';
    const active = counts.value.find((entry) => entry.tab.id === activeTabId.value);
    const others = counts.value
      .filter((entry) => entry.tab.id !== activeTabId.value && entry.matches > 0)
      .map((entry) => [entry.tab.id, entry.tab.label, entry.matches]);
    return JSON.stringify([active?.matches ?? 0, active?.total ?? 0, active?.tab.label ?? activeTabId.value, others]);
  });
  return (
    <div class="tokenpanel-search-matchbar" role="status" aria-live="polite" data-testid="tokenpanel-search-matchbar">
      <Rebuild value={view}>
        {(key) => {
          if (!key) {
            return (
              <span class="tokenpanel-search-hint">
                Type to filter this tab · <span class="tokenpanel-search-key">⌘K</span> jumps anywhere
              </span>
            );
          }
          const [matches, total, label, others] = JSON.parse(key) as [
            number,
            number,
            string,
            [string, string, number][],
          ];
          return [
            <span>
              <span class="tokenpanel-search-match-count">{String(matches)}</span>
              {` of ${total} in ${label}`}
            </span>,
            others.length > 0 ? <span>· also in</span> : null,
            ...others.map(([id, tabLabel, count]) => (
              <RoleButton
                class="tokenpanel-search-chip"
                aria-label={`Show ${count} matches in ${tabLabel}`}
                onClick={() => onSelectTab(id)}
              >
                {`${tabLabel} ${count}`}
              </RoleButton>
            )),
          ];
        }}
      </Rebuild>
    </div>
  );
}
