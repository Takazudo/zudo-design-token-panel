import type { JSX } from 'preact';

export interface ChangedTabBadgeProps {
  tabId: string;
  count: number;
}

/** Count badge rendered inside a tab button without affecting tab overflow. */
export function ChangedTabBadge({ tabId, count }: ChangedTabBadgeProps): JSX.Element | null {
  if (count <= 0) return null;
  return (
    <span
      className="tokenpanel-changed-tab-badge"
      data-testid={`tokenpanel-changed-tab-badge-${tabId}`}
      aria-label={`${count} changed token${count === 1 ? '' : 's'}`}
    >
      {count}
    </span>
  );
}

export const TabChangedBadge = ChangedTabBadge;
