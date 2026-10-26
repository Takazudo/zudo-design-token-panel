import { flush, type Child } from '@takazudo/zfb/zudo-react';
import { act as preactAct } from 'preact/test-utils';
import { mountOwnedRoot, type RootHandle } from './root';

export { flush } from '@takazudo/zfb/zudo-react';

export interface ZrTestRender {
  container: HTMLElement;
  root: RootHandle;
  unmount(): void;
}

const mounted = new Set<ZrTestRender>();

/** Mount `render()`'s result into a fresh connected container (test-only). */
export function renderZr(render: () => Child, container?: HTMLElement): ZrTestRender {
  const host = container ?? document.body.appendChild(document.createElement('div'));
  const root = mountOwnedRoot(host, function TestRoot() { return render(); }, {});
  const result: ZrTestRender = {
    container: host,
    root,
    unmount() {
      if (!mounted.delete(result)) return;
      root.unmount();
      if (!container) host.remove();
    },
  };
  mounted.add(result);
  return result;
}

/** Unmount everything `renderZr` mounted; call from `afterEach`. */
export function cleanupZr(): void {
  for (const entry of mounted) entry.unmount();
}

/** Flush zudo-react's microtask scheduler twice so chained writes settle. */
export async function settle(): Promise<void> {
  await flush();
  await flush();
}

/**
 * Run `run` and synchronously settle both runtimes, like Preact's `act`.
 * zudo-react schedules its flush with the global `queueMicrotask`, so the
 * microtasks queued meanwhile are captured and drained inline, with Preact's
 * render queue flushed after each round in case a callback set Preact state.
 */
function settleSync(run: () => void): void {
  const queue: VoidFunction[] = [];
  const original = globalThis.queueMicrotask;
  globalThis.queueMicrotask = (callback) => {
    queue.push(callback);
  };
  try {
    preactAct(run);
    while (queue.length > 0) {
      preactAct(() => {
        while (queue.length > 0) queue.shift()!();
      });
    }
  } finally {
    globalThis.queueMicrotask = original;
  }
}

/**
 * Test-only `act` covering both Preact and zudo-react: DOM updates from
 * signal writes inside `fn` are applied before `act` returns (or resolves).
 */
export function act(fn: () => void): void;
export function act(fn: () => Promise<unknown>): Promise<void>;
export function act(fn: () => void | Promise<unknown>): void | Promise<void> {
  let pending: Promise<unknown> | undefined;
  settleSync(() => {
    const result = fn();
    if (result && typeof (result as Promise<unknown>).then === 'function') {
      pending = result as Promise<unknown>;
    }
  });
  if (!pending) return;
  return pending.then(() => settleSync(() => {}));
}
