// @vitest-environment jsdom
/** @jsxImportSource @takazudo/zfb/zudo-react */
import { computed } from '@takazudo/zfb/zudo-react';
import { afterEach, describe, expect, it } from 'vitest';

import { storeSignal, type ExternalStore } from '../store';
import { cleanupZr, renderZr, settle } from '../test-utils';

afterEach(cleanupZr);

function createCounter() {
  let count = 0;
  const listeners = new Set<() => void>();
  const store: ExternalStore<number> = {
    getSnapshot: () => count,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  return {
    store,
    listeners,
    increment() {
      count += 1;
      for (const listener of listeners) listener();
    },
  };
}

function Count(props: { store: ExternalStore<number> }) {
  const count = storeSignal(props.store);
  return <span>{computed(() => String(count.value))}</span>;
}

describe('storeSignal', () => {
  it('tracks store updates and unsubscribes on unmount', async () => {
    const counter = createCounter();
    const { container, unmount } = renderZr(() => <Count store={counter.store} />);
    expect(container.textContent).toBe('0');
    expect(counter.listeners.size).toBe(1);

    counter.increment();
    await settle();
    expect(container.textContent).toBe('1');

    unmount();
    expect(counter.listeners.size).toBe(0);
  });
});
