/** @jsxImportSource @takazudo/zfb/zudo-react */
import { computed, Show } from '@takazudo/zfb/zudo-react';
import type { ShellRegions } from './regions';
import { RegionItems } from './region-items';

export function ShellFooter({ regions }: { regions: ShellRegions }) {
  const items = computed(() => regions.items.value.footer);
  return (
    <Show when={computed(() => items.value.length > 0)}>
      {() => (
        <div class="tokenpanel-footer">
          <RegionItems items={items} context={{ compact: false, closeCompactMenu: () => {} }} />
        </div>
      )}
    </Show>
  );
}
