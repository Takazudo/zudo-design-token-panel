import { getScope, signal, type ReadonlySignal } from '@takazudo/zfb/zudo-react';

export interface ExternalStore<T> {
  getSnapshot(): T;
  subscribe(listener: () => void): () => void;
}

/**
 * Read an external store (e.g. `TweakHistory`) as a signal for the lifetime of
 * the calling zudo-react component.
 */
export function storeSignal<T>(store: ExternalStore<T>): ReadonlySignal<T> {
  const value = signal(store.getSnapshot());
  const unsubscribe = store.subscribe(() => {
    value.value = store.getSnapshot();
  });
  getScope().onCleanup(unsubscribe);
  return value;
}
