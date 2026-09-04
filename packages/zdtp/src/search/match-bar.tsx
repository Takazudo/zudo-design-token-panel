import { Fragment } from 'preact';
import type { TabConfig } from '../tokens/tier-model';
import { RoleButton } from '../controls/role-button';

export interface SearchTabCount {
  tab: TabConfig;
  matches: number;
  total: number;
}

export interface SearchMatchBarProps {
  query: string;
  activeTabId: string;
  counts: readonly SearchTabCount[];
  onSelectTab: (tabId: string) => void;
}

/** The compact cross-tab result summary below the tab strip. */
export function SearchMatchBar({
  query,
  activeTabId,
  counts,
  onSelectTab,
}: SearchMatchBarProps) {
  const active = counts.find((entry) => entry.tab.id === activeTabId);
  const otherMatches = counts.filter(
    (entry) => entry.tab.id !== activeTabId && entry.matches > 0,
  );
  return (
    <div className="tokenpanel-search-matchbar" role="status" aria-live="polite" data-testid="tokenpanel-search-matchbar">
      {query.trim() ? (
        <>
          <span>
            <span className="tokenpanel-search-match-count">{active?.matches ?? 0}</span>{' of '}
            {active?.total ?? 0} in {active?.tab.label ?? activeTabId}
          </span>
          {otherMatches.length > 0 && <span>· also in</span>}
          {otherMatches.map((entry) => (
            <RoleButton
              key={entry.tab.id}
              className="tokenpanel-search-chip"
              aria-label={`Show ${entry.matches} matches in ${entry.tab.label}`}
              onClick={() => onSelectTab(entry.tab.id)}
            >
              <Fragment>{entry.tab.label} {String(entry.matches)}</Fragment>
            </RoleButton>
          ))}
        </>
      ) : (
        <span className="tokenpanel-search-hint">
          Type to filter this tab · <span className="tokenpanel-search-key">⌘K</span> jumps anywhere
        </span>
      )}
    </div>
  );
}
