import { h, render } from 'preact';
import { TokenDashboard, type TokenDashboardProps } from './token-dashboard';

export type { TokenDashboardProps } from './token-dashboard';

export interface TokenDashboardHandle {
  dispose(): void;
}

const mounts = new WeakMap<HTMLElement, TokenDashboardHandle>();

/** Mount the dashboard into a dedicated host owned by the caller. */
export function mountTokenDashboard(host: HTMLElement, props: TokenDashboardProps): TokenDashboardHandle {
  const previous = mounts.get(host);
  if (previous) {
    previous.dispose();
  } else if (host.hasChildNodes()) {
    throw new Error('mountTokenDashboard requires an empty host element.');
  }

  const handle: TokenDashboardHandle = {
    dispose() {
      if (mounts.get(host) !== handle) return;
      render(null, host);
      mounts.delete(host);
    },
  };
  mounts.set(host, handle);
  try {
    render(h(TokenDashboard, props), host);
  } catch (error) {
    handle.dispose();
    throw error;
  }
  return handle;
}
