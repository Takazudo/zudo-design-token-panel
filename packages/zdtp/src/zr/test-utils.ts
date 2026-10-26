import { flush, signal, type Child } from '@takazudo/zfb/zudo-react';
import { createTooltipController } from '../controls/tooltip-controller';
import type { HighlightContextValue } from '../highlight/highlight-context';
import { createPanelServices, type PanelServices } from './panel-services';
import { mountOwnedRoot, type RootHandle } from './root';

export { flush } from '@takazudo/zfb/zudo-react';

export interface ZrTestRender {
  container: HTMLElement;
  root: RootHandle;
  unmount(): void;
}

const mounted = new Set<ZrTestRender>();

/**
 * Mount `render()`'s result into `container` (replacing what `renderZr`
 * mounted there before) or into a fresh connected container (test-only).
 */
export function renderZr(render: () => Child, container?: HTMLElement): ZrTestRender {
  if (container) for (const entry of mounted) if (entry.container === container) entry.unmount();
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

const disconnects: Array<() => void> = [];

/**
 * Panel services with a connected tooltip controller and, optionally, a
 * highlight context — what the mounted panel hands its tabs.
 */
export function createTestServices(
  highlight: HighlightContextValue | null = null,
  partial: Partial<PanelServices> = {},
): PanelServices {
  const tooltip = createTooltipController(document);
  disconnects.push(tooltip.connect());
  return createPanelServices({ tooltip, highlight: signal(highlight), ...partial });
}

/**
 * Unmount whatever `renderZr` mounted into `container`, and disconnect the
 * tooltips `createTestServices` attached.
 */
export function unmountZrIn(container: HTMLElement): void {
  for (const entry of mounted) if (entry.container === container) entry.unmount();
  for (const disconnect of disconnects.splice(0)) disconnect();
}

/** Unmount everything `renderZr` mounted; call from `afterEach`. */
export function cleanupZr(): void {
  for (const entry of mounted) entry.unmount();
  for (const disconnect of disconnects.splice(0)) disconnect();
}

/** Flush zudo-react's microtask scheduler twice so chained writes settle. */
export async function settle(): Promise<void> {
  await flush();
  await flush();
}

/**
 * Run `run` and synchronously drain zudo-react's scheduler. zudo-react
 * schedules its flush with the global `queueMicrotask`, so the microtasks
 * queued meanwhile are captured and drained inline.
 */
function settleSync(run: () => void): void {
  const queue: VoidFunction[] = [];
  const original = globalThis.queueMicrotask;
  globalThis.queueMicrotask = (callback) => {
    queue.push(callback);
  };
  try {
    run();
    while (queue.length > 0) queue.shift()!();
  } finally {
    globalThis.queueMicrotask = original;
  }
}

/**
 * Test-only `act`: DOM updates from signal writes inside `fn` are applied
 * before `act` returns (or resolves).
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
