import { flush, type Child } from '@takazudo/zfb/zudo-react';
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
