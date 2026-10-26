import { h } from '@takazudo/zfb/zudo-react';
import { mount, type RootHandle } from '@takazudo/zfb/zudo-react/client';
import { TokenDashboard, type TokenDashboardProps } from './token-dashboard';

export type { TokenDashboardProps } from './token-dashboard';

export interface TokenDashboardHandle {
  dispose(): void;
}

// zudo-react matches the root component's `displayName ?? name` against the
// identity, so pin the name: minifiers may rename the function.
function TokenDashboardRoot(props: TokenDashboardProps) {
  return h(TokenDashboard, props as unknown as Record<string, unknown>);
}
TokenDashboardRoot.displayName = 'TokenDashboardRoot';

// zudo-react's caller-owned mount protocol: the wrapper must carry these
// attributes and the build string must equal the identity's build.
const identity = { component: TokenDashboardRoot.displayName, build: 'zdtp-dashboard-client-v1' };

function createWrapper(host: HTMLElement): HTMLElement {
  const wrapper = host.ownerDocument.createElement('div');
  wrapper.setAttribute('data-zfb-island-skip-ssr', identity.component);
  wrapper.setAttribute('data-zfb-transport', 'json/1');
  wrapper.setAttribute('data-zfb-protocol', 'zudo-react/1');
  wrapper.setAttribute('data-zfb-build', identity.build);
  wrapper.style.display = 'contents';
  host.append(wrapper);
  return wrapper;
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

  const wrapper = createWrapper(host);
  let root: RootHandle | null = null;
  const handle: TokenDashboardHandle = {
    dispose() {
      if (mounts.get(host) !== handle) return;
      root?.unmount();
      wrapper.remove();
      mounts.delete(host);
    },
  };
  mounts.set(host, handle);
  let failure: unknown;
  try {
    root = mount(h(TokenDashboardRoot, { ...props }), wrapper, {
      identity,
      report(diagnostic) {
        failure ??= new Error(`mountTokenDashboard failed (${diagnostic.code}): ${diagnostic.actual}`);
      },
    });
  } catch (error) {
    failure = error;
  }
  if (root === null) {
    handle.dispose();
    throw failure ?? new Error('mountTokenDashboard failed.');
  }
  return handle;
}
