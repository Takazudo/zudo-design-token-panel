/** @jsxImportSource @takazudo/zfb/zudo-react */
import { computed, For, type Child, type ReadonlySignal } from '@takazudo/zfb/zudo-react';

export interface RebuildProps<T> {
  value: ReadonlySignal<T>;
  children: (value: T) => Child;
}

/**
 * Re-create `children(value)` from scratch whenever `value` changes
 * (compared with `Object.is`). For small, cheap subtrees (lists of chips, a
 * handful of options) where keyed fine-grained updates buy nothing over
 * rebuilding.
 */
export function Rebuild<T>(props: RebuildProps<T>) {
  // zudo-react computeds notify on every upstream change, even when the
  // value is unchanged, so only a real change bumps the key.
  let version = 0;
  let last: { value: T } | null = null;
  const each = computed(() => {
    const value = props.value.value;
    if (last === null || !Object.is(last.value, value)) {
      last = { value };
      version += 1;
    }
    return [{ key: version, value }];
  });
  return (
    <For each={each} by={(entry) => entry.key}>
      {(entry) => props.children(entry.value.value)}
    </For>
  );
}
