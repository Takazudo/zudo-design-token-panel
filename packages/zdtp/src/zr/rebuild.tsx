/** @jsxImportSource @takazudo/zfb/zudo-react */
import { computed, For, type Child, type ReadonlySignal } from '@takazudo/zfb/zudo-react';

export interface RebuildProps<T> {
  value: ReadonlySignal<T>;
  children: (value: T) => Child;
}

/**
 * Re-create `children(value)` from scratch whenever `value` changes. For
 * small, cheap subtrees (lists of chips, a handful of options) where keyed
 * fine-grained updates buy nothing over rebuilding.
 */
export function Rebuild<T>(props: RebuildProps<T>) {
  let version = 0;
  const each = computed(() => [{ key: version++, value: props.value.value }]);
  return (
    <For each={each} by={(entry) => entry.key}>
      {(entry) => props.children(entry.value.value)}
    </For>
  );
}
