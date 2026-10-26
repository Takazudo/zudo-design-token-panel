/** @jsxImportSource @takazudo/zfb/zudo-react */
import { computed, Show } from '@takazudo/zfb/zudo-react';
import { read, type MaybeSignal } from '../zr/live';

export interface ChangedTabBadgeProps {
  tabId: string;
  count: MaybeSignal<number>;
}

/** Count badge rendered inside a tab button without affecting tab overflow. */
export function ChangedTabBadge({ tabId, count }: ChangedTabBadgeProps) {
  const value = computed(() => read(count));
  return (
    <Show when={computed(() => value.value > 0)}>
      {() => (
        <span
          class="tokenpanel-changed-tab-badge"
          data-testid={`tokenpanel-changed-tab-badge-${tabId}`}
          aria-label={computed(() => `${value.value} changed token${value.value === 1 ? '' : 's'}`)}
        >
          {computed(() => String(value.value))}
        </span>
      )}
    </Show>
  );
}

export const TabChangedBadge = ChangedTabBadge;
